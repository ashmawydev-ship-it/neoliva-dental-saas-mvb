import { prisma } from "@/lib/prisma";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";
import { UserPlus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams: { code?: string; token_hash?: string; type?: string };
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { code, token_hash, type } = await searchParams;
  const supabase = await createClient();

  // Try to establish session from code or token_hash if not already logged in
  let sessionError = null;
  
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionError = error;
  } else if (token_hash && type === 'invite') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' });
    sessionError = error;
  }

  // Get the resulting user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If we couldn't get a user, the link is invalid or expired
  if (!user || userError) {
    return (
      <div className="min-h-screen bg-[oklch(0.05_0.02_240)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invitation Expired</h1>
          <p className="text-white/40 font-medium">
            {sessionError?.message || "This invitation is no longer valid or has already been used."}
          </p>
          <Link href="/staff/sign-in" className="inline-block text-blue-400 font-bold hover:underline">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  const staffId = user.user_metadata?.staffId;

  if (!staffId) {
    return (
      <div className="min-h-screen bg-[oklch(0.05_0.02_240)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invalid Invitation</h1>
          <p className="text-white/40 font-medium">The invitation metadata is missing or corrupted. Please contact your administrator.</p>
          <Link href="/" className="inline-block text-blue-400 font-bold hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: staffId },
    include: { tenant: true }
  });

  if (!invitation || invitation.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-[oklch(0.05_0.02_240)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invitation Already Processed</h1>
          <p className="text-white/40 font-medium">This invitation has already been accepted or is no longer pending.</p>
          <Link href="/staff/sign-in" className="inline-block text-blue-400 font-bold hover:underline">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.05_0.02_240)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      <div className="max-w-md w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            Join <span className="text-blue-500">{invitation.tenant.name}</span>
          </h1>
          <p className="text-white/40 font-medium text-sm">
            Complete your profile to access the dashboard
          </p>
        </div>

        <AcceptInvitationForm 
          email={invitation.email} 
          clinicName={invitation.tenant.name} 
        />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-10">
        <p className="text-[10px] text-white font-bold tracking-[0.4em] uppercase">
          NEOLIVA SECURE ONBOARDING
        </p>
      </div>
    </div>
  );
}
