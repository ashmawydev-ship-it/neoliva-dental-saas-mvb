'use server'

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/audit.service";
import crypto from "crypto";
import { StaffRole } from "@/generated/client";
import { EmailService } from "@/services/email.service";

export async function staffLogin(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string;
  console.log(`[AUTH_STEP_1][LOGIN_REQUEST_RECEIVED] Email: ${email}, PasswordLength: ${password?.length || 0}`);
  console.log(`[AUTH_RUNTIME_CHECK] SupabaseURL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}, SiteURL: ${process.env.NEXT_PUBLIC_SITE_URL}`);
  const rememberMe = formData.get('remember') === 'true' || formData.get('rememberMe') === 'true';
  const supabase = await createClient();

  // STEP 3: Eliminate Stale Auth State - Clean Reset before login attempt
  console.log(`[AUTH_TRACE][STALE_STATE_CLEANUP_START]`);
  const cookieStore = await cookies();
  
  try {
    cookieStore.delete('app_refresh_token');
    await supabase.auth.signOut();
    console.log(`[AUTH_TRACE][STALE_STATE_CLEANUP_SUCCESS]`);
  } catch (e) {
    console.log(`[AUTH_TRACE][STALE_STATE_CLEANUP_SKIPPED] Reason: ${e instanceof Error ? e.message : 'No active session'}`);
  }

  console.log(`[AUTH_STEP_2][SUPABASE_AUTH_START] Email: ${email}`);
  
  const startTime = Date.now();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  const duration = Date.now() - startTime;

  // STEP 1 — RAW SUPABASE RESPONSE (FORENSIC MODE)
  console.log(`[AUTH_FORENSIC][SUPABASE_RESPONSE]`, {
    email,
    success: !error,
    duration: `${duration}ms`,
    user: data.user ? {
      id: data.user.id,
      email: data.user.email,
      confirmed_at: data.user.confirmed_at,
      last_sign_in_at: data.user.last_sign_in_at
    } : null,
    session: data.session ? {
      access_token: 'PRESENT',
      refresh_token: 'PRESENT',
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in
    } : null,
    error: error ? {
      code: error.status,
      message: error.message,
      name: error.name
    } : null
  });

  if (error) {
    console.warn(`[AUTH_STEP_2][SUPABASE_AUTH_FAILED] Email: ${email}, Status: ${error.status}, Message: ${error.message}`);
    
    // FORENSIC ERROR MAPPING
    let errorCode = 'AUTH_ERROR';
    if (error.message.includes('Invalid login credentials')) {
      errorCode = 'INVALID_CREDENTIALS';
    } else if (error.message.includes('Email not confirmed')) {
      errorCode = 'EMAIL_NOT_CONFIRMED';
    } else if (error.status === 429) {
      errorCode = 'TOO_MANY_REQUESTS';
    } else if (error.status === 400) {
      errorCode = 'BAD_REQUEST';
    }
    
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: SUPABASE_AUTH, Code: ${errorCode}, Raw: ${error.message}`);
    return { success: false, error: errorCode, rawError: error.message };
  }

  console.log(`[AUTH_STEP_2][SUPABASE_AUTH_SUCCESS] UserId: ${data.user?.id}, Email: ${email}`);

  if (!data.user) {
    console.error(`[AUTH_TRACE][USER_OBJECT_MISSING] Success returned but no user object.`);
    return { success: false, error: "AUTH_OBJECT_MISSING" };
  }

  // Find the user and their primary membership
  console.log(`[AUTH_STEP_3][USER_FETCH_START] SupabaseId: ${data.user.id}`);
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: { tenant: true },
        take: 1
      }
    }
  });

  if (!dbUser) {
    console.error(`[AUTH_TRACE][USER_FETCH_FAILED] No DB user record found for SupabaseId: ${data.user.id}`);
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: USER_FETCH, Code: NO_USER_RECORD`);
    return { success: false, error: 'NO_USER_RECORD' };
  }

  console.log(`[AUTH_TRACE][USER_FETCH_SUCCESS] DbUserId: ${dbUser.id}, Memberships: ${dbUser.memberships.length}`);
  
  if (dbUser.memberships.length === 0) {
    console.warn(`[AUTH_STEP_4][TENANT_MEMBERSHIP_MISSING] UserId: ${dbUser.id}, Email: ${email}`);
    
    // Check if there's a pending invitation
    const pendingInvite = await prisma.staffInvitation.findFirst({
      where: { email: email, status: 'PENDING' }
    });

    if (pendingInvite) {
      console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_MEMBERSHIP_CHECK, Code: INVITE_PENDING`);
      return { success: false, error: "Your invitation is pending. Please accept the invitation from your email first." };
    }

    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_MEMBERSHIP_CHECK, Code: NO_MEMBERSHIP`);
    return { success: false, error: "You are not registered as a staff member for any clinic. Please contact your administrator." };
  }

  const primaryMembership = dbUser.memberships[0];
  const tenantStatus = primaryMembership.tenant.status;
  console.log(`[AUTH_STEP_4][TENANT_MEMBERSHIP_FOUND] TenantId: ${primaryMembership.tenantId}, Role: ${primaryMembership.role}, TenantStatus: ${tenantStatus}`);

  // STEP 1: Fix login error rendering - Validate tenant status IMMEDIATELY
  if (tenantStatus === 'DISABLED') {
    console.warn(`[AUTH_TRACE][TENANT_STATUS_BLOCKED] Reason: ACCOUNT_DISABLED`);
    await supabase.auth.signOut();
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_STATUS_CHECK, Code: ACCOUNT_DISABLED`);
    return { success: false, error: 'ACCOUNT_DISABLED' };
  }
  
  if (tenantStatus === 'SUSPENDED') {
    console.warn(`[AUTH_TRACE][TENANT_STATUS_BLOCKED] Reason: ACCOUNT_SUSPENDED`);
    await supabase.auth.signOut();
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_STATUS_CHECK, Code: ACCOUNT_SUSPENDED`);
    return { success: false, error: 'ACCOUNT_SUSPENDED' };
  }

  if (tenantStatus === 'REJECTED') {
    console.warn(`[AUTH_TRACE][TENANT_STATUS_BLOCKED] Reason: ACCOUNT_REJECTED`);
    await supabase.auth.signOut();
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_STATUS_CHECK, Code: ACCOUNT_REJECTED`);
    return { success: false, error: 'ACCOUNT_REJECTED' };
  }

  if (tenantStatus === 'PENDING') {
    console.warn(`[AUTH_TRACE][TENANT_STATUS_BLOCKED] Reason: TENANT_PENDING`);
    await supabase.auth.signOut();
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: TENANT_STATUS_CHECK, Code: TENANT_PENDING`);
    return { success: false, error: 'TENANT_PENDING' };
  }
  
  console.log(`[AUTH_TRACE][TENANT_STATUS_APPROVED] Proceeding to session creation...`);

  // --- PERSISTENT SESSION ARCHITECTURE ---
  // Create a DB-backed session for long-term persistence
  try {
    console.log(`[AUTH_STEP_5][SESSION_CREATION_START] UserId: ${dbUser.id}, TenantId: ${primaryMembership.tenantId}`);
    const { SessionService } = await import('@/lib/auth/session-service');
    const { headers: getHeaders } = await import('next/headers');
    const headerList = await getHeaders();
    
    const { appRefreshToken, session } = await SessionService.createSession({
      userId: dbUser.id,
      tenantId: primaryMembership.tenantId,
      ipAddress: headerList.get('x-forwarded-for') || undefined,
      userAgent: headerList.get('user-agent') || undefined
    }, data.session?.refresh_token || '');

    const sessionId = session.id;
    console.log(`[AUTH_TRACE][SESSION_CREATION_SUCCESS] SessionId: ${sessionId}`);

    // Set the persistent refresh token cookie (90 days)
    const cookieStore = await cookies();
    cookieStore.set('app_refresh_token', appRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: '/'
    });
    console.log(`[AUTH_TRACE][COOKIE_SET_SUCCESS] Name: app_refresh_token, MaxAge: 90 days`);
  } catch (sessionError) {
    console.error("[AUTH][CRITICAL] Failed to create persistent session:", sessionError);
    // We continue since Supabase auth succeeded, but persistence will be limited
  }

  await AuditService.logAudit({
    action: 'STAFF_LOGIN_SUCCESS',
    entityType: 'USER',
    entityId: dbUser.id,
    tenantId: primaryMembership.tenantId,
    metadata: { 
      email: data.user.email,
      role: primaryMembership.role
    }
  });

  revalidatePath('/', 'layout');

  // Smart Redirect System based on Membership Role
  let redirectTarget = '/dashboard';
  switch (primaryMembership.role) {
    case 'OWNER':
    case 'ADMIN':
    case 'MANAGER':
      redirectTarget = '/dashboard';
      break;
    case 'DOCTOR':
      redirectTarget = '/dashboard/appointments';
      break;
    case 'ACCOUNTANT':
      redirectTarget = '/dashboard/finance';
      break;
    default:
      redirectTarget = '/dashboard';
  }

  console.log(`[AUTH_STEP_6][FINAL_REDIRECT_TARGET] Target: ${redirectTarget}`);
  return redirect(redirectTarget);
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}


export async function validateInviteToken(tokenHash: string) {
  if (!tokenHash) return { valid: false };

  const invite = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
    include: { tenant: true }
  });

  if (!invite) return { valid: false, error: "Invitation not found." };
  if (invite.status !== 'PENDING') return { valid: false, error: `Invitation already ${invite.status.toLowerCase()}.` };
  if (invite.expiresAt < new Date()) return { valid: false, error: "Invitation expired." };

  return { 
    valid: true, 
    email: invite.email,
    fullName: invite.fullName,
    role: invite.role,
    clinicName: invite.tenant.name
  };
}

export async function acceptStaffInvitation(formData: FormData) {
  const rawToken = formData.get('token') as string;
  const password = formData.get('password') as string;

  if (!rawToken) return { success: false, error: "Invitation token is required." };

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const validation = await validateInviteToken(tokenHash);
  if (!validation.valid) return { success: false, error: validation.error };

  const invite = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
    include: { tenant: true }
  });

  if (!invite) return { success: false, error: "Invitation not found." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 1. Sign up or Link User in Supabase
  const { data, error } = await supabase.auth.signUp({
    email: invite.email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { full_name: invite.fullName }
    }
  });

  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Signup failed." };

  // 2. Create local User and Membership inside a transaction
  await prisma.$transaction(async (tx) => {
    // Create or find User
    const user = await tx.user.upsert({
      where: { email: invite.email },
      update: { supabaseId: data.user!.id },
      create: {
        supabaseId: data.user!.id,
        email: invite.email
      }
    });

    // Create Tenant Membership
    const membership = await tx.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: invite.tenantId,
        role: invite.role,
        status: 'ACTIVE'
      }
    });

    // Update Invitation Status
    await tx.staffInvitation.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Optionally create Staff profile
    await tx.staff.create({
      data: {
        name: invite.fullName,
        email: invite.email,
        role: invite.role,
        tenantId: invite.tenantId,
        membershipId: membership.id,
        status: 'Online'
      }
    });

    // --- PERSISTENT SESSION ARCHITECTURE ---
    try {
      const { SessionService } = await import('@/lib/auth/session-service');
      const { headers: getHeaders } = await import('next/headers');
      const headerList = await getHeaders();

      const { appRefreshToken } = await SessionService.createSession({
        userId: user.id,
        tenantId: invite.tenantId,
        ipAddress: headerList.get('x-forwarded-for') || undefined,
        userAgent: headerList.get('user-agent') || undefined
      }, data.session?.refresh_token || '', tx);

      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      cookieStore.set('app_refresh_token', appRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,
        path: '/'
      });
    } catch (sessionError) {
      console.error("[AUTH][INVITE] Failed to create persistent session:", sessionError);
    }
  });

  revalidatePath('/', 'layout');
  redirect('/staff/sign-in?success=invitation-accepted');
}

// Aliases for frontend consistency
export const login = staffLogin;
export const signupWithInvite = acceptStaffInvitation;

export async function createStaffInvitation(data: { email: string; fullName: string; role: StaffRole; jobTitle?: string }, tenantId: string) {
  const { email, fullName, role, jobTitle } = data;

  const supabase = await createClient();
  const { data: { user: invitedByUser } } = await supabase.auth.getUser();

  if (!invitedByUser) throw new Error("Unauthorized");

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  
  // Set expiration (e.g., 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Check for existing pending invitation
  const existingInvite = await prisma.staffInvitation.findFirst({
    where: { 
      tenantId, 
      email, 
      status: 'PENDING' 
    }
  });

  if (existingInvite) {
    return { success: false, error: "A pending invitation already exists for this email." };
  }

  // Create invitation record
  const invitation = await prisma.staffInvitation.create({
    data: {
      tenantId,
      email,
      fullName,
      role,
      jobTitle,
      tokenHash,
      invitedById: (await prisma.user.findUnique({ where: { supabaseId: invitedByUser.id } }))!.id,
      expiresAt,
    }
  });

  // Log Audit
  await AuditService.logAudit({
    action: 'STAFF_INVITATION_CREATED',
    entityType: 'STAFF_INVITATION',
    entityId: invitation.id,
    tenantId,
    metadata: { email, role }
  });

  // Send invitation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteUrl = `${siteUrl}/staff/accept-invitation?token=${rawToken}`;
  
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  
  await EmailService.sendStaffInvitation({
    email,
    fullName,
    clinicName: tenant?.name || "Your Clinic",
    inviteUrl
  });

  revalidatePath('/dashboard/staff');
  return { success: true, invitationId: invitation.id };
}
