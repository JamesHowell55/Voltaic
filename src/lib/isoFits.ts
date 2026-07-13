// ISO 286-1 limits-and-fits engine for the O-Ring calculator's housing/rod/groove
// tolerances. Computes the standard tolerance grade IT5-IT12 from the standard
// tolerance factor i, and fundamental deviations for the common hole letters
// (D/E/F/G/H/JS) and shaft letters (d/e/f/g/h/js) from the ISO 286-1 formulas.
// Values are computed (not table-transcribed) so they can deviate from the
// standard's rounded table entries by a micron or two — fine for gland design,
// disclosed in the page's reference notes.

export type FitKind = 'hole' | 'shaft';

// Standard diameter ranges (mm) per ISO 286-1; D used in the formulas is the
// geometric mean of the range containing the nominal size.
const SIZE_RANGES: [number, number][] = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30], [30, 50], [50, 80], [80, 120],
  [120, 180], [180, 250], [250, 315], [315, 400], [400, 500],
];

function geometricMeanD(nominalMm: number): number {
  for (const [lo, hi] of SIZE_RANGES) {
    if (nominalMm > lo && nominalMm <= hi) {
      return lo === 0 ? Math.sqrt(1 * 3) : Math.sqrt(lo * hi);
    }
  }
  return Math.sqrt(400 * 500); // beyond 500: use last range (approximation)
}

// Standard tolerance factor i (µm): i = 0.45·∛D + 0.001·D  (D in mm)
function toleranceFactorUm(nominalMm: number): number {
  const D = geometricMeanD(nominalMm);
  return 0.45 * Math.cbrt(D) + 0.001 * D;
}

// IT grade multipliers of i (ISO 286-1): IT5=7i, IT6=10i, IT7=16i, IT8=25i,
// IT9=40i, IT10=64i, IT11=100i, IT12=160i
const IT_MULTIPLIERS: Record<number, number> = { 5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100, 12: 160 };

export function itToleranceMm(nominalMm: number, grade: number): number {
  const mult = IT_MULTIPLIERS[grade];
  if (!mult) return NaN;
  return (mult * toleranceFactorUm(nominalMm)) / 1000;
}

// Fundamental deviations (µm magnitude) per ISO 286-1 formulas; for shafts
// (lowercase) this is es (upper deviation, negative); for holes (uppercase)
// it is EI (lower deviation, positive). h/H are zero-line; js/JS symmetric.
function fundamentalDeviationUm(letter: string, nominalMm: number): number {
  const D = geometricMeanD(nominalMm);
  switch (letter.toLowerCase()) {
    case 'd': return 16 * Math.pow(D, 0.44);
    case 'e': return 11 * Math.pow(D, 0.41);
    case 'f': return 5.5 * Math.pow(D, 0.41);
    case 'g': return 2.5 * Math.pow(D, 0.34);
    case 'h': return 0;
    case 'js': return 0; // handled separately (symmetric)
    default: return 0;
  }
}

export interface FitDeviation {
  upperMm: number; // ES / es
  lowerMm: number; // EI / ei
}

/** Deviations for a fit designation like H8 (hole) or f7 (shaft). The kind is
 *  inferred from the letter case; 'JS9'/'js9' are symmetric. */
export function fitDeviationsMm(designation: string, nominalMm: number): FitDeviation | null {
  const m = designation.match(/^(js|JS|[defghDEFGH])(\d{1,2})$/);
  if (!m) return null;
  const letter = m[1];
  const grade = Number(m[2]);
  const it = itToleranceMm(nominalMm, grade);
  if (!isFinite(it)) return null;
  const isHole = letter === letter.toUpperCase();
  if (letter.toLowerCase() === 'js') {
    return { upperMm: it / 2, lowerMm: -it / 2 };
  }
  const fd = fundamentalDeviationUm(letter, nominalMm) / 1000;
  if (isHole) {
    // Hole: EI = +fd (H: 0), ES = EI + IT
    return { upperMm: fd + it, lowerMm: fd };
  }
  // Shaft: es = −fd (h: 0), ei = es − IT
  return { upperMm: -fd, lowerMm: -fd - it };
}

export const HOLE_FITS = ['H7', 'H8', 'H9', 'H10', 'H11', 'JS9', 'F8', 'G7'] as const;
export const SHAFT_FITS = ['h6', 'h7', 'h8', 'h9', 'f7', 'f8', 'g6', 'e8', 'd9', 'js9'] as const;
