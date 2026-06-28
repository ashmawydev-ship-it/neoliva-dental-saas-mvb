export const dynamic = "force-dynamic";

import { 
  getFinancialTrendsAction, 
  getReportsKPIsAction,
  getTreatmentDistributionAction,
  getPatientGrowthAction,
  getInventoryInsightsAction,
  getAIInsightsAction
} from "@/app/actions/reports";
import { ReportsKPIs } from "@/components/reports/ReportsKPIs";
import { ReportsInventoryAlerts } from "@/components/reports/ReportsInventoryAlerts";
import { ReportsAIInsights } from "@/components/reports/ReportsAIInsights";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import {
  ReportsRevenueChart,
  ReportsExpenseChart,
  ReportsProfitChart,
  ReportsTreatmentChart,
  ReportsPatientGrowthChart
} from "@/components/reports/DynamicReportsCharts";

function ErrorState({ message, t }: { message?: string; t: any }) {
  return (
    <Card className="border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm font-medium text-red-900 dark:text-red-300">{t('errors.loadFailed')}</p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message || t('errors.tryAgain')}</p>
      </CardContent>
    </Card>
  );
}

function AISkeleton() {
  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

async function AIInsightsContainer() {
  const aiRes = await getAIInsightsAction();
  return <ReportsAIInsights insights={aiRes.success ? aiRes.data || [] : []} />;
}

export default async function ReportsPage() {
  const t = await getTranslations('reports');

  // Use parallel fetching with failure isolation
  const [
    kpisRes,
    trendsRes,
    treatmentsRes,
    growthRes,
    inventoryRes
  ] = await Promise.all([
    getReportsKPIsAction(),
    getFinancialTrendsAction(),
    getTreatmentDistributionAction(),
    getPatientGrowthAction(),
    getInventoryInsightsAction()
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')} 📊</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Section 1: KPI Cards */}
      {kpisRes.success && kpisRes.data ? (
        <ReportsKPIs data={kpisRes.data} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ErrorState message={kpisRes.error} t={t} />
        </div>
      )}

      {/* Section 2: Financial Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {trendsRes.success && trendsRes.data ? (
          <>
            <ReportsRevenueChart data={trendsRes.data} />
            <ReportsExpenseChart data={trendsRes.data} />
            <ReportsProfitChart data={trendsRes.data} />
          </>
        ) : (
          <div className="lg:col-span-3">
            <ErrorState message={trendsRes.error} t={t} />
          </div>
        )}
      </div>

      {/* Section 3: AI Intelligence Insights */}
      <div className="max-w-5xl">
        <Suspense fallback={<AISkeleton />}>
          <AIInsightsContainer />
        </Suspense>
      </div>

      {/* Section 4: Analytics & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {treatmentsRes.success && treatmentsRes.data ? (
          <ReportsTreatmentChart data={treatmentsRes.data} />
        ) : (
          <ErrorState message={treatmentsRes.error} t={t} />
        )}
        
        {growthRes.success && growthRes.data ? (
          <ReportsPatientGrowthChart data={growthRes.data} />
        ) : (
          <ErrorState message={growthRes.error} t={t} />
        )}
      </div>

      {/* Section 4: Inventory Alerts */}
      <div className="max-w-4xl">
        {inventoryRes.success && inventoryRes.data ? (
          <ReportsInventoryAlerts items={inventoryRes.data.lowStock} />
        ) : (
          <ErrorState message={inventoryRes.error} t={t} />
        )}
      </div>
    </div>
  );
}
