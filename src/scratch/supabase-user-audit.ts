
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function auditUser(email: string) {
  console.log(`\n[AUTH_FORENSIC][USER_AUDIT] Auditing: ${email}`);
  
  // 1. List users by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error(`[ERROR] Failed to list users:`, listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.log(`[RESULT] User NOT FOUND in Supabase Auth.`);
    return;
  }

  console.log(`[RESULT] User FOUND.`);
  console.log(`[DETAILS]`, {
    id: user.id,
    email: user.email,
    email_confirmed: !!user.email_confirmed_at,
    last_sign_in: user.last_sign_in_at,
    created_at: user.created_at,
    is_banned: !!user.banned_until,
    is_deleted: !!user.deleted_at,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
    identities: user.identities?.map(i => ({
      provider: i.provider,
      identity_id: i.identity_id,
      last_sign_in: i.last_sign_in_at
    }))
  });

  // 2. Check if password is set (via identities)
  const hasPassword = user.identities?.some(i => i.provider === 'email');
  console.log(`[PASSWORD_CHECK] Email identity present: ${hasPassword}`);

  // 3. Try to sign in (as verification if we had the password, but we don't here)
  // We can't verify the password without the actual password, but we've confirmed the account state.
}

const targetEmail = process.argv[2] || 'neoliva.store@gmail.com';
auditUser(targetEmail).catch(console.error);
