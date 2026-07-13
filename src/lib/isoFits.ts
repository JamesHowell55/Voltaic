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
 *  inferred from the letter case; 'JS9'/'js9' are symmetric. k6/m6/n6/p6/r6/s6/t6/u6
 *  route to the transcribed interference-fit table above instead of a formula. */
export function fitDeviationsMm(designation: string, nominalMm: number): FitDeviation | null {
  if (isInterferenceLetter(designation)) return interferenceShaftDeviationsMm(designation, nominalMm);
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

export const HOLE_FITS = ['H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'JS9', 'F8', 'G7'] as const;
export const SHAFT_FITS = ['h6', 'h7', 'h8', 'h9', 'f7', 'f8', 'g6', 'e8', 'd9', 'js9'] as const;

// Interference/transition-range shaft fundamental deviations (k, m, n, p, r, s,
// t, u — grade 6 only) transcribed directly from the ANSI B4.2 tolerance-zone
// tables (Tables 6-24 through 6-27), which reproduce the ISO 286-1 values
// exactly. These letters carry IT-grade-dependent correction terms (Δ) in the
// standard's own formulas, so — unlike d/e/f/g/h above — they are looked up
// from the published table rather than computed, matching this project's
// "verify sourced tables" convention. Size ranges are finer than
// SIZE_RANGES above 10 mm (ISO 286 subdivides r-and-beyond more finely),
// so a dedicated range table is used. Values in mm: [upperMm (es), lowerMm (ei)].
const INTERFERENCE_SIZE_RANGES: [number, number][] = [
  [0, 3], [3, 6], [6, 10], [10, 14], [14, 18], [18, 24], [24, 30], [30, 40],
  [40, 50], [50, 65], [65, 80], [80, 100], [100, 120], [120, 140], [140, 160],
  [160, 180], [180, 200], [200, 225], [225, 250], [250, 280], [280, 315],
  [315, 355], [355, 400], [400, 450], [450, 500],
];

type InterferenceLetter = 'k6' | 'm6' | 'n6' | 'p6' | 'r6' | 's6' | 't6' | 'u6';

// null entries mean the class is not defined by the standard at that size
// (e.g. t6 has no published tolerance zone below 24 mm).
const INTERFERENCE_TABLE_MM: Record<InterferenceLetter, ([number, number] | null)[]> = {
  k6: [
    [0.006, 0.000], [0.009, 0.001], [0.010, 0.001], [0.012, 0.001], [0.012, 0.001],
    [0.015, 0.002], [0.015, 0.002], [0.018, 0.002], [0.018, 0.002], [0.021, 0.002],
    [0.021, 0.002], [0.025, 0.003], [0.025, 0.003], [0.028, 0.003], [0.028, 0.003],
    [0.028, 0.003], [0.033, 0.004], [0.033, 0.004], [0.033, 0.004], [0.036, 0.004],
    [0.036, 0.004], [0.040, 0.004], [0.040, 0.004], [0.045, 0.005], [0.045, 0.005],
  ],
  m6: [
    [0.008, 0.002], [0.012, 0.004], [0.015, 0.006], [0.018, 0.007], [0.018, 0.007],
    [0.021, 0.008], [0.021, 0.008], [0.025, 0.009], [0.025, 0.009], [0.030, 0.011],
    [0.030, 0.011], [0.035, 0.013], [0.035, 0.013], [0.040, 0.015], [0.040, 0.015],
    [0.040, 0.015], [0.046, 0.017], [0.046, 0.017], [0.046, 0.017], [0.052, 0.020],
    [0.052, 0.020], [0.057, 0.021], [0.057, 0.021], [0.063, 0.023], [0.063, 0.023],
  ],
  n6: [
    [0.010, 0.004], [0.016, 0.008], [0.019, 0.010], [0.023, 0.012], [0.023, 0.012],
    [0.028, 0.015], [0.028, 0.015], [0.033, 0.017], [0.033, 0.017], [0.039, 0.020],
    [0.039, 0.020], [0.045, 0.023], [0.045, 0.023], [0.052, 0.027], [0.052, 0.027],
    [0.052, 0.027], [0.060, 0.031], [0.060, 0.031], [0.060, 0.031], [0.066, 0.034],
    [0.066, 0.034], [0.073, 0.037], [0.073, 0.037], [0.080, 0.040], [0.080, 0.040],
  ],
  p6: [
    [0.012, 0.006], [0.020, 0.012], [0.024, 0.015], [0.029, 0.018], [0.029, 0.018],
    [0.035, 0.022], [0.035, 0.022], [0.042, 0.026], [0.042, 0.026], [0.051, 0.032],
    [0.051, 0.032], [0.059, 0.037], [0.059, 0.037], [0.068, 0.043], [0.068, 0.043],
    [0.068, 0.043], [0.079, 0.050], [0.079, 0.050], [0.079, 0.050], [0.088, 0.056],
    [0.088, 0.056], [0.098, 0.062], [0.098, 0.062], [0.108, 0.068], [0.108, 0.068],
  ],
  r6: [
    [0.016, 0.010], [0.023, 0.015], [0.028, 0.019], [0.034, 0.023], [0.034, 0.023],
    [0.041, 0.028], [0.041, 0.028], [0.050, 0.034], [0.050, 0.034], [0.060, 0.041],
    [0.062, 0.043], [0.073, 0.051], [0.076, 0.054], [0.088, 0.063], [0.090, 0.065],
    [0.093, 0.068], [0.106, 0.077], [0.109, 0.080], [0.113, 0.084], [0.126, 0.094],
    [0.130, 0.098], [0.144, 0.108], [0.150, 0.114], [0.166, 0.126], [0.172, 0.132],
  ],
  s6: [
    [0.020, 0.014], [0.027, 0.019], [0.032, 0.023], [0.039, 0.028], [0.039, 0.028],
    [0.048, 0.035], [0.048, 0.035], [0.059, 0.043], [0.059, 0.043], [0.072, 0.053],
    [0.078, 0.059], [0.093, 0.071], [0.101, 0.079], [0.117, 0.092], [0.125, 0.100],
    [0.133, 0.108], [0.151, 0.122], [0.159, 0.130], [0.169, 0.140], [0.190, 0.158],
    [0.202, 0.170], [0.226, 0.190], [0.244, 0.208], [0.272, 0.232], [0.292, 0.252],
  ],
  t6: [
    null, null, null, null, null,
    null, [0.054, 0.041], [0.064, 0.048], [0.070, 0.054], [0.085, 0.066],
    [0.094, 0.075], [0.113, 0.091], [0.126, 0.104], [0.147, 0.122], [0.159, 0.134],
    [0.171, 0.146], [0.195, 0.166], [0.209, 0.180], [0.225, 0.196], [0.250, 0.218],
    [0.272, 0.240], [0.304, 0.268], [0.330, 0.294], [0.370, 0.330], [0.400, 0.360],
  ],
  u6: [
    [0.024, 0.018], [0.031, 0.023], [0.037, 0.028], [0.044, 0.033], [0.044, 0.033],
    [0.054, 0.041], [0.061, 0.048], [0.076, 0.060], [0.086, 0.070], [0.106, 0.087],
    [0.121, 0.102], [0.146, 0.124], [0.166, 0.144], [0.195, 0.170], [0.215, 0.190],
    [0.235, 0.210], [0.265, 0.236], [0.287, 0.258], [0.313, 0.284], [0.347, 0.315],
    [0.382, 0.350], [0.426, 0.390], [0.471, 0.435], [0.530, 0.490], [0.580, 0.540],
  ],
};

export const INTERFERENCE_SHAFT_FITS = ['k6', 'm6', 'n6', 'p6', 'r6', 's6', 't6', 'u6'] as const;

/** Table-lookup deviations for the k6/m6/n6/p6/r6/s6/t6/u6 shaft classes (mm).
 *  Returns null if the class has no published tolerance zone at this size
 *  (e.g. t6 below 24 mm nominal). */
export function interferenceShaftDeviationsMm(letter: InterferenceLetter, nominalMm: number): FitDeviation | null {
  const idx = INTERFERENCE_SIZE_RANGES.findIndex(([lo, hi]) => nominalMm > lo && nominalMm <= hi);
  if (idx < 0) return null;
  const entry = INTERFERENCE_TABLE_MM[letter][idx];
  if (!entry) return null;
  return { upperMm: entry[0], lowerMm: entry[1] };
}

export function isInterferenceLetter(letter: string): letter is InterferenceLetter {
  return (INTERFERENCE_SHAFT_FITS as readonly string[]).includes(letter);
}
