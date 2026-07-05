import { resolveTenantContextOrRedirect as resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { requirePermission } from "@/lib/rbac";
import { PermissionCode } from "@/types/permissions";
import { ManualJournalEntryForm } from "@/components/finance/ManualJournalEntryForm";

export default async function ManualJournalEntryPage() {
  // Strict Page-Level Protection
  await resolveTenantContext();
  await requirePermission(PermissionCode.FINANCE_VIEW); // or specific TREASURY_CREATE if you have it

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <ManualJournalEntryForm />
    </div>
  );
}
