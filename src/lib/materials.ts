export interface Material {
  id: 'copper' | 'aluminium';
  name: string;
  rho20: number;            // Ω·m, resistivity at 20°C
  alpha20: number;          // 1/°C, temp coefficient of resistance at 20°C
  beta: number;             // °C, IEC 60865 inferred absolute-zero-resistance offset
  density: number;          // kg/m³
  specificHeat: number;     // J/(kg·K)
  kAdiabatic: number;       // A·s^0.5/mm², IEC 60865-1 material constant
  thermalConductivity: number; // W/(m·K), for axial conduction between busbar sections
  defaultMaxContinuousTemp: number; // °C, IEC 61439-1 general bare-busbar limit (35°C amb + 70K)
  defaultMaxShortCircuitTemp: number; // °C, bare-conductor short-time limit
}

export const MATERIALS: Record<'copper' | 'aluminium', Material> = {
  copper: {
    id: 'copper',
    name: 'Copper',
    rho20: 1.72e-8,
    alpha20: 0.00393,
    beta: 234.5,
    density: 8960,
    specificHeat: 385,
    kAdiabatic: 226,
    thermalConductivity: 390,
    defaultMaxContinuousTemp: 105,
    defaultMaxShortCircuitTemp: 250,
  },
  aluminium: {
    id: 'aluminium',
    name: 'Aluminium',
    rho20: 2.82e-8,
    alpha20: 0.00403,
    beta: 228,
    density: 2700,
    specificHeat: 900,
    kAdiabatic: 148,
    thermalConductivity: 230,
    defaultMaxContinuousTemp: 105,
    defaultMaxShortCircuitTemp: 200,
  },
};

export interface EmissivityPreset {
  id: string;
  label: string;
  value: number;
}

export const EMISSIVITY_PRESETS: EmissivityPreset[] = [
  { id: 'bright', label: 'Bright / mill-finish metal', value: 0.1 },
  { id: 'weathered', label: 'Weathered / oxidised', value: 0.4 },
  { id: 'painted', label: 'Painted (matte, any dark colour)', value: 0.9 },
];

export interface CoatingPreset {
  id: string;
  label: string;
  thermalConductivity: number; // W/(m·K)
  thicknessMm: number;         // typical thickness, mm
}

export const COATING_PRESETS: CoatingPreset[] = [
  { id: 'none', label: 'None (bare metal)', thermalConductivity: 0.3, thicknessMm: 0 },
  { id: 'epoxy', label: 'Epoxy powder coat', thermalConductivity: 0.3, thicknessMm: 0.2 },
  { id: 'heatshrink', label: 'PVC / heat-shrink sleeve', thermalConductivity: 0.17, thicknessMm: 0.5 },
  { id: 'tin', label: 'Tin plating', thermalConductivity: 65, thicknessMm: 0.01 },
  { id: 'silver', label: 'Silver plating', thermalConductivity: 427, thicknessMm: 0.01 },
  { id: 'custom', label: 'Custom', thermalConductivity: 0.3, thicknessMm: 0.2 },
];
