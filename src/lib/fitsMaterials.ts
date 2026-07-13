// Shaft/hub material presets for the Fits & Limits (interference fit) calculator.
// Mirrors the clampedMaterials.ts convention of a closed preset set plus an
// editable 'custom' entry, extended with Poisson's ratio (needed by the Lamé
// thick-cylinder equations) since clampedMaterials.ts doesn't carry it.
// Typical published property values at room temperature — verify against the
// specific material datasheet/certificate for critical designs, and note that
// E, yield, and CTE all vary with temperature (not modelled here beyond the
// single room-temperature value used across the whole operating range).

export type FitsMaterialId =
  | 'steelGeneric' | 'steelAlloy4140' | 'stainless304' | 'stainless17-4pn'
  | 'castIronGrey' | 'al6061t6' | 'al7075t6' | 'bronzePhosphor' | 'titanium6al4v' | 'custom';

export interface FitsMaterial {
  id: FitsMaterialId;
  name: string;
  elasticModulusGPa: number;
  poissonsRatio: number;
  yieldStrengthMPa: number;
  thermalExpansionPerC: number; // linear CTE, 1/°C
  isBrittle: boolean; // triggers a caveat: no well-defined yield point, compressive strength >> tensile
}

export const FITS_MATERIAL_PRESETS: Record<FitsMaterialId, FitsMaterial> = {
  steelGeneric: { id: 'steelGeneric', name: 'Steel (generic structural)', elasticModulusGPa: 200, poissonsRatio: 0.29, yieldStrengthMPa: 250, thermalExpansionPerC: 12.0e-6, isBrittle: false },
  steelAlloy4140: { id: 'steelAlloy4140', name: 'Alloy steel 4140 (Q&T)', elasticModulusGPa: 205, poissonsRatio: 0.29, yieldStrengthMPa: 655, thermalExpansionPerC: 12.3e-6, isBrittle: false },
  stainless304: { id: 'stainless304', name: 'Stainless steel 304 (annealed)', elasticModulusGPa: 193, poissonsRatio: 0.29, yieldStrengthMPa: 215, thermalExpansionPerC: 17.3e-6, isBrittle: false },
  'stainless17-4pn': { id: 'stainless17-4pn', name: 'Stainless steel 17-4PH (H900)', elasticModulusGPa: 196, poissonsRatio: 0.27, yieldStrengthMPa: 1170, thermalExpansionPerC: 10.8e-6, isBrittle: false },
  // Grey cast iron has no well-defined yield point (brittle) — the value here
  // is a conservative proxy (typical Class 30 tensile strength); compressive
  // strength is 3-4x higher, so this under-predicts compressive margin.
  castIronGrey: { id: 'castIronGrey', name: 'Grey cast iron (ASTM A48 Class 30)', elasticModulusGPa: 100, poissonsRatio: 0.26, yieldStrengthMPa: 172, thermalExpansionPerC: 10.8e-6, isBrittle: true },
  al6061t6: { id: 'al6061t6', name: 'Aluminium 6061-T6', elasticModulusGPa: 68.9, poissonsRatio: 0.33, yieldStrengthMPa: 276, thermalExpansionPerC: 23.6e-6, isBrittle: false },
  al7075t6: { id: 'al7075t6', name: 'Aluminium 7075-T6', elasticModulusGPa: 71.7, poissonsRatio: 0.33, yieldStrengthMPa: 503, thermalExpansionPerC: 23.4e-6, isBrittle: false },
  bronzePhosphor: { id: 'bronzePhosphor', name: 'Phosphor bronze C51900 (half-hard)', elasticModulusGPa: 110, poissonsRatio: 0.34, yieldStrengthMPa: 310, thermalExpansionPerC: 18.2e-6, isBrittle: false },
  titanium6al4v: { id: 'titanium6al4v', name: 'Titanium Ti-6Al-4V', elasticModulusGPa: 113.8, poissonsRatio: 0.34, yieldStrengthMPa: 880, thermalExpansionPerC: 8.6e-6, isBrittle: false },
  custom: { id: 'custom', name: 'Custom', elasticModulusGPa: 200, poissonsRatio: 0.3, yieldStrengthMPa: 250, thermalExpansionPerC: 12.0e-6, isBrittle: false },
};

export const FITS_MATERIAL_LIST: FitsMaterial[] = Object.values(FITS_MATERIAL_PRESETS);

export function getFitsMaterial(id: FitsMaterialId): FitsMaterial {
  return FITS_MATERIAL_PRESETS[id];
}
