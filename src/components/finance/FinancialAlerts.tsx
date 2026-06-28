'use client'

import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Alert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
}

interface AlertsProps {
  alerts: Alert[];
}

export function FinancialAlerts({ alerts }: AlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-emerald-50/10 dark:bg-emerald-500/5">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Financial Health Good</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No critical alerts detected in your dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
          Financial Alerts
          <span className="flex h-2 w-2 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              alert.severity === 'CRITICAL' 
                ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20 text-rose-700 dark:text-rose-400' 
                : 'bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}
          >
            {alert.severity === 'CRITICAL' ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium leading-relaxed">{alert.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
