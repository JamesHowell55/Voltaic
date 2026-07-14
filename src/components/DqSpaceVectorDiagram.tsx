import type { ReactElement } from 'react';
import type { DqCurrent } from '../lib/focCurrentPhysics';

// Space-vector plot of the stator current in the rotor (d-q) synchronous
// reference frame: the d-axis (rotor flux axis) horizontal, the q-axis
// (torque-producing axis) vertical, both signed. The operating-point current
// vector is drawn from the origin with dashed projections onto each axis
// (Id, Iq), a dotted constant-|Is| circle, and — for a salient (IPM) motor —
// the MTPA locus with the equal-current MTPA point marked for comparison.
// Amplitude-invariant convention, so the plotted vector length is the PEAK
// phase current. Not to a fixed physical scale: the axes auto-scale to the
// data so the geometry is always legible.

interface Props {
  operating: DqCurrent;
  mtpaPoint: DqCurrent | null; // null for a surface-PM motor (MTPA is trivially Id=0)
  mtpaLocus: DqCurrent[]; // empty for a surface-PM motor
  magnitudePeakA: number;
}

const W = 460;
const H = 420;
const CX = 232;
const CY = 232;
const AXIS_HALF = 168; // px from origin to the axis arrowheads
const MONO = 'ui-monospace, monospace';

function fmtA(a: number): string {
  return `${a.toFixed(a >= 100 ? 0 : 1)} A`;
}

export default function DqSpaceVectorDiagram({ operating, mtpaPoint, mtpaLocus, magnitudePeakA }: Props) {
  // Scale so the largest of (|Id|, |Iq|, |Is|) reaches ~86% of the axis half-length.
  const extent = Math.max(Math.abs(operating.idA), Math.abs(operating.iqA), magnitudePeakA, 1e-6);
  const scale = (AXIS_HALF * 0.86) / extent;

  const px = (a: number) => CX + a * scale; // d-axis value -> x pixel
  const py = (a: number) => CY - a * scale; // q-axis value -> y pixel (up = +q)

  const opX = px(operating.idA);
  const opY = py(operating.iqA);

  const els: ReactElement[] = [];

  // Constant-|Is| circle through the operating point.
  els.push(
    <circle key="mag-circle" cx={CX} cy={CY} r={magnitudePeakA * scale} fill="none"
      stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="2 4" />
  );

  // Axes.
  for (const [x1, y1, x2, y2, key] of [
    [CX - AXIS_HALF, CY, CX + AXIS_HALF, CY, 'd'],
    [CX, CY + AXIS_HALF, CX, CY - AXIS_HALF, 'q'],
  ] as const) {
    els.push(<line key={`axis-${key}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-hover)" strokeWidth={1.4} />);
  }
  // Arrowheads (+d right, +q up).
  els.push(<path key="d-arrow" d={`M${CX + AXIS_HALF} ${CY} l-7 -4 l0 8 z`} fill="var(--border-hover)" />);
  els.push(<path key="q-arrow" d={`M${CX} ${CY - AXIS_HALF} l-4 7 l8 0 z`} fill="var(--border-hover)" />);
  els.push(<text key="d-lbl" x={CX + AXIS_HALF - 2} y={CY + 16} fontSize="12" fontFamily={MONO} fill="var(--text-2)" textAnchor="end">+d (flux)</text>);
  els.push(<text key="q-lbl" x={CX + 6} y={CY - AXIS_HALF + 12} fontSize="12" fontFamily={MONO} fill="var(--text-2)">+q (torque)</text>);
  els.push(<text key="d-neg" x={CX - AXIS_HALF + 2} y={CY - 8} fontSize="10.5" fontFamily={MONO} fill="var(--text-faint)">−d</text>);

  // MTPA locus (salient motors only).
  if (mtpaLocus.length > 1) {
    const path = mtpaLocus.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.idA).toFixed(1)} ${py(p.iqA).toFixed(1)}`).join(' ');
    els.push(<path key="mtpa-locus" d={path} fill="none" stroke="var(--accent-2, #fbbf24)" strokeWidth={1.6} strokeDasharray="5 3" opacity={0.9} />);
    els.push(<text key="mtpa-locus-lbl" x={px(mtpaLocus[mtpaLocus.length - 1].idA) - 6} y={py(mtpaLocus[mtpaLocus.length - 1].iqA) - 6} fontSize="10.5" fontFamily={MONO} fill="var(--accent-2, #fbbf24)" textAnchor="end">MTPA locus</text>);
  }

  // Projection lines from the operating point onto each axis.
  els.push(<line key="proj-d" x1={opX} y1={opY} x2={opX} y2={CY} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 3" />);
  els.push(<line key="proj-q" x1={opX} y1={opY} x2={CX} y2={opY} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 3" />);

  // Id / Iq tick markers on the axes.
  els.push(<circle key="id-dot" cx={opX} cy={CY} r={3} fill="var(--text-2)" />);
  els.push(<circle key="iq-dot" cx={CX} cy={opY} r={3} fill="var(--text-2)" />);
  els.push(<text key="id-val" x={opX} y={CY + (operating.iqA >= 0 ? 18 : -10)} fontSize="11" fontFamily={MONO} fill="var(--text-2)" textAnchor="middle">Id {fmtA(operating.idA)}</text>);
  els.push(<text key="iq-val" x={CX + (operating.idA >= 0 ? -8 : 8)} y={opY - 5} fontSize="11" fontFamily={MONO} fill="var(--text-2)" textAnchor={operating.idA >= 0 ? 'end' : 'start'}>Iq {fmtA(operating.iqA)}</text>);

  // MTPA comparison point at the same magnitude.
  if (mtpaPoint) {
    const mX = px(mtpaPoint.idA);
    const mY = py(mtpaPoint.iqA);
    els.push(<circle key="mtpa-pt" cx={mX} cy={mY} r={5} fill="none" stroke="var(--accent-2, #fbbf24)" strokeWidth={2} />);
  }

  // Current angle arc (from +d axis to the vector), when there's a meaningful magnitude.
  if (magnitudePeakA > 1e-6) {
    const ang = Math.atan2(operating.iqA, operating.idA);
    const arcR = 34;
    const sweep = ang < 0 ? 0 : 1;
    const endX = CX + arcR * Math.cos(ang);
    const endY = CY - arcR * Math.sin(ang);
    const large = Math.abs(ang) > Math.PI ? 1 : 0;
    els.push(<path key="angle-arc" d={`M${CX + arcR} ${CY} A${arcR} ${arcR} 0 ${large} ${sweep} ${endX.toFixed(1)} ${endY.toFixed(1)}`} fill="none" stroke="var(--text-3)" strokeWidth={1} />);
    const midAng = ang / 2;
    els.push(<text key="angle-lbl" x={CX + (arcR + 14) * Math.cos(midAng)} y={CY - (arcR + 14) * Math.sin(midAng) + 4} fontSize="10.5" fontFamily={MONO} fill="var(--text-3)" textAnchor="middle">γ</text>);
  }

  // The current vector itself (drawn last, on top).
  els.push(<line key="vec" x1={CX} y1={CY} x2={opX} y2={opY} stroke="var(--accent)" strokeWidth={2.4} />);
  if (magnitudePeakA > 1e-6) {
    const ang = Math.atan2(opY - CY, opX - CX);
    const ah = 10;
    const a1 = ang + 2.7;
    const a2 = ang - 2.7;
    els.push(<path key="vec-head" d={`M${opX} ${opY} L${(opX + ah * Math.cos(a1)).toFixed(1)} ${(opY + ah * Math.sin(a1)).toFixed(1)} L${(opX + ah * Math.cos(a2)).toFixed(1)} ${(opY + ah * Math.sin(a2)).toFixed(1)} z`} fill="var(--accent)" />);
  }
  els.push(<text key="vec-lbl" x={opX + (operating.idA >= 0 ? 8 : -8)} y={opY - 8} fontSize="11.5" fontFamily={MONO} fill="var(--accent)" fontWeight={600} textAnchor={operating.idA >= 0 ? 'start' : 'end'}>Is {fmtA(magnitudePeakA)}</text>);

  // Origin dot.
  els.push(<circle key="origin" cx={CX} cy={CY} r={2.5} fill="var(--text-2)" />);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 420 }}>
      {els}
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="var(--text-faint)" fontSize="10" fontFamily={MONO}>
        rotor (d-q) frame · vector length = peak phase current · not to a fixed scale
      </text>
    </svg>
  );
}
