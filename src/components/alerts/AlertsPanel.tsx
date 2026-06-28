'use client';

import { useEffect, useState, useTransition } from 'react';
import { ShieldCheck, BellRing, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAlerts } from '@/app/actions/alerts';
import { AlertCard } from './AlertCard';
import type { OperationalAlert } from '@/services/alerts.service';

const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const TOP_N = 3;

interface AlertsPanelProps {
  /** Pre-fetched initial data from the Server Component parent */
  initialAlerts: OperationalAlert[];
}

export function AlertsPanel({ initialAlerts }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<OperationalAlert[]>(initialAlerts);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();

  // ── Manual / programmatic refresh ───────────────────────────────────────
  const refresh = () => {
    startTransition(async () => {
      try {
        const fresh = await getAlerts();
        setAlerts(fresh);
        setLastRefresh(new Date());
      } catch {
        // silently ignore — stale data is still shown
      }
    });
  };

  // ── Supabase Realtime: re-fetch when a derived event is inserted ─────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('operational-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'BusinessEvent',
          filter: `eventType=in.(PATIENT_NO_SHOW,INVOICE_OVERDUE,TREATMENT_DELAYED)`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derive display list ──────────────────────────────────────────────────
  const sorted = [...alerts].sort((a, b) => {
    const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return diff !== 0 ? diff : b.count - a.count;
  });
  const displayed = sorted.slice(0, TOP_N);
  const hasHighAlert = displayed.some(a => a.severity === 'HIGH');

  return (
    <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${hasHighAlert ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-800'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${hasHighAlert ? 'bg-red-100 dark:bg-red-500/20' : 'bg-blue-100 dark:bg-blue-500/20'}`}>
            {hasHighAlert
              ? <BellRing className="h-4 w-4 text-red-600" />
              : <ShieldCheck className="h-4 w-4 text-blue-600" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Operational Alerts</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last 24 h · Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={isPending}
          title="Refresh alerts"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {displayed.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <ShieldCheck className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All systems running smoothly</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No alerts in the last 24 hours.</p>
            </div>
          </div>
        ) : (
          displayed.map((alert) => (
            <AlertCard key={alert.type} alert={alert} />
          ))
        )}
      </div>

      {/* Footer — show overflow count */}
      {sorted.length > TOP_N && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            +{sorted.length - TOP_N} more alert{sorted.length - TOP_N !== 1 ? 's' : ''} ·{' '}
            <a href="/dashboard/events-debug" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View all
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
