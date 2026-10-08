// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Then she bites you. For days nothing seems to happen while the virus
// multiplies: more particles appear as the chapter goes on, drifting in the
// blood among red cells far larger than they are (out of focus behind).

import { Camera, applyShot, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { icosphere } from '../../gl/geometry.ts';
import { Mesh, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, random, v3, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { lodVirionGeometry } from '../models/virion.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, useSolid, type Studio } from './studio.ts';

const MAX = 40;

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.45, 0.8, 0.4],
    sunColor: v3.scale([1, 0.95, 0.9], 2.4),
    sky: v3.scale(linear('#f0e3df'), 0.5),
    ground: v3.scale(linear('#b78e89'), 0.3),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: v3.scale(linear('#ffe9e4'), 0.45),
    exposure: 1,
  },
  top: hex('#f2e7e3'),
  bottom: hex('#e8d6d1'),
  blobs: [
    { x: 0.86, y: 0.7, r: 0.42, a: 0.55, color: hex('#cf8f8a') },
    { x: 0.52, y: 0.12, r: 0.3, a: 0.45, color: hex('#d9a39e') },
    { x: 1.02, y: 0.12, r: 0.26, a: 0.5, color: hex('#c47b76') },
    { x: 0.3, y: 0.86, r: 0.22, a: 0.35, color: hex('#e2b7b2') },
  ],
  fog: [0.91, 0.84, 0.82, 0.85],
  fogRange: [5, 26],
};

const DARK: Studio = {
  lighting: {
    sunDir: [-0.45, 0.8, 0.4],
    sunColor: v3.scale([1, 0.85, 0.82], 1.8),
    sky: v3.scale(linear('#3a1c20'), 0.55),
    ground: v3.scale(linear('#140809'), 0.4),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: v3.scale(linear('#e2a19b'), 0.35),
    exposure: 1.1,
  },
  top: hex('#241316'),
  bottom: hex('#1a0d10'),
  blobs: [
    { x: 0.86, y: 0.7, r: 0.42, a: 0.6, color: hex('#4d1b1f') },
    { x: 0.52, y: 0.12, r: 0.3, a: 0.5, color: hex('#5c2226') },
    { x: 1.02, y: 0.12, r: 0.26, a: 0.55, color: hex('#41161a') },
  ],
  fog: [0.1, 0.051, 0.063, 0.85],
  fogRange: [5, 26],
};

interface Particle {
  at: Vec3;
  axis: Vec3;
  speed: number;
  phase: number;
  /** When in the chapter this one appears. */
  born: number;
}

export class SwarmWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly shells: Mesh;
  private readonly cores: Mesh;
  private readonly particles: Particle[] = [];
  private readonly m = mat4();

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.shells = new Mesh(gl, lodVirionGeometry(), MAX);
    this.cores = new Mesh(gl, icosphere(2), MAX);
    const rand = random(31);
    for (let i = 0; i < MAX; i++) {
      const depth = 4 + Math.pow(rand(), 0.8) * 20;
      this.particles.push({
        at: [(rand() - 0.5) * depth * 1.3, (rand() - 0.5) * depth * 0.8, -depth],
        axis: v3.normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]),
        speed: 0.15 + rand() * 0.3,
        phase: rand() * 6.28,
        born: i < 5 ? 0 : (i / MAX) * 0.9,
      });
    }
    // Nearer particles first, so the first few are the ones the reader sees best.
    this.particles.sort((a, b) => a.born - b.born || b.at[2] - a.at[2]);
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const p = input.progress;
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.22, 0.36);
    applyShot(cam, shot([0.6 + p * 0.8, 0.4, 2.2 - p * 1.4], [2.0, 0, -8], 0.7));
    cam.near = 0.2;
    cam.far = 80;
    cam.update();

    const budget = engine.quality > 0.8 ? MAX : Math.round(MAX * 0.6);
    let n = 0;
    for (const q of this.particles.slice(0, budget)) {
      if (p < q.born) continue;
      const grow = smooth(q.born, q.born + 0.08, p);
      const angle = t * q.speed + q.phase;
      // Rotation about the particle's own axis (Rodrigues), as a basis.
      const rot = (v: Vec3): Vec3 => v3.rotate(v, q.axis, angle);
      const at: Vec3 = [q.at[0] + Math.sin(t * 0.21 + q.phase) * 0.5, q.at[1] + Math.cos(t * 0.17 + q.phase) * 0.4, q.at[2]];
      fromAxes(this.m, at, rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1]), grow, grow, grow);
      this.shells.set(n, this.m, [1, 1, 1, 1], [MAT.protein, 0, 0, 0]);
      fromAxes(this.m, at, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.8 * grow, 0.8 * grow, 0.8 * grow);
      this.cores.set(n, this.m, [...linear(frame.dark ? '#57486a' : '#a79bb8'), 1], [MAT.plain, 0.6, 0, 0]);
      n++;
    }
    this.shells.upload(n);
    this.cores.upload(n);

    beginStudio(engine, target, studio);
    useSolid(engine, cam, studio, t);
    this.cores.draw();
    this.shells.draw();
    target.resolve();
  }

  dispose(): void {
    this.shells.dispose();
    this.cores.dispose();
  }
}
