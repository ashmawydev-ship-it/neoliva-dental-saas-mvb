"use server";

import { cookies } from "next/headers";
import { settingsService } from "@/config/di";
import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { revalidatePath } from "next/cache";

export async function setLocaleAction(locale: "en" | "ar") {
  const cookieStore = await cookies();

  // Set the "locale" cookie for 1 year (365 days)
  cookieStore.set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Update in DB if user is authenticated and has a tenant context
  try {
    const ctx = await resolveTenantContext();
    if (ctx?.tenantId && ctx?.user?.id) {
      await settingsService.updateClinicSettings(ctx.tenantId, {
        locale,
      }, ctx.user.id);
    }
  } catch (error) {
    // Suppress authentication error during locale change (e.g. on login screen)
    console.log("[LocaleAction] Session context not available, skipped DB update:", error);
  }

  // Revalidate the entire layout
  revalidatePath("/", "layout");
  return { success: true };
}
