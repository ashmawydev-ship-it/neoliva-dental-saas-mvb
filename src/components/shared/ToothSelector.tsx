'use client';

import React, { useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Grid2X2 } from "lucide-react";
import { 
  DentalGrid,
  ToothCell,
  useDentalSelection
} from "./dental";

interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
  className?: string;
}

export function ToothSelector({
  selectedTeeth: initialSelected = [],
  onChange,
  className
}: ToothSelectorProps) {
  
  const { 
    selectedTeeth, 
    toggleTooth, 
    toggleQuadrant, 
    clearSelection,
    setSelectedTeeth 
  } = useDentalSelection({ 
    initialSelected, 
    onChange 
  });



  const renderTooth = (id: number, isTop: boolean) => {
    const toothId = String(id);
    const isSelected = selectedTeeth.includes(toothId);
    
    return (
      <ToothCell
        key={id}
        toothId={id}
        isTop={isTop}
        isSelected={isSelected}
        fill={isSelected ? "currentColor" : "var(--tooth-fill)"}
        stroke={isSelected ? "currentColor" : "var(--tooth-stroke)"}
        onClick={() => toggleTooth(toothId)}
        buttonClassName={cn(
          isSelected ? "text-primary" : "text-slate-300 dark:text-slate-400"
        )}
      />
    );
  };

  return (
    <div className={cn(
      "space-y-4 p-4 sm:p-6 border rounded-2xl shadow-sm",
      "bg-white dark:bg-slate-900 dark:border-slate-800",
      className
    )}>
      {/* ── Section Header ── */}
      <div className="text-center mb-2">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
          Select Affected Teeth
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Grid2X2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tooth Selection</h4>
            <p className="text-[11px] text-muted-foreground">Select one or more teeth or quadrants</p>
          </div>
        </div>
        {selectedTeeth.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearSelection}
            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
          >
            Clear Selection ({selectedTeeth.length})
          </Button>
        )}
      </div>

      {/* ── Dental Grid ── */}
      <DentalGrid 
        renderTooth={renderTooth} 
        onQuadrantClick={toggleQuadrant}
      />

      {/* ── Footer: Selected Teeth + Legend ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* Selected teeth badges */}
        {selectedTeeth.length > 0 ? (
          <div className="space-y-2 flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Selected Teeth</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedTeeth.map(tooth => (
                <Badge 
                  key={tooth} 
                  variant="secondary" 
                  className="pl-2 pr-1 py-1 gap-1 text-[11px] bg-primary/5 text-primary border-primary/20 rounded-lg"
                >
                  Tooth {tooth}
                  <button 
                    type="button" 
                    onClick={() => toggleTooth(tooth)}
                    className="hover:bg-primary/20 rounded-md p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--tooth-fill)', border: '1.5px solid var(--tooth-stroke)' }} />
            <span className="text-[10px] text-muted-foreground font-medium">Unselected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground font-medium">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
