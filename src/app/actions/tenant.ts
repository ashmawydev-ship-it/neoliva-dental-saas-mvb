'use server'

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { PermissionCode } from "@/types/permissions";
import { TreasuryService } from "@/services/treasury.service";
import { AuditService } from "@/services/audit.service";
import { OnboardingError } from "@/lib/auth/auth-errors";

const treasuryService = new TreasuryService();

// ─── Slug Utilities ───────────────────────────────────────────────────────────

/**
 * generateCollisionResistantSlug
 *
 * Combines a slugified clinic name with a random 6-character suffix
 * to prevent unique constraint collisions.
 *
 * Example: "Smile Care" → "smile-care-k3x9m2"
 *
 * This prevents race conditions where two clinics with the same name
 * attempt registration simultaneously and both hit a unique constraint violation.
 */
function generateCollisionResistantSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '');    // Trim leading/trailing dashes

  // Generate a 6-character alphanumeric suffix
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const suffix = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return `${base}-${suffix}`;
}

// ─── Registration — Saga-Pattern Flow ────────────────────────────────────────

/**
 * createClinicRequest
 *
 * SAGA-PATTERN REGISTRATION FLOW
 * ─────────────────────────────────────────────────────────────────
 * Step 1: Create Supabase Auth user
 * Step 2: Create Tenant + User + Membership + Staff in Prisma transaction
 * Step 3 (Rollback): If Prisma fails → delete Supabase user via admin client
 *
 * This prevents orphaned Supabase accounts (Ghost Accounts) where a user
 * can sign in but has no DB record, causing 500 errors throughout the app.
 *
 * Design decisions:
 * - User.upsert instead of User.create → idempotent, retry-safe
 * - Collision-resistant slugs → prevents race condition on duplicate clinic names
 * - Full rollback on ANY failure → no partial state left in the system
 */
export async function createClinicRequest(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // ── Input Validation ──────────────────────────────────────────────────────
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const supabase = await createClient();
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;

  // Track the Supabase user we create so we can roll back if Prisma fails
  let newSupabaseUserId: string | null = null;
  let authUser: any = null;

  // ── STEP 1: Create Supabase Auth User ────────────────────────────────────
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (signUpError) {
    // Handle the case where the email is already registered in Supabase
    // but may NOT have a DB record (ghost account recovery)
    if (
      signUpError.message.toLowerCase().includes('already registered') ||
      signUpError.message.toLowerCase().includes('already exists') ||
      signUpError.message.toLowerCase().includes('user already registered')
    ) {
      // Attempt to sign in to retrieve their existing Supabase UID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        return {
          error: "This email is already registered. If you forgot your password, please use the reset link.",
        };
      }

      // They signed in successfully — check if DB records are complete
      const existingUser = await prisma.user.findUnique({
        where: { supabaseId: signInData.user!.id },
        include: { memberships: { take: 1 } },
      });

      if (existingUser && existingUser.memberships.length > 0) {
        // Fully registered — just redirect them appropriately
        return { error: "This email is already registered with an active clinic. Please sign in." };
      }

      // Ghost account — Supabase user exists, DB is incomplete
      // Fall through to complete DB setup below using their existing auth UID
      console.warn(`[Registration] Ghost account recovery for ${email}`);
      newSupabaseUserId = null; // Don't roll this one back — it pre-existed
      authUser = signInData.user!;
    } else {
      console.error(`[Registration] Supabase signUp failed for ${email}:`, signUpError.message);
      return { error: signUpError.message || "Failed to create authentication account" };
    }
  } else {
    // Fresh account — track it for potential rollback
    if (signUpData?.user) {
      newSupabaseUserId = signUpData.user.id;
    }
    authUser = signUpData?.user;
  }

  if (!authUser) {
    return { error: "Failed to retrieve user information. Please try again." };
  }

  // ── STEP 2: Prisma Transaction — Tenant + User + Membership + Staff ───────
  try {
    const slug = generateCollisionResistantSlug(name.trim());

    await prisma.$transaction(async (tx) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          slug,
          status: 'PENDING',
        },
      });

      // Upsert User — idempotent, safe for ghost account recovery
      const user = await tx.user.upsert({
        where: { supabaseId: authUser.id },
        update: {
          email: email.trim().toLowerCase(), // Ensure email is up-to-date
        },
        create: {
          supabaseId: authUser.id,
          email: email.trim().toLowerCase(),
        },
      });

      // Create TenantMembership
      const membership = await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
          status: 'ACTIVE',
          isActive: true,
        },
      });

      // Create Staff Profile (linked to membership)
      await tx.staff.create({
        data: {
          name: name.trim(), // Use clinic name as placeholder — user can update later
          email: email.trim().toLowerCase(),
          role: 'OWNER',
          tenantId: tenant.id,
          membershipId: membership.id,
          status: 'Online',
        },
      });

      // Initialize Ledger Accounts for Treasury
      await treasuryService.ensureSystemAccounts(tenant.id, tx);
    });

    // Audit — registration completed
    try {
      // Note: No tenantId available for audit without querying again; log at system level
      console.info(`[Registration] New clinic request created: "${name.trim()}" by ${email}`);
    } catch (auditError) {
      // Non-critical — don't fail registration if audit logging fails
      console.error('[Registration] Audit log failed:', auditError);
    }

  } catch (dbError: any) {
    // ── STEP 3 (ROLLBACK): Delete the Supabase auth user if we created it ──
    if (newSupabaseUserId) {
      console.error(
        `[Registration] Prisma transaction failed for ${email}. ` +
        `Rolling back Supabase user ${newSupabaseUserId}.`,
        dbError
      );

      try {
        const adminClient = getSupabaseAdmin();
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(newSupabaseUserId);

        if (deleteError) {
          // CRITICAL: Rollback failed — manual cleanup will be required
          console.error(
            `[Registration] CRITICAL: Failed to rollback Supabase user ${newSupabaseUserId} for ${email}. ` +
            `Manual cleanup required! Error: ${deleteError.message}`
          );
        } else {
          console.info(`[Registration] Rollback successful: Supabase user ${newSupabaseUserId} deleted.`);
        }
      } catch (rollbackError) {
        console.error('[Registration] CRITICAL: Rollback threw an exception:', rollbackError);
      }
    }

    // Return user-safe error message
    const isDuplicateSlug =
      dbError?.code === 'P2002' && dbError?.meta?.target?.includes('slug');

    if (isDuplicateSlug) {
      return {
        error: "A clinic with a very similar name already exists. Please choose a slightly different name.",
      };
    }

    return {
      error: "Failed to set up your clinic. Please try again. If the problem persists, contact support.",
    };
  }

  // ── SUCCESS: Redirect to pending approval ─────────────────────────────────
  // The tenant is PENDING — user must wait for admin approval.
  // The resolveTenantContext layer will enforce this on every request.
  redirect("/pending-approval");
}

// ─── Tenant Status Management (Admin Only) ───────────────────────────────────

export async function updateTenantStatus(tenantId: string, status: 'APPROVED' | 'REJECTED') {
  await requirePermission(PermissionCode.ADMIN_TENANT_MANAGE);

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
      select: { name: true },
    });

    console.info(
      `[Admin] Tenant "${tenant.name}" (${tenantId}) status updated to ${status} by admin`
    );

    revalidatePath("/admin/clinics");
    return { success: true };
  } catch (error) {
    console.error(`[Admin] Failed to update tenant ${tenantId} status:`, error);
    return { error: "Failed to update clinic status. Please try again." };
  }
}
