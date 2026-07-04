import { breakdownVoltage, paschenMinimum } from '../lib/paschen';

interface Props {
  currentPd: number; // kPa·cm, the design's actual operating point
  currentV: number;  // V, breakdown voltage at that operating point
  requiredV: number; // V, the withstand voltage the design must meet
}

const W = 720;
const H = 340;
const MARGIN = { left: 60, right: 20, top: 20, bottom: 44 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

const PD_MIN = 0.05;
const ALL_PD_TICKS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

function niceVTicks(max: number): number[] {
  const rawStep = max / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  const step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  return ticks;
}

export default function PaschenChart({ currentPd, currentV, requiredV }: Props) {
  const { pd: pdMin, vMin } = paschenMinimum();

  const pdMax = Math.max(20, currentPd * 1.3);
  const vMax = Math.max(9000, currentV * 1.15, isFinite(requiredV) ? requiredV * 1.15 : 0);

  const xScale = (pd: number) => {
    const t = (Math.log10(pd) - Math.log10(PD_MIN)) / (Math.log10(pdMax) - Math.log10(PD_MIN));
    return MARGIN.left + Math.max(0, Math.min(1, t)) * PLOT_W;
  };
  const yScale = (v: number) => MARGIN.top + (1 - Math.min(v, vMax) / vMax) * PLOT_H;

  const points: string[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const logPd = Math.log10(PD_MIN) + (i / steps) * (Math.log10(pdMax) - Math.log10(PD_MIN));
    const pd = Math.pow(10, logPd);
    const v = breakdownVoltage(1, pd);
    if (v > 0) points.push(`${i === 0 ? 'M' : 'L'}${xScale(pd).toFixed(1)},${yScale(v).toFixed(1)}`);
  }

  const pdTicks = ALL_PD_TICKS.filter(t => t >= PD_MIN && t <= pdMax * 1.001);
  const vTicks = niceVTicks(vMax);
  const requiredInRange = requiredV <= vMax;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 380 }}>
      {vTicks.map((v, i) => (
        <line key={`g-${i}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={yScale(v)} y2={yScale(v)} stroke="var(--border-subtle)" strokeWidth={1} />
      ))}

      {/* required voltage reference line */}
      {requiredInRange && (
        <>
          <line x1={MARGIN.left} x2={W - MARGIN.right} y1={yScale(requiredV)} y2={yScale(requiredV)} stroke="var(--neg)" strokeDasharray="3,3" strokeWidth={1} />
          <text x={W - MARGIN.right - 4} y={yScale(requiredV) - 4} textAnchor="end" fontSize="9.5" fill="var(--neg)" fontFamily="ui-monospace, monospace">required</text>
        </>
      )}

      {/* Paschen curve */}
      <path d={points.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2} />

      {/* minimum marker */}
      <circle cx={xScale(pdMin)} cy={yScale(vMin)} r={4} fill="var(--warn)" />
      <text x={xScale(pdMin)} y={yScale(vMin) - 10} textAnchor="middle" fontSize="9.5" fill="var(--warn)" fontFamily="ui-monospace, monospace">
        Paschen min ({vMin.toFixed(0)} V)
      </text>

      {/* current operating point */}
      <circle cx={xScale(currentPd)} cy={yScale(currentV)} r={5} fill="var(--blue)" stroke="var(--bg)" strokeWidth={1.5} />
      <text x={xScale(currentPd)} y={yScale(currentV) - 12} textAnchor="middle" fontSize="10" fill="var(--blue)" fontFamily="ui-monospace, monospace">
        your design
      </text>

      {/* axes */}
      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={H - MARGIN.bottom} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />

      {vTicks.map((v, i) => (
        <text key={`vt-${i}`} x={MARGIN.left - 8} y={yScale(v) + 3} textAnchor="end" fontSize="9.5" fill="var(--text-2)" fontFamily="ui-monospace, monospace">{v}</text>
      ))}
      <text x={16} y={MARGIN.top - 6} fontSize="10" fill="var(--text-2)" fontFamily="ui-monospace, monospace">V</text>

      {pdTicks.map((pd, i) => (
        <text key={`pt-${i}`} x={xScale(pd)} y={H - MARGIN.bottom + 16} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">{pd}</text>
      ))}
      <text x={(MARGIN.left + W - MARGIN.right) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        p·d (kPa·cm, log scale)
      </text>
    </svg>
  );
}
