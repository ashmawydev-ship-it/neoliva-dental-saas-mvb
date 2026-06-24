import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';
import type { EventService } from '@/services/event.service';

// ─── Status constants (avoid magic strings throughout the codebase) ────────────

export const JOB_STATUS = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED:  'COMPLETED',
  FAILED:     'FAILED',
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

// ─── Job type registry — only recognised types will be dispatched ──────────────

export const JOB_TYPE = {
  CHECK_PATIENT_NO_SHOW:    'CHECK_PATIENT_NO_SHOW',
  CHECK_INVOICE_OVERDUE:    'CHECK_INVOICE_OVERDUE',
  CHECK_TREATMENT_DELAYED:  'CHECK_TREATMENT_DELAYED',
  SEND_NOTIFICATION:        'SEND_NOTIFICATION',
  SEND_EMAIL:               'SEND_EMAIL',
} as const;

export type JobType = typeof JOB_TYPE[keyof typeof JOB_TYPE];

interface EnqueueOptions {
  type: JobType;
  payload: Record<string, unknown>;
  runAt: Date;
  tenantId: string;
  /**
   * Optional deduplication key. If a PENDING or PROCESSING job already
   * exists with this key, the new job is silently skipped (idempotent).
   */
  dedupKey?: string;
}

// In-memory cache to prevent repeated DB hits during the same request or warm lambda lifecycle
let lastSystemJobCheckAt = 0;
const SYSTEM_JOB_THROTTLE_MS = 60 * 1000; // 1 minute

export class JobService {
  static instance?: JobService;
  private eventService?: EventService;

  constructor(
    private readonly prismaClient = prisma
  ) {}

  setEventService(eventService: EventService) {
    this.eventService = eventService;
  }

  /**
   * Persists a new job to the database job queue.
   * Returns the created Job or null if the job was deduplicated.
   */
  async enqueueJob(opts: EnqueueOptions) {
    const { type, payload, runAt, tenantId, dedupKey } = opts;

    // Dedup: skip silently if an active job with this key already exists
    if (dedupKey) {
      const existing = await this.prismaClient.job.findUnique({ where: { dedupKey } });
      if (existing && existing.status !== JOB_STATUS.FAILED) {
        logger.info('[JobService] Skipped duplicate job', { dedupKey, type, tenantId });
        return null;
      }
    }

    // Auto-generate dedup key from content hash when not explicitly provided
    const resolvedDedupKey = dedupKey ?? this.generateDedupKey(type, payload, tenantId);

    try {
      const job = await this.prismaClient.job.create({
        data: {
          tenantId,
          type,
          payload: payload as Prisma.InputJsonValue,
          runAt,
          dedupKey: resolvedDedupKey,
        },
      });

      logger.info('[JobService] Job enqueued', {
        jobId: job.id,
        type,
        runAt: runAt.toISOString(),
        tenantId,
      });

      return job;
    } catch (err: any) {
      // Unique constraint = race condition dedup hit — safe to ignore
      if (err?.code === 'P2002') {
        logger.info('[JobService] Job skipped (concurrent dedup hit)', { type, tenantId });
        return null;
      }
      logger.error('[JobService] Failed to enqueue job', err, { type, tenantId });
      throw err;
    }
  }

  /** Mark a job as actively being processed. Returns updated job. */
  async markJobProcessing(jobId: string) {
    return this.prismaClient.job.update({
      where: { id: jobId },
      data: {
        status:   JOB_STATUS.PROCESSING,
        attempts: { increment: 1 },
      },
    });
  }

  /** Mark a job as successfully completed. */
  async markJobCompleted(jobId: string) {
    return this.prismaClient.job.update({
      where: { id: jobId },
      data: { status: JOB_STATUS.COMPLETED },
    });
  }

  /**
   * Mark a job as failed.
   * If attempts < MAX_ATTEMPTS the job is reset to PENDING for retry.
   * If attempts >= MAX_ATTEMPTS it is permanently marked FAILED.
   */
  async markJobFailed(jobId: string, error: unknown) {
    const MAX_ATTEMPTS = 3;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const job = await this.prismaClient.job.findUnique({ where: { id: jobId }, select: { attempts: true } });
    const attempts = job?.attempts ?? MAX_ATTEMPTS;

    const nextStatus = attempts >= MAX_ATTEMPTS ? JOB_STATUS.FAILED : JOB_STATUS.PENDING;

    return this.prismaClient.job.update({
      where: { id: jobId },
      data: {
        status:    nextStatus,
        lastError: errorMessage.slice(0, 1000), // cap at 1000 chars
      },
    });
  }

  /**
   * Atomically fetches a batch of PENDING jobs whose runAt has passed.
   * Uses a raw UPDATE...RETURNING to prevent concurrent workers from
   * picking up the same jobs (safe on multi-instance Vercel).
   */
  async fetchAndLockPendingJobs(limit = 50) {
    const now = new Date();

    // Atomic claim via raw SQL: update status to PROCESSING and return claimed rows
    const claimed = await this.prismaClient.$queryRaw<Array<{
      id: string;
      tenant_id: string;
      type: string;
      payload: unknown;
      run_at: Date;
      attempts: number;
    }>>`
      UPDATE jobs
      SET    status = 'PROCESSING', attempts = attempts + 1, updated_at = NOW()
      WHERE  id IN (
        SELECT id FROM jobs
        WHERE  status = 'PENDING'
          AND  run_at <= ${now}
        ORDER BY run_at ASC
        LIMIT  ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, tenant_id, type, payload, run_at, attempts
    `;

    return claimed.map(r => ({
      id:       r.id,
      tenantId: r.tenant_id,
      type:     r.type as JobType,
      payload:  r.payload as Record<string, unknown>,
      runAt:    r.run_at,
      attempts: r.attempts,
    }));
  }

  /**
   * Prune completed jobs older than `daysOld` days.
   * Should be called periodically (e.g. weekly via cron) to avoid table bloat.
   */
  async pruneOldJobs(daysOld = 7) {
    const cutoff = new Date(Date.now() - daysOld * 86_400_000);
    const result = await this.prismaClient.job.deleteMany({
      where: {
        status: { in: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED] },
        updatedAt: { lt: cutoff },
      },
    });
    logger.info('[JobService] Pruned old jobs', { deleted: result.count, olderThan: cutoff });
    return result.count;
  }

  /**
   * Lazy Execution: Runs daily system jobs if they haven't run today yet.
   * Hardened for high-concurrency and Vercel Serverless compatibility.
   */
  async runDailyJobsIfNeeded() {
    const JOB_NAME = 'DAILY_SYSTEM_MAINTENANCE';
    const now = new Date();
    
    // 1. Lightweight Throttle: Skip if checked very recently in this instance
    if (Date.now() - lastSystemJobCheckAt < SYSTEM_JOB_THROTTLE_MS) {
      return;
    }
    lastSystemJobCheckAt = Date.now();

    try {
      // 2. Ensure job record exists (idempotent)
      await this.prismaClient.systemJob.upsert({
        where: { name: JOB_NAME },
        update: {},
        create: { name: JOB_NAME },
      });

      // 3. Atomic Claim Strategy (Optimistic Locking)
      // We try to claim the job ONLY if it hasn't run today OR if a previous lock timed out.
      const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const lockExpiry = new Date(Date.now() - 15 * 60 * 1000); // 15 min lock timeout

      const claim = await this.prismaClient.systemJob.updateMany({
        where: {
          name: JOB_NAME,
          OR: [
            {
              // Normal case: Not run today and not currently locked
              status: 'IDLE',
              OR: [
                { lastRunAt: null },
                { lastRunAt: { lt: today } }
              ]
            },
            {
              // Recovery case: Stuck in RUNNING state for over 15 minutes (lambda crash)
              status: 'RUNNING',
              lockedAt: { lt: lockExpiry }
            }
          ]
        },
        data: {
          status: 'RUNNING',
          lockedAt: now,
        }
      });

      if (claim.count === 0) {
        // Already executed today or another parallel request claimed it first.
        return;
      }

      logger.info('[JobService] Daily maintenance claimed and starting...');
      const startTime = Date.now();
      let successCount = 0;
      let failCount = 0;

      // 4. Execute Tasks with Isolation
      // Using a separate loop ensures one failure doesn't stop others.
      const tasks = [
        { name: 'cleanupExpiredSubscriptions', fn: this.cleanupExpiredSubscriptions.bind(this) },
        { name: 'generateDailyReports', fn: this.generateDailyReports.bind(this) },
        { name: 'sendReminders', fn: this.sendReminders.bind(this) },
        { name: 'pruneOldJobs', fn: this.pruneOldJobsTask.bind(this) }
      ];

      for (const task of tasks) {
        const taskStart = Date.now();
        try {
          await task.fn();
          successCount++;
          logger.info(`[JobService] Task SUCCESS: ${task.name}`, { duration: Date.now() - taskStart });
        } catch (err) {
          failCount++;
          logger.error(`[JobService] Task FAILED: ${task.name}`, err);
        }
      }

      const totalDuration = Date.now() - startTime;

      // 5. Finalize State
      // If we had critical failures, we might choose NOT to update lastRunAt so it retries.
      // For now, we update it if any task succeeded, or as requested: "إذا job فشل: لا يتم وضع executed=true"
      if (failCount === 0) {
        await this.prismaClient.systemJob.update({
          where: { name: JOB_NAME },
          data: {
            status: 'IDLE',
            lastRunAt: now,
            lockedAt: null
          }
        });
        logger.info('[JobService] Daily maintenance COMPLETED', { successCount, totalDuration });
      } else {
        // Reset lock but keep lastRunAt as-is so next request retries
        await this.prismaClient.systemJob.update({
          where: { name: JOB_NAME },
          data: {
            status: 'IDLE',
            lockedAt: null
          }
        });
        logger.warn('[JobService] Daily maintenance FINISHED WITH ERRORS (will retry next request)', { 
          successCount, 
          failCount, 
          totalDuration 
        });
      }

    } catch (err) {
      logger.error('[JobService] Critical error in lazy execution wrapper', err);
      // Attempt emergency unlock if we hold the lock
      try {
        await this.prismaClient.systemJob.updateMany({
          where: { name: JOB_NAME, status: 'RUNNING', lockedAt: now },
          data: { status: 'IDLE', lockedAt: null }
        });
      } catch { /* ignore */ }
    }
  }

  // --- Maintenance Task Implementations (Isolated from Transaction) ---

  private async cleanupExpiredSubscriptions() {
    // Logic to expire tenants whose subscription ended
    logger.info('[JobService] Task: cleanupExpiredSubscriptions (stub)');
  }

  private async generateDailyReports() {
    // Logic to aggregate data for daily stats
    logger.info('[JobService] Task: generateDailyReports (stub)');
  }

  private async sendReminders() {
    // Logic to queue reminder notifications for today's appointments
    logger.info('[JobService] Task: sendReminders (stub)');
  }

  private async pruneOldJobsTask() {
    const daysOld = 7;
    const cutoff = new Date(Date.now() - daysOld * 86_400_000);
    const result = await this.prismaClient.job.deleteMany({
      where: {
        status: { in: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED] },
        updatedAt: { lt: cutoff },
      },
    });
    logger.info('[JobService] Task: pruneOldJobsTask executed', { deleted: result.count });
  }

  /**
   * Recovery sweeper for stuck background jobs:
   * Find jobs in 'PROCESSING' state older than 10 minutes,
   * and reset to 'PENDING' if attempts < 3, else mark 'FAILED'.
   */
  async recoverStuckJobs() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);

    // Execute atomic raw update
    const updatedCount = await this.prismaClient.$executeRaw`
      UPDATE jobs
      SET    status = CASE WHEN attempts < 3 THEN 'PENDING' ELSE 'FAILED' END,
             updated_at = NOW()
      WHERE  status = 'PROCESSING'
        AND  updated_at < ${cutoff}
    `;

    if (updatedCount > 0) {
      logger.warn('[JobService] Stuck jobs recovery sweeper rescued jobs', { count: updatedCount });
    } else {
      logger.info('[JobService] Stuck jobs recovery sweeper finished (no stuck jobs found)');
    }

    return updatedCount;
  }

  /**
   * Executes a single locked job based on its type and payload.
   * Invoked by the cron runner route.
   */
  async executeJob(job: { id: string; type: JobType; payload: Record<string, unknown>; tenantId: string }) {
    const { id, type, payload, tenantId } = job;
    
    const { withTrace } = await import('@/lib/observability/context');
    
    return withTrace({ requestId: id, tenantId }, async () => {
      logger.info('[JobService] Executing job within tenant trace context', { jobId: id, type, tenantId });

      let tracker: { trackEvent: (opts: any) => Promise<any> };
      if (this.eventService) {
        tracker = this.eventService;
      } else {
        const { EventService } = await import('@/services/event.service');
        tracker = EventService;
      }

      switch (type) {
        case JOB_TYPE.CHECK_PATIENT_NO_SHOW: {
          const appointmentId = payload.appointmentId as string;
          if (!appointmentId) throw new Error('Missing appointmentId in payload');

          const appointment = await this.prismaClient.appointment.findUnique({
            where: { id: appointmentId },
            select: { status: true, id: true },
          });

          if (!appointment) {
            logger.warn('[JobService] Appointment not found for no-show check', { appointmentId });
            break;
          }

          if (appointment.status === 'SCHEDULED') {
            await this.prismaClient.appointment.update({
              where: { id: appointment.id },
              data: { status: 'NO_SHOW' },
            });

            await tracker.trackEvent({
              tenantId,
              eventType: 'PATIENT_NO_SHOW',
              entityType: 'APPOINTMENT',
              entityId: appointment.id,
              metadata: { autoMarked: true, jobId: id },
            });

            logger.info('[JobService] Appointment marked as NO_SHOW', { appointmentId });
          }
          break;
        }

        case JOB_TYPE.CHECK_INVOICE_OVERDUE: {
          const invoiceId = payload.invoiceId as string;
          if (!invoiceId) throw new Error('Missing invoiceId in payload');

          const invoice = await this.prismaClient.invoice.findUnique({
            where: { id: invoiceId },
            select: { status: true, dueDate: true, id: true },
          });

          if (!invoice) {
            logger.warn('[JobService] Invoice not found for overdue check', { invoiceId });
            break;
          }

          if (invoice.status === 'PENDING' || invoice.status === 'PARTIAL') {
            const now = new Date();
            if (invoice.dueDate && new Date(invoice.dueDate) < now) {
              await this.prismaClient.invoice.update({
                where: { id: invoice.id },
                data: { status: 'OVERDUE' },
              });

              await tracker.trackEvent({
                tenantId,
                eventType: 'INVOICE_OVERDUE',
                entityType: 'INVOICE',
                entityId: invoice.id,
                metadata: { dueDate: invoice.dueDate, jobId: id },
              });

              logger.info('[JobService] Invoice marked as OVERDUE', { invoiceId });
            }
          }
          break;
        }

        case JOB_TYPE.CHECK_TREATMENT_DELAYED: {
          const itemId = payload.itemId as string;
          if (!itemId) throw new Error('Missing itemId in payload');

          const item = await this.prismaClient.treatmentPlanItem.findUnique({
            where: { id: itemId },
            select: { status: true, scheduledDate: true, planId: true, id: true },
          });

          if (!item) {
            logger.warn('[JobService] TreatmentPlanItem not found for delay check', { itemId });
            break;
          }

          if (item.status === 'Planned') {
            const now = new Date();
            if (item.scheduledDate && new Date(item.scheduledDate) < now) {
              await this.prismaClient.treatmentPlanItem.update({
                where: { id: item.id },
                data: { status: 'Delayed' },
              });

              await tracker.trackEvent({
                tenantId,
                eventType: 'TREATMENT_DELAYED',
                entityType: 'TREATMENT',
                entityId: item.planId,
                metadata: { itemId: item.id, scheduledDate: item.scheduledDate, jobId: id },
              });

              logger.info('[JobService] TreatmentPlanItem marked as Delayed', { itemId });
            }
          }
          break;
        }

        case JOB_TYPE.SEND_NOTIFICATION:
        case JOB_TYPE.SEND_EMAIL: {
          logger.info('[JobService] Send Notification/Email job executed (stub)', { payload });
          break;
        }

        default:
          throw new Error(`Unsupported job type: ${type}`);
      }
    });
  }

  private generateDedupKey(type: string, payload: Record<string, unknown>, tenantId: string): string {
    // Include primary entity IDs in the hash to keep keys stable for the same logical job
    const entityId =
      (payload.appointmentId ?? payload.invoiceId ?? payload.itemId ?? payload.userId ?? '') as string;
    const content = `${tenantId}:${type}:${entityId}`;
    return createHash('sha256').update(content).digest('hex');
  }
}

// Backwards-compatible export wrappers pointing to dynamic singleton
export async function enqueueJob(opts: EnqueueOptions) {
  const service = JobService.instance ?? new JobService();
  return service.enqueueJob(opts);
}

export async function markJobProcessing(jobId: string) {
  const service = JobService.instance ?? new JobService();
  return service.markJobProcessing(jobId);
}

export async function markJobCompleted(jobId: string) {
  const service = JobService.instance ?? new JobService();
  return service.markJobCompleted(jobId);
}

export async function markJobFailed(jobId: string, error: unknown) {
  const service = JobService.instance ?? new JobService();
  return service.markJobFailed(jobId, error);
}

export async function fetchAndLockPendingJobs(limit = 50) {
  const service = JobService.instance ?? new JobService();
  return service.fetchAndLockPendingJobs(limit);
}

export async function pruneOldJobs(daysOld = 7) {
  const service = JobService.instance ?? new JobService();
  return service.pruneOldJobs(daysOld);
}

export async function runDailyJobsIfNeeded() {
  const service = JobService.instance ?? new JobService();
  return service.runDailyJobsIfNeeded();
}

export async function recoverStuckJobs() {
  const service = JobService.instance ?? new JobService();
  return service.recoverStuckJobs();
}

export async function executeJob(job: { id: string; type: JobType; payload: Record<string, unknown>; tenantId: string }) {
  const service = JobService.instance ?? new JobService();
  return service.executeJob(job);
}
