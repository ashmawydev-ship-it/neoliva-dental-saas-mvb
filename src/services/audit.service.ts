import { logger } from '@/lib/logger';
import { getTraceContextSync } from '@/lib/observability/context';
import { resolveTenantContext as getTenantContext } from '@/lib/auth/resolve-tenant-context';
import { headers } from 'next/headers';
import { AuditRepository } from '@/repositories/audit.repository';
import type { Prisma } from '@/generated/client';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/** Subset of a Prisma transaction client — anything with an `auditLog.create`. */
export type AuditTxClient = Prisma.TransactionClient;

export class AuditService {
  static instance?: AuditService;

  constructor(
    private readonly auditRepository = new AuditRepository()
  ) {}

  static async logAudit(options: AuditLogOptions) {
    return (AuditService.instance || new AuditService()).logAudit(options);
  }

  static async logAuditSafe(options: AuditLogOptions) {
    return (AuditService.instance || new AuditService()).logAuditSafe(options);
  }

  static async logAuditInTx(
    tx: AuditTxClient,
    options: AuditLogOptions & { userId?: string; ipAddress?: string; userAgent?: string }
  ) {
    return (AuditService.instance || new AuditService()).logAuditInTx(tx, options);
  }
  /**
   * Logs a security-first, immutable audit record.
   * Auto-injects context (user, tenant, IP, UA, requestId).
   */
  async logAudit(options: AuditLogOptions) {
    const { action, entityType, entityId, tenantId: explicitTenantId, metadata = {} } = options;
    const trace = getTraceContextSync();
    
    let tenantId = explicitTenantId;
    let userId: string | undefined;
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    // 1. Resolve Context (if not explicitly provided)
    if (!tenantId) {
      try {
        const context = await getTenantContext();
        tenantId = context.tenantId;
        userId = context.user?.id;
      } catch {
        // Fallback to trace context (useful for background jobs where auth isn't available)
        tenantId = trace?.tenantId;
        userId = trace?.userId;
      }
    }

    // 2. Resolve Network Context
    try {
      const headersList = await headers();
      // x-forwarded-for might contain multiple IPs, we take the first one
      const forwardedFor = headersList.get('x-forwarded-for');
      ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
      userAgent = headersList.get('user-agent') || 'unknown';
    } catch {
      // Headers not available
    }

    if (!tenantId) {
      logger.error('Audit Log failed: Missing tenantId', { action, entityType });
      return;
    }

    // 3. Mask Sensitive Data
    const maskedMetadata = this.maskSensitiveFields(metadata);

    // 4. Persistence — throws on failure so the caller can decide whether to rollback.
    //    Use logAuditSafe() if you explicitly want fire-and-forget semantics.
    const log = await this.auditRepository.create(tenantId, {
      userId,
      action,
      entityType,
      entityId,
      metadata: maskedMetadata,
      ipAddress,
      userAgent,
      requestId: trace?.requestId,
    });

    // 5. Correlate with System Logs
    logger.info(`Audit Log Created: ${action}`, {
      module: 'AUDIT_SERVICE',
      action,
      tenantId,
      userId,
      entityType,
      entityId,
      requestId: trace?.requestId,
      logId: log.id
    });

    return log;
  }

  /**
   * Fire-and-forget variant for use in error/cleanup paths where audit failure
   * must NOT propagate (e.g. failure audit log inside wrapAction catch block).
   * Logs a CRITICAL alert but does not throw.
   */
  async logAuditSafe(options: AuditLogOptions): Promise<void> {
    try {
      await this.logAudit(options);
    } catch (error) {
      logger.error('CRITICAL: Audit Log creation failed (safe mode)', error, {
        action: options.action,
        tenantId: options.tenantId,
      });
    }
  }

  /**
   * Transactional variant: writes the audit row inside an existing Prisma
   * transaction so the audit log and the primary mutation share one atomic
   * Postgres transaction. If this throws, the outer $transaction rolls back both.
   *
   * Usage (inside a service method):
   * ```ts
   * await rawPrisma.$transaction(async (tx) => {
   *   const result = await tx.patient.update({ ... });
   *   await AuditService.logAuditInTx(tx, { action: 'PATIENT_UPDATE', ... });
   *   return result;
   * });
   * ```
   */
  async logAuditInTx(
    tx: AuditTxClient,
    options: AuditLogOptions & { userId?: string; ipAddress?: string; userAgent?: string }
  ) {
    const { action, entityType, entityId, tenantId, metadata = {}, userId, ipAddress, userAgent } = options;
    const trace = getTraceContextSync();

    if (!tenantId) {
      throw new Error(`[AuditService] logAuditInTx called without tenantId for action "${action}"`);
    }

    const maskedMetadata = this.maskSensitiveFields(metadata);

    return tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        metadata: maskedMetadata,
        ipAddress,
        userAgent,
        requestId: trace?.requestId ?? null,
      },
    });
  }

  /**
   * Recursively masks sensitive fields in metadata JSON
   */
  private maskSensitiveFields(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.maskSensitiveFields(item));

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'cvv', 
      'card', 'ssn', 'pin', 'auth', 'credential'
    ];
    
    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '********';
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveFields(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
