// Pure data model + validation/net-extraction logic for the Harness Designer.
//
// Scope (disclosed in the UI): one dominant contact size per connector, and
// strictly one-to-one point-to-point pin destinations (Unused / Ground / one
// other connector's pin) — no multi-drop splices. Setting a pin's destination
// always keeps both ends mutually consistent (see setPinDestination).
import { maxContactsFor, CONTACT_SIZE_SPECS, type ContactSize } from './connectorLibrary';

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
}

export interface ConnectorSpec {
  id: string;
  name: string;
  shellSize: number;
  connectorTypeId: string;
  contactSize: ContactSize;
  finishId: string;
  pins: PinSpec[];
}

export function maxPinCountFor(connector: Pick<ConnectorSpec, 'shellSize' | 'contactSize'>): number {
  return maxContactsFor(connector.shellSize, connector.contactSize);
}

export interface PinCountValidation {
  valid: boolean;
  used: number;
  max: number;
}
export function validatePinCount(connector: ConnectorSpec): PinCountValidation {
  const max = maxPinCountFor(connector);
  return { valid: connector.pins.length <= max, used: connector.pins.length, max };
}

export interface Net {
  id: string;
  kind: 'pinToPin' | 'pinToGround';
  a: { connectorId: string; pin: number };
  b: { connectorId: string; pin: number } | 'ground';
}

/** Walks every connector's pins and builds the net list. Pin-to-pin nets are
 *  deduplicated (each real connection appears once, keyed by its sorted
 *  endpoints) since setPinDestination keeps both ends mutually consistent. */
export function extractNets(connectors: ConnectorSpec[]): Net[] {
  const nets: Net[] = [];
  const seen = new Set<string>();
  for (const c of connectors) {
    for (const p of c.pins) {
      if (p.destination.kind === 'ground') {
        nets.push({ id: `${c.id}-${p.pin}-gnd`, kind: 'pinToGround', a: { connectorId: c.id, pin: p.pin }, b: 'ground' });
      } else if (p.destination.kind === 'pin' && p.destination.connectorId != null && p.destination.pin != null) {
        const key = [`${c.id}:${p.pin}`, `${p.destination.connectorId}:${p.destination.pin}`].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        nets.push({ id: key, kind: 'pinToPin', a: { connectorId: c.id, pin: p.pin }, b: { connectorId: p.destination.connectorId, pin: p.destination.pin } });
      }
    }
  }
  return nets;
}

function findPin(connectors: ConnectorSpec[], connectorId: string, pin: number): PinSpec | undefined {
  return connectors.find((c) => c.id === connectorId)?.pins.find((p) => p.pin === pin);
}

/** A pin's signal name is considered "still at its default" (never
 *  deliberately renamed by the user) when it matches the SIG{pin} pattern
 *  makeDefaultConnector assigns — used to decide which end's name should
 *  propagate to the other when a new pin-to-pin link is made. */
function isDefaultSignalName(pin: PinSpec): boolean {
  return pin.signalName === `SIG${pin.pin}`;
}

/** Immutably sets one pin's destination, keeping both ends of any pin-to-pin
 *  link mutually consistent: clears the old reciprocal link (if any), and if
 *  the new destination is itself already linked elsewhere, clears that link
 *  too before pointing it back at the pin being set. When a new pin-to-pin
 *  link is created, whichever end still has an un-renamed default signal
 *  name adopts the other end's name — a real point-to-point connection is a
 *  single logical signal, so both ends should read the same name — but a
 *  name the user has already deliberately typed on either end is never
 *  overwritten. */
export function setPinDestination(connectors: ConnectorSpec[], fromConnectorId: string, fromPin: number, newDestination: Destination): ConnectorSpec[] {
  const next = connectors.map((c) => ({ ...c, pins: c.pins.map((p) => ({ ...p, destination: { ...p.destination } })) }));

  const from = findPin(next, fromConnectorId, fromPin);
  if (!from) return connectors;

  if (from.destination.kind === 'pin' && from.destination.connectorId != null && from.destination.pin != null) {
    const oldPartner = findPin(next, from.destination.connectorId, from.destination.pin);
    if (oldPartner && oldPartner.destination.kind === 'pin' && oldPartner.destination.connectorId === fromConnectorId && oldPartner.destination.pin === fromPin) {
      oldPartner.destination = { kind: 'unused' };
    }
  }

  if (newDestination.kind === 'pin' && newDestination.connectorId != null && newDestination.pin != null) {
    const newPartner = findPin(next, newDestination.connectorId, newDestination.pin);
    if (newPartner) {
      if (newPartner.destination.kind === 'pin' && newPartner.destination.connectorId != null && newPartner.destination.pin != null) {
        const itsOldPartner = findPin(next, newPartner.destination.connectorId, newPartner.destination.pin);
        if (itsOldPartner && itsOldPartner.destination.kind === 'pin' && itsOldPartner.destination.connectorId === newDestination.connectorId && itsOldPartner.destination.pin === newDestination.pin) {
          itsOldPartner.destination = { kind: 'unused' };
        }
      }
      newPartner.destination = { kind: 'pin', connectorId: fromConnectorId, pin: fromPin };

      if (isDefaultSignalName(newPartner) && !isDefaultSignalName(from)) {
        newPartner.signalName = from.signalName;
      } else if (isDefaultSignalName(from) && !isDefaultSignalName(newPartner)) {
        from.signalName = newPartner.signalName;
      }
    }
  }

  from.destination = newDestination;
  return next;
}

/** Immutably links two pins on the SAME connector as a twisted pair, mirroring
 *  setPinDestination's mutual-consistency approach: clears the old reciprocal
 *  link (if any) on both the pin being set and whatever the new partner was
 *  previously twisted with, then points both ends at each other. Pass
 *  partnerPin=null to clear the link entirely. */
export function setTwistedPartner(connectors: ConnectorSpec[], connectorId: string, pin: number, partnerPin: number | null): ConnectorSpec[] {
  const next = connectors.map((c) => (c.id === connectorId ? { ...c, pins: c.pins.map((p) => ({ ...p })) } : c));
  const conn = next.find((c) => c.id === connectorId);
  if (!conn) return connectors;

  const from = conn.pins.find((p) => p.pin === pin);
  if (!from) return connectors;

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
  return next;
}

export function makeDefaultConnector(id: string, name: string, shellSize: number, contactSize: ContactSize): ConnectorSpec {
  const maxPins = maxContactsFor(shellSize, contactSize);
  const pinCount = Math.min(maxPins, 8);
  return {
    id,
    name,
    shellSize,
    connectorTypeId: 'jamNut',
    contactSize,
    finishId: 'W',
    pins: Array.from({ length: pinCount }, (_, i) => ({
      pin: i + 1,
      signalName: `SIG${i + 1}`,
      constructionId: 'm22759-32',
      awg: CONTACT_SIZE_SPECS[contactSize].awgRange[0],
      destination: { kind: 'unused' },
    })),
  };
}
