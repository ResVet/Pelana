// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Quiet water and tile sounds, made with the Web Audio API (no sound files).
// Off by default; nothing is created until the reader turns sound on in the
// settings, which also counts as the gesture browsers require before audio.
//
//   drip()  a drop falling into the tub, with a short bathroom echo
//   tick()  a ceramic tile clicking over, used by the day counter

import { onPrefs, prefs } from './prefs.ts';

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let room: DelayNode | null = null;
let lastTick = 0;

function on(): boolean {
  return prefs().sound === 'on';
}

function setup(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);
  // A small tiled room: a short delay fed back through a low-pass filter.
  room = ctx.createDelay(0.5);
  room.delayTime.value = 0.055;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2600;
  room.connect(damp);
  damp.connect(feedback);
  feedback.connect(room);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  damp.connect(wet);
  wet.connect(out);
  return ctx;
}

function ready(): AudioContext | null {
  if (!on() || document.hidden) return null;
  const c = setup();
  if (c && c.state === 'suspended') void c.resume();
  return c;
}

/** A drop of water hitting the surface: a falling pitch, a little bubble after it. */
export function drip(level = 1): void {
  const c = ready();
  if (!c || !out || !room) return;
  const t = c.currentTime + 0.01;
  const base = 900 + Math.random() * 500;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.42, t + 0.08);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16 * level, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(g);
  g.connect(out);
  g.connect(room);
  osc.start(t);
  osc.stop(t + 0.25);
  const bubble = c.createOscillator();
  bubble.type = 'sine';
  bubble.frequency.setValueAtTime(base * 1.9, t + 0.05);
  bubble.frequency.exponentialRampToValueAtTime(base * 2.6, t + 0.11);
  const bg = c.createGain();
  bg.gain.setValueAtTime(0.0001, t + 0.05);
  bg.gain.exponentialRampToValueAtTime(0.05 * level, t + 0.055);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  bubble.connect(bg);
  bg.connect(out);
  bubble.start(t + 0.05);
  bubble.stop(t + 0.15);
}

/** A tile clicking over. Rate-limited, so fast scrolling gives a soft patter, not a buzz. */
export function tick(pitch = 1): void {
  const now = performance.now();
  if (now - lastTick < 55) return;
  lastTick = now;
  const c = ready();
  if (!c || !out) return;
  const t = c.currentTime + 0.005;
  const length = Math.floor(c.sampleRate * 0.03);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 6);
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200 * pitch;
  band.Q.value = 6;
  const g = c.createGain();
  g.gain.value = 0.22;
  noise.connect(band);
  band.connect(g);
  g.connect(out);
  noise.start(t);
  const ping = c.createOscillator();
  ping.frequency.value = 1750 * pitch;
  const pg = c.createGain();
  pg.gain.setValueAtTime(0.0001, t);
  pg.gain.exponentialRampToValueAtTime(0.025, t + 0.002);
  pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  ping.connect(pg);
  pg.connect(out);
  ping.start(t);
  ping.stop(t + 0.06);
}

// Turning sound on happens inside a click, so the context can start right away.
onPrefs((p) => {
  if (p.sound === 'on') {
    const c = setup();
    if (c?.state === 'suspended') void c.resume();
    tick();
  } else if (ctx && ctx.state === 'running') void ctx.suspend();
});

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else if (on()) void ctx.resume();
});
