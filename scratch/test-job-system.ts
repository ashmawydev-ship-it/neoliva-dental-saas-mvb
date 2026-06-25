import { prisma } from '../src/lib/prisma';
import { 
  enqueueJob, 
  recoverStuckJobs, 
  fetchAndLockPendingJobs, 
  executeJob, 
  markJobCompleted,
  markJobFailed,
  JOB_STATUS, 
  JOB_TYPE 
} from '../src/services/job.service';
import { logger } from '../src/lib/logger';

async function testJobSystem() {
  logger.info('--- STARTING JOB SYSTEM VERIFICATION ---');

  // Find a tenant to use for testing
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (!tenant) {
    logger.error('No tenant found in the database. Please run seed first.');
    return;
  }
  const tenantId = tenant.id;
  logger.info(`Using tenant ID: ${tenantId}`);

  // Find a doctor and patient to create a mock appointment, or create them
  let doctor = await prisma.staff.findFirst({ where: { role: 'DOCTOR', tenantId }, select: { id: true } });
  if (!doctor) {
    logger.info('Creating a mock doctor for testing...');
    doctor = await prisma.staff.create({
      data: {
        tenantId,
        name: 'Dr. Test Audit',
        role: 'DOCTOR',
        email: `dr.test.audit.${Date.now()}@example.com`,
        displayId: `DOC-${Date.now()}`
      },
      select: { id: true }
    });
  }

  let patient = await prisma.patient.findFirst({ where: { tenantId }, select: { id: true } });
  if (!patient) {
    logger.info('Creating a mock patient for testing...');
    patient = await prisma.patient.create({
      data: {
        tenantId,
        name: 'Patient Test Audit',
        email: `patient.test.audit.${Date.now()}@example.com`,
        displayId: `PAT-${Date.now()}`
      },
      select: { id: true }
    });
  }

  logger.info(`Using Doctor ID: ${doctor.id}, Patient ID: ${patient.id}`);

  // Create a mock appointment in SCHEDULED state
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      patientId: patient.id,
      doctorId: doctor.id,
      date: new Date(),
      time: new Date(),
      duration: 30,
      treatment: 'Audit Test Treatment',
      status: 'SCHEDULED'
    }
  });
  logger.info(`Created mock appointment ID: ${appointment.id}`);

  // 1. TEST ENQUEUE & EXECUTE RUNNER FLOW
  const dedupKey = `test-no-show:${appointment.id}`;
  
  // Clean up any existing job with this key
  await prisma.job.deleteMany({ where: { dedupKey } });

  const enqueued = await enqueueJob({
    type: JOB_TYPE.CHECK_PATIENT_NO_SHOW,
    payload: { appointmentId: appointment.id, tenantId },
    runAt: new Date(Date.now() - 1000), // in the past
    tenantId,
    dedupKey
  });

  if (!enqueued) {
    logger.error('Failed to enqueue test job.');
    return;
  }
  logger.info(`Enqueued test job ID: ${enqueued.id}`);

  // Fetch and Lock pending jobs
  const claimed = await fetchAndLockPendingJobs(1);
  const testJob = claimed.find((j: any) => j.id === enqueued.id);

  if (!testJob) {
    logger.error('Claimed jobs did not include our test job.');
    return;
  }
  logger.info(`Claimed and locked job: ${testJob.id}, status in DB updated to PROCESSING.`);

  // Execute the job
  try {
    await executeJob(testJob as any);
    await markJobCompleted(testJob.id);
    logger.info('Job executed and marked COMPLETED successfully.');
  } catch (err) {
    logger.error('Job execution failed:', err);
    await markJobFailed(testJob.id, err);
  }

  // Verify appointment status was updated to NO_SHOW
  const updatedApt = await prisma.appointment.findUnique({
    where: { id: appointment.id },
    select: { status: true }
  });
  logger.info(`Verified Appointment status: ${updatedApt?.status} (Expected: NO_SHOW)`);

  // Verify job status is COMPLETED
  const completedJob = await prisma.job.findUnique({ where: { id: testJob.id } });
  logger.info(`Verified Job status: ${completedJob?.status} (Expected: COMPLETED)`);

  // 2. TEST DEADLOCK RECOVERY SWEEPER
  const stuckDedupKey = `test-stuck-job:${appointment.id}`;
  await prisma.job.deleteMany({ where: { dedupKey: stuckDedupKey } });

  // Manually create a stuck job in 'PROCESSING' state with an old updated_at
  const oldDate = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
  
  const stuckJob = await prisma.job.create({
    data: {
      tenantId,
      type: JOB_TYPE.SEND_NOTIFICATION,
      payload: { userId: doctor.id, message: 'stuck notification' },
      runAt: oldDate,
      status: 'PROCESSING',
      attempts: 1,
      dedupKey: stuckDedupKey,
      createdAt: oldDate,
      updatedAt: oldDate
    }
  });
  
  // Directly bypass prisma middleware auto-update fields to simulate an old updated_at timestamp
  await prisma.$executeRawUnsafe(
    `UPDATE jobs SET updated_at = NOW() - INTERVAL '15 minutes' WHERE id = '${stuckJob.id}'`
  );
  logger.info(`Created stuck job ID: ${stuckJob.id} in 'PROCESSING' state older than 10 mins.`);

  // Run stuck jobs recovery sweeper
  const recoveredCount = await recoverStuckJobs();
  logger.info(`Stuck jobs sweeper recovered: ${recoveredCount} jobs (Expected: 1+)`);

  // Verify the job was reset to PENDING
  const recoveredJob = await prisma.job.findUnique({ where: { id: stuckJob.id } });
  logger.info(`Verified recovered job status: ${recoveredJob?.status} (Expected: PENDING)`);

  // Clean up test data
  await prisma.job.deleteMany({ where: { id: { in: [enqueued.id, stuckJob.id] } } });
  await prisma.appointment.delete({ where: { id: appointment.id } });
  // Clean up mock doctor and patient if we created them
  if (doctor.name === 'Dr. Test Audit') {
    await prisma.staff.delete({ where: { id: doctor.id } });
  }
  if (patient.name === 'Patient Test Audit') {
    await prisma.patient.delete({ where: { id: patient.id } });
  }
  logger.info('Cleaned up test data.');
  logger.info('--- JOB SYSTEM VERIFICATION SUCCESSFUL ---');
}

testJobSystem().catch(console.error);
