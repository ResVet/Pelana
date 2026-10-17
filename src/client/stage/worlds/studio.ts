// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Shared pieces for the close-up worlds that have no room around them: a
// soft backdrop, studio light, and the order objects are drawn in.

import { Batch } from '../../gl/batch.ts';
import { Camera } from '../../gl/camera.ts';
import type { BackdropBlob, Engine, Lighting } from '../../gl/engine.ts';
import { segment, sphere, wing } from '../../gl/geometry.ts';
import { Mesh, type Program, type Target } from '../../gl/gpu.ts';
import { linear, type Vec3 } from '../../gl/math.ts';
import { Mosquito } from '../models/mosquito.ts';

export interface Studio {
  lighting: Lighting;
  top: Vec3;
  bottom: Vec3;
  blobs: BackdropBlob[];
  /** Colour the far distance fades into (display space), and how strongly. */
  fog?: [number, number, number, number];
  fogRange?: [number, number];
}

export function hex(h: string): Vec3 {
  const n = Number.parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const MOSQUITO_COLOURS = { dark: linear('#221d19'), joint: linear('#4a4038'), pale: linear('#c9c6b8') };

export interface MosquitoKit {
  sphere: Batch;
  segment: Batch;
  wing: Batch;
  mosquito: Mosquito;
}

export function mosquitoKit(gl: WebGL2RenderingContext, extra = 0): MosquitoKit {
  const s = new Batch(new Mesh(gl, sphere(20, 14), 120 + extra));
  const g = new Batch(new Mesh(gl, segment(8, 2, 0.8), 120 + extra));
  const w = new Batch(new Mesh(gl, wing(28, 4), 16));
  return { sphere: s, segment: g, wing: w, mosquito: new Mosquito({ sphere: s, segment: g, wing: w }, MOSQUITO_COLOURS) };
}

/** Clears the target and paints the backdrop. */
export function beginStudio(engine: Engine, target: Target, studio: Studio): void {
  const gl = engine.gl;
  target.bind();
  gl.clearColor(studio.bottom[0], studio.bottom[1], studio.bottom[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  engine.backdrop(studio.top, studio.bottom, studio.blobs);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
}

/** Prepares the lit program for a camera and a studio. */
export function useSolid(engine: Engine, camera: Camera, studio: Studio, time: number): Program {
  const p = engine.programs.solid.use();
  engine.defaults(p);
  engine.light(p, studio.lighting);
  p.set('u_viewProj', camera.viewProj).set('u_camPos', camera.eye).set('u_time', time);
  if (studio.fog) p.set('u_fog', studio.fog).set('u_fogRange', studio.fogRange ?? [1, 2]);
  return p;
}

/** Switches to blended drawing for thin, see-through things. */
export function transparent(gl: WebGL2RenderingContext, on: boolean): void {
  if (on) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
  } else {
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
  }
}

/** Bokeh that drifts sideways as the camera turns, nearer circles moving more. */
export function drift(blobs: BackdropBlob[], amount: number): BackdropBlob[] {
  return blobs.map((b, i) => ({ ...b, x: b.x - amount * (0.6 + (i % 3) * 0.35) }));
}
