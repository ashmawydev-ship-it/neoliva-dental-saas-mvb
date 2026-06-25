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

export function FinanceQuickActions() {
  const t = useTranslations('finance');

  const actions = [
    {
      title: t('quickActions.newInvoice'),
      icon: <FileText className="w-4 h-4" />,
      href: "/dashboard/billing",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: t('quickActions.recordPayment'),
      icon: <Zap className="w-4 h-4" />,
      href: "/dashboard/billing",
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: t('quickActions.addExpense'),
      icon: <ArrowUpRight className="w-4 h-4" />,
      href: "/dashboard/billing/expenses",
      color: "text-rose-600",
      bg: "bg-rose-50"
    },
    {
      title: t('quickActions.viewReports'),
      icon: <PieChart className="w-4 h-4" />,
      href: "/dashboard/reports",
      color: "text-slate-600",
      bg: "bg-slate-50"
    }
  ];

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50/50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
          {t('quickActions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {actions.map((action, i) => (
            <Link 
              key={i} 
              href={action.href}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${action.bg} ${action.color}`}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {action.title}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
