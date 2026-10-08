// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Procedural meshes. Every shape on the site is built from these few
// generators: spheres, tubes, lathes, rounded boxes, planes and a wing.
// Each vertex carries four "aux" values the shaders use for patterns.

import type { Geometry } from './gpu.ts';
import { v3, type Mat4, type Vec3 } from './math.ts';

type Aux = [number, number, number, number];

class Builder {
  private p: number[] = [];
  private n: number[] = [];
  private a: number[] = [];
  private idx: number[] = [];

  get count(): number {
    return this.p.length / 3;
  }

  position(i: number): Vec3 {
    return [this.p[i * 3]!, this.p[i * 3 + 1]!, this.p[i * 3 + 2]!];
  }

  vertex(pos: Vec3, nor: Vec3, aux: Aux = [0, 0, 0, 0]): number {
    this.p.push(pos[0], pos[1], pos[2]);
    this.n.push(nor[0], nor[1], nor[2]);
    this.a.push(aux[0], aux[1], aux[2], aux[3]);
    return this.count - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  /** Quad a-b-c-d, counter-clockwise when seen from the front. */
  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  build(): Geometry {
    const count = this.count;
    return {
      positions: new Float32Array(this.p),
      normals: new Float32Array(this.n),
      aux: new Float32Array(this.a),
      indices: count > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
    };
  }
}

/** UV sphere of radius 1. aux = (u around, v from bottom to top). */
export function sphere(w = 24, h = 16): Geometry {
  const b = new Builder();
  for (let j = 0; j <= h; j++) {
    const v = j / h;
    const phi = v * Math.PI;
    for (let i = 0; i <= w; i++) {
      const u = i / w;
      const theta = u * Math.PI * 2;
      const p: Vec3 = [Math.sin(phi) * Math.cos(theta), -Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
      b.vertex(p, p, [u, v, 0, 0]);
    }
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = j * (w + 1) + i;
      const c = a + w + 1;
      // Up the sphere then around it, which faces outwards.
      b.quad(a, c, c + 1, a + 1);
    }
  }
  return b.build();
}

/** Subdivided icosahedron of radius 1, optionally displaced along its normals. */
export function icosphere(detail: number, displace?: (p: Vec3) => number): Geometry {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => v3.normalize(p as Vec3));
  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let d = 0; d < detail; d++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = cache.get(key);
      if (i === undefined) {
        i = verts.length;
        verts.push(v3.normalize(v3.lerp(verts[a]!, verts[b]!, 0.5)));
        cache.set(key, i);
      }
      return i;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  if (displace) verts = verts.map((p) => v3.scale(p, 1 + displace(p)));
  const geo: Geometry = {
    positions: new Float32Array(verts.flat()),
    normals: new Float32Array(verts.flat()),
    aux: new Float32Array(verts.length * 4),
    indices: verts.length > 65535 ? new Uint32Array(faces.flat()) : new Uint16Array(faces.flat()),
  };
  if (displace) computeNormals(geo);
  return geo;
}

/**
 * A tube through a list of points, with frames carried along the curve by
 * parallel transport so it never twists. aux = (t along, angle, arc length, 0).
 */
export function tube(points: Vec3[], radius: number | number[], radial = 8, caps = false): Geometry {
  const b = new Builder();
  const n = points.length;
  const r = (i: number) => (typeof radius === 'number' ? radius : (radius[i] ?? radius[radius.length - 1] ?? 1));
  const tangents: Vec3[] = points.map((_, i) => {
    const prev = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(n - 1, i + 1)]!;
    return v3.normalize(v3.sub(next, prev));
  });
  const t0 = tangents[0]!;
  const helper: Vec3 = Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let normal = v3.normalize(v3.cross(t0, helper));
  const lengths = [0];
  for (let i = 1; i < n; i++) lengths.push(lengths[i - 1]! + v3.length(v3.sub(points[i]!, points[i - 1]!)));
  const total = lengths[n - 1] || 1;

  for (let i = 0; i < n; i++) {
    const t = tangents[i]!;
    if (i > 0) {
      const prev = tangents[i - 1]!;
      const axis = v3.cross(prev, t);
      const s = v3.length(axis);
      if (s > 1e-6) normal = v3.rotate(normal, v3.scale(axis, 1 / s), Math.atan2(s, v3.dot(prev, t)));
      normal = v3.normalize(v3.sub(normal, v3.scale(t, v3.dot(normal, t))));
    }
    const binormal = v3.cross(t, normal);
    // The surface leans when the radius changes along the tube.
    const dr = (r(Math.min(n - 1, i + 1)) - r(Math.max(0, i - 1))) / Math.max(1e-6, (lengths[Math.min(n - 1, i + 1)]! - lengths[Math.max(0, i - 1)]!));
    for (let j = 0; j <= radial; j++) {
      const theta = (j / radial) * Math.PI * 2;
      const dir = v3.add(v3.scale(normal, Math.cos(theta)), v3.scale(binormal, Math.sin(theta)));
      const pos = v3.add(points[i]!, v3.scale(dir, r(i)));
      b.vertex(pos, v3.normalize(v3.sub(dir, v3.scale(t, dr))), [lengths[i]! / total, j / radial, lengths[i]!, 0]);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const c = a + radial + 1;
      b.quad(a, a + 1, c + 1, c);
    }
  }
  if (caps) {
    for (const end of [0, n - 1]) {
      const t = v3.scale(tangents[end]!, end === 0 ? -1 : 1);
      const centre = b.vertex(points[end]!, t, [end === 0 ? 0 : 1, 0, lengths[end]!, 1]);
      const ring: number[] = [];
      const base = end * (radial + 1);
      for (let j = 0; j <= radial; j++) {
        const pIndex = base + j;
        ring.push(b.vertex(b.position(pIndex), t, [end === 0 ? 0 : 1, j / radial, lengths[end]!, 1]));
      }
      for (let j = 0; j < radial; j++) {
        if (end === 0) b.tri(centre, ring[j + 1]!, ring[j]!);
        else b.tri(centre, ring[j]!, ring[j + 1]!);
      }
    }
  }
  return b.build();
}

/** A tapered cylinder from y = 0 (radius 1) to y = 1 (radius `taper`), closed at both ends. aux.x = height. */
export function segment(radial = 10, rings = 4, taper = 1): Geometry {
  const points: Vec3[] = [];
  const radii: number[] = [];
  for (let i = 0; i <= rings; i++) {
    points.push([0, i / rings, 0]);
    radii.push(1 + (taper - 1) * (i / rings));
  }
  return tube(points, radii, radial, true);
}

/**
 * Revolves a profile of [radius, height] pairs around the y axis. Repeat a
 * point to make a sharp edge there. aux = (t along profile, angle).
 */
export function lathe(profile: [number, number][], segments = 32): Geometry {
  const b = new Builder();
  const m = profile.length;
  const segNormal = (k: number): [number, number] | null => {
    const p = profile[k]!;
    const q = profile[k + 1]!;
    const dr = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dr, dy);
    return len < 1e-9 ? null : [dy / len, -dr / len];
  };
  for (let k = 0; k < m; k++) {
    const before = k > 0 ? segNormal(k - 1) : null;
    const after = k < m - 1 ? segNormal(k) : null;
    // A zero-length segment on one side means this point is one half of a sharp edge.
    const isDupPrev = k > 0 && profile[k - 1]![0] === profile[k]![0] && profile[k - 1]![1] === profile[k]![1];
    const isDupNext = k < m - 1 && profile[k + 1]![0] === profile[k]![0] && profile[k + 1]![1] === profile[k]![1];
    let nr = 0;
    let ny = 0;
    if (before && !isDupPrev && !(isDupNext && after === null)) {
      nr += before[0];
      ny += before[1];
    }
    if (after && !isDupNext) {
      nr += after[0];
      ny += after[1];
    }
    if (isDupNext && before) {
      nr = before[0];
      ny = before[1];
    }
    if (isDupPrev && after) {
      nr = after[0];
      ny = after[1];
    }
    const len = Math.hypot(nr, ny) || 1;
    nr /= len;
    ny /= len;
    const [r, y] = profile[k]!;
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      b.vertex([r * c, y, r * s], [nr * c, ny, nr * s], [k / (m - 1), j / segments, r, y]);
    }
  }
  for (let k = 0; k < m - 1; k++) {
    for (let j = 0; j < segments; j++) {
      const a = k * (segments + 1) + j;
      const bb = a + segments + 1;
      b.quad(a, bb, bb + 1, a + 1);
    }
  }
  return b.build();
}

/**
 * A box with rounded edges, centred on the origin. `grid` adds subdivisions
 * across the flat part of each face, for meshes that are displaced later.
 * aux = (u, v, face index, 0).
 */
export function roundedBox(size: Vec3, radius: number, segments = 3, grid: number | Vec3 = 1): Geometry {
  const b = new Builder();
  const h: Vec3 = [size[0] / 2, size[1] / 2, size[2] / 2];
  const r = Math.max(0, Math.min(radius, h[0], h[1], h[2]));
  const inner: Vec3 = [h[0] - r, h[1] - r, h[2] - r];
  const cuts: Vec3 = typeof grid === 'number' ? [grid, grid, grid] : grid;
  const ticks = (axis: number): number[] => {
    const half = h[axis]!;
    const inn = inner[axis]!;
    const n = Math.max(1, Math.round(cuts[axis]!));
    const out: number[] = [];
    const s = r > 0 ? segments : 0;
    for (let k = 0; k < s; k++) out.push(-half + (half - inn) * (k / s));
    for (let k = 0; k <= n; k++) out.push(-inn + 2 * inn * (k / n));
    for (let k = 1; k <= s; k++) out.push(inn + (half - inn) * (k / s));
    return out;
  };
  const faces: [number, number][] = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
  faces.forEach(([axis, sign], face) => {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const tu = ticks(u);
    const tv = ticks(v);
    const start = b.count;
    for (let j = 0; j < tv.length; j++) {
      for (let i = 0; i < tu.length; i++) {
        const p: Vec3 = [0, 0, 0];
        p[axis] = sign * h[axis]!;
        p[u] = tu[i]!;
        p[v] = tv[j]!;
        const c: Vec3 = [
          Math.max(-inner[0], Math.min(inner[0], p[0])),
          Math.max(-inner[1], Math.min(inner[1], p[1])),
          Math.max(-inner[2], Math.min(inner[2], p[2])),
        ];
        let d = v3.sub(p, c);
        const len = v3.length(d);
        if (len < 1e-9 || r === 0) {
          d = [0, 0, 0];
          d[axis] = sign;
        } else d = v3.scale(d, 1 / len);
        const pos = r === 0 ? p : v3.add(c, v3.scale(d, r));
        b.vertex(pos, d, [p[u]! / h[u]! / 2 + 0.5, p[v]! / h[v]! / 2 + 0.5, face, 0]);
      }
    }
    const cols = tu.length;
    for (let j = 0; j < tv.length - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = start + j * cols + i;
        if (sign > 0) b.quad(a, a + 1, a + cols + 1, a + cols);
        else b.quad(a, a + cols, a + cols + 1, a + 1);
      }
    }
  });
  return b.build();
}

/** A flat rectangle in the XZ plane facing +y, centred on the origin. aux = (u, v). */
export function plane(width: number, depth: number, sx = 1, sz = 1): Geometry {
  const b = new Builder();
  for (let j = 0; j <= sz; j++) {
    for (let i = 0; i <= sx; i++) {
      const u = i / sx;
      const v = j / sz;
      b.vertex([(u - 0.5) * width, 0, (v - 0.5) * depth], [0, 1, 0], [u, v, 0, 0]);
    }
  }
  for (let j = 0; j < sz; j++) {
    for (let i = 0; i < sx; i++) {
      const a = j * (sx + 1) + i;
      const bb = a + 1;
      const c = a + sx + 2;
      const d = a + sx + 1;
      b.tri(a, d, bb);
      b.tri(bb, d, c);
    }
  }
  return b.build();
}

/** A unit disc in the XZ plane facing +y. aux = (x, z, radius). */
export function disc(segments = 32, rings = 1): Geometry {
  const b = new Builder();
  const centre = b.vertex([0, 0, 0], [0, 1, 0], [0, 0, 0, 0]);
  const rows: number[][] = [];
  for (let k = 1; k <= rings; k++) {
    const r = k / rings;
    const row: number[] = [];
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      row.push(b.vertex([Math.cos(a) * r, 0, Math.sin(a) * r], [0, 1, 0], [Math.cos(a) * r, Math.sin(a) * r, r, 0]));
    }
    rows.push(row);
  }
  const first = rows[0]!;
  for (let j = 0; j < segments; j++) b.tri(centre, first[j + 1]!, first[j]!);
  for (let k = 1; k < rows.length; k++) {
    const inner = rows[k - 1]!;
    const outer = rows[k]!;
    for (let j = 0; j < segments; j++) b.quad(inner[j]!, inner[j + 1]!, outer[j + 1]!, outer[j]!);
  }
  return b.build();
}

/**
 * A mosquito wing in the XZ plane facing +y: the base at x = 0, the tip at
 * x = 1, the leading edge towards +z. aux = (x, z across from -1 to 1).
 */
export function wing(steps = 28, across = 4): Geometry {
  const b = new Builder();
  const lead = (x: number) => 0.13 * Math.pow(Math.sin(Math.PI * Math.min(1, x * 0.98 + 0.02)), 0.45) + 0.02 * x;
  const trail = (x: number) => -0.2 * Math.pow(Math.sin(Math.PI * Math.pow(x, 0.85)), 0.75) - 0.012;
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const top = lead(x);
    const bottom = trail(x);
    for (let k = 0; k <= across; k++) {
      const s = k / across;
      const z = bottom + (top - bottom) * s;
      b.vertex([x, 0, z], [0, 1, 0], [x, s * 2 - 1, 0, 0]);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < across; k++) {
      const a = i * (across + 1) + k;
      const c = a + across + 1;
      b.quad(a, a + 1, c + 1, c);
    }
  }
  return b.build();
}

/** Recomputes smooth vertex normals from the triangles. */
export function computeNormals(geo: Geometry): void {
  const p = geo.positions;
  const n = new Float32Array(p.length);
  const idx = geo.indices;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]! * 3;
    const b = idx[t + 1]! * 3;
    const c = idx[t + 2]! * 3;
    const ux = p[b]! - p[a]!, uy = p[b + 1]! - p[a + 1]!, uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!, vy = p[c + 1]! - p[a + 1]!, vz = p[c + 2]! - p[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) {
      n[o] = n[o]! + nx;
      n[o + 1] = n[o + 1]! + ny;
      n[o + 2] = n[o + 2]! + nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!) || 1;
    n[i] = n[i]! / l;
    n[i + 1] = n[i + 1]! / l;
    n[i + 2] = n[i + 2]! / l;
  }
  geo.normals.set(n);
}

/** Moves every vertex with a function of its position and normal, then recomputes normals. */
export function displace(geo: Geometry, fn: (p: Vec3, n: Vec3) => Vec3): Geometry {
  const p = geo.positions;
  const nn = geo.normals;
  for (let i = 0; i < p.length; i += 3) {
    const out = fn([p[i]!, p[i + 1]!, p[i + 2]!], [nn[i]!, nn[i + 1]!, nn[i + 2]!]);
    p[i] = out[0];
    p[i + 1] = out[1];
    p[i + 2] = out[2];
  }
  computeNormals(geo);
  return geo;
}

/** Joins several geometries into one, each optionally moved by a matrix and given aux.w. */
export function merge(parts: { geo: Geometry; matrix?: Mat4; tag?: number }[]): Geometry {
  let vertices = 0;
  let indices = 0;
  for (const { geo } of parts) {
    vertices += geo.positions.length / 3;
    indices += geo.indices.length;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const aux = new Float32Array(vertices * 4);
  const out = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  let vo = 0;
  let io = 0;
  for (const { geo, matrix, tag } of parts) {
    const count = geo.positions.length / 3;
    for (let i = 0; i < count; i++) {
      let x = geo.positions[i * 3]!, y = geo.positions[i * 3 + 1]!, z = geo.positions[i * 3 + 2]!;
      let nx = geo.normals[i * 3]!, ny = geo.normals[i * 3 + 1]!, nz = geo.normals[i * 3 + 2]!;
      if (matrix) {
        const m = matrix;
        const px = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
        const py = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
        const pz = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        x = px;
        y = py;
        z = pz;
        // Matrices passed here are rotations with uniform scale, so the normal transform is the same 3x3.
        const qx = m[0]! * nx + m[4]! * ny + m[8]! * nz;
        const qy = m[1]! * nx + m[5]! * ny + m[9]! * nz;
        const qz = m[2]! * nx + m[6]! * ny + m[10]! * nz;
        const l = Math.hypot(qx, qy, qz) || 1;
        nx = qx / l;
        ny = qy / l;
        nz = qz / l;
      }
      positions.set([x, y, z], (vo + i) * 3);
      normals.set([nx, ny, nz], (vo + i) * 3);
      aux.set(
        [geo.aux[i * 4]!, geo.aux[i * 4 + 1]!, geo.aux[i * 4 + 2]!, tag ?? geo.aux[i * 4 + 3]!],
        (vo + i) * 4,
      );
    }
    for (let k = 0; k < geo.indices.length; k++) out[io + k] = geo.indices[k]! + vo;
    vo += count;
    io += geo.indices.length;
  }
  return { positions, normals, aux, indices: out };
}

/** A single quad through four corners given counter-clockwise as seen from the front. */
export function quad(corners: [Vec3, Vec3, Vec3, Vec3]): Geometry {
  const b = new Builder();
  const n = v3.normalize(v3.cross(v3.sub(corners[1], corners[0]), v3.sub(corners[3], corners[0])));
  const uv: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const ids = corners.map((c, i) => b.vertex(c, n, [uv[i]![0], uv[i]![1], 0, 0]));
  b.quad(ids[0]!, ids[1]!, ids[2]!, ids[3]!);
  return b.build();
}

/** A ring (torus) around y: outer radius 1, tube radius `tube` (as a fraction of 1). */
export function torus(tubeRadius = 0.3, segments = 32, sides = 14): Geometry {
  const R = 1 - tubeRadius;
  const profile: [number, number][] = [];
  for (let i = 0; i <= sides; i++) {
    // Counter-clockwise in (r, y), so the lathe's normals point out of the tube.
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    profile.push([R + tubeRadius * Math.cos(a), tubeRadius * Math.sin(a)]);
  }
  return lathe(profile, segments);
}
