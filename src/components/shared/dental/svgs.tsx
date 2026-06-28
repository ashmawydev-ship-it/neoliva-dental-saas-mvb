import React from "react";
import { ToothSurfaces, SurfaceKey } from "./types";

/* ─── Anatomically distinct tooth SVGs ────────────────────────────────────────
   Each shape is designed to mimic the realistic silhouette style shown in
   professional dental charting software. ViewBox 0 0 40 56 for consistent
   sizing across all types.
   ────────────────────────────────────────────────────────────────────────── */

interface ToothSvgProps {
  className?: string;
  fill: string;
  stroke: string;
}

// ── Molar (teeth x6, x7, x8) — wide crown, 2–3 roots, bumpy occlusal ──
export const MolarSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 10 4
      C 7 4, 5 6, 5 10
      C 5 14, 6 18, 7 22
      C 7.5 24, 8 26, 8.5 28
      L 9 32
      C 9.5 38, 10 44, 10.5 48
      C 11 52, 13 54, 14 50
      C 14.5 47, 15 42, 15.5 38
      L 16 34
      C 16.5 32, 17 31, 18 31
      C 19 31, 19.5 31, 20 32
      C 20.5 31, 21 31, 22 31
      C 23 31, 23.5 32, 24 34
      L 24.5 38
      C 25 42, 25.5 47, 26 50
      C 27 54, 29 52, 29.5 48
      C 30 44, 30.5 38, 31 32
      L 31.5 28
      C 32 26, 32.5 24, 33 22
      C 34 18, 35 14, 35 10
      C 35 6, 33 4, 30 4
      C 27 4, 26 7, 24 8
      C 22 9, 20 8.5, 20 8.5
      C 20 8.5, 18 9, 16 8
      C 14 7, 13 4, 10 4
      Z
    " />
  </svg>
);

// ── Premolar (teeth x4, x5) — medium crown with 2 cusps, single root ──
export const PremolarSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 13 5
      C 10 5, 9 8, 9 12
      C 9 16, 10 20, 11 24
      C 12 28, 13 32, 14 36
      C 15 42, 16 48, 17 51
      C 18 54, 22 54, 23 51
      C 24 48, 25 42, 26 36
      C 27 32, 28 28, 29 24
      C 30 20, 31 16, 31 12
      C 31 8, 30 5, 27 5
      C 25 5, 23 8, 20 8
      C 17 8, 15 5, 13 5
      Z
    " />
  </svg>
);

// ── Canine (tooth x3) — pointed crown, long single fang root ──
export const CanineSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 15 3
      C 12 3, 11 6, 11 10
      C 11 14, 12 18, 13 22
      C 14 26, 15 30, 16 34
      C 17 38, 18 44, 19 48
      C 19.5 51, 20 53, 20 53
      C 20 53, 20.5 51, 21 48
      C 22 44, 23 38, 24 34
      C 25 30, 26 26, 27 22
      C 28 18, 29 14, 29 10
      C 29 6, 28 3, 25 3
      C 22 3, 21 6, 20 6
      C 19 6, 18 3, 15 3
      Z
    " />
  </svg>
);

// ── Upper Central Incisor (tooth 11, 21) — wide shovel-shaped crown ──
export const UpperCentralIncisorSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 12 3
      C 9 3, 8 6, 9 11
      C 9.5 14, 10 17, 11 20
      C 12 24, 13 28, 14 32
      C 15 36, 16 42, 17 46
      C 18 50, 19 53, 20 53
      C 21 53, 22 50, 23 46
      C 24 42, 25 36, 26 32
      C 27 28, 28 24, 29 20
      C 30 17, 30.5 14, 31 11
      C 32 6, 31 3, 28 3
      C 25 3, 23 6, 20 6
      C 17 6, 15 3, 12 3
      Z
    " />
  </svg>
);

// ── Upper Lateral Incisor (tooth 12, 22) — slightly narrower ──
export const UpperLateralIncisorSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 14 4
      C 11 4, 10 7, 11 12
      C 11.5 15, 12 18, 13 22
      C 14 26, 15 30, 16 34
      C 17 38, 18 44, 19 48
      C 19.5 51, 20 53, 20 53
      C 20 53, 20.5 51, 21 48
      C 22 44, 23 38, 24 34
      C 25 30, 26 26, 27 22
      C 28 18, 28.5 15, 29 12
      C 30 7, 29 4, 26 4
      C 24 4, 22 7, 20 7
      C 18 7, 16 4, 14 4
      Z
    " />
  </svg>
);

// ── Lower Central Incisor (tooth 31, 41) — narrow small crown ──
export const LowerCentralIncisorSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 16 4
      C 13.5 4, 13 7, 13.5 11
      C 14 14, 14.5 18, 15 22
      C 15.5 26, 16 30, 17 34
      C 17.5 38, 18 44, 19 48
      C 19.5 51, 20 53, 20 53
      C 20 53, 20.5 51, 21 48
      C 22 44, 22.5 38, 23 34
      C 24 30, 24.5 26, 25 22
      C 25.5 18, 26 14, 26.5 11
      C 27 7, 26.5 4, 24 4
      C 22.5 4, 21.5 6.5, 20 6.5
      C 18.5 6.5, 17.5 4, 16 4
      Z
    " />
  </svg>
);

// ── Lower Lateral Incisor (tooth 32, 42) — slightly wider than central ──
export const LowerLateralIncisorSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 15 4
      C 12.5 4, 12 7, 12.5 11
      C 13 14, 13.5 18, 14 22
      C 14.5 26, 15 30, 16 34
      C 16.5 38, 17.5 44, 18.5 48
      C 19 51, 20 53, 20 53
      C 20 53, 21 51, 21.5 48
      C 22.5 44, 23.5 38, 24 34
      C 25 30, 25.5 26, 26 22
      C 26.5 18, 27 14, 27.5 11
      C 28 7, 27.5 4, 25 4
      C 23 4, 22 6.5, 20 6.5
      C 18 6.5, 17 4, 15 4
      Z
    " />
  </svg>
);

// Primary (baby) tooth SVG — smaller, rounder
export const PrimaryToothSvg = ({ className, fill, stroke }: ToothSvgProps) => (
  <svg viewBox="0 0 40 56" className={className} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
    <path d="
      M 14 8
      C 10 8, 9 12, 10 18
      C 11 24, 14 32, 17 40
      C 18 44, 19 47, 20 47
      C 21 47, 22 44, 23 40
      C 26 32, 29 24, 30 18
      C 31 12, 30 8, 26 8
      C 24 8, 22 11, 20 11
      C 18 11, 16 8, 14 8
      Z
    " />
  </svg>
);

/* ─── Surface diagram SVGs (unchanged) ────────────────────────────────────── */

// Static tiny SVG for the grid
export const ToothSurfacesSvg = ({ className, surfaces }: { className?: string; surfaces?: ToothSurfaces }) => (
  <svg viewBox="0 0 100 100" className={className} stroke="currentColor" strokeWidth="6" fill="none">
    <circle cx="50" cy="50" r="46" fill={surfaces?.buccal || "none"} />
    <circle cx="50" cy="50" r="18" fill={surfaces?.occlusal || "none"} />
    <path d="M 18,18 L 37,37 M 82,18 L 63,37 M 18,82 L 37,63 M 82,82 L 63,63" />
  </svg>
);

// Large Interactive SVG for the modal
export const InteractiveSurfacesSvg = ({ onClickWedge, surfaces }: { onClickWedge?: (wedge: SurfaceKey) => void; surfaces: ToothSurfaces }) => {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm relative z-0">
      <path d="M 50 4 A 46 46 0 0 1 82.5 17.5 L 63 37 A 18 18 0 0 0 50 32 A 18 18 0 0 0 37 37 L 17.5 17.5 A 46 46 0 0 1 50 4 Z" fill={surfaces.buccal || "white"} stroke="#d1d5db" strokeWidth="2.5" className="hover:opacity-80 cursor-pointer transition-all" onClick={() => onClickWedge && onClickWedge('buccal')} />
      <path d="M 50 96 A 46 46 0 0 0 82.5 82.5 L 63 63 A 18 18 0 0 1 50 68 A 18 18 0 0 1 37 63 L 17.5 82.5 A 46 46 0 0 0 50 96 Z" fill={surfaces.lingual || "white"} stroke="#d1d5db" strokeWidth="2.5" className="hover:opacity-80 cursor-pointer transition-all" onClick={() => onClickWedge && onClickWedge('lingual')} />
      <path d="M 4 50 A 46 46 0 0 1 17.5 17.5 L 37 37 A 18 18 0 0 0 32 50 A 18 18 0 0 0 37 63 L 17.5 82.5 A 46 46 0 0 1 4 50 Z" fill={surfaces.distal || "white"} stroke="#d1d5db" strokeWidth="2.5" className="hover:opacity-80 cursor-pointer transition-all" onClick={() => onClickWedge && onClickWedge('distal')} />
      <path d="M 96 50 A 46 46 0 0 0 82.5 17.5 L 63 37 A 18 18 0 0 1 68 50 A 18 18 0 0 1 63 63 L 82.5 82.5 A 46 46 0 0 0 96 50 Z" fill={surfaces.mesial || "white"} stroke="#d1d5db" strokeWidth="2.5" className="hover:opacity-80 cursor-pointer transition-all" onClick={() => onClickWedge && onClickWedge('mesial')} />
      <circle cx="50" cy="50" r="18" fill={surfaces.occlusal || "white"} stroke="#d1d5db" strokeWidth="2.5" className="hover:opacity-80 cursor-pointer transition-all" onClick={() => onClickWedge && onClickWedge('occlusal')} />

      {/* Triangles/Markers inner UI */}
      <polygon points="50,22 47,26 53,26" fill="#6b7280" className="pointer-events-none" />
      <polygon points="50,78 47,74 53,74" fill="#6b7280" className="pointer-events-none" />
      <polygon points="22,50 26,47 26,53" fill="#6b7280" className="pointer-events-none" />
      <polygon points="78,50 74,47 74,53" fill="#6b7280" className="pointer-events-none" />
      <polygon points="50,47 47,51 53,51" fill="#6b7280" className="pointer-events-none" />
    </svg>
  );
}
