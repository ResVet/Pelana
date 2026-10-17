// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Material ids and highlightable parts, matching the defines in the lit shader.

export const MAT = {
  plain: 0,
  tile: 1,
  chitin: 2,
  wing: 3,
  eye: 4,
  egg: 5,
  larva: 6,
  protein: 7,
  membrane: 8,
  skin: 9,
  rbc: 10,
  cell: 11,
  core: 12,
  rna: 13,
  plastic: 14,
  chrome: 15,
  paint: 16,
  glow: 17,
  hair: 18,
  droplet: 19,
} as const;

export const PART = { none: 0, lyre: 1, legs: 2, proboscis: 3, wings: 4 } as const;

/** Patterns of the chitin material (the scales on each body part). */
export const PATTERN = {
  plain: 0,
  scutum: 1,
  abdomen: 2,
  leg: 3,
  femur: 4,
  proboscis: 5,
  palp: 6,
  head: 7,
  white: 8,
  pale: 9,
  antenna: 10,
  fedAbdomen: 12,
} as const;
