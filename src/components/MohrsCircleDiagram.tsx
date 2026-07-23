import type { ReactElement } from 'react';
import type { StressState2D, MohrsResult, TransformedStress } from '../lib/mohrsCirclePhysics';

// Mohr's circle for a 2-D stress state, drawn to a true (uniform) scale so the
// circle is geometrically a circle. Horizontal axis = normal stress σ (tension
// right), vertical axis = shear stress τ (positive up). The x-face is plotted
// at (σx, τxy) and the y-face at (σy, −τxy); they are the ends of a diameter.
// Marked: the two principal points (σ1, σ2) on the σ-axis, the maximum in-plane
// shear points (top/bottom), the reference x/y diameter, and — rotated by 2θ —
// the diameter for the user's rotation angle with its x'/y' face points. A small
// stress-element schematic (original + rotated) sits beside it. All colours come
// from theme CSS variables. Not tied to a fixed physical scale — the view
// auto-fits the circle.
//
// Under this plotting convention a physical counter-clockwise rotation of the
// element by θ moves the plotted point clockwise by 2θ around the circle; the
// transformed points are computed directly from the transformation equations so
// they are always placed correctly regardless of that sense.

interface Props {
  state: StressState2D;
  result: MohrsResult;
  rotationDeg: number;
  transformed: TransformedStress;
  /** display formatter: SI-MPa value -> string in the active unit system */
  fmtStress: (mpa: number) => string;
  stressUnit: string;
}

const MONO = 'ui-monospace, monospace';

// --- main circle canvas ---
const W = 580;
const H = 460;
const PLOT_L = 64;
const PLOT_R = 548;
const PLOT_T = 40;
const PLOT_B = 400;

function arrow(x1: number, y1: number, x2: number, y2: number, color: string, key: string, width = 1.6): ReactElement[] {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 7;
  return [
    <line key={`${key}-l`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} />,
    <path key={`${key}-h`}
      d={`M${x2} ${y2} L${(x2 - ah * Math.cos(ang - 0.42)).toFixed(1)} ${(y2 - ah * Math.sin(ang - 0.42)).toFixed(1)} L${(x2 - ah * Math.cos(ang + 0.42)).toFixed(1)} ${(y2 - ah * Math.sin(ang + 0.42)).toFixed(1)} z`}
      fill={color} />,
  ];
}

// A compact stress element: unit square with normal-stress arrows (outward =
// tension, inward = compression) and complementary shear arrows. Sign-aware.
function stressElement(cx: number, cy: number, half: number, sx: number, sy: number, txy: number,
  labels: { x: string; y: string; t: string }, keyPre: string): ReactElement[] {
  const els: ReactElement[] = [];
  const ACC = 'var(--accent)';
  const SHEAR = 'var(--accent-2, #f59e0b)';
  const gap = 12; // arrow length outside the face
  els.push(<rect key={`${keyPre}-sq`} x={cx - half} y={cy - half} width={half * 2} height={half * 2}
    fill="var(--surface-2, rgba(127,127,127,0.06))" stroke="var(--border-hover)" strokeWidth={1.4} />);

  // Normal σx on the left/right faces (horizontal). Tension -> outward.
  const xt = sx >= 0;
  els.push(...arrow(cx + half + (xt ? 0 : gap), cy, cx + half + (xt ? gap : 0), cy, ACC, `${keyPre}-sxr`));
  els.push(...arrow(cx - half - (xt ? 0 : gap), cy, cx - half - (xt ? gap : 0), cy, ACC, `${keyPre}-sxl`));
  // Normal σy on the top/bottom faces (vertical). Tension -> outward.
  const yt = sy >= 0;
  els.push(...arrow(cx, cy - half - (yt ? 0 : gap), cx, cy - half - (yt ? gap : 0), ACC, `${keyPre}-syt`));
  els.push(...arrow(cx, cy + half + (yt ? 0 : gap), cx, cy + half + (yt ? gap : 0), ACC, `${keyPre}-syb`));

  // Shear τxy — complementary set. Positive (per convention): +x face acts +y.
  if (Math.abs(txy) > 1e-9) {
    const d = txy >= 0 ? 1 : -1;
    const s = half * 0.66;
    // right face: vertical arrow (+y when d>0, i.e. upward on screen = -screenY)
    els.push(...arrow(cx + half, cy + s * d, cx + half, cy - s * d, SHEAR, `${keyPre}-tr`, 1.4));
    // left face: opposite
    els.push(...arrow(cx - half, cy - s * d, cx - half, cy + s * d, SHEAR, `${keyPre}-tl`, 1.4));
    // top face: horizontal (+x when d>0)
    els.push(...arrow(cx - s * d, cy - half, cx + s * d, cy - half, SHEAR, `${keyPre}-tt`, 1.4));
    // bottom face: opposite
    els.push(...arrow(cx + s * d, cy + half, cx - s * d, cy + half, SHEAR, `${keyPre}-tb`, 1.4));
  }

  els.push(<text key={`${keyPre}-lx`} x={cx + half + gap + 4} y={cy - 4} fontSize="10" fontFamily={MONO} fill={ACC}>{labels.x}</text>);
  els.push(<text key={`${keyPre}-ly`} x={cx + 4} y={cy - half - gap - 3} fontSize="10" fontFamily={MONO} fill={ACC} textAnchor="middle">{labels.y}</text>);
  if (Math.abs(txy) > 1e-9) els.push(<text key={`${keyPre}-lt`} x={cx} y={cy + 3} fontSize="10" fontFamily={MONO} fill={SHEAR} textAnchor="middle">{labels.t}</text>);
  return els;
}

export default function MohrsCircleDiagram({ state, result, rotationDeg, transformed, fmtStress, stressUnit }: Props) {
  const { centerMPa: C, radiusMPa: R, sigma1MPa: s1, sigma2MPa: s2 } = result;
  const ACC = 'var(--accent)';
  const SHEAR = 'var(--accent-2, #f59e0b)';

  const els: ReactElement[] = [];

  // Degenerate (hydrostatic in-plane) — circle collapses to a point.
  const degenerate = R < 1e-9;

  // Data bounds — include σ = 0 so the origin/τ-axis is visible for context.
  const margin = Math.max(R * 0.28, 1e-6);
  const sigLo = Math.min(s2, 0) - margin;
  const sigHi = Math.max(s1, 0) + margin;
  const tauHalf = R + margin;

  const availW = PLOT_R - PLOT_L;
  const availH = PLOT_B - PLOT_T;
  const sigSpan = Math.max(sigHi - sigLo, 1e-9);
  const tauSpan = Math.max(2 * tauHalf, 1e-9);
  const scale = Math.min(availW / sigSpan, availH / tauSpan);

  const plotCX = (PLOT_L + PLOT_R) / 2;
  const plotCY = (PLOT_T + PLOT_B) / 2;
  const dataCsig = (sigLo + sigHi) / 2;

  const sx = (sig: number) => plotCX + (sig - dataCsig) * scale; // σ -> x px
  const sy = (tau: number) => plotCY - tau * scale; // τ -> y px (up = +τ)

  const cxPx = sx(C);
  const cyPx = plotCY; // τ = 0 axis

  // σ-axis (horizontal through τ = 0) spanning the plot.
  els.push(<line key="sig-axis" x1={PLOT_L - 6} y1={cyPx} x2={PLOT_R + 6} y2={cyPx} stroke="var(--border-hover)" strokeWidth={1.3} />);
  els.push(<path key="sig-arrow" d={`M${PLOT_R + 6} ${cyPx} l-8 -4 l0 8 z`} fill="var(--border-hover)" />);
  // Caption sits BELOW the axis at the right so it never collides with the σ1
  // principal-stress label, which sits above the axis near the same x.
  els.push(<text key="sig-lbl" x={PLOT_R + 6} y={cyPx + 18} fontSize="12" fontFamily={MONO} fill="var(--text-2)" textAnchor="end">σ (normal)</text>);

  // τ-axis at σ = 0 (only when in range), plus origin marker.
  if (sx(0) >= PLOT_L - 2 && sx(0) <= PLOT_R + 2) {
    const zx = sx(0);
    els.push(<line key="tau-axis" x1={zx} y1={PLOT_T - 6} x2={zx} y2={PLOT_B + 6} stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="2 4" />);
    els.push(<path key="tau-arrow" d={`M${zx} ${PLOT_T - 6} l-4 8 l8 0 z`} fill="var(--text-faint)" />);
    els.push(<text key="tau-lbl" x={zx + 6} y={PLOT_T + 4} fontSize="12" fontFamily={MONO} fill="var(--text-2)">τ (shear)</text>);
    els.push(<text key="orig-lbl" x={zx - 4} y={cyPx + 14} fontSize="10" fontFamily={MONO} fill="var(--text-faint)" textAnchor="end">O</text>);
  }

  if (!degenerate) {
    const rPx = R * scale;

    // The circle.
    els.push(<circle key="circle" cx={cxPx} cy={cyPx} r={rPx} fill="var(--accent)" fillOpacity={0.05} stroke="var(--text-3)" strokeWidth={1.8} />);
    // Centre.
    els.push(<circle key="ctr" cx={cxPx} cy={cyPx} r={2.5} fill="var(--text-2)" />);
    els.push(<text key="ctr-lbl" x={cxPx} y={cyPx + 15} fontSize="9.5" fontFamily={MONO} fill="var(--text-faint)" textAnchor="middle">σavg {fmtStress(C)}</text>);

    // Principal points σ1, σ2 on the σ-axis.
    for (const [val, label, anchor] of [[s1, 'σ₁', 'start'], [s2, 'σ₂', 'end']] as const) {
      els.push(<circle key={`p-${label}`} cx={sx(val)} cy={cyPx} r={4} fill={ACC} />);
      els.push(<text key={`p-${label}-l`} x={sx(val) + (anchor === 'start' ? 6 : -6)} y={cyPx - 10} fontSize="11.5" fontFamily={MONO} fill={ACC} fontWeight={600} textAnchor={anchor}>{label} {fmtStress(val)}</text>);
    }

    // Maximum in-plane shear points (top & bottom of circle).
    els.push(<circle key="tmax-t" cx={cxPx} cy={sy(R)} r={4} fill={SHEAR} />);
    els.push(<circle key="tmax-b" cx={cxPx} cy={sy(-R)} r={4} fill={SHEAR} />);
    els.push(<text key="tmax-l" x={cxPx + 8} y={sy(R) - 4} fontSize="11" fontFamily={MONO} fill={SHEAR} fontWeight={600}>τmax {fmtStress(R)}</text>);

    // Reference diameter through the x-face (σx, τxy) and y-face (σy, −τxy).
    const xPt = { x: sx(state.sigmaXMPa), y: sy(state.tauXYMPa) };
    const yPt = { x: sx(state.sigmaYMPa), y: sy(-state.tauXYMPa) };
    els.push(<line key="ref-diam" x1={xPt.x} y1={xPt.y} x2={yPt.x} y2={yPt.y} stroke="var(--text-2)" strokeWidth={1.6} />);
    els.push(<circle key="ref-x" cx={xPt.x} cy={xPt.y} r={4.5} fill="var(--text-1, var(--text-2))" stroke="var(--bg, #000)" strokeWidth={1} />);
    els.push(<circle key="ref-y" cx={yPt.x} cy={yPt.y} r={3.5} fill="var(--text-2)" />);
    els.push(<text key="ref-x-l" x={xPt.x + 7} y={xPt.y + (state.tauXYMPa >= 0 ? -6 : 14)} fontSize="10.5" fontFamily={MONO} fill="var(--text-1, var(--text-2))" fontWeight={600}>X (σx, τxy)</text>);
    els.push(<text key="ref-y-l" x={yPt.x - 7} y={yPt.y + (state.tauXYMPa >= 0 ? 14 : -6)} fontSize="10" fontFamily={MONO} fill="var(--text-2)" textAnchor="end">Y</text>);

    // Transformed diameter at the user's rotation angle θ.
    const active = Math.abs(rotationDeg % 180) > 1e-6;
    if (active) {
      const xpPt = { x: sx(transformed.sigmaXpMPa), y: sy(transformed.tauXpYpMPa) };
      const ypPt = { x: sx(transformed.sigmaYpMPa), y: sy(-transformed.tauXpYpMPa) };
      els.push(<line key="rot-diam" x1={xpPt.x} y1={xpPt.y} x2={ypPt.x} y2={ypPt.y} stroke={ACC} strokeWidth={1.8} strokeDasharray="6 3" />);
      els.push(<circle key="rot-x" cx={xpPt.x} cy={xpPt.y} r={4.5} fill={ACC} />);
      els.push(<circle key="rot-y" cx={ypPt.x} cy={ypPt.y} r={3.5} fill={ACC} fillOpacity={0.7} />);
      els.push(<text key="rot-x-l" x={xpPt.x + 7} y={xpPt.y + (transformed.tauXpYpMPa >= 0 ? -6 : 14)} fontSize="10.5" fontFamily={MONO} fill={ACC} fontWeight={600}>X′ (θ={rotationDeg.toFixed(0)}°)</text>);

      // 2θ arc between the reference-X and transformed-X′ radii.
      const arcR = Math.min(rPx * 0.55, 30) + 6;
      const a0 = Math.atan2(xPt.y - cyPx, xPt.x - cxPx);
      const a1 = Math.atan2(xpPt.y - cyPx, xpPt.x - cxPx);
      const p0 = { x: cxPx + arcR * Math.cos(a0), y: cyPx + arcR * Math.sin(a0) };
      const p1 = { x: cxPx + arcR * Math.cos(a1), y: cyPx + arcR * Math.sin(a1) };
      // sweep direction: shortest way from a0 to a1
      let da = a1 - a0;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const sweep = da >= 0 ? 1 : 0;
      els.push(<path key="two-theta" d={`M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${arcR} ${arcR} 0 0 ${sweep} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`} fill="none" stroke={ACC} strokeWidth={1.3} />);
      const amid = a0 + da / 2;
      els.push(<text key="two-theta-l" x={cxPx + (arcR + 12) * Math.cos(amid)} y={cyPx + (arcR + 12) * Math.sin(amid) + 3} fontSize="10" fontFamily={MONO} fill={ACC} textAnchor="middle">2θ</text>);
    }
  } else {
    els.push(<circle key="pt" cx={cxPx} cy={cyPx} r={4} fill={ACC} />);
    els.push(<text key="pt-l" x={cxPx} y={cyPx - 12} fontSize="11" fontFamily={MONO} fill="var(--text-2)" textAnchor="middle">σ₁ = σ₂ = {fmtStress(C)} (τ = 0)</text>);
  }

  // --- stress-element schematic (original + rotated) ---
  const EW = 580;
  const EH = 210;
  const half = 40;
  const oCx = 150;
  const rCx = 430;
  const eCy = 92;
  const elEls: ReactElement[] = [];
  elEls.push(...stressElement(oCx, eCy, half, state.sigmaXMPa, state.sigmaYMPa, state.tauXYMPa,
    { x: 'σx', y: 'σy', t: 'τxy' }, 'orig'));
  elEls.push(<text key="orig-cap" x={oCx} y={eCy + half + 46} fontSize="11" fontFamily={MONO} fill="var(--text-2)" textAnchor="middle">Input element</text>);
  elEls.push(<text key="orig-cap2" x={oCx} y={eCy + half + 60} fontSize="9.5" fontFamily={MONO} fill="var(--text-faint)" textAnchor="middle">{`σx=${fmtStress(state.sigmaXMPa)}  σy=${fmtStress(state.sigmaYMPa)}  τxy=${fmtStress(state.tauXYMPa)}`}</text>);

  // rotated element — a CCW physical rotation θ is rotate(−θ) on screen (y-down).
  elEls.push(
    <g key="rot-grp" transform={`rotate(${(-rotationDeg).toFixed(2)}, ${rCx}, ${eCy})`}>
      {stressElement(rCx, eCy, half, transformed.sigmaXpMPa, transformed.sigmaYpMPa, transformed.tauXpYpMPa,
        { x: "σx′", y: "σy′", t: "τ′" }, 'rot')}
    </g>
  );
  elEls.push(<text key="rot-cap" x={rCx} y={eCy + half + 46} fontSize="11" fontFamily={MONO} fill={ACC} textAnchor="middle">{`Rotated θ = ${rotationDeg.toFixed(0)}°`}</text>);
  elEls.push(<text key="rot-cap2" x={rCx} y={eCy + half + 60} fontSize="9.5" fontFamily={MONO} fill="var(--text-faint)" textAnchor="middle">{`σx′=${fmtStress(transformed.sigmaXpMPa)}  σy′=${fmtStress(transformed.sigmaYpMPa)}  τ′=${fmtStress(transformed.tauXpYpMPa)}`}</text>);
  // rotation direction arc between the two elements
  elEls.push(<path key="rot-ind" d={`M${oCx + half + 70} ${eCy - 16} A 22 22 0 0 1 ${oCx + half + 70} ${eCy + 16}`} fill="none" stroke="var(--text-faint)" strokeWidth={1.2} />);
  elEls.push(...arrow(oCx + half + 70, eCy + 16, oCx + half + 74, eCy + 10, 'var(--text-faint)', 'rot-ind-h', 1.2));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 470 }}>
        {els}
        <text x={W / 2} y={H - 10} textAnchor="middle" fill="var(--text-faint)" fontSize="10" fontFamily={MONO}>
          σ–τ plane · true scale · X=(σx, τxy), Y=(σy, −τxy) · stresses in {stressUnit}
        </text>
      </svg>
      <svg viewBox={`0 0 ${EW} ${EH}`} width="100%" style={{ maxHeight: 220, marginTop: 4 }}>
        {elEls}
      </svg>
    </div>
  );
}
