// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// One dengue virus particle, close up. The reader can turn it by dragging
// and take it apart in three steps: the rafts of E protein lift away, the
// shell opens on the side facing the camera, and the membrane and core are
// cut open to show the RNA.

import { Camera, applyShot, orbit, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import { Mesh, staticMesh, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, multiply, v3, type Mat4, type Vec3 } from '../../gl/math.ts';
import { smooth } from '../../core/motion.ts';
import { MAT } from '../models/materials.ts';
import { coreGeometry, dimerGeometry, dimerPlacements, membraneGeometry, rnaGeometry, type DimerPlacement } from '../models/virion.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, hex, useSolid, type Studio } from './studio.ts';

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.5, 0.75, 0.45],
    sunColor: v3.scale([1, 0.95, 0.88], 2.6),
    sky: v3.scale(linear('#dce8e5'), 0.55),
    ground: v3.scale(linear('#9fb0ac'), 0.3),
    rimDir: [0.55, 0.25, -0.8],
    rimColor: v3.scale(linear('#eef4f2'), 0.5),
    exposure: 1,
  },
  top: hex('#e9efed'),
  bottom: hex('#d8e2df'),
  blobs: [
    { x: 0.8, y: 0.75, r: 0.32, a: 0.25, color: hex('#f2efe6') },
    { x: 0.95, y: 0.2, r: 0.2, a: 0.2, color: hex('#cadbd7') },
  ],
};

const DARK: Studio = {
  lighting: {
    sunDir: [-0.5, 0.75, 0.45],
    sunColor: v3.scale([0.95, 0.92, 1], 1.9),
    sky: v3.scale(linear('#1d3438'), 0.55),
    ground: v3.scale(linear('#0a1719'), 0.4),
    rimDir: [0.55, 0.25, -0.8],
    rimColor: v3.scale(linear('#8fb8c0'), 0.4),
    exposure: 1.1,
  },
  top: hex('#10262b'),
  bottom: hex('#0b1d21'),
  blobs: [{ x: 0.82, y: 0.72, r: 0.3, a: 0.2, color: hex('#1b3a40') }],
};

export class VirionWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly dimers: Mesh;
  private readonly membrane: Mesh;
  private readonly core: Mesh;
  private readonly rna: Mesh;
  private readonly placements: DimerPlacement[];
  private readonly spin = mat4();
  private readonly m = mat4();

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;
    this.placements = dimerPlacements();
    this.dimers = new Mesh(gl, dimerGeometry('high'), this.placements.length);
    this.membrane = new Mesh(gl, membraneGeometry(), 1);
    this.core = new Mesh(gl, coreGeometry(), 1);
    this.rna = staticMesh(gl, rnaGeometry(), [...linear('#b4467f'), 1], [MAT.rna, 0, 0, 0]);
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    const x = input.explode;
    // The particle turns slowly on its own; dragging turns the camera.
    const a = t * 0.12;
    fromAxes(this.spin, [0, 0, 0], [Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)], 1, 1, 1);
    // Far enough that the whole particle sits right of the words, with room to come apart.
    const base = shot([1.52, 1.77, 4.05], [0, 0, 0], 0.62);
    const s = orbit(base, input.yaw, input.pitch);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.32, 0.40);
    applyShot(cam, s, 1.5 + smooth(0, 1, x) * 0.25);
    cam.fitDepth(80);
    cam.update();
    const toCam = v3.normalize(cam.eye);

    // Step 1: the rafts lift off the surface. Step 2: those facing the camera leave.
    const lift = smooth(0, 1, x) * 0.16;
    const open = smooth(1, 2, x);
    const spread = new Float32Array(16);
    let n = 0;
    const tint = [1, 1, 1, 1];
    for (const d of this.placements) {
      const worldNormal = transform(this.spin, d.normal);
      const facing = Math.max(0, v3.dot(worldNormal, toCam) + 0.15) / 1.15;
      const away = open * smooth(0.05, 0.6, facing);
      const scale = 1 - away;
      if (scale <= 0.01) continue;
      const push = lift + away * 1.4;
      // Each raft moves along its own two-fold axis; dimers of one raft stay together.
      spread.set(d.matrix);
      const raftNormal = d.normal;
      spread[12] = d.matrix[12]! + raftNormal[0] * push;
      spread[13] = d.matrix[13]! + raftNormal[1] * push;
      spread[14] = d.matrix[14]! + raftNormal[2] * push;
      for (let i = 0; i < 12; i++) spread[i] = d.matrix[i]! * scale;
      multiply(this.m, this.spin, spread);
      this.dimers.set(n++, this.m, tint, [MAT.protein, 0, 0, 0]);
    }
    this.dimers.upload(n);

    const cut = smooth(2, 3, x);
    const membraneColour = frame.dark ? [...linear('#7f6f98'), 1] : [...linear('#c4b3d6'), 1];
    const coreColour = frame.dark ? [...linear('#3e7276'), 1] : [...linear('#7fb0ae'), 1];
    fromAxes(this.m, [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.78, 0.78, 0.78);
    multiply(this.m, this.spin, this.m);
    this.membrane.set(0, this.m, membraneColour, [MAT.membrane, 0, cut > 0 ? -1 : 0, 0]);
    this.membrane.upload(1);
    fromAxes(this.m, [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.5, 0.5, 0.5);
    multiply(this.m, this.spin, this.m);
    this.core.set(0, this.m, coreColour, [MAT.core, 0, cut > 0.35 ? -1 : 0, 0]);
    this.core.upload(1);
    this.rna.set(0, this.spin, [...linear('#b4467f'), 1], [MAT.rna, 0, 0, 0]);
    this.rna.upload(1);

    const gl = engine.gl;
    beginStudio(engine, target, studio);
    const p = useSolid(engine, cam, studio, t);
    // The cut plane faces the camera and sweeps from in front of the particle to its middle.
    p.set('u_cut', [toCam[0], toCam[1], toCam[2], 1.05 - cut * 1.12]).set('u_cutCenter', [0, 0, 0]);
    this.dimers.draw();
    gl.disable(gl.CULL_FACE);
    this.membrane.draw();
    this.core.draw();
    gl.enable(gl.CULL_FACE);
    if (cut > 0.3) this.rna.draw();
    target.resolve();
  }

  dispose(): void {
    this.dimers.dispose();
    this.membrane.dispose();
    this.core.dispose();
    this.rna.dispose();
  }
}

function transform(m: Mat4, v: Vec3): Vec3 {
  return [m[0]! * v[0] + m[4]! * v[1] + m[8]! * v[2], m[1]! * v[0] + m[5]! * v[1] + m[9]! * v[2], m[2]! * v[0] + m[6]! * v[1] + m[10]! * v[2]];
}
