'use client';

import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { finalizeStaffInvitation } from '@/app/actions/auth';
import Link from 'next/link';

interface AcceptInvitationFormProps {
  email: string;
  clinicName: string;
}

export function AcceptInvitationForm({ email, clinicName }: AcceptInvitationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const result = await finalizeStaffInvitation(formData);

    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      
      // Redirect handled by success view below
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Welcome Aboard!</h2>
          <p className="text-white/50">Your account has been activated and you are now a member of {clinicName}.</p>
        </div>
        <Link 
          href="/dashboard"
          className="block w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-6">
        <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Invited Email</p>
        <p className="text-white font-medium">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 ml-1">Set Your Password</label>
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 ml-1">Confirm Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500 transition-colors" />
            <input
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Activate Account & Join'
          )}
        </button>
      </form>
    </div>
  );
}
