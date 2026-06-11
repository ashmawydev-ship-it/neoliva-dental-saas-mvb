import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { Role } from "@/lib/rbac/permissions";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/api/keep-alive",
];

const ROLE_ROUTES: Record<string, Role[]> = {
  '/dashboard/staff':    ['OWNER', 'MANAGER', 'ADMIN'],
  '/dashboard/reports':  ['OWNER', 'MANAGER', 'ADMIN', 'ACCOUNTANT'],
  '/dashboard/settings': ['OWNER', 'MANAGER'],
  '/dashboard/billing':  ['OWNER', 'MANAGER', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  '/dashboard/clinical': ['OWNER', 'MANAGER', 'ADMIN', 'DOCTOR', 'NURSE'],
  '/dashboard/expenses': ['OWNER', 'MANAGER', 'ADMIN', 'ACCOUNTANT'],
  '/dashboard/inventory':['OWNER', 'MANAGER', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'DOCTOR'],
};

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/invite/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // a. If path is public → NextResponse.next()
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Initialize Response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // b. Create Supabase client using createServerClient (Edge compatible)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Middleware] Supabase environment variables are missing.");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Helper to construct a redirect response preserving updated session cookies
  const makeRedirect = (url: string | URL) => {
    const redirectResponse = NextResponse.redirect(new URL(url, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // c. Call supabase.auth.getUser() — NOT getSession() (more secure)
  const { data: { user } } = await supabase.auth.getUser();

  // d. If no user → redirect to /login?next={encodedCurrentPath}
  if (!user) {
    const encodedCurrentPath = encodeURIComponent(pathname + request.nextUrl.search);
    return makeRedirect(`/login?next=${encodedCurrentPath}`);
  }

  // e. If no active_tenant_id cookie and path !== /select-tenant → redirect to /select-tenant
  const activeTenantId = request.cookies.get("active_tenant_id")?.value;
  if (!activeTenantId && pathname !== "/select-tenant" && pathname !== "/api/select-tenant") {
    return makeRedirect("/select-tenant");
  }

  // f. Check role-protected routes using cookies().get("user_role")
  const matchedRouteKey = Object.keys(ROLE_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (matchedRouteKey) {
    const cookieStore = await cookies();
    const userRoleCookie = cookieStore.get("user_role")?.value;

    const validRoles: Role[] = [
      "OWNER",
      "MANAGER",
      "ADMIN",
      "DOCTOR",
      "RECEPTIONIST",
      "ACCOUNTANT",
      "NURSE",
      "STAFF",
    ];

    const userRole =
      userRoleCookie && validRoles.includes(userRoleCookie as Role)
        ? (userRoleCookie as Role)
        : null;

    const allowedRoles = ROLE_ROUTES[matchedRouteKey];

    // g. If role not in allowed list → redirect to /dashboard?error=unauthorized
    if (!userRole || !allowedRoles.includes(userRole)) {
      return makeRedirect("/dashboard?error=unauthorized");
    }
  }

  // h. Otherwise → NextResponse.next() with refreshed auth cookies
  return response;
}

// 6. MATCHER:
// Exclude _next/static, _next/image, favicon.ico, api/webhooks/**, *.svg, *.png, *.jpg
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg)$).*)",
  ],
};
