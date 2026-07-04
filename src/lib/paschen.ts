// Paschen's Law — first-principles cross-check for the altitude effect on
// clearance (air-gap dielectric breakdown), supplementing the empirical
// IEC 60664-1 altitude-correction table with the underlying physics.
//
// V_b = B·(p·d) / [ln(A·(p·d)) − ln(ln(1 + 1/γ))]
//
// Constants for air (standard textbook values): A ≈ 113 /(kPa·cm),
// B ≈ 2740 V/(kPa·cm), secondary-electron-emission coefficient γ ≈ 0.01
// (typical for a metal cathode in air). p in kPa, d (gap) in cm.

export const PASCHEN_A = 113; // 1/(kPa·cm)
export const PASCHEN_B = 2740; // V/(kPa·cm)
export const PASCHEN_GAMMA = 0.01;

/** Standard-atmosphere pressure (kPa) vs altitude (m), extending the same
 *  data used for the IEC altitude-correction table down to sea level. */
export const PRESSURE_TABLE: { m: number; kPa: number }[] = [
  { m: 0, kPa: 101.325 },
  { m: 1000, kPa: 89.88 },
  { m: 2000, kPa: 80.0 },
  { m: 3000, kPa: 70.0 },
  { m: 4000, kPa: 62.0 },
  { m: 5000, kPa: 54.0 },
  { m: 6000, kPa: 47.0 },
  { m: 7000, kPa: 41.0 },
  { m: 8000, kPa: 35.5 },
  { m: 9000, kPa: 30.5 },
  { m: 10000, kPa: 26.5 },
  { m: 15000, kPa: 12.0 },
  { m: 20000, kPa: 5.5 },
];

/** Pressure falls off roughly exponentially with altitude, so interpolate
 *  linearly in ln(pressure) vs altitude (the standard barometric approximation). */
export function pressureAtAltitude(altitudeM: number): number {
  const pts = PRESSURE_TABLE;
  if (altitudeM <= pts[0].m) return pts[0].kPa;
  const last = pts[pts.length - 1];
  if (altitudeM >= last.m) {
    const prev = pts[pts.length - 2];
    const slope = (Math.log(last.kPa) - Math.log(prev.kPa)) / (last.m - prev.m);
    return Math.exp(Math.log(last.kPa) + slope * (altitudeM - last.m));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (altitudeM >= a.m && altitudeM <= b.m) {
      const t = (altitudeM - a.m) / (b.m - a.m);
      return Math.exp(Math.log(a.kPa) + t * (Math.log(b.kPa) - Math.log(a.kPa)));
    }
  }
  return last.kPa;
}

/** Paschen breakdown voltage (V) for a gap `dCm` (cm) at pressure `pKPa` (kPa). */
export function breakdownVoltage(pKPa: number, dCm: number, gamma = PASCHEN_GAMMA): number {
  const pd = pKPa * dCm;
  const c = Math.log(Math.log(1 + 1 / gamma));
  return (PASCHEN_B * pd) / (Math.log(PASCHEN_A * pd) - c);
}

/** Location of the Paschen minimum: pd (kPa·cm) where dV/d(pd) = 0, found
 *  analytically from the breakdown-voltage formula. */
export function paschenMinimum(gamma = PASCHEN_GAMMA): { pd: number; vMin: number } {
  const c = Math.log(Math.log(1 + 1 / gamma));
  const pd = Math.exp(c + 1) / PASCHEN_A;
  const vMin = breakdownVoltage(1, pd, gamma); // pKPa=1 so the product equals pd directly
  return { pd, vMin };
}

/** Solve for the minimum gap (cm) at pressure `pKPa` that withstands `targetV`,
 *  by bisection (V_b(pd) is monotonic increasing above the Paschen minimum,
 *  which is where all practical clearance gaps at these altitudes sit). */
export function minGapForVoltage(pKPa: number, targetV: number, gamma = PASCHEN_GAMMA): number {
  let lo = 1e-6;
  let hi = 100; // cm
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = breakdownVoltage(pKPa, mid, gamma);
    if (v < targetV) lo = mid; else hi = mid;
  }
  return hi;
}
