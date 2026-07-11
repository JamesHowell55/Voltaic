import type { ReactElement } from 'react';
import type { NutPreset, WasherPreset } from '../lib/fastenerHardware';
import type { ClampedSectionInput, FrustumSegment, GeometryValidity, ThreadEngagementMode } from '../lib/boltedJointPhysics';

interface Props {
  nominalDiameterMm: number;
  headFlatsAcrossMm: number;
  clampedSections: ClampedSectionInput[];
  underHeadWasher: WasherPreset | null;
  underNutWasher: WasherPreset | null;
  nut: NutPreset | null; // null -> tapped/insert termination, no nut drawn
  frustumSegments: FrustumSegment[];
  geometryValidity: GeometryValidity | null;
  threadEngagementMode?: ThreadEngagementMode;
  engagementLengthMm?: number; // tapped or threadedInsert only
}

const DRAW_W = 480;
const DRAW_H = 380;
const MARGIN = 60;
const TAN30 = 0.5774;

export default function BoltedJointCrossSection({
  nominalDiameterMm,
  headFlatsAcrossMm,
  clampedSections,
  underHeadWasher,
  underNutWasher,
  nut,
  frustumSegments,
  geometryValidity,
  threadEngagementMode,
  engagementLengthMm,
}: Props) {
  if (clampedSections.length === 0 || clampedSections.some((s) => s.thicknessMm <= 0 || s.outerDiameterMm <= 0)) {
    return (
      <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 380 }}>
        <text x={DRAW_W / 2} y={DRAW_H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="13">
          Add at least one clamped section with positive dimensions
        </text>
      </svg>
    );
  }

  const d = nominalDiameterMm;
  const headHeightMm = d * 0.65;
  const nutHeightMm = nut?.heightMm ?? 0;
  const headWasherThicknessMm = underHeadWasher?.thicknessMm ?? 0;
  const nutWasherThicknessMm = underNutWasher?.thicknessMm ?? 0;
  const totalStackMm = clampedSections.reduce((s, c) => s + c.thicknessMm, 0);
  const totalDrawHeightMm = headHeightMm + headWasherThicknessMm + totalStackMm + nutWasherThicknessMm + nutHeightMm;

  const maxRadiusMm = Math.max(
    headFlatsAcrossMm,
    underHeadWasher?.odMm ?? 0,
    underNutWasher?.odMm ?? 0,
    nut?.flatsAcrossMm ?? 0,
    ...clampedSections.map((s) => s.outerDiameterMm)
  ) / 2;

  const availW = DRAW_W - 2 * MARGIN;
  const availH = DRAW_H - 2 * MARGIN;
  const scale = Math.min(availW / (2 * maxRadiusMm), availH / totalDrawHeightMm, 14);

  const centerX = DRAW_W / 2;
  let cursorY = MARGIN;

  const invalidHole = geometryValidity ? !geometryValidity.holeClearanceOk : false;
  const invalidEngagement = geometryValidity ? !geometryValidity.engagementLengthOk : false;
  const isNoNutMode = threadEngagementMode !== undefined && threadEngagementMode !== 'nutAndBolt';

  const elements: ReactElement[] = [];
  const dimTicks: { y: number; label: string }[] = [];

  const drawRect = (heightMm: number, widthMm: number, fill: string, stroke: string, dashed = false) => {
    const heightPx = heightMm * scale;
    const widthPx = widthMm * scale;
    const x = centerX - widthPx / 2;
    const y = cursorY;
    elements.push(
      <rect
        key={`el-${elements.length}`}
        x={x}
        y={y}
        width={widthPx}
        height={heightPx}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '3,2' : undefined}
        rx={1}
      />
    );
    cursorY += heightPx;
    return { x, y, widthPx, heightPx };
  };

  // Head
  drawRect(headHeightMm, headFlatsAcrossMm, 'var(--accent-glow)', 'var(--accent)');
  dimTicks.push({ y: cursorY, label: `head` });

  // Head washer
  if (underHeadWasher) {
    drawRect(headWasherThicknessMm, underHeadWasher.odMm, 'var(--border-strong)', 'var(--text-3)');
  }

  const stackTopY = cursorY;

  // Clamped sections
  const sectionYs: { y0: number; y1: number; section: ClampedSectionInput }[] = [];
  clampedSections.forEach((section, i) => {
    const isInvalidHole = invalidHole && (i === 0 || i === clampedSections.length - 1);
    const r = drawRect(section.thicknessMm, section.outerDiameterMm, 'var(--card-bg-2, rgba(255,255,255,0.03))', isInvalidHole ? 'var(--neg)' : 'var(--border-hover)');
    sectionYs.push({ y0: r.y, y1: r.y + r.heightPx, section });
  });

  const stackBottomY = cursorY;
  const lastSectionTopY = sectionYs[sectionYs.length - 1].y0;
  const lastSectionHeightPx = sectionYs[sectionYs.length - 1].y1 - sectionYs[sectionYs.length - 1].y0;

  // Nut washer
  if (underNutWasher) {
    drawRect(nutWasherThicknessMm, underNutWasher.odMm, 'var(--border-strong)', 'var(--text-3)');
  }

  // Nut (or tapped termination — no element drawn, bolt just ends within the stack)
  if (nut) {
    drawRect(nutHeightMm, nut.flatsAcrossMm, 'var(--accent-glow)', invalidEngagement ? 'var(--neg)' : 'var(--accent)');
  }

  // Representative embedment depth for tapped/threaded-insert modes — how far the
  // bolt actually penetrates the last clamped section, capped to that section's own
  // thickness (a longer entered engagement is a separate validity warning shown
  // elsewhere, not something this drawing should extend past the material).
  const cappedEngagementPx = isNoNutMode && engagementLengthMm
    ? Math.min(Math.max(engagementLengthMm, 0), sectionYs[sectionYs.length - 1].section.thicknessMm) * scale
    : lastSectionHeightPx;
  const boltTipY = isNoNutMode ? lastSectionTopY + cappedEngagementPx : cursorY;

  // Bolt shank/thread — a representative length: for nut & bolt it runs the full
  // stack through the nut; for tapped/threaded-insert it stops where the bolt
  // actually embeds, with a small tapered tip rather than running to the bottom of
  // the tapped member regardless of how deep the thread engagement really is.
  const shankWidthPx = d * scale;
  const tipTaperPx = Math.min(d * 0.4, 10) * scale;
  const shankElements: ReactElement[] = [
    <rect key="shank" x={centerX - shankWidthPx / 2} y={MARGIN} width={shankWidthPx} height={Math.max(0, boltTipY - MARGIN - (isNoNutMode ? tipTaperPx : 0))} fill="var(--accent-border)" stroke="var(--accent)" strokeWidth={1} opacity={0.5} />,
  ];
  if (isNoNutMode) {
    const taperTopY = boltTipY - tipTaperPx;
    shankElements.push(
      <polygon
        key="shank-tip"
        points={`${centerX - shankWidthPx / 2},${taperTopY} ${centerX + shankWidthPx / 2},${taperTopY} ${centerX},${boltTipY}`}
        fill="var(--accent-border)"
        stroke="var(--accent)"
        strokeWidth={1}
        opacity={0.5}
      />
    );
  }
  elements.unshift(...shankElements);

  // Threaded insert (helicoil-style) — a distinct coil/sleeve within the engagement
  // zone at the TOP of the last clamped section (where the bolt actually enters the
  // tapped material), drawn on top of everything else.
  if (threadEngagementMode === 'threadedInsert' && engagementLengthMm && engagementLengthMm > 0) {
    const insertWidthPx = (d + 1) * scale;
    const insertHeightPx = cappedEngagementPx;
    elements.push(
      <rect
        key="insert"
        x={centerX - insertWidthPx / 2}
        y={lastSectionTopY}
        width={insertWidthPx}
        height={insertHeightPx}
        fill="none"
        stroke="var(--warn)"
        strokeWidth={1.5}
        strokeDasharray="1,2"
        rx={insertWidthPx / 2}
      />
    );
    elements.push(
      <text key="insert-label" x={centerX + insertWidthPx / 2 + 6} y={lastSectionTopY + insertHeightPx / 2 + 3} fontSize="9" fill="var(--warn)" fontFamily="ui-monospace, monospace">
        insert
      </text>
    );
  }

  // Frustum cones (drawn behind clamped-section rects, in front of the shank)
  const frustumEls: ReactElement[] = [];
  const headSegs = frustumSegments.filter((s) => s.fromBearingFace === 'head');
  const nutSegs = frustumSegments.filter((s) => s.fromBearingFace === 'nut');

  if (nutSegs.length > 0) {
    // Nut & bolt: two independent widening cones (head + nut) that meet near the
    // stack mid-plane — together they already form the correct "widen then narrow"
    // double-cone silhouette, so each is drawn as a simple single-direction taper.
    let headCursor = stackTopY;
    headSegs.forEach((seg, i) => {
      const segPx = seg.thicknessMm * scale;
      const halfBase = (seg.baseDiameterMm / 2) * scale;
      const halfWide = (seg.baseDiameterMm / 2 + seg.thicknessMm * TAN30) * scale;
      const y0 = headCursor;
      const y1 = headCursor + segPx;
      frustumEls.push(
        <polygon
          key={`fh-${i}`}
          points={`${centerX - halfBase},${y0} ${centerX + halfBase},${y0} ${centerX + halfWide},${y1} ${centerX - halfWide},${y1}`}
          fill="var(--accent-glow)"
          stroke="var(--accent)"
          strokeDasharray="2,2"
          strokeWidth={1}
          opacity={0.55}
        />
      );
      headCursor = y1;
    });

    let nutCursor = stackBottomY;
    nutSegs.forEach((seg, i) => {
      const segPx = seg.thicknessMm * scale;
      const halfBase = (seg.baseDiameterMm / 2) * scale;
      const halfWide = (seg.baseDiameterMm / 2 + seg.thicknessMm * TAN30) * scale;
      const yBottom = nutCursor;
      const yTop = nutCursor - segPx;
      frustumEls.push(
        <polygon
          key={`fn-${i}`}
          points={`${centerX - halfBase},${yBottom} ${centerX + halfBase},${yBottom} ${centerX + halfWide},${yTop} ${centerX - halfWide},${yTop}`}
          fill="var(--accent-glow)"
          stroke="var(--accent)"
          strokeDasharray="2,2"
          strokeWidth={1}
          opacity={0.55}
        />
      );
      nutCursor = yTop;
    });
  } else if (headSegs.length > 0) {
    // Tapped / threaded insert: only ONE physical cone is modelled in the stiffness
    // math (head bearing face down to the mid-point of thread engagement) since
    // there's no opposing bearing face for a second widening cone. But the
    // reaction is carried through the engaged threads at roughly the bolt's own
    // diameter — so, purely for this drawing (not the stiffness numbers above),
    // the cone is mirrored back down to bolt diameter over the same total depth:
    // it widens under the head, then tapers back toward the bolt's width by the
    // reaction plane, instead of growing without bound.
    const totalMm = headSegs.reduce((s, seg) => s + seg.thicknessMm, 0);
    let radiusMm = headSegs[0].baseDiameterMm / 2;
    let widenCursorY = stackTopY;
    headSegs.forEach((seg, i) => {
      const halfThicknessMm = seg.thicknessMm / 2;
      const y0 = widenCursorY;
      const y1 = widenCursorY + halfThicknessMm * scale;
      const halfBase = radiusMm * scale;
      radiusMm += halfThicknessMm * TAN30;
      const halfWide = radiusMm * scale;
      frustumEls.push(
        <polygon
          key={`fh-${i}`}
          points={`${centerX - halfBase},${y0} ${centerX + halfBase},${y0} ${centerX + halfWide},${y1} ${centerX - halfWide},${y1}`}
          fill="var(--accent-glow)"
          stroke="var(--accent)"
          strokeDasharray="2,2"
          strokeWidth={1}
          opacity={0.55}
        />
      );
      widenCursorY = y1;
    });
    const boltHalfPx = (d / 2) * scale;
    const wideHalfPx = radiusMm * scale;
    const narrowEndY = stackTopY + totalMm * scale;
    frustumEls.push(
      <polygon
        key="fh-return"
        points={`${centerX - wideHalfPx},${widenCursorY} ${centerX + wideHalfPx},${widenCursorY} ${centerX + boltHalfPx},${narrowEndY} ${centerX - boltHalfPx},${narrowEndY}`}
        fill="var(--accent-glow)"
        stroke="var(--accent)"
        strokeDasharray="2,2"
        strokeWidth={1}
        opacity={0.55}
      />
    );
  }

  const midplaneY = (stackTopY + stackBottomY) / 2;

  return (
    <svg viewBox={`0 0 ${DRAW_W} ${DRAW_H}`} width="100%" style={{ maxHeight: 380 }}>
      {frustumEls}
      {elements}

      {/* mid-plane reference line */}
      <line x1={MARGIN * 0.6} y1={midplaneY} x2={DRAW_W - MARGIN * 0.3} y2={midplaneY} stroke="var(--border-hover)" strokeWidth={1} strokeDasharray="4,3" />
      <text x={DRAW_W - MARGIN * 0.3 + 4} y={midplaneY + 3} fontSize="9" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        mid-plane
      </text>

      {/* per-section thickness dimension ticks (left margin) */}
      {sectionYs.map((s, i) => (
        <g key={`dim-${i}`} fontSize="9" fill="var(--text-3)" fontFamily="ui-monospace, monospace">
          <line x1={MARGIN - 8} y1={s.y0} x2={MARGIN - 2} y2={s.y0} stroke="var(--border-strong)" strokeWidth={1} />
          <line x1={MARGIN - 8} y1={s.y1} x2={MARGIN - 2} y2={s.y1} stroke="var(--border-strong)" strokeWidth={1} />
          <line x1={MARGIN - 8} y1={s.y0} x2={MARGIN - 8} y2={s.y1} stroke="var(--border-strong)" strokeWidth={1} />
          <text x={MARGIN - 12} y={(s.y0 + s.y1) / 2 - 2} textAnchor="end">
            t={s.section.thicknessMm}
          </text>
          <text x={MARGIN - 12} y={(s.y0 + s.y1) / 2 + 10} textAnchor="end" fill="var(--text-faint)">
            ⌀{s.section.holeDiameterMm}
          </text>
        </g>
      ))}

      {/* overall grip length (right margin) */}
      <g fontSize="10" fill="var(--text-2)" fontFamily="ui-monospace, monospace">
        <line x1={DRAW_W - MARGIN + 14} y1={stackTopY} x2={DRAW_W - MARGIN + 14} y2={stackBottomY} stroke="var(--border-hover)" strokeWidth={1} />
        <text x={DRAW_W - MARGIN + 20} y={(stackTopY + stackBottomY) / 2} textAnchor="start" transform={`rotate(90 ${DRAW_W - MARGIN + 20} ${(stackTopY + stackBottomY) / 2})`}>
          grip {totalStackMm.toFixed(1)} mm
        </text>
      </g>

      {/* representative bolt length (far left margin) — tapped/threaded-insert only,
          measured from the bearing face (under the head) to the tip */}
      {isNoNutMode && (
        <g fontSize="10" fill="var(--accent)" fontFamily="ui-monospace, monospace">
          <line x1={20} y1={stackTopY} x2={20} y2={boltTipY} stroke="var(--accent)" strokeWidth={1} opacity={0.6} />
          <text x={16} y={(stackTopY + boltTipY) / 2} textAnchor="end" transform={`rotate(-90 16 ${(stackTopY + boltTipY) / 2})`}>
            bolt length {((boltTipY - stackTopY) / scale).toFixed(1)} mm
          </text>
        </g>
      )}

      <text x={DRAW_W / 2} y={DRAW_H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="ui-monospace, monospace">
        {clampedSections.length} clamped section{clampedSections.length > 1 ? 's' : ''} · {nut ? 'nut & bolt' : 'tapped/insert'} · dimensions in mm
      </text>
    </svg>
  );
}
