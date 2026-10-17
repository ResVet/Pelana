// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A small house, cut open like a doll's house: bathroom, kitchen and living
// room, a yard, and a flat roof with the water tank. Every place where water
// can stand is modelled, and each one knows what changes when it is dealt
// with: water drained, a lid put on, rubbish taken away, or fish added.
// Units are metres.

import type { SpotKey } from '../../shared/house.ts';
import { linear, type Vec3 } from '../gl/math.ts';

export type Shape = 'box' | 'rbox' | 'cyl' | 'cone' | 'ball' | 'ring' | 'disc';

/** What a part does when its spot is dealt with. */
export type Role = 'static' | 'water' | 'lid' | 'item' | 'fish';

export interface Part {
  shape: Shape;
  /** Centre of the bottom face for cylinders and cones, centre for everything else. */
  at: Vec3;
  /** Box size, or [radius, height, radius] for round shapes. */
  size: Vec3;
  colour: Vec3;
  /** Material id and parameters, as in the lit shader. */
  mat: [number, number, number];
  spot?: SpotKey;
  role?: Role;
  /** Rotation about y, radians. */
  turn?: number;
  /** Tilt about x, radians. */
  tilt?: number;
}

export interface Palette {
  wall: Vec3;
  wallInside: Vec3;
  floor: Vec3;
  bathTile: Vec3;
  wood: Vec3;
  woodDark: Vec3;
  white: Vec3;
  water: Vec3;
  grass: Vec3;
  soil: Vec3;
  concrete: Vec3;
  plasticBlue: Vec3;
  galon: Vec3;
  pot: Vec3;
  leaf: Vec3;
  flower: Vec3;
  tyre: Vec3;
  can: Vec3;
  tank: Vec3;
  fish: Vec3;
  metal: Vec3;
}

export const LIGHT_PALETTE: Palette = {
  wall: linear('#ece8df'),
  wallInside: linear('#e3e7e1'),
  floor: linear('#d9dedb'),
  bathTile: linear('#b9d6d2'),
  wood: linear('#b38c63'),
  woodDark: linear('#7d6146'),
  white: linear('#f1f2ef'),
  water: linear('#256f77'),
  grass: linear('#a7bb8c'),
  soil: linear('#9c8c74'),
  concrete: linear('#c4c6c1'),
  plasticBlue: linear('#3d7fb8'),
  galon: linear('#9fc4dc'),
  pot: linear('#b0705a'),
  leaf: linear('#5d8a5a'),
  flower: linear('#d86f86'),
  tyre: linear('#2a2b2c'),
  can: linear('#c9474b'),
  tank: linear('#e3e0d3'),
  fish: linear('#e8823e'),
  metal: linear('#8f979a'),
};

export const DARK_PALETTE: Palette = {
  ...LIGHT_PALETTE,
  wall: linear('#b8b4aa'),
  wallInside: linear('#aab0aa'),
  floor: linear('#9ea4a1'),
  grass: linear('#6f8160'),
};

// Material ids (see materials.ts).
const PLAIN = 0;
const TILE = 1;
const PLASTIC = 14;

const plain = (rough = 0.7): [number, number, number] => [PLAIN, rough, 0];
const tile = (size: number, grout: number): [number, number, number] => [TILE, size, grout];

export function buildHouse(p: Palette): Part[] {
  const parts: Part[] = [];
  const add = (part: Part) => parts.push(part);
  const box = (min: Vec3, max: Vec3, colour: Vec3, mat = plain(), extra: Partial<Part> = {}) =>
    add({ shape: 'rbox', at: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]], colour, mat, ...extra });
  const cyl = (at: Vec3, r: number, h: number, colour: Vec3, mat = plain(), extra: Partial<Part> = {}) => add({ shape: 'cyl', at, size: [r, h, r], colour, mat, ...extra });
  const water = (spot: SpotKey, at: Vec3, r: number, colour = p.water) => add({ shape: 'disc', at, size: [r, 1, r], colour, mat: plain(0.22), spot, role: 'water' });

  // Ground: the house floor and the yard.
  box([-4.2, -0.16, -3.2], [2.6, 0, 2.6], p.floor, tile(0.4, 0.008));
  box([2.6, -0.24, -3.2], [6.6, -0.06, 2.6], p.grass, plain(0.95));
  box([2.6, -0.28, -3.24], [6.66, -0.2, 2.64], p.soil, plain(0.95));

  // Outer walls at the back and left; the front and right are cut away.
  box([-4.2, 0, -3.2], [2.6, 2.8, -3.0], p.wall, plain(0.85));
  box([-4.2, 0, -3.0], [-4.0, 2.8, 2.6], p.wall, plain(0.85));
  // Bathroom: tiled walls cut low so the camera can see in.
  box([-1.7, 0, -3.0], [-1.55, 1.3, -0.6], p.bathTile, tile(0.2, 0.006));
  box([-4.0, 0, -0.75], [-2.7, 1.3, -0.6], p.bathTile, tile(0.2, 0.006));
  box([-2.0, 0, -0.75], [-1.55, 1.3, -0.6], p.bathTile, tile(0.2, 0.006));
  box([-4.0, 0.0, -2.98], [-1.7, 1.6, -2.95], p.bathTile, tile(0.2, 0.006));
  box([-3.98, 0.0, -2.95], [-3.95, 1.6, -0.75], p.bathTile, tile(0.2, 0.006));

  // Flat concrete roof over the back strip, a gutter along its edge, and the water tank on a stand.
  box([-4.2, 2.8, -3.5], [2.6, 2.95, -1.9], p.concrete, plain(0.9));
  box([-4.2, 2.62, -3.72], [2.6, 2.7, -3.5], p.metal, plain(0.5));
  box([-4.2, 2.7, -3.72], [2.6, 2.86, -3.7], p.metal, plain(0.5));
  box([-4.2, 2.7, -3.52], [2.6, 2.84, -3.5], p.metal, plain(0.5));
  add({ shape: 'box', at: [1.0, 2.73, -3.61], size: [3.0, 0.03, 0.17], colour: p.water, mat: plain(0.22), spot: 'gutter', role: 'water' });
  for (const [x, z] of [[1.4, -3.3], [2.2, -3.62], [0.5, -3.6], [2.4, -3.45]] as [number, number][]) {
    add({ shape: 'ball', at: [x, 2.76, z], size: [0.09, 0.03, 0.06], colour: linear('#8a7a3c'), mat: plain(0.8), spot: 'gutter', role: 'item' });
  }
  for (const [x, z] of [[-3.0, -3.0], [-2.1, -3.0], [-3.0, -2.2], [-2.1, -2.2]] as [number, number][]) {
    box([x - 0.04, 2.95, z - 0.04], [x + 0.04, 3.45, z + 0.04], p.metal, plain(0.5));
  }
  box([-3.1, 3.45, -3.1], [-2.0, 3.5, -2.1], p.metal, plain(0.5));
  cyl([-2.55, 3.5, -2.6], 0.46, 0.95, p.tank, [PLASTIC, 0.4, 0]);
  water('tank', [-2.55, 4.38, -2.6], 0.42);
  add({ shape: 'cyl', at: [-2.55, 4.45, -2.6], size: [0.36, 0.08, 0.36], colour: p.tank, mat: [PLASTIC, 0.4, 0], spot: 'tank', role: 'lid' });

  // Bak mandi in the bathroom corner, and a bucket.
  box([-3.95, 0, -2.95], [-3.1, 0.78, -2.85], p.bathTile, tile(0.1, 0.004));
  box([-3.95, 0, -2.25], [-3.1, 0.78, -2.15], p.bathTile, tile(0.1, 0.004));
  box([-3.2, 0, -2.85], [-3.1, 0.78, -2.25], p.bathTile, tile(0.1, 0.004));
  box([-3.95, 0, -2.85], [-3.85, 0.78, -2.25], p.bathTile, tile(0.1, 0.004));
  add({ shape: 'box', at: [-3.525, 0.64, -2.55], size: [0.65, 0.01, 0.6], colour: p.water, mat: plain(0.22), spot: 'tub', role: 'water' });
  cyl([-2.25, 0, -1.4], 0.19, 0.4, p.plasticBlue, [PLASTIC, 0.3, 0]);
  water('bucket', [-2.25, 0.33, -1.4], 0.17);
  add({ shape: 'cyl', at: [-2.25, 0.4, -1.4], size: [0.21, 0.04, 0.21], colour: p.plasticBlue, mat: [PLASTIC, 0.3, 0], spot: 'bucket', role: 'lid' });
  cyl([-2.25, 0.44, -1.4], 0.05, 0.03, p.plasticBlue, [PLASTIC, 0.3, 0], { spot: 'bucket', role: 'lid' });
  // A small floor drain.
  cyl([-2.9, 0.0, -1.6], 0.08, 0.006, p.metal, plain(0.4));

  // Kitchen along the back wall: counter, water dispenser, fridge.
  box([-1.4, 0, -2.98], [0.8, 0.86, -2.4], p.woodDark, plain(0.7));
  box([-1.42, 0.86, -2.98], [0.82, 0.9, -2.36], p.white, tile(0.15, 0.004));
  box([1.1, 0, -2.85], [1.45, 0.9, -2.5], p.white, plain(0.4));
  cyl([1.275, 0.9, -2.675], 0.15, 0.42, p.galon, [PLASTIC, 0.12, 0]);
  box([1.13, 0.42, -2.52], [1.42, 0.45, -2.4], p.metal, plain(0.4));
  add({ shape: 'box', at: [1.275, 0.455, -2.46], size: [0.25, 0.006, 0.09], colour: p.water, mat: plain(0.22), spot: 'dispenser', role: 'water' });
  box([1.7, 0, -2.95], [2.35, 1.75, -2.3], p.white, plain(0.35));
  box([2.35, 0.02, -2.9], [2.45, 0.08, -2.4], p.metal, plain(0.4));
  add({ shape: 'box', at: [2.4, 0.075, -2.65], size: [0.07, 0.006, 0.44], colour: p.water, mat: plain(0.22), spot: 'fridge', role: 'water' });

  // Living room: a food cupboard standing in dishes of water against ants, a table with a vase, a bench.
  box([-3.6, 0.14, -0.2], [-2.6, 1.3, 0.3], p.wood, plain(0.65));
  for (const [x, z] of [[-3.55, -0.15], [-2.65, -0.15], [-3.55, 0.25], [-2.65, 0.25]] as [number, number][]) {
    box([x - 0.03, 0.02, z - 0.03], [x + 0.03, 0.14, z + 0.03], p.woodDark, plain(0.7));
    cyl([x, 0, z], 0.075, 0.04, p.white, plain(0.3));
    water('anttrap', [x, 0.03, z], 0.06);
  }
  box([-0.3, 0.68, 0.3], [0.9, 0.73, 1.0], p.wood, plain(0.55));
  for (const [x, z] of [[-0.25, 0.35], [0.85, 0.35], [-0.25, 0.95], [0.85, 0.95]] as [number, number][]) box([x - 0.03, 0, z - 0.03], [x + 0.03, 0.68, z + 0.03], p.woodDark, plain(0.6));
  add({ shape: 'cone', at: [0.3, 0.73, 0.62], size: [0.08, 0.26, 0.08], colour: linear('#7fa6b6'), mat: [PLASTIC, 0.1, 0] });
  water('vase', [0.3, 0.95, 0.62], 0.075);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add({ shape: 'ball', at: [0.3 + Math.cos(a) * 0.08, 1.1 + (i % 2) * 0.05, 0.62 + Math.sin(a) * 0.08], size: [0.06, 0.06, 0.06], colour: i % 2 ? p.flower : linear('#f0c25e'), mat: plain(0.6) });
  }
  box([-1.0, 0, 1.8], [1.0, 0.45, 2.3], p.wood, plain(0.6));
  box([-1.0, 0.45, 2.2], [1.0, 0.9, 2.3], p.wood, plain(0.6));

  // Yard: plant pots, a caged bird's water dish, old tyres, rubbish, a pond.
  for (const [x, z, r] of [[3.95, 1.85, 0.2], [3.4, 2.15, 0.16]] as [number, number, number][]) {
    cyl([x, -0.06, z], r * 1.25, 0.03, p.pot, plain(0.7));
    water('saucer', [x, -0.025, z], r * 1.15);
    add({ shape: 'cone', at: [x, -0.03, z], size: [r * 0.8, r * 1.6, r], colour: p.pot, mat: plain(0.75) });
    add({ shape: 'ball', at: [x, r * 1.8, z], size: [r * 1.1, r * 0.9, r * 1.1], colour: p.leaf, mat: plain(0.8) });
  }
  box([4.72, -0.06, -0.62], [4.78, 1.7, -0.56], p.woodDark, plain(0.6));
  box([4.75, 1.66, -0.62], [5.2, 1.7, -0.56], p.woodDark, plain(0.6));
  add({ shape: 'cyl', at: [5.15, 0.95, -0.59], size: [0.24, 0.02, 0.24], colour: p.woodDark, mat: plain(0.6) });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add({ shape: 'cyl', at: [5.15 + Math.cos(a) * 0.23, 0.95, -0.59 + Math.sin(a) * 0.23], size: [0.006, 0.6, 0.006], colour: p.metal, mat: plain(0.4) });
  }
  add({ shape: 'cone', at: [5.15, 1.55, -0.59], size: [0.25, 0.14, 0.02], colour: p.woodDark, mat: plain(0.6) });
  cyl([5.06, 0.97, -0.52], 0.07, 0.035, p.white, plain(0.3));
  water('birdbath', [5.06, 1.0, -0.52], 0.06);
  add({ shape: 'ball', at: [5.2, 1.12, -0.62], size: [0.05, 0.045, 0.07], colour: linear('#c9a24a'), mat: plain(0.6) });
  for (const [y, item] of [[-0.06, true], [0.16, true]] as [number, boolean][]) {
    add({ shape: 'ring', at: [4.45, y + 0.1, 0.65], size: [0.36, 0.2, 0.36], colour: p.tyre, mat: plain(0.85), spot: 'tyre', role: item ? 'item' : 'static' });
  }
  add({ shape: 'disc', at: [4.45, -0.02, 0.65], size: [0.22, 1, 0.22], colour: p.water, mat: plain(0.08), spot: 'tyre', role: 'item' });
  const litter: [Vec3, Vec3, Vec3][] = [
    [[5.35, -0.06, 2.0], [0.035, 0.12, 0.035], p.can],
    [[5.55, -0.06, 2.2], [0.035, 0.12, 0.035], linear('#3e8a5c')],
    [[5.2, -0.06, 2.3], [0.05, 0.1, 0.05], p.white],
    [[5.6, -0.06, 1.85], [0.045, 0.24, 0.045], linear('#7cb2c9')],
  ];
  for (const [at, size, colour] of litter) add({ shape: 'cyl', at, size, colour, mat: [PLASTIC, 0.3, 0], spot: 'litter', role: 'item' });
  add({ shape: 'cyl', at: [5.4, 0.0, 2.38], size: [0.04, 0.09, 0.04], colour: p.can, mat: [PLASTIC, 0.3, 0], spot: 'litter', role: 'item', tilt: Math.PI / 2 });
  box([3.85, -0.12, -2.75], [5.35, 0.06, -2.65], p.concrete, plain(0.9));
  box([3.85, -0.12, -1.75], [5.35, 0.06, -1.65], p.concrete, plain(0.9));
  box([3.85, -0.12, -2.65], [3.95, 0.06, -1.75], p.concrete, plain(0.9));
  box([5.25, -0.12, -2.65], [5.35, 0.06, -1.75], p.concrete, plain(0.9));
  add({ shape: 'box', at: [4.6, 0.0, -2.2], size: [1.3, 0.01, 0.9], colour: p.water, mat: plain(0.22) });
  for (let i = 0; i < 4; i++) {
    add({ shape: 'ball', at: [4.6, 0.012, -2.2], size: [0.08, 0.018, 0.035], colour: p.fish, mat: plain(0.4), spot: 'pond', role: 'fish', turn: i });
  }
  return parts;
}

/** Where each hotspot sits: just above the water of its spot. */
export const ANCHORS: Record<SpotKey, Vec3> = {
  tub: [-3.52, 0.95, -2.55],
  bucket: [-2.25, 0.62, -1.4],
  dispenser: [1.27, 0.62, -2.42],
  fridge: [2.42, 0.3, -2.65],
  vase: [0.3, 1.35, 0.62],
  anttrap: [-2.65, 0.28, 0.3],
  saucer: [3.95, 0.7, 1.85],
  birdbath: [5.06, 1.25, -0.52],
  tyre: [4.45, 0.55, 0.65],
  litter: [5.4, 0.35, 2.1],
  pond: [4.6, 0.3, -2.2],
  gutter: [1.0, 3.05, -3.61],
  tank: [-2.55, 4.75, -2.6],
};
