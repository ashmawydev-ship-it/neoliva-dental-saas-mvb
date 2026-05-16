
import { PrismaClient } from '../generated/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function auditPrisma(email: string) {
  console.log(`\n[AUTH_FORENSIC][PRISMA_AUDIT] Auditing: ${email}`);
  
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user) {
      console.log(`[RESULT] User NOT FOUND in Prisma DB.`);
      return;
    }

    console.log(`[RESULT] User FOUND.`);
    console.log(`[DETAILS]`, JSON.stringify({
      id: user.id,
      email: user.email,
      supabaseId: user.supabaseId,
      memberships: user.memberships.map(m => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantStatus: m.tenant.status,
        role: m.role,
        status: m.status
      }))
    }, null, 2));
  } catch (err) {
    console.error(`[ERROR] Prisma query failed:`, err);
  }
}

const targetEmail = process.argv[2] || 'neoliva.store@gmail.com';
auditPrisma(targetEmail).catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
