"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CreditCard, Wallet, Users, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface ReportsKPIsProps {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalPatients: number;
  };
}

export function ReportsKPIs({ data }: ReportsKPIsProps) {
  const t = useTranslations('reports');

  const safeData = {
    totalRevenue: data?.totalRevenue || 0,
    totalExpenses: data?.totalExpenses || 0,
    netProfit: data?.netProfit || 0,
    totalPatients: data?.totalPatients || 0,
  };

  const kpis = [
    {
      title: t('kpis.totalRevenue'),
      value: `$${safeData.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+14%"
    },
    {
      title: t('kpis.totalExpenses'),
      value: `$${safeData.totalExpenses.toLocaleString()}`,
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "+5%"
    },
    {
      title: t('kpis.netProfit'),
      value: `$${safeData.netProfit.toLocaleString()}`,
      icon: Wallet,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: "+21%"
    },
    {
      title: t('kpis.totalPatients'),
      value: safeData.totalPatients.toLocaleString(),
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      trend: "+8%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <Card key={i} className="border-0 shadow-sm overflow-hidden group hover:ring-1 hover:ring-blue-200 dark:hover:ring-blue-500/50 transition-all bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <ChevronUp className="w-3 h-3" />
                {kpi.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
