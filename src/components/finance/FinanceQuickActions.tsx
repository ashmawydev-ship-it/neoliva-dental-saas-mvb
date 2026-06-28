"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ArrowUpRight, 
  Settings, 
  PieChart, 
  Zap
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { NewInvoiceDialog } from "@/components/billing/NewInvoiceDialog";
import { NewExpenseDialog } from "@/components/expenses/NewExpenseDialog";

export function FinanceQuickActions() {
  const t = useTranslations('finance');

  return (
    <Card className="border-0 shadow-sm overflow-hidden dark:bg-slate-900">
      <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-800/50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
          {t('quickActions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          <NewInvoiceDialog 
            customTrigger={
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    {t('quickActions.newInvoice')}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
              </button>
            }
          />

          <Link href="/billing" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400`}>
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {t('quickActions.recordPayment')}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
          </Link>

          <NewExpenseDialog 
            customTrigger={
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400`}>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    {t('quickActions.addExpense')}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
              </button>
            }
          />

          <Link href="/reports" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>
                <PieChart className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {t('quickActions.viewReports')}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
