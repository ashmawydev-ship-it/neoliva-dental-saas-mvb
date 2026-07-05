const { prisma } = require('./src/lib/prisma');

async function runExplain() {
  const tenantId = '00000000-0000-0000-0000-000000000000'; // dummy uuid
  console.log("--- EXPLAIN ANALYZE Baseline ---");

  try {
    // Query 1: Invoice Revenue Aggregate (status, date)
    console.log("\n1. Invoice Aggregate (tenantId, status, createdAt)");
    const q1 = await prisma.$queryRawUnsafe(`
      EXPLAIN 
      SELECT SUM("total_amount") 
      FROM "invoices" 
      WHERE "tenant_id" = $1::uuid AND "status" = 'PAID' AND "created_at" >= $2::timestamp
    `, tenantId, new Date('2025-01-01'));
    console.log(q1.map(r => r['QUERY PLAN']).join('\n'));

    // Query 2: Appointment Calendar Lookups
    console.log("\n2. Appointment Range (tenantId, date)");
    const q2 = await prisma.$queryRawUnsafe(`
      EXPLAIN 
      SELECT * 
      FROM "appointments" 
      WHERE "tenant_id" = $1::uuid AND "date" >= $2::timestamp AND "date" <= $3::timestamp
    `, tenantId, new Date('2025-01-01'), new Date('2025-01-31'));
    console.log(q2.map(r => r['QUERY PLAN']).join('\n'));
    
    // Query 3: Doctor Commission GroupBy
    console.log("\n3. Doctor Commission GroupBy (tenantId, doctorId, status)");
    const q3 = await prisma.$queryRawUnsafe(`
      EXPLAIN 
      SELECT "doctor_id", "status", SUM("amount") 
      FROM "doctor_commissions" 
      WHERE "tenant_id" = $1::uuid
      GROUP BY "doctor_id", "status"
    `, tenantId);
    console.log(q3.map(r => r['QUERY PLAN']).join('\n'));

    // Query 4: Inventory Joins
    console.log("\n4. Inventory Stock Entry Joins (tenantId, itemId)");
    const q4 = await prisma.$queryRawUnsafe(`
      EXPLAIN 
      SELECT i.id, SUM(e.quantity)
      FROM "inventory_items" i
      LEFT JOIN "stock_entries" e ON i.id = e."item_id"
      WHERE i."tenant_id" = $1::uuid
      GROUP BY i.id
    `, tenantId);
    console.log(q4.map(r => r['QUERY PLAN']).join('\n'));

  } catch(e) {
    console.error(e);
  }

  await prisma.$disconnect();
}

runExplain().catch(console.error);
