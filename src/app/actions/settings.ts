"use server";

import { z } from "zod";
import { NotificationsConfig } from "@/services/settings.service";
import { settingsService } from "@/config/di";
import { resolveTenantContext as getTenantContext } from "@/lib/auth/resolve-tenant-context";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { PermissionCode } from "@/types/permissions";

const clinicSchema = z.object({
  clinicName: z.string().min(1, "Clinic Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

const billingSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  taxRate: z.coerce.number().min(0).max(100),
  invoiceNote: z.string().optional(),
});

const notificationsSchema = z.object({
  emailReminders: z.boolean(),
  smsReminders: z.boolean(),
  invoiceReceipts: z.boolean(),
  lowInventoryAlerts: z.boolean(),
});

export async function fetchSettingsAction() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) throw new Error("Unauthorized");

  // Require read access to settings
  await requirePermission(PermissionCode.SETTINGS_CLINIC_EDIT);

  const settings = await settingsService.getClinicSettings(ctx.tenantId);
  return {
    ...settings,
    taxRate: settings.taxRate ? Number(settings.taxRate) : 0,
  };
}

export async function updateClinicAction(data: z.infer<typeof clinicSchema>) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) throw new Error("Unauthorized");
  await requirePermission(PermissionCode.SETTINGS_CLINIC_EDIT);

  const parsed = clinicSchema.parse(data);

  await settingsService.updateClinicSettings(ctx.tenantId, parsed, ctx.user.id);
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function updateBillingAction(data: z.infer<typeof billingSchema>) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) throw new Error("Unauthorized");
  await requirePermission(PermissionCode.SETTINGS_CLINIC_EDIT);

  const parsed = billingSchema.parse(data);

  await settingsService.updateClinicSettings(ctx.tenantId, {
    currency: parsed.currency,
    taxRate: parsed.taxRate,
    invoiceNote: parsed.invoiceNote,
  }, ctx.user.id);
  
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function updateNotificationsAction(data: z.infer<typeof notificationsSchema>) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) throw new Error("Unauthorized");
  await requirePermission(PermissionCode.SETTINGS_CLINIC_EDIT);

  const parsed = notificationsSchema.parse(data);

  await settingsService.updateClinicSettings(ctx.tenantId, {
    notificationsConfig: parsed as NotificationsConfig,
  }, ctx.user.id);
  
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
