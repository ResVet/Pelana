// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The small amount of linear algebra the renderer needs. Matrices are
// column-major Float32Arrays, as WebGL expects.

export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

export const v3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  normalize: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  /** Rotates v around the unit axis by angle (Rodrigues). */
  rotate: (v: Vec3, axis: Vec3, angle: number): Vec3 => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const d = v3.dot(axis, v) * (1 - c);
    const k = v3.cross(axis, v);
    return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
  },
};

export function mat4(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4]!, b1 = b[c * 4 + 1]!, b2 = b[c * 4 + 2]!, b3 = b[c * 4 + 3]!;
    out[c * 4] = a[0]! * b0 + a[4]! * b1 + a[8]! * b2 + a[12]! * b3;
    out[c * 4 + 1] = a[1]! * b0 + a[5]! * b1 + a[9]! * b2 + a[13]! * b3;
    out[c * 4 + 2] = a[2]! * b0 + a[6]! * b1 + a[10]! * b2 + a[14]! * b3;
    out[c * 4 + 3] = a[3]! * b0 + a[7]! * b1 + a[11]! * b2 + a[15]! * b3;
  }
  return out;
}

export function perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function lookAt(out: Mat4, eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const z = v3.normalize(v3.sub(eye, target));
  let x = v3.cross(up, z);
  if (v3.length(x) < 1e-6) x = v3.cross([0, 0, 1], z);
  x = v3.normalize(x);
  const y = v3.cross(z, x);
  out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
  out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
  out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
  out[12] = -v3.dot(x, eye);
  out[13] = -v3.dot(y, eye);
  out[14] = -v3.dot(z, eye);
  out[15] = 1;
  return out;
}

export function invert(out: Mat4, m: Mat4): Mat4 | null {
  const a00 = m[0]!, a01 = m[1]!, a02 = m[2]!, a03 = m[3]!;
  const a10 = m[4]!, a11 = m[5]!, a12 = m[6]!, a13 = m[7]!;
  const a20 = m[8]!, a21 = m[9]!, a22 = m[10]!, a23 = m[11]!;
  const a30 = m[12]!, a31 = m[13]!, a32 = m[14]!, a33 = m[15]!;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}

export function ortho(out: Mat4, left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
  out.fill(0);
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = -2 / (far - near);
  out[12] = -(right + left) / (right - left);
  out[13] = -(top + bottom) / (top - bottom);
  out[14] = -(far + near) / (far - near);
  out[15] = 1;
  return out;
}

/** Model matrix from a position, three orthonormal axes and a scale per axis. */
export function fromAxes(out: Mat4, position: Vec3, x: Vec3, y: Vec3, z: Vec3, sx: number, sy: number, sz: number): Mat4 {
  out[0] = x[0] * sx; out[1] = x[1] * sx; out[2] = x[2] * sx; out[3] = 0;
  out[4] = y[0] * sy; out[5] = y[1] * sy; out[6] = y[2] * sy; out[7] = 0;
  out[8] = z[0] * sz; out[9] = z[1] * sz; out[10] = z[2] * sz; out[11] = 0;
  out[12] = position[0]; out[13] = position[1]; out[14] = position[2]; out[15] = 1;
  return out;
}

/** Two unit vectors perpendicular to `axis` and to each other, choosing the first close to `hint`. */
export function perpendiculars(axis: Vec3, hint: Vec3 = [0, 1, 0]): [Vec3, Vec3] {
  let h = hint;
  if (Math.abs(v3.dot(axis, h)) > 0.98) h = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const a = v3.normalize(v3.sub(h, v3.scale(axis, v3.dot(axis, h))));
  const b = v3.cross(axis, a);
  return [a, b];
}

/**
 * Matrix for a unit segment mesh (y from 0 to 1, radius 1) stretched from
 * `a` to `b` with the given radii. `hint` fixes which way local x faces.
 */
export function segmentMatrix(out: Mat4, a: Vec3, b: Vec3, rx: number, rz = rx, hint: Vec3 = [0, 1, 0]): Mat4 {
  const d = v3.sub(b, a);
  const len = v3.length(d) || 1e-6;
  const y = v3.scale(d, 1 / len);
  const [x] = perpendiculars(y, hint);
  // x, y, z right-handed, so mirrored copies never turn inside out.
  const z = v3.cross(x, y);
  return fromAxes(out, a, x, y, z, rx, len, rz);
}

/** Spherical interpolation between two unit vectors. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.min(1, Math.max(-1, v3.dot(a, b)));
  const angle = Math.acos(d);
  if (angle < 1e-4) return v3.normalize(v3.lerp(a, b, t));
  const s = Math.sin(angle);
  return v3.add(v3.scale(a, Math.sin((1 - t) * angle) / s), v3.scale(b, Math.sin(t * angle) / s));
}

/** sRGB hex colour to linear RGB, the space the shaders light in. */
export function linear(hex: string): Vec3 {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

/** Projects a world point to normalised device coordinates. Returns null behind the camera. */
export function project(viewProj: Mat4, p: Vec3): [number, number, number] | null {
  const x = viewProj[0]! * p[0] + viewProj[4]! * p[1] + viewProj[8]! * p[2] + viewProj[12]!;
  const y = viewProj[1]! * p[0] + viewProj[5]! * p[1] + viewProj[9]! * p[2] + viewProj[13]!;
  const z = viewProj[2]! * p[0] + viewProj[6]! * p[1] + viewProj[10]! * p[2] + viewProj[14]!;
  const w = viewProj[3]! * p[0] + viewProj[7]! * p[1] + viewProj[11]! * p[2] + viewProj[15]!;
  if (w <= 1e-6) return null;
  return [x / w, y / w, z / w];
}

/** Deterministic pseudo-random numbers (mulberry32), so generated shapes are the same on every load. */
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
