// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The WebGL stage behind the story. It owns the renderer and the worlds,
// turns the story state into a frame, hands one world over to the next with
// a tile-by-tile transition, lets the reader turn the mosquito and the virus
// by dragging, and rebuilds everything if the browser takes the GPU away.

import type { SceneId } from '../../shared/course.ts';
import { Spring, onFrame } from '../core/motion.ts';
import { isDark, onPrefs, reducedMotion } from '../core/prefs.ts';
import { Engine } from '../gl/engine.ts';
import { createContext } from '../gl/gpu.ts';
import type { PartKey, Stage, StoryState } from '../story/types.ts';
import type { Frame, World, WorldInput } from './world.ts';
import { BathWorld } from './worlds/bath.ts';
import { FlightWorld } from './worlds/flight.ts';
import { InsideWorld } from './worlds/inside.ts';
import { SkinWorld } from './worlds/skin.ts';
import { SwarmWorld } from './worlds/swarm.ts';
import { TilesWorld } from './worlds/tiles.ts';
import { VesselWorld } from './worlds/vessel.ts';
import { VirionWorld } from './worlds/virion.ts';

type WorldKey = 'bath' | 'flight' | 'skin' | 'inside' | 'virion' | 'swarm' | 'tiles' | 'vessel';

const WORLD_OF: Record<SceneId, WorldKey> = {
  'tub-wide': 'bath',
  'tub-eggs': 'bath',
  'tub-larvae': 'bath',
  'tub-pupae': 'bath',
  'tub-emerge': 'bath',
  'tub-again': 'bath',
  flight: 'flight',
  feed: 'skin',
  inside: 'inside',
  virion: 'virion',
  swarm: 'swarm',
  chart: 'tiles',
  'chart-full': 'tiles',
  leak: 'vessel',
  heal: 'vessel',
};

/** Scenes the reader can turn by dragging. */
const DRAGGABLE = new Set<SceneId>(['tub-emerge', 'virion']);

type Factory = (engine: Engine) => World;

const FACTORIES: Record<WorldKey, Factory> = {
  bath: (e) => new BathWorld(e),
  flight: (e) => new FlightWorld(e),
  skin: (e) => new SkinWorld(e),
  inside: (e) => new InsideWorld(e),
  virion: (e) => new VirionWorld(e),
  swarm: (e) => new SwarmWorld(e),
  tiles: (e) => new TilesWorld(e),
  vessel: (e) => new VesselWorld(e),
};

function allowSoftware(): boolean {
  try {
    return new URLSearchParams(location.search).get('gl') === 'software';
  } catch {
    return false;
  }
}

/** Moves towards a target at a fixed speed (units per second). */
class Ramp {
  value: number;
  target: number;
  private readonly speed: number;
  constructor(value: number, speed: number) {
    this.value = value;
    this.target = value;
    this.speed = speed;
  }
  step(dt: number): void {
    const d = this.target - this.value;
    const s = this.speed * dt;
    this.value = Math.abs(d) <= s ? this.target : this.value + Math.sign(d) * s;
  }
  settled(): boolean {
    return this.value === this.target;
  }
}

class StoryStage implements Stage {
  private readonly canvas: HTMLCanvasElement;
  private engine: Engine;
  private worlds = new Map<WorldKey, World>();
  private state: StoryState | null = null;
  private active = true;
  private lost = false;
  /** Set once the renderer has failed; the CSS picture stays from then on. */
  private dead = false;
  private compiled = false;
  private loop: (() => void) | null = null;
  private time = 0;
  private dirty = true;
  private sceneKey: SceneId | null = null;
  private readonly drainRamp = new Ramp(0, 1 / 2.6);
  private highlightPart: PartKey | null = null;
  private readonly highlightAmount = new Spring(0, 0.16);
  private readonly explodeSpring = new Spring(0, 0.22);
  private readonly yaw = new Spring(0, 0.1);
  private readonly pitch = new Spring(0, 0.1);
  private drag: { id: number; x: number; y: number } | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, gl);
    this.engine.resize();
    this.listen();
    this.start();
  }

  private listen(): void {
    const c = this.canvas;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, fn as EventListener);
      this.cleanups.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on(c, 'webglcontextlost' as keyof HTMLElementEventMap, ((e: Event) => {
      e.preventDefault();
      this.lost = true;
      this.stop();
    }) as never);
    on(c, 'webglcontextrestored' as keyof HTMLElementEventMap, (() => {
      this.rebuild();
    }) as never);
    on(c, 'pointerdown', (e) => {
      if (!this.state || !DRAGGABLE.has(this.state.scene) || e.button > 0) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
      c.setAttribute('data-grabbing', '');
    });
    on(c, 'pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.yaw.target -= dx * 0.008;
      this.pitch.target = Math.max(-0.9, Math.min(0.9, this.pitch.target + dy * 0.006));
      this.wake();
    });
    const end = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      c.removeAttribute('data-grabbing');
    };
    on(c, 'pointerup', end);
    on(c, 'pointercancel', end);
    this.cleanups.push(onPrefs(() => this.wake()));
  }

  private start(): void {
    const poll = () => {
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
      this.prewarm();
      return false;
    };
    onFrame(poll);
  }

  /** Builds the other worlds while the browser is idle, so later chapters do not stutter. */
  private prewarm(): void {
    const order: WorldKey[] = ['bath', 'flight', 'skin', 'inside', 'virion', 'swarm', 'tiles', 'vessel'];
    const nextWorld = () => {
      const key = order.find((k) => !this.worlds.has(k));
      if (!key || this.lost || this.dead) return;
      try {
        this.world(key);
      } catch (error) {
        if (__DEV__) console.error(error);
        this.fail();
        return;
      }
      const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (typeof ric === 'function') ric.call(window, nextWorld, { timeout: 2000 });
      else setTimeout(nextWorld, 300);
    };
    setTimeout(nextWorld, 600);
  }

  private fail(): void {
    this.dead = true;
    this.stop();
    this.canvas.closest('[data-stage]')?.removeAttribute('data-gl-ready');
  }

  private world(key: WorldKey): World {
    let w = this.worlds.get(key);
    if (!w) {
      w = FACTORIES[key](this.engine);
      this.worlds.set(key, w);
    }
    return w;
  }

  private rebuild(): void {
    if (this.dead) return;
    const gl = this.canvas.getContext('webgl2');
    if (!gl) return;
    this.worlds.clear();
    this.engine = new Engine(this.canvas, gl);
    this.engine.resize();
    this.lost = false;
    this.compiled = false;
    this.start();
  }

  private wake(): void {
    this.dirty = true;
    if (!this.loop && this.active && this.compiled && !this.lost && !this.dead) this.loop = onFrame(this.tick);
  }

  private stop(): void {
    this.loop?.();
    this.loop = null;
  }

  private tick = (dt: number): boolean => {
    if (!this.active || this.lost || !this.state) {
      this.loop = null;
      return false;
    }
    const reduced = reducedMotion();
    if (!reduced) this.time += dt;
    this.drainRamp.step(reduced ? 10 : dt);
    for (const s of [this.highlightAmount, this.explodeSpring, this.yaw, this.pitch]) {
      if (reduced) s.snap(s.target);
      else s.step(dt);
    }
    const moving = !this.drainRamp.settled() || !this.highlightAmount.settled() || !this.explodeSpring.settled() || !this.yaw.settled() || !this.pitch.settled();
    if (reduced && !this.dirty && !moving) {
      this.loop = null;
      return false;
    }
    try {
      this.render(dt, reduced);
      this.dirty = false;
      // Adapting the resolution resizes render targets, which can fail too.
      if (!reduced && this.engine.track(dt)) this.dirty = true;
    } catch (error) {
      if (__DEV__) console.error(error);
      this.fail();
      return false;
    }
    return true;
  };

  private render(dt: number, reduced: boolean): void {
    const s = this.state!;
    const engine = this.engine;
    const frame: Frame = {
      time: reduced ? 0 : this.time,
      dt: reduced ? 0 : dt,
      width: engine.width,
      height: engine.height,
      aspect: engine.width / engine.height,
      dark: isDark(),
      reduced,
      layout: window.matchMedia('(min-width: 64rem)').matches ? 'wide' : 'tall',
    };
    const input = (scene: SceneId, next: SceneId, blend: number, progress: number): WorldInput => ({
      scene,
      next,
      blend,
      progress,
      day: s.day,
      drain: this.drainRamp.value,
      highlight: this.highlightPart,
      highlightAmount: this.highlightAmount.value,
      explode: this.explodeSpring.value,
      yaw: this.yaw.value,
      pitch: this.pitch.value,
    });
    const a = WORLD_OF[s.scene];
    const b = WORLD_OF[s.nextScene];
    const grout: [number, number, number] = frame.dark ? [0.137, 0.251, 0.275] : [0.773, 0.82, 0.804];
    const sweep: [number, number] = s.beat % 2 ? [0.8, -0.6] : [-0.6, -0.8];
    const vignette = frame.dark ? 0.22 : 0.1;
    if (a === b || s.blend <= 0) {
      this.world(a).render(engine.scene[0], input(s.scene, s.nextScene, s.blend, s.progress), frame);
      engine.present(engine.scene[0], null, 0, grout, vignette, sweep);
    } else if (s.blend >= 1) {
      this.world(b).render(engine.scene[0], input(s.nextScene, s.nextScene, 0, 0), frame);
      engine.present(engine.scene[0], null, 0, grout, vignette, sweep);
    } else {
      this.world(a).render(engine.scene[0], input(s.scene, s.scene, 0, s.progress), frame);
      this.world(b).render(engine.scene[1], input(s.nextScene, s.nextScene, 0, 0), frame);
      engine.present(engine.scene[0], engine.scene[1], s.blend, grout, vignette, sweep);
    }
  }

  update(state: StoryState): void {
    if (state.scene !== this.sceneKey) {
      // A new scene starts facing the way it was designed to.
      this.sceneKey = state.scene;
      this.yaw.target = 0;
      this.pitch.target = 0;
      if (DRAGGABLE.has(state.scene)) this.canvas.setAttribute('data-grab', '');
      else this.canvas.removeAttribute('data-grab');
    }
    this.state = state;
    this.wake();
  }

  drain(on: boolean): void {
    this.drainRamp.target = on ? 1 : 0;
    this.wake();
  }

  highlight(part: PartKey | null): void {
    if (part) this.highlightPart = part;
    this.highlightAmount.target = part ? 1 : 0;
    this.wake();
  }

  explode(level: number): void {
    this.explodeSpring.target = level;
    this.wake();
  }

  turn(direction: number): void {
    if (!this.state || !DRAGGABLE.has(this.state.scene)) return;
    this.yaw.target -= Math.sign(direction) * 0.6;
    this.wake();
  }

  resize(): void {
    if (this.lost || this.dead) return;
    try {
      if (this.engine.resize()) this.wake();
    } catch (error) {
      if (__DEV__) console.error(error);
      this.fail();
    }
  }

  setActive(active: boolean): void {
    this.active = active;
    if (active) this.wake();
    else this.stop();
  }

  dispose(): void {
    this.stop();
    this.cleanups.forEach((fn) => fn());
    this.worlds.forEach((w) => w.dispose());
    this.engine.dispose();
  }
}

export function createStoryStage(canvas: HTMLCanvasElement): Stage | null {
  const gl = createContext(canvas, allowSoftware());
  if (!gl) return null;
  return new StoryStage(canvas, gl);
}
