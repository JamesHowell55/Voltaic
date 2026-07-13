// O-Ring design data, sourced from the Trelleborg Sealing Solutions O-Rings
// design guide (edition April 2007) unless noted otherwise:
//  - Initial squeeze ranges per cross-section read from the guide's Figures 15/16
//    (permissible initial squeeze vs cross-section, hydraulic/pneumatic dynamic,
//    radial static, axial) — chart-read values, so ±1% band accuracy.
//  - Stretch / circumferential-compression limits from section B.2.3: max installed
//    elongation 8% (d1 < 50 mm) / 6% (d1 > 50 mm), max circumferential compression
//    3%; cross-section reduction ≈ 0.5% per 1% of stretch.
//  - Groove installation dimensions (Table XV) and permissible radial clearance /
//    extrusion gap (Table XII) transcribed for the five preferred cross-sections.
//  - Cross-section tolerances (Table XX, ISO 3601-1) transcribed exactly.
//  - Inside-diameter tolerances: Class A per-size from the AS568 tables (see
//    oringSizes.ts), Class B interpolated from a published DIN ISO 3601-1:2013
//    Class B manufacturer table.
//  - Material temperature ranges from the guide's elastomer descriptions.
// Gland-fill limits (max 85% worst-case, ≤75% recommended nominal) are standard
// industry guidance used by O-Ring gland calculators rather than a numbered table
// in the 2007 guide. Verify critical designs against the current standards and
// manufacturer data.

import { ORING_SIZES, CLASS_B_ID_TOL_ANCHORS, type ORingSize } from './oringSizes';

export { ORING_SIZES };
export type { ORingSize };

export type ToleranceClass = 'A' | 'B';

// The five ISO 3601-1 preferred cross-sections (AS568 series).
export const ORING_CROSS_SECTIONS = [1.78, 2.62, 3.53, 5.33, 6.99] as const;

// Cross-section tolerances, ISO 3601-1 (Trelleborg Table XX / AS568) — the same
// values apply to both tolerance classes (the classes differ on d1).
export function crossSectionToleranceMm(cs: number): number {
  if (cs <= 1.8) return 0.08;
  if (cs <= 2.65) return 0.09;
  if (cs <= 3.55) return 0.1;
  if (cs <= 5.3 + 0.04) return 0.13; // 5.33 preferred size falls in the ≤5.30 band per AS568 (±0.13)
  if (cs <= 7.0) return 0.15;
  if (cs <= 8.0) return 0.18;
  if (cs <= 10.0) return 0.21;
  return 0.25;
}

/** Inside-diameter tolerance for the selected class. Class A is the per-size AS568
 *  value carried on the size record; Class B interpolates the DIN ISO 3601-1:2013
 *  Class B anchor table. */
export function insideDiameterToleranceMm(size: ORingSize, toleranceClass: ToleranceClass): number {
  if (toleranceClass === 'A') return size.tolA;
  const anchors = CLASS_B_ID_TOL_ANCHORS;
  const d1 = size.d1;
  if (d1 <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    if (d1 <= anchors[i][0]) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      return y0 + ((d1 - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return anchors[anchors.length - 1][1];
}

export function sizesForCrossSection(cs: number): ORingSize[] {
  return ORING_SIZES.filter((s) => Math.abs(s.cs - cs) < 0.01);
}

// --- Initial squeeze recommendation bands (Trelleborg Figures 15/16), % of d2.
// Anchor points at the five preferred cross-sections; linear interpolation
// between them. "hydraulicDynamic"/"pneumaticDynamic" are radial dynamic;
// "radialStatic" covers both inner and outer radial static seals; "axial" is
// the axial/face static band.
export type SqueezeApplication = 'hydraulicDynamic' | 'pneumaticDynamic' | 'radialStatic' | 'axial';

const SQUEEZE_ANCHORS: Record<SqueezeApplication, { cs: number; min: number; max: number }[]> = {
  hydraulicDynamic: [
    { cs: 1.78, min: 13, max: 28 },
    { cs: 2.62, min: 12, max: 24 },
    { cs: 3.53, min: 10, max: 23 },
    { cs: 5.33, min: 9.5, max: 21 },
    { cs: 6.99, min: 9, max: 20 },
  ],
  pneumaticDynamic: [
    { cs: 1.78, min: 9.5, max: 25.5 },
    { cs: 2.62, min: 8, max: 22 },
    { cs: 3.53, min: 7, max: 20 },
    { cs: 5.33, min: 6, max: 17 },
    { cs: 6.99, min: 5, max: 15.5 },
  ],
  radialStatic: [
    { cs: 1.78, min: 14, max: 31 },
    { cs: 2.62, min: 13, max: 28 },
    { cs: 3.53, min: 12, max: 26 },
    { cs: 5.33, min: 11, max: 25 },
    { cs: 6.99, min: 10.5, max: 24 },
  ],
  axial: [
    { cs: 1.78, min: 22.5, max: 35 },
    { cs: 2.62, min: 22, max: 30 },
    { cs: 3.53, min: 21, max: 27 },
    { cs: 5.33, min: 17, max: 24 },
    { cs: 6.99, min: 15, max: 21 },
  ],
};

export function recommendedSqueezePercent(application: SqueezeApplication, cs: number): { min: number; max: number } {
  const anchors = SQUEEZE_ANCHORS[application];
  if (cs <= anchors[0].cs) return { min: anchors[0].min, max: anchors[0].max };
  for (let i = 1; i < anchors.length; i++) {
    if (cs <= anchors[i].cs) {
      const a = anchors[i - 1];
      const b = anchors[i];
      const f = (cs - a.cs) / (b.cs - a.cs);
      return { min: a.min + f * (b.min - a.min), max: a.max + f * (b.max - a.max) };
    }
  }
  const last = anchors[anchors.length - 1];
  return { min: last.min, max: last.max };
}

// --- Groove installation dimensions (Trelleborg Table XV) for the preferred
// cross-sections: radial groove depth (dynamic t1 / static t), radial groove
// width b1, axial groove depth h, axial groove width b4, groove corner radius r1.
// All mm. Used to offer "suggested groove" values, not to constrain input.
export interface GrooveRecommendation {
  cs: number;
  radialDepthDynamicMm: number; // t1 (+0.05)
  radialDepthStaticMm: number; // t (+0.05)
  radialWidthMm: number; // b1 (+0.2)
  axialDepthMm: number; // h (+0.05)
  axialWidthMm: number; // b4 (+0.2)
  cornerRadiusMm: number; // r1 (±0.2)
}

export const GROOVE_RECOMMENDATIONS: GrooveRecommendation[] = [
  { cs: 1.78, radialDepthDynamicMm: 1.45, radialDepthStaticMm: 1.3, radialWidthMm: 2.4, axialDepthMm: 1.3, axialWidthMm: 2.6, cornerRadiusMm: 0.3 },
  { cs: 2.62, radialDepthDynamicMm: 2.25, radialDepthStaticMm: 2.0, radialWidthMm: 3.6, axialDepthMm: 2.0, axialWidthMm: 3.8, cornerRadiusMm: 0.3 },
  { cs: 3.53, radialDepthDynamicMm: 3.1, radialDepthStaticMm: 2.7, radialWidthMm: 4.8, axialDepthMm: 2.7, axialWidthMm: 5.0, cornerRadiusMm: 0.6 },
  { cs: 5.33, radialDepthDynamicMm: 4.7, radialDepthStaticMm: 4.3, radialWidthMm: 7.1, axialDepthMm: 4.3, axialWidthMm: 7.3, cornerRadiusMm: 0.6 },
  { cs: 6.99, radialDepthDynamicMm: 6.1, radialDepthStaticMm: 5.8, radialWidthMm: 9.5, axialDepthMm: 5.8, axialWidthMm: 9.7, cornerRadiusMm: 1.0 },
];

export function grooveRecommendationForCs(cs: number): GrooveRecommendation {
  let best = GROOVE_RECOMMENDATIONS[0];
  for (const g of GROOVE_RECOMMENDATIONS) {
    if (Math.abs(g.cs - cs) < Math.abs(best.cs - cs)) best = g;
  }
  return best;
}

// --- Permissible radial clearance S / extrusion gap (Trelleborg Table XII), mm.
// Rows: pressure (MPa) → S per cross-section band, for 70 and 90 Shore A.
// Table valid for elastomers except PU and FEP-encapsulated rings. For pressures
// above 5 MPa (d1 > 50) / 10 MPa (d1 < 50) back-up rings are recommended.
interface ExtrusionRow {
  pressureMPa: number;
  // clearance by cross-section band: [≤2, 2–3, 3–5, 5–7, >7] mm
  clearanceByBand: [number, number, number, number, number];
}

const EXTRUSION_70_SHORE: ExtrusionRow[] = [
  { pressureMPa: 3.5, clearanceByBand: [0.08, 0.09, 0.1, 0.13, 0.15] },
  { pressureMPa: 7.0, clearanceByBand: [0.05, 0.07, 0.08, 0.09, 0.1] },
  { pressureMPa: 10.5, clearanceByBand: [0.03, 0.04, 0.05, 0.07, 0.08] },
];

const EXTRUSION_90_SHORE: ExtrusionRow[] = [
  { pressureMPa: 3.5, clearanceByBand: [0.13, 0.15, 0.2, 0.23, 0.25] },
  { pressureMPa: 7.0, clearanceByBand: [0.1, 0.13, 0.15, 0.18, 0.2] },
  { pressureMPa: 10.5, clearanceByBand: [0.07, 0.09, 0.1, 0.13, 0.15] },
  { pressureMPa: 14.0, clearanceByBand: [0.05, 0.07, 0.08, 0.09, 0.1] },
  { pressureMPa: 17.5, clearanceByBand: [0.04, 0.05, 0.07, 0.08, 0.09] },
  { pressureMPa: 21.0, clearanceByBand: [0.03, 0.04, 0.05, 0.07, 0.08] },
  { pressureMPa: 35.0, clearanceByBand: [0.02, 0.03, 0.03, 0.04, 0.04] },
];

function bandIndex(cs: number): number {
  if (cs <= 2) return 0;
  if (cs <= 3) return 1;
  if (cs <= 5) return 2;
  if (cs <= 7) return 3;
  return 4;
}

/** Max permissible radial clearance S (mm) for the given cross-section, system
 *  pressure, and hardness (70 or 90 Shore A per the guide's table — intermediate
 *  hardness values use the nearer table). Returns null when the pressure exceeds
 *  the table (back-up rings / harder compound territory). */
export function maxPermissibleRadialClearanceMm(cs: number, pressureMPa: number, shoreA: number): number | null {
  const table = shoreA >= 80 ? EXTRUSION_90_SHORE : EXTRUSION_70_SHORE;
  const idx = bandIndex(cs);
  for (const row of table) {
    if (pressureMPa <= row.pressureMPa) return row.clearanceByBand[idx];
  }
  return null;
}

// --- Elastomer material presets (temperature ranges/notes per the Trelleborg
// guide's elastomer descriptions; FVMQ and AU/EU values are typical published
// figures as the 2007 guide does not tabulate them).
export interface ORingMaterial {
  id: string;
  name: string;
  fullName: string;
  tempMinC: number;
  tempMaxC: number;
  tempMaxShortC: number; // short-period peak
  shoreA: number; // typical standard compound hardness
  dynamicSuitable: boolean;
  goodFor: string;
  avoid: string;
  notes: string;
}

export const ORING_MATERIALS: ORingMaterial[] = [
  {
    id: 'nbr', name: 'NBR', fullName: 'Nitrile Butadiene Rubber', tempMinC: -30, tempMaxC: 100, tempMaxShortC: 120, shoreA: 70, dynamicSuitable: true,
    goodFor: 'Mineral oils and greases, hydraulic fluids (HL/HLP), water up to ~70°C, aliphatic hydrocarbons (fuel, diesel)',
    avoid: 'Ozone/weathering/UV, aromatic and chlorinated hydrocarbons, brake fluid (glycol), ketones, strong acids',
    notes: 'The general-purpose default. Special low-temperature compounds reach −60°C.',
  },
  {
    id: 'hnbr', name: 'HNBR', fullName: 'Hydrogenated Nitrile Butadiene Rubber', tempMinC: -30, tempMaxC: 140, tempMaxShortC: 160, shoreA: 70, dynamicSuitable: true,
    goodFor: 'Mineral oils and greases at higher temperature than NBR, ozone/weathering, abrasion, sour gas (H₂S) service',
    avoid: 'Aromatic/chlorinated hydrocarbons, ketones, esters, strong acids',
    notes: 'NBR upgraded by hydrogenation — better heat, ozone and wear resistance. Special types to −40°C.',
  },
  {
    id: 'fkm', name: 'FKM', fullName: 'Fluorocarbon Rubber (e.g. Viton®)', tempMinC: -20, tempMaxC: 200, tempMaxShortC: 230, shoreA: 75, dynamicSuitable: true,
    goodFor: 'Mineral oils/greases at high temperature, fuels, aromatic and chlorinated hydrocarbons, ozone/weathering, vacuum, non-flammability',
    avoid: 'Hot water/steam, glycol brake fluids, ketones, amines, low-molecular organic acids; stiffens at low temperature',
    notes: 'The high-temperature/chemical workhorse. Special low-temperature FKM reaches −35°C.',
  },
  {
    id: 'epdm', name: 'EPDM', fullName: 'Ethylene Propylene Diene Rubber', tempMinC: -45, tempMaxC: 150, tempMaxShortC: 175, shoreA: 70, dynamicSuitable: true,
    goodFor: 'Hot water and steam, glycol-based brake fluids, ozone/weathering, polar solvents (ketones, alcohols), acids/alkalis',
    avoid: 'Mineral oils and greases (swells severely), fuels — never use with petroleum products',
    notes: 'Peroxide-cured grades reach the full temperature range; sulphur-cured limited to +120°C.',
  },
  {
    id: 'vmq', name: 'VMQ', fullName: 'Silicone Rubber', tempMinC: -60, tempMaxC: 200, tempMaxShortC: 230, shoreA: 70, dynamicSuitable: false,
    goodFor: 'Extreme temperature range, dry heat, food/medical (FDA grades), dielectric applications, ozone/weathering',
    avoid: 'Dynamic/sliding duty (poor tear and abrasion resistance), fuels, mineral oils at high temperature, steam above 120°C, concentrated acids',
    notes: 'Static seals only. Special compounds reach −90°C.',
  },
  {
    id: 'fvmq', name: 'FVMQ', fullName: 'Fluorosilicone Rubber', tempMinC: -55, tempMaxC: 175, tempMaxShortC: 200, shoreA: 70, dynamicSuitable: false,
    goodFor: 'Fuels and mineral oils across a very wide temperature range (aerospace fuel systems), ozone/weathering',
    avoid: 'Dynamic/sliding duty, hot water/steam, brake fluids, ketones. Typical published range — not tabulated in the 2007 Trelleborg guide',
    notes: 'Combines silicone low-temperature behaviour with fuel resistance. Static use preferred.',
  },
  {
    id: 'cr', name: 'CR', fullName: 'Chloroprene Rubber (Neoprene®)', tempMinC: -40, tempMaxC: 100, tempMaxShortC: 120, shoreA: 70, dynamicSuitable: true,
    goodFor: 'Refrigerants (ammonia, freons), weathering/ozone, moderate oil resistance, flame resistance',
    avoid: 'Aromatic hydrocarbons, ketones, esters, strong oxidising acids',
    notes: 'The refrigeration-industry standard. Special types to −55°C.',
  },
  {
    id: 'ffkm', name: 'FFKM', fullName: 'Perfluoroelastomer (e.g. Isolast®)', tempMinC: -25, tempMaxC: 240, tempMaxShortC: 325, shoreA: 75, dynamicSuitable: false,
    goodFor: 'Near-universal chemical resistance (similar to PTFE), extreme heat, aggressive process media, semiconductor/pharma',
    avoid: 'Cost-sensitive applications; limited low-temperature capability; note the standard groove tables do not apply to Isolast® — consult the manufacturer',
    notes: 'Highest performance and cost. Special types to +325°C.',
  },
  {
    id: 'au', name: 'AU/EU', fullName: 'Polyurethane', tempMinC: -30, tempMaxC: 80, tempMaxShortC: 100, shoreA: 90, dynamicSuitable: true,
    goodFor: 'High wear and extrusion resistance (high-pressure hydraulics), mineral oils, high mechanical strength',
    avoid: 'Hot water/steam/humidity (hydrolysis), acids/alkalis, ketones; note the guide\'s extrusion-gap table excludes PU. Typical published range',
    notes: 'Chosen for mechanical toughness rather than temperature/chemical range.',
  },
];

export function getORingMaterial(id: string): ORingMaterial {
  return ORING_MATERIALS.find((m) => m.id === id) ?? ORING_MATERIALS[0];
}

// --- Stretch / circumferential compression limits (guide section B.2.3) ---
export function maxInstalledStretchPercent(d1Mm: number): number {
  return d1Mm < 50 ? 8 : 6;
}
export const MAX_CIRCUMFERENTIAL_COMPRESSION_PERCENT = 3;

// Gland fill guidance (standard industry practice; see file header note).
export const MAX_GLAND_FILL_PERCENT = 85; // absolute worst-case ceiling
export const RECOMMENDED_GLAND_FILL_PERCENT = 75; // nominal design target ceiling

// Non-circular groove path: minimum corner (bend) radius guidance, as a multiple
// of cross-section d2. Common industry guidance (not from the 2007 guide).
export const CORNER_RADIUS_RECOMMENDED_RATIO = 3; // r ≥ 3·d2 recommended
export const CORNER_RADIUS_MINIMUM_RATIO = 2; // r < 2·d2 flagged as a failure
