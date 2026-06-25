import { Suspense } from "react";
import { resolveTenantContextOrRedirect as resolveTenantContext } from "@/lib/auth/resolve-tenant-context";
import { FinanceService } from "@/services/finance.service";
import { requirePermission } from "@/lib/rbac";
import { PermissionCode } from "@/types/permissions";
import { FinanceKPIs } from "@/components/finance/FinanceKPIs";
import { CashFlowCard } from "@/components/finance/CashFlowCard";
import { FinancialAlerts } from "@/components/finance/FinancialAlerts";
import { RecentFinancialActivity } from "@/components/finance/RecentFinancialActivity";
import { FinanceDashboardHeader } from "@/components/finance/FinanceDashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueChart, TopServicesChart, RevenueByDoctorChart } from "@/components/finance/DynamicFinanceCharts";
import { FinanceQuickActions } from "@/components/finance/FinanceQuickActions";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { 
  TrendingUp, 
} from "lucide-react";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = '30d' } = await searchParams;
  
  // Strict Page-Level Protection
  const { tenantId } = await resolveTenantContext();
  await requirePermission(PermissionCode.FINANCE_VIEW);

  const t = await getTranslations('finance');

  const financeService = new FinanceService();
  let data;
  let errorMsg = "";
  try {
    data = await financeService.getFinancialDashboard(tenantId, period as any);
  } catch (err: any) {
    errorMsg = err.message || t('errors.accessDenied');
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full">
          <TrendingUp className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold">{t('errors.accessDenied')}</h2>
        <p className="text-slate-500 max-w-md text-center">
          {errorMsg}
        </p>
        <Link 
          href="/dashboard" 
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }
  const periodLabel = {
    "7d": t('period.7d'),
    "30d": t('period.30d'),
    "90d": t('period.90d'),
    "12m": t('period.year')
  }[period] || t('period.30d');

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <FinanceDashboardHeader period={period} />

      {/* KPI Cards */}
      <FinanceKPIs data={data.kpis} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left Column: Charts & Analysis */}
        <div className="lg:col-span-4 space-y-6">
          <RevenueChart data={data.trends.revenueVsExpenses} periodLabel={periodLabel} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopServicesChart data={data.topServices} />
            <RevenueByDoctorChart data={data.revenueByDoctor} />
          </div>
        </div>

        {/* Right Column: Health & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <FinancialAlerts alerts={data.alerts} />
          <CashFlowCard data={data.cashFlow} />
          
          <FinanceQuickActions />

          <RecentFinancialActivity activity={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
