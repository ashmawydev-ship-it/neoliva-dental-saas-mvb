'use client';

import Link from 'next/link';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AppointmentEfficiency, TimeRangeComparison } from '@/services/analytics.service';
import { TrendBadge } from './TrendBadge';

interface Props {
  data: AppointmentEfficiency;
  /** Optional comparison for completion rate */
  trend?: TimeRangeComparison;
}

const SLICES = [
  { key: 'completed',  label: 'Completed',  color: '#22c55e' },
  { key: 'cancelled',  label: 'Cancelled',  color: '#f97316' },
  { key: 'noShow',     label: 'No-Show',    color: '#ef4444' },
  { key: 'scheduled',  label: 'Remaining',  color: '#e2e8f0' },
] as const;

type SliceKey = typeof SLICES[number]['key'];

const RADIAN = Math.PI / 180;

// Custom label inside each slice
function renderLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) {
  if (percent < 0.05) return null; // hide tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export function AppointmentEfficiencyChart({ data, trend }: Props) {
  // Build the "remaining" bucket (scheduled − others)
  const remaining = Math.max(0, data.scheduled - data.completed - data.cancelled - data.noShow);

  const chartData = [
    { name: 'Completed', value: data.completed, color: '#22c55e' },
    { name: 'Cancelled',  value: data.cancelled,  color: '#f97316' },
    { name: 'No-Show',   value: data.noShow,    color: '#ef4444' },
    { name: 'Remaining', value: remaining,       color: '#e2e8f0' },
  ].filter(d => d.value > 0);

  const isEmpty = data.scheduled === 0;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appointment Efficiency</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Why are appointments failing?</p>
          </div>
          {trend && (
            <TrendBadge
              trend={trend.trend}
              delta={trend.delta}
              deltaPercent={trend.deltaPercent}
              invertedMetric={false}
            />
          )}
        </div>
        <Link
          href="/dashboard/events-debug"
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
        >
          View Events →
        </Link>
      </div>

      <div className="p-5">
        {isEmpty ? (
          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
            No appointment data yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((value: any, name: any) => [value, name]) as any}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>

            {/* Rate summary row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Completion',   value: data.completionRate,   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10' },
                { label: 'Cancellation', value: data.cancellationRate, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                { label: 'No-Show',      value: data.noShowRate,       color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/10' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl ${bg} px-3 py-2.5 text-center`}>
                  <p className={`text-lg font-bold ${color}`}>{value}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
