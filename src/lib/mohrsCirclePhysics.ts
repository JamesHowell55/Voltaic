// Plane-stress transformation and Mohr's circle for a 2-D stress state
// (σx, σy, τxy). Everything here is closed-form from the standard stress-
// transformation equations (Gere & Goodno, "Mechanics of Materials"; Hibbeler,
// "Mechanics of Materials", Ch. 9) — no iteration, so results are exact for the
// linear-elastic, small-strain assumptions of engineering stress analysis.
//
// Sign / angle conventions (documented so the diagram and the numbers agree):
//   • Normal stress: tension positive.
//   • Shear stress τxy: positive on the +x face acting in the +y direction
//     (right-hand convention).
//   • Rotation angle θ: a counter-clockwise rotation of the coordinate axes
//     (equivalently, of the material element) is positive. The transformed
//     face x' is the original x face rotated CCW by θ.
//   • Principal angle θp is measured CCW from the x-axis to the plane whose
//     normal carries σ1 (the algebraically largest principal stress); it is
//     returned in the range (−90°, +90°] from ½·atan2(2τxy, σx−σy).
//
// On the Mohr's-circle plot the horizontal axis is σ (tension right) and the
// vertical axis is τ (positive up). The reference point for the x-face is
// (σx, τxy) and the y-face is (σy, −τxy); the two are ends of a diameter. Under
// this common plotting convention a physical CCW rotation of the element by θ
// moves the plotted point CLOCKWISE by 2θ around the circle — the well-known
// "double angle, opposite sense" property. Principal points are the two σ-axis
// intercepts; the top/bottom of the circle are the maximum in-plane shear
// planes. All magnitudes below are convention-independent.

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export interface StressState2D {
  sigmaXMPa: number;
  sigmaYMPa: number;
  tauXYMPa: number;
}

export interface TransformedStress {
  angleDeg: number; // rotation applied (CCW +)
  sigmaXpMPa: number; // normal stress on the rotated x' face
  sigmaYpMPa: number; // normal stress on the rotated y' face
  tauXpYpMPa: number; // shear on the rotated faces
}

export interface MohrsResult {
  centerMPa: number; // σ_avg — circle centre on the σ-axis
  radiusMPa: number; // R — circle radius = maximum IN-PLANE shear
  sigma1MPa: number; // maximum (algebraically largest) in-plane principal stress
  sigma2MPa: number; // minimum (algebraically smallest) in-plane principal stress
  maxShearInPlaneMPa: number; // = R, acts on planes at ±45° to the principal planes
  normalAtMaxShearMPa: number; // normal stress coexisting with τmax (= σ_avg)
  sigma3MPa: number; // out-of-plane principal stress (0 for plane stress)
  absMaxShearMPa: number; // maximum shear of the full 3-D state (σ1, σ2, σ3=0)
  thetaP1Deg: number; // orientation of the σ1 plane, CCW from x-axis
  thetaP2Deg: number; // orientation of the σ2 plane (= θp1 + 90°)
  thetaSDeg: number; // orientation of a maximum-in-plane-shear plane (= θp1 − 45°)
  vonMisesMPa: number; // plane-stress von Mises equivalent stress
  trescaMPa: number; // Tresca equivalent stress = 2·τabs,max
}

/** Stress-transformation equations: stresses on faces rotated CCW by θ. */
export function transformStress(s: StressState2D, angleDeg: number): TransformedStress {
  const avg = (s.sigmaXMPa + s.sigmaYMPa) / 2;
  const half = (s.sigmaXMPa - s.sigmaYMPa) / 2;
  const c = Math.cos(2 * angleDeg * RAD);
  const sn = Math.sin(2 * angleDeg * RAD);
  return {
    angleDeg,
    sigmaXpMPa: avg + half * c + s.tauXYMPa * sn,
    sigmaYpMPa: avg - half * c - s.tauXYMPa * sn,
    tauXpYpMPa: -half * sn + s.tauXYMPa * c,
  };
}

/** Full Mohr's-circle solution for a 2-D (plane) stress state. */
export function solveMohrsCircle(s: StressState2D): MohrsResult {
  const avg = (s.sigmaXMPa + s.sigmaYMPa) / 2;
  const half = (s.sigmaXMPa - s.sigmaYMPa) / 2;
  const R = Math.hypot(half, s.tauXYMPa);

  const sigma1 = avg + R;
  const sigma2 = avg - R;
  const sigma3 = 0; // plane stress: the third principal stress is zero

  // Principal orientation: θp1 points to the σ1 plane. atan2(2τxy, σx−σy)
  // returns the doubled angle in (−180°, 180°]; halving gives (−90°, 90°].
  // When the state is hydrostatic-in-plane (R = 0) the direction is arbitrary.
  const thetaP1Deg = R < 1e-12 ? 0 : 0.5 * Math.atan2(2 * s.tauXYMPa, s.sigmaXMPa - s.sigmaYMPa) * DEG;
  const thetaP2Deg = thetaP1Deg + 90;
  const thetaSDeg = thetaP1Deg - 45;

  // Absolute maximum shear of the 3-D state accounts for the zero out-of-plane
  // principal: τabs = (σmax − σmin)/2 over {σ1, σ2, 0}. When σ1 and σ2 have the
  // same sign this EXCEEDS the in-plane R (the governing shear is out-of-plane).
  const pMax = Math.max(sigma1, sigma2, sigma3);
  const pMin = Math.min(sigma1, sigma2, sigma3);
  const absMaxShear = (pMax - pMin) / 2;

  // Plane-stress von Mises: √(σ1² − σ1σ2 + σ2²) ≡ √(σx² − σxσy + σy² + 3τxy²).
  const vonMises = Math.sqrt(sigma1 * sigma1 - sigma1 * sigma2 + sigma2 * sigma2);

  return {
    centerMPa: avg,
    radiusMPa: R,
    sigma1MPa: sigma1,
    sigma2MPa: sigma2,
    maxShearInPlaneMPa: R,
    normalAtMaxShearMPa: avg,
    sigma3MPa: sigma3,
    absMaxShearMPa: absMaxShear,
    thetaP1Deg,
    thetaP2Deg,
    thetaSDeg,
    vonMisesMPa: vonMises,
    trescaMPa: 2 * absMaxShear,
  };
}
