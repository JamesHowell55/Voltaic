// Contact-size data for the Harness Designer.
//
// Sourced from a real MIL-DTL-38999 Series III cross-reference catalog
// (Glenair "MIL-DTL-38999 Contact Performance Specifications" + the Milnec
// TX/DS series wire & crimp contact dimension tables) — contact wire range,
// current rating, and max contact resistance — kept as a simple per-
// connector "wire gauge class" reference. Connector pin count, mounting
// style, shell size, and finish are not modelled — pin count is a direct
// user input, and this tool scopes to a single dominant contact size per
// connector (disclosed in the UI).

export type ContactSize = '22D' | '20' | '16' | '12';

export interface ContactSizeSpec {
  size: ContactSize;
  awgRange: number[];
  currentRatingA: number;
  contactResistanceMOhmMax: number;
}

export const CONTACT_SIZE_SPECS: Record<ContactSize, ContactSizeSpec> = {
  '22D': { size: '22D', awgRange: [22, 24, 26, 28], currentRatingA: 5, contactResistanceMOhmMax: 14.6 },
  '20': { size: '20', awgRange: [20, 22, 24], currentRatingA: 7.5, contactResistanceMOhmMax: 7.3 },
  '16': { size: '16', awgRange: [16, 18, 20], currentRatingA: 13, contactResistanceMOhmMax: 3.8 },
  '12': { size: '12', awgRange: [12, 14], currentRatingA: 23, contactResistanceMOhmMax: 1.7 },
};

export const CONTACT_SIZES: ContactSize[] = ['22D', '20', '16', '12'];
