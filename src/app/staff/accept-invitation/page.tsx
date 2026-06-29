'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Building2, ShieldCheck, Loader2 } from 'lucide-react';
import { activateStaffAccount } from '@/app/actions/auth';
import Link from 'next/link';

function AcceptInvitationForm() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const code = queryParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const errorHash = hashParams.get('error') || queryParams.get('error');
        const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');

        if (errorHash || errorCode === 'otp_expired') {
          throw new Error(errorDesc?.replace(/\+/g, ' ') || 'The invitation link has expired or is invalid. Please request a new invitation.');
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken && type === 'invite') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          // Check if already authenticated (maybe they refreshed the page)
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
             throw new Error('No valid invitation token found.');
          }
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Could not get user details.');

        setUserId(user.id);
        
        if (user.user_metadata) {
          if (user.user_metadata.tenantId) setTenantId(user.user_metadata.tenantId);
          const name = user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'Staff Member';
          setStaffName(name);
        }

        setVerifying(false);
      } catch (err: any) {
        console.error(err);
        setError('Invitation expired. Contact your clinic admin.');
        setVerifying(false);
      }
    };

    verifyToken();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      if (!userId) throw new Error('User ID not found.');

      const result = await activateStaffAccount(userId, tenantId || undefined);
      if (!result.success) {
        if (result.error?.includes('already accepted')) {
          setSuccess(true);
          setTimeout(() => router.push('/staff/sign-in'), 2000);
          return;
        }
        throw new Error(result.error);
      }

      setSuccess(true);
      setTimeout(() => router.push('/staff/sign-in'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative z-10 transition-all">
      {/* Portal Branding */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl flex items-center justify-center shadow-lg mb-6 group hover:scale-110 transition-transform duration-500">
          <Building2 className="w-8 h-8 text-blue-400" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em]">Secure Staff Access</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
          Account <span className="text-blue-500 font-medium">Activation</span>
        </h1>
      </div>

      {verifying ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-white/60 text-sm">Verifying your invitation...</p>
        </div>
      ) : error && !userId ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-center text-sm mb-6">
          {error}
        </div>
      ) : success ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <p className="text-white font-medium mb-2">Account activated! Please sign in.</p>
          <p className="text-white/60 text-sm">Redirecting to sign in...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="text-center mb-2">
            <h2 className="text-xl font-semibold text-white">Welcome, {staffName}</h2>
            <p className="text-white/40 text-sm mt-1">Set your password to activate your account</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block ml-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all"
                placeholder="Re-enter your password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-2xl px-5 py-4 mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Activate My Account'
            )}
          </button>
        </form>
      )}

      <div className="mt-10 pt-8 border-t border-white/5 text-center flex flex-col gap-4">
        <Link 
          href="/staff/sign-in" 
          className="text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.05_0.02_240)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-600/5 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />

      <Suspense fallback={
        <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative z-10 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }>
        <AcceptInvitationForm />
      </Suspense>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-10">
        <p className="text-[10px] text-white font-bold tracking-[0.4em] uppercase">
          NEOLIVA ENTERPRISE SECURITY
        </p>
      </div>
    </div>
  );
}
