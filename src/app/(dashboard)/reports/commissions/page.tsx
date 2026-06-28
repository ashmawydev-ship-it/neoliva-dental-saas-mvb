export const dynamic = "force-dynamic";

import { getAllDoctorsCommissionAction } from "@/app/actions/doctor-commission";
import {
  CommissionKPIs,
  DoctorsCommissionTable,
} from "@/components/finance/DoctorCommissions";
import { Banknote } from "lucide-react";

export default async function CommissionsPage() {
  const doctors = await getAllDoctorsCommissionAction();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
            <Banknote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          Doctor Commissions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track and manage doctor commission payments across all invoices
        </p>
      </div>

      {/* KPI Cards */}
      <CommissionKPIs doctors={doctors} />

      {/* Doctors Commission Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Commission Overview
        </h2>
        <DoctorsCommissionTable doctors={doctors} />
      </div>
    </div>
  );
}
