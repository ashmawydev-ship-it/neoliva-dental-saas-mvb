import { prisma } from './src/lib/prisma'

async function main() {
  console.log("Migrating via raw SQL...");

  // Get distinct patients with measurements
  const patients: any[] = await prisma.$queryRaw`
    SELECT DISTINCT patient_id, tenant_id FROM periodontal_measurements WHERE session_id IS NULL AND patient_id IS NOT NULL
  `;

  let createdSessions = 0;

  for (const p of patients) {
    const patientId = p.patient_id;
    const tenantId = p.tenant_id;

    // Get earliest measurement date
    const dates: any[] = await prisma.$queryRaw`
      SELECT measurement_date FROM periodontal_measurements 
      WHERE patient_id = ${patientId}::uuid AND session_id IS NULL 
      ORDER BY measurement_date ASC LIMIT 1
    `;
    const earliestDate = dates[0]?.measurement_date || new Date();

    // Check if session exists
    const sessions: any[] = await prisma.$queryRaw`
      SELECT id FROM periodontal_sessions WHERE patient_id = ${patientId}::uuid
    `;
    if (sessions.length > 0) continue;

    // Create session
    const sessionId = (await prisma.$queryRaw`
      INSERT INTO periodontal_sessions (patient_id, tenant_id, date, notes)
      VALUES (${patientId}::uuid, ${tenantId}::uuid, ${earliestDate}, 'Legacy Session (Migrated)')
      RETURNING id
    ` as any[])[0].id;

    createdSessions++;

    // Update measurements
    await prisma.$executeRaw`
      UPDATE periodontal_measurements 
      SET session_id = ${sessionId}::uuid
      WHERE patient_id = ${patientId}::uuid AND session_id IS NULL
    `;
  }

  console.log(`Migration complete. Created ${createdSessions} legacy sessions.`)
}


main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
