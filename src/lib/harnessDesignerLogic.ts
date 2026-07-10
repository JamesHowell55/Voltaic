// Pure data model + validation/net-extraction logic for the Harness Designer.
//
// Scope (disclosed in the UI): one dominant contact size per connector, a
// direct user-entered pin count (no shell/insert-arrangement constraint),
// and per-pin destinations of Unused / Ground / another connector's pin.
// Multiple pins may point at the same target pin — that is a multi-drop
// splice, not an error — so the destination graph is undirected and
// extractNets groups it into connected components (see extractNets).
//
// A wire's construction/gauge and twisted-pair link describe the whole
// physical wire, not one end of it — the setters below propagate edits made
// at either end to the other end (and across splices), so the two ends of
// one wire can never disagree about what kind of wire it is.
import { CONTACT_SIZE_SPECS, type ContactSize } from './connectorLibrary';
import { getWireConstruction, type WireCategory } from './harnessWireTypes';

export const DEFAULT_CONSTRUCTION_ID = 'm22759-32';

const TWISTABLE_CATEGORIES: WireCategory[] = ['twistedPair', 'twistedShieldedPair', 'canBus'];

/** True when this construction is a twisted category (twisted pair / twisted
 *  shielded pair / CAN bus) — the only kinds a "Twisted w/" link applies to. */
export function isTwistable(constructionId: string): boolean {
  return TWISTABLE_CATEGORIES.includes(getWireConstruction(constructionId).category);
}

export interface Destination {
  kind: 'unused' | 'ground' | 'pin';
  connectorId?: string;
  pin?: number;
}

export interface PinSpec {
  pin: number;
  signalName: string;
  constructionId: string;
  awg: number;
  destination: Destination;
  /** Pin number (same connector only) this pin's twisted-pair conductor is
   *  twisted with — only meaningful when constructionId's category is one of
   *  the twistable categories (twistedPair / twistedShieldedPair / canBus).
   *  Kept mutually consistent by setTwistedPartner, mirroring how
   *  setPinDestination keeps pin-to-pin links consistent. */
  twistedWithPin?: number;
  /** Pin number (same connector only) whose cable shield this pin is the
   *  drain wire for — a real separate conductor with its own signalName/
   *  destination like any other pin, not an abstract flag, since a drain
   *  wire can terminate anywhere a normal wire can (ground, another
   *  connector's pin, or unused). If the referenced pin is itself twisted
   *  with another pin, this drains the whole pair's shared shield, not
   *  just the one conductor (see getShieldTargets). Kept valid by
   *  pruneDanglingShieldDrains whenever a pin's construction/twist link/
   *  existence changes. */
  shieldDrainForPin?: number;
}

export interface ConnectorSpec {
  id: string;
  name: string;
  contactSize: ContactSize;
  pins: PinSpec[];
}

export interface Net {
  id: string;
  kind: 'pinToPin' | 'pinToGround';
  a: { connectorId: string; pin: number };
  b: { connectorId: string; pin: number } | 'ground';
  /** True when `a` is the shared anchor of a 3+-pin splice — the renderer
   *  draws a filled junction dot there instead of a plain connection dot. */
  isSpliceAnchor: boolean;
}

function pinKey(connectorId: string, pin: number): string {
  return `${connectorId}:${pin}`;
}
function parsePinKey(key: string): { connectorId: string; pin: number } {
  const [connectorId, pinStr] = key.split(':');
  return { connectorId, pin: Number(pinStr) };
}

/** Walks every connector's pins and builds the net list. A pin's destination
 *  pointing at another pin is an undirected edge (multiple pins may point at
 *  the same target — a splice), so pin-to-pin nets are found via connected
 *  components (union-find) rather than simple pairwise dedup: a component of
 *  exactly 2 pins is an ordinary point-to-point net, and a component of 3+ is
 *  a multi-drop splice. Each splice picks one deterministic anchor member
 *  (lowest connector order, then lowest pin number) and emits one edge from
 *  every other member back to it — reusing the exact same point-to-point
 *  rendering per spoke instead of needing real Steiner-tree routing. */
export function extractNets(connectors: ConnectorSpec[]): Net[] {
  const nets: Net[] = [];
  const connectorIndex = new Map(connectors.map((c, i) => [c.id, i]));

  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const edges: [string, string][] = [];
  for (const c of connectors) {
    for (const p of c.pins) {
      if (p.destination.kind === 'pin' && p.destination.connectorId != null && p.destination.pin != null) {
        const edge: [string, string] = [pinKey(c.id, p.pin), pinKey(p.destination.connectorId, p.destination.pin)];
        edges.push(edge);
        union(edge[0], edge[1]);
      }
    }
  }

  const members = new Map<string, Set<string>>();
  for (const [a, b] of edges) {
    const root = find(a);
    if (!members.has(root)) members.set(root, new Set());
    members.get(root)!.add(a);
    members.get(root)!.add(b);
  }

  const orderOf = (key: string): [number, number] => {
    const { connectorId, pin } = parsePinKey(key);
    return [connectorIndex.get(connectorId) ?? 0, pin];
  };

  for (const group of members.values()) {
    if (group.size < 2) continue;
    const sortedKeys = [...group].sort((x, y) => {
      const [ox, px] = orderOf(x);
      const [oy, py] = orderOf(y);
      return ox !== oy ? ox - oy : px - py;
    });
    const anchorKey = sortedKeys[0];
    const anchor = parsePinKey(anchorKey);
    const isSpliceAnchor = sortedKeys.length > 2;
    for (let i = 1; i < sortedKeys.length; i++) {
      const member = parsePinKey(sortedKeys[i]);
      nets.push({
        id: [anchorKey, sortedKeys[i]].sort().join('|'),
        kind: 'pinToPin',
        a: anchor,
        b: member,
        isSpliceAnchor,
      });
    }
  }

  for (const c of connectors) {
    for (const p of c.pins) {
      if (p.destination.kind === 'ground') {
        nets.push({ id: `${c.id}-${p.pin}-gnd`, kind: 'pinToGround', a: { connectorId: c.id, pin: p.pin }, b: 'ground', isSpliceAnchor: false });
      }
    }
  }

  return nets;
}

function findPin(connectors: ConnectorSpec[], connectorId: string, pin: number): PinSpec | undefined {
  return connectors.find((c) => c.id === connectorId)?.pins.find((p) => p.pin === pin);
}

/** Pins directly wired to this one — its own pin destination plus every pin
 *  whose destination points back at it (destinations are stored one-way, so
 *  both directions must be scanned). */
function directPeers(connectors: ConnectorSpec[], connectorId: string, pin: number): { connectorId: string; pin: number }[] {
  const keys = new Set<string>();
  const self = findPin(connectors, connectorId, pin);
  if (self?.destination.kind === 'pin' && self.destination.connectorId != null && self.destination.pin != null) {
    keys.add(pinKey(self.destination.connectorId, self.destination.pin));
  }
  for (const c of connectors) {
    for (const p of c.pins) {
      if (p.destination.kind === 'pin' && p.destination.connectorId === connectorId && p.destination.pin === pin) {
        keys.add(pinKey(c.id, p.pin));
      }
    }
  }
  keys.delete(pinKey(connectorId, pin));
  return [...keys].map(parsePinKey);
}

/** The single far end of this pin's wire — undefined when the pin is
 *  unconnected or part of a multi-drop splice (no one counterpart), the
 *  cases where mirroring a twist link across the wire would be ambiguous. */
function counterpartOf(connectors: ConnectorSpec[], connectorId: string, pin: number): { connectorId: string; pin: number } | undefined {
  const peers = directPeers(connectors, connectorId, pin);
  return peers.length === 1 ? peers[0] : undefined;
}

/** Every pin in this pin's net — the full connected component including the
 *  pin itself, walking destinations in both directions. */
function netMembers(connectors: ConnectorSpec[], connectorId: string, pin: number): { connectorId: string; pin: number }[] {
  const visited = new Set([pinKey(connectorId, pin)]);
  const queue = [{ connectorId, pin }];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const peer of directPeers(connectors, cur.connectorId, cur.pin)) {
      const k = pinKey(peer.connectorId, peer.pin);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push(peer);
      }
    }
  }
  return [...visited].map(parsePinKey);
}

/** Nearest AWG this contact size accepts — a propagated gauge the far
 *  connector's contact physically can't take is snapped to its closest legal
 *  value rather than stored invalid (the one place the two ends of a wire may
 *  still legitimately disagree, since a real harness would need a different
 *  contact size there). */
function nearestAllowedAwg(contactSize: ContactSize, awg: number): number {
  const allowed = CONTACT_SIZE_SPECS[contactSize].awgRange;
  return allowed.reduce((best, a) => (Math.abs(a - awg) < Math.abs(best - awg) ? a : best), allowed[0]);
}

/** A pin still carrying the construction+gauge makeDefaultConnector assigned
 *  (never deliberately changed by the user) — used to decide which end's wire
 *  spec should win when a new pin-to-pin link is made. */
function hasDefaultSpec(pin: PinSpec, contactSize: ContactSize): boolean {
  return pin.constructionId === DEFAULT_CONSTRUCTION_ID && pin.awg === CONTACT_SIZE_SPECS[contactSize].awgRange[0];
}

/** Copies (connectorId, pin)'s construction+AWG onto every other member of
 *  its net, snapping AWG to each connector's own contact range. Mutates the
 *  already-copied array in place (internal helper for the exported immutable
 *  setters). */
function propagateSpecFrom(next: ConnectorSpec[], connectorId: string, pin: number): void {
  const from = findPin(next, connectorId, pin);
  if (!from) return;
  for (const m of netMembers(next, connectorId, pin)) {
    if (m.connectorId === connectorId && m.pin === pin) continue;
    const conn = next.find((c) => c.id === m.connectorId);
    const p = conn?.pins.find((o) => o.pin === m.pin);
    if (!conn || !p) continue;
    p.constructionId = from.constructionId;
    p.awg = nearestAllowedAwg(conn.contactSize, from.awg);
  }
}

/** True when this pin's current wire construction actually has a shield
 *  layer (twistedShieldedPair / shielded) — a drain wire only makes sense
 *  for those, not a bare single conductor or unshielded twisted pair/CAN
 *  bus. */
export function pinHasShield(pin: PinSpec): boolean {
  return (getWireConstruction(pin.constructionId).shieldAddMm ?? 0) > 0;
}

export interface ShieldTarget {
  /** Canonical representative pin — the lower-numbered member when this is
   *  a twisted shielded pair, or the pin itself for a lone shielded single
   *  conductor. */
  pin: number;
  /** The other conductor's pin number — only set for a twisted shielded pair. */
  partnerPin?: number;
  label: string;
}

/** Every shield-eligible conductor (or twisted pair) on a connector, listed
 *  once each — a twisted shielded pair's two conductors share ONE physical
 *  shield, so only its lower-numbered pin represents it here, not both. */
export function getShieldTargets(connector: ConnectorSpec): ShieldTarget[] {
  const targets: ShieldTarget[] = [];
  for (const p of connector.pins) {
    if (!pinHasShield(p)) continue;
    if (p.twistedWithPin != null) {
      if (p.pin > p.twistedWithPin) continue;
      targets.push({ pin: p.pin, partnerPin: p.twistedWithPin, label: `Pins ${p.pin} & ${p.twistedWithPin} (twisted pair)` });
    } else {
      targets.push({ pin: p.pin, label: `Pin ${p.pin}` });
    }
  }
  return targets;
}

/** Immutably sets which shield-eligible conductor (or pair) a pin's drain
 *  wire belongs to. Only one drain per target — assigning a new drain to a
 *  target clears whichever other pin previously drained it. Pass
 *  targetPin=null to clear this pin's own drain assignment. */
export function setShieldDrain(connectors: ConnectorSpec[], connectorId: string, drainPin: number, targetPin: number | null): ConnectorSpec[] {
  return connectors.map((c) => {
    if (c.id !== connectorId) return c;
    return {
      ...c,
      pins: c.pins.map((p) => {
        if (p.pin === drainPin) return { ...p, shieldDrainForPin: targetPin ?? undefined };
        if (targetPin != null && p.shieldDrainForPin === targetPin) return { ...p, shieldDrainForPin: undefined };
        return p;
      }),
    };
  });
}

/** Clears any shieldDrainForPin reference that no longer points at a valid
 *  shield target — call after any edit that could invalidate one (a
 *  construction change dropping the shield, a broken twist link, or a
 *  removed pin). A drain pointing at a pair's higher-numbered member is
 *  re-pointed at the pair's canonical (lower) pin instead of dropped, so a
 *  drain assigned to a lone shielded pin survives that pin later joining a
 *  twisted pair; if two drains collapse onto one target this way, the first
 *  keeps it. */
export function pruneDanglingShieldDrains(connector: ConnectorSpec): ConnectorSpec {
  const canonicalOf = new Map<number, number>();
  for (const t of getShieldTargets(connector)) {
    canonicalOf.set(t.pin, t.pin);
    if (t.partnerPin != null) canonicalOf.set(t.partnerPin, t.pin);
  }
  const claimed = new Set<number>();
  return {
    ...connector,
    pins: connector.pins.map((p) => {
      if (p.shieldDrainForPin == null) return p;
      const canonical = canonicalOf.get(p.shieldDrainForPin);
      const drain = canonical != null && !claimed.has(canonical) ? canonical : undefined;
      if (drain != null) claimed.add(drain);
      return drain === p.shieldDrainForPin ? p : { ...p, shieldDrainForPin: drain };
    }),
  };
}

/** Clears any twist link that is no longer mutually consistent between two
 *  existing, twist-capable pins — call after anything that can invalidate
 *  one (a construction change propagated from the wire's far end, or a
 *  pin-count reduction removing the partner). */
export function pruneInvalidTwists(connector: ConnectorSpec): ConnectorSpec {
  return {
    ...connector,
    pins: connector.pins.map((p) => {
      if (p.twistedWithPin == null) return p;
      const partner = connector.pins.find((o) => o.pin === p.twistedWithPin);
      const valid = partner != null && partner.twistedWithPin === p.pin && isTwistable(p.constructionId) && isTwistable(partner.constructionId);
      return valid ? p : { ...p, twistedWithPin: undefined };
    }),
  };
}

/** Core reciprocal twist-link update on an already-copied connector array:
 *  clears the old reciprocal link on both the pin being set and whatever the
 *  new partner was previously twisted with, then points both ends at each
 *  other (or just clears, when partnerPin is null). No mirroring — that is
 *  layered on by the exported setters. */
function applyTwist(next: ConnectorSpec[], connectorId: string, pin: number, partnerPin: number | null): void {
  const conn = next.find((c) => c.id === connectorId);
  const from = conn?.pins.find((p) => p.pin === pin);
  if (!conn || !from) return;
  if (from.twistedWithPin != null) {
    const oldPartner = conn.pins.find((p) => p.pin === from.twistedWithPin);
    if (oldPartner && oldPartner.twistedWithPin === pin) oldPartner.twistedWithPin = undefined;
  }
  if (partnerPin != null) {
    const newPartner = conn.pins.find((p) => p.pin === partnerPin);
    if (newPartner) {
      if (newPartner.twistedWithPin != null) {
        const itsOldPartner = conn.pins.find((p) => p.pin === newPartner.twistedWithPin);
        if (itsOldPartner && itsOldPartner.twistedWithPin === partnerPin) itsOldPartner.twistedWithPin = undefined;
      }
      newPartner.twistedWithPin = pin;
    }
  }
  from.twistedWithPin = partnerPin ?? undefined;
}

/** After (connectorId, pin)'s wiring or twist link changed, re-derives the
 *  twist at the far end of its pair, in whichever direction the twist was
 *  specified: if this pin and its twist partner both run point-to-point onto
 *  the same far connector, the two far pins are linked automatically — and
 *  when the far end holds the twist and this end doesn't yet, this end's
 *  pins are linked instead. This is what lets a twisted pair be specified at
 *  ONE connector and apply to the terminating connector on its own. Mutates
 *  the copied array in place. */
function mirrorTwistAcross(next: ConnectorSpec[], connectorId: string, pin: number): void {
  const conn = next.find((c) => c.id === connectorId);
  const from = conn?.pins.find((p) => p.pin === pin);
  if (!conn || !from) return;

  const cFrom = counterpartOf(next, connectorId, pin);
  if (!cFrom) return;
  const farConn = next.find((c) => c.id === cFrom.connectorId);
  const farPin = farConn?.pins.find((p) => p.pin === cFrom.pin);
  if (!farConn || !farPin) return;

  if (from.twistedWithPin != null) {
    const cPartner = counterpartOf(next, connectorId, from.twistedWithPin);
    if (!cPartner || cPartner.connectorId !== farConn.id) return;
    const farPartner = farConn.pins.find((p) => p.pin === cPartner.pin);
    if (!farPartner || !isTwistable(farPin.constructionId) || !isTwistable(farPartner.constructionId)) return;
    applyTwist(next, farConn.id, farPin.pin, farPartner.pin);
  } else if (farPin.twistedWithPin != null) {
    const cFarPartner = counterpartOf(next, farConn.id, farPin.twistedWithPin);
    if (!cFarPartner || cFarPartner.connectorId !== connectorId) return;
    const nearPartner = conn.pins.find((p) => p.pin === cFarPartner.pin);
    if (!nearPartner || !isTwistable(from.constructionId) || !isTwistable(nearPartner.constructionId)) return;
    applyTwist(next, connectorId, from.pin, nearPartner.pin);
  }
}

/** A pin's signal name is considered "still at its default" (never
 *  deliberately renamed by the user) when it matches the SIG{pin} pattern
 *  makeDefaultConnector assigns — used to decide which end's name should
 *  propagate to the other when a new pin-to-pin link is made. */
function isDefaultSignalName(pin: PinSpec): boolean {
  return pin.signalName === `SIG${pin.pin}`;
}

/** Immutably sets one pin's destination. Only this pin's OWN previous link is
 *  touched — other pins already pointing at the same target are left alone,
 *  which is exactly how a multi-drop splice is created (several pins all
 *  pointing at, directly or transitively through, one another — see
 *  extractNets). Because the two ends of a wire are one physical object, the
 *  link also synchronizes the ends: a still-default signal name or wire spec
 *  on either side adopts the other side's deliberately-set value (on a
 *  conflict between two deliberate values, the end being edited wins), and a
 *  twisted-pair link marked at either connector is mirrored onto the other
 *  once both conductors of the pair run point-to-point onto it. */
export function setPinDestination(connectors: ConnectorSpec[], fromConnectorId: string, fromPin: number, newDestination: Destination): ConnectorSpec[] {
  const next = connectors.map((c) => ({ ...c, pins: c.pins.map((p) => ({ ...p, destination: { ...p.destination } })) }));

  const fromConn = next.find((c) => c.id === fromConnectorId);
  const from = fromConn?.pins.find((p) => p.pin === fromPin);
  if (!fromConn || !from) return connectors;

  // Re-routing or removing this pin's own outgoing edge can strand a twisted
  // pair's far-end mirror — clear it while the old routing needed to locate
  // it still exists.
  if (from.destination.kind === 'pin' && from.twistedWithPin != null) {
    const cFrom = counterpartOf(next, fromConnectorId, fromPin);
    const cPartner = counterpartOf(next, fromConnectorId, from.twistedWithPin);
    if (cFrom && cPartner && cFrom.connectorId === cPartner.connectorId) {
      const farConn = next.find((c) => c.id === cFrom.connectorId);
      const farA = farConn?.pins.find((p) => p.pin === cFrom.pin);
      const farB = farConn?.pins.find((p) => p.pin === cPartner.pin);
      if (farA && farB && farA.twistedWithPin === farB.pin && farB.twistedWithPin === farA.pin) {
        farA.twistedWithPin = undefined;
        farB.twistedWithPin = undefined;
      }
    }
  }

  let syncSpecs = false;
  if (newDestination.kind === 'pin' && newDestination.connectorId != null && newDestination.pin != null) {
    const targetConn = next.find((c) => c.id === newDestination.connectorId);
    const target = targetConn?.pins.find((p) => p.pin === newDestination.pin);
    if (targetConn && target) {
      if (isDefaultSignalName(target) && !isDefaultSignalName(from)) {
        target.signalName = from.signalName;
      } else if (isDefaultSignalName(from) && !isDefaultSignalName(target)) {
        from.signalName = target.signalName;
      }
      const fromDefault = hasDefaultSpec(from, fromConn.contactSize);
      const targetDefault = hasDefaultSpec(target, targetConn.contactSize);
      if (fromDefault && !targetDefault) {
        from.constructionId = target.constructionId;
        from.awg = nearestAllowedAwg(fromConn.contactSize, target.awg);
      }
      // Two still-default ends are left alone; otherwise `from` (which just
      // adopted the target's spec above if IT was the default one) is the
      // winner propagated across the whole net below.
      syncSpecs = !fromDefault || !targetDefault;
    }
  }

  from.destination = { ...newDestination };
  if (syncSpecs) propagateSpecFrom(next, fromConnectorId, fromPin);
  if (newDestination.kind === 'pin') mirrorTwistAcross(next, fromConnectorId, fromPin);

  return next.map(pruneInvalidTwists).map(pruneDanglingShieldDrains);
}

/** Immutably applies a construction/AWG edit to one pin and propagates it to
 *  every other pin in the same net — one physical wire has one spec, so a
 *  spec chosen at either end (or any member of a splice) applies everywhere,
 *  with AWG snapped to each connector's own contact range. Twist links and
 *  shield-drain assignments the new construction invalidates are pruned on
 *  every connector the change reached. */
export function applyPinSpec(connectors: ConnectorSpec[], connectorId: string, pin: number, patch: Partial<Pick<PinSpec, 'constructionId' | 'awg'>>): ConnectorSpec[] {
  const next = connectors.map((c) => ({ ...c, pins: c.pins.map((p) => ({ ...p })) }));
  const from = findPin(next, connectorId, pin);
  if (!from) return connectors;
  if (patch.constructionId !== undefined) from.constructionId = patch.constructionId;
  if (patch.awg !== undefined) from.awg = patch.awg;
  propagateSpecFrom(next, connectorId, pin);
  return next.map(pruneInvalidTwists).map(pruneDanglingShieldDrains);
}

/** Immutably links two pins on the SAME connector as a twisted pair (or
 *  clears with partnerPin=null), keeping the link mutually consistent — and
 *  mirrors the change across the pair's wires: a twist describes the physical
 *  cable, so marking or clearing it at either connector applies at the far
 *  end automatically whenever both conductors run point-to-point onto one
 *  far connector. */
export function setTwistedPartner(connectors: ConnectorSpec[], connectorId: string, pin: number, partnerPin: number | null): ConnectorSpec[] {
  const next = connectors.map((c) => ({ ...c, pins: c.pins.map((p) => ({ ...p })) }));
  const conn = next.find((c) => c.id === connectorId);
  const from = conn?.pins.find((p) => p.pin === pin);
  if (!conn || !from) return connectors;

  // Mirror-clear the far ends of any pair this edit breaks — the pin's own
  // old pair, and the new partner's old pair — before the local links change.
  const clearFarPairOf = (aPin: number, bPin: number | undefined) => {
    if (bPin == null) return;
    const cA = counterpartOf(next, connectorId, aPin);
    const cB = counterpartOf(next, connectorId, bPin);
    if (!cA || !cB || cA.connectorId !== cB.connectorId) return;
    const farConn = next.find((c) => c.id === cA.connectorId);
    const farA = farConn?.pins.find((p) => p.pin === cA.pin);
    const farB = farConn?.pins.find((p) => p.pin === cB.pin);
    if (farA && farB && farA.twistedWithPin === farB.pin && farB.twistedWithPin === farA.pin) {
      farA.twistedWithPin = undefined;
      farB.twistedWithPin = undefined;
    }
  };
  clearFarPairOf(pin, from.twistedWithPin);
  if (partnerPin != null) {
    const newPartner = conn.pins.find((p) => p.pin === partnerPin);
    if (newPartner?.twistedWithPin != null && newPartner.twistedWithPin !== pin) clearFarPairOf(partnerPin, newPartner.twistedWithPin);
  }

  applyTwist(next, connectorId, pin, partnerPin);
  if (partnerPin != null) mirrorTwistAcross(next, connectorId, pin);

  return next.map(pruneDanglingShieldDrains);
}

export function makeDefaultConnector(id: string, name: string, contactSize: ContactSize, pinCount = 8): ConnectorSpec {
  return {
    id,
    name,
    contactSize,
    pins: Array.from({ length: pinCount }, (_, i) => ({
      pin: i + 1,
      signalName: `SIG${i + 1}`,
      constructionId: DEFAULT_CONSTRUCTION_ID,
      awg: CONTACT_SIZE_SPECS[contactSize].awgRange[0],
      destination: { kind: 'unused' },
    })),
  };
}
