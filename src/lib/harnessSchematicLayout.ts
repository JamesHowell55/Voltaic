// Deterministic wiring-diagram layout: connectors placed left-to-right in a
// single row (keeps every wire an unambiguous "facing side" — no general
// graph-routing/collision-avoidance engine, matching this project's
// algorithmic-UI convention). Wires route as orthogonal (90°) elbows rather
// than diagonals: out from the pin, along a per-wire vertical "lane" shared
// only by wires spanning the same pair of connectors, then into the target
// pin. Lanes are spread evenly across the gap between the two connectors.
// A connection spanning non-adjacent connectors (e.g. connector 1 to
// connector 3) does NOT use a mid-gap lane, since that would sit underneath
// an intervening connector's box and — because wires are drawn before boxes
// — visually look like it disappears behind it. Instead it detours along a
// "rail" above the whole connector row: up out of the near side of its own
// gap, across at a height that clears every box regardless of pin count
// (boxes all share the same top y), then back down into the target
// connector's gap. Multiple skip-connections stack onto their own rail,
// shorter spans closer to the boxes, so they don't overlap each other.
// Crossings between different nets' segments (only straight
// horizontal-vs-vertical crossings are detected — parallel overlaps are not)
// get a small "hop" bump on the horizontal segment, the standard schematic
// convention for "these do not connect". Export the PDF for a
// full-resolution version when there are many connectors.
import type { ConnectorSpec } from './harnessDesignerLogic';
import { extractNets, pinHasShield } from './harnessDesignerLogic';
import { getWireConstruction } from './harnessWireTypes';

const BOX_WIDTH = 200;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 36;
const BOX_GAP_X = 220;
const MARGIN = 50;
const GROUND_STUB_LENGTH = 34;
const SHIELD_GROUND_STUB_LENGTH = GROUND_STUB_LENGTH + 30; // further out than a signal ground so a pin with both never overlaps
const RAIL_CLEARANCE = 20; // gap between the topmost box edge and the first skip-connection rail
const RAIL_SPACING = 14; // vertical spacing between stacked skip-connection rails
const RAIL_LANE_OFFSET = 24; // how far into its own connector's gap the FIRST skip-connection sharing a pair sits
const RAIL_LANE_SPACING = 10; // extra offset per additional skip-connection sharing the same connector pair
const SAME_CONN_BRACKET_OFFSET = 10; // how far out from its own box edge the first same-connector splice spoke sits
const SAME_CONN_BRACKET_SPACING = 8; // extra offset per additional same-connector splice spoke

export interface Point { x: number; y: number }

export interface PinPoint {
  pin: number;
  signalName: string;
  leftX: number;
  rightX: number;
  y: number;
  twistedWithPin?: number;
  /** True when 3+ pins are spliced together here — render a filled junction
   *  dot instead of a plain connection dot, the standard schematic
   *  convention for a soldered/crimped multi-way joint. */
  isSpliceAnchor?: boolean;
}

export interface ConnectorBoxLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  subtitle: string;
  pins: PinPoint[];
}

export interface WirePath {
  netId: string;
  points: Point[]; // polyline: 2 points (same-row, straight) or 4 (orthogonal elbow)
  hops: Point[]; // positions on this wire's horizontal segment(s) where a "hop" bump is drawn — another net crosses here without connecting
  tooltip: string; // signal name + wire spec, shown on hover only (see legend for the always-visible spec/colour key)
  specIndex: number; // index into SchematicLayout.legend — which colour this wire is drawn in
}

export interface GroundSymbol {
  x: number;
  y: number;
  stubX1: number;
  stubY1: number;
  connectorId: string;
  pin: number;
  hops: Point[];
  specIndex: number;
  /** 'shield' is a cable shield/drain tied to ground — drawn with a longer
   *  stub (so it never overlaps a 'signal' ground at the same pin) and
   *  labelled "SHLD" instead of "GND". */
  kind: 'signal' | 'shield';
}

export interface LegendEntry {
  label: string; // e.g. "16 AWG M22759/32"
}

export interface SchematicLayout {
  connectors: ConnectorBoxLayout[];
  wires: WirePath[];
  grounds: GroundSymbol[];
  legend: LegendEntry[];
  width: number;
  height: number;
}

function wireLabelFor(constructionId: string, awg: number): string {
  const c = getWireConstruction(constructionId);
  return `${awg} AWG ${c.standard}`;
}

function specKeyFor(constructionId: string, awg: number): string {
  return `${constructionId}|${awg}`;
}

function findPinSpecIn(connectors: ConnectorSpec[], connectorId: string, pin: number) {
  return connectors.find((c) => c.id === connectorId)?.pins.find((p) => p.pin === pin);
}

interface Segment {
  key: string; // groups segments that must never be flagged as crossing each other (this wire's own segments, or a shared net)
  target: { kind: 'wire'; idx: number } | { kind: 'ground'; idx: number };
  orientation: 'h' | 'v';
  x1: number; y1: number; x2: number; y2: number; // normalized: x1<=x2, y1<=y2
}

function segmentsOfPolyline(points: Point[]): { orientation: 'h' | 'v'; x1: number; y1: number; x2: number; y2: number }[] {
  const segs: { orientation: 'h' | 'v'; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1.y === p2.y) segs.push({ orientation: 'h', x1: Math.min(p1.x, p2.x), x2: Math.max(p1.x, p2.x), y1: p1.y, y2: p1.y });
    else if (p1.x === p2.x) segs.push({ orientation: 'v', x1: p1.x, x2: p1.x, y1: Math.min(p1.y, p2.y), y2: Math.max(p1.y, p2.y) });
  }
  return segs;
}

/** Finds every point where a horizontal segment from one net crosses a
 *  vertical segment from a DIFFERENT net. The horizontal segment's own x
 *  bounds are checked strictly-interior (so a wire meeting its own pin or
 *  bend at a box edge is never flagged), but the vertical segment's y bounds
 *  are checked inclusively — two wires elbow-routed in "opposite" directions
 *  between the same two rows naturally meet exactly at one wire's bend
 *  corner, which is still a real visual crossing of the other wire's
 *  straight run and needs a hop. Returns hop points bucketed onto whichever
 *  segment was horizontal, keyed by the same `target` used to build the
 *  segment list. */
function findCrossingHops(segments: Segment[]): Map<string, Point[]> {
  const hops = new Map<string, Point[]>();
  const margin = 0.5;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];
      if (s1.key === s2.key) continue;
      if (s1.orientation === s2.orientation) continue;
      const h = s1.orientation === 'h' ? s1 : s2;
      const v = s1.orientation === 'h' ? s2 : s1;
      if (v.x1 > h.x1 + margin && v.x1 < h.x2 - margin && h.y1 > v.y1 - margin && h.y1 < v.y2 + margin) {
        const hTarget = s1.orientation === 'h' ? s1.target : s2.target;
        const targetKey = `${hTarget.kind}:${hTarget.idx}`;
        if (!hops.has(targetKey)) hops.set(targetKey, []);
        hops.get(targetKey)!.push({ x: v.x1, y: h.y1 });
      }
    }
  }
  return hops;
}

export function buildSchematicLayout(connectors: ConnectorSpec[]): SchematicLayout {
  const boxIndex = new Map(connectors.map((c, i) => [c.id, i]));
  const nets = extractNets(connectors);

  const spliceAnchorKeys = new Set<string>();
  for (const n of nets) {
    if (n.isSpliceAnchor) spliceAnchorKeys.add(`${n.a.connectorId}:${n.a.pin}`);
  }

  // How many skip-rails will be needed (computed from connector order alone,
  // before any pixel layout exists) so the boxes can be pushed down far
  // enough to leave room for them above the top row — otherwise a deeply
  // stacked rail would run off the top of the SVG viewBox.
  const skipCount = nets.filter((n) => {
    if (n.kind !== 'pinToPin' || n.b === 'ground') return false;
    const aIdx = boxIndex.get(n.a.connectorId) ?? 0;
    const bIdx = boxIndex.get(n.b.connectorId) ?? 0;
    return Math.abs(aIdx - bIdx) > 1;
  }).length;
  const topPadding = skipCount > 0 ? RAIL_CLEARANCE + skipCount * RAIL_SPACING + 10 : 0;
  const rowTopY = MARGIN + topPadding;

  const boxes: ConnectorBoxLayout[] = connectors.map((c, i) => {
    const height = HEADER_HEIGHT + c.pins.length * ROW_HEIGHT + 10;
    const x = MARGIN + i * (BOX_WIDTH + BOX_GAP_X);
    const y = rowTopY;
    const pins: PinPoint[] = c.pins.map((p, pi) => ({
      pin: p.pin,
      signalName: p.signalName,
      leftX: x,
      rightX: x + BOX_WIDTH,
      y: y + HEADER_HEIGHT + pi * ROW_HEIGHT + ROW_HEIGHT / 2,
      twistedWithPin: p.twistedWithPin,
      isSpliceAnchor: spliceAnchorKeys.has(`${c.id}:${p.pin}`),
    }));
    return {
      id: c.id,
      name: c.name,
      x, y, width: BOX_WIDTH, height,
      subtitle: `#${c.contactSize} contact · ${c.pins.length}-pin`,
      pins,
    };
  });

  const boxById = new Map(boxes.map((b) => [b.id, b]));

  // Every distinct wire spec (construction + AWG) actually used by a net, in
  // a stable sorted order — this order is what maps a wire to a legend
  // entry/colour index, so the same spec always lands on the same swatch.
  // For a pin-to-pin net the MEMBER end (`b`) owns the spec, not the shared
  // splice anchor (`a`) — each spoke of a splice is its own physical wire and
  // can carry a different gauge/construction from its neighbours.
  const specKeys = new Set<string>();
  for (const net of nets) {
    const specOwner = net.b === 'ground' ? net.a : net.b;
    const spec = findPinSpecIn(connectors, specOwner.connectorId, specOwner.pin);
    if (spec) specKeys.add(specKeyFor(spec.constructionId, spec.awg));
  }
  const sortedSpecKeys = [...specKeys].sort((a, b) => {
    const [, awgA] = a.split('|');
    const [, awgB] = b.split('|');
    return wireLabelFor(a.split('|')[0], Number(awgA)).localeCompare(wireLabelFor(b.split('|')[0], Number(awgB)));
  });
  const specIndexOf = new Map(sortedSpecKeys.map((k, i) => [k, i]));
  const legend: LegendEntry[] = sortedSpecKeys.map((k) => {
    const [constructionId, awgStr] = k.split('|');
    return { label: wireLabelFor(constructionId, Number(awgStr)) };
  });

  interface RawWire { netId: string; x1: number; y1: number; x2: number; y2: number; loIdx: number; hiIdx: number; tooltip: string; specIndex: number }
  const rawWires: RawWire[] = [];
  const grounds: GroundSymbol[] = [];

  for (const net of nets) {
    const aBox = boxById.get(net.a.connectorId);
    const aPoint = aBox?.pins.find((p) => p.pin === net.a.pin);
    if (!aBox || !aPoint) continue;

    if (net.kind === 'pinToGround') {
      const aPinSpec = findPinSpecIn(connectors, net.a.connectorId, net.a.pin);
      if (!aPinSpec) continue;
      const specIndex = specIndexOf.get(specKeyFor(aPinSpec.constructionId, aPinSpec.awg)) ?? 0;
      const facesRight = true; // grounds always stub off the right edge (simplification, disclosed)
      const x1 = facesRight ? aPoint.rightX : aPoint.leftX;
      grounds.push({ x: x1 + GROUND_STUB_LENGTH, y: aPoint.y, stubX1: x1, stubY1: aPoint.y, connectorId: net.a.connectorId, pin: net.a.pin, hops: [], specIndex, kind: 'signal' });
    } else if (net.kind === 'pinToPin' && net.b !== 'ground') {
      const b = net.b;
      const bBox = boxById.get(b.connectorId);
      const bPoint = bBox?.pins.find((p) => p.pin === b.pin);
      const bPinSpec = findPinSpecIn(connectors, b.connectorId, b.pin);
      if (!bBox || !bPoint || !bPinSpec) continue;
      const specIndex = specIndexOf.get(specKeyFor(bPinSpec.constructionId, bPinSpec.awg)) ?? 0;
      const aIdx = boxIndex.get(net.a.connectorId) ?? 0;
      const bIdx = boxIndex.get(b.connectorId) ?? 0;
      const aFacesRight = bIdx >= aIdx;
      const bFacesRight = aIdx >= bIdx;
      const loIdx = Math.min(aIdx, bIdx);
      const hiIdx = Math.max(aIdx, bIdx);
      rawWires.push({
        netId: net.id,
        x1: aFacesRight ? aPoint.rightX : aPoint.leftX,
        y1: aPoint.y,
        x2: bFacesRight ? bPoint.rightX : bPoint.leftX,
        y2: bPoint.y,
        loIdx, hiIdx,
        tooltip: `${bPinSpec.signalName} · ${wireLabelFor(bPinSpec.constructionId, bPinSpec.awg)}${net.isSpliceAnchor ? ' · splice' : ''}`,
        specIndex,
      });
    }
  }

  // Shield/drain-to-ground is a separate per-pin flag, not a Destination —
  // a shielded conductor's two signal ends and its shield are three distinct
  // electrical points. Drawn further out than a signal ground stub so a pin
  // that's both grounded AND shield-grounded gets two clearly separate symbols.
  for (const c of connectors) {
    for (const p of c.pins) {
      if (!p.shieldGrounded || !pinHasShield(p)) continue;
      const box = boxById.get(c.id);
      const point = box?.pins.find((pt) => pt.pin === p.pin);
      if (!box || !point) continue;
      const specIndex = specIndexOf.get(specKeyFor(p.constructionId, p.awg)) ?? 0;
      grounds.push({
        x: point.rightX + SHIELD_GROUND_STUB_LENGTH, y: point.y,
        stubX1: point.rightX, stubY1: point.y,
        connectorId: c.id, pin: p.pin, hops: [], specIndex, kind: 'shield',
      });
    }
  }

  // Adjacent-connector wires (spanning exactly one gap) get a lane x within
  // that gap, spread evenly so wires sharing it don't overlap.
  const adjacentWires = rawWires.filter((w) => w.hiIdx - w.loIdx === 1);
  const skipWires = rawWires.filter((w) => w.hiIdx - w.loIdx > 1);
  // A splice spoke can land back on its own connector (e.g. two pins on CON1
  // both spliced to one pin on CON2 — the anchor is one of the CON1 pins, so
  // the CON1-to-CON1 spoke has no "other connector" to route toward at all).
  // These get a small out-and-back bracket on the box's own edge, the same
  // idiom already used for twisted-pair brackets.
  const sameConnWires = rawWires.filter((w) => w.hiIdx === w.loIdx);

  const byGap = new Map<string, RawWire[]>();
  for (const w of adjacentWires) {
    const gapKey = `${w.loIdx}-${w.hiIdx}`;
    if (!byGap.has(gapKey)) byGap.set(gapKey, []);
    byGap.get(gapKey)!.push(w);
  }

  const wires: WirePath[] = [];
  for (const [gapKey, group] of byGap) {
    const [loIdx, hiIdx] = gapKey.split('-').map(Number);
    const gapLeftX = boxes[loIdx].x + boxes[loIdx].width;
    const gapRightX = boxes[hiIdx].x;
    const sorted = [...group].sort((a, b) => (a.y1 + a.y2) - (b.y1 + b.y2));
    sorted.forEach((w, i) => {
      const laneX = gapLeftX + ((gapRightX - gapLeftX) * (i + 1)) / (sorted.length + 1);
      const points: Point[] = w.y1 === w.y2
        ? [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]
        : [{ x: w.x1, y: w.y1 }, { x: laneX, y: w.y1 }, { x: laneX, y: w.y2 }, { x: w.x2, y: w.y2 }];
      wires.push({ netId: w.netId, points, hops: [], tooltip: w.tooltip, specIndex: w.specIndex });
    });
  }

  const sameConnByBox = new Map<number, RawWire[]>();
  for (const w of sameConnWires) {
    if (!sameConnByBox.has(w.loIdx)) sameConnByBox.set(w.loIdx, []);
    sameConnByBox.get(w.loIdx)!.push(w);
  }
  for (const group of sameConnByBox.values()) {
    const sorted = [...group].sort((a, b) => (a.y1 + a.y2) - (b.y1 + b.y2));
    sorted.forEach((w, i) => {
      const bx = w.x1 + SAME_CONN_BRACKET_OFFSET + i * SAME_CONN_BRACKET_SPACING;
      const points: Point[] = [{ x: w.x1, y: w.y1 }, { x: bx, y: w.y1 }, { x: bx, y: w.y2 }, { x: w.x2, y: w.y2 }];
      wires.push({ netId: w.netId, points, hops: [], tooltip: w.tooltip, specIndex: w.specIndex });
    });
  }

  // Non-adjacent-connector wires (spanning 2+ gaps) skip the mid-gap lane
  // entirely — it would sit underneath an intervening connector's box and,
  // since wires draw before boxes, look like it vanishes behind it. Instead
  // each one detours onto its own rail above the whole connector row (every
  // box shares the same top y, so a height above that clears all of them no
  // matter their pin count), stacking shorter spans closer to the boxes so
  // skip-wires don't overlap each other. Wires sharing the exact same
  // connector pair also get their near-side x staggered (like adjacent
  // lanes) — otherwise every one of them would bend at the identical (x, y1)
  // and (x, y2) points and look like a single overlapping line.
  const skipsByPair = new Map<string, RawWire[]>();
  for (const w of skipWires) {
    const pairKey = `${w.loIdx}-${w.hiIdx}`;
    if (!skipsByPair.has(pairKey)) skipsByPair.set(pairKey, []);
    skipsByPair.get(pairKey)!.push(w);
  }
  const pairLaneIndex = new Map<string, number>();
  for (const group of skipsByPair.values()) {
    const sortedGroup = [...group].sort((a, b) => (a.y1 + a.y2) - (b.y1 + b.y2));
    sortedGroup.forEach((w, i) => pairLaneIndex.set(w.netId, i));
  }

  const sortedSkips = [...skipWires].sort((a, b) => (a.hiIdx - a.loIdx) - (b.hiIdx - b.loIdx) || a.loIdx - b.loIdx);
  sortedSkips.forEach((w, railIdx) => {
    const railY = rowTopY - RAIL_CLEARANCE - railIdx * RAIL_SPACING;
    const laneIdx = pairLaneIndex.get(w.netId) ?? 0;
    const nearAX = boxes[w.loIdx].x + boxes[w.loIdx].width + RAIL_LANE_OFFSET + laneIdx * RAIL_LANE_SPACING;
    const nearBX = boxes[w.hiIdx].x - RAIL_LANE_OFFSET - laneIdx * RAIL_LANE_SPACING;
    const points: Point[] = [
      { x: w.x1, y: w.y1 },
      { x: nearAX, y: w.y1 },
      { x: nearAX, y: railY },
      { x: nearBX, y: railY },
      { x: nearBX, y: w.y2 },
      { x: w.x2, y: w.y2 },
    ];
    wires.push({ netId: w.netId, points, hops: [], tooltip: w.tooltip, specIndex: w.specIndex });
  });

  // Crossing detection across every wire + ground stub segment, regardless of
  // which gap it belongs to (a non-adjacent-connector lane can legitimately
  // cross an adjacent-pair's lane).
  const segments: Segment[] = [];
  wires.forEach((w, idx) => {
    for (const s of segmentsOfPolyline(w.points)) segments.push({ key: w.netId, target: { kind: 'wire', idx }, ...s });
  });
  grounds.forEach((g, idx) => {
    for (const s of segmentsOfPolyline([{ x: g.stubX1, y: g.stubY1 }, { x: g.x, y: g.y }])) {
      segments.push({ key: `gnd-${g.connectorId}-${g.pin}`, target: { kind: 'ground', idx }, ...s });
    }
  });
  const hopsByTarget = findCrossingHops(segments);
  wires.forEach((w, idx) => {
    w.hops = (hopsByTarget.get(`wire:${idx}`) ?? []).sort((a, b) => a.x - b.x);
  });
  grounds.forEach((g, idx) => {
    g.hops = (hopsByTarget.get(`ground:${idx}`) ?? []).sort((a, b) => a.x - b.x);
  });

  const width = boxes.length > 0 ? Math.max(...boxes.map((b) => b.x + b.width)) + MARGIN + SHIELD_GROUND_STUB_LENGTH + 30 : MARGIN * 2;
  const height = boxes.length > 0 ? Math.max(...boxes.map((b) => b.y + b.height)) + MARGIN : MARGIN * 2;

  return { connectors: boxes, wires, grounds, legend, width, height };
}
