export const dynamic = 'force-dynamic';

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBanner } from "@/components/layout/TopBanner";
import { resolveTenantContext, getTenantContext, TenantContextError } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PermissionProvider } from "@/components/providers/permission-provider";
import { getUserPermissions } from "@/lib/rbac";
import { getClinicSettings } from "@/services/settings.service";
import { runDailyJobsIfNeeded } from "@/services/job.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Trigger daily maintenance jobs (Lazy execution)
  // This runs once per day on the first request of the day.
  // We don't await it to avoid blocking the initial page load.
  runDailyJobsIfNeeded().catch(err => console.error('[DashboardLayout] Daily jobs error:', err));

  try {
    // Force tenant resolution - this will throw/redirect if not APPROVED
    await resolveTenantContext();
  } catch (error: any) {
    // CRITICAL: Let Next.js redirect() errors propagate naturally.
    // redirect() works by throwing a special error internally — catching
    // it here would silently swallow the redirect.
    if (isRedirectError(error)) {
      throw error;
    }

    // Handle TenantContextError codes explicitly
    if (error instanceof TenantContextError) {
      if (error.code === 'TENANT_PENDING') {
        redirect("/pending-approval");
      }
      if (error.code === 'ACCOUNT_REJECTED') {
        redirect("/auth/error?type=ACCOUNT_REJECTED");
      }
      if (error.code === 'ACCOUNT_SUSPENDED') {
        redirect("/auth/error?type=ACCOUNT_SUSPENDED");
      }
      if (error.code === 'ACCOUNT_DISABLED') {
        redirect("/auth/error?type=ACCOUNT_DISABLED");
      }
      // NO_USER_RECORD, UNAUTHORIZED, etc.
      redirect("/unauthorized");
    }

    // Unknown error — log and redirect to unauthorized
    console.error('[DashboardLayout] Unexpected error resolving tenant context:', error);
    redirect("/unauthorized");
  }

  const { user, tenantId } = await getTenantContext();
  const permissions = await getUserPermissions();
  
  let tenantSettings;
  if (tenantId) {
    tenantSettings = await getClinicSettings(tenantId);
  }

  // Pass only plain serializable properties to Client Components
  const sidebarSettings = {
    clinicName: tenantSettings?.clinicName || "SmileCare",
    logoUrl: tenantSettings?.logoUrl || null,
  };

  return (
    <PermissionProvider initialPermissions={Array.from(permissions)}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar user={user} settings={sidebarSettings} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBanner user={user} settings={sidebarSettings} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </PermissionProvider>
  );
}
