'use client';

import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import type { FunnelStage } from '@/services/analytics.service';

interface Props {
  data: FunnelStage[];
}

const STAGE_COLORS: Record<FunnelStage['stage'], string> = {
  NEW:          '#3b82f6', // blue-500
  DIAGNOSED:    '#8b5cf6', // violet-500
  IN_TREATMENT: '#f59e0b', // amber-500
  COMPLETED:    '#22c55e', // green-500
};

const STAGE_LABELS: Record<FunnelStage['stage'], string> = {
  NEW:          'New Patients',
  DIAGNOSED:    'Diagnosed',
  IN_TREATMENT: 'In Treatment',
  COMPLETED:    'Completed',
};

export function PatientFunnelChart({ data }: Props) {
  const isEmpty = data.every(s => s.count === 0);

  // Find the biggest drop-off for the callout
  const biggestDropOff = [...data]
    .filter(s => s.dropOffRate !== null && s.dropOffRate > 0)
    .sort((a, b) => (b.dropOffRate ?? 0) - (a.dropOffRate ?? 0))[0];

  const chartData = data.map(s => ({
    stage: STAGE_LABELS[s.stage],
    stageKey: s.stage,
    count: s.count,
    dropOffRate: s.dropOffRate,
  }));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Patient Lifecycle Funnel</h3>
          <p className="text-xs text-gray-400 mt-0.5">Where are patients dropping off?</p>
        </div>
        <Link
          href="/dashboard/events-debug?filter=TREATMENT_COMPLETED"
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          View Events →
        </Link>
      </div>

      <div className="p-5">
        {isEmpty ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            No patient lifecycle data yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                layout="vertical"
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={90}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={((value: any, _name: any, props: any) => {
                    const drop = props.payload?.dropOffRate;
                    return [
                      `${value} patients${drop !== null ? ` (${drop}% drop-off)` : ''}`,
                      'Count',
                    ];
                  }) as any}
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                  />
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.stageKey}
                      fill={STAGE_COLORS[entry.stageKey as FunnelStage['stage']]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Drop-off table */}
            <div className="mt-4 space-y-2">
              {data.slice(1).map((stage, i) => {
                const prev = data[i];
                const lost = prev.count - stage.count;
                if (lost <= 0) return null;
                return (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <span className="text-xs text-gray-500">
                      {STAGE_LABELS[prev.stage]} → {STAGE_LABELS[stage.stage]}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                      <TrendingDown className="h-3.5 w-3.5" />
                      -{stage.dropOffRate}% ({lost} patients)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Biggest drop-off callout */}
            {biggestDropOff && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">
                  <span className="font-semibold">Biggest drop-off:</span>{' '}
                  {STAGE_LABELS[biggestDropOff.stage]} stage — {biggestDropOff.dropOffRate}% of patients lost
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
