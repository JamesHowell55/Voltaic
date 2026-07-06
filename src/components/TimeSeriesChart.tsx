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

export default function TimeSeriesChart({ timeS, currentA, series, ambientC, maxTempC }: Props) {
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 420 }}>
      {/* gridlines */}
      {tempTicks.map((t, i) => (
        <line key={`grid-${i}`} x1={MARGIN.left} x2={W - MARGIN.right} y1={yTempScale(t)} y2={yTempScale(t)} stroke="var(--border-subtle)" strokeWidth={1} />
      ))}

      {/* ambient + max temp reference lines */}
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={yTempScale(ambientC)} y2={yTempScale(ambientC)} stroke="var(--text-faint)" strokeDasharray="3,3" strokeWidth={1} />
      <text x={W - MARGIN.right + 4} y={yTempScale(ambientC) + 3} fontSize="9.5" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">ambient</text>
      <line x1={MARGIN.left} x2={W - MARGIN.right} y1={yTempScale(maxTempC)} y2={yTempScale(maxTempC)} stroke="var(--neg)" strokeDasharray="3,3" strokeWidth={1} />
      <text x={W - MARGIN.right + 4} y={yTempScale(maxTempC) + 3} fontSize="9.5" fill="var(--neg)" fontFamily="ui-monospace, monospace">limit</text>

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
    </svg>
  );
}
