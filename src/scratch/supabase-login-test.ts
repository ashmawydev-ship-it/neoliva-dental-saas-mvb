
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email: string, password: string) {
  console.log(`\n[AUTH_FORENSIC][LOGIN_TEST] Testing Login for: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`[RESULT] Login FAILED.`);
    console.error(`[ERROR_DETAILS]`, {
      message: error.message,
      status: error.status,
      code: (error as any).code || 'NO_CODE'
    });
  } else {
    console.log(`[RESULT] Login SUCCESSFUL!`);
    console.log(`[SESSION]`, {
      user_id: data.user.id,
      email: data.user.email,
      aud: data.user.aud,
      last_sign_in: data.user.last_sign_in_at
    });
  }
}

const targetEmail = process.argv[2] || 'neoliva.store@gmail.com';
const targetPassword = process.argv[3] || 'Neoliva@123456';

testLogin(targetEmail, targetPassword).catch(console.error);
