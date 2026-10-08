// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The critical phase, inside a small blood vessel cut open along its length.
// Its wall is a lining of flat endothelial cells. When the leak starts the
// gaps between them widen and plasma, the pale yellow liquid part of blood,
// seeps out while the red cells stay in, so the blood left inside thickens.
// The number of platelets drawn follows the imagined patient's count. In
// recovery the gaps close and the fluid comes back. Units are micrometres.

import { courseAt } from '../../../shared/course.ts';
import { Camera, applyShot, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { lathe, sphere } from '../../gl/geometry.ts';
import { Mesh, type Geometry, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, random, v3, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, transparent, useSolid, type Studio } from './studio.ts';

const RADIUS = 10;
const RING = 9;
const CELL_LENGTH = 15;
const RINGS = 7;
const RBC_MAX = 46;
const PLATELET_MAX = 18;
const DROPS = 90;

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.4, 0.8, 0.45],
    sunColor: v3.scale([1, 0.95, 0.9], 2.4),
    sky: v3.scale(linear('#f1e6e3'), 0.55),
    ground: v3.scale(linear('#b99390'), 0.32),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: v3.scale(linear('#fff0eb'), 0.35),
    exposure: 1,
  },
  top: hex('#f1e7e4'),
  bottom: hex('#e7d8d4'),
  blobs: [
    { x: 0.9, y: 0.82, r: 0.3, a: 0.25, color: hex('#f6eee9') },
    { x: 0.62, y: 0.12, r: 0.25, a: 0.25, color: hex('#e3c8c3') },
  ],
  fog: [0.906, 0.847, 0.831, 0.6],
  fogRange: [30, 80],
};

const DARK: Studio = {
  lighting: {
    sunDir: [-0.4, 0.8, 0.45],
    sunColor: v3.scale([1, 0.88, 0.85], 1.7),
    sky: v3.scale(linear('#331b1e'), 0.6),
    ground: v3.scale(linear('#120809'), 0.4),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: v3.scale(linear('#d99b95'), 0.3),
    exposure: 1.1,
  },
  top: hex('#211214'),
  bottom: hex('#180c0e'),
  blobs: [{ x: 0.85, y: 0.8, r: 0.3, a: 0.3, color: hex('#3a1b1e') }],
  fog: [0.094, 0.047, 0.055, 0.6],
  fogRange: [30, 80],
};

/** A curved plate of the vessel wall, centred at angle 0 on a cylinder of radius 1 around x. */
function cellPlate(): Geometry {
  const nu = 10;
  const nv = 8;
  const span = (Math.PI * 2) / RING;
  const positions: number[] = [];
  const normals: number[] = [];
  const aux: number[] = [];
  const indices: number[] = [];
  const add = (p: Vec3, n: Vec3, u: number, v: number) => {
    positions.push(...p);
    normals.push(...n);
    aux.push(u, v, 0, 0);
    return positions.length / 3 - 1;
  };
  // Outer surface, inner surface with the bulge of the nucleus, then the rim.
  const grid = (inner: boolean) => {
    const start = positions.length / 3;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const v = j / nv;
        const phi = (u - 0.5) * span;
        const x = v - 0.5;
        const bulge = inner ? 0.075 * Math.exp(-((x / 0.2) ** 2 + (phi / (span * 0.22)) ** 2)) : 0;
        const edge = Math.min(u, 1 - u, v, 1 - v);
        const taper = smooth(0, 0.12, edge);
        const r = inner ? 1 - 0.02 - 0.05 * taper - bulge : 1 + 0.01 * taper;
        const n: Vec3 = inner ? [0, -Math.cos(phi), -Math.sin(phi)] : [0, Math.cos(phi), Math.sin(phi)];
        add([x, r * Math.cos(phi), r * Math.sin(phi)], n, u, v);
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = start + j * (nu + 1) + i;
        const b = a + 1;
        const c = a + nu + 2;
        const d = a + nu + 1;
        if (inner) indices.push(a, d, c, a, c, b);
        else indices.push(a, b, c, a, c, d);
      }
    }
  };
  grid(false);
  grid(true);
  const geo: Geometry = {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    aux: new Float32Array(aux),
    indices: new Uint16Array(indices),
  };
  return geo;
}

/** A red blood cell: the biconcave disc, from the Evans and Fung shape (radius 3.9 micrometres). */
function redCell(): Geometry {
  const R = 3.91;
  const h = (r: number) => {
    const s = Math.min(1, r / R);
    return Math.sqrt(Math.max(0, 1 - s * s)) * (0.81 + 7.83 * s * s - 4.39 * s ** 4) * 0.5;
  };
  const profile: [number, number][] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const r = (i / steps) * R * 0.999;
    profile.push([r, -h(r)]);
  }
  for (let i = steps; i >= 0; i--) {
    const r = (i / steps) * R * 0.999;
    profile.push([r, h(r)]);
  }
  return lathe(profile, 28);
}

interface Flowing {
  x: number;
  y: number;
  z: number;
  speed: number;
  tumble: number;
  axis: Vec3;
}

interface Drop {
  angle: number;
  x: number;
  phase: number;
  speed: number;
}

export class VesselWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly cells: Mesh;
  private readonly rbcs: Mesh;
  private readonly platelets: Mesh;
  private readonly drops: Mesh;
  private readonly red: Flowing[] = [];
  private readonly plt: Flowing[] = [];
  private readonly droplets: Drop[] = [];
  private readonly m = mat4();

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.cells = new Mesh(gl, cellPlate(), RING * RINGS);
    this.rbcs = new Mesh(gl, redCell(), RBC_MAX);
    this.platelets = new Mesh(gl, sphere(12, 8), PLATELET_MAX);
    this.drops = new Mesh(gl, sphere(10, 8), DROPS);
    const rand = random(53);
    const inside = (): [number, number] => {
      for (;;) {
        const y = (rand() * 2 - 1) * 5.6;
        const z = (rand() * 2 - 1) * 5.6;
        if (y * y + z * z < 31) return [y, z];
      }
    };
    for (let i = 0; i < RBC_MAX; i++) {
      const [y, z] = inside();
      this.red.push({ x: rand() * 110, y, z, speed: 9 + rand() * 4, tumble: rand() * 6, axis: v3.normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]) });
    }
    for (let i = 0; i < PLATELET_MAX; i++) {
      const [y, z] = inside();
      this.plt.push({ x: rand() * 110, y: y * 1.05, z: z * 1.05, speed: 8 + rand() * 3, tumble: rand() * 6, axis: v3.normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]) });
    }
    for (let i = 0; i < DROPS; i++) {
      // Fluid leaves through the seams between cells.
      const k = Math.floor(rand() * RING);
      const ring = Math.floor(rand() * RINGS);
      const offset = ring % 2 ? 0.5 : 0;
      const angle = ((k + offset + 0.5) / RING) * Math.PI * 2 + (rand() - 0.5) * 0.05;
      const x = (ring - RINGS / 2 + 0.5) * CELL_LENGTH + (rand() - 0.5) * CELL_LENGTH * 0.9;
      this.droplets.push({ angle, x, phase: rand(), speed: 0.25 + rand() * 0.2 });
    }
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const gl = engine.gl;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const day = Math.max(1, input.day);
    const course = courseAt(day);
    const leak = smooth(3.2, 4.6, day) * (1 - smooth(6.4, 7.8, day));
    const healing = input.scene === 'heal';

    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.3, 0.37);
    applyShot(cam, shot([4, 21, 30], [2, -2, 0], 0.6), 30);
    cam.fitDepth(120);
    cam.update();
    const toCam = v3.normalize(v3.sub(cam.eye, cam.target));

    // The wall, opened on the side facing the camera.
    const narrow = 1 - 0.2 * leak;
    let n = 0;
    const cellColour = frame.dark ? linear('#8a5b5c') : linear('#d39a92');
    for (let r = 0; r < RINGS; r++) {
      for (let k = 0; k < RING; k++) {
        const angle = ((k + (r % 2 ? 0.5 : 0)) / RING) * Math.PI * 2;
        const normal: Vec3 = [0, Math.cos(angle), Math.sin(angle)];
        if (v3.dot(normal, toCam) > 0.3) continue;
        const x = (r - RINGS / 2 + 0.5) * CELL_LENGTH;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        fromAxes(this.m, [x, 0, 0], [1, 0, 0], [0, c, s], [0, -s, c], CELL_LENGTH * (1 - 0.12 * leak), RADIUS, RADIUS * narrow);
        this.cells.set(n++, this.m, [...cellColour, 1], [MAT.cell, 0, 0, 0]);
      }
    }
    this.cells.upload(n);

    // Red cells: more of them packed in as plasma leaves.
    const reds = Math.round(RBC_MAX * Math.min(1, (course.hct / 48) ** 2));
    const redColour = frame.dark ? linear('#9e2a2c') : linear('#b8302f');
    const flow = (f: Flowing) => {
      const x = ((f.x + t * f.speed) % 110) - 55;
      const angle = t * 0.6 + f.tumble;
      const rot = (v: Vec3): Vec3 => v3.rotate(v, f.axis, angle);
      return { at: [x, f.y, f.z] as Vec3, rot };
    };
    for (let i = 0; i < reds; i++) {
      const { at, rot } = flow(this.red[i]!);
      fromAxes(this.m, at, rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1]), 1, 1, 1);
      this.rbcs.set(i, this.m, [...redColour, 1], [MAT.rbc, 0, 0, 0]);
    }
    this.rbcs.upload(reds);

    const plts = Math.max(2, Math.round(PLATELET_MAX * (course.plt / 210)));
    for (let i = 0; i < plts; i++) {
      const { at, rot } = flow(this.plt[i]!);
      fromAxes(this.m, at, rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1]), 1.3, 0.45, 1.3);
      this.platelets.set(i, this.m, [...linear('#e9dcae'), 1], [MAT.plain, 0.45, 0, 0]);
    }
    this.platelets.upload(plts);

    // Plasma through the seams: out during the leak, back in during recovery.
    let d = 0;
    const active = Math.round(DROPS * (healing ? Math.max(leak, 0.35 * (1 - smooth(8, 9.5, day))) : leak));
    for (let i = 0; i < active; i++) {
      const q = this.droplets[i]!;
      const life = (q.phase + t * q.speed) % 1;
      const along = healing ? 1 - life : life;
      const radius = RADIUS * (0.92 + along * 0.75);
      const fade = smooth(0, 0.12, life) * (1 - smooth(0.8, 1, life));
      const pos: Vec3 = [q.x, Math.cos(q.angle) * radius, Math.sin(q.angle) * radius];
      if (v3.dot([0, Math.cos(q.angle), Math.sin(q.angle)], toCam) > 0.3 && along < 0.15) continue;
      const size = 0.75 + along * 0.6;
      fromAxes(this.m, pos, [1, 0, 0], [0, 1, 0], [0, 0, 1], size, size, size);
      this.drops.set(d++, this.m, [...linear('#e8c14f'), 0.75 * fade], [MAT.droplet, 0, 0, 0]);
    }
    this.drops.upload(d);

    beginStudio(engine, target, studio);
    useSolid(engine, cam, studio, t);
    gl.disable(gl.CULL_FACE);
    this.cells.draw();
    gl.enable(gl.CULL_FACE);
    this.rbcs.draw();
    this.platelets.draw();
    transparent(gl, true);
    gl.enable(gl.CULL_FACE);
    this.drops.draw();
    transparent(gl, false);
    target.resolve();
  }

  dispose(): void {
    this.cells.dispose();
    this.rbcs.dispose();
    this.platelets.dispose();
    this.drops.dispose();
  }
}
