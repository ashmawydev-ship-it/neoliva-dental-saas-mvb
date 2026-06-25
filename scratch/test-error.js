const { PrismaClient } = require('../src/generated/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const supabaseUserId = 'd378508b-58b1-44fa-88ef-d2aa3b3e6dde';
    const MEMBERSHIP_INCLUDE = {
      tenant: { select: { status: true } },
      user: true,
      staffProfile: { select: { id: true } },
    };
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        user: { supabaseId: supabaseUserId },
        status: 'ACTIVE',
      },
      include: MEMBERSHIP_INCLUDE,
      orderBy: { joinedAt: 'desc' },
    });
    console.log("Success! Memberships:", memberships);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
run();
