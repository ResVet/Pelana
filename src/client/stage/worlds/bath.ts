// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The bathroom: a tiled bak mandi built into the corner, a tap that drips,
// a plastic gayung floating on the water, and daylight falling through the
// concrete ventilation blocks high in the wall. The camera flies from the
// whole room down to a few millimetres of tile at the waterline, where the
// eggs, larvae, pupae and finally the adult mosquito are.
//
// Units are centimetres; the creatures are modelled in millimetres and
// scaled by 0.1.

import type { SceneId } from '../../../shared/course.ts';
import { smooth } from '../../core/motion.ts';
import { drip } from '../../core/sound.ts';
import { Batch } from '../../gl/batch.ts';
import { Camera, applyShot, blendShots, orbit, shot, type Shot } from '../../gl/camera.ts';
import type { Engine, Lighting } from '../../gl/engine.ts';
import { lathe, merge, plane, quad, roundedBox, segment, sphere, tube, wing } from '../../gl/geometry.ts';
import { Mesh, staticMesh, type Program, type Target } from '../../gl/gpu.ts';
import { fromAxes, linear, mat4, random, v3, type Mat4, type Vec3 } from '../../gl/math.ts';
import { addEgg, addLarva, addPupa, type AquaticColours } from '../models/aquatic.ts';
import { MAT, PART } from '../models/materials.ts';
import { Mosquito } from '../models/mosquito.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';

type BathScene = 'tub-wide' | 'tub-eggs' | 'tub-larvae' | 'tub-pupae' | 'tub-emerge' | 'tub-again';
export const BATH_SCENES: SceneId[] = ['tub-wide', 'tub-eggs', 'tub-larvae', 'tub-pupae', 'tub-emerge', 'tub-again'];

const MM = 0.1;
/** Inside of the tub. */
const TUB = { x0: -90, x1: -30, z0: -90, z1: -40, floor: 10, rim: 70 };
/** Water level before and after the tub is filled. */
const LOW = 55;
const HIGH = 64;
/** The ventilation blocks in the left wall. */
const WINDOW = { plane: -100, z0: -92, z1: -32, y0: 150, y1: 210, block: 20 };
const OUTLET: Vec3 = [-61, 84.2, -86];
/** Direction towards the sun: steep, through the blocks, onto the water by the back wall. */
const SUN: Vec3 = v3.normalize([-0.36, 0.89, 0.28]);
const ADULT: Vec3 = [-61.0, HIGH, -86.8];
const ADULT_FORWARD: Vec3 = [1, 0, -0.1];

/** Where to look for each part, in her body frame (mm), and from how far (cm). */
const PART_VIEWS: Record<'lyre' | 'legs' | 'proboscis' | 'wings', { at: Vec3; distance: number; yaw: number; pitch: number }> = {
  lyre: { at: [0, 0.35, 0.05], distance: 0.85, yaw: 0.35, pitch: 1.0 },
  legs: { at: [0, -0.55, 0.2], distance: 1.6, yaw: 0.85, pitch: 0.05 },
  proboscis: { at: [0, -0.55, 1.9], distance: 1.0, yaw: -1.25, pitch: 0.12 },
  wings: { at: [0, 0.4, -1.3], distance: 1.15, yaw: 0.5, pitch: 1.05 },
};

interface State {
  level: number;
  larvae: number;
  pupae: number;
  adult: number;
  lens: number;
  absorb: number;
  radius: number;
}

const STATE: Record<BathScene, State> = {
  'tub-wide': { level: LOW, larvae: 0, pupae: 0, adult: 0, lens: 0, absorb: 1, radius: 70 },
  'tub-eggs': { level: LOW, larvae: 0, pupae: 0, adult: 0, lens: 0, absorb: 14, radius: 1.4 },
  'tub-larvae': { level: HIGH, larvae: 1, pupae: 0, adult: 0, lens: 1.0, absorb: 13, radius: 2.4 },
  'tub-pupae': { level: HIGH, larvae: 0.55, pupae: 1, adult: 0, lens: 1.0, absorb: 13, radius: 2.4 },
  'tub-emerge': { level: HIGH, larvae: 0, pupae: 0, adult: 1, lens: 0, absorb: 13, radius: 1.0 },
  'tub-again': { level: 60, larvae: 0.6, pupae: 0, adult: 0, lens: 0, absorb: 1, radius: 75 },
};

const SHOTS: Record<BathScene, Shot> = {
  'tub-wide': shot([30, 178, 92], [-60, 44, -64], 0.6),
  'tub-eggs': shot([-59.7, 55.48, -86.4], [-58.6, 55.4, -90], 0.6),
  'tub-larvae': shot([-62.1, 64.0, -83.6], [-61.3, 63.3, -89], 0.66),
  'tub-pupae': shot([-59.2, 64.0, -84.0], [-61.0, 63.45, -89], 0.66),
  'tub-emerge': shot([-59.95, 64.82, -85.45], [-61.0, 64.2, -86.8], 0.56),
  'tub-again': shot([18, 182, 64], [-60, 44, -64], 0.6),
};
const DRAINED = shot([-36, 104, -10], [-60, 30, -66], 0.64);

interface Palette {
  lighting: Lighting;
  wallTile: Vec3;
  tubTile: Vec3;
  floorTile: Vec3;
  border: Vec3;
  paint: Vec3;
  grout: Vec3;
  waterTint: Vec3;
  haze: Vec3;
  gayung: Vec3;
  chrome: Vec3;
  sky: Vec3;
  clear: [number, number, number];
}

const LIGHT: Palette = {
  lighting: {
    sunDir: SUN,
    sunColor: v3.scale([1.0, 0.93, 0.8], 3.8),
    sky: v3.scale(linear('#d5e4e1'), 0.7),
    ground: v3.scale(linear('#a7b6b2'), 0.4),
    rimDir: [0.4, 0.5, 0.8],
    rimColor: v3.scale(linear('#e3efec'), 0.12),
    exposure: 1.0,
  },
  wallTile: linear('#e4ecea'),
  tubTile: linear('#b9d6d2'),
  floorTile: linear('#c8cecb'),
  border: linear('#2b6c72'),
  paint: linear('#eef1ec'),
  grout: linear('#9fb1ac'),
  waterTint: v3.scale(linear('#5f9f98'), 0.62),
  haze: [0.36, 0.56, 0.54],
  gayung: linear('#e8a93a'),
  chrome: linear('#d9dfe1'),
  sky: [3.2, 3.3, 3.2],
  clear: [0.906, 0.933, 0.925],
};

const DARK: Palette = {
  lighting: {
    sunDir: SUN,
    sunColor: v3.scale([0.6, 0.74, 1.0], 1.8),
    sky: v3.scale(linear('#1c3a40'), 0.75),
    ground: v3.scale(linear('#0d1f22'), 0.6),
    rimDir: [0.4, 0.5, 0.8],
    rimColor: v3.scale(linear('#5c8f95'), 0.08),
    exposure: 1.15,
  },
  wallTile: linear('#c6d6d3'),
  tubTile: linear('#9cc3be'),
  floorTile: linear('#a9b3b0'),
  border: linear('#1f5b61'),
  paint: linear('#d2d9d4'),
  grout: linear('#6f817d'),
  waterTint: v3.scale(linear('#1c4d50'), 0.5),
  haze: [0.08, 0.2, 0.22],
  gayung: linear('#d0902f'),
  chrome: linear('#b7c0c3'),
  sky: [0.5, 0.62, 0.8],
  clear: [0.043, 0.114, 0.129],
};

const AQUATIC: AquaticColours = {
  larva: linear('#a39d86'),
  head: linear('#5a4630'),
  siphon: linear('#4a3a28'),
  pupa: linear('#4d4538'),
  skin: linear('#cfc6b0'),
  hair: linear('#3f372a'),
  egg: linear('#14161a'),
};

function mixState(a: State, b: State, t: number): State {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    level: l(a.level, b.level),
    larvae: l(a.larvae, b.larvae),
    pupae: l(a.pupae, b.pupae),
    adult: l(a.adult, b.adult),
    lens: l(a.lens, b.lens),
    absorb: Math.exp(l(Math.log(a.absorb), Math.log(b.absorb))),
    radius: Math.exp(l(Math.log(a.radius), Math.log(b.radius))),
  };
}

interface EggSpec {
  at: Vec3;
  along: Vec3;
  /** 1 for eggs laid after the tub was refilled (seen at the end of the story). */
  late: number;
}

interface LarvaSpec {
  x: number;
  z: number;
  heading: number;
  tilt: number;
  phase: number;
  period: number;
  near: boolean;
}

export class BathWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly mirrorCam = new Camera();
  private readonly statics: { mesh: Mesh; key: keyof Palette | null; shadow: boolean }[] = [];
  private readonly tap: Mesh;
  private readonly gayung: Mesh;
  private readonly water: Mesh;
  private readonly sphere: Batch;
  private readonly segment: Batch;
  private readonly wing: Batch;
  /** See-through things: the empty pupal skin. */
  private readonly glassSphere: Batch;
  private readonly glassSegment: Batch;
  private readonly mosquito: Mosquito;
  private readonly eggs: EggSpec[] = [];
  private readonly larvae: LarvaSpec[] = [];
  private readonly m: Mat4 = mat4();
  private readonly drips = new Float32Array(16);
  private nextDrip = 1.2;
  private dripIndex = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    const gl = engine.gl;

    // Room: tiled walls to 140 cm, a dark border row, painted wall above, tiled floor.
    const wall = (y0: number, y1: number) =>
      merge([
        { geo: quad([[-100, y0, -100], [170, y0, -100], [170, y1, -100], [-100, y1, -100]]) },
        { geo: quad([[-100, y0, 140], [-100, y0, -100], [-100, y1, -100], [-100, y1, 140]]) },
      ]);
    this.statics.push({ mesh: staticMesh(gl, wall(0, 140), [1, 1, 1, 1], [MAT.tile, 20, 0.35, 0]), key: 'wallTile', shadow: false });
    this.statics.push({ mesh: staticMesh(gl, wall(140, 150), [1, 1, 1, 1], [MAT.tile, 10, 0.3, 0]), key: 'border', shadow: false });
    this.statics.push({ mesh: staticMesh(gl, wall(150, 290), [1, 1, 1, 1], [MAT.paint, 0, 0, 0]), key: 'paint', shadow: false });
    this.statics.push({
      mesh: staticMesh(gl, quad([[-100, 0, 160], [170, 0, 160], [170, 0, -100], [-100, 0, -100]]), [1, 1, 1, 1], [MAT.tile, 20, 0.4, 0]),
      key: 'floorTile',
      shadow: false,
    });

    // The tub: four walls and a floor slab, tiled in 10 cm tiles, edges rounded like bullnose tile.
    const box = (min: Vec3, max: Vec3) => {
      const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
      const m = mat4();
      m[12] = (min[0] + max[0]) / 2;
      m[13] = (min[1] + max[1]) / 2;
      m[14] = (min[2] + max[2]) / 2;
      return { geo: roundedBox(size, 1.1, 2, 1), matrix: m };
    };
    const tub = merge([
      box([-100, 0, -40], [-20, TUB.rim, -30]),
      box([-30, 0, -90], [-20, TUB.rim, -40]),
      box([-100, 0, -100], [-20, TUB.rim, -90]),
      box([-100, 0, -90], [-90, TUB.rim, -40]),
      box([-90, 0, -90], [-30, TUB.floor, -40]),
    ]);
    this.statics.push({ mesh: staticMesh(gl, tub, [1, 1, 1, 1], [MAT.tile, 10, 0.3, 0]), key: 'tubTile', shadow: true });

    // Tap: a flange on the wall, a pipe that bends down to the outlet, and a handle.
    const tapGeo = merge([
      { geo: tube([[-61, 91.7, -100.2], [-61, 91.7, -98.4]], 3.2, 24, true) },
      { geo: tube([[-61, 91.7, -98.6], [-61, 91.7, -91], [-61, 91.2, -88.4], [-61, 89.6, -86.6], [-61, 87.4, -86], [-61, 84.4, -86]], 1.05, 16, true) },
      { geo: tube([[-61, 91.7, -95], [-61, 96.2, -95]], 0.9, 12, true) },
      { geo: tube([[-64.2, 96.4, -95], [-57.8, 96.4, -95]], 0.6, 12, true) },
      { geo: tube([[-61, 96.4, -98.2], [-61, 96.4, -91.8]], 0.6, 12, true) },
    ]);
    this.tap = staticMesh(gl, tapGeo, [...LIGHT.chrome, 1], [MAT.chrome, 0, 0, 0]);

    // Gayung: a plastic dipper with a long handle, floating.
    const cup = lathe(
      [
        [0, -4.6], [3.6, -4.6], [5.4, -4.2], [6.6, -2.4], [7.1, 2.4], [7.25, 3.4], [7.25, 3.4], [6.95, 3.4], [6.8, 2.4], [6.3, -2.2], [5.2, -3.9], [3.5, -4.25], [0, -4.25],
      ],
      40,
    );
    const handle = tube([[6.6, 1.6, 0], [12, 3.0, 0], [19, 4.6, 0]], 0.95, 12, true);
    this.gayung = new Mesh(gl, merge([{ geo: cup }, { geo: handle }]), 1);

    this.water = new Mesh(gl, plane(1, 1, 1, 1), 1);
    this.sphere = new Batch(new Mesh(gl, sphere(20, 14), 900));
    this.segment = new Batch(new Mesh(gl, segment(8, 2, 0.8), 900));
    this.wing = new Batch(new Mesh(gl, wing(28, 4), 16));
    this.glassSphere = new Batch(new Mesh(gl, sphere(20, 14), 24));
    this.glassSegment = new Batch(new Mesh(gl, segment(8, 2, 0.8), 8));
    this.mosquito = new Mosquito(
      { sphere: this.sphere, segment: this.segment, wing: this.wing },
      { dark: linear('#221d19'), joint: linear('#4a4038'), pale: linear('#c9c6b8') },
    );

    // Eggs: a dense cluster where the camera looks, and a scattered band along the walls.
    const rand = random(11);
    const eggAt = (x: number, y: number, late: number) => {
      const a = rand() * Math.PI;
      const along: Vec3 = [Math.cos(a), Math.sin(a) * 0.55, 0];
      this.eggs.push({ at: [x, y, TUB.z0], along: v3.normalize(along), late });
    };
    for (let i = 0; i < 34; i++) eggAt(-58.6 + (rand() - 0.5) * 1.8, LOW + 0.14 + Math.pow(rand(), 1.4) * 0.85, 0);
    for (let i = 0; i < 46; i++) eggAt(-88 + rand() * 56, LOW + 0.1 + rand() * 1.3, 0);
    for (let i = 0; i < 30; i++) eggAt(-88 + rand() * 56, 60.1 + rand() * 1.1, 1);

    // Larvae: some just in front of the camera, many more across the tub.
    for (let i = 0; i < 9; i++) {
      this.larvae.push({
        x: -64.6 + rand() * 6.6,
        z: -89.1 + rand() * 4.4,
        heading: rand() * Math.PI * 2,
        tilt: 0.78 + rand() * 0.4,
        phase: rand() * 10,
        period: 11 + rand() * 9,
        near: true,
      });
    }
    for (let i = 0; i < 22; i++) {
      this.larvae.push({
        x: TUB.x0 + 3 + rand() * (TUB.x1 - TUB.x0 - 6),
        z: TUB.z0 + 3 + rand() * (TUB.z1 - TUB.z0 - 6),
        heading: rand() * Math.PI * 2,
        tilt: 0.8 + rand() * 0.4,
        phase: rand() * 10,
        period: 12 + rand() * 9,
        near: false,
      });
    }
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const gl = engine.gl;
    const pal = frame.dark ? DARK : LIGHT;
    const scene = input.scene as BathScene;
    const next = (BATH_SCENES.includes(input.next) ? input.next : input.scene) as BathScene;
    // Within the bathroom the camera flies between framings over the second half of a chapter.
    const t = next === scene ? 0 : smooth(0.35, 1, input.progress);
    const ease = t * t * (3 - 2 * t);
    let st = mixState(STATE[scene], STATE[next], ease);
    const longMove = Math.abs(Math.log(SHOTS[scene].distance / SHOTS[next].distance)) > 2;
    let s = blendShots(SHOTS[scene], SHOTS[next], ease, longMove ? 0.55 : 0);

    // Draining: the water goes, the camera backs off to look into the tub, then the walls are scrubbed.
    const drain = input.drain;
    if (drain > 0) {
      const back = smooth(0, 0.45, drain);
      s = blendShots(s, DRAINED, back * back * (3 - 2 * back), 0.3);
      st = { ...st, level: st.level + (TUB.floor + 0.2 - st.level) * smooth(0.1, 0.55, drain), lens: st.lens * (1 - back), absorb: st.absorb + (1.5 - st.absorb) * back, radius: st.radius + (60 - st.radius) * back };
    }
    const scrub = smooth(0.6, 1, drain);
    const sweepX = TUB.x0 - 2 + (TUB.x1 - TUB.x0 + 4) * scrub;

    // Parts of the mosquito: the camera moves in to show the one asked about.
    if (scene === 'tub-emerge' && input.highlight && input.highlightAmount > 0) {
      const look = PART_VIEWS[input.highlight];
      const F = v3.normalize(ADULT_FORWARD);
      const X = v3.normalize(v3.cross([0, 1, 0], F));
      const p = look.at;
      const focus: Vec3 = [
        ADULT[0] + (X[0] * p[0] + F[0] * p[2]) * MM,
        st.level + (1.15 + p[1]) * MM,
        ADULT[2] + (X[2] * p[0] + F[2] * p[2]) * MM,
      ];
      const close = orbit({ ...SHOTS['tub-emerge'], target: focus, distance: look.distance, fov: 0.5 }, look.yaw, look.pitch);
      const k = input.highlightAmount;
      s = blendShots(s, close, k * k * (3 - 2 * k));
    }
    s = orbit(s, input.yaw, input.pitch);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.3, st.radius > 20 ? 0.32 : 0.4);
    const fit = scene === 'tub-emerge' && input.highlight ? st.radius * (1 - 0.65 * input.highlightAmount) : st.radius;
    applyShot(cam, s, fit, st.radius < 6);
    cam.fitDepth(st.radius > 20 ? 300 : 900);
    // Keep the camera out of the walls and above the floor.
    cam.eye = [cam.eye[0], Math.max(cam.eye[1], 4), Math.max(cam.eye[2], -99)];
    cam.update();

    const level = st.level;
    const waterOn = level > TUB.floor + 0.5;

    // Drips from the tap make rings on the water.
    if (!frame.reduced) {
      this.nextDrip -= frame.dt;
      if (this.nextDrip <= 0) {
        this.nextDrip = 3.1 + Math.random() * 1.6;
        const fall = Math.sqrt((2 * Math.max(0, OUTLET[1] - level)) / 981);
        this.drips.set([OUTLET[0], OUTLET[2], frame.time + fall, 1], (this.dripIndex % 4) * 4);
        this.dripIndex++;
        if (waterOn) {
          const loud = st.radius < 6 ? 1 : 0.55;
          setTimeout(() => drip(loud), fall * 1000);
        }
      }
    }

    // --- Build the creatures for this frame ---
    this.sphere.begin();
    this.segment.begin();
    this.wing.begin();
    this.glassSphere.begin();
    this.glassSegment.begin();
    const time = frame.time;
    for (const egg of this.eggs) {
      if (egg.late && scene !== 'tub-again' && next !== 'tub-again') continue;
      if (egg.at[0] < sweepX && scrub > 0) continue;
      addEgg(this.sphere, egg.at, egg.along, [0, 0, 1], MM, AQUATIC.egg);
    }
    const larvaCount = st.larvae;
    if (larvaCount > 0.01 && waterOn) {
      this.larvae.forEach((l, i) => {
        const share = l.near ? i / 9 : (i - 9) / 22;
        const presence = smooth(share * 0.7, share * 0.7 + 0.3, larvaCount);
        if (presence <= 0) return;
        const cycle = ((time + l.phase * 3) % l.period) / 2.4;
        const dive = !frame.reduced && cycle < 1 ? Math.sin(cycle * Math.PI) : 0;
        addLarva(
          { sphere: this.sphere, segment: this.segment },
          { anchor: [l.x, level, l.z], heading: l.heading, tilt: l.tilt, scale: MM, time, phase: l.phase, presence, dive },
          AQUATIC,
        );
      });
    }
    if (st.pupae > 0.01 && waterOn) {
      const spots: [number, number, number][] = [
        [-63.0, -87.7, 0.4],
        [-60.0, -86.2, 2.1],
        [-62.2, -85.2, 4.0],
        [-59.4, -88.4, 5.3],
      ];
      spots.forEach(([x, z, h], i) => {
        const presence = smooth(i / 4, i / 4 + 0.25, st.pupae);
        if (presence > 0) addPupa({ sphere: this.sphere, segment: this.segment }, { anchor: [x, level, z], heading: h, scale: MM, time, phase: i * 1.7, presence }, AQUATIC);
      });
    }
    let feet: Vec3[] = [];
    if (st.adult > 0.01 && waterOn) {
      const rise = 1 - st.adult;
      // She stands over the skin she has just climbed out of.
      addPupa({ sphere: this.glassSphere, segment: this.glassSegment }, { anchor: [ADULT[0] - 0.04, level + 0.03, ADULT[2] + 0.01], heading: 1.57, scale: MM, time, phase: 0, presence: 1, empty: true }, AQUATIC);
      this.mosquito.add({
        origin: [ADULT[0], level + (1.15 - rise * 3.2) * MM, ADULT[2]],
        forward: v3.normalize([ADULT_FORWARD[0], rise * 0.8, ADULT_FORWARD[2]]),
        up: [0, 1, 0],
        scale: MM * (0.85 + 0.15 * st.adult),
        mode: 'stand',
        fed: 0,
        time,
      });
      if (rise < 0.05) feet = [...this.mosquito.feet];
    }
    // A falling drop.
    if (!frame.reduced && waterOn) {
      for (let k = 0; k < 4; k++) {
        const land = this.drips[k * 4 + 2]!;
        const fall = Math.sqrt((2 * Math.max(0, OUTLET[1] - level)) / 981);
        const since = time - (land - fall);
        if (since > 0 && since < fall) {
          const y = OUTLET[1] - 0.5 * 981 * since * since;
          fromAxes(this.m, [OUTLET[0], y, OUTLET[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.3, 0.22);
          this.sphere.push(this.m, [...pal.waterTint, 0.9], [MAT.plain, 0.05, 0, 0]);
        }
      }
    }
    this.sphere.end();
    this.segment.end();
    this.wing.end();
    this.glassSphere.end();
    this.glassSegment.end();

    // Gayung bobbing on the water, rocking a little.
    const bob = frame.reduced ? 0 : Math.sin(time * 0.8) * 0.18;
    const gy = Math.max(TUB.floor + 4.4, level + 1.5 + bob);
    const rock = frame.reduced ? 0 : Math.sin(time * 0.6) * 0.04;
    const gx = v3.normalize([Math.cos(0.7), rock, Math.sin(0.7)]);
    const gz = v3.normalize(v3.cross(gx, [0, 1, 0]));
    const gyAxis = v3.cross(gz, gx);
    fromAxes(this.m, [-77, gy, -57], gx, gyAxis, gz, 1, 1, 1);
    this.gayung.set(0, this.m, [...pal.gayung, 1], [MAT.plastic, 0.24, 0, 0]);
    this.gayung.upload(1);
    this.tap.set(0, mat4(), [...pal.chrome, 1], [MAT.chrome, 0, 0, 0]);
    this.tap.upload(1);

    // --- Shadow map, framed around what the camera looks at ---
    const focus = cam.target;
    const shadowRadius = Math.min(150, Math.max(1.2, st.radius * 1.4));
    const casters: Mesh[] = [this.tap, this.gayung, this.sphere.mesh, this.segment.mesh];
    if (st.radius > 6) casters.push(this.statics.find((s) => s.key === 'tubTile')!.mesh);
    engine.renderShadow(SUN, focus, shadowRadius, casters, target);

    const bath = engine.programs.bath;
    const setup = (p: Program, camera: Camera, reflection: boolean) => {
      p.use();
      engine.defaults(p);
      engine.light(p, pal.lighting);
      engine.useShadow(p, shadowRadius * 0.0009);
      p.set('u_viewProj', camera.viewProj)
        .set('u_camPos', camera.eye)
        .set('u_time', time)
        .set('u_grout', pal.grout)
        .set('u_water', [level, st.lens, st.absorb, waterOn && !reflection ? 1 : 0])
        .set('u_waterAbs', [0.016, 0.0055, 0.0065])
        .set('u_waterTint', pal.waterTint)
        .set('u_tub', [TUB.x0, TUB.z0, TUB.x1, TUB.z1])
        .set('u_tubFloor', TUB.floor)
        .set('u_window', [WINDOW.z0, WINDOW.y0, WINDOW.z1, WINDOW.y1])
        .set('u_windowParams', [WINDOW.plane, WINDOW.block, 0, 0])
        .set('u_stain', [LOW + 0.4, 0.7, 0, 1])
        .set('u_causticScale', 0.55)
        .set('u_tubRim', TUB.rim)
        .set('u_skyLight', pal.sky)
        .set('u_clipY', reflection ? level - 0.002 : -1e9)
        .set('u_highlight', [input.highlight ? PART[input.highlight] : 0, input.highlightAmount, 0, 0])
        .set('u_highlightColor', frame.dark ? [0.55, 0.95, 0.95] : [0.35, 0.95, 0.95]);
    };

    const drawOpaque = () => {
      for (const s of this.statics) {
        const colour = s.key ? (pal[s.key] as Vec3) : [1, 1, 1];
        s.mesh.data[16] = colour[0]!;
        s.mesh.data[17] = colour[1]!;
        s.mesh.data[18] = colour[2]!;
        s.mesh.upload(1);
        s.mesh.draw();
      }
      this.tap.draw();
      this.gayung.draw();
      this.sphere.draw();
      this.segment.draw();
    };

    // --- Reflection of everything above the water, seen in its surface ---
    const above = cam.eye[1] > level + 0.02;
    const reflect = waterOn && above;
    if (reflect) {
      const r = engine.reflection;
      r.bind();
      gl.clearColor(pal.clear[0], pal.clear[1], pal.clear[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      cam.mirror(level, this.mirrorCam);
      setup(bath, this.mirrorCam, true);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.frontFace(gl.CW);
      drawOpaque();
      gl.frontFace(gl.CCW);
    }

    // --- Main pass ---
    target.bind();
    gl.clearColor(pal.clear[0], pal.clear[1], pal.clear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    setup(bath, cam, false);
    bath.set('u_stain', [LOW + 0.4, 0.7, 0, 1]);
    drawOpaque();

    // Water surface, which needs the opaque image behind it.
    if (waterOn) {
      target.resolve();
      const w = engine.programs.water.use();
      w.texture('u_scene', 0, target.texture);
      w.texture('u_reflection', 1, engine.reflection.texture);
      const macro = st.radius < 6;
      const dimples = new Float32Array(24);
      feet.slice(0, 6).forEach((f, i) => dimples.set([f[0], f[2], 0.05, 0.06], i * 4));
      w.set('u_hasReflection', reflect ? 1 : 0)
        .set('u_resolution', [engine.width, engine.height])
        .set('u_camPos', cam.eye)
        .set('u_time', time)
        .set('u_water', [level, st.lens, st.absorb, 1])
        .set('u_waterTint', pal.waterTint)
        .set('u_tub', [TUB.x0, TUB.z0, TUB.x1, TUB.z1])
        .set('u_sunDir', SUN)
        .set('u_sunColor', pal.lighting.sunColor)
        .set('u_skyColor', pal.lighting.sky)
        .set('u_groundColor', pal.lighting.ground)
        .set('u_window', [WINDOW.z0, WINDOW.y0, WINDOW.z1, WINDOW.y1])
        .set('u_windowParams', [WINDOW.plane, WINDOW.block, 0, 0])
        .set('u_refract', macro ? 0.035 : 0.018)
        .set('u_waveAmp', macro ? 0.06 : 0.09)
        .set('u_waveStep', macro ? 0.004 : 0.05)
        .set('u_exposure', pal.lighting.exposure)
        .set('u_drips', this.drips)
        .set('u_dimples', dimples)
        .set('u_calm', frame.reduced ? 0.4 : 1)
        .set('u_viewProj', cam.viewProj);
      fromAxes(this.m, [(TUB.x0 + TUB.x1) / 2, level, (TUB.z0 + TUB.z1) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], TUB.x1 - TUB.x0, 1, TUB.z1 - TUB.z0);
      this.water.set(0, this.m);
      this.water.upload(1);
      gl.disable(gl.CULL_FACE);
      this.water.draw();
    }

    // Wings and the empty pupal skin are see-through: drawn last, blended.
    if (this.wing.count || this.glassSphere.count) {
      setup(bath, cam, false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.enable(gl.CULL_FACE);
      this.glassSphere.draw();
      this.glassSegment.draw();
      gl.disable(gl.CULL_FACE);
      this.wing.draw();
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    // The waterline across the lens when the camera is half in the water.
    if (waterOn && st.lens > 0.05 && Math.abs(cam.eye[1] - level) < st.lens * 1.5) {
      const lens = engine.programs.lens.use();
      lens.set('u_invViewProj', cam.invViewProj)
        .set('u_camPos', cam.eye)
        .set('u_water', [level, st.lens, st.absorb, 1])
        .set('u_time', time)
        .set('u_haze', pal.haze)
        .set('u_drips', this.drips)
        .set('u_dimples', new Float32Array(24))
        .set('u_calm', frame.reduced ? 0.4 : 1)
        .set('u_lensOn', smooth(0.05, 0.6, st.lens));
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      engine.fullscreen();
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
    }
    target.resolve();
  }

  dispose(): void {
    for (const s of this.statics) s.mesh.dispose();
    this.tap.dispose();
    this.gayung.dispose();
    this.water.dispose();
    this.sphere.mesh.dispose();
    this.segment.mesh.dispose();
    this.wing.mesh.dispose();
    this.glassSphere.mesh.dispose();
    this.glassSegment.mesh.dispose();
  }
}
