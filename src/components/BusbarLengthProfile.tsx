import type { SingleSectionInput } from '../lib/busbarPhysics';

interface Props {
  sections: SingleSectionInput[];
}

const DRAW_W = 700;
const DRAW_H = 220;
const MARGIN = 48;

export default function BusbarLengthProfile({ sections }: Props) {
  if (sections.length === 0 || sections.some(s => s.width <= 0 || s.length <= 0)) {
    return (
      <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 240 }}>
        <text x={DRAW_W / 2} y={DRAW_H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="13">
          Add at least one section with positive width and length
        </text>
      </svg>
    );
  }

  const totalLength = sections.reduce((s, sec) => s + sec.length, 0);
  const maxWidth = Math.max(...sections.map(s => s.width));

  const availW = DRAW_W - 2 * MARGIN;
  const availH = DRAW_H - 2 * MARGIN - 20;
  const scale = Math.min(availW / totalLength, availH / maxWidth);

  const centerY = MARGIN + availH / 2;
  let cursor = 0;
  const rects = sections.map((s, i) => {
    const w = s.length * scale;
    const h = s.width * scale;
    const x = MARGIN + cursor * scale;
    const y = centerY - h / 2;
    cursor += s.length;
    return { key: s.id, x, y, w, h, section: s, index: i };
  });

  const dimY = centerY + maxWidth * scale / 2 + 24;

  return (
    <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 240 }}>
      {rects.map(r => (
        <rect key={r.key} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth={1.5} rx={1} />
      ))}

      {/* current-flow arrow */}
      <line x1={MARGIN} x2={MARGIN + totalLength * scale} y1={centerY} y2={centerY} stroke="var(--text-faint)" strokeDasharray="2,3" strokeWidth={1} />

      {/* per-section length dimensions */}
      {rects.map(r => (
        <g key={`dim-${r.key}`} fontSize="9.5" fill="var(--text-3)" fontFamily="ui-monospace, monospace">
          <line x1={r.x} y1={dimY - 6} x2={r.x} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
          <line x1={r.x + r.w} y1={dimY - 6} x2={r.x + r.w} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
          <line x1={r.x} y1={dimY} x2={r.x + r.w} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
          <text x={r.x + r.w / 2} y={dimY + 13} textAnchor="middle">
            {r.section.length} mm
          </text>
          <text x={r.x + r.w / 2} y={r.y - 6} textAnchor="middle" fill="var(--text-2)">
            {r.section.width}mm
          </text>
        </g>
      ))}

      <text x={DRAW_W / 2} y={DRAW_H - 6} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        plan view · {sections.length} section{sections.length > 1 ? 's' : ''} · current flows left to right · dimensions in mm
      </text>
    </svg>
  );
}
