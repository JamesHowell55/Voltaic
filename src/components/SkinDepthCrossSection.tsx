interface Props {
  radiusMm: number;
  skinDepthMm: number; // may be Infinity (DC / very low frequency — current fills the whole conductor)
  isIllustrative: boolean; // true when no real conductor size was entered — radiusMm was synthesized just to draw a visible ring
}

const DRAW_W = 400;
const DRAW_H = 320;
const CENTER_X = DRAW_W / 2;
const CENTER_Y = 145;
const OUTER_PX = 110;

// Round-conductor cross-section: the current-carrying annulus (from the
// surface inward by one skin depth) is shaded, the low-current core is
// dimmed. Only the RATIO of skin depth to radius is drawn to scale (both are
// mapped onto a fixed-size circle) — skin depth is a material/frequency
// property independent of the conductor's actual size, so there is no single
// "correct" absolute px/mm scale to use here.
export default function SkinDepthCrossSection({ radiusMm, skinDepthMm, isIllustrative }: Props) {
  const ratio = isFinite(skinDepthMm) ? Math.min(Math.max(skinDepthMm / Math.max(radiusMm, 1e-9), 0), 1) : 1;
  const innerPx = OUTER_PX * (1 - ratio);
  const fillsWholeConductor = ratio >= 1;

  return (
    <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 340 }}>
      <defs>
        <pattern id="skinCoreHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--text-3)" opacity="0.08" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--text-3)" strokeWidth="1.2" opacity="0.35" />
        </pattern>
      </defs>

      {/* outer conductor, filled as the active region */}
      <circle cx={CENTER_X} cy={CENTER_Y} r={OUTER_PX} fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth={1.5} />

      {/* dimmed low-current core, only when skin depth doesn't already fill the conductor */}
      {!fillsWholeConductor && (
        <circle cx={CENTER_X} cy={CENTER_Y} r={innerPx} fill="url(#skinCoreHatch)" stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 2" />
      )}

      {/* radius callout */}
      <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X + OUTER_PX} y2={CENTER_Y} stroke="var(--text-2)" strokeWidth={1} strokeDasharray="2 2" />
      <text x={CENTER_X + OUTER_PX / 2} y={CENTER_Y - 6} textAnchor="middle" fontSize="9.5" fill="var(--text-2)" fontFamily="ui-monospace, monospace">
        r = {radiusMm.toFixed(radiusMm < 10 ? 2 : 1)} mm{isIllustrative ? ' (illustrative)' : ''}
      </text>

      {/* skin-depth annulus callout */}
      {!fillsWholeConductor && (
        <>
          <line x1={CENTER_X + innerPx} y1={CENTER_Y + 4} x2={CENTER_X + innerPx} y2={CENTER_Y + 28} stroke="var(--accent)" strokeWidth={1} />
          <line x1={CENTER_X + OUTER_PX} y1={CENTER_Y + 4} x2={CENTER_X + OUTER_PX} y2={CENTER_Y + 28} stroke="var(--accent)" strokeWidth={1} />
          <line x1={CENTER_X + innerPx} y1={CENTER_Y + 22} x2={CENTER_X + OUTER_PX} y2={CENTER_Y + 22} stroke="var(--accent)" strokeWidth={1} markerStart="url(#skinArrowStart)" markerEnd="url(#skinArrowEnd)" />
          <text x={(CENTER_X + innerPx + CENTER_X + OUTER_PX) / 2} y={CENTER_Y + 40} textAnchor="middle" fontSize="9.5" fill="var(--accent)" fontFamily="ui-monospace, monospace">
            δ = {isFinite(skinDepthMm) ? skinDepthMm.toFixed(skinDepthMm < 10 ? 3 : 1) : '∞'} mm
          </text>
        </>
      )}

      <defs>
        <marker id="skinArrowStart" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M5,1 L1,3 L5,5" fill="none" stroke="var(--accent)" strokeWidth={1} />
        </marker>
        <marker id="skinArrowEnd" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M1,1 L5,3 L1,5" fill="none" stroke="var(--accent)" strokeWidth={1} />
        </marker>
      </defs>

      {/* legend */}
      <g fontSize="9.5" fontFamily="ui-monospace, monospace">
        <rect x={30} y={260} width={12} height={12} fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth={1} />
        <text x={48} y={270} fill="var(--text-2)">Current-carrying region (surface → one skin depth in)</text>
        {!fillsWholeConductor && (
          <>
            <rect x={30} y={280} width={12} height={12} fill="url(#skinCoreHatch)" stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 2" />
            <text x={48} y={290} fill="var(--text-2)">Low-current core</text>
          </>
        )}
      </g>

      {fillsWholeConductor && (
        <text x={CENTER_X} y={CENTER_Y + 5} textAnchor="middle" fontSize="9.5" fill="var(--accent)" fontFamily="ui-monospace, monospace">
          δ ≥ r — current fills the conductor
        </text>
      )}

      <text x={DRAW_W / 2} y={DRAW_H - 10} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        round conductor, cross-section · only the δ:r ratio is to scale
      </text>
    </svg>
  );
}
