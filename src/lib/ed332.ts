// Numeric data derived from EUROCAE ED-332 "Guidance on Characteristics of
// Aircraft Propulsive High Voltage DC Electrical Systems" (22 January 2025),
// Chapter 2 — read from a licensed copy, values only (no clause text
// reproduced verbatim). Covers only the subset relevant to creepage/clearance
// sizing: steady-state and abnormal-transient voltage envelopes, the
// abnormal common-mode condition, and the two insulation requirements
// (REQ[0030]/REQ[0031]) that a creepage/clearance design should be checked
// against alongside the standard IEC 60664-1 methodology.

export type Ed332NetworkType = 'UR' | 'R';

export const ED332_NETWORK_LABELS: Record<Ed332NetworkType, string> = {
  UR: 'Unregulated (UR)',
  R: 'Regulated (R)',
};

/** Table 2-1 — differential-mode steady-state voltage range at the Point of
 *  Injection, for an 800 VDC-class propulsive network (the document's own
 *  reference case; other voltage classes would need re-derived numbers). */
export const ED332_STEADY_STATE_V: Record<Ed332NetworkType, { minV: number; maxV: number }> = {
  UR: { minV: 550, maxV: 850 },
  R: { minV: 700, maxV: 850 },
};

/** Table 2-2 — differential-mode voltage transient test conditions. Condition
 *  1 (1 s duration) has the highest V_end for both network types and is the
 *  worst-case abnormal transient peak used below. */
export interface Ed332TransientCondition {
  label: string;
  durationS: number;
  vInit: Record<Ed332NetworkType, number>;
  vEnd: Record<Ed332NetworkType, number>;
}
export const ED332_TRANSIENTS: Ed332TransientCondition[] = [
  { label: 'Condition 1', durationS: 1, vInit: { UR: 550, R: 700 }, vEnd: { UR: 1150, R: 1150 } },
  { label: 'Condition 2', durationS: 0.1, vInit: { UR: 500, R: 550 }, vEnd: { UR: 1000, R: 1000 } },
  { label: 'Condition 3', durationS: 30, vInit: { UR: 550, R: 700 }, vEnd: { UR: 850, R: 850 } },
];

export function ed332MaxAbnormalTransientV(networkType: Ed332NetworkType): number {
  return Math.max(...ED332_TRANSIENTS.map(t => t.vEnd[networkType]));
}

/** REQ[009] — in abnormal operation the standard's own worked example (VDM =
 *  800 V) shows a terminal-to-ground voltage of 0-800 V, i.e. the full
 *  differential voltage can appear on a single terminal to ground. The "50%"
 *  figure quoted alongside it is the steady-state AVERAGE common-mode metric
 *  (VCM = (VPG+VNG)/2), which is exactly half of VDM whenever one terminal
 *  carries the full voltage and the other sits at 0 — not a smaller bound on
 *  the physical terminal-to-ground voltage itself. */
export const ED332_ABNORMAL_COMMON_MODE_FRACTION = 1.0;

/** REQ[0030] — Dielectric Withstanding Voltage at sea level, HVDC terminals
 *  to casing and to non-HVDC circuits. This is a sustained DC Hi-Pot test
 *  voltage, not an IEC 60664-1 "rated impulse withstand voltage" (which is
 *  calibrated to a 1.2/50 µs impulse) — shown here as a reference cross-check
 *  value, not fed into the Table F.2 clearance lookup. */
export const ED332_DIELECTRIC_WITHSTAND_V = 3400;

/** REQ[0031] — insulation resistance, tested at 1200 VDC. */
export const ED332_INSULATION_TEST_V = 1200;
export const ED332_INSULATION_MIN_MOHM: Record<'A' | 'B', number> = { A: 10, B: 100 };
