// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A perspective camera with lens shift (so a subject can sit off-centre
// without turning the camera), and the shot interpolation used to fly
// between framings: target and field of view blend linearly, distance blends
// in log space, and the viewing direction turns along a great circle.

import { invert, lookAt, mat4, multiply, perspective, slerp, v3, type Mat4, type Vec3 } from './math.ts';

export class Camera {
  eye: Vec3 = [0, 0, 5];
  target: Vec3 = [0, 0, 0];
  up: Vec3 = [0, 1, 0];
  fov = 0.6;
  near = 0.1;
  far = 100;
  aspect = 1;
  shift: [number, number] = [0, 0];
  readonly view: Mat4 = mat4();
  readonly proj: Mat4 = mat4();
  readonly viewProj: Mat4 = mat4();
  readonly invViewProj: Mat4 = mat4();

  update(): this {
    lookAt(this.view, this.eye, this.target, this.up);
    perspective(this.proj, this.fov, this.aspect, this.near, this.far);
    this.proj[8] = -this.shift[0];
    this.proj[9] = -this.shift[1];
    multiply(this.viewProj, this.proj, this.view);
    invert(this.invViewProj, this.viewProj);
    return this;
  }

  /** Sets near and far from the distance to the subject, keeping depth precision at any scale. */
  fitDepth(range = 400): this {
    const d = v3.length(v3.sub(this.eye, this.target));
    this.near = Math.max(d / range, 1e-4);
    this.far = d * range * 0.25 + d * 4;
    return this;
  }

  /**
   * This camera looking at the world reflected in a horizontal mirror at
   * height h, for reflections in water. Pixels line up with this camera's
   * screen, so the water can sample the result at its own screen position.
   * The reflection flips triangle winding; draw with gl.frontFace(gl.CW).
   */
  mirror(h: number, out: Camera): Camera {
    const r = mat4();
    r[5] = -1;
    r[13] = 2 * h;
    out.eye = [this.eye[0], 2 * h - this.eye[1], this.eye[2]];
    out.target = [this.target[0], 2 * h - this.target[1], this.target[2]];
    out.fov = this.fov;
    out.near = this.near;
    out.far = this.far;
    out.aspect = this.aspect;
    out.shift = [this.shift[0], this.shift[1]];
    multiply(out.view, this.view, r);
    out.proj.set(this.proj);
    multiply(out.viewProj, this.proj, out.view);
    invert(out.invViewProj, out.viewProj);
    return out;
  }
}

/** A framing: where to look, from which direction and how far. */
export interface Shot {
  target: Vec3;
  /** Unit vector from the target towards the camera. */
  dir: Vec3;
  distance: number;
  fov: number;
}

export function shot(eye: Vec3, target: Vec3, fov: number): Shot {
  const d = v3.sub(eye, target);
  const distance = v3.length(d);
  return { target, dir: v3.scale(d, 1 / distance), distance, fov };
}

export function blendShots(a: Shot, b: Shot, t: number, arc = 0): Shot {
  const target = v3.lerp(a.target, b.target, t);
  const distance = Math.exp(Math.log(a.distance) + (Math.log(b.distance) - Math.log(a.distance)) * t);
  let dir = slerp(a.dir, b.dir, t);
  if (arc) {
    // Lift the path in the middle so a long move clears whatever is between.
    dir = v3.normalize(v3.add(dir, [0, Math.sin(Math.PI * t) * arc, 0]));
  }
  return { target, dir, distance, fov: a.fov + (b.fov - a.fov) * t };
}

/** Rotates a shot around its target by yaw (around world up) and pitch. */
export function orbit(s: Shot, yaw: number, pitch: number): Shot {
  if (!yaw && !pitch) return s;
  let dir = v3.rotate(s.dir, [0, 1, 0], yaw);
  const side = v3.normalize(v3.cross([0, 1, 0], dir));
  const limited = Math.max(-1.2, Math.min(1.2, pitch));
  dir = v3.rotate(dir, side, -limited);
  if (Math.abs(dir[1]) > 0.97) dir = v3.normalize([dir[0], Math.sign(dir[1]) * 0.97, dir[2]]);
  return { ...s, dir };
}

/**
 * Places the camera for a shot. On narrow screens the camera backs off until
 * a sphere of `radius` around the target fits across.
 */
export function applyShot(cam: Camera, s: Shot, radius = 0, keepHeight = false): void {
  let distance = s.distance;
  if (radius > 0) {
    // Fit across the width only: wide screens keep the designed framing,
    // narrow ones back off until the subject fits from side to side.
    const half = Math.atan(Math.tan(s.fov / 2) * cam.aspect);
    distance = Math.max(distance, radius / Math.tan(half));
  }
  cam.target = s.target;
  cam.eye = v3.add(s.target, v3.scale(s.dir, distance));
  if (keepHeight) {
    // Back off horizontally only, so a camera framed at the waterline stays there.
    cam.eye[1] = s.target[1] + s.dir[1] * s.distance;
  }
  cam.fov = s.fov;
  cam.up = [0, 1, 0];
}
