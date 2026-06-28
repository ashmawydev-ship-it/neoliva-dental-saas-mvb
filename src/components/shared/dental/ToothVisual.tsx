import React from 'react';
import { cn } from "@/lib/utils";
import {
  MolarSvg,
  PremolarSvg,
  CanineSvg,
  UpperCentralIncisorSvg,
  UpperLateralIncisorSvg,
  LowerCentralIncisorSvg,
  LowerLateralIncisorSvg,
  PrimaryToothSvg
} from "./svgs";
import { getToothCategory } from "./utils";
import { ToothType } from "./types";

interface ToothVisualProps {
  toothId: number;
  isTop: boolean;
  toothType?: ToothType;
  fill?: string;
  stroke?: string;
  className?: string;
  isExtracted?: boolean;
  isSelected?: boolean;
}

const TOOTH_SVG_MAP = {
  "molar": MolarSvg,
  "premolar": PremolarSvg,
  "canine": CanineSvg,
  "upper-central-incisor": UpperCentralIncisorSvg,
  "upper-lateral-incisor": UpperLateralIncisorSvg,
  "lower-central-incisor": LowerCentralIncisorSvg,
  "lower-lateral-incisor": LowerLateralIncisorSvg,
} as const;

export function ToothVisual({
  toothId,
  isTop,
  toothType = 'permanent',
  fill = '#ffffff',
  stroke = '#94a3b8',
  className,
  isExtracted = false,
  isSelected = false,
}: ToothVisualProps) {

  let SvgComponent: React.ComponentType<{ className?: string; fill: string; stroke: string }>;

  if (toothType === "primary") {
    SvgComponent = PrimaryToothSvg;
  } else {
    const category = getToothCategory(toothId);
    SvgComponent = TOOTH_SVG_MAP[category];
  }

  return (
    <div className={cn(
      "relative shrink-0 min-w-[32px] w-8 h-12 sm:w-9 sm:h-14 flex items-center justify-center transition-all duration-200",
      isSelected ? "scale-110 drop-shadow-[0_0_8px_oklch(0.588_0.200_255/0.5)]" : "drop-shadow-sm",
      isExtracted ? "opacity-30" : "opacity-100",
      className
    )}>
      <SvgComponent 
        className={cn(
          "w-full h-full transition-colors",
          isTop ? "rotate-180" : ""
        )} 
        fill={fill} 
        stroke={stroke} 
      />
      {isExtracted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400 font-bold text-2xl leading-none">×</span>
        </div>
      )}
    </div>
  );
}
