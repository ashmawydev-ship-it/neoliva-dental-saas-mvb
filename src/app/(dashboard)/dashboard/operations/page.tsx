export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import {
  Activity, CalendarClock, Users, TrendingUp, AlertOctagon, Loader2,
  HelpCircle, BarChart2, GitBranch,
} from 'lucide-react';
import { getAlerts } from '@/app/actions/alerts';
import {
  getDoctorAnalytics, getEfficiencyAnalytics, getFunnelAnalytics,
  getTimeComparisons,
  getDoctorSegmentationAnalytics, getTimeSlotSegmentationAnalytics, getPatientTypeSegmentationAnalytics,
} from '@/app/actions/analytics';
import { AlertsPanel }               from '@/components/alerts/AlertsPanel';
import { DoctorPerformanceChart }    from '@/components/analytics/DoctorPerformanceChart';
import { AppointmentEfficiencyChart } from '@/components/analytics/AppointmentEfficiencyChart';
import { PatientFunnelChart }         from '@/components/analytics/PatientFunnelChart';
import { SegmentationPanel }          from '@/components/analytics/SegmentationPanel';
import { TrendBadge }                 from '@/components/analytics/TrendBadge';
import { resolveTenantContext as getTenantContext } from '@/lib/auth/resolve-tenant-context';
import { prisma }                     from '@/lib/prisma';
import type { TimeRangeComparison }   from '@/services/analytics.service';
import { requirePermission }          from '@/lib/rbac';
import { PermissionCode }             from '@/types/permissions';

// ─── Quick Stat ───────────────────────────────────────────────────────────────

function QuickStat({
  label, value, sub, Icon, color,
}: {
  label: string; value: number | string; sub?: string; Icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 'h-72' }: { height?: string }) {
  return <div className={`rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${height} animate-pulse`} />;
}

// ─── Time Comparison Summary Strip ───────────────────────────────────────────

function TimeComparisonStrip({ comparisons }: { comparisons: TimeRangeComparison[] }) {
  const METRIC_LABEL: Record<string, string> = {
    completionRate: 'Completion Rate',
    noShowRate:     'No-Show Rate',
    revenue:        'Revenue',
  };
  const METRIC_SUFFIX: Record<string, string> = {
    completionRate: '%',
    noShowRate:     '%',
    revenue:        '',
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
          <GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Is it getting better or worse?</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Current 7 days vs previous 7 days</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-800">
        {comparisons.map(c => (
          <div key={c.metric} className="px-5 py-4 text-center">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              {METRIC_LABEL[c.metric] ?? c.metric}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {c.metric === 'revenue'
                ? `$${c.current.toLocaleString()}`
                : `${c.current}${METRIC_SUFFIX[c.metric]}`}
            </p>
            <div className="flex justify-center mt-2">
              <TrendBadge
                trend={c.trend}
                delta={c.delta}
                deltaPercent={c.deltaPercent}
                invertedMetric={c.metric === 'noShowRate'}
                size="sm"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              prev: {c.metric === 'revenue'
                ? `$${c.previous.toLocaleString()}`
                : `${c.previous}${METRIC_SUFFIX[c.metric]}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Async section loaders ────────────────────────────────────────────────────

async function AlertsSectionLoader() {
  let initialAlerts: Awaited<ReturnType<typeof getAlerts>> = [];
  try { initialAlerts = await getAlerts(); } catch { /* non-admin: show empty */ }
  return <AlertsPanel initialAlerts={initialAlerts} />;
}

async function OperationsStats() {
  const { tenantId } = await getTenantContext();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalAppointmentsToday, overdueInvoices, pendingTreatments, derivedEvents] =
    await Promise.all([
      prisma.appointment.count({ where: { tenantId, createdAt: { gte: since24h } } }),
      prisma.invoice.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.treatmentPlanItem.count({ where: { tenantId, status: 'Planned' } }),
      prisma.businessEvent.count({
        where: {
          tenantId, createdAt: { gte: since24h },
          eventType: { in: ['PATIENT_NO_SHOW', 'INVOICE_OVERDUE', 'TREATMENT_DELAYED'] },
        },
      }),
    ]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <QuickStat label="Appointments Today" value={totalAppointmentsToday} sub="Last 24 hours" Icon={CalendarClock} color="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
      <QuickStat label="Pending Invoices"   value={overdueInvoices}       sub="Unpaid outstanding" Icon={TrendingUp}   color="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" />
      <QuickStat label="Pending Treatments" value={pendingTreatments}     sub="Planned, not started" Icon={Users}      color="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" />
      <QuickStat
        label="Derived Alerts"  value={derivedEvents}  sub="System flags today"  Icon={AlertOctagon}
        color={derivedEvents > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}
      />
    </div>
  );
}

// ─── Time Comparison Loader ───────────────────────────────────────────────────

async function TimeComparisonLoader() {
  let comparisons: TimeRangeComparison[] = [];
  try { comparisons = await getTimeComparisons(); } catch { /* show empty */ }
  if (comparisons.length === 0) return null;
  return <TimeComparisonStrip comparisons={comparisons} />;
}

// ─── Decision Intelligence (charts + trend badges) ────────────────────────────

async function AnalyticsSection() {
  const [doctorResult, efficiencyResult, funnelResult, trendResult] = await Promise.allSettled([
    getDoctorAnalytics(),
    getEfficiencyAnalytics(),
    getFunnelAnalytics(),
    getTimeComparisons(),
  ]);

  const doctors    = doctorResult.status    === 'fulfilled' ? doctorResult.value    : [];
  const efficiency = efficiencyResult.status === 'fulfilled' ? efficiencyResult.value : {
    scheduled: 0, completed: 0, cancelled: 0, noShow: 0,
    completionRate: 0, cancellationRate: 0, noShowRate: 0,
  };
  const funnel     = funnelResult.status    === 'fulfilled' ? funnelResult.value    : [];
  const trends     = trendResult.status     === 'fulfilled' ? trendResult.value     : [];

  const completionTrend = trends.find(t => t.metric === 'completionRate');
  const noShowTrend     = trends.find(t => t.metric === 'noShowRate');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/10">
          <HelpCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Why is this happening?</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Decision intelligence — root cause analysis</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <DoctorPerformanceChart data={doctors} trend={completionTrend} />
        <AppointmentEfficiencyChart data={efficiency} trend={completionTrend} />
        <PatientFunnelChart data={funnel} />
      </div>
    </div>
  );
}

// ─── Segmentation Loader ──────────────────────────────────────────────────────

async function SegmentationSection() {
  const [doctorSegs, timeSegs, patientSegs] = await Promise.allSettled([
    getDoctorSegmentationAnalytics(),
    getTimeSlotSegmentationAnalytics(),
    getPatientTypeSegmentationAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
          <BarChart2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Where exactly is the problem?</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Segmentation — click any row to drill into raw events</p>
        </div>
      </div>

      <SegmentationPanel
        doctorSegments={doctorSegs.status      === 'fulfilled' ? doctorSegs.value      : []}
        timeSlotSegments={timeSegs.status      === 'fulfilled' ? timeSegs.value        : []}
        patientTypeSegments={patientSegs.status === 'fulfilled' ? patientSegs.value    : []}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OperationsPage() {
  await requirePermission(PermissionCode.ADMIN_FULL_ACCESS);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time operational health of your clinic</p>
        </div>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-[88px] rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 animate-pulse" />)}</div>}>
        <OperationsStats />
      </Suspense>

      {/* Time Comparison Strip */}
      <Suspense fallback={<ChartSkeleton height="h-32" />}>
        <TimeComparisonLoader />
      </Suspense>

      {/* Alerts + Segmentation side-by-side */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Suspense fallback={<ChartSkeleton height="h-48" />}>
            <AlertsSectionLoader />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton height="h-48" />}>
            <SegmentationSection />
          </Suspense>
        </div>
      </div>

      {/* Decision Intelligence Charts */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="grid gap-5 lg:grid-cols-3">
              <ChartSkeleton /><ChartSkeleton /><ChartSkeleton />
            </div>
          </div>
        }
      >
        <AnalyticsSection />
      </Suspense>
    </div>
  );
}
