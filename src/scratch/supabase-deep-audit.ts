
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deepAudit(userId: string) {
  console.log(`\n[AUTH_FORENSIC][DEEP_AUDIT] Auditing User ID: ${userId}`);
  
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    console.error(`[ERROR]`, error);
    return;
  }

  if (!user) {
    console.log(`[RESULT] User not found.`);
    return;
  }

  console.log(`[RESULT] Detailed User Data:`, JSON.stringify(user, null, 2));
}

const userId = process.argv[2] || '31bd6623-e6ec-4531-b1cd-463f3c27edac';
deepAudit(userId).catch(console.error);
