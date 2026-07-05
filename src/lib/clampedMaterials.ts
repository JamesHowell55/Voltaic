// Clamped-member material presets for the bolted joint calculator. Mirrors the
// materials.ts / COATING_PRESETS convention of a closed preset set plus an
// editable 'custom' entry. Typical published property values — verify against the
// specific material datasheet/certificate for critical designs.

export type ClampedMaterialId = 'al6061t6' | 'steelGeneric' | 'copperC101' | 'peek450g' | 'nylon' | 'custom';

export interface ClampedMaterial {
  id: ClampedMaterialId;
  name: string;
  elasticModulusGPa: number;
  yieldStrengthMPa: number;
  isPolymer: boolean; // triggers a bearing-stress/creep caveat in the UI
}

export const CLAMPED_MATERIAL_PRESETS: Record<ClampedMaterialId, ClampedMaterial> = {
  al6061t6: { id: 'al6061t6', name: 'Aluminium 6061-T6', elasticModulusGPa: 68.9, yieldStrengthMPa: 276, isPolymer: false },
  steelGeneric: { id: 'steelGeneric', name: 'Steel (generic structural)', elasticModulusGPa: 200, yieldStrengthMPa: 250, isPolymer: false },
  // Annealed condition (conservative default — yield varies widely by temper, ~50-340
  // MPa from annealed to hard-drawn; E is temper-independent for copper).
  copperC101: { id: 'copperC101', name: 'Copper (C101 / CW004A, ETP, annealed)', elasticModulusGPa: 117, yieldStrengthMPa: 70, isPolymer: false },
  peek450g: { id: 'peek450g', name: 'PEEK 450G', elasticModulusGPa: 3.7, yieldStrengthMPa: 100, isPolymer: true },
  nylon: { id: 'nylon', name: 'Nylon (PA6/66, dry)', elasticModulusGPa: 2.5, yieldStrengthMPa: 80, isPolymer: true },
  custom: { id: 'custom', name: 'Custom', elasticModulusGPa: 200, yieldStrengthMPa: 250, isPolymer: false },
};

export const CLAMPED_MATERIAL_LIST: ClampedMaterial[] = Object.values(CLAMPED_MATERIAL_PRESETS);

export function getClampedMaterial(id: ClampedMaterialId): ClampedMaterial {
  return CLAMPED_MATERIAL_PRESETS[id];
}
