"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface AIInsightsProps {
  insights: string[];
}

export function ReportsAIInsights({ insights }: AIInsightsProps) {
  const t = useTranslations('reports');

  return (
    <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50/50 dark:from-indigo-900/20 to-white dark:to-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">{t('aiInsights.title')}</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">Automated performance analysis</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight, i) => (
              <div 
                key={i} 
                className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-3 h-3 text-indigo-400 dark:text-indigo-500" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('aiInsights.noData')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
