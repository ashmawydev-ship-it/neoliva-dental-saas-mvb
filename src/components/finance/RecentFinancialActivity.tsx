'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  CreditCard, 
  ShoppingBag,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";

interface Activity {
  type: 'INVOICE' | 'PAYMENT' | 'EXPENSE';
  title: string;
  amount: number;
  date: Date | string;
  status?: string;
  patient?: string;
  method?: string;
  category?: string;
}

interface ActivityProps {
  activity: Activity[];
}

export function RecentFinancialActivity({ activity }: ActivityProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Card className="col-span-1 border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</CardTitle>
        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </button>
      </CardHeader>
      <CardContent className="px-2">
        <div className="space-y-1">
          {activity.map((item, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  item.type === 'PAYMENT' ? 'bg-emerald-500/10' : 
                  item.type === 'INVOICE' ? 'bg-blue-500/10' : 'bg-rose-500/10'
                }`}>
                  {item.type === 'PAYMENT' ? <CreditCard className="w-4 h-4 text-emerald-500" /> : 
                   item.type === 'INVOICE' ? <Receipt className="w-4 h-4 text-blue-500" /> : 
                   <ShoppingBag className="w-4 h-4 text-rose-500" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold truncate max-w-[150px] text-slate-900 dark:text-slate-100">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {item.patient || item.category || 'General'} • {format(new Date(item.date), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-sm font-bold ${
                  item.type === 'PAYMENT' ? 'text-emerald-500' : 
                  item.type === 'INVOICE' ? 'text-blue-500' : 'text-rose-500'
                }`}>
                  {item.type === 'PAYMENT' ? '+' : ''}{formatCurrency(item.amount)}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {item.status || item.method || 'Standard'}
                </span>
              </div>
            </div>
          ))}
          
          {activity.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-xs text-slate-400">No recent transactions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
