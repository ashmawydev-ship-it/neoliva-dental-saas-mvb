'use server'

import { createClient } from "@/lib/supabase/server";

/**
 * Step 1: Send password reset email
 */
export async function sendPasswordResetEmail(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) return { success: false, error: 'Email is required' };

  try {
    const supabase = await createClient();

    // Use the production URL from env, fallback to localhost for dev
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err: unknown) {
    console.error('sendPasswordResetEmail error:', err);
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    return { success: false, error: msg };
  }
}

/**
 * Step 2: Update the user's password (called from /reset-password page)
 * The user must already have a valid session from the email link
 */
export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password) return { success: false, error: 'Password is required' };
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters' };
  if (password !== confirmPassword) return { success: false, error: 'Passwords do not match' };

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { success: false, error: error.message };

  return { success: true };
}
