
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local if exists, otherwise .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixPasswords() {
  const users = [
    { email: 'ashmawyalaa@gmail.com', password: process.env.ADMIN_PASSWORD || 'A3sshmawy@57' },
    { email: 'neoliva.store@gmail.com', password: 'Neoliva@123456' }
  ];

  console.log('--- FORCED PASSWORD RESET AUDIT ---');

  for (const userEntry of users) {
    console.log(`\nProcessing: ${userEntry.email}`);
    
    // Get user ID first
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    const targetUser = authUsers?.find(u => u.email === userEntry.email);

    if (!targetUser) {
      console.error(`[ERROR] User not found in Supabase Auth: ${userEntry.email}`);
      continue;
    }

    console.log(`Found User ID: ${targetUser.id}`);

    const { error: resetError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: userEntry.password
    });

    if (resetError) {
      console.error(`[ERROR] Failed to reset password: ${resetError.message}`);
    } else {
      console.log(`[SUCCESS] Password set to: ${userEntry.password}`);
    }
  }
}

fixPasswords().catch(console.error);
