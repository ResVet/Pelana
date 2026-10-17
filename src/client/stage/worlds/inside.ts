// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Eight to twelve days inside her, seen as an X-ray: the virus multiplies in
// the midgut, gets out into the body and collects in the salivary glands at
// the front of the thorax. Each dot stands for a growing amount of virus.

import { Batch } from '../../gl/batch.ts';
import { Camera, applyShot, orbit, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { sphere } from '../../gl/geometry.ts';
import { Mesh, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, random, v3, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, mosquitoKit, transparent, useSolid, type MosquitoKit, type Studio } from './studio.ts';

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.4, 0.8, 0.45],
    sunColor: v3.scale([1, 0.96, 0.9], 1.6),
    sky: v3.scale(linear('#e3ecea'), 0.7),
    ground: v3.scale(linear('#c2cfcc'), 0.5),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: [0.2, 0.2, 0.2],
    exposure: 1,
  },
  top: hex('#eaf0ee'),
  bottom: hex('#dde6e3'),
  blobs: [],
};

const DARK: Studio = {
  lighting: {
    sunDir: [-0.4, 0.8, 0.45],
    sunColor: v3.scale([0.8, 0.9, 1], 0.9),
    sky: v3.scale(linear('#1a3237'), 0.6),
    ground: v3.scale(linear('#0b1a1d'), 0.4),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: [0.1, 0.18, 0.2],
    exposure: 1.1,
  },
  top: hex('#0e2226'),
  bottom: hex('#0a1b1f'),
  blobs: [],
};

const DOTS = 320;

interface Dot {
  gut: Vec3;
  body: Vec3;
  gland: Vec3;
  born: number;
  escape: number;
  settle: number;
  toGland: boolean;
  phase: number;
}

function inEllipsoid(rand: () => number, c: Vec3, r: Vec3): Vec3 {
  for (;;) {
    const p: Vec3 = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
    if (v3.dot(p, p) <= 1) return [c[0] + p[0] * r[0], c[1] + p[1] * r[1], c[2] + p[2] * r[2]];
  }
}

// Organs in her body frame (millimetres): the midgut in the abdomen and three
// lobes of salivary gland on each side of the thorax.
const GUT = { c: [0, -0.12, -1.65] as Vec3, r: [0.19, 0.17, 0.85] as Vec3 };
const GLANDS: { c: Vec3; r: Vec3 }[] = [1, -1].flatMap((side) => [
  { c: [side * 0.15, -0.24, 0.3] as Vec3, r: [0.06, 0.06, 0.26] as Vec3 },
  { c: [side * 0.23, -0.17, 0.22] as Vec3, r: [0.055, 0.055, 0.24] as Vec3 },
  { c: [side * 0.29, -0.27, 0.12] as Vec3, r: [0.05, 0.05, 0.22] as Vec3 },
]);

export class InsideWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly kit: MosquitoKit;
  private readonly organs: Batch;
  private readonly dots: Batch;
  private readonly points: Dot[] = [];
  private readonly m = mat4();

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.kit = mosquitoKit(gl);
    this.organs = new Batch(new Mesh(gl, sphere(24, 16), 8));
    this.dots = new Batch(new Mesh(gl, sphere(8, 6), DOTS));
    const rand = random(23);
    for (let i = 0; i < DOTS; i++) {
      const gland = GLANDS[i % GLANDS.length]!;
      // Somewhere in the body cavity: the abdomen around the gut, or the thorax.
      const body = rand() < 0.6 ? inEllipsoid(rand, [0, -0.1, -1.6], [0.32, 0.3, 1.1]) : inEllipsoid(rand, [0, 0.0, 0.0], [0.38, 0.4, 0.55]);
      this.points.push({
        gut: inEllipsoid(rand, GUT.c, v3.scale(GUT.r, 0.85)),
        body,
        gland: inEllipsoid(rand, gland.c, v3.scale(gland.r, 0.8)),
        born: (i / DOTS) * 0.55 * (0.6 + rand() * 0.4),
        escape: 0.3 + rand() * 0.25,
        settle: 0.6 + rand() * 0.28,
        toGland: rand() < 0.65,
        phase: rand() * 6.28,
      });
    }
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const gl = engine.gl;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const p = input.progress;
    // Seen from her left, head to the right: the virus travels left to right,
    // from the gut in the abdomen to the glands in the thorax, as the text reads.
    const base = shot([-15.5, 4, 1], [0, -0.2, -0.9], 0.5);
    const s = orbit(base, -0.35 + p * 0.3 + input.yaw, input.pitch);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.32, 0.38);
    applyShot(cam, s, 4.6);
    cam.fitDepth(200);
    cam.update();

    const k = this.kit;
    k.sphere.begin();
    k.segment.begin();
    k.wing.begin();
    k.mosquito.add({ origin: [0, 0, 0], forward: [0, 0, 1], up: [0, 1, 0], scale: 1, mode: 'stand', fed: 0, time: t * 0.3 });
    k.sphere.end();
    k.segment.end();
    k.wing.end();

    const mos = k.mosquito;
    const organColour = frame.dark ? [...linear('#3d5a5e'), 1] : [...linear('#e6d6cc'), 1];
    const glandColour = frame.dark ? [...linear('#4c4a6a'), 1] : [...linear('#e3d4ef'), 1];
    this.organs.begin();
    const ellipsoid = (c: Vec3, r: Vec3, colour: number[]) => {
      fromAxes(this.m, mos.world(c), [1, 0, 0], [0, 1, 0], [0, 0, 1], r[0], r[1], r[2]);
      this.organs.push(this.m, colour, [MAT.plain, 0.55, 0, 0]);
    };
    ellipsoid(GUT.c, GUT.r, organColour);
    for (const g of GLANDS) ellipsoid(g.c, g.r, glandColour);
    this.organs.end();

    const virus = frame.dark ? [...hex('#c2adff'), 1] : [...hex('#6a3aa8'), 1];
    this.dots.begin();
    for (const d of this.points) {
      if (p < d.born) continue;
      const grow = smooth(d.born, d.born + 0.05, p);
      let pos = v3.lerp(d.gut, d.body, smooth(d.escape, d.escape + 0.14, p));
      if (d.toGland) pos = v3.lerp(pos, d.gland, smooth(d.settle, d.settle + 0.1, p));
      const wobble: Vec3 = [Math.sin(t * 1.3 + d.phase) * 0.02, Math.cos(t * 1.1 + d.phase) * 0.02, Math.sin(t * 0.9 + d.phase * 2) * 0.02];
      const r = 0.032 * grow;
      fromAxes(this.m, mos.world(v3.add(pos, wobble)), [1, 0, 0], [0, 1, 0], [0, 0, 1], r, r, r);
      this.dots.push(this.m, virus, [MAT.glow, frame.dark ? 1.2 : 1, 0, 0]);
    }
    this.dots.end();

    beginStudio(engine, target, studio);
    const prog = useSolid(engine, cam, studio, t);
    this.organs.draw();
    this.dots.draw();
    // The body as an X-ray: only its outline shows, so the inside is visible.
    // Depth goes in first, so only the surface nearest the camera is drawn
    // and the body reads as one shell rather than a stack of glass beads.
    // The wings go first, so they show through the body as well as over it.
    const ink = frame.dark ? hex('#a9d9d6') : hex('#0f2c32');
    prog.set('u_xray', [1, ink[0], ink[1], ink[2]]);
    transparent(gl, true);
    k.wing.draw();
    transparent(gl, false);
    gl.colorMask(false, false, false, false);
    k.sphere.draw();
    k.segment.draw();
    gl.colorMask(true, true, true, true);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    k.sphere.draw();
    k.segment.draw();
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    prog.set('u_xray', [0, 0, 0, 0]);
    target.resolve();
  }

  dispose(): void {
    this.organs.mesh.dispose();
    this.dots.mesh.dispose();
    this.kit.sphere.mesh.dispose();
    this.kit.segment.mesh.dispose();
    this.kit.wing.mesh.dispose();
  }
}
