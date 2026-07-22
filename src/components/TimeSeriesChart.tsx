import { useRef, useState, type MouseEvent } from 'react';

interface Series {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  timeS: number[];
  currentA: number[];
  series: Series[];
  ambientC: number;
  maxTempC: number;
}

const W = 900;
const H = 380;
const MARGIN = { left: 60, right: 60, top: 20, bottom: 44 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function niceTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const step = span / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) ticks.push(min + step * i);
  return ticks;
}

function pathFor(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
}

// Nearest index in a monotonically increasing array to a target value.
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

export default function TimeSeriesChart({ timeS, currentA, series, ambientC, maxTempC }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (timeS.length === 0) return null;

  const tMax = Math.max(...timeS, 0.001);
  const iMax = Math.max(...currentA, 1) * 1.1;
  const allTemps = series.flatMap(s => s.values).concat([ambientC, maxTempC]);
  const tempMinRaw = Math.min(...allTemps);
  const tempMaxRaw = Math.max(...allTemps);
  const tempPad = Math.max((tempMaxRaw - tempMinRaw) * 0.1, 2);
  const tempMin = tempMinRaw - tempPad;
  const tempMax = tempMaxRaw + tempPad;

  const xScale = (t: number) => MARGIN.left + (t / tMax) * PLOT_W;
  const yCurrentScale = (i: number) => MARGIN.top + (1 - i / iMax) * PLOT_H;
  const yTempScale = (temp: number) => MARGIN.top + (1 - (temp - tempMin) / (tempMax - tempMin)) * PLOT_H;

  const xs = timeS.map(xScale);
  const currentYs = currentA.map(yCurrentScale);
  const timeTicks = niceTicks(0, tMax, 5);
  const currentTicks = niceTicks(0, iMax, 4);
  const tempTicks = niceTicks(tempMin, tempMax, 4);

  // Maps the cursor through the SVG's actual screen transform (getScreenCTM),
  // rather than assuming rect.width scales 1:1 onto the viewBox width. The
  // container here (particularly the expanded chart modal, which forces the
  // svg to width:100%/height:100% independently) routinely has a different
  // aspect ratio than the 900x380 viewBox, so the default preserveAspectRatio
  // letterboxes the content — a plain rect.width-based scale factor then
  // drifts further from the truth the closer you get to the letterboxed
  // edges, making part of the plot un-hoverable / offset from the cursor.
  const handleMove = (e: MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(ctm.inverse());
    const tAtCursor = ((svgPoint.x - MARGIN.left) / PLOT_W) * tMax;
    setHoverIndex(nearestIndex(timeS, tAtCursor));
  };

  const hover = hoverIndex !== null ? {
    idx: hoverIndex,
    x: xs[hoverIndex],
    time: timeS[hoverIndex],
    current: currentA[hoverIndex],
  } : null;

  // Tooltip box sizing/position — clamped so it never clips off either edge.
  const tooltipLines = hover ? 2 + series.length : 0;
  const tooltipW = 210;
  const tooltipH = 20 + tooltipLines * 19;
  const tooltipX = hover ? Math.min(Math.max(hover.x + 10, MARGIN.left), W - MARGIN.right - tooltipW) : 0;
  const tooltipY = MARGIN.top + 6;

  // Worst point across the whole profile — hottest temperature reached by any node.
  const peakTempC = series.length > 0 ? Math.max(...series.flatMap(s => s.values)) : null;

  // Reference lines (ambient / limit / peak), each a dotted horizontal line at
  // its true temperature with a "name value" label at the right edge. Labels
  // are decluttered (pushed apart vertically) when two reference temps land
  // close together — e.g. a design that just clears its limit puts "Peak" and
  // "limit" right on top of each other — without moving the actual lines.
  const refLines = [
    { key: 'ambient', color: 'var(--text-faint)', dash: '3,3', text: `ambient ${fmt1(ambientC)}°C`, lineY: yTempScale(ambientC) },
    { key: 'limit', color: 'var(--neg)', dash: '3,3', text: `limit ${fmt1(maxTempC)}°C`, lineY: yTempScale(maxTempC) },
    ...(peakTempC !== null ? [{ key: 'peak', color: 'var(--warn)', dash: '5,3', text: `Peak ${fmt1(peakTempC)}°C`, lineY: yTempScale(peakTempC) }] : []),
  ];
  const refLabels = refLines
    .map(r => ({ ...r, labelY: r.lineY + 3 }))
    .sort((a, b) => a.labelY - b.labelY);
  for (let i = 1; i < refLabels.length; i++) {
    if (refLabels[i].labelY - refLabels[i - 1].labelY < 12) refLabels[i].labelY = refLabels[i - 1].labelY + 12;
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 420 }}>
      {/* gridlines */}
      {tempTicks.map((t, i) => (
        <line key={`grid-${i}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={yTempScale(t)} y2={yTempScale(t)} stroke="var(--border-subtle)" strokeWidth={1} />
      ))}

      {/* ambient / limit / peak reference lines */}
      {refLines.map(r => (
        <line key={`refline-${r.key}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={r.lineY} y2={r.lineY} stroke={r.color} strokeDasharray={r.dash} strokeWidth={1} />
      ))}
      {refLabels.map(r => (
        <text key={`reflabel-${r.key}`} x={W - MARGIN.right + 4} y={r.labelY} fontSize="9.5" fontWeight={r.key === 'peak' ? 700 : 400} fill={r.color} fontFamily="ui-monospace, monospace">{r.text}</text>
      ))}

      {/* current trace (left axis) */}
      <path d={pathFor(xs, currentYs)} fill="none" stroke="var(--blue)" strokeWidth={1.75} opacity={0.85} />

      {/* temperature traces (right axis) */}
      {series.map(s => (
        <path key={s.label} d={pathFor(xs, s.values.map(yTempScale))} fill="none" stroke={s.color} strokeWidth={2} />
      ))}

      {/* axes */}
      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={W - MARGIN.right} x2={W - MARGIN.right} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={H - MARGIN.bottom} y2={H - MARGIN.bottom} stroke="var(--border-strong)" strokeWidth={1} />

      {/* current ticks (left, blue) */}
      {currentTicks.map((c, i) => (
        <text key={`ci-${i}`} x={MARGIN.left - 8} y={yCurrentScale(c) + 3} textAnchor="end" fontSize="9.5" fill="var(--blue)" fontFamily="ui-monospace, monospace">
          {Math.round(c)}
        </text>
      ))}
      <text x={14} y={MARGIN.top - 6} fontSize="10" fill="var(--blue)" fontFamily="ui-monospace, monospace">A</text>

      {/* temp ticks (right) */}
      {tempTicks.map((t, i) => (
        <text key={`ct-${i}`} x={W - MARGIN.right + 8} y={yTempScale(t) + 3} textAnchor="start" fontSize="9.5" fill="var(--text-2)" fontFamily="ui-monospace, monospace">
          {t.toFixed(0)}
        </text>
      ))}
      <text x={W - MARGIN.right - 14} y={MARGIN.top - 6} textAnchor="end" fontSize="10" fill="var(--text-2)" fontFamily="ui-monospace, monospace">°C</text>

      {/* time ticks */}
      {timeTicks.map((t, i) => (
        <text key={`tt-${i}`} x={xScale(t)} y={H - MARGIN.bottom + 16} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
          {t.toFixed(0)}s
        </text>
      ))}
      <text x={(MARGIN.left + W - MARGIN.right) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        time (s)
      </text>

      {/* hover guide + markers + tooltip */}
      {hover && (
        <g pointerEvents="none">
          <line x1={hover.x} x2={hover.x} y1={MARGIN.top} y2={H - MARGIN.bottom} stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="2,2" />
          <circle cx={hover.x} cy={yCurrentScale(hover.current)} r={3.5} fill="var(--blue)" />
          {series.map(s => (
            <circle key={s.label} cx={hover.x} cy={yTempScale(s.values[hover.idx])} r={3.5} fill={s.color} />
          ))}

          <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="var(--bg-raised)" stroke="var(--border-strong)" strokeWidth={1} />
          <text x={tooltipX + 12} y={tooltipY + 20} fontSize="15" fontWeight={700} fill="var(--text)" fontFamily="ui-monospace, monospace">
            t = {fmt1(hover.time)}s
          </text>
          <text x={tooltipX + 12} y={tooltipY + 40} fontSize="13" fill="var(--blue)" fontFamily="ui-monospace, monospace">
            Current: {fmt1(hover.current)} A
          </text>
          {series.map((s, i) => (
            <text key={s.label} x={tooltipX + 12} y={tooltipY + 60 + i * 19} fontSize="13" fill={s.color} fontFamily="ui-monospace, monospace">
              {truncate(s.label, 18)}: {fmt1(s.values[hover.idx])}°C
            </text>
          ))}
        </g>
      )}

      {/* invisible full-plot-area overlay capturing hover — placed last so it sits on top */}
      <rect
        x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H}
        fill="transparent"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      />
    </svg>
  );
}

function fmt1(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}
