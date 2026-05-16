
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetPassword(userId: string, newPassword: string) {
  console.log(`\n[AUTH_FORENSIC][PASSWORD_FIX] Resetting Password for User ID: ${userId}`);
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (error) {
    console.error(`[ERROR] Password reset failed:`, error);
    return;
  }

  console.log(`[RESULT] Password reset SUCCESSFUL for ${data.user.email}`);
}

const userId = '31bd6623-e6ec-4531-b1cd-463f3c27edac';
const newPassword = 'Neoliva@123456';

resetPassword(userId, newPassword).catch(console.error);
