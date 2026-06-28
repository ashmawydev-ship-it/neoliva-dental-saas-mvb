"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Wallet, Clock, CheckCircle2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: 'payment' | 'appointment';
  title: string;
  description: string;
  time: string;
}

interface FinancialFlowProps {
  data: {
    cashIn: number;
    cashOut: number;
    outstandingInvoices: number;
    activityFeed: Activity[];
  };
}

export function FinancialFlowSection({ data }: FinancialFlowProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-0 shadow-sm bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Financial Movement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Daily Cash In</p>
                <p className="text-xl font-bold">${data.cashIn.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Daily Cash Out</p>
                <p className="text-xl font-bold">${data.cashOut.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-300">Outstanding Invoices</span>
              </div>
              <span className="text-sm font-bold text-blue-400">${data.outstandingInvoices.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm dark:bg-slate-900 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.activityFeed.slice(0, 3).map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className={cn(
                  "p-2 h-fit rounded-full",
                  item.type === 'payment' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {item.type === 'payment' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.description}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{new Date(item.time).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
