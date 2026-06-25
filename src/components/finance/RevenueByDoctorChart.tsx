'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell
} from "recharts";

interface DoctorRevenue {
  name: string;
  value: number;
}

interface DoctorRevenueProps {
  data: DoctorRevenue[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function RevenueByDoctorChart({ data }: DoctorRevenueProps) {
  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Revenue by Doctor</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={100}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              formatter={((value: any) => `$${value.toLocaleString()}`) as any}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
