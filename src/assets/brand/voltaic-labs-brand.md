# Voltaic Labs — brand reference

## Logo files
- `voltaic-labs-logo-light.svg` — primary lockup, for white/light backgrounds
- `voltaic-labs-logo-dark.svg` — primary lockup, on solid black (#0B0B0B) background
- `voltaic-labs-logo-dark-transparent.svg` — same as above but transparent background, for placing on any dark surface
- `voltaic-labs-icon.svg` — hexagon mark only, light version (for favicon, app icon, social avatar)
- `voltaic-labs-icon-dark.svg` — hexagon mark only, dark version

## Color palette

### Primary accent — teal
| Stop | Hex | Use |
|------|-----|-----|
| 50 (lightest) | `#E1F5EE` | Pale backgrounds, subtle section tints |
| 100 | `#9FE1CB` | Light fills, hover backgrounds |
| 200 | `#5DCAA5` | **Main brand accent** — buttons, links, icon fill on dark |
| 400 | `#1D9E75` | Mid accent, secondary CTAs |
| 600 | `#0F6E56` | Hexagon fill on light backgrounds, headings |
| 800 | `#085041` | Dark text on light teal fills |
| 900 (darkest) | `#04342C` | Bolt icon fill on light hexagon, darkest text |

### Neutrals
| Name | Hex | Use |
|------|-----|-----|
| Ink black | `#0B0B0B` | Dark backgrounds, dark-mode page canvas |
| Off-white | `#E1F5EE` (teal-tinted) or `#F7F7F5` (neutral) | Light backgrounds |
| Body text (light mode) | `#04342C` or `#1A1A1A` | Primary text on white |
| Body text (dark mode) | `#E1F5EE` or `#F0F0EE` | Primary text on black |
| Muted text | `#5F5E5A` | Secondary/supporting copy |

### Usage notes
- Teal 200 (`#5DCAA5`) is the "hero" color — use it sparingly, for the mark, links, and one primary CTA per page. Don't tint large surfaces with it.
- Teal 600 (`#0F6E56`) works well as a heading color on white backgrounds.
- Keep large surfaces neutral (white, off-white, or near-black) and let teal do the accenting — this is what keeps the brand feeling "engineering-precise" rather than loud.
- Maintain at least the 200/900 pairing (or 50/600 on light) for text-on-fill contrast — don't put teal 200 text on white, it won't pass contrast checks.

## CSS variables (drop into a global stylesheet)

```css
:root {
  --vl-teal-50: #E1F5EE;
  --vl-teal-100: #9FE1CB;
  --vl-teal-200: #5DCAA5;
  --vl-teal-400: #1D9E75;
  --vl-teal-600: #0F6E56;
  --vl-teal-800: #085041;
  --vl-teal-900: #04342C;

  --vl-ink: #0B0B0B;
  --vl-offwhite: #F7F7F5;
  --vl-text-muted: #5F5E5A;

  --vl-accent: var(--vl-teal-200);
  --vl-accent-strong: var(--vl-teal-600);
}

[data-theme="dark"] {
  --vl-bg: var(--vl-ink);
  --vl-text: var(--vl-teal-50);
}

[data-theme="light"] {
  --vl-bg: var(--vl-offwhite);
  --vl-text: var(--vl-teal-900);
}
```

## Typography direction (not yet finalized)
Logo uses a clean sans-serif (Helvetica Neue / system sans) at medium weight (500). For a website, a good pairing would be a geometric or grotesque sans (Inter, IBM Plex Sans, or Söhne) for body copy, keeping the same restrained, technical feel as the mark.

## Logo usage rules
- Maintain clear space around the mark equal to the height of the hexagon on all sides.
- Don't recolor the hexagon or bolt outside the palette above.
- Don't stretch or skew — scale proportionally only.
- On dark backgrounds, always use the dark variant (teal hexagon, dark bolt) — don't place the light variant (dark hexagon) on black, it will disappear.
