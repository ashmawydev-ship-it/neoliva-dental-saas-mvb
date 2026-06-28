'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Info } from "lucide-react";

interface CashFlowProps {
  data: {
    cashIn: number;
    cashOut: number;
    net: number;
  }
}

export function CashFlowCard({ data }: CashFlowProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Cash Flow Summary</CardTitle>
        <Info className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cash In</span>
            </div>
            <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400">{formatCurrency(data.cashIn)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 rounded-full">
                <ArrowDownCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cash Out</span>
            </div>
            <span className="text-sm font-bold text-rose-500 dark:text-rose-400">{formatCurrency(data.cashOut)}</span>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Net Movement</span>
            <span className={`text-lg font-black ${data.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(data.net)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
