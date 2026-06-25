'use client';

import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { DoctorPerformance, TimeRangeComparison } from '@/services/analytics.service';
import { TrendBadge } from './TrendBadge';

interface Props {
  data: DoctorPerformance[];
  /** Optional completion-rate trend comparison (current 7d vs previous 7d) */
  trend?: TimeRangeComparison;
}

const COMPLETION_COLOR = '#22c55e'; // green-500
const NOSHOW_COLOR     = '#ef4444'; // red-500

// Highlight the worst performer (lowest completionRate with > 0 appointments)
function worstPerformerId(data: DoctorPerformance[]): string | null {
  if (data.length === 0) return null;
  return [...data]
    .filter(d => d.totalAppointments > 0)
    .sort((a, b) => a.completionRate - b.completionRate)[0]?.doctorId ?? null;
}

export function DoctorPerformanceChart({ data, trend }: Props) {
  const worstId = worstPerformerId(data);

  if (data.length === 0) {
    return (
      <EmptyState message="No appointment data available yet." />
    );
  }

  return (
    <ChartWrapper
      title="Doctor Performance"
      subtitle="Completion vs No-Show rates per doctor"
      drilldownUrl="/dashboard/events-debug?filter=PATIENT_NO_SHOW"
      trend={trend}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="doctorName"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={((value: any, name: any) => [`${value}%`, name === 'completionRate' ? 'Completion Rate' : 'No-Show Rate']) as any}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend
            formatter={v => v === 'completionRate' ? 'Completion %' : 'No-Show %'}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="completionRate" name="completionRate" radius={[4, 4, 0, 0]}>
            {data.map(d => (
              <Cell
                key={d.doctorId}
                fill={d.doctorId === worstId ? '#f97316' : COMPLETION_COLOR}
              />
            ))}
          </Bar>
          <Bar dataKey="noShowRate" name="noShowRate" fill={NOSHOW_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Worst performer callout */}
      {worstId && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-100 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
          <p className="text-xs text-orange-700">
            <span className="font-semibold">Lowest performer:</span>{' '}
            {data.find(d => d.doctorId === worstId)?.doctorName} —{' '}
            {data.find(d => d.doctorId === worstId)?.completionRate}% completion rate
          </p>
        </div>
      )}
    </ChartWrapper>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function ChartWrapper({
  title,
  subtitle,
  drilldownUrl,
  trend,
  children,
}: {
  title: string;
  subtitle: string;
  drilldownUrl: string;
  trend?: TimeRangeComparison;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          {trend && (
            <TrendBadge
              trend={trend.trend}
              delta={trend.delta}
              deltaPercent={trend.deltaPercent}
              invertedMetric={trend.metric === 'noShowRate'}
            />
          )}
        </div>
        <Link
          href={drilldownUrl}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          View Events →
        </Link>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      {message}
    </div>
  );
}
