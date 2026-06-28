export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingDown, ArrowUpRight } from "lucide-react";
import { NewExpenseDialog } from "@/components/expenses/NewExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { getExpenses, getExpenseStats } from "@/app/actions/expenses";
import { ExportExpensesCSV } from "@/components/expenses/ExpenseClientActions";
import { getTranslations } from "next-intl/server";

export default async function ExpensesPage() {
  const t = await getTranslations('expenses');
  const [expenses, stats] = await Promise.all([
    getExpenses(),
    getExpenseStats()
  ]);

  const totalExpenses = stats?.totalThisMonth || 0;
  const pendingPayments = stats?.pendingAmount || 0;
  const largestCategory = stats?.largestCategory || 'None';
  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const largestCategoryPercent = totalAmount > 0 ? Math.round((Number(stats?.largestCategoryAmount || 0) / totalAmount) * 100) : 0;

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportExpensesCSV data={expenses} />
          <NewExpenseDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20">{t('thisMonth')}</Badge>
            </div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">{t('kpis.totalExpenses')}</p>
            <h2 className="text-3xl font-bold text-red-700 dark:text-red-400">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('kpis.pendingPayments')}</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">${pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gray-900 dark:bg-slate-800 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-gray-300" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-400 mb-1">{t('kpis.largestCategory')}</p>
            <h2 className="text-2xl font-bold text-white capitalize">
              {t.has(`categories.${largestCategory}`) ? t(`categories.${largestCategory}`) : largestCategory}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{largestCategoryPercent}% {t('ofTotal')}</p>
          </CardContent>
        </Card>
      </div>

      <ExpensesTable initialExpenses={expenses} />
    </div>
  );
}
