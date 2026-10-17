// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// She feeds on a neighbour's forearm. As the chapter is read her abdomen
// fills and turns red. Units are millimetres.

import { Camera, applyShot, orbit, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { tube } from '../../gl/geometry.ts';
import { staticMesh, type Mesh, type Target } from '../../gl/gpu.ts';
import { linear, random, segmentMatrix, v3, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, mosquitoKit, transparent, useSolid, type MosquitoKit, type Studio } from './studio.ts';

const ARM_RADIUS = 34;

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.45, 0.82, 0.35],
    sunColor: v3.scale([1.0, 0.93, 0.82], 3.0),
    sky: v3.scale(linear('#dfe8e4'), 0.5),
    ground: v3.scale(linear('#b8a698'), 0.32),
    rimDir: [0.5, 0.35, -0.8],
    rimColor: v3.scale(linear('#f5ede0'), 0.4),
    exposure: 1,
  },
  top: hex('#e8eeeb'),
  bottom: hex('#d9e2df'),
  blobs: [
    { x: 0.78, y: 0.82, r: 0.2, a: 0.5, color: hex('#f5efe2') },
    { x: 0.95, y: 0.6, r: 0.14, a: 0.35, color: hex('#cfe0db') },
    { x: 0.55, y: 0.9, r: 0.12, a: 0.3, color: hex('#ffffff') },
  ],
};

const DARK: Studio = {
  lighting: {
    sunDir: [0.5, 0.7, 0.45],
    sunColor: v3.scale([1.0, 0.8, 0.6], 2.3),
    sky: v3.scale(linear('#21393d'), 0.5),
    ground: v3.scale(linear('#2a1d18'), 0.35),
    rimDir: [-0.5, 0.35, -0.8],
    rimColor: v3.scale(linear('#7fb3b6'), 0.3),
    exposure: 1.1,
  },
  top: hex('#10252a'),
  bottom: hex('#0b1d21'),
  blobs: [
    { x: 0.8, y: 0.8, r: 0.18, a: 0.45, color: hex('#5a4728') },
    { x: 0.96, y: 0.58, r: 0.12, a: 0.35, color: hex('#1e474c') },
  ],
};

export class SkinWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly kit: MosquitoKit;
  private readonly arm: Mesh;
  private readonly hairs: { root: Vec3; tip: Vec3 }[] = [];

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.kit = mosquitoKit(gl, 80);
    // The forearm: a long cylinder whose top runs along x at height 0.
    const points: Vec3[] = [];
    for (let i = 0; i <= 8; i++) points.push([-80 + i * 20, -ARM_RADIUS, 0]);
    this.arm = staticMesh(gl, tube(points, ARM_RADIUS, 160, false), [...linear('#94634a'), 1], [MAT.skin, 0, 0, 0]);
    // Fine hairs lying along the arm.
    const rand = random(5);
    for (let i = 0; i < 34; i++) {
      const x = -14 + rand() * 28;
      const z = -9 + rand() * 18;
      if (Math.abs(x) < 3.5 && Math.abs(z) < 3.5) continue;
      const surface = (px: number, pz: number): Vec3 => [px, Math.sqrt(ARM_RADIUS * ARM_RADIUS - pz * pz) - ARM_RADIUS, pz];
      const root = surface(x, z);
      const len = 1.0 + rand() * 1.2;
      const dir = v3.normalize([0.9, 0.12 + rand() * 0.1, (rand() - 0.5) * 0.5]);
      this.hairs.push({ root, tip: v3.add(root, v3.scale(dir, len)) });
    }
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const gl = engine.gl;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const fed = smooth(0.12, 0.92, input.progress);
    const base = shot([-8.5, 1.3, 7.2], [0.3, 0.15, 1.0], 0.5);
    const s = orbit(base, input.progress * 0.35 + input.yaw, input.pitch);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.3, 0.38);
    applyShot(cam, s, 5);
    cam.fitDepth(300);
    cam.update();

    const k = this.kit;
    k.sphere.begin();
    k.segment.begin();
    k.wing.begin();
    k.mosquito.add({
      origin: [0, 1.15, 0],
      forward: [0.0, 0, 1],
      up: [0, 1, 0],
      scale: 1,
      mode: 'feed',
      fed,
      time: t,
    });
    const hairColour = [...linear('#4a3424'), 0.85];
    for (const h of this.hairs) {
      segmentMatrix(m, h.root, h.tip, 0.009, 0.009);
      k.segment.push(m, hairColour, [MAT.hair, 0, 0, 0]);
    }
    k.sphere.end();
    k.segment.end();
    k.wing.end();

    const entry = k.mosquito.world([0, -1.15, 1.5]);
    engine.renderShadow(studio.lighting.sunDir, [0, 0, 0.5], 9, [k.sphere.mesh, k.segment.mesh], target);
    beginStudio(engine, target, studio);
    const p = useSolid(engine, cam, studio, t);
    engine.useShadow(p, 0.004);
    p.set('u_bite', [entry[0], entry[1], entry[2], 0.35 + fed * 0.5]);
    this.arm.draw();
    k.sphere.draw();
    k.segment.draw();
    transparent(gl, true);
    k.wing.draw();
    transparent(gl, false);
    target.resolve();
  }

  dispose(): void {
    this.arm.dispose();
    this.kit.sphere.mesh.dispose();
    this.kit.segment.mesh.dispose();
    this.kit.wing.mesh.dispose();
  }
}

const m = new Float32Array(16);
