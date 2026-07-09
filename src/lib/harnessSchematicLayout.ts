// Deterministic wiring-diagram layout: connectors placed left-to-right in a
// single row (keeps every wire an unambiguous "facing side" — no general
// graph-routing/collision-avoidance engine, matching this project's
// algorithmic-UI convention). Wires route as orthogonal (90°) elbows rather
// than diagonals: out from the pin, along a per-wire vertical "lane" shared
// only by wires spanning the same pair of connectors, then into the target
// pin. Lanes are spread evenly across the gap between the two connectors —
// for a connection spanning non-adjacent connectors, its lane may visually
// pass through an intervening connector's box, an accepted extension of the
// same single-row simplification. Crossings between different nets' segments
// (only straight horizontal-vs-vertical crossings are detected — parallel
// overlaps are not) get a small "hop" bump on the horizontal segment, the
// standard schematic convention for "these do not connect". Export the PDF
// for a full-resolution version when there are many connectors.
import type { ConnectorSpec } from './harnessDesignerLogic';
import { extractNets } from './harnessDesignerLogic';
import { getShellSize, getConnectorType } from './connectorLibrary';
import { getWireConstruction } from './harnessWireTypes';

const BOX_WIDTH = 200;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 36;
const BOX_GAP_X = 220;
const MARGIN = 50;
const GROUND_STUB_LENGTH = 34;

export interface Point { x: number; y: number }

export interface PinPoint {
  pin: number;
  signalName: string;
  leftX: number;
  rightX: number;
  y: number;
  wireLabel: string;
  twistedWithPin?: number;
}

export interface ConnectorBoxLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shellLabel: string;
  pins: PinPoint[];
}

export interface WirePath {
  netId: string;
  points: Point[]; // polyline: 2 points (same-row, straight) or 4 (orthogonal elbow)
  hops: Point[]; // positions on this wire's horizontal segment(s) where a "hop" bump is drawn — another net crosses here without connecting
  label: string;
  midX: number;
  midY: number;
}

export interface GroundSymbol {
  x: number;
  y: number;
  stubX1: number;
  stubY1: number;
  connectorId: string;
  pin: number;
  hops: Point[];
}

export interface SchematicLayout {
  connectors: ConnectorBoxLayout[];
  wires: WirePath[];
  grounds: GroundSymbol[];
  width: number;
  height: number;
}

function wireLabelFor(constructionId: string, awg: number): string {
  const c = getWireConstruction(constructionId);
  return `${awg} AWG ${c.standard}`;
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
  const boxes: ConnectorBoxLayout[] = connectors.map((c, i) => {
    const height = HEADER_HEIGHT + c.pins.length * ROW_HEIGHT + 10;
    const x = MARGIN + i * (BOX_WIDTH + BOX_GAP_X);
    const y = MARGIN;
    const shellSpec = getShellSize(c.shellSize);
    const pins: PinPoint[] = c.pins.map((p, pi) => ({
      pin: p.pin,
      signalName: p.signalName,
      leftX: x,
      rightX: x + BOX_WIDTH,
      y: y + HEADER_HEIGHT + pi * ROW_HEIGHT + ROW_HEIGHT / 2,
      wireLabel: wireLabelFor(p.constructionId, p.awg),
      twistedWithPin: p.twistedWithPin,
    }));
    return {
      id: c.id,
      name: c.name,
      x, y, width: BOX_WIDTH, height,
      shellLabel: `Shell ${c.shellSize} (${shellSpec.militaryLetter}) · ${getConnectorType(c.connectorTypeId).label}`,
      pins,
    };
  });

  const boxIndex = new Map(connectors.map((c, i) => [c.id, i]));
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const nets = extractNets(connectors);

  interface RawWire { netId: string; x1: number; y1: number; x2: number; y2: number; gapKey: string; label: string }
  const rawWires: RawWire[] = [];
  const grounds: GroundSymbol[] = [];

  for (const net of nets) {
    const aConnector = connectors.find((c) => c.id === net.a.connectorId);
    const aPinSpec = aConnector?.pins.find((p) => p.pin === net.a.pin);
    const aBox = boxById.get(net.a.connectorId);
    const aPoint = aBox?.pins.find((p) => p.pin === net.a.pin);
    if (!aBox || !aPoint || !aPinSpec) continue;

    if (net.kind === 'pinToGround') {
      const facesRight = true; // grounds always stub off the right edge (simplification, disclosed)
      const x1 = facesRight ? aPoint.rightX : aPoint.leftX;
      grounds.push({ x: x1 + GROUND_STUB_LENGTH, y: aPoint.y, stubX1: x1, stubY1: aPoint.y, connectorId: net.a.connectorId, pin: net.a.pin, hops: [] });
    } else if (net.kind === 'pinToPin' && net.b !== 'ground') {
      const b = net.b;
      const bBox = boxById.get(b.connectorId);
      const bPoint = bBox?.pins.find((p) => p.pin === b.pin);
      if (!bBox || !bPoint) continue;
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
        gapKey: `${loIdx}-${hiIdx}`,
        label: `${aPinSpec.signalName} · ${wireLabelFor(aPinSpec.constructionId, aPinSpec.awg)}`,
      });
    }
  }

  // Assign each wire a lane x within its connector-pair gap, spread evenly so
  // wires sharing the same gap don't overlap. Ordered by average y for a
  // reasonably untangled (not necessarily crossing-free) fan-out.
  const byGap = new Map<string, RawWire[]>();
  for (const w of rawWires) {
    if (!byGap.has(w.gapKey)) byGap.set(w.gapKey, []);
    byGap.get(w.gapKey)!.push(w);
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
      const midX = w.y1 === w.y2 ? (w.x1 + w.x2) / 2 : laneX;
      const midY = w.y1 === w.y2 ? w.y1 : (w.y1 + w.y2) / 2;
      wires.push({ netId: w.netId, points, hops: [], label: w.label, midX, midY });
    });
  }

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

  const width = boxes.length > 0 ? Math.max(...boxes.map((b) => b.x + b.width)) + MARGIN + GROUND_STUB_LENGTH + 30 : MARGIN * 2;
  const height = boxes.length > 0 ? Math.max(...boxes.map((b) => b.y + b.height)) + MARGIN : MARGIN * 2;

  return { connectors: boxes, wires, grounds, width, height };
}
