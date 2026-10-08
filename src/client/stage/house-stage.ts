// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The house check in 3D. The checklist stays the main control; this view
// mirrors it. Marking a spot done changes the model (water drained, a lid
// on, rubbish gone, fish in the pond), selecting a spot moves the camera to
// it, and the round markers over the model select spots with a pointer.

import { SPOTS, type SpotKey } from '../../shared/house.ts';
import { Spring, onFrame } from '../core/motion.ts';
import { isDark, onPrefs, reducedMotion } from '../core/prefs.ts';
import { Camera, applyShot, orbit, shot } from '../gl/camera.ts';
import { Engine, type Lighting } from '../gl/engine.ts';
import { disc, roundedBox, segment, sphere, torus } from '../gl/geometry.ts';
import { Mesh, createContext } from '../gl/gpu.ts';
import { fromAxes, linear, mat4, project, v3, type Mat4, type Vec3 } from '../gl/math.ts';
import { ANCHORS, DARK_PALETTE, LIGHT_PALETTE, buildHouse, type Part, type Shape } from './house-model.ts';
import type { HouseStage, HouseState, HouseStageOptions } from './house-types.ts';

const LIGHT: Lighting = {
  sunDir: [-0.45, 0.8, 0.4],
  sunColor: v3.scale([1, 0.95, 0.86], 2.6),
  sky: v3.scale(linear('#dde8e5'), 0.75),
  ground: v3.scale(linear('#b9b4a6'), 0.4),
  rimDir: [0.4, 0.3, -0.85],
  rimColor: v3.scale(linear('#ffffff'), 0.08),
  exposure: 1,
};

const DARK: Lighting = {
  sunDir: [-0.45, 0.8, 0.4],
  sunColor: v3.scale([0.75, 0.85, 1], 1.1),
  sky: v3.scale(linear('#2a464c'), 0.7),
  ground: v3.scale(linear('#2b2620'), 0.45),
  rimDir: [0.4, 0.3, -0.85],
  rimColor: v3.scale(linear('#9fc7c9'), 0.06),
  exposure: 1.1,
};

const CENTRE: Vec3 = [1.2, 0.7, -0.3];
const SPOT_INDEX = new Map(SPOTS.map((s, i) => [s.key, i + 1]));

interface Placed {
  part: Part;
  mesh: Mesh;
  slot: number;
}

class House implements HouseStage {
  private readonly canvas: HTMLCanvasElement;
  private readonly hotspots: HTMLElement;
  private readonly options: HouseStageOptions;
  private engine: Engine;
  private readonly cam = new Camera();
  private readonly meshes = new Map<Shape | number, Mesh>();
  private placed: Placed[] = [];
  private readonly done = new Map<SpotKey, Spring>();
  private selected: SpotKey | null = null;
  private readonly focusAmount = new Spring(0, 0.25);
  private focusTarget: Vec3 = CENTRE;
  private readonly yaw = new Spring(-0.55, 0.12);
  private readonly pitch = new Spring(0.62, 0.12);
  private readonly buttons = new Map<SpotKey, HTMLButtonElement>();
  private readonly m: Mat4 = mat4();
  private active = true;
  private compiled = false;
  private lost = false;
  /** Set once the renderer has failed; the list and the grid picture remain. */
  private dead = false;
  private loop: (() => void) | null = null;
  private dirty = true;
  private time = 0;
  private drag: { id: number; x: number; y: number; moved: number } | null = null;
  private readonly cleanups: (() => void)[] = [];
  private dark = false;

  constructor(canvas: HTMLCanvasElement, hotspots: HTMLElement, gl: WebGL2RenderingContext, options: HouseStageOptions) {
    this.canvas = canvas;
    this.hotspots = hotspots;
    this.options = options;
    this.engine = new Engine(canvas, gl, { house: true });
    this.engine.resize();
    for (const s of SPOTS) this.done.set(s.key, new Spring(0, 0.18));
    this.build();
    this.makeHotspots();
    this.listen();
    this.start();
  }

  private build(): void {
    const gl = this.engine.gl;
    this.dark = isDark();
    const parts = buildHouse(this.dark ? DARK_PALETTE : LIGHT_PALETTE);
    const shared: Partial<Record<Shape, () => Mesh>> = {
      cyl: () => new Mesh(gl, segment(28, 1, 1), 64),
      cone: () => new Mesh(gl, segment(28, 1, 0.72), 16),
      ball: () => new Mesh(gl, sphere(18, 12), 32),
      ring: () => new Mesh(gl, torus(0.32, 32, 14), 4),
      disc: () => new Mesh(gl, disc(32), 24),
    };
    const counts = new Map<Mesh, number>();
    this.placed = parts.map((part, i) => {
      let mesh: Mesh;
      if (part.shape === 'rbox' || part.shape === 'box') {
        // Boxes are built at their real size so the rounded edges stay even.
        mesh = new Mesh(gl, roundedBox(part.size, part.shape === 'rbox' ? Math.min(0.02, Math.min(...part.size) * 0.3) : 0.002, 2, 1), 1);
        this.meshes.set(1000 + i, mesh);
      } else {
        let m = this.meshes.get(part.shape);
        if (!m) {
          m = shared[part.shape]!();
          this.meshes.set(part.shape, m);
        }
        mesh = m;
      }
      const slot = counts.get(mesh) ?? 0;
      counts.set(mesh, slot + 1);
      return { part, mesh, slot };
    });
  }

  private makeHotspots(): void {
    for (const s of SPOTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot';
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
      b.title = this.options.labels[s.key];
      b.dataset.key = s.key;
      b.addEventListener('click', () => this.options.onSelect(s.key));
      this.hotspots.append(b);
      this.buttons.set(s.key, b);
    }
  }

  private listen(): void {
    const c = this.canvas;
    const on = (el: EventTarget, type: string, fn: (e: Event) => void) => {
      el.addEventListener(type, fn);
      this.cleanups.push(() => el.removeEventListener(type, fn));
    };
    on(c, 'webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.stop();
    });
    on(c, 'webglcontextrestored', () => {
      if (this.dead) return;
      const gl = c.getContext('webgl2');
      if (!gl) return;
      this.meshes.clear();
      this.engine = new Engine(c, gl, { house: true });
      this.engine.resize();
      this.build();
      this.lost = false;
      this.compiled = false;
      this.start();
    });
    on(c, 'pointerdown', (e) => {
      const p = e as PointerEvent;
      if (p.button > 0) return;
      this.drag = { id: p.pointerId, x: p.clientX, y: p.clientY, moved: 0 };
      c.setPointerCapture(p.pointerId);
    });
    on(c, 'pointermove', (e) => {
      const p = e as PointerEvent;
      if (!this.drag || p.pointerId !== this.drag.id) return;
      const dx = p.clientX - this.drag.x;
      const dy = p.clientY - this.drag.y;
      this.drag.x = p.clientX;
      this.drag.y = p.clientY;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.yaw.target = Math.max(-1.6, Math.min(0.9, this.yaw.target - dx * 0.008));
      this.pitch.target = Math.max(0.22, Math.min(1.15, this.pitch.target + dy * 0.006));
      this.wake();
    });
    const end = (e: Event) => {
      const p = e as PointerEvent;
      if (!this.drag || p.pointerId !== this.drag.id) return;
      // A tap rather than a drag picks the nearest spot.
      if (this.drag.moved < 6 && e.type === 'pointerup') this.pick(p.clientX, p.clientY);
      this.drag = null;
    };
    on(c, 'pointerup', end);
    on(c, 'pointercancel', end);
    this.cleanups.push(onPrefs(() => this.wake()));
    const ro = new ResizeObserver(() => {
      if (this.lost || this.dead) return;
      try {
        if (this.engine.resize()) this.wake();
      } catch (error) {
        if (__DEV__) console.error(error);
        this.fail();
      }
    });
    ro.observe(c);
    this.cleanups.push(() => ro.disconnect());
  }

  private pick(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    let best: SpotKey | null = null;
    let bestD = 44;
    for (const s of SPOTS) {
      const p = project(this.cam.viewProj, ANCHORS[s.key]);
      if (!p) continue;
      const sx = rect.left + (p[0] * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (0.5 - p[1] * 0.5) * rect.height;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bestD) {
        bestD = d;
        best = s.key;
      }
    }
    if (best) this.options.onSelect(best);
  }

  private start(): void {
    onFrame(() => {
      if (this.lost) return false;
      try {
        if (!this.engine.ready()) return true;
      } catch (error) {
        if (__DEV__) console.error(error);
        this.fail();
        return false;
      }
      this.compiled = true;
      this.wake();
      return false;
    });
  }

  private wake(): void {
    this.dirty = true;
    if (!this.loop && this.active && this.compiled && !this.lost && !this.dead) this.loop = onFrame(this.tick);
  }

  private stop(): void {
    this.loop?.();
    this.loop = null;
  }

  private springs(): Spring[] {
    return [this.focusAmount, this.yaw, this.pitch, ...this.done.values()];
  }

  private tick = (dt: number): boolean => {
    if (!this.active || this.lost) {
      this.loop = null;
      return false;
    }
    const reduced = reducedMotion();
    if (!reduced) this.time += dt;
    for (const s of this.springs()) {
      if (reduced) s.snap(s.target);
      else s.step(dt);
    }
    const fish = (this.done.get('pond')?.value ?? 0) > 0.01 && !reduced;
    const moving = this.springs().some((s) => !s.settled());
    if (!this.dirty && !moving && !fish) {
      this.loop = null;
      return false;
    }
    try {
      if (isDark() !== this.dark) {
        this.meshes.forEach((m) => m.dispose());
        this.meshes.clear();
        this.build();
      }
      this.render();
    } catch (error) {
      if (__DEV__) console.error(error);
      this.fail();
      return false;
    }
    this.dirty = false;
    return true;
  };

  /** Gives up on the 3D house for good; the list and the grid picture stay. */
  private fail(): void {
    this.dead = true;
    this.loop = null;
    this.canvas.closest('[data-house-stage]')?.removeAttribute('data-gl-ready');
  }

  private render(): void {
    const engine = this.engine;
    const gl = engine.gl;
    const cam = this.cam;
    cam.aspect = engine.width / engine.height;
    const f = this.focusAmount.value;
    const target = v3.lerp(CENTRE, this.focusTarget, f);
    const base = shot([0, 0, 12.5 - f * 7], [0, 0, 0], 0.62);
    const s = orbit({ ...base, target }, this.yaw.value, this.pitch.value);
    applyShot(cam, s, 5.9 * (1 - f) + 1.4 * f);
    cam.fitDepth(160);
    cam.update();

    // Instances, with each spot's change animated.
    const counts = new Map<Mesh, number>();
    for (const { part, mesh, slot } of this.placed) {
      let scale = 1;
      let lift = 0;
      let at = part.at;
      const d = part.spot ? (this.done.get(part.spot)?.value ?? 0) : 0;
      if (part.role === 'water' || part.role === 'item') scale = 1 - d;
      else if (part.role === 'lid') {
        scale = d;
        lift = (1 - d) * 0.25;
      } else if (part.role === 'fish') {
        scale = d;
        const a = this.time * 0.6 + (part.turn ?? 0) * 1.6;
        at = [part.at[0] + Math.cos(a) * 0.38, part.at[1], part.at[2] + Math.sin(a) * 0.24];
      }
      const show = scale > 0.001;
      const sz = part.size;
      const sx = sz[0] * (show ? Math.max(scale, 0.001) : 0.0001);
      const sy = sz[1] * (show ? Math.max(scale, 0.001) : 0.0001);
      const sz2 = sz[2] * (show ? Math.max(scale, 0.001) : 0.0001);
      const turn = part.role === 'fish' ? this.time * 0.6 + (part.turn ?? 0) * 1.6 + Math.PI / 2 : (part.turn ?? 0);
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      const tilt = part.tilt ?? 0;
      const x: Vec3 = [c, 0, -sn];
      let y: Vec3 = [0, 1, 0];
      let z: Vec3 = [sn, 0, c];
      if (tilt) {
        y = v3.rotate(y, x, tilt);
        z = v3.rotate(z, x, tilt);
      }
      const pos: Vec3 = [at[0], at[1] + lift, at[2]];
      if (part.shape === 'rbox' || part.shape === 'box') {
        // Built at full size already; only the appear and disappear scale applies.
        const k = show ? Math.max(scale, 0.001) : 0.0001;
        fromAxes(this.m, pos, x, y, z, k, k, k);
      } else if (part.shape === 'disc') {
        fromAxes(this.m, pos, x, y, z, sx, 1, sz2);
      } else if (part.shape === 'ring') {
        // The ring mesh is 0.64 tall; size[1] is the tyre's real height.
        fromAxes(this.m, pos, x, y, z, sx, sy / 0.64, sz2);
      } else {
        fromAxes(this.m, pos, x, y, z, sx, sy, sz2);
      }
      const spotId = part.spot ? (SPOT_INDEX.get(part.spot) ?? 0) : 0;
      mesh.set(slot, this.m, [...part.colour, 1], [part.mat[0], part.mat[1], part.mat[2], spotId]);
      counts.set(mesh, Math.max(counts.get(mesh) ?? 0, slot + 1));
    }
    counts.forEach((n, mesh) => mesh.upload(n));
    const all = [...counts.keys()];

    const light = isDark() ? DARK : LIGHT;
    const scene = engine.scene[0];
    engine.renderShadow(light.sunDir, [1.1, 1.0, -0.3], 7.5, all, scene);
    scene.bind();
    const bg = isDark() ? [0.094, 0.2, 0.22] : [0.863, 0.902, 0.89];
    gl.clearColor(bg[0]!, bg[1]!, bg[2]!, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    const p = engine.programs.solid.use();
    engine.defaults(p);
    engine.light(p, light);
    engine.useShadow(p, 0.006);
    const sel = this.selected ? (SPOT_INDEX.get(this.selected) ?? 0) : 0;
    p.set('u_viewProj', cam.viewProj)
      .set('u_camPos', cam.eye)
      .set('u_time', this.time)
      .set('u_grout', isDark() ? linear('#6d7a77') : linear('#b2bcb8'))
      .set('u_highlight', [sel, sel ? 0.35 : 0, 0, 0])
      .set('u_highlightColor', isDark() ? [0.6, 0.85, 0.85] : [0.25, 0.55, 0.58]);
    for (const mesh of all) mesh.draw();
    scene.resolve();
    engine.present(scene, null, 0, [0, 0, 0], 0, [0, 0]);
    this.placeHotspots();
  }

  private placeHotspots(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    for (const [key, b] of this.buttons) {
      const p = project(this.cam.viewProj, ANCHORS[key]);
      const visible = !!p && p[2] < 1 && Math.abs(p[0]) < 1.05 && Math.abs(p[1]) < 1.05;
      b.toggleAttribute('data-hidden', !visible);
      if (!p) continue;
      const x = (p[0] * 0.5 + 0.5) * w;
      const y = (0.5 - p[1] * 0.5) * h;
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  update(state: HouseState): void {
    for (const [key, spring] of this.done) spring.target = state.done.has(key) ? 1 : 0;
    this.selected = state.selected;
    for (const [key, b] of this.buttons) {
      b.toggleAttribute('data-done', state.done.has(key));
      b.setAttribute('aria-pressed', String(key === state.selected));
    }
    this.wake();
  }

  focus(key: SpotKey | null): void {
    if (key) {
      this.focusTarget = ANCHORS[key];
      this.focusAmount.target = 1;
    } else this.focusAmount.target = 0;
    this.wake();
  }

  turn(direction: number): void {
    this.yaw.target = Math.max(-1.6, Math.min(0.9, this.yaw.target - Math.sign(direction) * 0.45));
    this.wake();
  }

  setActive(active: boolean): void {
    this.active = active;
    if (active) this.wake();
    else this.stop();
  }

  dispose(): void {
    this.stop();
    this.cleanups.forEach((fn) => fn());
    this.meshes.forEach((m) => m.dispose());
    this.buttons.forEach((b) => b.remove());
    this.engine.dispose();
  }
}

export function createHouseStage(canvas: HTMLCanvasElement, hotspots: HTMLElement, opts: HouseStageOptions): HouseStage | null {
  let allow = false;
  try {
    allow = new URLSearchParams(location.search).get('gl') === 'software';
  } catch {
    allow = false;
  }
  const gl = createContext(canvas, allow);
  if (!gl) return null;
  return new House(canvas, hotspots, gl, opts);
}
