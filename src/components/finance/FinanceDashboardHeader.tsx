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

interface FinanceDashboardHeaderProps {
  period: string;
}

export function FinanceDashboardHeader({ period }: FinanceDashboardHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Hub</h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Real-time treasury & revenue analytics
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={(val) => handlePeriodChange(val ?? "")}>
          <SelectTrigger className="w-[160px] bg-white border-gray-200">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="12m">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          className="gap-2 bg-white"
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
