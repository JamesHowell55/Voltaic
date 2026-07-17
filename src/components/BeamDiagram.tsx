import type { BeamConfig, BeamLoad, BeamPoint } from '../lib/beamPhysics';

interface Props {
  config: BeamConfig;
  loads: BeamLoad[];
  points: BeamPoint[]; // for the optional deflected-shape overlay
  showDeflection: boolean;
}

const DRAW_W = 760;
const DRAW_H = 300;
const MARGIN = 56;
const BEAM_THICKNESS = 10;
const LOAD_ARROW_H = 44;
const SUPPORT_SIZE = 20;

type SupportKind = 'pin' | 'roller' | 'fixed';

function supportsFor(config: BeamConfig): { x: number; kind: SupportKind }[] {
  const { length: L, supportType, fixedEnd, propPosition, supportAPosition, supportBPosition } = config;
  switch (supportType) {
    case 'simply-supported':
      return [{ x: 0, kind: 'pin' }, { x: L, kind: 'roller' }];
    case 'overhanging':
      return [{ x: supportAPosition, kind: 'pin' }, { x: supportBPosition, kind: 'roller' }];
    case 'cantilever':
      return [{ x: fixedEnd === 'left' ? 0 : L, kind: 'fixed' }];
    case 'propped-cantilever':
      return [{ x: fixedEnd === 'left' ? 0 : L, kind: 'fixed' }, { x: propPosition, kind: 'roller' }];
    case 'fixed-fixed':
      return [{ x: 0, kind: 'fixed' }, { x: L, kind: 'fixed' }];
  }
}

export default function BeamDiagram({ config, loads, points, showDeflection }: Props) {
  const { length } = config;
  if (length <= 0) {
    return (
      <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 320 }}>
        <text x={DRAW_W / 2} y={DRAW_H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="13">Enter a beam length</text>
      </svg>
    );
  }

  const availW = DRAW_W - 2 * MARGIN;
  const scale = availW / length;
  const beamY = 128;
  const toPx = (x: number) => MARGIN + x * scale;

  const supports = supportsFor(config);
  const pointLoads = loads.filter((l) => l.kind === 'point-force');
  const momentLoads = loads.filter((l) => l.kind === 'point-moment');
  const distLoads = loads.filter((l) => l.kind === 'distributed');
  const maxPointMag = Math.max(1, ...pointLoads.map((l) => Math.abs(l.magnitude)));
  const maxDistMag = Math.max(1, ...distLoads.flatMap((l) => [Math.abs(l.magnitude), Math.abs(l.endMagnitude)]));

  const deflectionScale = (() => {
    if (!showDeflection || points.length === 0) return 0;
    const maxAbs = Math.max(...points.map((p) => Math.abs(p.deflection)), 1e-9);
    return 22 / maxAbs; // px per mm of deflection, so the largest sag/rise draws ~22px
  })();
  const deflPath =
    showDeflection && points.length > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toPx(p.x).toFixed(1)},${(beamY + p.deflection * deflectionScale).toFixed(1)}`).join(' ')
      : '';

  const dimY = beamY + SUPPORT_SIZE + 34;

  return (
    <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 320 }}>
      <defs>
        <marker id="beamArrowDown" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
          <path d="M0,0 L8,0 L4,8 Z" fill="var(--neg)" />
        </marker>
        <marker id="beamArrowMoment" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--warn)" />
        </marker>
        <pattern id="beamFixedHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="var(--bg-raised)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--border-strong)" strokeWidth="2" />
        </pattern>
      </defs>

      {/* beam */}
      <rect x={toPx(0)} y={beamY - BEAM_THICKNESS / 2} width={length * scale} height={BEAM_THICKNESS} rx={2} fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth={1.5} />

      {/* deflected shape overlay */}
      {deflPath && (
        <>
          <path d={deflPath} fill="none" stroke="var(--blue)" strokeWidth={1.75} strokeDasharray="5,3" opacity={0.9} />
          <text x={toPx(length) + 2} y={beamY + (points[points.length - 1].deflection * deflectionScale)} fontSize="9" fill="var(--blue)" fontFamily="ui-monospace, monospace">defl.</text>
        </>
      )}

      {/* supports */}
      {supports.map((s, i) => {
        const x = toPx(s.x);
        if (s.kind === 'fixed') {
          const isLeft = s.x <= length / 2;
          const hatchX = isLeft ? x - 14 : x;
          return (
            <g key={`sup-${i}`}>
              <line x1={x} y1={beamY - 22} x2={x} y2={beamY + 22} stroke="var(--border-strong)" strokeWidth={2.5} />
              <rect x={hatchX} y={beamY - 22} width={14} height={44} fill="url(#beamFixedHatch)" stroke="var(--border-strong)" strokeWidth={1} />
            </g>
          );
        }
        const triY = beamY + BEAM_THICKNESS / 2;
        return (
          <g key={`sup-${i}`}>
            <path d={`M${x},${triY} L${x - SUPPORT_SIZE / 2},${triY + SUPPORT_SIZE} L${x + SUPPORT_SIZE / 2},${triY + SUPPORT_SIZE} Z`} fill="var(--bg-raised)" stroke="var(--text-2)" strokeWidth={1.5} />
            {s.kind === 'roller' && (
              <>
                <circle cx={x - 6} cy={triY + SUPPORT_SIZE + 5} r={3.5} fill="var(--bg-raised)" stroke="var(--text-2)" strokeWidth={1.2} />
                <circle cx={x + 6} cy={triY + SUPPORT_SIZE + 5} r={3.5} fill="var(--bg-raised)" stroke="var(--text-2)" strokeWidth={1.2} />
                <line x1={x - 12} y1={triY + SUPPORT_SIZE + 9} x2={x + 12} y2={triY + SUPPORT_SIZE + 9} stroke="var(--text-2)" strokeWidth={1.2} />
              </>
            )}
          </g>
        );
      })}

      {/* point-force loads */}
      {pointLoads.map((l, i) => {
        const x = toPx(l.position);
        const h = LOAD_ARROW_H * (0.5 + 0.5 * (Math.abs(l.magnitude) / maxPointMag));
        const down = l.magnitude >= 0;
        const yTop = beamY - BEAM_THICKNESS / 2 - h - (down ? 0 : 0);
        return (
          <g key={`pf-${i}`}>
            {down ? (
              <line x1={x} y1={yTop} x2={x} y2={beamY - BEAM_THICKNESS / 2 - 3} stroke="var(--neg)" strokeWidth={2} markerEnd="url(#beamArrowDown)" />
            ) : (
              <line x1={x} y1={beamY + BEAM_THICKNESS / 2 + h} x2={x} y2={beamY + BEAM_THICKNESS / 2 + 3} stroke="var(--neg)" strokeWidth={2} markerEnd="url(#beamArrowDown)" transform={`rotate(180 ${x} ${beamY + BEAM_THICKNESS / 2 + h / 2})`} />
            )}
            <text x={x} y={yTop - 5} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="var(--neg)" fontFamily="ui-monospace, monospace">
              {fmt(l.magnitude)} N
            </text>
          </g>
        );
      })}

      {/* point moments */}
      {momentLoads.map((l, i) => {
        const x = toPx(l.position);
        const r = 16;
        const cw = l.magnitude >= 0;
        const sweep = cw ? 1 : 0;
        return (
          <g key={`pm-${i}`}>
            <path d={`M${x - r},${beamY - BEAM_THICKNESS / 2 - 20} A${r},${r} 0 1,${sweep} ${x + r},${beamY - BEAM_THICKNESS / 2 - 20}`} fill="none" stroke="var(--warn)" strokeWidth={2} markerEnd="url(#beamArrowMoment)" />
            <text x={x} y={beamY - BEAM_THICKNESS / 2 - 42} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="var(--warn)" fontFamily="ui-monospace, monospace">
              {fmt(l.magnitude)} N·mm
            </text>
          </g>
        );
      })}

      {/* distributed loads */}
      {distLoads.map((l, i) => {
        const xa = toPx(l.position);
        const xb = toPx(l.endPosition);
        const ha = LOAD_ARROW_H * 0.35 + LOAD_ARROW_H * 0.55 * (Math.abs(l.magnitude) / maxDistMag);
        const hb = LOAD_ARROW_H * 0.35 + LOAD_ARROW_H * 0.55 * (Math.abs(l.endMagnitude) / maxDistMag);
        const arrowCount = Math.max(3, Math.min(9, Math.round((xb - xa) / 26)));
        const arrows = Array.from({ length: arrowCount }, (_, k) => {
          const t = arrowCount === 1 ? 0 : k / (arrowCount - 1);
          const x = xa + t * (xb - xa);
          const h = ha + t * (hb - ha);
          return { x, h };
        });
        const topY = (h: number) => beamY - BEAM_THICKNESS / 2 - h;
        return (
          <g key={`dl-${i}`}>
            <path d={`M${xa},${topY(ha)} L${xb},${topY(hb)}`} stroke="var(--neg)" strokeWidth={1.25} fill="none" />
            {arrows.map((a, k) => (
              <line key={k} x1={a.x} y1={topY(a.h)} x2={a.x} y2={beamY - BEAM_THICKNESS / 2 - 3} stroke="var(--neg)" strokeWidth={1.5} markerEnd="url(#beamArrowDown)" opacity={0.85} />
            ))}
            <text x={xa} y={topY(ha) - 6} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="var(--neg)" fontFamily="ui-monospace, monospace">{fmt(l.magnitude)}</text>
            <text x={xb} y={topY(hb) - 6} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="var(--neg)" fontFamily="ui-monospace, monospace">{fmt(l.endMagnitude)}</text>
            <text x={(xa + xb) / 2} y={topY(Math.max(ha, hb)) - 20} textAnchor="middle" fontSize="9" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">N/mm</text>
          </g>
        );
      })}

      {/* span dimension */}
      <g fontSize="9.5" fill="var(--text-3)" fontFamily="ui-monospace, monospace">
        <line x1={toPx(0)} y1={dimY - 6} x2={toPx(0)} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
        <line x1={toPx(length)} y1={dimY - 6} x2={toPx(length)} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
        <line x1={toPx(0)} y1={dimY} x2={toPx(length)} y2={dimY} stroke="var(--border-strong)" strokeWidth={1} />
        <text x={(toPx(0) + toPx(length)) / 2} y={dimY + 15} textAnchor="middle">L = {length} mm</text>
      </g>

      <text x={DRAW_W / 2} y={DRAW_H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        loads shown positive-downward &middot; not to scale
      </text>
    </svg>
  );
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
