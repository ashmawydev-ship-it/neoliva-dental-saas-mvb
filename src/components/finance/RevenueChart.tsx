'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar
} from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, TrendingUp } from "lucide-react";

interface ChartProps {
  data: {
    date: string;
    revenue: number;
    expenses: number;
  }[];
  periodLabel?: string;
}

export function RevenueChart({ data, periodLabel = "Last 30 Days" }: ChartProps) {
  const [view, setView] = useState<'area' | 'bar'>('area');

  return (
    <Card className="col-span-4 border-slate-200/60 dark:border-slate-800/60 dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          Revenue vs Expenses
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({periodLabel})</span>
        </CardTitle>
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          <Button 
            variant={view === 'area' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => setView('area')}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Area
          </Button>
          <Button 
            variant={view === 'bar' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => setView('bar')}
          >
            <LayoutGrid className="w-3 h-3 mr-1" />
            Bar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[350px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'area' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'currentColor' }} 
                className="text-slate-400 dark:text-slate-500"
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={((value: any) => [`$${value.toLocaleString()}`, '']) as any}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue"
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                name="Expenses"
                stroke="#f43f5e" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'currentColor' }} 
                className="text-slate-400 dark:text-slate-500"
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={((value: any) => [`$${value.toLocaleString()}`, '']) as any}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
