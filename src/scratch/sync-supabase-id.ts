
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

async function syncId(email: string, actualSupabaseId: string) {
  console.log(`\n[AUTH_FORENSIC][SYNC_ID] Syncing: ${email} -> ${actualSupabaseId}`);
  
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });

  if (!user) {
    console.error(`[ERROR] User not found in Prisma.`);
    return;
  }

  console.log(`[BEFORE] SupabaseId: ${user.supabaseId}`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { supabaseId: actualSupabaseId }
  });

  console.log(`[AFTER] SupabaseId: ${updated.supabaseId}`);
  console.log(`[RESULT] Sync SUCCESSFUL.`);
}

const email = 'neoliva.store@gmail.com';
const actualId = '31bd6623-e6ec-4531-b1cd-463f3c27edac';

syncId(email, actualId).catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
