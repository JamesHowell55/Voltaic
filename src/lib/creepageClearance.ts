// Data sourced from IEC 60664-1 (Insulation coordination for equipment within
// low-voltage supply systems) and IEC 60335-1:2001+A1:2004 Tables 16-18, which
// reproduce the IEC 60664-1 creepage/clearance methodology (material group CTI
// bands per IEC 60664-1 subclause 2.7.1.3). See the in-app reference notes.

export type OvervoltageCategory = 'I' | 'II' | 'III' | 'IV';
export type PollutionDegree = 1 | 2 | 3 | 4;
export type MaterialGroup = 'I' | 'II' | 'IIIa' | 'IIIb';
export type InsulationType = 'functional' | 'basicOrSupplementary' | 'reinforced';

export const MATERIAL_GROUP_CTI: Record<MaterialGroup, { min: number; max: number | null; label: string }> = {
  I: { min: 600, max: null, label: 'Group I (CTI ≥ 600)' },
  II: { min: 400, max: 600, label: 'Group II (400 ≤ CTI < 600)' },
  IIIa: { min: 175, max: 400, label: 'Group IIIa (175 ≤ CTI < 400)' },
  IIIb: { min: 100, max: 175, label: 'Group IIIb (100 ≤ CTI < 175)' },
};

export function materialGroupFromCti(cti: number): MaterialGroup {
  if (cti >= 600) return 'I';
  if (cti >= 400) return 'II';
  if (cti >= 175) return 'IIIa';
  return 'IIIb';
}

/** IEC 60664-1 Table F.1 — rated impulse withstand voltage (V) for equipment
 *  energised directly from the mains, vs nominal mains voltage and overvoltage category. */
export const IMPULSE_VOLTAGE_TABLE: { un: number; I: number; II: number; III: number; IV: number }[] = [
  { un: 50, I: 330, II: 500, III: 800, IV: 1500 },
  { un: 100, I: 500, II: 800, III: 1500, IV: 2500 },
  { un: 150, I: 800, II: 1500, III: 2500, IV: 4000 },
  { un: 300, I: 1500, II: 2500, III: 4000, IV: 6000 },
  { un: 600, I: 2500, II: 4000, III: 6000, IV: 8000 },
  { un: 1250, I: 4000, II: 6000, III: 8000, IV: 12000 },
  { un: 1500, I: 6000, II: 8000, III: 10000, IV: 15000 },
];

export type FieldCondition = 'A' | 'B';

/** IEC 60664-1 Table F.2 — minimum clearance (mm) vs required impulse
 *  withstand voltage (kV), at the 2000 m reference altitude. Verified against
 *  the full text of IEC 60664-1:2007 (the normative Table F.2, not the
 *  informative Annex A experimental data it's derived from).
 *
 *  Case A (inhomogeneous field) can always be used, for any electrode shape/
 *  arrangement, without a voltage-withstand test — it's the standard's
 *  no-questions-asked default (clause 5.1.3.2).
 *  Case B (homogeneous field) permits smaller clearances, but ONLY applies
 *  where the geometry is specifically designed to give an essentially
 *  constant voltage gradient (e.g. parallel plates) — clause 5.1.3.3 requires
 *  it to be verified by an actual voltage-withstand test, not just assumed. */
export const CLEARANCE_TABLE_CASE_A: { kV: number; mm: number }[] = [
  { kV: 0.33, mm: 0.01 },
  { kV: 0.4, mm: 0.02 },
  { kV: 0.5, mm: 0.04 },
  { kV: 0.6, mm: 0.06 },
  { kV: 0.8, mm: 0.10 },
  { kV: 1.0, mm: 0.15 },
  { kV: 1.2, mm: 0.25 },
  { kV: 1.5, mm: 0.5 },
  { kV: 2.0, mm: 1.0 },
  { kV: 2.5, mm: 1.5 },
  { kV: 3.0, mm: 2.0 },
  { kV: 4.0, mm: 3.0 },
  { kV: 5.0, mm: 4.0 },
  { kV: 6.0, mm: 5.5 },
  { kV: 8.0, mm: 8.0 },
  { kV: 10.0, mm: 11.0 },
  { kV: 12.0, mm: 14.0 },
  { kV: 15.0, mm: 18.0 },
  { kV: 20.0, mm: 25.0 },
  { kV: 25.0, mm: 33.0 },
  { kV: 30.0, mm: 40.0 },
  { kV: 40.0, mm: 60.0 },
  { kV: 50.0, mm: 75.0 },
  { kV: 60.0, mm: 90.0 },
  { kV: 80.0, mm: 130.0 },
  { kV: 100.0, mm: 170.0 },
];

export const CLEARANCE_TABLE_CASE_B: { kV: number; mm: number }[] = [
  { kV: 0.33, mm: 0.01 },
  { kV: 0.4, mm: 0.02 },
  { kV: 0.5, mm: 0.04 },
  { kV: 0.6, mm: 0.06 },
  { kV: 0.8, mm: 0.10 },
  { kV: 1.0, mm: 0.15 },
  { kV: 1.2, mm: 0.2 },
  { kV: 1.5, mm: 0.3 },
  { kV: 2.0, mm: 0.45 },
  { kV: 2.5, mm: 0.6 },
  { kV: 3.0, mm: 0.8 },
  { kV: 4.0, mm: 1.2 },
  { kV: 5.0, mm: 1.5 },
  { kV: 6.0, mm: 2.0 },
  { kV: 8.0, mm: 3.0 },
  { kV: 10.0, mm: 3.5 },
  { kV: 12.0, mm: 4.5 },
  { kV: 15.0, mm: 5.5 },
  { kV: 20.0, mm: 8.0 },
  { kV: 25.0, mm: 10.0 },
  { kV: 30.0, mm: 12.5 },
  { kV: 40.0, mm: 17.0 },
  { kV: 50.0, mm: 22.0 },
  { kV: 60.0, mm: 27.0 },
  { kV: 80.0, mm: 35.0 },
  { kV: 100.0, mm: 45.0 },
];

/** IEC 60664-1 Table F.10 (Edition 3) / Table A.2 (Edition 2) — altitude
 *  correction (multiplication) factors for clearance. Cross-checked against
 *  standard-atmosphere barometric pressure at each altitude. Below 2000 m no
 *  correction applies (that is the standard's native reference condition). */
export const ALTITUDE_CORRECTION_TABLE: { m: number; factor: number }[] = [
  { m: 2000, factor: 1.00 },
  { m: 3000, factor: 1.14 },
  { m: 4000, factor: 1.29 },
  { m: 5000, factor: 1.48 },
  { m: 6000, factor: 1.70 },
  { m: 7000, factor: 1.95 },
  { m: 8000, factor: 2.25 },
  { m: 9000, factor: 2.62 },
  { m: 10000, factor: 3.02 },
  { m: 15000, factor: 6.67 },
  { m: 20000, factor: 14.5 },
];

interface CreepageRow {
  maxV: number;
  pd1: number;
  pd2: { I: number; II: number; IIIab: number };
  pd3: { I: number; II: number; IIIab: number };
}

/** IEC 60335-1 Table 17 — creepage for basic/supplementary insulation. This
 *  table explicitly cross-references IEC 60664-1's CTI/pollution-degree
 *  methodology (subclause 2.7.1.3) and is used here as the general-purpose
 *  table for all insulation types except where the appliance-specific
 *  functional-insulation allowance below is deliberately opted into. */
export const CREEPAGE_TABLE_BASIC: CreepageRow[] = [
  { maxV: 50, pd1: 0.2, pd2: { I: 0.6, II: 0.9, IIIab: 1.2 }, pd3: { I: 1.5, II: 1.7, IIIab: 1.9 } },
  { maxV: 125, pd1: 0.3, pd2: { I: 0.8, II: 1.1, IIIab: 1.5 }, pd3: { I: 1.9, II: 2.1, IIIab: 2.4 } },
  { maxV: 250, pd1: 0.6, pd2: { I: 1.3, II: 1.8, IIIab: 2.5 }, pd3: { I: 3.2, II: 3.6, IIIab: 4.0 } },
  { maxV: 400, pd1: 1.0, pd2: { I: 2.0, II: 2.8, IIIab: 4.0 }, pd3: { I: 5.0, II: 5.6, IIIab: 6.3 } },
  { maxV: 500, pd1: 1.3, pd2: { I: 2.5, II: 3.6, IIIab: 5.0 }, pd3: { I: 6.3, II: 7.1, IIIab: 8.0 } },
  { maxV: 800, pd1: 1.8, pd2: { I: 3.2, II: 4.5, IIIab: 6.3 }, pd3: { I: 8.0, II: 9.0, IIIab: 10.0 } },
  { maxV: 1000, pd1: 2.4, pd2: { I: 4.0, II: 5.6, IIIab: 8.0 }, pd3: { I: 10.0, II: 11.0, IIIab: 12.5 } },
  { maxV: 1250, pd1: 3.2, pd2: { I: 5.0, II: 7.1, IIIab: 10.0 }, pd3: { I: 12.5, II: 14.0, IIIab: 16.0 } },
  { maxV: 1600, pd1: 4.2, pd2: { I: 6.3, II: 9.0, IIIab: 12.5 }, pd3: { I: 16.0, II: 18.0, IIIab: 20.0 } },
  { maxV: 2000, pd1: 5.6, pd2: { I: 8.0, II: 11.0, IIIab: 16.0 }, pd3: { I: 20.0, II: 22.0, IIIab: 25.0 } },
  { maxV: 2500, pd1: 7.5, pd2: { I: 10.0, II: 14.0, IIIab: 20.0 }, pd3: { I: 25.0, II: 28.0, IIIab: 32.0 } },
  { maxV: 3200, pd1: 10.0, pd2: { I: 12.5, II: 18.0, IIIab: 25.0 }, pd3: { I: 32.0, II: 36.0, IIIab: 40.0 } },
  { maxV: 4000, pd1: 12.5, pd2: { I: 16.0, II: 22.0, IIIab: 32.0 }, pd3: { I: 40.0, II: 45.0, IIIab: 50.0 } },
  { maxV: 5000, pd1: 16.0, pd2: { I: 20.0, II: 28.0, IIIab: 40.0 }, pd3: { I: 50.0, II: 56.0, IIIab: 63.0 } },
  { maxV: 6300, pd1: 20.0, pd2: { I: 25.0, II: 36.0, IIIab: 50.0 }, pd3: { I: 63.0, II: 71.0, IIIab: 80.0 } },
  { maxV: 8000, pd1: 25.0, pd2: { I: 32.0, II: 45.0, IIIab: 63.0 }, pd3: { I: 80.0, II: 90.0, IIIab: 100.0 } },
  { maxV: 10000, pd1: 32.0, pd2: { I: 40.0, II: 56.0, IIIab: 80.0 }, pd3: { I: 100.0, II: 110.0, IIIab: 125.0 } },
  { maxV: 12500, pd1: 40.0, pd2: { I: 50.0, II: 71.0, IIIab: 100.0 }, pd3: { I: 125.0, II: 140.0, IIIab: 160.0 } },
];

/** IEC 60335-1 Table 18 — a household-appliance-specific relaxation permitting
 *  smaller creepage for functional insulation at lower voltages (converging
 *  with Table 17 from 800 V up). This is NOT confirmed to be IEC 60664-1's own
 *  general position — IEC 60664-1's own Annex F lists a single Table F.5, and
 *  its clause 5.3.4 (functional) vs 5.3.5 (basic/supplementary/reinforced)
 *  split could not be confirmed from open sources to use different numeric
 *  values rather than just a different voltage basis. Only apply this outside
 *  an appliance context if your specific product standard permits it. */
export const CREEPAGE_TABLE_APPLIANCE_FUNCTIONAL_ALLOWANCE: CreepageRow[] = [
  { maxV: 50, pd1: 0.2, pd2: { I: 0.6, II: 0.8, IIIab: 1.1 }, pd3: { I: 1.4, II: 1.6, IIIab: 1.8 } },
  { maxV: 125, pd1: 0.3, pd2: { I: 0.7, II: 1.0, IIIab: 1.4 }, pd3: { I: 1.8, II: 2.0, IIIab: 2.2 } },
  { maxV: 250, pd1: 0.4, pd2: { I: 1.0, II: 1.4, IIIab: 2.0 }, pd3: { I: 2.5, II: 2.8, IIIab: 3.2 } },
  { maxV: 400, pd1: 0.8, pd2: { I: 1.6, II: 2.2, IIIab: 3.2 }, pd3: { I: 4.0, II: 4.5, IIIab: 5.0 } },
  { maxV: 500, pd1: 1.0, pd2: { I: 2.0, II: 2.8, IIIab: 4.0 }, pd3: { I: 5.0, II: 5.6, IIIab: 6.3 } },
  { maxV: 800, pd1: 1.8, pd2: { I: 3.2, II: 4.5, IIIab: 6.3 }, pd3: { I: 8.0, II: 9.0, IIIab: 10.0 } },
  { maxV: 1000, pd1: 2.4, pd2: { I: 4.0, II: 5.6, IIIab: 8.0 }, pd3: { I: 10.0, II: 11.0, IIIab: 12.5 } },
  { maxV: 1250, pd1: 3.2, pd2: { I: 5.0, II: 7.1, IIIab: 10.0 }, pd3: { I: 12.5, II: 14.0, IIIab: 16.0 } },
  { maxV: 1600, pd1: 4.2, pd2: { I: 6.3, II: 9.0, IIIab: 12.5 }, pd3: { I: 16.0, II: 18.0, IIIab: 20.0 } },
  { maxV: 2000, pd1: 5.6, pd2: { I: 8.0, II: 11.0, IIIab: 16.0 }, pd3: { I: 20.0, II: 22.0, IIIab: 25.0 } },
  { maxV: 2500, pd1: 7.5, pd2: { I: 10.0, II: 14.0, IIIab: 20.0 }, pd3: { I: 25.0, II: 28.0, IIIab: 32.0 } },
  { maxV: 3200, pd1: 10.0, pd2: { I: 12.5, II: 18.0, IIIab: 25.0 }, pd3: { I: 32.0, II: 36.0, IIIab: 40.0 } },
  { maxV: 4000, pd1: 12.5, pd2: { I: 16.0, II: 22.0, IIIab: 32.0 }, pd3: { I: 40.0, II: 45.0, IIIab: 50.0 } },
  { maxV: 5000, pd1: 16.0, pd2: { I: 20.0, II: 28.0, IIIab: 40.0 }, pd3: { I: 50.0, II: 56.0, IIIab: 63.0 } },
  { maxV: 6300, pd1: 20.0, pd2: { I: 25.0, II: 36.0, IIIab: 50.0 }, pd3: { I: 63.0, II: 71.0, IIIab: 80.0 } },
  { maxV: 8000, pd1: 25.0, pd2: { I: 32.0, II: 45.0, IIIab: 63.0 }, pd3: { I: 80.0, II: 90.0, IIIab: 100.0 } },
  { maxV: 10000, pd1: 32.0, pd2: { I: 40.0, II: 56.0, IIIab: 80.0 }, pd3: { I: 100.0, II: 110.0, IIIab: 125.0 } },
  { maxV: 12500, pd1: 40.0, pd2: { I: 50.0, II: 71.0, IIIab: 100.0 }, pd3: { I: 125.0, II: 140.0, IIIab: 160.0 } },
];

/** Power-law (log-log / "ratio-preserving") interpolation and extrapolation.
 *  Finds the bracketing table pair, derives the local scaling exponent
 *  implied by their ratio (b = ln(y1/y0)/ln(x1/x0)), and applies
 *  y = y0*(x/x0)^b. For x outside the table, the same exponent from the
 *  nearest edge pair is extended outward. This preserves the ratio-based
 *  scaling between table entries rather than distorting it the way linear
 *  interpolation would — appropriate since these withstand-voltage tables
 *  approximate a power-law relationship, not a straight line. */
function powerLawInterpolate(points: { x: number; y: number }[], x: number): { y: number; extrapolated: boolean } {
  let i0: number;
  let i1: number;
  let extrapolated: boolean;
  if (x <= points[0].x) {
    i0 = 0; i1 = 1;
    extrapolated = x < points[0].x;
  } else if (x >= points[points.length - 1].x) {
    i0 = points.length - 2; i1 = points.length - 1;
    extrapolated = x > points[points.length - 1].x;
  } else {
    i0 = 0; i1 = 1; extrapolated = false;
    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) { i0 = i; i1 = i + 1; break; }
    }
  }
  const { x: x0, y: y0 } = points[i0];
  const { x: x1, y: y1 } = points[i1];
  const b = Math.log(y1 / y0) / Math.log(x1 / x0);
  const y = y0 * Math.pow(x / x0, b);
  return { y, extrapolated };
}

/** Piecewise-linear interpolation (used for the altitude correction table,
 *  whose x-axis is altitude rather than voltage). */
function linearInterpolate(points: { x: number; y: number }[], x: number): { y: number; extrapolated: boolean } {
  if (x <= points[0].x) return { y: points[0].y, extrapolated: x < points[0].x };
  const last = points[points.length - 1];
  if (x >= last.x) {
    const prev = points[points.length - 2];
    const slope = (last.y - prev.y) / (last.x - prev.x);
    return { y: last.y + slope * (x - last.x), extrapolated: x > last.x };
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return { y: a.y + t * (b.y - a.y), extrapolated: false };
    }
  }
  return { y: last.y, extrapolated: true };
}

/** Rated impulse withstand voltage for an arbitrary Un, found by power-law
 *  interpolation/extrapolation across IEC 60664-1 Table F.1's preferred values. */
export function getRatedImpulseVoltage(un: number, category: OvervoltageCategory): { v: number; extrapolated: boolean } {
  const points = IMPULSE_VOLTAGE_TABLE.map(r => ({ x: r.un, y: r[category] }));
  const { y, extrapolated } = powerLawInterpolate(points, un);
  return { v: y, extrapolated };
}

export function getAltitudeCorrectionFactor(altitudeM: number): { factor: number; extrapolated: boolean } {
  if (altitudeM <= 2000) return { factor: 1.0, extrapolated: false };
  const { y, extrapolated } = linearInterpolate(ALTITUDE_CORRECTION_TABLE.map(r => ({ x: r.m, y: r.factor })), altitudeM);
  return { factor: y, extrapolated };
}

export function getClearance(requiredVoltageKV: number, fieldCondition: FieldCondition = 'A'): { mm: number; extrapolated: boolean } {
  const table = fieldCondition === 'B' ? CLEARANCE_TABLE_CASE_B : CLEARANCE_TABLE_CASE_A;
  const { y, extrapolated } = powerLawInterpolate(table.map(r => ({ x: r.kV, y: r.mm })), requiredVoltageKV);
  return { mm: y, extrapolated };
}

export function getCreepage(workingVoltageV: number, pollutionDegree: 1 | 2 | 3, materialGroup: MaterialGroup, insulationType: InsulationType, useApplianceFunctionalAllowance = false): { mm: number; rowMaxV: number } {
  const table = insulationType === 'functional' && useApplianceFunctionalAllowance
    ? CREEPAGE_TABLE_APPLIANCE_FUNCTIONAL_ALLOWANCE
    : CREEPAGE_TABLE_BASIC;
  const row = table.find(r => workingVoltageV <= r.maxV) ?? table[table.length - 1];
  let mm: number;
  if (pollutionDegree === 1) mm = row.pd1;
  else {
    const group = materialGroup === 'I' ? 'I' : materialGroup === 'II' ? 'II' : 'IIIab';
    mm = pollutionDegree === 2 ? row.pd2[group] : row.pd3[group];
  }
  if (insulationType === 'reinforced') mm *= 2;
  return { mm, rowMaxV: row.maxV };
}
