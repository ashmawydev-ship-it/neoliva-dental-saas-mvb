
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

async function enableTenant(name: string) {
  console.log(`\n[AUTH_FORENSIC][TENANT_FIX] Enabling Tenant: ${name}`);
  
  const tenant = await prisma.tenant.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } }
  });

  if (!tenant) {
    console.error(`[ERROR] Tenant not found.`);
    return;
  }

  console.log(`[BEFORE] Status: ${tenant.status}`);

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: { status: 'APPROVED' }
  });

  console.log(`[AFTER] Status: ${updated.status}`);
  console.log(`[RESULT] Tenant Activation SUCCESSFUL.`);
}

enableTenant('Neoliva').catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
