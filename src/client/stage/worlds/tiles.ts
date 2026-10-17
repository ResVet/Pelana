// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A quiet wall of tiles behind the fever chart. The tiles warm with the
// temperature of the day and settle as the fever breaks.

import { courseAt } from '../../../shared/course.ts';
import { Camera, applyShot, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { plane, roundedBox } from '../../gl/geometry.ts';
import { Mesh, staticMesh, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, random, v3, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, useSolid, type Studio } from './studio.ts';

const COLS = 26;
const ROWS = 18;

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.55, 0.55, 0.62],
    sunColor: v3.scale([1, 0.95, 0.88], 2.2),
    sky: v3.scale(linear('#dde8e5'), 0.62),
    ground: v3.scale(linear('#a9b8b4'), 0.35),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: [0.05, 0.05, 0.05],
    exposure: 1,
  },
  top: hex('#e7eeec'),
  bottom: hex('#e7eeec'),
  blobs: [],
};

const DARK: Studio = {
  lighting: {
    sunDir: [-0.55, 0.55, 0.62],
    sunColor: v3.scale([0.9, 0.95, 1], 1.1),
    sky: v3.scale(linear('#1b3338'), 0.6),
    ground: v3.scale(linear('#0a1719'), 0.4),
    rimDir: [0.5, 0.3, -0.8],
    rimColor: [0.02, 0.03, 0.03],
    exposure: 1.1,
  },
  top: hex('#0b1d21'),
  bottom: hex('#0b1d21'),
  blobs: [],
};

export class TilesWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly tiles: Mesh;
  private readonly grout: Mesh;
  private readonly seeds: number[] = [];
  private readonly m = mat4();

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.tiles = new Mesh(gl, roundedBox([1, 1, 0.16], 0.06, 2, 1), COLS * ROWS);
    const back = plane(COLS * 1.12 + 4, ROWS * 1.12 + 4, 1, 1);
    // Stand the plane up as the wall behind the tiles.
    const p = back.positions;
    const n = back.normals;
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 2]!;
      p[i + 1] = -y;
      p[i + 2] = -0.14;
      n[i] = 0;
      n[i + 1] = 0;
      n[i + 2] = 1;
    }
    this.grout = staticMesh(gl, back, [1, 1, 1, 1], [MAT.plain, 0.9, 0, 0]);
    const rand = random(41);
    for (let i = 0; i < COLS * ROWS; i++) this.seeds.push(rand());
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const day = Math.max(1, input.day);
    const temp = courseAt(day).temp;
    const heat = smooth(37.2, 40.1, temp) * (input.scene === 'chart-full' ? 0.4 : 1);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.1, 0.36);
    applyShot(cam, shot([-3.5, -2.2, 18], [1.5, 0.6, 0], 0.62));
    cam.fitDepth(100);
    cam.update();

    const base = frame.dark ? linear('#1c3a3f') : linear('#dbe5e2');
    const warm = frame.dark ? linear('#6a3431') : linear('#efc2b4');
    const groutColour = frame.dark ? linear('#0f2428') : linear('#b8c6c2');
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const seed = this.seeds[k]!;
        const x = (c - COLS / 2 + 0.5) * 1.12;
        const y = (r - ROWS / 2 + 0.5) * 1.12;
        // Heat rises from the bottom of the wall, unevenly.
        const rise = 1 - r / ROWS;
        const w = heat * smooth(0.0, 1.0, rise * 1.2 - 0.1 + seed * 0.35);
        const wave = frame.reduced ? 0 : Math.sin(t * 0.9 - Math.hypot(x, y) * 0.35 + seed) * 0.04 * (0.4 + heat);
        const colour: Vec3 = v3.lerp(v3.scale(base, 0.96 + seed * 0.07), warm, w * 0.85);
        fromAxes(this.m, [x, y, wave], [1, 0, 0], [0, 1, 0], [0, 0, 1], 1, 1, 1);
        this.tiles.set(k++, this.m, [...colour, 1], [MAT.plain, 0.18 + seed * 0.08, 0, 0]);
      }
    }
    this.tiles.upload(k);
    this.grout.set(0, mat4(), [...groutColour, 1], [MAT.plain, 0.9, 0, 0]);
    this.grout.upload(1);

    engine.renderShadow(studio.lighting.sunDir, [1.5, 0.6, 0], 16, [this.tiles], target);
    beginStudio(engine, target, studio);
    const p = useSolid(engine, cam, studio, t);
    engine.useShadow(p, 0.02);
    this.grout.draw();
    this.tiles.draw();
    target.resolve();
  }

  dispose(): void {
    this.tiles.dispose();
    this.grout.dispose();
  }
}
