// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// She flies, in daylight, indoors. The house behind her is out of focus:
// warm window light and the teal of the walls as soft circles.

import { Camera, applyShot, orbit, shot } from '../../gl/camera.ts';
import type { Engine } from '../../gl/engine.ts';
import type { Target } from '../../gl/gpu.ts';
import { linear, v3 } from '../../gl/math.ts';
import { framing, type Frame, type World, type WorldInput } from '../world.ts';
import { beginStudio, drift, hex, mosquitoKit, transparent, useSolid, type MosquitoKit, type Studio } from './studio.ts';

const LIGHT: Studio = {
  lighting: {
    sunDir: [-0.55, 0.7, 0.45],
    sunColor: v3.scale([1.0, 0.92, 0.8], 3.2),
    sky: v3.scale(linear('#dbe8e5'), 0.55),
    ground: v3.scale(linear('#b4c2bf'), 0.3),
    rimDir: [0.6, 0.3, -0.75],
    rimColor: v3.scale(linear('#f4efe2'), 0.55),
    exposure: 1,
  },
  top: hex('#e9efec'),
  bottom: hex('#d6e1de'),
  blobs: [
    { x: 0.82, y: 0.78, r: 0.22, a: 0.55, color: hex('#f6f0e1') },
    { x: 0.62, y: 0.3, r: 0.16, a: 0.35, color: hex('#bcd6d1') },
    { x: 0.95, y: 0.35, r: 0.13, a: 0.45, color: hex('#f3e6c8') },
    { x: 0.45, y: 0.82, r: 0.1, a: 0.3, color: hex('#ffffff') },
    { x: 0.72, y: 0.55, r: 0.07, a: 0.35, color: hex('#e8d9b8') },
    { x: 0.3, y: 0.2, r: 0.18, a: 0.25, color: hex('#c7dad6') },
  ],
};

const DARK: Studio = {
  lighting: {
    sunDir: [0.5, 0.65, 0.55],
    sunColor: v3.scale([1.0, 0.78, 0.55], 2.4),
    sky: v3.scale(linear('#1f3a40'), 0.6),
    ground: v3.scale(linear('#0b1a1d'), 0.4),
    rimDir: [-0.6, 0.3, -0.75],
    rimColor: v3.scale(linear('#8fc3c5'), 0.35),
    exposure: 1.1,
  },
  top: hex('#10252a'),
  bottom: hex('#0b1d21'),
  blobs: [
    { x: 0.84, y: 0.74, r: 0.2, a: 0.45, color: hex('#5b4a2c') },
    { x: 0.6, y: 0.28, r: 0.15, a: 0.35, color: hex('#1d4a50') },
    { x: 0.96, y: 0.38, r: 0.12, a: 0.5, color: hex('#7a5a2a') },
    { x: 0.42, y: 0.8, r: 0.09, a: 0.3, color: hex('#2a5a5f') },
    { x: 0.7, y: 0.55, r: 0.06, a: 0.45, color: hex('#a07a3a') },
  ],
};

export class FlightWorld implements World {
  private readonly engine: Engine;
  private readonly cam = new Camera();
  private readonly kit: MosquitoKit;

  constructor(engine: Engine) {
    this.engine = engine;
    this.kit = mosquitoKit(engine.gl);
  }

  render(target: Target, input: WorldInput, frame: Frame): void {
    const engine = this.engine;
    const gl = engine.gl;
    const studio = frame.dark ? DARK : LIGHT;
    const t = frame.time;
    // The camera swings slowly round her as the chapter is read.
    const swing = -0.5 + input.progress * 0.9;
    const base = shot([13, 3.5, 4], [0, -0.3, -0.5], 0.5);
    const s = orbit(base, swing + input.yaw, input.pitch);
    const cam = this.cam;
    cam.aspect = frame.aspect;
    cam.shift = framing(frame, 0.3, 0.38);
    applyShot(cam, s, 5.2);
    cam.fitDepth(200);
    cam.update();

    const k = this.kit;
    k.sphere.begin();
    k.segment.begin();
    k.wing.begin();
    const bob = Math.sin(t * 1.6) * 0.25;
    k.mosquito.add({
      origin: [Math.sin(t * 0.7) * 0.25, bob, 0],
      forward: v3.normalize([0.35 + Math.sin(t * 0.5) * 0.05, 0.12, 1]),
      up: v3.normalize([Math.sin(t * 0.9) * 0.05, 1, -0.15]),
      scale: 1,
      mode: 'fly',
      fed: 0,
      time: t,
    });
    k.sphere.end();
    k.segment.end();
    k.wing.end();

    beginStudio(engine, target, { ...studio, blobs: drift(studio.blobs, swing * 0.12) });
    useSolid(engine, cam, studio, t);
    k.sphere.draw();
    k.segment.draw();
    transparent(gl, true);
    k.wing.draw();
    transparent(gl, false);
    target.resolve();
  }

  dispose(): void {
    this.kit.sphere.mesh.dispose();
    this.kit.segment.mesh.dispose();
    this.kit.wing.mesh.dispose();
  }
}
