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
    <div className={cn("flex flex-col items-center gap-6 sm:gap-10 w-full max-w-5xl mx-auto bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl sm:rounded-[2rem] p-4 sm:p-10 border border-gray-100 dark:border-slate-800 shadow-inner relative", className)}>
      {/* Quadrant Selectors Overlay */}
      {showQuadrants && onQuadrantClick && (
        <div className="absolute inset-0 pointer-events-none z-10 p-2 sm:p-10">
          {/* Q1 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="pointer-events-auto absolute left-1 sm:left-2 top-[20%] h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 shadow-sm"
            onClick={() => onQuadrantClick('Q1')}
            title="Select Upper Right Quadrant (Q1)"
          >
            Q1
          </Button>
          {/* Q2 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="pointer-events-auto absolute right-1 sm:right-2 top-[20%] h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 shadow-sm"
            onClick={() => onQuadrantClick('Q2')}
            title="Select Upper Left Quadrant (Q2)"
          >
            Q2
          </Button>
          {/* Q4 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="pointer-events-auto absolute left-1 sm:left-2 bottom-[20%] h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 shadow-sm"
            onClick={() => onQuadrantClick('Q4')}
            title="Select Lower Right Quadrant (Q4)"
          >
            Q4
          </Button>
          {/* Q3 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="pointer-events-auto absolute right-1 sm:right-2 bottom-[20%] h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 shadow-sm"
            onClick={() => onQuadrantClick('Q3')}
            title="Select Lower Left Quadrant (Q3)"
          >
            Q3
          </Button>
        </div>
      )}

      {/* Top Teeth Row */}
      <div className={cn("flex justify-center gap-2 sm:gap-8 w-full relative", showQuadrants && onQuadrantClick && "px-8 sm:px-12")}>
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1 w-full justify-items-center">
          {QUADRANTS.Q1.map(t => renderTooth(t, true))}
        </div>
        <div className="w-px bg-gray-300 dark:bg-slate-700 rounded-full shrink-0" />
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1 w-full justify-items-center">
          {QUADRANTS.Q2.map(t => renderTooth(t, true))}
        </div>
      </div>
      
      {/* Horizontal Maxillary/Mandibular Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent my-1 sm:my-2" />

      {/* Bottom Teeth Row */}
      <div className={cn("flex justify-center gap-2 sm:gap-8 w-full relative", showQuadrants && onQuadrantClick && "px-8 sm:px-12")}>
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1 w-full justify-items-center">
          {QUADRANTS.Q4.map(t => renderTooth(t, false))}
        </div>
        <div className="w-px bg-gray-300 dark:bg-slate-700 rounded-full shrink-0" />
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1 w-full justify-items-center">
          {QUADRANTS.Q3.map(t => renderTooth(t, false))}
        </div>
      </div>
    </div>
  );
}
