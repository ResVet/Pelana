// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Motion helpers: easing curves, a critically damped spring, and one shared
// requestAnimationFrame loop that sleeps when nothing needs it and while the
// tab is hidden.

export const ease = {
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  outQuint: (t: number) => 1 - (1 - t) ** 5,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

/** Smoothstep between edges a and b. */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A critically damped spring that follows a moving target. `halfLife` is the
 * time in seconds for the distance to the target to halve. Frame-rate
 * independent, never overshoots.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  halfLife: number;

  constructor(value: number, halfLife = 0.12) {
    this.value = value;
    this.target = value;
    this.halfLife = halfLife;
  }

  step(dt: number): number {
    const omega = (2 * Math.LN2) / Math.max(1e-4, this.halfLife);
    const x = this.value - this.target;
    const e = Math.exp(-omega * dt);
    const temp = (this.velocity + omega * x) * dt;
    this.velocity = (this.velocity - omega * temp) * e;
    this.value = this.target + (x + temp) * e;
    if (Math.abs(this.value - this.target) < 1e-5 && Math.abs(this.velocity) < 1e-5) {
      this.value = this.target;
      this.velocity = 0;
    }
    return this.value;
  }

  settled(): boolean {
    return this.value === this.target && this.velocity === 0;
  }

  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }
}

type Tick = (dt: number, time: number) => boolean | void;

const ticks = new Set<Tick>();
let frame = 0;
let last = 0;

function loop(time: number): void {
  const dt = last ? Math.min(0.1, (time - last) / 1000) : 1 / 60;
  last = time;
  for (const tick of Array.from(ticks)) {
    // A tick that returns false is finished and leaves the loop. One that
    // throws leaves it too, so the others keep running.
    try {
      if (tick(dt, time / 1000) === false) ticks.delete(tick);
    } catch (error) {
      ticks.delete(tick);
      console.error(error);
    }
  }
  frame = ticks.size && !document.hidden ? requestAnimationFrame(loop) : 0;
  if (!frame) last = 0;
}

/** Adds a function to the shared frame loop. Returns a function that removes it. */
export function onFrame(tick: Tick): () => void {
  ticks.add(tick);
  if (!frame && !document.hidden) frame = requestAnimationFrame(loop);
  return () => ticks.delete(tick);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ticks.size && !frame) {
    last = 0;
    frame = requestAnimationFrame(loop);
  }
});
