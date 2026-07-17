// Beam bending: reactions, shear force / bending moment diagrams, and deflection
// for an arbitrary combination of point loads, point moments, and (linearly
// varying) distributed loads on a uniform prismatic beam.
//
// Approach: rather than one closed-form formula per (support type x load type)
// combination — which is how Roark's Formulas for Stress and Strain (Table 3,
// "Shear, moment, slope, and deflection formulas for elastic straight beams")
// tabulates hundreds of individual cases — this solves the general case
// numerically so any number of loads in any combination works uniformly:
//
//  1. Reactions for a determinate beam (simply supported, cantilever,
//     overhanging) follow directly from the two static-equilibrium equations
//     (ΣFy=0, ΣM=0).
//  2. Statically indeterminate beams (fixed-fixed: 2° indeterminate; propped
//     cantilever: 1° indeterminate) are solved by the force (flexibility)
//     method: redundant reactions are released to obtain a determinate
//     "primary" structure, and the redundant(s) are found from compatibility
//     (zero deflection/rotation at the released support) using the unit-load
//     / virtual-work (Mohr integral) theorem, evaluated numerically.
//  3. Once every reaction is known the beam is fully determinate; V(x) and
//     M(x) follow from closed-form superposition of each load's contribution,
//     and the deflection curve y(x) follows from numerically integrating
//     M(x)/EI twice, fixing the two integration constants from the support's
//     known zero-deflection/zero-slope conditions.
//
// Sign convention: x runs left-to-right, 0 to L. Point forces and distributed
// load intensities are entered as positive-downward. Reactions, and the shear
// force V(x), are positive upward/left-side-up (i.e. V(x) = net upward force
// to the left of the section). Bending moment M(x) is positive sagging
// (concave up, tension on the bottom fibre) — the usual beam convention. An
// applied external point moment is positive clockwise, which by this
// convention produces a positive (upward) step in M(x) just to its right.

export type BeamSupportType = 'simply-supported' | 'cantilever' | 'fixed-fixed' | 'propped-cantilever' | 'overhanging';

export type FixedEnd = 'left' | 'right';

export interface BeamConfig {
  length: number; // mm, total modelled length
  supportType: BeamSupportType;
  fixedEnd: FixedEnd; // which end is fixed, for 'cantilever' and 'propped-cantilever'
  propPosition: number; // mm from left end — the prop/support position for 'propped-cantilever' (0 < propPosition <= length)
  supportAPosition: number; // mm from left end — first support, for 'overhanging'
  supportBPosition: number; // mm from left end — second support, for 'overhanging' (> supportAPosition)
}

export type LoadKind = 'point-force' | 'point-moment' | 'distributed';

export interface BeamLoad {
  id: string;
  kind: LoadKind;
  label: string;
  position: number; // mm — point loads: location; distributed: start position
  endPosition: number; // mm — distributed loads only: end position (> position)
  magnitude: number; // point-force: N, downward positive. point-moment: N·mm, clockwise positive. distributed: N/mm intensity at `position`
  endMagnitude: number; // distributed loads only: N/mm intensity at `endPosition` (equal to `magnitude` for a uniform / UDL case)
}

export interface SectionProperties {
  I: number; // mm^4, second moment of area
  c: number; // mm, distance from neutral axis to extreme fibre (for a bending-stress check)
}

export interface BeamMaterial {
  E: number; // MPa (N/mm^2), Young's modulus
}

export interface BeamMaterialPreset {
  id: string;
  label: string;
  E: number; // MPa
}

// Typical handbook E values — a starting point, not a substitute for a mill
// certificate or datasheet value on a real design.
export const BEAM_MATERIAL_PRESETS: BeamMaterialPreset[] = [
  { id: 'steel', label: 'Structural steel (~200 GPa)', E: 200000 },
  { id: 'stainless', label: 'Stainless steel (~193 GPa)', E: 193000 },
  { id: 'aluminium', label: 'Aluminium 6061-T6 (~69 GPa)', E: 69000 },
  { id: 'titanium', label: 'Titanium Ti-6Al-4V (~114 GPa)', E: 114000 },
  { id: 'timber', label: 'Softwood timber, along grain (~11 GPa)', E: 11000 },
  { id: 'custom', label: 'Custom', E: 200000 },
];

// ── Section property helpers (first-principles solid shapes) ──────────────

export function rectangleSection(width: number, height: number): SectionProperties {
  return { I: (width * height ** 3) / 12, c: height / 2 };
}

export function circularSolidSection(diameter: number): SectionProperties {
  return { I: (Math.PI * diameter ** 4) / 64, c: diameter / 2 };
}

export function circularTubeSection(outerDiameter: number, innerDiameter: number): SectionProperties {
  return { I: (Math.PI * (outerDiameter ** 4 - innerDiameter ** 4)) / 64, c: outerDiameter / 2 };
}

// ── Reaction bookkeeping ────────────────────────────────────────────────────

export type ReactionKind = 'force' | 'moment';

export interface Reaction {
  kind: ReactionKind;
  position: number;
  label: string;
  value: number; // force: N upward positive. moment: N·mm, clockwise positive (same convention as applied point moments)
}

// ── Point/distributed contribution to V(x) and M(x) ────────────────────────
// All contributions use the upward/clockwise-positive convention described above.

function pointForceContribution(x: number, position: number, upwardForce: number): { v: number; m: number } {
  if (x < position) return { v: 0, m: 0 };
  return { v: upwardForce, m: upwardForce * (x - position) };
}

function pointMomentContribution(x: number, position: number, clockwiseMoment: number): { v: number; m: number } {
  if (x < position) return { v: 0, m: 0 };
  return { v: 0, m: clockwiseMoment };
}

/** Linearly-varying distributed load w(ξ) from w1 at `a` to w2 at `b`, entered
 *  positive-downward — so its contribution to the upward-positive V/M is negated. */
function distributedContribution(x: number, a: number, b: number, w1: number, w2: number): { v: number; m: number } {
  if (x <= a) return { v: 0, m: 0 };
  const s = b - a;
  const t = Math.min(x, b) - a;
  const fDown = w1 * t + ((w2 - w1) * t * t) / (2 * s);
  let mDown = (w1 * t * t) / 2 + ((w2 - w1) * t * t * t) / (6 * s);
  if (x > b) mDown += fDown * (x - b);
  return { v: -fDown, m: -mDown };
}

function loadTotalDownwardForce(load: BeamLoad): number {
  if (load.kind === 'point-force') return load.magnitude;
  if (load.kind === 'point-moment') return 0;
  return ((load.magnitude + load.endMagnitude) / 2) * (load.endPosition - load.position);
}

function evalLoads(x: number, loads: BeamLoad[]): { v: number; m: number } {
  let v = 0;
  let m = 0;
  for (const load of loads) {
    let c: { v: number; m: number };
    if (load.kind === 'point-force') c = pointForceContribution(x, load.position, -load.magnitude);
    else if (load.kind === 'point-moment') c = pointMomentContribution(x, load.position, load.magnitude);
    else c = distributedContribution(x, load.position, load.endPosition, load.magnitude, load.endMagnitude);
    v += c.v;
    m += c.m;
  }
  return { v, m };
}

function evalReactions(x: number, reactions: Reaction[]): { v: number; m: number } {
  let v = 0;
  let m = 0;
  for (const r of reactions) {
    const c = r.kind === 'force' ? pointForceContribution(x, r.position, r.value) : pointMomentContribution(x, r.position, r.value);
    v += c.v;
    m += c.m;
  }
  return { v, m };
}

// ── Small linear algebra (2x2 solve, used for redundants + integration constants) ──

function solve2x2(a11: number, a12: number, a21: number, a22: number, b1: number, b2: number): [number, number] {
  const det = a11 * a22 - a12 * a21;
  if (Math.abs(det) < 1e-30) return [0, 0];
  return [(b1 * a22 - a12 * b2) / det, (a11 * b2 - b1 * a21) / det];
}

// ── Reaction "slots" per support configuration ─────────────────────────────

function reactionSlots(config: BeamConfig): { position: number; kind: ReactionKind; label: string }[] {
  const { length: L, supportType, fixedEnd, propPosition, supportAPosition, supportBPosition } = config;
  switch (supportType) {
    case 'simply-supported':
      return [
        { position: 0, kind: 'force', label: 'Reaction A (pin)' },
        { position: L, kind: 'force', label: 'Reaction B (roller)' },
      ];
    case 'overhanging':
      return [
        { position: supportAPosition, kind: 'force', label: 'Reaction A' },
        { position: supportBPosition, kind: 'force', label: 'Reaction B' },
      ];
    case 'cantilever': {
      const p = fixedEnd === 'left' ? 0 : L;
      return [
        { position: p, kind: 'force', label: 'Fixed-end reaction' },
        { position: p, kind: 'moment', label: 'Fixed-end moment' },
      ];
    }
    case 'propped-cantilever': {
      const p = fixedEnd === 'left' ? 0 : L;
      return [
        { position: p, kind: 'force', label: 'Fixed-end reaction' },
        { position: p, kind: 'moment', label: 'Fixed-end moment' },
        { position: propPosition, kind: 'force', label: 'Prop reaction' },
      ];
    }
    case 'fixed-fixed':
      return [
        { position: 0, kind: 'force', label: 'Left reaction' },
        { position: 0, kind: 'moment', label: 'Left fixed-end moment' },
        { position: L, kind: 'force', label: 'Right reaction' },
        { position: L, kind: 'moment', label: 'Right fixed-end moment' },
      ];
  }
}

/** Solves the 2 static-equilibrium equations for exactly two unknown reaction
 *  components, given a set of known loads (applied loads, plus any
 *  already-resolved reactions such as a redundant).
 *
 *  Row 2 (moment equilibrium) is written as "M(xRef) = 0" for an `xRef`
 *  beyond every load and reaction on the beam, using the SAME sagging-positive
 *  section-moment contribution formulas (pointForceContribution /
 *  pointMomentContribution / distributedContribution / evalLoads) used
 *  everywhere else in this module — rather than a textbook "ΣM about x=0"
 *  written with its own separate counterclockwise-positive sign convention,
 *  which is not the same sign system and, mixed with the sagging-positive one,
 *  silently produces a wrong (but plausible-looking) fixed-end moment. Since
 *  nothing remains beyond xRef, equilibrium requires the section moment there
 *  to vanish, and reusing the exact same contribution formulas guarantees this
 *  equation is self-consistent with how M(x) is evaluated everywhere else. */
function solveDeterminatePair(
  slots: { position: number; kind: ReactionKind }[],
  knownLoads: BeamLoad[],
  xRef: number,
): [number, number] {
  const coeffsFy = slots.map((s) => (s.kind === 'force' ? 1 : 0));
  const coeffsM = slots.map((s) => (s.kind === 'force' ? xRef - s.position : 1));

  let sumFyKnown = 0;
  for (const load of knownLoads) {
    if (load.kind !== 'point-moment') sumFyKnown += -loadTotalDownwardForce(load); // upward-signed
  }
  const sumMKnownAtRef = evalLoads(xRef, knownLoads).m;

  return solve2x2(coeffsFy[0], coeffsFy[1], coeffsM[0], coeffsM[1], -sumFyKnown, -sumMKnownAtRef);
}

// ── Numerical grid + integration ───────────────────────────────────────────

const EPS_FRACTION = 1e-6;

function buildGrid(config: BeamConfig, loads: BeamLoad[], samples = 600): number[] {
  const L = config.length;
  const breakpoints = new Set<number>([0, L]);
  const slots = reactionSlots(config);
  slots.forEach((s) => breakpoints.add(s.position));
  loads.forEach((l) => {
    breakpoints.add(l.position);
    if (l.kind === 'distributed') breakpoints.add(l.endPosition);
  });
  const eps = L * EPS_FRACTION;
  const points = new Set<number>();
  for (let i = 0; i <= samples; i++) points.add((i / samples) * L);
  // Duplicate each point-load/reaction/moment position at ±eps so V(x)/M(x)
  // step discontinuities render as a clean vertical jump when charted.
  breakpoints.forEach((p) => {
    points.add(Math.max(0, p - eps));
    points.add(p);
    points.add(Math.min(L, p + eps));
  });
  return Array.from(points).sort((a, b) => a - b);
}

/** Cumulative trapezoidal integral of `values` sampled at `xs`, ∫_0^{xs[i]}. */
function cumulativeIntegral(xs: number[], values: number[]): number[] {
  const out = new Array<number>(xs.length).fill(0);
  for (let i = 1; i < xs.length; i++) {
    out[i] = out[i - 1] + ((values[i] + values[i - 1]) / 2) * (xs[i] - xs[i - 1]);
  }
  return out;
}

function valueAt(xs: number[], values: number[], x: number): number {
  // xs is sorted and dense; linear-interpolate to the nearest bracketing samples.
  let lo = 0;
  let hi = xs.length - 1;
  if (x <= xs[0]) return values[0];
  if (x >= xs[hi]) return values[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
  return values[lo] + t * (values[hi] - values[lo]);
}

// ── Public result shape ─────────────────────────────────────────────────────

export interface BeamPoint {
  x: number;
  shear: number; // N
  moment: number; // N·mm
  deflection: number; // mm
}

export interface BeamResult {
  reactions: Reaction[];
  points: BeamPoint[];
  maxShear: { value: number; x: number };
  minShear: { value: number; x: number };
  maxMoment: { value: number; x: number };
  minMoment: { value: number; x: number };
  maxDeflection: { value: number; x: number }; // signed extreme (largest magnitude), mm
  maxBendingStress: number; // MPa, at the position of largest |moment|, using SectionProperties.c
  indeterminacyDegree: number;
}

export function solveBeam(config: BeamConfig, loads: BeamLoad[], material: BeamMaterial, section: SectionProperties): BeamResult {
  const L = config.length;
  const EI = material.E * section.I; // N·mm^2
  const slots = reactionSlots(config);
  const degree = slots.length - 2;

  let reactions: Reaction[];

  if (degree <= 0) {
    // Determinate: solve the two reaction components directly.
    const [r0, r1] = solveDeterminatePair(slots, loads, L);
    reactions = slots.map((s, i) => ({ ...s, value: i === 0 ? r0 : r1 }));
  } else {
    // Indeterminate to 1° (propped-cantilever) or 2° (fixed-fixed): force
    // method. Release the redundant force/moment slot(s) — always the LAST
    // entries in reactionSlots for these two support types — leaving a
    // determinate 2-reaction "primary" structure carrying the real loads.
    const primarySlots = slots.slice(0, 2);
    const redundantSlots = slots.slice(2);

    const [p0, p1] = solveDeterminatePair(primarySlots, loads, L);
    const primaryReactions: Reaction[] = primarySlots.map((s, i) => ({ ...s, value: i === 0 ? p0 : p1 }));

    const xs = buildGrid(config, loads);
    const mApplied = xs.map((x) => evalLoads(x, loads).m + evalReactions(x, primaryReactions).m);

    // Unit-redundant case(s): apply a unit force/moment at each redundant's
    // position (nothing else), on the same primary structure, and find the
    // resulting reactions + moment diagram — this is the "m(x)" of the
    // unit-load / virtual-work (Mohr integral) method.
    const unitMoments: number[][] = redundantSlots.map((slot) => {
      const unitLoad: BeamLoad =
        slot.kind === 'force'
          ? { id: '_unit', kind: 'point-force', label: '', position: slot.position, endPosition: 0, magnitude: -1, endMagnitude: 0 } // upward unit force -> magnitude=-1 (down-positive convention)
          : { id: '_unit', kind: 'point-moment', label: '', position: slot.position, endPosition: 0, magnitude: 1, endMagnitude: 0 };
      const [u0, u1] = solveDeterminatePair(primarySlots, [unitLoad], L);
      const unitPrimaryReactions: Reaction[] = primarySlots.map((s, i) => ({ ...s, value: i === 0 ? u0 : u1 }));
      return xs.map((x) => evalLoads(x, [unitLoad]).m + evalReactions(x, unitPrimaryReactions).m);
    });

    const integrand = (a: number[], b: number[]) => cumulativeIntegral(xs, xs.map((_, i) => (a[i] * b[i]) / EI))[xs.length - 1];

    // Compatibility: total deflection/rotation at each redundant's position is
    // zero. Build and solve the n×n (n=1 or 2) flexibility system.
    const n = redundantSlots.length;
    const flex: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const rhs: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      rhs[i] = -integrand(mApplied, unitMoments[i]);
      for (let j = 0; j < n; j++) flex[i][j] = integrand(unitMoments[i], unitMoments[j]);
    }
    let redundantValues: number[];
    if (n === 1) {
      redundantValues = [Math.abs(flex[0][0]) < 1e-30 ? 0 : rhs[0] / flex[0][0]];
    } else {
      redundantValues = solve2x2(flex[0][0], flex[0][1], flex[1][0], flex[1][1], rhs[0], rhs[1]);
    }

    // Superpose: total load list now includes the resolved redundants as
    // known point force/moments, so the remaining 2 primary reactions can be
    // resolved by the same determinate-pair equilibrium solve.
    const redundantAsLoads: BeamLoad[] = redundantSlots.map((slot, i) => ({
      id: `_redundant_${i}`,
      kind: slot.kind === 'force' ? 'point-force' : 'point-moment',
      label: '',
      position: slot.position,
      endPosition: 0,
      magnitude: slot.kind === 'force' ? -redundantValues[i] : redundantValues[i],
      endMagnitude: 0,
    }));
    const [f0, f1] = solveDeterminatePair(primarySlots, [...loads, ...redundantAsLoads], L);
    reactions = [
      { ...primarySlots[0], value: f0 },
      { ...primarySlots[1], value: f1 },
      ...redundantSlots.map((s, i) => ({ ...s, value: redundantValues[i] })),
    ];
  }

  // ── V(x), M(x) over the full grid, now that every reaction is known ──────
  const xs = buildGrid(config, loads);
  const shear = xs.map((x) => evalLoads(x, loads).v + evalReactions(x, reactions).v);
  const moment = xs.map((x) => evalLoads(x, loads).m + evalReactions(x, reactions).m);

  // ── Deflection: double-integrate M/EI, then fix the 2 integration
  //    constants from this configuration's known zero-deflection/slope points.
  const curvature = moment.map((m) => m / EI);
  const theta0 = cumulativeIntegral(xs, curvature); // slope assuming θ(0)=0
  const y0 = cumulativeIntegral(xs, theta0); // deflection assuming θ(0)=0, y(0)=0

  const thetaAt = (x: number) => valueAt(xs, theta0, x);
  const yAt = (x: number) => valueAt(xs, y0, x);

  // y(x) = C2 + C1·x + y0(x); θ(x) = C1 + θ0(x). Build 2 linear conditions in (C1, C2).
  type Condition = [number, number, number]; // [coeff on C1, coeff on C2, rhs]
  let conditions: [Condition, Condition];
  if (config.supportType === 'simply-supported') {
    conditions = [
      [0, 1, -yAt(0)],
      [L, 1, -yAt(L)],
    ];
  } else if (config.supportType === 'overhanging') {
    const pA = config.supportAPosition;
    const pB = config.supportBPosition;
    conditions = [
      [pA, 1, -yAt(pA)],
      [pB, 1, -yAt(pB)],
    ];
  } else if (config.supportType === 'cantilever') {
    const p = config.fixedEnd === 'left' ? 0 : L;
    conditions = [
      [1, 0, -thetaAt(p)],
      [p, 1, -yAt(p)],
    ];
  } else {
    // fixed-fixed / propped-cantilever: anchor at the fixed end.
    const p = config.fixedEnd === 'left' ? 0 : L;
    conditions = [
      [1, 0, -thetaAt(p)],
      [p, 1, -yAt(p)],
    ];
  }
  const [C1, C2] = solve2x2(conditions[0][0], conditions[0][1], conditions[1][0], conditions[1][1], conditions[0][2], conditions[1][2]);
  const deflection = xs.map((x, i) => C2 + C1 * x + y0[i]);

  const points: BeamPoint[] = xs.map((x, i) => ({ x, shear: shear[i], moment: moment[i], deflection: deflection[i] }));

  const maxShear = points.reduce((a, p) => (p.shear > a.value ? { value: p.shear, x: p.x } : a), { value: shear[0], x: xs[0] });
  const minShear = points.reduce((a, p) => (p.shear < a.value ? { value: p.shear, x: p.x } : a), { value: shear[0], x: xs[0] });
  const maxMoment = points.reduce((a, p) => (p.moment > a.value ? { value: p.moment, x: p.x } : a), { value: moment[0], x: xs[0] });
  const minMoment = points.reduce((a, p) => (p.moment < a.value ? { value: p.moment, x: p.x } : a), { value: moment[0], x: xs[0] });
  const maxDeflection = points.reduce(
    (a, p) => (Math.abs(p.deflection) > Math.abs(a.value) ? { value: p.deflection, x: p.x } : a),
    { value: deflection[0], x: xs[0] },
  );
  const worstMoment = Math.max(Math.abs(maxMoment.value), Math.abs(minMoment.value));
  const maxBendingStress = (worstMoment * section.c) / section.I;

  return { reactions, points, maxShear, minShear, maxMoment, minMoment, maxDeflection, maxBendingStress, indeterminacyDegree: Math.max(0, degree) };
}
