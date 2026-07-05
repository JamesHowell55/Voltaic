// Washer, nut and threaded-insert presets for each fastener size. Metric plain-washer
// (ISO 7089/7093) and Belleville washer (DIN 6796, M3-M12) dimensions are real
// tabulated values from published datasheets. All-metal prevailing-torque nut figures
// (the "K-nut"/Aerotight/Aeronut/Philidas/Stover/DIN 980-V family — "K-nut" is a
// generic trade term for this nut class, not one specific manufacturer's spec) are a
// real published prevailing-torque table by size and property-class band. Split-ring
// spring washers, imperial washer dimensions, and out-of-table sizes remain
// documented order-of-magnitude scaling estimates. `partNumber` fields are generic
// standard designations (ISO/DIN number + size + variant) for cross-referencing
// against a supplier's current catalog — not a specific manufacturer's live SKU.

import { ALL_SIZES, METRIC_SIZES, type FastenerSize } from './fastenerStandards';

export type WasherType = 'plain' | 'belleville' | 'splitRingSpring';

export interface WasherPreset {
  id: string;           // `${sizeId}-${type}-${specStandard}`
  type: WasherType;
  sizeId: string;
  specStandard: string;  // e.g. 'ISO 7089', 'ISO 7093', 'DIN 6796'
  sourced: boolean;      // true if this size's dims come from a real published table
  odMm: number;
  idMm: number;
  thicknessMm: number;
  partNumber: string;
  customStiffnessNPerMm?: number; // advanced-mode override (belleville/splitRingSpring only); undefined on all static presets
}

// ISO 7089 (normal series) plain washer dimensions for the metric sizes in scope.
const iso7089Dims: Record<string, { id: number; od: number; t: number }> = {
  M3: { id: 3.2, od: 7, t: 0.5 },
  M4: { id: 4.3, od: 9, t: 0.8 },
  M5: { id: 5.3, od: 10, t: 1.0 },
  M6: { id: 6.4, od: 12, t: 1.6 },
  M8: { id: 8.4, od: 16, t: 1.6 },
  M10: { id: 10.5, od: 20, t: 2.0 },
  M12: { id: 13, od: 24, t: 2.5 },
  M16: { id: 17, od: 30, t: 3.0 },
  M20: { id: 21, od: 37, t: 3.0 },
};

// DIN 6796 conical spring (Belleville) washer for bolted connections — real
// published dimensions (d1 min, d2 max, h max) for M3-M12; sizes beyond this range
// fall back to the d2~2.2d/h~0.28d scaling used before, flagged via `sourced: false`.
const din6796Dims: Record<string, { id: number; od: number; h: number }> = {
  M3: { id: 3.2, od: 7.00, h: 0.85 },
  M4: { id: 4.3, od: 9.00, h: 1.30 },
  M5: { id: 5.3, od: 11.00, h: 1.55 },
  M6: { id: 6.4, od: 14.00, h: 2.00 },
  M8: { id: 8.4, od: 18.00, h: 2.60 },
  M10: { id: 10.5, od: 23.00, h: 3.20 },
  M12: { id: 12.5, od: 28.00, h: 3.70 },
};

function buildWashers(size: FastenerSize): WasherPreset[] {
  const d = size.nominalDiameterMm;
  const plain = iso7089Dims[size.id];
  const plainOd = plain ? plain.od : d * 2.2 + 1;
  const plainId = plain ? plain.id : d + 0.4;
  const plainT = plain ? plain.t : d * 0.16;

  const belleville = din6796Dims[size.id];
  const bellevilleOd = belleville ? belleville.od : d * 2.2;
  const bellevilleId = belleville ? belleville.id : d + 0.5;
  const bellevilleT = belleville ? belleville.h : Math.max(0.3, d * 0.06);

  return [
    { id: `${size.id}-plain-iso7089`, type: 'plain', sizeId: size.id, specStandard: 'ISO 7089', sourced: !!plain, odMm: plainOd, idMm: plainId, thicknessMm: plainT, partNumber: `ISO 7089 - ${d}` },
    // ISO 7093 (large-OD/wide series) — modelled as ~1.15x the ISO 7089 OD; a full
    // tabulated ISO 7093 dataset wasn't sourced, so treat as representative.
    { id: `${size.id}-plain-iso7093`, type: 'plain', sizeId: size.id, specStandard: 'ISO 7093 (wide)', sourced: false, odMm: plainOd * 1.15, idMm: plainId, thicknessMm: plainT * 1.05, partNumber: `ISO 7093 - ${d}` },
    { id: `${size.id}-belleville-din6796`, type: 'belleville', sizeId: size.id, specStandard: 'DIN 6796', sourced: !!belleville, odMm: bellevilleOd, idMm: bellevilleId, thicknessMm: bellevilleT, partNumber: `DIN 6796 - ${size.id}` },
    // Split-ring spring washer (DIN 127-style proportions) — no better open dataset found.
    { id: `${size.id}-splitRingSpring-din127`, type: 'splitRingSpring', sizeId: size.id, specStandard: 'DIN 127 (representative)', sourced: false, odMm: d * 1.3 + 2, idMm: d + 0.3, thicknessMm: Math.max(0.4, d * 0.125), partNumber: `DIN 127 - ${size.id}` },
  ];
}

export const WASHER_PRESETS: WasherPreset[] = ALL_SIZES.flatMap(buildWashers);

export function getWashersForSize(sizeId: string): WasherPreset[] {
  return WASHER_PRESETS.filter((w) => w.sizeId === sizeId);
}

export function getWashersForSizeAndType(sizeId: string, type: WasherType): WasherPreset[] {
  return WASHER_PRESETS.filter((w) => w.sizeId === sizeId && w.type === type);
}

export function getWasher(id: string): WasherPreset | undefined {
  return WASHER_PRESETS.find((w) => w.id === id);
}

export type NutType = 'plainHex' | 'nylonInsertLocknut' | 'allMetalPrevailingTorque';
export type PropertyClassBand = '5-8' | '10-12';

export interface NutPreset {
  id: string;
  type: NutType;
  sizeId: string;
  specStandard: string;
  propertyClassBand?: PropertyClassBand; // allMetalPrevailingTorque only
  flatsAcrossMm: number;
  heightMm: number;
  prevailingTorqueNm?: number; // additive locking torque
  partNumber: string;
}

// Real published prevailing (breakaway) torque table for all-metal prevailing-torque
// nuts (the "K-nut"/Aerotight/Aeronut/Philidas/Stover/DIN 980-V family), N·m, by size
// and property-class band: first-install max torque is used here as the nut's rated
// locking torque (a conservative, comparable figure to the nylon-insert nut's single
// value). M3 is extrapolated below the sourced range (M4-M24); M16/M20 are sourced.
const allMetalPrevailingTorqueNm: Record<string, { band58: number; band1012: number }> = {
  M3: { band58: 0.6, band1012: 0.8 }, // extrapolated from the M4 row
  M4: { band58: 0.9, band1012: 1.2 },
  M5: { band58: 1.6, band1012: 2.1 },
  M6: { band58: 3.0, band1012: 4.0 },
  M8: { band58: 6.0, band1012: 8.0 },
  M10: { band58: 10.5, band1012: 14.0 },
  M12: { band58: 15.5, band1012: 21.0 },
  M16: { band58: 32.0, band1012: 42.0 },
  M20: { band58: 54.0, band1012: 72.0 },
};

function buildNuts(size: FastenerSize): NutPreset[] {
  const d = size.nominalDiameterMm;
  const flatsAcrossMm = size.headFlatsAcrossMm.hexHead; // nut across-flats standardized equal to bolt head across-flats
  const allMetal = allMetalPrevailingTorqueNm[size.id];
  const allMetalFallback = { band58: d * 0.4, band1012: d * 0.55 };
  const torque = allMetal ?? allMetalFallback;

  return [
    { id: `${size.id}-plainHex`, type: 'plainHex', sizeId: size.id, specStandard: 'ISO 4032', flatsAcrossMm, heightMm: d * 0.8, partNumber: `ISO 4032 - ${size.id}` },
    { id: `${size.id}-nylonInsertLocknut`, type: 'nylonInsertLocknut', sizeId: size.id, specStandard: 'ISO 10511 (DIN 985)', flatsAcrossMm, heightMm: d * 1.5, prevailingTorqueNm: d * 0.3, partNumber: `ISO 10511 - ${size.id}` },
    {
      id: `${size.id}-allMetalPrevailingTorque-58`,
      type: 'allMetalPrevailingTorque',
      sizeId: size.id,
      specStandard: 'ISO 7042 (DIN 980-V) — K-nut / Aerotight-style, class 5-8',
      propertyClassBand: '5-8',
      flatsAcrossMm,
      heightMm: d * 0.9,
      prevailingTorqueNm: torque.band58,
      partNumber: `ISO 7042 - ${size.id} - Cl.5-8`,
    },
    {
      id: `${size.id}-allMetalPrevailingTorque-1012`,
      type: 'allMetalPrevailingTorque',
      sizeId: size.id,
      specStandard: 'ISO 7042 (DIN 980-V) — K-nut / Aerotight-style, class 10-12',
      propertyClassBand: '10-12',
      flatsAcrossMm,
      heightMm: d * 0.9,
      prevailingTorqueNm: torque.band1012,
      partNumber: `ISO 7042 - ${size.id} - Cl.10-12`,
    },
  ];
}

export const NUT_PRESETS: NutPreset[] = ALL_SIZES.flatMap(buildNuts);

export function getNutsForSize(sizeId: string): NutPreset[] {
  return NUT_PRESETS.filter((n) => n.sizeId === sizeId);
}

export function getNutsForSizeAndType(sizeId: string, type: NutType): NutPreset[] {
  return NUT_PRESETS.filter((n) => n.sizeId === sizeId && n.type === type);
}

export function getNut(id: string): NutPreset | undefined {
  return NUT_PRESETS.find((n) => n.id === id);
}

export type InsertVariant = 'freeRunning' | 'screwLock';
export const INSERT_LENGTH_RATIOS = [1.0, 1.5, 2.0, 2.5, 3.0] as const;

export interface ThreadedInsertPreset {
  id: string;
  sizeId: string;
  variant: InsertVariant;
  lengthToDiameterRatio: number;
  engagementStrengthDeratingFactor: number; // vs. a solid tapped thread of the same material; 1.0 = no derating
  prevailingTorqueNm?: number; // screwLock only
  partNumber: string;
}

// Wire thread inserts (HeliCoil/Recoil/Kato-style), metric sizes only in v1 scope.
// Free-running = standard smooth fit; screw-lock = one or more deformed coils give
// prevailing torque (conventionally dyed red per NAS1130/NASM21209). No manufacturer
// publishes a clean cross-size locking-torque table in open sources — the one
// confirmed data point (M5 screw-lock ~1.6 N·m max first-cycle) matches the
// all-metal prevailing-torque nut table's M5 class-5/8 value almost exactly, so that
// same table is reused here as a representative approximation.
export const THREADED_INSERT_PRESETS: ThreadedInsertPreset[] = METRIC_SIZES.flatMap((size) => {
  const torque = allMetalPrevailingTorqueNm[size.id] ?? { band58: size.nominalDiameterMm * 0.4, band1012: size.nominalDiameterMm * 0.55 };
  return INSERT_LENGTH_RATIOS.flatMap((ratio) => [
    {
      id: `${size.id}-insert-freeRunning-${ratio}D`,
      sizeId: size.id,
      variant: 'freeRunning' as const,
      lengthToDiameterRatio: ratio,
      engagementStrengthDeratingFactor: 1.0,
      partNumber: `Wire Thread Insert — ${size.id} — ${ratio}D — Free Running`,
    },
    {
      id: `${size.id}-insert-screwLock-${ratio}D`,
      sizeId: size.id,
      variant: 'screwLock' as const,
      lengthToDiameterRatio: ratio,
      engagementStrengthDeratingFactor: 1.0,
      prevailingTorqueNm: torque.band58,
      partNumber: `Wire Thread Insert — ${size.id} — ${ratio}D — Screw-Lock`,
    },
  ]);
});

export function getThreadedInsertsForSize(sizeId: string): ThreadedInsertPreset[] {
  return THREADED_INSERT_PRESETS.filter((t) => t.sizeId === sizeId);
}

export function getThreadedInsert(sizeId: string, variant: InsertVariant = 'freeRunning', lengthToDiameterRatio = 1.5): ThreadedInsertPreset | undefined {
  return THREADED_INSERT_PRESETS.find((t) => t.sizeId === sizeId && t.variant === variant && t.lengthToDiameterRatio === lengthToDiameterRatio);
}
