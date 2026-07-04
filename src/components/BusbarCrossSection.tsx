import type { BarSection, Orientation } from '../lib/busbarPhysics';

interface Props {
  bars: BarSection[];
  orientation: Orientation;
}

const DRAW_W = 480;
const DRAW_H = 300;
const MARGIN = 56;

export default function BusbarCrossSection({ bars, orientation }: Props) {
  if (bars.length === 0 || bars.some(b => b.width <= 0 || b.thickness <= 0)) {
    return (
      <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 300 }}>
        <text x={DRAW_W / 2} y={DRAW_H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="13">
          Add at least one bar section with positive dimensions
        </text>
      </svg>
    );
  }

  const isVertical = orientation === 'vertical';
  const totalSpan = bars.reduce((s, b) => s + b.thickness, 0) + bars.slice(0, -1).reduce((s, b) => s + b.gapAfter, 0);
  const maxCross = Math.max(...bars.map(b => b.width));

  const availW = DRAW_W - 2 * MARGIN;
  const availH = DRAW_H - 2 * MARGIN;
  const spanMm = isVertical ? totalSpan : maxCross;
  const crossMm = isVertical ? maxCross : totalSpan;
  const scale = Math.min(availW / spanMm, availH / crossMm, 12);

  const spanPx = spanMm * scale;
  const crossPx = crossMm * scale;
  const originX = (DRAW_W - spanPx) / 2;
  const originY = (DRAW_H - crossPx) / 2;

  let cursor = 0;
  const rects = bars.map((bar) => {
    const thickPx = bar.thickness * scale;
    const widthPx = bar.width * scale;
    const pos = cursor;
    cursor += bar.thickness + bar.gapAfter;

    if (isVertical) {
      const x = originX + pos * scale;
      const y = originY + (crossPx - widthPx); // bottom-aligned
      return { key: bar.id, x, y, w: thickPx, h: widthPx, bar, dimLabel: `${bar.thickness} mm`, dimAxis: 'x' as const };
    } else {
      const y = originY + pos * scale;
      const x = originX;
      return { key: bar.id, x, y, w: widthPx, h: thickPx, bar, dimLabel: `${bar.thickness} mm`, dimAxis: 'y' as const };
    }
  });

  const baseY = originY + crossPx + 26;
  const baseX = originX - 26;

  return (
    <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 300 }}>
      {rects.map(r => (
        <g key={r.key}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill="var(--accent-glow)"
            stroke="var(--accent)"
            strokeWidth={1.5}
            rx={1}
          />
        </g>
      ))}

      {/* per-bar thickness dimensions along the stacking axis */}
      {isVertical &&
        rects.map(r => (
          <g key={`dim-${r.key}`} fontSize="9.5" fill="var(--text-3)" fontFamily="ui-monospace, monospace">
            <line x1={r.x} y1={baseY - 6} x2={r.x} y2={baseY} stroke="var(--border-strong)" strokeWidth={1} />
            <line x1={r.x + r.w} y1={baseY - 6} x2={r.x + r.w} y2={baseY} stroke="var(--border-strong)" strokeWidth={1} />
            <line x1={r.x} y1={baseY} x2={r.x + r.w} y2={baseY} stroke="var(--border-strong)" strokeWidth={1} />
            <text x={r.x + r.w / 2} y={baseY + 13} textAnchor="middle">
              {r.bar.thickness}
            </text>
          </g>
        ))}

      {!isVertical &&
        rects.map(r => (
          <g key={`dim-${r.key}`} fontSize="9.5" fill="var(--text-3)" fontFamily="ui-monospace, monospace">
            <line x1={baseX - 6} y1={r.y} x2={baseX} y2={r.y} stroke="var(--border-strong)" strokeWidth={1} />
            <line x1={baseX - 6} y1={r.y + r.h} x2={baseX} y2={r.y + r.h} stroke="var(--border-strong)" strokeWidth={1} />
            <line x1={baseX} y1={r.y} x2={baseX} y2={r.y + r.h} stroke="var(--border-strong)" strokeWidth={1} />
            <text x={baseX - 10} y={r.y + r.h / 2 + 3} textAnchor="end">
              {r.bar.thickness}
            </text>
          </g>
        ))}

      {/* overall cross-dimension (bar height / width) */}
      <g fontSize="10" fill="var(--text-2)" fontFamily="ui-monospace, monospace">
        {isVertical ? (
          <>
            <line x1={originX - 14} y1={originY} x2={originX - 14} y2={originY + crossPx} stroke="var(--border-hover)" strokeWidth={1} />
            <text x={originX - 20} y={originY + crossPx / 2} textAnchor="end" transform={`rotate(-90 ${originX - 20} ${originY + crossPx / 2})`}>
              {maxCross} mm
            </text>
          </>
        ) : (
          <>
            <line x1={originX} y1={originY - 14} x2={originX + spanPx} y2={originY - 14} stroke="var(--border-hover)" strokeWidth={1} />
            <text x={originX + spanPx / 2} y={originY - 20} textAnchor="middle">
              {maxCross} mm
            </text>
          </>
        )}
      </g>

      <text x={DRAW_W / 2} y={DRAW_H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        {bars.length} bar{bars.length > 1 ? 's' : ''} · {orientation === 'vertical' ? 'edge-mounted' : 'flat-mounted'} · dimensions in mm
      </text>
    </svg>
  );
}
