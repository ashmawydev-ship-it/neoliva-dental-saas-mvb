'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { ToothType } from "./types";
import { ToothVisual } from "./ToothVisual";

interface ToothCellProps {
  toothId: number;
  isTop: boolean;
  toothType?: ToothType;
  isSelected?: boolean;
  isExtracted?: boolean;
  fill?: string;
  stroke?: string;
  label?: string;
  onClick?: () => void;
  // Allows passing custom triggers like PopoverTrigger
  children?: React.ReactNode;
  // Allows passing extra elements like SurfacesPopover
  extraContent?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

export function ToothCell({
  toothId,
  isTop,
  toothType = 'permanent',
  isSelected = false,
  isExtracted = false,
  fill,
  stroke,
  label,
  onClick,
  children,
  extraContent,
  className,
  buttonClassName
}: ToothCellProps) {
  
  const content = children || (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "focus:outline-none transition-all p-1 rounded-xl flex items-center justify-center w-full min-w-[36px]",
        onClick && "hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer",
        isSelected && "bg-primary/5",
        buttonClassName
      )}
    >
      <ToothVisual
        toothId={toothId}
        isTop={isTop}
        toothType={toothType}
        fill={fill}
        stroke={stroke}
        isSelected={isSelected}
        isExtracted={isExtracted}
        className="group-hover:scale-110"
      />
    </button>
  );

  return (
    <div className={cn("flex flex-col items-center gap-1.5 w-full", className)}>
      {isTop && (
        <span className={cn(
          "text-[11px] font-bold text-center w-full transition-colors",
          toothType === "primary" ? "text-purple-600 dark:text-purple-400" : "text-gray-700 dark:text-slate-300",
          isSelected && "text-primary font-black"
        )}>
          {label || toothId}
          {toothType === "primary" && <span className="text-[8px] block text-purple-400 leading-none">1°</span>}
        </span>
      )}

      {/* Surface Popover / Extra info (Top placement for bottom teeth in Chart) */}
      {!isTop && extraContent}

      <div className="relative group w-full flex justify-center">
        {content}
      </div>

      {/* Surface Popover / Extra info (Bottom placement for top teeth in Chart) */}
      {isTop && extraContent}

      {!isTop && (
        <span className={cn(
          "text-[11px] font-bold text-center w-full transition-colors",
          toothType === "primary" ? "text-purple-600 dark:text-purple-400" : "text-gray-700 dark:text-slate-300",
          isSelected && "text-primary font-black"
        )}>
          {label || toothId}
          {toothType === "primary" && <span className="text-[8px] block text-purple-400 leading-none">1°</span>}
        </span>
      )}
    </div>
  );
}
