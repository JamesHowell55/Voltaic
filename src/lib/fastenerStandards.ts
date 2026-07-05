// Representative metric (ISO coarse pitch) and imperial (UNC) fastener size/strength
// data. Dimensional values are standard/typical figures per ISO 898-1, ISO 4014/4017
// (hex head), ISO 4762 (socket head cap screw), ASME B18.2.1/B18.2.2/B18.3, and
// SAE J429 — sufficient for engineering estimation. Verify against the current
// official standard tables before certification use.

export type ThreadStandard = 'metric' | 'imperial';
export type HeadType = 'hexHead' | 'socketHeadCap';

export interface FastenerSize {
  id: string;                   // 'M8', '1/4-20'
  standard: ThreadStandard;
  label: string;                // display label, e.g. 'M8 x 1.25' or '1/4-20 UNC'
  nominalDiameterMm: number;    // major diameter, d
  pitchMm: number;              // thread pitch (metric) or 1/TPI (imperial), in mm
  pitchDiameterMm: number;      // dm (pitch/mean thread diameter), d2 = d - 0.649519*P
  tensileStressAreaMm2: number; // As, from standard tables
  // Effective bearing-face diameter D used for both the frustum base and the
  // bearing-stress area. For hex heads this is the width-across-flats (a small,
  // conservative underestimate of true bearing OD); for SHCS it's the head OD.
  headFlatsAcrossMm: Record<HeadType, number>;
}

const IN_TO_MM = 25.4;
const PSI_TO_MPA = 0.00689476;

export const METRIC_SIZES: FastenerSize[] = [
  { id: 'M3', standard: 'metric', label: 'M3 x 0.5', nominalDiameterMm: 3, pitchMm: 0.5, pitchDiameterMm: 2.675, tensileStressAreaMm2: 5.03, headFlatsAcrossMm: { hexHead: 5.5, socketHeadCap: 5.5 } },
  { id: 'M4', standard: 'metric', label: 'M4 x 0.7', nominalDiameterMm: 4, pitchMm: 0.7, pitchDiameterMm: 3.545, tensileStressAreaMm2: 8.78, headFlatsAcrossMm: { hexHead: 7, socketHeadCap: 7 } },
  { id: 'M5', standard: 'metric', label: 'M5 x 0.8', nominalDiameterMm: 5, pitchMm: 0.8, pitchDiameterMm: 4.480, tensileStressAreaMm2: 14.2, headFlatsAcrossMm: { hexHead: 8, socketHeadCap: 8.5 } },
  { id: 'M6', standard: 'metric', label: 'M6 x 1.0', nominalDiameterMm: 6, pitchMm: 1.0, pitchDiameterMm: 5.350, tensileStressAreaMm2: 20.1, headFlatsAcrossMm: { hexHead: 10, socketHeadCap: 10 } },
  { id: 'M8', standard: 'metric', label: 'M8 x 1.25', nominalDiameterMm: 8, pitchMm: 1.25, pitchDiameterMm: 7.188, tensileStressAreaMm2: 36.6, headFlatsAcrossMm: { hexHead: 13, socketHeadCap: 13 } },
  { id: 'M10', standard: 'metric', label: 'M10 x 1.5', nominalDiameterMm: 10, pitchMm: 1.5, pitchDiameterMm: 9.026, tensileStressAreaMm2: 58.0, headFlatsAcrossMm: { hexHead: 16, socketHeadCap: 16 } },
  { id: 'M12', standard: 'metric', label: 'M12 x 1.75', nominalDiameterMm: 12, pitchMm: 1.75, pitchDiameterMm: 10.863, tensileStressAreaMm2: 84.3, headFlatsAcrossMm: { hexHead: 18, socketHeadCap: 18 } },
  { id: 'M16', standard: 'metric', label: 'M16 x 2.0', nominalDiameterMm: 16, pitchMm: 2.0, pitchDiameterMm: 14.701, tensileStressAreaMm2: 157, headFlatsAcrossMm: { hexHead: 24, socketHeadCap: 24 } },
  { id: 'M20', standard: 'metric', label: 'M20 x 2.5', nominalDiameterMm: 20, pitchMm: 2.5, pitchDiameterMm: 18.376, tensileStressAreaMm2: 245, headFlatsAcrossMm: { hexHead: 30, socketHeadCap: 30 } },
];

// Imperial UNC sizes. Tensile stress areas are standard published ASME B1.1 values
// (in²); pitch diameter uses the same 60° thread-form relation d2 = D - 0.649519*P.
const imperialRaw: { id: string; d: number; tpi: number; asIn2: number; hexAcrossIn: number; shcsHeadIn: number }[] = [
  { id: '#4-40', d: 0.112, tpi: 40, asIn2: 0.00604, hexAcrossIn: 0.25, shcsHeadIn: 0.183 },
  { id: '#6-32', d: 0.138, tpi: 32, asIn2: 0.00909, hexAcrossIn: 5 / 16, shcsHeadIn: 0.226 },
  { id: '#8-32', d: 0.164, tpi: 32, asIn2: 0.0140, hexAcrossIn: 11 / 32, shcsHeadIn: 0.270 },
  { id: '#10-24', d: 0.190, tpi: 24, asIn2: 0.0175, hexAcrossIn: 0.375, shcsHeadIn: 0.312 },
  { id: '1/4-20', d: 0.250, tpi: 20, asIn2: 0.0318, hexAcrossIn: 7 / 16, shcsHeadIn: 0.375 },
  { id: '5/16-18', d: 0.3125, tpi: 18, asIn2: 0.0524, hexAcrossIn: 0.5, shcsHeadIn: 0.469 },
  { id: '3/8-16', d: 0.375, tpi: 16, asIn2: 0.0775, hexAcrossIn: 9 / 16, shcsHeadIn: 0.5625 },
  { id: '1/2-13', d: 0.5, tpi: 13, asIn2: 0.1419, hexAcrossIn: 0.75, shcsHeadIn: 0.750 },
];

export const IMPERIAL_SIZES: FastenerSize[] = imperialRaw.map((r) => {
  const pitchIn = 1 / r.tpi;
  const dMm = r.d * IN_TO_MM;
  const pitchMm = pitchIn * IN_TO_MM;
  return {
    id: r.id,
    standard: 'imperial',
    label: `${r.id} UNC`,
    nominalDiameterMm: dMm,
    pitchMm,
    pitchDiameterMm: dMm - 0.649519 * pitchMm,
    tensileStressAreaMm2: r.asIn2 * IN_TO_MM * IN_TO_MM,
    headFlatsAcrossMm: { hexHead: r.hexAcrossIn * IN_TO_MM, socketHeadCap: r.shcsHeadIn * IN_TO_MM },
  };
});

export const ALL_SIZES: FastenerSize[] = [...METRIC_SIZES, ...IMPERIAL_SIZES];

export function getFastenerSize(id: string): FastenerSize | undefined {
  return ALL_SIZES.find((s) => s.id === id);
}

// Generic standard designation for the bolt itself — cross-reference against a
// supplier's current catalog before ordering, not a specific manufacturer's SKU.
export function buildBoltPartNumber(size: FastenerSize, headType: HeadType, propertyClassLabel: string): string {
  const headStandard =
    size.standard === 'metric' ? (headType === 'hexHead' ? 'ISO 4014' : 'ISO 4762') : headType === 'hexHead' ? 'ASME B18.2.1' : 'ASME B18.3';
  return `${headStandard} - ${size.label} - ${propertyClassLabel}`;
}

export interface PropertyClass {
  id: string;
  standard: 'iso898' | 'sae429' | 'custom';
  label: string;
  tensileStrengthMPa: number;
  proofStrengthMPa: number;
  elasticModulusGPa: number;
}

// ISO 898-1 designation formula: tensile (MPa) = first digit x 100; proof stress =
// tensile x (second digit / 10). E.g. 8.8 -> 800 MPa tensile, 640 MPa proof.
export const ISO_898_CLASSES: PropertyClass[] = [
  { id: '4.6', standard: 'iso898', label: 'ISO 898-1 Class 4.6', tensileStrengthMPa: 400, proofStrengthMPa: 240, elasticModulusGPa: 200 },
  { id: '8.8', standard: 'iso898', label: 'ISO 898-1 Class 8.8', tensileStrengthMPa: 800, proofStrengthMPa: 640, elasticModulusGPa: 200 },
  { id: '10.9', standard: 'iso898', label: 'ISO 898-1 Class 10.9', tensileStrengthMPa: 1000, proofStrengthMPa: 900, elasticModulusGPa: 200 },
  { id: '12.9', standard: 'iso898', label: 'ISO 898-1 Class 12.9', tensileStrengthMPa: 1200, proofStrengthMPa: 1080, elasticModulusGPa: 200 },
];

// SAE J429 typical published grade values (psi -> MPa).
export const SAE_J429_GRADES: PropertyClass[] = [
  { id: 'sae2', standard: 'sae429', label: 'SAE J429 Grade 2', tensileStrengthMPa: 74000 * PSI_TO_MPA, proofStrengthMPa: 55000 * PSI_TO_MPA, elasticModulusGPa: 200 },
  { id: 'sae5', standard: 'sae429', label: 'SAE J429 Grade 5', tensileStrengthMPa: 120000 * PSI_TO_MPA, proofStrengthMPa: 85000 * PSI_TO_MPA, elasticModulusGPa: 200 },
  { id: 'sae8', standard: 'sae429', label: 'SAE J429 Grade 8', tensileStrengthMPa: 150000 * PSI_TO_MPA, proofStrengthMPa: 120000 * PSI_TO_MPA, elasticModulusGPa: 200 },
];

export const CUSTOM_PROPERTY_CLASS: PropertyClass = {
  id: 'custom', standard: 'custom', label: 'Custom', tensileStrengthMPa: 800, proofStrengthMPa: 640, elasticModulusGPa: 200,
};

export const ALL_PROPERTY_CLASSES: PropertyClass[] = [...ISO_898_CLASSES, ...SAE_J429_GRADES, CUSTOM_PROPERTY_CLASS];

export function getPropertyClass(id: string): PropertyClass | undefined {
  return ALL_PROPERTY_CLASSES.find((c) => c.id === id);
}

export interface FrictionPreset {
  id: string;
  label: string;
  mu: number;
  gallingRisk?: boolean;
}

export const FRICTION_PRESETS: FrictionPreset[] = [
  { id: 'dry', label: 'Dry / as-received', mu: 0.15 },
  { id: 'lightlyOiled', label: 'Lightly oiled', mu: 0.12 },
  { id: 'lubricated', label: 'Lubricated (moly/PTFE anti-seize)', mu: 0.08 },
  { id: 'dryStainless', label: 'Dry stainless-on-stainless', mu: 0.30, gallingRisk: true },
  { id: 'custom', label: 'Custom', mu: 0.15 },
];

export interface TighteningMethodPreset {
  id: string;
  label: string;
  alphaAMin: number;
  alphaAMax: number;
  recommendedTargetPercentProof: number;
}

// Typical VDI 2230 "tightening factor" (alphaA) literature ranges — approximate,
// varies by equipment/condition; verify for critical joints.
export const TIGHTENING_METHOD_PRESETS: TighteningMethodPreset[] = [
  { id: 'torqueWrench', label: 'Torque wrench (calibrated, hand tool)', alphaAMin: 1.6, alphaAMax: 2.5, recommendedTargetPercentProof: 75 },
  { id: 'torqueAngle', label: 'Torque + angle (turn-of-nut past snug)', alphaAMin: 1.4, alphaAMax: 1.6, recommendedTargetPercentProof: 80 },
  { id: 'hydraulicTensioning', label: 'Hydraulic tensioning', alphaAMin: 1.1, alphaAMax: 1.2, recommendedTargetPercentProof: 90 },
  { id: 'yieldControlled', label: 'Yield-point / gradient-controlled tooling', alphaAMin: 1.2, alphaAMax: 1.4, recommendedTargetPercentProof: 90 },
];

export function getTighteningMethod(id: string): TighteningMethodPreset | undefined {
  return TIGHTENING_METHOD_PRESETS.find((m) => m.id === id);
}

export function getFrictionPreset(id: string): FrictionPreset | undefined {
  return FRICTION_PRESETS.find((f) => f.id === id);
}

export type HoleFit = 'close' | 'medium' | 'free';

// ISO 273:1979 clearance hole diameters (mm) for metric bolts — close/medium/free
// fit series (tolerance fields H12/H13/H14). Exact tabulated values for the sizes
// in this tool's scope; other diameters (including imperial, converted to mm) are
// linearly interpolated/extrapolated between these points as a reasonable estimate
// — verify against the standard's own table for a size not listed here.
export const CLEARANCE_HOLE_TABLE: Record<string, { closeMm: number; mediumMm: number; freeMm: number }> = {
  M3: { closeMm: 3.2, mediumMm: 3.4, freeMm: 3.6 },
  M4: { closeMm: 4.3, mediumMm: 4.5, freeMm: 4.8 },
  M5: { closeMm: 5.3, mediumMm: 5.5, freeMm: 5.8 },
  M6: { closeMm: 6.4, mediumMm: 6.6, freeMm: 7.0 },
  M8: { closeMm: 8.4, mediumMm: 9.0, freeMm: 10.0 },
  M10: { closeMm: 10.5, mediumMm: 11.0, freeMm: 12.0 },
  M12: { closeMm: 13.0, mediumMm: 13.5, freeMm: 14.5 },
  M16: { closeMm: 17.0, mediumMm: 17.5, freeMm: 18.0 },
  M20: { closeMm: 21.0, mediumMm: 22.0, freeMm: 24.0 },
};

const CLEARANCE_POINTS = METRIC_SIZES.map((s) => ({ d: s.nominalDiameterMm, ...CLEARANCE_HOLE_TABLE[s.id] })).sort((a, b) => a.d - b.d);

function interpolateClearance(dMm: number): { closeMm: number; mediumMm: number; freeMm: number } {
  const pts = CLEARANCE_POINTS;
  if (dMm <= pts[0].d) {
    const [a, b] = pts;
    const t = (dMm - a.d) / (b.d - a.d);
    return {
      closeMm: a.closeMm + t * (b.closeMm - a.closeMm),
      mediumMm: a.mediumMm + t * (b.mediumMm - a.mediumMm),
      freeMm: a.freeMm + t * (b.freeMm - a.freeMm),
    };
  }
  if (dMm >= pts[pts.length - 1].d) {
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const t = (dMm - a.d) / (b.d - a.d);
    return {
      closeMm: a.closeMm + t * (b.closeMm - a.closeMm),
      mediumMm: a.mediumMm + t * (b.mediumMm - a.mediumMm),
      freeMm: a.freeMm + t * (b.freeMm - a.freeMm),
    };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (dMm >= a.d && dMm <= b.d) {
      const t = (dMm - a.d) / (b.d - a.d);
      return {
        closeMm: a.closeMm + t * (b.closeMm - a.closeMm),
        mediumMm: a.mediumMm + t * (b.mediumMm - a.mediumMm),
        freeMm: a.freeMm + t * (b.freeMm - a.freeMm),
      };
    }
  }
  return pts[0];
}

export function getSuggestedHoleMm(sizeId: string, fit: HoleFit): number {
  const size = getFastenerSize(sizeId);
  const tabulated = CLEARANCE_HOLE_TABLE[sizeId];
  const result = tabulated ?? interpolateClearance(size?.nominalDiameterMm ?? 8);
  return fit === 'close' ? result.closeMm : fit === 'medium' ? result.mediumMm : result.freeMm;
}
