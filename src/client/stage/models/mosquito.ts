// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A female Aedes aegypti, assembled each frame from ellipsoids, tapered
// segments and two wings. Proportions are in millimetres from published
// descriptions of the adult: a body of about 5 mm, a proboscis of about 2 mm,
// wings near 3 mm, and long legs with white bands at the base of the tarsal
// segments (the last segment of the hind legs is all white). The legs are
// placed with two-bone inverse kinematics so the feet land on whatever
// surface she stands on.

import type { Batch } from '../../gl/batch.ts';
import { fromAxes, mat4, segmentMatrix, v3, type Vec3 } from '../../gl/math.ts';
import { MAT, PART, PATTERN } from './materials.ts';

export type MosquitoMode = 'stand' | 'fly' | 'feed';

export interface MosquitoPose {
  /** World position of the centre of the thorax. */
  origin: Vec3;
  /** Unit vector she faces. */
  forward: Vec3;
  /** Unit vector out of her back. */
  up: Vec3;
  /** World units per millimetre. */
  scale: number;
  mode: MosquitoMode;
  /** How full the abdomen is after a blood meal, 0..1. */
  fed: number;
  /** Seconds, for the wing beat and small movements. */
  time: number;
  /** Height of the surface under her, in millimetres below the thorax centre. */
  ground?: number;
}

export interface MosquitoBatches {
  sphere: Batch;
  segment: Batch;
  wing: Batch;
}

interface LegSpec {
  hip: Vec3;
  coxa: Vec3;
  femur: number;
  tibia: number;
  tarsus: number;
  /** Width of the white band at the base of each tarsal segment, as a fraction of its length. */
  bands: [number, number, number];
}

// Front, middle and hind legs (for the left side; the right side mirrors x).
const LEGS: LegSpec[] = [
  { hip: [0.2, -0.3, 0.3], coxa: [0.08, -0.26, 0.06], femur: 1.6, tibia: 1.6, tarsus: 2.0, bands: [0.24, 0.3, 0] },
  { hip: [0.27, -0.36, 0.02], coxa: [0.1, -0.26, -0.02], femur: 1.85, tibia: 1.85, tarsus: 2.15, bands: [0.24, 0.3, 0] },
  { hip: [0.25, -0.32, -0.26], coxa: [0.1, -0.24, -0.08], femur: 2.2, tibia: 2.2, tarsus: 2.5, bands: [0.26, 0.34, 1.2] },
];

const TARSUS_SPLIT = [0.46, 0.72, 1];

function bezier(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
  ];
}

/** Places the knee for a two-bone limb from a to c, bending towards `pole`. */
function solveKnee(a: Vec3, c: Vec3, l1: number, l2: number, pole: Vec3): { knee: Vec3; end: Vec3 } {
  let d = v3.sub(c, a);
  let dist = v3.length(d);
  const reach = (l1 + l2) * 0.995;
  let end = c;
  if (dist > reach) {
    d = v3.scale(d, reach / dist);
    end = v3.add(a, d);
    dist = reach;
  }
  dist = Math.max(dist, Math.abs(l1 - l2) + 1e-3);
  const u = v3.scale(d, 1 / Math.max(1e-6, v3.length(d)));
  const cos = Math.min(1, Math.max(-1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
  let v = v3.sub(pole, v3.scale(u, v3.dot(pole, u)));
  if (v3.length(v) < 1e-5) v = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  v = v3.normalize(v);
  const knee = v3.add(a, v3.scale(v3.add(v3.scale(u, cos), v3.scale(v, Math.sqrt(1 - cos * cos))), l1));
  return { knee, end };
}

export interface MosquitoColours {
  dark: Vec3;
  joint: Vec3;
  pale: Vec3;
}

export class Mosquito {
  private readonly m = mat4();
  private O: Vec3 = [0, 0, 0];
  private X: Vec3 = [1, 0, 0];
  private U: Vec3 = [0, 1, 0];
  private F: Vec3 = [0, 0, 1];
  private s = 1;
  private readonly b: MosquitoBatches;
  colours: MosquitoColours;
  /** World positions of the feet that touched the surface in the last add(). */
  readonly feet: Vec3[] = [];

  constructor(batches: MosquitoBatches, colours: MosquitoColours) {
    this.b = batches;
    this.colours = colours;
  }

  /** World position of a point given in her body frame (millimetres). */
  world(p: Vec3): Vec3 {
    const s = this.s;
    return [
      this.O[0] + (this.X[0] * p[0] + this.U[0] * p[1] + this.F[0] * p[2]) * s,
      this.O[1] + (this.X[1] * p[0] + this.U[1] * p[1] + this.F[1] * p[2]) * s,
      this.O[2] + (this.X[2] * p[0] + this.U[2] * p[1] + this.F[2] * p[2]) * s,
    ];
  }

  private dir(p: Vec3): Vec3 {
    return v3.normalize([
      this.X[0] * p[0] + this.U[0] * p[1] + this.F[0] * p[2],
      this.X[1] * p[0] + this.U[1] * p[1] + this.F[1] * p[2],
      this.X[2] * p[0] + this.U[2] * p[1] + this.F[2] * p[2],
    ]);
  }

  /** An ellipsoid with axes along her body (x across, y up, z forward), tilted by `pitch`. */
  private blob(c: Vec3, r: Vec3, color: ArrayLike<number>, params: ArrayLike<number>, pitch = 0): void {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y = this.dir([0, cp, -sp]);
    const z = this.dir([0, sp, cp]);
    const x = v3.cross(y, z);
    const s = this.s;
    fromAxes(this.m, this.world(c), x, y, z, r[0] * s, r[1] * s, r[2] * s);
    this.b.sphere.push(this.m, color, params);
  }

  private seg(a: Vec3, b: Vec3, r: number, color: ArrayLike<number>, params: ArrayLike<number>): void {
    segmentMatrix(this.m, this.world(a), this.world(b), r * this.s, r * this.s, this.U);
    this.b.segment.push(this.m, color, params);
  }

  add(pose: MosquitoPose): void {
    this.feet.length = 0;
    this.O = pose.origin;
    this.F = v3.normalize(pose.forward);
    this.X = v3.normalize(v3.cross(pose.up, this.F));
    this.U = v3.cross(this.F, this.X);
    this.s = pose.scale;
    const c = this.colours;
    const dark = [...c.dark, 1];
    const t = pose.time;
    const fed = pose.fed;
    const ground = -(pose.ground ?? 1.15);

    // Thorax with the lyre, scutellum, the neck and the head.
    this.blob([0, 0.06, 0], [0.47, 0.5, 0.66], dark, [MAT.chitin, PATTERN.scutum, 0, PART.lyre], -0.12);
    this.blob([0, 0.28, -0.6], [0.26, 0.09, 0.12], dark, [MAT.chitin, PATTERN.white, 0, PART.lyre]);
    this.blob([0, -0.1, 0.62], [0.17, 0.17, 0.16], dark, [MAT.chitin, PATTERN.plain, 0, 0]);
    this.blob([0, -0.08, 0.86], [0.3, 0.3, 0.27], dark, [MAT.chitin, PATTERN.head, 0, 0]);
    for (const side of [1, -1]) {
      this.blob([side * 0.15, -0.04, 0.92], [0.17, 0.25, 0.2], dark, [MAT.eye, 0, 0, 0]);
    }

    // Mouthparts and antennae.
    const probeBase: Vec3 = [0, -0.27, 1.08];
    if (pose.mode === 'feed') {
      // The sheath (labium) bows backwards while the stylets go into the skin.
      const bend: Vec3 = [0, -0.72 + Math.sin(t * 2.2) * 0.01, 1.42];
      const entry: Vec3 = [0, ground + 0.02, 1.5];
      this.seg(probeBase, bend, 0.05, dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
      this.seg(bend, entry, 0.042, dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
      this.seg(entry, [0, ground - 0.4, 1.53], 0.025, dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
    } else {
      const droop = pose.mode === 'fly' ? -0.42 : -0.32;
      const dirP = v3.normalize([0, droop, 0.95]);
      const mid = v3.add(probeBase, v3.scale(dirP, 1.05));
      const tip = v3.add(mid, v3.scale(v3.normalize([0, droop - 0.06, 0.95]), 0.95));
      this.seg(probeBase, mid, 0.05, dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
      this.seg(mid, tip, 0.04, dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
      this.blob(tip, [0.045, 0.045, 0.07], dark, [MAT.chitin, PATTERN.proboscis, 0, PART.proboscis]);
    }
    const sway = Math.sin(t * 1.7) * 0.03;
    for (const side of [1, -1]) {
      const pb: Vec3 = [side * 0.05, -0.2, 1.1];
      this.seg(pb, v3.add(pb, v3.scale(v3.normalize([side * 0.16, -0.36, 0.92]), 0.38)), 0.035, dark, [MAT.chitin, PATTERN.palp, 0, 0]);
      const ab: Vec3 = [side * 0.07, 0.06, 1.08];
      const a1 = v3.add(ab, v3.scale(v3.normalize([side * 0.28, 0.4 + sway, 0.86]), 0.7));
      const a2 = v3.add(a1, v3.scale(v3.normalize([side * 0.3, 0.32 + sway, 0.9]), 0.65));
      this.seg(ab, a1, 0.024, dark, [MAT.chitin, PATTERN.antenna, 0, 0]);
      this.seg(a1, a2, 0.018, dark, [MAT.chitin, PATTERN.antenna, 0, 0]);
    }

    // Abdomen: eight segments, swelling with blood when she feeds.
    const SWELL = [0.45, 1.0, 1.35, 1.5, 1.4, 1.1, 0.65, 0.3];
    const BASE = [0.36, 0.38, 0.37, 0.35, 0.32, 0.27, 0.2, 0.13];
    const breathe = 1 + Math.sin(t * 2.4) * 0.012;
    let z = -0.56;
    for (let k = 0; k < 8; k++) {
      const grow = 1 + fed * SWELL[k]!;
      const r = BASE[k]! * grow * breathe;
      const len = 0.25 * (1 + fed * 0.45);
      const y = -0.08 - k * 0.02 - fed * 0.12 * Math.sin((k / 7) * Math.PI);
      this.blob([0, y, z], [r, r * 0.86, len], dark, [MAT.chitin, PATTERN.fedAbdomen, fed, 0], 0.05 + k * 0.012);
      z -= 0.31 * (1 + fed * 0.32);
    }

    // Halteres, the small balancing knobs behind the wings.
    for (const side of [1, -1]) {
      const a: Vec3 = [side * 0.3, 0.12, -0.36];
      const b: Vec3 = [side * 0.52, 0.02 + (pose.mode === 'fly' ? Math.sin(t * 60) * 0.06 : 0), -0.46];
      this.seg(a, b, 0.02, [...c.pale, 1], [MAT.chitin, PATTERN.pale, 0, 0]);
      this.blob(b, [0.06, 0.05, 0.06], [...c.pale, 1], [MAT.chitin, PATTERN.pale, 0, 0]);
    }

    for (let i = 0; i < 3; i++) for (const side of [1, -1] as const) this.leg(side, i, pose, ground);
    this.wings(pose);
  }

  private leg(side: 1 | -1, i: number, pose: MosquitoPose, ground: number): void {
    const spec = LEGS[i]!;
    const c = this.colours;
    const dark = [...c.dark, 1];
    const legParams = (pattern: number, band = 0) => [MAT.chitin, pattern, band, PART.legs];
    const hip: Vec3 = [side * spec.hip[0], spec.hip[1], spec.hip[2]];
    const coxaEnd: Vec3 = v3.add(hip, [side * spec.coxa[0], spec.coxa[1], spec.coxa[2]]);
    const t = pose.time;
    let ankle: Vec3;
    let tip: Vec3;
    let control: Vec3;
    let pole: Vec3;
    let knee: Vec3 | null = null;

    if (pose.mode === 'fly') {
      const dangle = Math.sin(t * 3 + i + side) * 0.05;
      if (i === 0) {
        ankle = [side * 0.9, -1.2, 1.5];
        tip = [side * 0.8, -2.4 + dangle, 2.25];
      } else if (i === 1) {
        ankle = [side * 1.55, -1.4, -0.1];
        tip = [side * 1.6, -2.75 + dangle, -0.35];
      } else {
        ankle = [side * 1.0, -0.85, -2.45];
        tip = [side * 1.1, -1.35 + dangle, -4.0];
      }
      control = v3.add(v3.lerp(ankle, tip, 0.5), [0, 0.12, 0]);
      pole = [side * 0.6, 1, i === 2 ? -0.4 : 0.2];
    } else if (i === 2) {
      // Resting Aedes hold the hind legs up and curled over the body.
      const lift = Math.sin(t * 0.9 + side) * 0.04;
      knee = v3.add(coxaEnd, v3.scale(v3.normalize([side * 0.6, 0.12, -0.8]), spec.femur));
      ankle = v3.add(knee, v3.scale(v3.normalize([side * 0.22, 0.78 + lift, -0.58]), spec.tibia));
      tip = v3.add(ankle, [side * 0.18, 1.0, 0.75]);
      control = v3.add(ankle, [side * 0.15, 1.05, -0.25]);
      pole = [0, 1, 0];
    } else {
      const reachOut = i === 0 ? [1.25, 2.55] : [2.65, 0.1];
      tip = [side * reachOut[0]!, ground, reachOut[1]!];
      const inward = v3.normalize([hip[0] - tip[0], 0, hip[2] - tip[2]]);
      ankle = v3.add(v3.add(tip, v3.scale(inward, spec.tarsus * 0.74)), [0, 0.36, 0]);
      control = v3.add(v3.lerp(ankle, tip, 0.62), [0, 0, 0]);
      control[1] = ground + 0.04;
      pole = [side * 0.55, 1, 0];
      this.feet.push(this.world(tip));
    }

    let end = ankle;
    if (!knee) {
      const solved = solveKnee(coxaEnd, ankle, spec.femur, spec.tibia, pole);
      knee = solved.knee;
      end = solved.end;
    }
    this.seg(hip, coxaEnd, 0.07, [...c.joint, 1], legParams(PATTERN.pale));
    this.seg(coxaEnd, knee, 0.044, dark, legParams(PATTERN.femur));
    this.blob(knee, [0.038, 0.038, 0.038], dark, legParams(PATTERN.plain));
    this.seg(knee, end, 0.033, dark, legParams(PATTERN.plain));
    // Tarsal segments along a gentle curve to the tip of the foot.
    let prev = end;
    for (let k = 0; k < 3; k++) {
      const next = bezier(end, control, tip, TARSUS_SPLIT[k]!);
      this.seg(prev, next, 0.025 - k * 0.004, dark, legParams(PATTERN.leg, spec.bands[k]!));
      prev = next;
    }
  }

  private wings(pose: MosquitoPose): void {
    const s = this.s;
    const span = 2.9;
    const flying = pose.mode === 'fly';
    for (const side of [1, -1] as const) {
      const root: Vec3 = [side * 0.3, 0.38, 0.12];
      const copies = flying ? 4 : 1;
      for (let k = 0; k < copies; k++) {
        let along: Vec3;
        let out: Vec3;
        let alpha = 1;
        if (flying) {
          // A wing beats hundreds of times a second; draw the blur of the stroke.
          const phase = -1 + (2 * k) / (copies - 1);
          const stroke = phase * 0.62 + Math.sin(pose.time * 7) * 0.05;
          along = v3.normalize([side * Math.cos(stroke) * 0.95, 0.18 + phase * 0.12, -Math.sin(stroke) * 0.5 - 0.35]);
          out = v3.normalize([0, 0.15, 1]);
          alpha = 0.45;
        } else {
          along = v3.normalize([side * 0.13, -0.035, -1]);
          out = [side, 0.04, 0.12];
        }
        const a = this.dir(along);
        // Leading edge points outwards; build a right-handed frame around it.
        let lead = this.dir(out);
        lead = v3.normalize(v3.sub(lead, v3.scale(a, v3.dot(lead, a))));
        const normal = v3.cross(lead, a);
        const lift = side === 1 ? 0.03 : 0;
        fromAxes(this.m, this.world(v3.add(root, [0, lift, 0])), a, normal, lead, span * s, s, span * 0.82 * s);
        this.b.wing.push(this.m, [1, 1, 1, alpha], [MAT.wing, 0, 0, PART.wings]);
      }
    }
  }
}
