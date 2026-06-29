'use server'

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { UserRepository } from "@/repositories/user.repository";
import { StaffRepository } from "@/repositories/staff.repository";
import { TenantRepository } from "@/repositories/tenant.repository";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/audit.service";
import crypto from "crypto";
import { StaffRole } from "@/generated/client";
import { EmailService } from "@/services/email.service";

const userRepository = new UserRepository();
const staffRepository = new StaffRepository();
const tenantRepository = new TenantRepository();

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
  const dbUser = await userRepository.findUniqueWithActiveMembership(data.user.id);

  if (!dbUser) {
    console.error(`[AUTH_TRACE][USER_FETCH_FAILED] No DB user record found for SupabaseId: ${data.user.id}`);
    console.log(`[AUTH_TRACE][FINAL_ERROR] Stage: USER_FETCH, Code: NO_USER_RECORD`);
    return { success: false, error: 'NO_USER_RECORD' };
  }

  console.log(`[AUTH_TRACE][USER_FETCH_SUCCESS] DbUserId: ${dbUser.id}, Memberships: ${dbUser.memberships.length}`);
  
  if (dbUser.memberships.length === 0) {
    console.warn(`[AUTH_STEP_4][TENANT_MEMBERSHIP_MISSING] UserId: ${dbUser.id}, Email: ${email}`);
    
    // Check if there's a pending invitation
    const pendingInvite = await staffRepository.findPendingInvitation(email);

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

  // Set active tenant cookie so getUserSession() can resolve the tenant
  cookieStore.set('active_tenant_id', primaryMembership.tenantId, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  });
  console.log(`[AUTH_TRACE][COOKIE_SET_SUCCESS] Name: active_tenant_id, Value: ${primaryMembership.tenantId}`);

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
  
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;

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

  const invite = await staffRepository.findInvitationByToken(tokenHash);

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
export async function finalizeStaffInvitation(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Not authenticated. The invitation link may have expired." };
  }

  const staffId = user.user_metadata?.staffId;
  if (!staffId) {
    return { success: false, error: "Invalid invitation data. Please contact support." };
  }

  const { prisma } = await import('@/lib/prisma');
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: staffId }
  });

  if (!invitation || invitation.status !== 'PENDING') {
    return { success: false, error: "Invitation not found or already accepted." };
  }

  // 1. Update user password in Supabase
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 2. Create local User and Membership inside a transaction
  const { user: dbUser } = await staffRepository.acceptInvitation(user.id, invitation);

  // --- PERSISTENT SESSION ARCHITECTURE ---
  try {
    const { SessionService } = await import('@/lib/auth/session-service');
    const { headers: getHeaders } = await import('next/headers');
    const headerList = await getHeaders();

    const { data: sessionData } = await supabase.auth.getSession();

    const { appRefreshToken } = await SessionService.createSession({
      userId: dbUser.id,
      tenantId: invitation.tenantId,
      ipAddress: headerList.get('x-forwarded-for') || undefined,
      userAgent: headerList.get('user-agent') || undefined
    }, sessionData.session?.refresh_token || '');

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

  revalidatePath('/', 'layout');
  return { success: true };
}

// Aliases for frontend consistency
export const login = staffLogin;
export const signupWithInvite = finalizeStaffInvitation;

export async function createStaffInvitation(data: { email: string; fullName: string; role: StaffRole; jobTitle?: string }, tenantId: string) {
  const { email, fullName, role, jobTitle } = data;

  const supabase = await createClient();
  const { data: { user: invitedByUser } } = await supabase.auth.getUser();

  if (!invitedByUser) {
    console.log('[STAFF_FAIL] Failed at: invitedByUser not found in auth.getUser()');
    throw new Error("Unauthorized");
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  
  // Set expiration (e.g., 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Check for existing pending invitation
  const existingInvite = await staffRepository.findPendingInvitationByTenant(tenantId, email);

  if (existingInvite) {
    console.log('[STAFF_FAIL] Failed at: existing pending invitation found for this email');
    return { success: false, error: "A pending invitation already exists for this email." };
  }

  const dbInvitedBy = await userRepository.findBySupabaseId(invitedByUser.id);
  if (!dbInvitedBy) {
    console.log('[STAFF_FAIL] Failed at: dbInvitedBy (inviting user) not found in DB');
    throw new Error("Inviting user record not found");
  }

  const invitation = await staffRepository.createInvitation(tenantId, {
    email,
    fullName,
    role: role.toUpperCase() as any,
    jobTitle,
    tokenHash,
    invitedById: dbInvitedBy.id,
    expiresAt,
  });

  console.log('[INVITE] Starting invitation for:', email);
  console.log('[INVITE] Staff saved, sending email...');

  // Log Audit
  await AuditService.logAudit({
    action: 'STAFF_INVITATION_CREATED',
    entityType: 'STAFF_INVITATION',
    entityId: invitation.id,
    tenantId,
    metadata: { email, role }
  });

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;
  const inviteUrlBase = `${siteUrl}/staff/accept-invitation`;
  
  try {
    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: inviteUrlBase,
        data: {
          tenantId: tenantId,
          role: role,
          staffId: invitation.id
        }
      }
    });

    // Fallback if user already exists in Supabase
    if (linkError && linkError.status === 422 && linkError.message.includes('already been registered')) {
      console.log('[INVITE] User already exists, generating magiclink instead...');
      const magicResponse = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: inviteUrlBase,
          data: {
            tenantId: tenantId,
            role: role,
            staffId: invitation.id
          }
        }
      });
      linkData = magicResponse.data;
      linkError = magicResponse.error;
    }

    if (linkError) {
      console.log('[INVITE] ERROR generating link:', linkError);
      
      // Rollback database creation to prevent ghost record
      const { prisma } = await import("@/lib/prisma");
      await prisma.staffInvitation.delete({ where: { id: invitation.id } });

      return { success: false, error: linkError.message };
    }

    const inviteUrl = linkData?.properties?.action_link;
    const tenant = await tenantRepository.findUnique(tenantId);

    const emailResult = await EmailService.sendStaffInvitation({
      email,
      fullName,
      clinicName: tenant?.name || 'Neoliva',
      inviteUrl: inviteUrl || '',
    });

    if (emailResult.success) {
      console.log('[INVITE] Email sent successfully');
    } else {
      console.log('[INVITE] ERROR:', emailResult.error);
    }
  } catch (error) {
    console.log('[INVITE] ERROR:', error);
  }

  revalidatePath('/dashboard/staff');
  return { success: true, invitationId: invitation.id };
}

export async function activateStaffAccount(userId: string, tenantId?: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return { success: false, error: 'Not authenticated or invalid user.' };
  }

  const staffId = user.user_metadata?.staffId;
  const { prisma } = await import('@/lib/prisma');
  
  let invitation;
  if (staffId) {
     invitation = await prisma.staffInvitation.findUnique({
       where: { id: staffId }
     });
  } else if (tenantId) {
     invitation = await prisma.staffInvitation.findFirst({
       where: { email: user.email, tenantId, status: 'PENDING' }
     });
  } else {
     invitation = await prisma.staffInvitation.findFirst({
       where: { email: user.email, status: 'PENDING' }
     });
  }

  if (!invitation || invitation.status !== 'PENDING') {
    return { success: false, error: 'Invitation not found or already accepted.' };
  }

  try {
    const { user: dbUser } = await staffRepository.acceptInvitation(user.id, invitation);
    
    // Set active_tenant_id cookie
    const cookieStore = await cookies();
    cookieStore.set('active_tenant_id', invitation.tenantId, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // --- PERSISTENT SESSION ARCHITECTURE ---
    // Create a DB-backed session to overwrite any existing owner session
    try {
      const { SessionService } = await import('@/lib/auth/session-service');
      const { headers: getHeaders } = await import('next/headers');
      const headerList = await getHeaders();

      const { data: sessionData } = await supabase.auth.getSession();

      const { appRefreshToken } = await SessionService.createSession({
        userId: dbUser.id,
        tenantId: invitation.tenantId,
        ipAddress: headerList.get('x-forwarded-for') || undefined,
        userAgent: headerList.get('user-agent') || undefined
      }, sessionData.session?.refresh_token || '');

      cookieStore.set('app_refresh_token', appRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,
        path: '/'
      });
    } catch (sessionError) {
      console.error("[AUTH][INVITE_ACTIVATE] Failed to create persistent session:", sessionError);
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error("[AUTH][INVITE_ACTIVATE] Error:", err);
    return { success: false, error: err.message || 'Failed to activate account.' };
  }
}
