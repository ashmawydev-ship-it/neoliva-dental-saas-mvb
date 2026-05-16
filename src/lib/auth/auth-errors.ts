/**
 * AUTH ERROR TYPES — Typed Error Architecture
 *
 * Provides a structured, typed error hierarchy for all authentication,
 * authorization, and onboarding failure scenarios.
 *
 * Design Principles:
 * - Each error has a machine-readable `code` for programmatic handling
 * - Each error has a safe `clientMessage` that is safe to display to users
 *   (no internal stack traces or sensitive information)
 * - Each error has an `internalReason` for server-side logging only
 * - Follows FAIL-CLOSED model — ambiguous states are treated as denied
 */

// ─── Tenant Context Errors ──────────────────────────────────────────────────

export type TenantContextCode =
  | 'UNAUTHORIZED'       // No session or user
  | 'NO_USER_RECORD'     // Supabase user exists, but no DB User record
  | 'NO_MEMBERSHIP'      // User exists, but no TenantMembership
  | 'MEMBERSHIP_INACTIVE'// Membership exists but is not active
  | 'TENANT_PENDING'     // Tenant awaiting admin approval
  | 'ACCOUNT_REJECTED'    // Tenant registration was rejected
  | 'ACCOUNT_SUSPENDED'   // Tenant account suspended by admin
  | 'ACCOUNT_DISABLED'    // Tenant account permanently disabled
  | 'SESSION_EXPIRED'     // Explicit session expiry
  | 'INVALID_ROLE'       // Role in DB is not a recognized SystemRole

export class TenantContextError extends Error {
  public readonly code: TenantContextCode;
  public readonly clientMessage: string;
  public readonly internalReason: string;

  constructor(
    code: TenantContextCode,
    internalReason: string,
    clientMessage?: string
  ) {
    super(internalReason);
    this.name = 'TenantContextError';
    this.code = code;
    this.internalReason = internalReason;
    this.clientMessage = clientMessage ?? TenantContextError.defaultClientMessage(code);
  }

  private static defaultClientMessage(code: TenantContextCode): string {
    switch (code) {
      case 'UNAUTHORIZED':
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please sign in again.';
      case 'NO_USER_RECORD':
        return 'Account setup is incomplete. Please contact support.';
      case 'NO_MEMBERSHIP':
        return 'Your account is not linked to any clinic. Please contact your administrator.';
      case 'MEMBERSHIP_INACTIVE':
        return 'Your clinic membership has been deactivated. Please contact your administrator.';
      case 'TENANT_PENDING':
        return 'Your clinic registration is awaiting approval.';
      case 'ACCOUNT_REJECTED':
        return 'Your clinic registration has been declined.';
      case 'ACCOUNT_SUSPENDED':
        return 'Your clinic account has been suspended. Please contact support.';
      case 'ACCOUNT_DISABLED':
        return 'Your clinic account has been permanently disabled. Please contact administration.';
      case 'INVALID_ROLE':
        return 'Your account has an invalid role configuration. Please contact support.';
      default:
        return 'Access denied. Please contact support.';
    }
  }
}

// ─── Auth Routing Errors ─────────────────────────────────────────────────────

export type AuthRoutingCode =
  | 'REDIRECT_LOOP_DETECTED'
  | 'UNKNOWN_DESTINATION'
  | 'UNAUTHORIZED_ROUTE'

export class AuthRoutingError extends Error {
  public readonly code: AuthRoutingCode;
  public readonly clientMessage: string;

  constructor(code: AuthRoutingCode, message: string) {
    super(message);
    this.name = 'AuthRoutingError';
    this.code = code;
    this.clientMessage = 'A navigation error occurred. Please sign in again.';
  }
}

// ─── Onboarding Errors ───────────────────────────────────────────────────────

export type OnboardingCode =
  | 'AUTH_CREATION_FAILED'    // Supabase signUp failed
  | 'DB_TRANSACTION_FAILED'   // Prisma transaction rolled back
  | 'AUTH_ROLLBACK_FAILED'    // Could not delete the orphaned Supabase user
  | 'SLUG_COLLISION'          // Generated slug already exists (should not happen with suffix)
  | 'DUPLICATE_EMAIL'         // Email already registered and cannot recover
  | 'INVALID_INPUT'           // Required fields missing or malformed

export class OnboardingError extends Error {
  public readonly code: OnboardingCode;
  public readonly clientMessage: string;
  public readonly internalReason: string;

  constructor(code: OnboardingCode, internalReason: string, clientMessage?: string) {
    super(internalReason);
    this.name = 'OnboardingError';
    this.code = code;
    this.internalReason = internalReason;
    this.clientMessage = clientMessage ?? OnboardingError.defaultClientMessage(code);
  }

  private static defaultClientMessage(code: OnboardingCode): string {
    switch (code) {
      case 'AUTH_CREATION_FAILED':
        return 'Failed to create your account. Please try again.';
      case 'DB_TRANSACTION_FAILED':
        return 'Failed to set up your clinic. Your account has been rolled back. Please try again.';
      case 'AUTH_ROLLBACK_FAILED':
        return 'A partial registration error occurred. Please contact support referencing your email.';
      case 'SLUG_COLLISION':
        return 'A clinic with a very similar name already exists. Please choose a different name.';
      case 'DUPLICATE_EMAIL':
        return 'This email is already registered. Please use a different email or sign in.';
      case 'INVALID_INPUT':
        return 'Please fill in all required fields correctly.';
      default:
        return 'Registration failed. Please try again.';
    }
  }
}

// ─── Super Admin Errors ──────────────────────────────────────────────────────

export type SuperAdminCode =
  | 'JWT_ROLE_MISSING'        // No SUPER_ADMIN role in JWT metadata
  | 'ALLOWLIST_MISS'          // Email not in ALLOWED_SUPER_ADMIN_EMAILS
  | 'BOTH_CHECKS_FAILED'      // Neither JWT nor allowlist check passed

export class SuperAdminError extends Error {
  public readonly code: SuperAdminCode;
  public readonly clientMessage: string;

  constructor(code: SuperAdminCode, message: string) {
    super(message);
    this.name = 'SuperAdminError';
    this.code = code;
    this.clientMessage = 'Platform admin access is restricted.';
  }
}
