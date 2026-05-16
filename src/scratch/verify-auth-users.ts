import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUsers() {
  const emails = ['ashmawyalaa@gmail.com', 'neoliva.store@gmail.com'];
  
  for (const email of emails) {
    console.log(`\n--- Verifying User: ${email} ---`);
    
    // Check in auth.users via admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`Error listing users: ${listError.message}`);
      return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (user) {
      console.log(`Found in Supabase Auth:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Confirmed At: ${user.confirmed_at}`);
      console.log(`- Last Sign In: ${user.last_sign_in_at}`);
      console.log(`- Banned until: ${user.banned_until}`);
      console.log(`- User Metadata:`, user.user_metadata);
      console.log(`- App Metadata:`, user.app_metadata);
    } else {
      console.log(`NOT FOUND in Supabase Auth.`);
    }
  }
}

verifyUsers().catch(console.error);
