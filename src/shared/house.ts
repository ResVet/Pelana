// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The breeding spots in the house check, the room each belongs to, and where
// it sits in the 3D model (metres, y up, origin at the centre of the floor).

export type Room = 'bathroom' | 'kitchen' | 'living' | 'yard' | 'roof';
export type SpotKey =
  | 'tub'
  | 'bucket'
  | 'dispenser'
  | 'fridge'
  | 'vase'
  | 'anttrap'
  | 'saucer'
  | 'birdbath'
  | 'tyre'
  | 'litter'
  | 'pond'
  | 'gutter'
  | 'tank';

export interface Spot {
  key: SpotKey;
  room: Room;
  /** Anchor point for the hotspot in model space. */
  at: [number, number, number];
}

export const ROOMS: Room[] = ['bathroom', 'kitchen', 'living', 'yard', 'roof'];

export const SPOTS: Spot[] = [
  { key: 'tub', room: 'bathroom', at: [-3.15, 0.62, -2.05] },
  { key: 'bucket', room: 'bathroom', at: [-2.25, 0.36, -1.35] },
  { key: 'dispenser', room: 'kitchen', at: [0.55, 1.05, -2.35] },
  { key: 'fridge', room: 'kitchen', at: [1.9, 0.22, -2.35] },
  { key: 'vase', room: 'living', at: [0.2, 0.95, 0.6] },
  { key: 'anttrap', room: 'living', at: [-1.95, 0.12, 1.3] },
  { key: 'saucer', room: 'yard', at: [3.95, 0.18, 1.85] },
  { key: 'birdbath', room: 'yard', at: [4.75, 1.25, -0.55] },
  { key: 'tyre', room: 'yard', at: [4.45, 0.32, 0.65] },
  { key: 'litter', room: 'yard', at: [5.4, 0.12, 2.1] },
  { key: 'pond', room: 'yard', at: [4.55, 0.12, -2.15] },
  { key: 'gutter', room: 'roof', at: [2.95, 2.62, -2.95] },
  { key: 'tank', room: 'roof', at: [-2.55, 3.35, -2.25] },
];

export const SPOT_KEYS: SpotKey[] = SPOTS.map((s) => s.key);
