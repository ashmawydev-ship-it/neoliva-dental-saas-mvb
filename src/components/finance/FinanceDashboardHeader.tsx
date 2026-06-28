"use client";

import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Download, 
  Plus, 
  TrendingUp, 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { exportFinanceCSVAction } from "@/app/actions/finance";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface FinanceDashboardHeaderProps {
  period: string;
}

export function FinanceDashboardHeader({ period }: FinanceDashboardHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('finance');

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', value);
    router.push(`/dashboard/finance?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      const result = await exportFinanceCSVAction();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success("Finance report exported successfully");
      } else {
        toast.error(result.error || "Failed to export CSV");
      }
    } catch (err) {
      toast.error("An unexpected error occurred during export");
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          {t('subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={(val) => handlePeriodChange(val ?? "")}>
          <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <SelectItem value="7d" className="focus:bg-gray-100 dark:focus:bg-slate-800 focus:text-gray-900 dark:focus:text-white">{t('period.7d')}</SelectItem>
            <SelectItem value="30d" className="focus:bg-gray-100 dark:focus:bg-slate-800 focus:text-gray-900 dark:focus:text-white">{t('period.30d')}</SelectItem>
            <SelectItem value="90d" className="focus:bg-gray-100 dark:focus:bg-slate-800 focus:text-gray-900 dark:focus:text-white">{t('period.90d')}</SelectItem>
            <SelectItem value="12m" className="focus:bg-gray-100 dark:focus:bg-slate-800 focus:text-gray-900 dark:focus:text-white">{t('period.year')}</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          className="gap-2 bg-white dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
          onClick={handleExport}
        >
          <Download className="w-4 h-4" />
          Export Report
        </Button>

        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/dashboard/finance/manual-entry')}>
          <Plus className="w-4 h-4" />
          Manual Entry
        </Button>
      </div>
    </div>
  );
}
