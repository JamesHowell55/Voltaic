import { useRef, useState, type MouseEvent } from 'react';

interface Props {
  xs: number[]; // mm, beam position
  values: number[]; // same length as xs
  color: string; // CSS color (var(--...) or literal)
  unit: string; // e.g. 'N', 'N·mm', 'mm'
  valueLabel: string; // e.g. 'Shear', 'Moment', 'Deflection'
  decimals?: number;
}

const W = 900;
const H = 260;
const MARGIN = { left: 66, right: 20, top: 16, bottom: 34 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function niceTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

function pathFor(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
}

function nearestIndex(values: number[], target: number): number {
  let lo = 0;
  let hi = values.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(values[lo - 1] - target) <= Math.abs(values[lo] - target)) return lo - 1;
  return lo;
}

export default function BeamResponseChart({ xs, values, color, unit, valueLabel, decimals = 1 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (xs.length === 0) return null;

  const xMax = Math.max(...xs, 0.001);
  const rawMin = Math.min(...values, 0);
  const rawMax = Math.max(...values, 0);
  const pad = Math.max((rawMax - rawMin) * 0.12, Math.abs(rawMax || rawMin || 1) * 0.05, 1e-9);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xScale = (x: number) => MARGIN.left + (x / xMax) * PLOT_W;
  const yScale = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;
  const zeroY = yScale(0);

  const pxXs = xs.map(xScale);
  const pxYs = values.map(yScale);
  const linePath = pathFor(pxXs, pxYs);
  const areaPath = `${linePath} L${pxXs[pxXs.length - 1].toFixed(1)},${zeroY.toFixed(1)} L${pxXs[0].toFixed(1)},${zeroY.toFixed(1)} Z`;

  const xTicks = niceTicks(0, xMax, 5);
  const yTicks = niceTicks(yMin, yMax, 4);

  const handleMove = (e: MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const xInViewBox = (e.clientX - rect.left) * scaleX;
    const xAtCursor = ((xInViewBox - MARGIN.left) / PLOT_W) * xMax;
    setHoverIndex(nearestIndex(xs, xAtCursor));
  };

  const hover = hoverIndex !== null ? { idx: hoverIndex, x: pxXs[hoverIndex], xVal: xs[hoverIndex], value: values[hoverIndex] } : null;
  const tooltipW = 168;
  const tooltipH = 46;
  const tooltipX = hover ? Math.min(Math.max(hover.x + 10, MARGIN.left), W - MARGIN.right - tooltipW) : 0;
  const tooltipY = MARGIN.top + 6;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 280 }}>
      {yTicks.map((t, i) => (
        <line key={`grid-${i}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={yScale(t)} y2={yScale(t)} stroke="var(--border-subtle)" strokeWidth={1} />
      ))}

      <path d={areaPath} fill={color} opacity={0.12} />
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={zeroY} y2={zeroY} stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="3,3" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.9} />

      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={H - MARGIN.bottom} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />

      {yTicks.map((t, i) => (
        <text key={`yt-${i}`} x={MARGIN.left - 8} y={yScale(t) + 3} textAnchor="end" fontSize="9.5" fill="var(--text-2)" fontFamily="ui-monospace, monospace">
          {t.toFixed(decimals)}
        </text>
      ))}
      <text x={14} y={MARGIN.top - 4} fontSize="9.5" fill="var(--text-3)" fontFamily="ui-monospace, monospace">{unit}</text>

      {xTicks.map((t, i) => (
        <text key={`xt-${i}`} x={xScale(t)} y={H - MARGIN.bottom + 16} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
          {t.toFixed(0)}
        </text>
      ))}
      <text x={(MARGIN.left + W - MARGIN.right) / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        x (mm)
      </text>

      {hover && (
        <g pointerEvents="none">
          <line x1={hover.x} x2={hover.x} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="2,2" />
          <circle cx={hover.x} cy={yScale(hover.value)} r={3.5} fill={color} />
          <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="var(--bg-raised)" stroke="var(--border-strong)" strokeWidth={1} />
          <text x={tooltipX + 10} y={tooltipY + 18} fontSize="12" fontWeight={700} fill="var(--text)" fontFamily="ui-monospace, monospace">
            x = {hover.xVal.toFixed(0)} mm
          </text>
          <text x={tooltipX + 10} y={tooltipY + 35} fontSize="12" fill={color} fontFamily="ui-monospace, monospace">
            {valueLabel}: {hover.value.toLocaleString(undefined, { maximumFractionDigits: decimals })} {unit}
          </text>
        </g>
      )}

      <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} fill="transparent" onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)} />
    </svg>
  );
}
