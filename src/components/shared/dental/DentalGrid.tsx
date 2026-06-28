import React from 'react';
import { cn } from "@/lib/utils";
import { QUADRANTS } from "./constants";
import { Button } from "@/components/ui/button";

interface DentalGridProps {
  renderTooth: (toothId: number, isTop: boolean) => React.ReactNode;
  className?: string;
  showQuadrants?: boolean;
  onQuadrantClick?: (quadrant: keyof typeof QUADRANTS) => void;
}

export function DentalGrid({
  renderTooth,
  className,
  showQuadrants = true,
  onQuadrantClick,
}: DentalGridProps) {
  return (
    <div className={cn(
      "relative flex flex-col items-center w-full max-w-5xl mx-auto",
      "bg-gradient-to-b from-gray-50/80 to-gray-100/50 dark:from-slate-900/80 dark:to-slate-800/30",
      "rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 lg:p-10",
      "border border-gray-200/60 dark:border-slate-700/50",
      "shadow-inner",
      className
    )}>
      {/* ── Top Teeth Row ── */}
      <div className={cn(
        "flex items-center w-full",
        showQuadrants && onQuadrantClick && "gap-2 sm:gap-4"
      )}>
        {/* Q1 Button */}
        {showQuadrants && onQuadrantClick && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 dark:text-slate-300 text-[10px] sm:text-[11px] font-bold shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            onClick={() => onQuadrantClick('Q1')}
            title="Select Upper Right Quadrant (Q1)"
          >
            Q1
          </Button>
        )}

        {/* Top teeth */}
        <div className="flex-1 flex justify-center gap-2 sm:gap-6 relative">
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1.5 w-full justify-items-center">
            {QUADRANTS.Q1.map(t => renderTooth(t, true))}
          </div>
          {/* Vertical center divider */}
          <div className="w-px bg-primary/20 dark:bg-primary/30 shrink-0 self-stretch" />
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1.5 w-full justify-items-center">
            {QUADRANTS.Q2.map(t => renderTooth(t, true))}
          </div>
        </div>

        {/* Q2 Button */}
        {showQuadrants && onQuadrantClick && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 dark:text-slate-300 text-[10px] sm:text-[11px] font-bold shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            onClick={() => onQuadrantClick('Q2')}
            title="Select Upper Left Quadrant (Q2)"
          >
            Q2
          </Button>
        )}
      </div>

      {/* ── Horizontal Divider (dashed, crossing the vertical) ── */}
      <div className="w-full my-4 sm:my-6 relative">
        <div className="w-full border-t border-dashed border-primary/20 dark:border-primary/30" />
      </div>

      {/* ── Bottom Teeth Row ── */}
      <div className={cn(
        "flex items-center w-full",
        showQuadrants && onQuadrantClick && "gap-2 sm:gap-4"
      )}>
        {/* Q4 Button */}
        {showQuadrants && onQuadrantClick && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 dark:text-slate-300 text-[10px] sm:text-[11px] font-bold shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            onClick={() => onQuadrantClick('Q4')}
            title="Select Lower Right Quadrant (Q4)"
          >
            Q4
          </Button>
        )}

        {/* Bottom teeth */}
        <div className="flex-1 flex justify-center gap-2 sm:gap-6 relative">
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1.5 w-full justify-items-center">
            {QUADRANTS.Q4.map(t => renderTooth(t, false))}
          </div>
          {/* Vertical center divider */}
          <div className="w-px bg-primary/20 dark:bg-primary/30 shrink-0 self-stretch" />
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1.5 w-full justify-items-center">
            {QUADRANTS.Q3.map(t => renderTooth(t, false))}
          </div>
        </div>

        {/* Q3 Button */}
        {showQuadrants && onQuadrantClick && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-dashed border-gray-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 dark:text-slate-300 text-[10px] sm:text-[11px] font-bold shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            onClick={() => onQuadrantClick('Q3')}
            title="Select Lower Left Quadrant (Q3)"
          >
            Q3
          </Button>
        )}
      </div>
    </div>
  );
}
