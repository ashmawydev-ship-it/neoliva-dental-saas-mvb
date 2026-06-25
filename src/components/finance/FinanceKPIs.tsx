'use client'

import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface KPIProps {
  data: {
    revenueToday: number;
    revenueMonth: number;
    expensesMonth: number;
    netProfit: number;
    cashBalance: number;
    receivables: number;
    payables: number;
  }
}

export function FinanceKPIs({ data }: KPIProps) {
  const t = useTranslations('finance');
  const locale = useLocale();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(val);

  const kpis = [
    {
      title: t('kpis.monthlyRevenue'),
      value: formatCurrency(data.revenueMonth),
      description: `Today: ${formatCurrency(data.revenueToday)}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: data.revenueMonth > 0 ? "up" : "neutral"
    },
    {
      title: t('kpis.monthlyExpenses'),
      value: formatCurrency(data.expensesMonth),
      description: "Operative costs",
      icon: TrendingDown,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      trend: "down"
    },
    {
      title: t('kpis.netProfit'),
      value: formatCurrency(data.netProfit),
      description: "Revenue - Expenses",
      icon: TrendingUp,
      color: data.netProfit >= 0 ? "text-blue-500" : "text-amber-500",
      bg: data.netProfit >= 0 ? "bg-blue-500/10" : "bg-amber-500/10",
      trend: data.netProfit >= 0 ? "up" : "down"
    },
    {
      title: t('kpis.cashBalance'),
      value: formatCurrency(data.cashBalance),
      description: "Liquid assets",
      icon: Wallet,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: t('kpis.receivables'),
      value: formatCurrency(data.receivables),
      description: "Pending Invoices",
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: t('kpis.payables'),
      value: formatCurrency(data.payables),
      description: "Pending Bills",
      icon: Clock,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, i) => (
        <Card key={i} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            {kpi.trend && (
              <div className={`flex items-center text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {kpi.trend === 'up' ? '+12%' : '-4%'} 
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.title}</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{kpi.value}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{kpi.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
