'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Users, Clock, Stethoscope } from 'lucide-react';
import type { SegmentResult } from '@/services/analytics.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentationType = 'doctor' | 'timeslot' | 'patientType';

interface SegmentationPanelProps {
  doctorSegments:      SegmentResult[];
  timeSlotSegments:    SegmentResult[];
  patientTypeSegments: SegmentResult[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TAB_CONFIG: Array<{
  key: SegmentationType;
  label: string;
  Icon: React.ElementType;
  drilldownBase: string;
}> = [
  { key: 'doctor',      label: 'By Doctor',       Icon: Stethoscope, drilldownBase: '/dashboard/events-debug?filter=PATIENT_NO_SHOW' },
  { key: 'timeslot',    label: 'By Time Slot',    Icon: Clock,       drilldownBase: '/dashboard/events-debug?filter=APPOINTMENT_CANCELLED' },
  { key: 'patientType', label: 'By Patient Type', Icon: Users,       drilldownBase: '/dashboard/events-debug?filter=PATIENT_NO_SHOW' },
];

// ─── Anomaly detection ────────────────────────────────────────────────────────

function isAnomaly(segment: SegmentResult, allSegments: SegmentResult[]): boolean {
  if (allSegments.length < 2) return false;
  const avg = allSegments.reduce((s, x) => s + x.noShowRate, 0) / allSegments.length;
  // Flag if no-show rate is >1.5× the average
  return segment.noShowRate > avg * 1.5 && segment.noShowRate > 10;
}

// ─── Bar ──────────────────────────────────────────────────────────────────────

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums text-gray-700 dark:text-gray-300 w-9 text-right">
        {value}%
      </span>
    </div>
  );
}

// ─── Single segment row ───────────────────────────────────────────────────────

function SegmentRow({
  segment,
  allSegments,
  drilldownBase,
  rank,
}: {
  segment: SegmentResult;
  allSegments: SegmentResult[];
  drilldownBase: string;
  rank: number;
}) {
  const anomaly = isAnomaly(segment, allSegments);
  const drillUrl = `${drilldownBase}&segment=${encodeURIComponent(segment.key)}`;

  return (
    <Link
      href={drillUrl}
      className={`group flex items-start gap-3 rounded-xl p-3 transition-all hover:bg-gray-50 dark:hover:bg-slate-800 ${
        anomaly ? 'border border-red-100 dark:border-red-900/30 bg-red-50/40 dark:bg-red-900/10' : ''
      }`}
    >
      {/* Rank */}
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
        ${rank === 1 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : rank === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
      >
        {rank}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {anomaly && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{segment.segment}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">({segment.totalAppointments} appts)</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 w-16 shrink-0">No-show</span>
            <MiniBar value={segment.noShowRate} color="bg-red-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 w-16 shrink-0">Completion</span>
            <MiniBar value={segment.completionRate} color="bg-green-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function SegmentationPanel({
  doctorSegments,
  timeSlotSegments,
  patientTypeSegments,
}: SegmentationPanelProps) {
  const [activeTab, setActiveTab] = useState<SegmentationType>('doctor');

  const dataMap: Record<SegmentationType, SegmentResult[]> = {
    doctor:      doctorSegments,
    timeslot:    timeSlotSegments,
    patientType: patientTypeSegments,
  };

  const activeTab_ = TAB_CONFIG.find(t => t.key === activeTab)!;
  const allSegments = dataMap[activeTab];

  // Top 3 worst by no-show rate
  const worst3 = [...allSegments]
    .filter(s => s.totalAppointments >= 3)  // min sample size
    .sort((a, b) => b.noShowRate - a.noShowRate)
    .slice(0, 3);

  const anomalyCount = allSegments.filter(s => isAnomaly(s, allSegments)).length;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Where exactly is the problem?</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Top 3 worst-performing segments</p>
          </div>
          {anomalyCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <tab.Icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="p-3 space-y-1">
        {worst3.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            Not enough data (min. 3 appointments per segment)
          </div>
        ) : (
          worst3.map((seg, i) => (
            <SegmentRow
              key={seg.key}
              segment={seg}
              allSegments={allSegments}
              drilldownBase={activeTab_.drilldownBase}
              rank={i + 1}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 text-center">
        <Link
          href={activeTab_.drilldownBase}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          View all events →
        </Link>
      </div>
    </div>
  );
}
