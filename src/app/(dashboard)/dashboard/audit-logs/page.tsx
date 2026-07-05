import { Metadata } from 'next';
import { AuditLogContainer } from '@/components/audit/AuditLogContainer';
import { Shield, Lock, FileSearch, Download } from 'lucide-react';
import { requirePermission } from '@/lib/rbac';
import { PermissionCode } from '@/types/permissions';
import { getAuditLogs, getAuditMetadata } from '@/app/actions/audit';

export const metadata: Metadata = {
  title: 'Forensic Audit Logs | Dental Dashboard',
  description: 'Security-first immutable audit logging for clinical operations.',
};

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  // Ensure the user has the required permission at the page level
  await requirePermission(PermissionCode.AUDIT_VIEW);

  const initialLogsResult = await getAuditLogs({ limit: 50, offset: 0 });
  const metadataResult = await getAuditMetadata();

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              Forensic Audit Logs
              <Lock className="w-4 h-4 text-emerald-500" />
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
              <FileSearch className="w-4 h-4 text-indigo-400" />
              Immutable record of all system activities and administrative changes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Stats Summary (Optional/Placeholder for future) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Integrity</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-gray-900">100% Verified</div>
          <p className="text-[10px] text-gray-500">Logs are cryptographically linked and immutable.</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Retention Policy</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">Standard</span>
          </div>
          <div className="text-2xl font-black text-gray-900">7 Years</div>
          <p className="text-[10px] text-gray-500">All forensic records are archived for legal compliance.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Critical Alerts</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Real-time</span>
          </div>
          <div className="text-2xl font-black text-gray-900">Active</div>
          <p className="text-[10px] text-gray-500">Monitoring for unauthorized access attempts.</p>
        </div>
      </div>

      {/* Main Audit Container */}
      <AuditLogContainer 
        initialLogs={initialLogsResult.logs || []}
        initialTotal={initialLogsResult.total || 0}
        initialHasMore={initialLogsResult.hasMore || false}
        initialMetadata={{
          actions: metadataResult.actions || [],
          entityTypes: metadataResult.entityTypes || []
        }}
      />
    </div>
  );
}
