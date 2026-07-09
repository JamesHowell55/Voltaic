// Classical AC skin-depth physics: the depth beneath a conductor's surface at
// which current density has fallen to 1/e (~37%) of its surface value,
// δ = sqrt(ρ / (π·f·μ₀·μr)). This is a material-and-frequency property only —
// independent of the conductor's actual size or shape. It is a different
// (simpler, first-order) quantity from the IEC 60287-1-1 AC/DC resistance
// ratio (ks) already used by the Busbar Calculator, which accounts for the
// real conductor's finite geometry via a Bessel-function-derived empirical
// fit — see that tool for the precise resistance-ratio figure for a given
// busbar cross-section.

export interface SkinDepthMaterialPreset {
  id: string;
  name: string;
  rho20OhmMm2PerM: number; // Ω·mm²/m at 20°C (= Ω·m × 1e6) — the everyday cable/wire resistivity unit
  beta: number;            // °C, IEC 60865-style inferred absolute-zero-resistance offset, for ρ(θ) correction
  muR: number;              // relative permeability (dimensionless)
  sourced: boolean;
  notes: string;
}

export const SKIN_DEPTH_MATERIALS: SkinDepthMaterialPreset[] = [
  {
    id: 'copper', name: 'Copper (annealed, 100% IACS)',
    rho20OhmMm2PerM: 0.0172, beta: 234.5, muR: 1,
    sourced: true, notes: 'Matches this site\'s Busbar Calculator reference value. Non-magnetic.',
  },
  {
    id: 'aluminium', name: 'Aluminium (EC-grade)',
    rho20OhmMm2PerM: 0.0282, beta: 228, muR: 1,
    sourced: true, notes: 'Matches this site\'s Busbar Calculator reference value. Non-magnetic.',
  },
  {
    id: 'silver', name: 'Silver',
    rho20OhmMm2PerM: 0.0159, beta: 243, muR: 1,
    sourced: true, notes: 'Non-magnetic. The lowest-resistivity common conductor.',
  },
  {
    id: 'gold', name: 'Gold',
    rho20OhmMm2PerM: 0.0244, beta: 274, muR: 1,
    sourced: true, notes: 'Non-magnetic.',
  },
  {
    id: 'brass', name: 'Brass (CuZn, representative)',
    rho20OhmMm2PerM: 0.064, beta: 300, muR: 1,
    sourced: false, notes: 'Resistivity varies substantially with zinc content across common brass alloys (roughly 0.03-0.09 Ω·mm²/m) — verify against your specific alloy datasheet. Non-magnetic.',
  },
  {
    id: 'mild_steel', name: 'Mild/carbon steel (representative, magnetic)',
    rho20OhmMm2PerM: 0.143, beta: 180, muR: 300,
    sourced: false,
    notes: 'Both resistivity and especially relative permeability vary enormously with alloy, heat treatment, and field strength — μr is NOT a material constant for ferromagnetic materials (it falls toward 1 above the material\'s saturation flux density and is itself frequency-dependent). Treat this preset as an illustrative starting point only; source real B-H and resistivity data for your specific grade before relying on it.',
  },
  {
    id: 'stainless_304', name: 'Stainless steel 304 (austenitic, non-magnetic)',
    rho20OhmMm2PerM: 0.72, beta: 1330, muR: 1.02,
    sourced: false, notes: 'Representative annealed-304 values — austenitic stainless is essentially non-magnetic (μr close to 1), but resistivity and the small magnetic permeability both shift with cold work and exact alloy. Verify against your specific material certificate.',
  },
  {
    id: 'custom', name: 'Custom',
    rho20OhmMm2PerM: 0.0172, beta: 234.5, muR: 1,
    sourced: false, notes: 'Enter your own resistivity and relative permeability.',
  },
];

export function getSkinDepthMaterial(id: string): SkinDepthMaterialPreset {
  return SKIN_DEPTH_MATERIALS.find(m => m.id === id) ?? SKIN_DEPTH_MATERIALS[0];
}

/** ρ(θ) = ρ₂₀ · (β + θ) / (β + 20) — same convention as busbarPhysics.ts's resistivityAt. */
export function resistivityAtOhmMm2PerM(rho20OhmMm2PerM: number, beta: number, tempC: number): number {
  return rho20OhmMm2PerM * (beta + tempC) / (beta + 20);
}

export const MU0 = 4 * Math.PI * 1e-7; // H/m, permeability of free space

/** Classical skin depth in mm. rhoOhmMm2PerM is converted to Ω·m internally
 *  (÷1e6) before applying δ = sqrt(ρ / (π·f·μ₀·μr)). Returns Infinity at DC
 *  (f=0) — current fills the whole conductor, no skin effect. */
export function skinDepthMm(rhoOhmMm2PerM: number, frequencyHz: number, muR: number = 1): number {
  if (frequencyHz <= 0) return Infinity;
  const rhoOhmM = rhoOhmMm2PerM * 1e-6;
  const deltaM = Math.sqrt(rhoOhmM / (Math.PI * frequencyHz * MU0 * Math.max(muR, 1e-6)));
  return deltaM * 1000;
}

/** First-order estimate of the annular "effective" conduction area of a round
 *  conductor of radius r, given skin depth δ: A = π(r² - max(r-δ,0)²), capped
 *  at the full solid area once δ ≥ r (low-frequency limit, current fills the
 *  whole conductor). This is a simple illustrative geometric approximation,
 *  NOT the precise Bessel-function AC/DC resistance ratio (see the note at
 *  the top of this file) — it deliberately ignores proximity effects and the
 *  true current-density profile's smooth (not step-function) fall-off. */
export function effectiveAnnularAreaMm2(radiusMm: number, skinDepthMmValue: number): number {
  if (!isFinite(skinDepthMmValue) || skinDepthMmValue >= radiusMm) return Math.PI * radiusMm * radiusMm;
  const innerR = Math.max(radiusMm - skinDepthMmValue, 0);
  return Math.PI * (radiusMm * radiusMm - innerR * innerR);
}
