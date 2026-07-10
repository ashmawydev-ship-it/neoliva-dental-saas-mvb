export const dynamic = "force-dynamic";

import { getAllDoctorsCommissionAction } from "@/app/actions/doctor-commission";
import {
  CommissionKPIs,
  DoctorsCommissionTable,
} from "@/components/finance/DoctorCommissions";
import { Banknote } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function CommissionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl dark:bg-slate-800" />
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-3 dark:bg-slate-800" />
        <Skeleton className="h-[300px] rounded-xl dark:bg-slate-800" />
      </div>
    </div>
  );
}

async function CommissionsData() {
  const doctors = await getAllDoctorsCommissionAction();
  return (
    <>
      <CommissionKPIs doctors={doctors} />
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Commission Overview
        </h2>
        <DoctorsCommissionTable doctors={doctors} />
      </div>
    </>
  );
}

export default function CommissionsPage() {
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

      <Suspense fallback={<CommissionsSkeleton />}>
        <CommissionsData />
      </Suspense>
    </div>
  );
}
