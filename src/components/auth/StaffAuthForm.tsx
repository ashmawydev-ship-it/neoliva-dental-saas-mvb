
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { staffLogin } from '@/app/actions/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuthError } from '@/lib/auth-errors';

export function StaffAuthForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await staffLogin(formData);

    if (result && !result.success) {
      const authError = getAuthError(result.error);
      setError(authError.description);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success === 'invitation-accepted' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Invitation Accepted!</p>
              <p className="text-xs opacity-80">Your account is ready. Please sign in with your new password.</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 ml-1">Work Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500 transition-colors" />
            <input
              ref={emailRef}
              name="email"
              type="email"
              required
              placeholder="dr.ahmed@clinic.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-sm font-medium text-white/70">Password</label>
            <Link 
              href="/staff/forgot-password" 
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500 transition-colors" />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <input 
            type="checkbox" 
            id="remember" 
            name="remember" 
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
          />
          <label htmlFor="remember" className="text-xs text-white/50 font-medium cursor-pointer">Remember me for 30 days</label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-blue-500/10"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Enter Staff Portal'
          )}
        </button>
      </form>
    </div>
  );
}
