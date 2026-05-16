
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

async function auditUser() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const email = process.env.ADMIN_EMAIL!;
  console.log(`Auditing user: ${email}`);

  // 1. Check auth.users
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError.message);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} NOT found in Supabase Auth!`);
    return;
  }

  console.log("User found in Supabase Auth:", {
    id: user.id,
    email: user.email,
    confirmed_at: user.confirmed_at,
    last_sign_in_at: user.last_sign_in_at,
    banned_until: user.banned_until
  });

  // 2. Try to sign in manually in the script to see if it works with these env vars
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!
  });

  if (signInError) {
    console.error("Sign-in attempt with ENV credentials FAILED:", signInError.message);
  } else {
    console.log("Sign-in attempt with ENV credentials SUCCESS!");
  }
}

auditUser();
