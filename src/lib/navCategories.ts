// Single source of truth for site navigation: the NavBar dropdowns, the Home page
// tool grid, and App.tsx's placeholder route registration all read from this file,
// so a new calculator only needs to be added here once. `links` within each
// category are kept in alphabetical order by label.

export interface CalculatorLink {
  label: string;
  path: string;
  available: boolean;
  description: string;
}

export interface NavCategory {
  label: string;
  links: CalculatorLink[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Electrical',
    links: [
      { label: 'Busbar Calculation', path: '/busbar', available: true, description: 'Build a busbar cross-section from multiple bar sections, apply AC or DC current, duration, ambient temperature and material, and calculate steady-state or short-circuit conductor temperature.' },
      { label: 'Cable Voltage Drop', path: '/cable-voltage-drop', available: false, description: 'Voltage drop along a cable run from conductor size, length, current, and power factor, checked against a target percentage.' },
      { label: 'Capacitor Sizing', path: '/capacitor-sizing', available: false, description: 'Size a capacitor for ripple current, bus support, or filtering duty from voltage, current, and frequency requirements.' },
      { label: 'Creepage and Clearance', path: '/creepage-clearance', available: true, description: 'Minimum creepage and clearance distances per IEC 60664-1 — pollution degree, material group (CTI), overvoltage category, and altitude correction from sea level up to 50,000 ft.' },
      { label: 'Harness Wire Bundle Diameter', path: '/harness-bundle-diameter', available: false, description: 'Estimate the overall diameter of a wire harness bundle from individual wire gauges, counts, and insulation build-up.' },
      { label: 'Wire Sizing', path: '/wire-sizing', available: false, description: 'Select a conductor size from current, ambient temperature, bundling/derating, and allowable voltage drop.' },
    ],
  },
  {
    label: 'Mechanical',
    links: [
      { label: 'Bolted Joint', path: '/bolted-joint', available: true, description: 'Metric and imperial fastener stack-ups, washers and locking nuts, tapped or threaded-insert engagement, VDI 2230 cone-of-compression stiffness, bidirectional preload/torque, and fastener/clamped-member yield checks.' },
      { label: 'Dynamics', path: '/dynamics', available: false, description: 'First-principles motion, force, and vibration calculations for mechanical design — natural frequency, impact, and load-case checks.' },
      { label: 'Orings', path: '/orings', available: false, description: 'O-ring groove sizing, squeeze/stretch percentage, and compatibility checks for static and dynamic seal applications.' },
    ],
  },
  {
    label: 'Thermal',
    links: [
      { label: 'Conductive Heat Transfer', path: '/conductive-heat-transfer', available: false, description: 'Steady-state conductive heat flow through a layered material stack from thermal conductivity, thickness, and area.' },
      { label: 'Pressure Drop', path: '/pressure-drop', available: false, description: 'Fluid pressure drop through pipework or channels from flow rate, geometry, and fluid properties.' },
    ],
  },
  {
    label: 'Material',
    links: [
      { label: 'Material Database', path: '/material-database', available: false, description: 'A filterable material property database — select a class (metallics, polymers, carbon, ceramics) and property ranges to find matching candidate materials.' },
    ],
  },
];

export const CONVERSIONS_LINK: CalculatorLink = {
  label: 'Conversions',
  path: '/conversions',
  available: true,
  description: 'Convert between units across distance, mass, force, torque, pressure, temperature, energy, power, area, volume, acceleration, speed, and density.',
};

export const ALL_CALCULATOR_LINKS: CalculatorLink[] = [...NAV_CATEGORIES.flatMap((c) => c.links), CONVERSIONS_LINK];

export function getCalculatorLinkByPath(path: string): CalculatorLink | undefined {
  return ALL_CALCULATOR_LINKS.find((l) => l.path === path);
}
