import { ToothSurfaces, ToothMeta } from "./types";

export const emptySurfaces = (): ToothSurfaces => ({
  buccal: null, lingual: null, distal: null, mesial: null, occlusal: null,
});

export const defaultMeta = (): ToothMeta => ({
  surfaces: emptySurfaces(),
  toothType: 'permanent',
  findings: [],
});

export function parseToothMeta(notesJson?: string | null): ToothMeta {
  try {
    if (!notesJson) return defaultMeta();
    const parsed = JSON.parse(notesJson);
    if (typeof parsed === 'object' && ('surfaces' in parsed || 'toothType' in parsed || 'findings' in parsed)) {
      return {
        surfaces: { ...emptySurfaces(), ...(parsed.surfaces ?? {}) },
        toothType: parsed.toothType ?? 'permanent',
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      };
    }
    return defaultMeta();
  } catch {
    return defaultMeta();
  }
}

export const isMolar = (tooth: number) => {
  const lastDigit = tooth % 10;
  return lastDigit >= 6 && lastDigit <= 8;
};

export type ToothCategory =
  | "molar"
  | "premolar"
  | "canine"
  | "upper-central-incisor"
  | "upper-lateral-incisor"
  | "lower-central-incisor"
  | "lower-lateral-incisor";

/**
 * Maps a tooth number (FDI notation) to its anatomical category.
 * FDI last digit: 1=central incisor, 2=lateral incisor, 3=canine,
 * 4-5=premolars, 6-8=molars.
 * Upper = quadrants 1,2 (tens digit 1x,2x), Lower = quadrants 3,4 (3x,4x).
 */
export function getToothCategory(toothId: number | string): ToothCategory {
  const id = Number(toothId);
  const lastDigit = id % 10;
  const isUpper = isUpperTooth(id);

  if (lastDigit >= 6) return "molar";
  if (lastDigit >= 4) return "premolar";
  if (lastDigit === 3) return "canine";
  if (lastDigit === 2) return isUpper ? "upper-lateral-incisor" : "lower-lateral-incisor";
  return isUpper ? "upper-central-incisor" : "lower-central-incisor";
}

export function isUpperTooth(toothId: number | string): boolean {
  const id = Number(toothId);
  const quadrant = Math.floor(id / 10);
  return quadrant === 1 || quadrant === 2;
}
