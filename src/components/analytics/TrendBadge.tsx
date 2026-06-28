'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection } from '@/services/analytics.service';

interface TrendBadgeProps {
  trend: TrendDirection;
  delta: number;
  deltaPercent: number;
  /** When true, UP is bad (e.g. no-show rate going up = bad) */
  invertedMetric?: boolean;
  showDelta?: boolean;
  size?: 'sm' | 'md';
}

const TREND_CONFIG: Record<
  TrendDirection,
  { Icon: React.ElementType; label: string }
> = {
  UP:     { Icon: TrendingUp,   label: 'Up'     },
  DOWN:   { Icon: TrendingDown, label: 'Down'   },
  STABLE: { Icon: Minus,        label: 'Stable' },
};

/**
 * Returns semantic color classes based on trend + metric direction.
 * For "good" metrics (completionRate): UP=green, DOWN=red
 * For "bad" metrics (noShowRate):      UP=red, DOWN=green
 */
function getColorClasses(trend: TrendDirection, inverted: boolean): string {
  if (trend === 'STABLE') return 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400';
  const isPositive = inverted ? trend === 'DOWN' : trend === 'UP';
  return isPositive
    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/20'
    : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30';
}

export function TrendBadge({
  trend,
  delta,
  deltaPercent,
  invertedMetric = false,
  showDelta = true,
  size = 'sm',
}: TrendBadgeProps) {
  const { Icon, label } = TREND_CONFIG[trend];
  const colorClasses = getColorClasses(trend, invertedMetric);
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const sign = delta > 0 ? '+' : '';
  const deltaLabel = Math.abs(deltaPercent) >= 1
    ? `${sign}${deltaPercent}%`
    : trend === 'STABLE' ? '±0%' : `${sign}${delta.toFixed(1)}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${textSize} ${colorClasses}`}
      title={`${label}: ${deltaLabel} vs previous 7 days`}
    >
      <Icon className={iconSize} />
      {showDelta && <span>{deltaLabel}</span>}
    </span>
  );
}
