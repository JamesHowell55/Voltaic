import type { ReactElement } from 'react';
import { toDisplay, unitLabel, UNIT_LENGTH, type UnitSystem } from '../lib/globalUnits';

// Longitudinal half-section of a shaft (solid or hollow) pressed into a hub,
// showing the engagement length and the diameters that drive the interference
// calculation. Deliberately NOT to scale: the engagement length and diameters
// are drawn at representative proportions for readability, not the real ratio.

interface Props {
  interfaceDiameterMm: number; // d — shaft OD = hub bore
  shaftBoreMm: number; // 0 = solid shaft
  hubOuterDiameterMm: number;
  engagementLengthMm: number;
  unitSystem: UnitSystem;
}

const W = 480;
const H = 300;
const AXIS_Y = 160;
const MAX_HALF_PX = 95;
const HUB_X0 = W / 2 - 85;
const HUB_X1 = W / 2 + 85;
const SHAFT_OVERHANG_PX = 60;

const MONO = 'ui-monospace, monospace';

function fmtDim(mm: number, unitSystem: UnitSystem): string {
  const v = toDisplay(mm, unitSystem, UNIT_LENGTH);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: unitSystem === 'imperial' ? 3 : 2 })} ${unitLabel(unitSystem, UNIT_LENGTH)}`;
}

function hatchedRect(x: number, y: number, w: number, h: number, key: string): ReactElement {
  return <rect key={key} x={x} y={y} width={w} height={h} fill="var(--card-bg-2, rgba(255,255,255,0.03))" stroke="var(--border-hover)" strokeWidth={1.2} />;
}

function radiusLeader(x: number, yAxis: number, yFeature: number, label: string, labelDy: number, anchor: 'start' | 'end' = 'start'): ReactElement {
  const dx = anchor === 'start' ? 4 : -4;
  return (
    <g key={`rl-${x}-${label}`} stroke="var(--text-faint)" strokeWidth={1}>
      <line x1={x} y1={yAxis} x2={x} y2={yFeature} />
      <line x1={x - 3} y1={yFeature + 4} x2={x} y2={yFeature} />
      <line x1={x + 3} y1={yFeature + 4} x2={x} y2={yFeature} />
      <text x={x + dx} y={yFeature + labelDy} fontSize="9.5" fill="var(--text-2)" fontFamily={MONO} stroke="none" textAnchor={anchor}>{label}</text>
    </g>
  );
}

export default function FitsDiagram({ interfaceDiameterMm, shaftBoreMm, hubOuterDiameterMm, engagementLengthMm, unitSystem }: Props) {
  if (interfaceDiameterMm <= 0 || hubOuterDiameterMm <= interfaceDiameterMm) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 300 }}>
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="13">
          Enter a hub OD larger than the interface diameter
        </text>
      </svg>
    );
  }

  const maxDiaMm = Math.max(hubOuterDiameterMm, interfaceDiameterMm);
  const pxPerMm = MAX_HALF_PX / (maxDiaMm / 2);
  const shaftHalfPx = Math.max((interfaceDiameterMm / 2) * pxPerMm, 10);
  const hubHalfPx = Math.max((hubOuterDiameterMm / 2) * pxPerMm, shaftHalfPx + 18);
  const boreHalfPx = shaftBoreMm > 0 ? Math.min((shaftBoreMm / 2) * pxPerMm, shaftHalfPx - 4) : 0;

  const shaftX0 = HUB_X0 - SHAFT_OVERHANG_PX;
  const shaftX1 = HUB_X1 + SHAFT_OVERHANG_PX;

  const els: ReactElement[] = [];

  // Hub: drawn as top and bottom walls so the shaft passes through the bore.
  els.push(hatchedRect(HUB_X0, AXIS_Y - hubHalfPx, HUB_X1 - HUB_X0, hubHalfPx - shaftHalfPx, 'hub-top'));
  els.push(hatchedRect(HUB_X0, AXIS_Y + shaftHalfPx, HUB_X1 - HUB_X0, hubHalfPx - shaftHalfPx, 'hub-bottom'));

  // Shaft body (solid fill), full length including overhang past the hub.
  els.push(
    <rect key="shaft" x={shaftX0} y={AXIS_Y - shaftHalfPx} width={shaftX1 - shaftX0} height={2 * shaftHalfPx}
      fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth={1.3} />
  );
  if (boreHalfPx > 0) {
    els.push(
      <rect key="shaft-bore" x={shaftX0 - 4} y={AXIS_Y - boreHalfPx} width={shaftX1 - shaftX0 + 8} height={2 * boreHalfPx}
        fill="var(--page-bg, var(--card-bg))" />
    );
  }

  // Centreline
  els.push(<line key="axis" x1={30} y1={AXIS_Y} x2={W - 20} y2={AXIS_Y} stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="5 3" />);

  // Interference contact lines at the shaft/hub interface, with small inward
  // arrows suggesting the radial squeeze.
  for (const sign of [-1, 1] as const) {
    const y = AXIS_Y + sign * shaftHalfPx;
    els.push(<line key={`contact-${sign}`} x1={HUB_X0} y1={y} x2={HUB_X1} y2={y} stroke="var(--accent)" strokeWidth={2} />);
    for (const fx of [HUB_X0 + 30, W / 2, HUB_X1 - 30]) {
      const y2 = y - sign * 8;
      els.push(
        <g key={`arrow-${sign}-${fx}`} stroke="var(--accent)" strokeWidth={1.3} fill="var(--accent)">
          <line x1={fx} y1={y - sign * 16} x2={fx} y2={y2} />
          <path d={`M${fx - 3} ${y2 - sign * 4} L${fx + 3} ${y2 - sign * 4} L${fx} ${y2} Z`} />
        </g>
      );
    }
  }

  // Dimension leaders.
  els.push(radiusLeader(HUB_X0 + 25, AXIS_Y, AXIS_Y - shaftHalfPx, `d = ${fmtDim(interfaceDiameterMm, unitSystem)}`, -6));
  if (boreHalfPx > 0) {
    els.push(radiusLeader(HUB_X0 + 55, AXIS_Y, AXIS_Y - boreHalfPx, `shaft bore Ø ${fmtDim(shaftBoreMm, unitSystem)}`, -6));
  }
  els.push(radiusLeader(HUB_X1 - 20, AXIS_Y, AXIS_Y - hubHalfPx, `hub OD Ø ${fmtDim(hubOuterDiameterMm, unitSystem)}`, -6, 'end'));

  // Engagement length, below the hub.
  const dimY = AXIS_Y + hubHalfPx + 24;
  els.push(
    <g key="length-dim" stroke="var(--text-faint)" strokeWidth={1}>
      <line x1={HUB_X0} y1={AXIS_Y + hubHalfPx + 6} x2={HUB_X0} y2={dimY} />
      <line x1={HUB_X1} y1={AXIS_Y + hubHalfPx + 6} x2={HUB_X1} y2={dimY} />
      <line x1={HUB_X0} y1={dimY} x2={HUB_X1} y2={dimY} />
      <text x={(HUB_X0 + HUB_X1) / 2} y={dimY + 14} fontSize="9.5" fill="var(--text-2)" fontFamily={MONO} stroke="none" textAnchor="middle">
        L = {fmtDim(engagementLengthMm, unitSystem)}
      </text>
    </g>
  );

  els.push(
    <text key="caption" x={W / 2} y={H - 10} textAnchor="middle" fill="var(--text-faint)" fontSize="9.5" fontFamily={MONO}>
      {shaftBoreMm > 0 ? 'hollow shaft' : 'solid shaft'} pressed into hub · longitudinal half-section · schematic, not to scale
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 300 }}>
      {els}
    </svg>
  );
}
