// Site-wide SI <-> Imperial display-unit toggle. Internal state and every
// physics engine always work in SI (mm, N, MPa, N*m, degC) — conversion happens
// only at the input/output boundary (what's typed into a field, what's shown in
// a result), so calculation code never needs to know which unit system the user
// is viewing. Distinct from unitConversions.ts, which backs the standalone
// Conversions Calculator's many-to-many unit picker — this is a simpler fixed-pair
// toggle for every other calculator's own inputs/outputs.

export type UnitSystem = 'SI' | 'imperial';

const MM_PER_IN = 25.4;
const MM2_PER_IN2 = MM_PER_IN * MM_PER_IN;
const M_PER_FT = 0.3048;
const N_PER_LBF = 4.4482216153;
const MPA_PER_KSI = 6.894757293168; // 1 ksi = 1000 psi = 6.894757 MPa
const GPA_PER_MPSI = MPA_PER_KSI; // 1 Mpsi = 1000 ksi -> same MPa/GPa numeric factor
const NM_PER_LBFIN = 0.1129848333;
const NPERMM_PER_LBFPERIN = MM_PER_IN / N_PER_LBF; // N/mm -> lbf/in

export const mmToIn = (mm: number): number => mm / MM_PER_IN;
export const inToMm = (inch: number): number => inch * MM_PER_IN;

export const mm2ToIn2 = (mm2: number): number => mm2 / MM2_PER_IN2;
export const in2ToMm2 = (in2: number): number => in2 * MM2_PER_IN2;

export const mToFt = (m: number): number => m / M_PER_FT;
export const ftToM = (ft: number): number => ft * M_PER_FT;

export const nToLbf = (n: number): number => n / N_PER_LBF;
export const lbfToN = (lbf: number): number => lbf * N_PER_LBF;

export const mpaToKsi = (mpa: number): number => mpa / MPA_PER_KSI;
export const ksiToMpa = (ksi: number): number => ksi * MPA_PER_KSI;

export const gpaToMpsi = (gpa: number): number => gpa / GPA_PER_MPSI;
export const mpsiToGpa = (mpsi: number): number => mpsi * GPA_PER_MPSI;

export const nmToLbfIn = (nm: number): number => nm / NM_PER_LBFIN;
export const lbfInToNm = (lbfIn: number): number => lbfIn * NM_PER_LBFIN;

export const nPerMmToLbfPerIn = (k: number): number => k * NPERMM_PER_LBFPERIN;
export const lbfPerInToNPerMm = (k: number): number => k / NPERMM_PER_LBFPERIN;

// Absolute temperature (has a zero-offset — NOT the same as a temperature delta).
export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;

// Temperature *differences* (deltaT) and thermal-expansion coefficients (CTE,
// 1/degC) scale only — no +32 offset, since these represent a step size, not an
// absolute point on the scale.
export const cDeltaToFDelta = (dC: number): number => (dC * 9) / 5;
export const fDeltaToCDelta = (dF: number): number => (dF * 5) / 9;
export const ctePerCToPerF = (cte: number): number => (cte * 5) / 9;
export const ctePerFToPerC = (cte: number): number => (cte * 9) / 5;

export interface UnitDef {
  siLabel: string;
  imperialLabel: string;
  toImperial: (si: number) => number;
  toSI: (imperial: number) => number;
}

export const UNIT_LENGTH: UnitDef = { siLabel: 'mm', imperialLabel: 'in', toImperial: mmToIn, toSI: inToMm };
export const UNIT_LENGTH_M: UnitDef = { siLabel: 'm', imperialLabel: 'ft', toImperial: mToFt, toSI: ftToM };
export const UNIT_AREA: UnitDef = { siLabel: 'mm²', imperialLabel: 'in²', toImperial: mm2ToIn2, toSI: in2ToMm2 };
export const UNIT_FORCE: UnitDef = { siLabel: 'N', imperialLabel: 'lbf', toImperial: nToLbf, toSI: lbfToN };
export const UNIT_STRESS: UnitDef = { siLabel: 'MPa', imperialLabel: 'ksi', toImperial: mpaToKsi, toSI: ksiToMpa };
export const UNIT_MODULUS: UnitDef = { siLabel: 'GPa', imperialLabel: 'Mpsi', toImperial: gpaToMpsi, toSI: mpsiToGpa };
export const UNIT_TORQUE: UnitDef = { siLabel: 'N·m', imperialLabel: 'lbf·in', toImperial: nmToLbfIn, toSI: lbfInToNm };
export const UNIT_STIFFNESS: UnitDef = { siLabel: 'N/mm', imperialLabel: 'lbf/in', toImperial: nPerMmToLbfPerIn, toSI: lbfPerInToNPerMm };
export const UNIT_TEMP: UnitDef = { siLabel: '°C', imperialLabel: '°F', toImperial: cToF, toSI: fToC };
export const UNIT_TEMP_DELTA: UnitDef = { siLabel: '°C', imperialLabel: '°F', toImperial: cDeltaToFDelta, toSI: fDeltaToCDelta };
export const UNIT_CTE: UnitDef = { siLabel: '×10⁻⁶/°C', imperialLabel: '×10⁻⁶/°F', toImperial: ctePerCToPerF, toSI: ctePerFToPerC };

// Rounds to N significant figures — used only for display (an editable input's
// controlled value, or a formatted result), never before converting back to SI,
// so it can't introduce drift in stored state.
function roundSig(value: number, sigFigs = 6): number {
  if (value === 0 || !isFinite(value)) return value;
  const magnitude = Math.ceil(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, sigFigs - magnitude);
  return Math.round(value * factor) / factor;
}

export function toDisplay(valueSI: number, unitSystem: UnitSystem, def: UnitDef): number {
  return unitSystem === 'imperial' ? roundSig(def.toImperial(valueSI)) : valueSI;
}

export function fromDisplay(displayValue: number, unitSystem: UnitSystem, def: UnitDef): number {
  return unitSystem === 'imperial' ? def.toSI(displayValue) : displayValue;
}

export function unitLabel(unitSystem: UnitSystem, def: UnitDef): string {
  return unitSystem === 'imperial' ? def.imperialLabel : def.siLabel;
}
