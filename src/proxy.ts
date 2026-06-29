import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from "crypto";

/**
 * AUTHORITATIVE PROXY LAYER (Next.js 16+ Architecture)
 * 
 * This file replaces the deprecated middleware.ts convention.
 * It handles global request interception, authentication guarding, 
 * and tenant-context isolation validation.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const allCookies = request.cookies.getAll();
  const hasAppRefreshToken = !!request.cookies.get('app_refresh_token');

  // --- 1. Static & Asset Bypass (Fast-Path) ---
  const isAsset = pathname.startsWith('/_next/') || 
                  pathname.startsWith('/api/public/') ||
                  pathname.includes('.') || 
                  pathname === '/favicon.ico';

  if (isAsset) {
    return NextResponse.next();
  }

  // --- 2. Public Route Definition ---
  const publicRoutes = [
    '/',
    '/login',
    '/staff/sign-in',
    '/register',
    '/auth/callback',
    '/auth/confirm',
    '/auth/reset-password',
    '/reset-password',
    '/unauthorized',
    '/admin/login',
    '/staff/accept-invitation',
  ];

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // --- 3. Initialize Headers ---
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // --- 4. Supabase Auth Context ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Proxy][CRITICAL] Supabase environment variables missing. Request dropped.");
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  // Temporary response to hold cookie changes
  let response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          // Instead of creating a new response every time, we update the existing one
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  );

  let { data: { user } } = await supabase.auth.getUser();

  // --- 5. Silent Session Refresh Logic ---
  if (!user) {
    const appRefreshToken = request.cookies.get('app_refresh_token')?.value;
    
    if (appRefreshToken) {
      if (process.env.AUTH_DEBUG === 'true') {
        console.log(`[AUTH_DEBUG][Proxy] User null, attempting silent refresh...`);
      }

      try {
        const { SessionService } = await import('@/lib/auth/session-service');
        const { supabaseRefreshToken, newAppRefreshToken, session: dbSession } = 
          await SessionService.refreshSession(
            appRefreshToken, 
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

        if (supabaseRefreshToken) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: supabaseRefreshToken
          });

          if (!refreshError && refreshData.user) {
            user = refreshData.user;
            
            if (refreshData.session?.refresh_token) {
              await SessionService.updateSupabaseToken(dbSession.id, refreshData.session.refresh_token);
            }

            response.cookies.set('app_refresh_token', newAppRefreshToken, {
              path: '/',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 90
            });

            if (process.env.AUTH_DEBUG === 'true') {
              console.log(`[AUTH_DEBUG][Proxy] Silent refresh SUCCESS for ${user.email}`);
            }
          }
        }
      } catch (err) {
        if (process.env.AUTH_DEBUG === 'true') {
          console.warn(`[AUTH_DEBUG][Proxy] Silent refresh FAILED: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        
        // STEP 4: Pass specific error types on refresh failure
        if (err instanceof Error && (err.message === 'TENANT_BLOCKED' || err.message.startsWith('TENANT_'))) {
          // If we can determine the tenant status from the error, we should redirect specifically
          const errorType = 'ACCOUNT_DISABLED'; // Default for blocked refresh
          const errorUrl = new URL('/auth/error', request.url);
          errorUrl.searchParams.set('type', errorType);
          const errorResponse = NextResponse.redirect(errorUrl);
          errorResponse.cookies.delete('app_refresh_token');
          return errorResponse;
        }
      }
    }
  }

  if (process.env.AUTH_DEBUG === 'true') {
    console.log(`[PROXY_TRACE][SESSION_VALIDATION] Path: ${pathname}, UserAuthenticated: ${!!user}, RID: ${requestId}`);
  }

  // --- 6. Auth Gate ---
  console.log(`[PROXY_TRACE][PATH_CHECK] ${pathname}`);
  
  if (!user && !isPublicRoute) {
    const isAdminRoute = pathname.startsWith('/admin');
    const redirectPath = isAdminRoute ? '/admin/login' : '/login';
    
    console.warn(`[PROXY_TRACE][UNAUTHORIZED_REDIRECT] Path: ${pathname} -> ${redirectPath}`);
    
    const loginUrl = new URL(redirectPath, request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // --- 7. Hardened Security Check (Enterprise Lifecycle Enforcement) ---
  if (user && !isPublicRoute && !pathname.startsWith('/admin')) {
    try {
      const { resolveTenantContext } = await import('@/lib/auth/resolve-tenant-context');
      // This will throw if the tenant is SUSPENDED, DISABLED, or REJECTED
      const context = await resolveTenantContext();
      
      if (process.env.AUTH_DEBUG === 'true') {
        console.log(`[AUTH_DEBUG][Proxy] Tenant ${context.tenantId} verified (Status: ${context.user.tenant.status})`);
      }
    } catch (err: any) {
      const code = err?.code as string;
      const email = user.email;
      
      console.error(`[AUTH_TRACE][PROXY_SECURITY_VIOLATION] User: ${email}, Path: ${pathname}, Code: ${code}`);
      
      // Detailed mapping of internal security codes to client-safe AuthErrorCodes
      let errorType: string;
      switch (code) {
        case 'ACCOUNT_DISABLED':
          errorType = 'ACCOUNT_DISABLED';
          break;
        case 'ACCOUNT_SUSPENDED':
          errorType = 'ACCOUNT_SUSPENDED';
          break;
        case 'ACCOUNT_REJECTED':
          errorType = 'ACCOUNT_REJECTED';
          break;
        case 'TENANT_PENDING':
          errorType = 'TENANT_PENDING';
          break;
        case 'MEMBERSHIP_INACTIVE':
        case 'NO_MEMBERSHIP':
        case 'NO_USER_RECORD':
        case 'UNAUTHORIZED':
        case 'SESSION_EXPIRED':
          errorType = 'SESSION_EXPIRED';
          break;
        default:
          errorType = 'SESSION_EXPIRED';
      }
      
      console.warn(`[AUTH_TRACE][PROXY_SECURITY_REDIRECT] User: ${email}, Target: /auth/error?type=${errorType}`);
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('type', errorType);
      
      const errorResponse = NextResponse.redirect(errorUrl);
      errorResponse.cookies.delete('app_refresh_token');
      return errorResponse;
    }
  }

  // --- 8. Redirect Authenticated Users from Login ---
  if (user && (pathname === '/login' || pathname === '/staff/sign-in')) {
    console.log(`[PROXY_TRACE][ALREADY_AUTH_REDIRECT] ${pathname} -> /dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  console.log(`[PROXY_TRACE][ALLOWED] ${pathname}`);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};
