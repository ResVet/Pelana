// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The stages in the water: eggs glued to the tile, larvae hanging from the
// surface by the short breathing tube at the tail, and comma-shaped pupae
// breathing through two trumpets. Sizes in millimetres: an egg about 0.6 mm
// long, a fourth-stage larva about 7 mm, a pupa about 3 mm across.

import type { Batch } from '../../gl/batch.ts';
import { fromAxes, mat4, segmentMatrix, v3, type Vec3 } from '../../gl/math.ts';
import { MAT } from './materials.ts';

export interface AquaticBatches {
  sphere: Batch;
  segment: Batch;
}

export interface AquaticColours {
  larva: Vec3;
  head: Vec3;
  siphon: Vec3;
  pupa: Vec3;
  skin: Vec3;
  hair: Vec3;
  egg: Vec3;
}

const m = mat4();

function ellipsoid(b: Batch, centre: Vec3, axisY: Vec3, side: Vec3, r: Vec3, color: ArrayLike<number>, params: ArrayLike<number>): void {
  const y = v3.normalize(axisY);
  let x = v3.sub(side, v3.scale(y, v3.dot(side, y)));
  x = v3.length(x) < 1e-6 ? (Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]) : v3.normalize(x);
  const z = v3.cross(x, y);
  fromAxes(m, centre, x, y, z, r[0], r[1], r[2]);
  b.push(m, color, params);
}

/** An egg lying on a wall: `along` is its long axis, `normal` points out of the wall. */
export function addEgg(b: Batch, at: Vec3, along: Vec3, normal: Vec3, scale: number, colour: Vec3): void {
  const y = v3.normalize(along);
  const z = v3.normalize(normal);
  const x = v3.cross(y, z);
  fromAxes(m, v3.add(at, v3.scale(z, 0.065 * scale)), x, y, z, 0.09 * scale, 0.31 * scale, 0.075 * scale);
  b.push(m, [...colour, 1], [MAT.egg, 0, 0, 0]);
}

export interface LarvaPose {
  /** World point where the breathing tube meets the surface. */
  anchor: Vec3;
  /** Horizontal direction the body extends in, as an angle around world up. */
  heading: number;
  /** How steeply the body hangs below the surface, in radians. */
  tilt: number;
  scale: number;
  time: number;
  phase: number;
  /** 0 while still deep and small, 1 in place at the surface. */
  presence: number;
  /** 0..1 of a dive away from the surface and back. */
  dive?: number;
}

const SEGMENTS = 8;

export function addLarva(b: AquaticBatches, pose: LarvaPose, c: AquaticColours): void {
  const s = pose.scale * (0.55 + 0.45 * pose.presence);
  const heading: Vec3 = [Math.sin(pose.heading), 0, Math.cos(pose.heading)];
  const dive = pose.dive ?? 0;
  const tilt = pose.tilt + dive * 0.5;
  const dir: Vec3 = v3.normalize([heading[0] * Math.cos(tilt), -Math.sin(tilt), heading[2] * Math.cos(tilt)]);
  const lat = v3.normalize(v3.cross(dir, [0, 1, 0]));
  const sink = (1 - pose.presence) * 14 + Math.sin(dive * Math.PI) * 9;
  const base: Vec3 = v3.add(pose.anchor, [0, -sink * pose.scale, 0]);
  const amp = 0.05 + dive * 0.65;
  const speed = 1.3 + dive * 14;
  const at = (d: number): Vec3 => {
    const off = amp * Math.sin(d * 1.15 - pose.time * speed + pose.phase) * Math.pow(d / 6.4, 1.3);
    return v3.add(base, v3.add(v3.scale(dir, d * s), v3.scale(lat, off * s)));
  };
  const body = [...c.larva, 1];
  const hair = [...c.hair, 0.65];

  // Breathing tube (siphon) and the anal segment beside it.
  segmentMatrix(m, at(0), at(0.95), 0.13 * s, 0.13 * s);
  b.segment.push(m, [...c.siphon, 1], [MAT.larva, 2, 0, 0]);
  const tail = at(1.0);
  const down = v3.normalize(v3.sub([0, -1, 0], v3.scale(dir, -0.3)));
  ellipsoid(b.sphere, v3.add(tail, v3.scale(down, 0.28 * s)), down, lat, [0.17 * s, 0.32 * s, 0.17 * s], body, [MAT.larva, 0, 0, 0]);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const spread = v3.normalize(v3.add(down, v3.add(v3.scale(lat, Math.cos(a) * 0.5), v3.scale(dir, Math.sin(a) * 0.4))));
    const from = v3.add(tail, v3.scale(down, 0.5 * s));
    segmentMatrix(m, from, v3.add(from, v3.scale(spread, 0.35 * s)), 0.045 * s, 0.045 * s);
    b.segment.push(m, body, [MAT.larva, 0, 0, 0]);
  }

  // Abdominal segments VIII to I.
  for (let k = 0; k < SEGMENTS; k++) {
    const d0 = 0.95 + k * 0.46;
    const a = at(d0);
    const e = at(d0 + 0.46);
    const r = 0.27 + (k / (SEGMENTS - 1)) * 0.1;
    ellipsoid(b.sphere, v3.lerp(a, e, 0.5), v3.sub(e, a), lat, [r * s, 0.36 * s, r * 0.92 * s], body, [MAT.larva, 0, 0, 0]);
    // One long hair each side.
    if (k % 2 === 1) {
      for (const side of [1, -1]) {
        const root = v3.add(v3.lerp(a, e, 0.5), v3.scale(lat, side * r * 0.9 * s));
        const tip = v3.add(root, v3.scale(v3.normalize(v3.add(v3.scale(lat, side), v3.scale(dir, -0.35))), 0.75 * s));
        segmentMatrix(m, root, tip, 0.012 * s, 0.012 * s);
        b.segment.push(m, hair, [MAT.hair, 0, 0, 0]);
      }
    }
  }

  // Thorax, broad and hairy, then the head with its mouth brushes.
  const t0 = at(4.63);
  const t1 = at(5.65);
  ellipsoid(b.sphere, v3.lerp(t0, t1, 0.5), v3.sub(t1, t0), lat, [0.62 * s, 0.56 * s, 0.5 * s], body, [MAT.larva, 0, 0, 0]);
  for (const side of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const root = v3.add(v3.lerp(t0, t1, 0.25 + k * 0.25), v3.scale(lat, side * 0.55 * s));
      const tip = v3.add(root, v3.scale(v3.normalize(v3.add(v3.scale(lat, side), v3.scale(dir, 0.4 - k * 0.4))), (0.9 + k * 0.15) * s));
      segmentMatrix(m, root, tip, 0.013 * s, 0.013 * s);
      b.segment.push(m, hair, [MAT.hair, 0, 0, 0]);
    }
  }
  const h1 = at(6.4);
  const headCentre = v3.lerp(t1, h1, 0.55);
  ellipsoid(b.sphere, headCentre, v3.sub(h1, t1), lat, [0.4 * s, 0.38 * s, 0.34 * s], [...c.head, 1], [MAT.larva, 1, 0, 0]);
  const flick = Math.sin(pose.time * 24 + pose.phase) * 0.35;
  for (const side of [1, -1]) {
    const root = v3.add(at(6.55), v3.scale(lat, side * 0.16 * s));
    const out = v3.normalize(v3.add(v3.scale(dir, 0.8), v3.scale(lat, side * (0.5 + flick * 0.3))));
    ellipsoid(b.sphere, v3.add(root, v3.scale(out, 0.18 * s)), out, lat, [0.17 * s, 0.22 * s, 0.03 * s], hair, [MAT.hair, 0, 0, 0]);
  }
}

export interface PupaPose {
  /** World point where the trumpets touch the surface. */
  anchor: Vec3;
  heading: number;
  scale: number;
  time: number;
  phase: number;
  presence: number;
  /** Empty pupal skin left floating after the adult has gone. */
  empty?: boolean;
}

// The curled abdomen, in the pupa's own frame (y up, z forward), millimetres:
// it hangs from the back of the cephalothorax and curls forward underneath.
const PUPA_ABDOMEN: [Vec3, number][] = Array.from({ length: 10 }, (_, k) => {
  const u = k / 9;
  const theta = ((150 + u * 185) * Math.PI) / 180;
  const centre: Vec3 = [0, -1.95 + Math.sin(theta) * 0.92, 0.05 + Math.cos(theta) * 0.92];
  return [centre, 0.44 - u * 0.28];
});

export function addPupa(b: AquaticBatches, pose: PupaPose, c: AquaticColours): void {
  const s = pose.scale * (0.6 + 0.4 * pose.presence);
  const f: Vec3 = [Math.sin(pose.heading), 0, Math.cos(pose.heading)];
  const up: Vec3 = [0, 1, 0];
  const x = v3.cross(up, f);
  const bob = Math.sin(pose.time * 1.1 + pose.phase) * 0.05;
  const sink = (1 - pose.presence) * 12;
  const w = (p: Vec3): Vec3 =>
    v3.add(pose.anchor, v3.scale(v3.add(v3.add(v3.scale(x, p[0]), v3.scale(up, p[1] - sink + bob)), v3.scale(f, p[2])), s));
  const colour = pose.empty ? [...c.skin, 0.55] : [...c.pupa, 1];
  const kind = pose.empty ? 4 : 3;

  ellipsoid(b.sphere, w([0, -0.88, 0.05]), up, x, [0.8 * s, 0.78 * s, 0.95 * s], colour, [MAT.larva, kind, 0, 0]);
  for (const side of [1, -1]) {
    const base = w([side * 0.24, -0.35, 0.3]);
    const top = w([side * 0.32, 0.0, 0.36]);
    segmentMatrix(m, base, top, 0.075 * s, 0.075 * s);
    b.segment.push(m, pose.empty ? colour : [...c.siphon, 1], [MAT.larva, pose.empty ? kind : 2, 0, 0]);
  }
  let prev = w([0, -1.05, -0.62]);
  PUPA_ABDOMEN.forEach(([p, r]) => {
    const centre = w(p);
    ellipsoid(b.sphere, centre, v3.sub(centre, prev), x, [r * s, r * 1.05 * s, r * 0.92 * s], colour, [MAT.larva, kind, 0, 0]);
    prev = centre;
  });
  const last = PUPA_ABDOMEN[PUPA_ABDOMEN.length - 1]![0];
  const tip = w([0, last[1] + 0.05, last[2] + 0.12]);
  for (const side of [1, -1]) {
    const fan = v3.normalize(v3.add(v3.scale(x, side * 0.7), v3.scale(f, 0.7)));
    ellipsoid(b.sphere, v3.add(tip, v3.scale(fan, 0.3 * s)), fan, up, [0.06 * s, 0.34 * s, 0.24 * s], colour, [MAT.larva, kind, 0, 0]);
  }
}
