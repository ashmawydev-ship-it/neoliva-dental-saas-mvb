"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartProps {
  data: any[];
}

export function ReportsRevenueChart({ data }: ChartProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
        <p className="text-xs text-gray-500">Monthly revenue for the last 12 months</p>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={((value: any) => [`$${value.toLocaleString()}`, 'Revenue']) as any}
            />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
