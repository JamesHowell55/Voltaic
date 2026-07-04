# Voltaic Labs — Engineering Calculators

A React + TypeScript site for first-principles engineering calculators, branded for Voltaic Labs. Dark,
technical UI with a teal brand accent (`src/assets/brand/` has the source logo files and
`voltaic-labs-brand.md` — kept alongside for reference — has the full palette).

Built with Vite + React 19 + react-router-dom.

## Tools

- **Busbar Calculator** (`/busbar`) — model a single busbar (up to 10 lengthwise sections of varying
  cross-section, with axial heat conduction between them) or a stack of parallel bars, then apply continuous,
  short-circuit/fault, or a multi-step load-profile current and calculate conductor temperature over time.
  All formulas are shown with substituted values. See [src/lib/busbarPhysics.ts](src/lib/busbarPhysics.ts) for
  the nodal thermal network, skin effect (IEC 60287-1-1), short-circuit heating (IEC 60865-1), and coating
  thermal resistance model.
- **Creepage & Clearance Calculator** (`/creepage-clearance`) — minimum clearance and creepage distances per
  IEC 60664-1, accounting for overvoltage category (or a custom value), pollution degree, material group (CTI),
  insulation type, electric field condition (Case A inhomogeneous / Case B homogeneous), a configurable factor
  of safety, and altitude correction from sea level to 50,000 ft, cross-checked against Paschen's Law. See
  [src/lib/creepageClearance.ts](src/lib/creepageClearance.ts) for the source tables (IEC 60664-1 Tables
  F.1/F.2/F.10, IEC 60335-1 Tables 17/18) and [src/lib/paschen.ts](src/lib/paschen.ts) for the physics cross-check.

## Theming

The header/navbar is always black (fixed `--navbar-*` tokens in `src/index.css`, independent of theme). Everything
else supports light/dark mode plus a custom accent colour, via the "Theme" control in the navbar
(`src/components/ThemeControls.tsx`). State (`mode`, `accentHex`) lives in `src/lib/ThemeContext.tsx`, persisted to
`localStorage`; `src/lib/theme.ts` derives the full on-dark/on-light accent variants from a single hex (HSL-based)
and applies them as runtime CSS custom-property overrides. Defaults to the Voltaic Labs teal (`#5DCAA5`).

## PDF export

Each calculator has an "Export PDF" button. `src/lib/pdfExport.ts` builds an off-screen, print-styled report
(inputs + outputs + a small disclaimer on page 1, calculation steps on page 2 via `break-before: page`) and
renders it with `html2pdf.js`. Filenames follow `YYYYMMDD_HH_MM_VoltaicLabs_<Tab_Name>.pdf`
(`buildPdfFilename()`). Each calculator page builds its own `inputSections`/`outputSections`/`calculationSteps`
data from current state — see `BusbarCalculator.tsx` or `CreepageClearanceCalculator.tsx` for the pattern.

## Development

```bash
npm install
npm run dev
```

## Adding a new calculator

1. Add a `src/lib/<name>Physics.ts` module with the pure calculation functions.
2. Add a `src/pages/<Name>Calculator.tsx` page.
3. Register the route in `src/App.tsx` and the nav link in `src/components/NavBar.tsx`.
4. Add a tool card to `src/pages/Home.tsx`.
5. For PDF export, build `inputSections`/`outputSections`/`calculationSteps` (see `src/lib/pdfExport.ts` types)
   from your page's state, and add an "Export PDF" button calling `exportReportToPdf(...)` — follow the existing
   calculators for the pattern.
