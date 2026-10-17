// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The dengue virus particle, built from its published architecture: 180
// copies of the envelope (E) protein lie flat on the surface as 90 dimers;
// three parallel dimers make a raft, and 30 rafts tile the particle, one on
// each face of a rhombic triacontahedron, centred on the 30 two-fold axes of
// icosahedral symmetry (Kuhn et al., Cell 2002; Zhang et al., EMBO J 2003).
// Under the shell is the lipid membrane, and inside that the capsid core
// with the RNA genome.
//
// Units: the particle's outer radius is 1 (about 25 nm).

import type { Geometry } from '../../gl/gpu.ts';
import { computeNormals, icosphere, roundedBox, tube } from '../../gl/geometry.ts';
import { fromAxes, mat4, random, v3, type Mat4, type Vec3 } from '../../gl/math.ts';

/** Distance from the centre to the plane of each raft. */
export const SHELL_RADIUS = 0.9;
/** Length of one E dimer (about 15 nm). */
const DIMER_LENGTH = 0.6;
/** Distance between neighbouring dimers in a raft, measured across them. */
const DIMER_PITCH = 0.2;

/**
 * One E dimer in its own frame: x runs along the dimer, z across it, y away
 * from the particle. Monomer A lies at z > 0 with domain III at the -x end;
 * monomer B is the same shape turned half a circle about y. The shader
 * colours the domains from these coordinates.
 */
export function dimerGeometry(detail: 'high' | 'low'): Geometry {
  if (detail === 'low') return roundedBox([1, 0.14, 0.33], 0.05, 1, 1);
  const geo = roundedBox([1, 0.12, 0.33], 0.055, 2, [20, 1, 5]);
  const p = geo.positions;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!;
    const y = p[i + 1]!;
    const z = p[i + 2]!;
    const side = z >= 0 ? 1 : -1;
    const u = x * side;
    const w = Math.min(1, Math.abs(z) / 0.165);
    const g = (c: number, s: number) => Math.exp(-((u - c) * (u - c)) / (2 * s * s));
    // Domain III and domain I stand up as rounded lumps; domain II is a long, lower finger.
    let lift = 0.05 * g(-0.4, 0.07) + 0.06 * g(-0.19, 0.09) + 0.022 * g(0.16, 0.18) + 0.012 * g(0.45, 0.04);
    lift *= 1 - 0.55 * w * w;
    const groove = 0.018 * Math.exp(-(z * z) / 0.0008);
    if (y > 0) p[i + 1] = y + lift - groove;
    else p[i + 1] = y - lift * 0.3;
    // Round the outline a little at each domain boundary.
    const pinch = 0.012 * (g(-0.3, 0.025) + g(-0.07, 0.025));
    p[i + 2] = z - Math.sign(z) * pinch * w;
  }
  computeNormals(geo);
  return geo;
}

export interface RaftFace {
  /** Unit two-fold axis through the face centre. */
  n: Vec3;
  /** Direction the dimers run in (parallel to one pair of rhombus edges). */
  along: Vec3;
  /** Direction from one dimer to the next (the other pair of edges). */
  step: Vec3;
}

/** The 30 faces of the rhombic triacontahedron, with a consistent handedness. */
export function raftFaces(): RaftFace[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => v3.normalize(p as Vec3));
  const faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const centres = faces.map(([a, b, c]) => v3.normalize(v3.add(v3.add(verts[a]!, verts[b]!), verts[c]!)));
  const edges = new Map<string, number[]>();
  faces.forEach((f, fi) => {
    for (let k = 0; k < 3; k++) {
      const a = f[k]!;
      const b = f[(k + 1) % 3]!;
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edges.set(key, [...(edges.get(key) ?? []), fi]);
    }
  });
  const out: RaftFace[] = [];
  for (const [key, adjacent] of edges) {
    const [i, j] = key.split('_').map(Number) as [number, number];
    const n = v3.normalize(v3.add(verts[i]!, verts[j]!));
    // Corners of the rhombus on the plane at distance 1 along n.
    const p5a = v3.scale(verts[i]!, 1 / v3.dot(verts[i]!, n));
    const p5b = v3.scale(verts[j]!, 1 / v3.dot(verts[j]!, n));
    let p3a = v3.scale(centres[adjacent[0]!]!, 1 / v3.dot(centres[adjacent[0]!]!, n));
    let p3b = v3.scale(centres[adjacent[1]!]!, 1 / v3.dot(centres[adjacent[1]!]!, n));
    // Choose the three-fold corner counter-clockwise from the long diagonal,
    // seen from outside. The same rule on every face keeps one handedness.
    if (v3.dot(v3.cross(v3.sub(p5b, p5a), v3.sub(p3a, p5a)), n) < 0) [p3a, p3b] = [p3b, p3a];
    out.push({ n, along: v3.normalize(v3.sub(p3a, p5a)), step: v3.normalize(v3.sub(p3b, p5a)) });
  }
  return out;
}

export interface DimerPlacement {
  /** Matrix from dimer space to particle space. */
  matrix: Mat4;
  /** Which raft (0..29) and which position in it (-1, 0, 1). */
  raft: number;
  slot: number;
  centre: Vec3;
  normal: Vec3;
}

export function dimerPlacements(): DimerPlacement[] {
  const faces = raftFaces();
  const out: DimerPlacement[] = [];
  const spacing = DIMER_PITCH / Math.sqrt(1 - Math.pow(v3.dot(faces[0]!.along, faces[0]!.step), 2));
  faces.forEach((f, raft) => {
    for (let slot = -1; slot <= 1; slot++) {
      const centre = v3.add(v3.scale(f.n, SHELL_RADIUS), v3.scale(f.step, slot * spacing));
      const x = f.along;
      const y = f.n;
      const z = v3.cross(x, y);
      const matrix = fromAxes(mat4(), centre, x, y, z, DIMER_LENGTH, DIMER_LENGTH, DIMER_LENGTH);
      out.push({ matrix, raft, slot, centre, normal: f.n });
    }
  });
  return out;
}

/** The lipid membrane under the protein shell. */
export function membraneGeometry(): Geometry {
  return icosphere(4);
}

/** The capsid core: a lumpy shell of capsid protein around the genome. */
export function coreGeometry(): Geometry {
  const rand = random(7);
  const bumps: Vec3[] = Array.from({ length: 90 }, () => v3.normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]));
  return icosphere(3, (p) => {
    let h = 0;
    for (const b of bumps) h += Math.max(0, v3.dot(p, b) - 0.93) * 0.9;
    return h;
  });
}

/** The RNA genome: one long strand folded inside the core. */
export function rnaGeometry(): Geometry {
  const rand = random(19);
  const points: Vec3[] = [];
  let p: Vec3 = [0.1, 0, 0];
  let d: Vec3 = v3.normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]);
  for (let i = 0; i < 520; i++) {
    points.push(p);
    const turn: Vec3 = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
    d = v3.normalize(v3.add(d, v3.scale(turn, 0.7)));
    let next = v3.add(p, v3.scale(d, 0.028));
    const r = v3.length(next);
    if (r > 0.4) {
      // Turn back inwards at the edge of the core.
      d = v3.normalize(v3.sub(d, v3.scale(next, 1.6 / r)));
      next = v3.add(p, v3.scale(d, 0.028));
    }
    p = next;
  }
  return tube(points, 0.011, 6);
}

/**
 * The whole shell as one mesh for drawing many particles at once. Each
 * vertex keeps its position within its own dimer in aux (with aux.w = 1),
 * so the shader can still colour the protein domains.
 */
export function lodVirionGeometry(): Geometry {
  const dimer = dimerGeometry('low');
  const placements = dimerPlacements();
  const count = dimer.positions.length / 3;
  const total = count * placements.length;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const aux = new Float32Array(total * 4);
  const indices = new Uint32Array(dimer.indices.length * placements.length);
  placements.forEach((pl, k) => {
    const m = pl.matrix;
    for (let i = 0; i < count; i++) {
      const x = dimer.positions[i * 3]!, y = dimer.positions[i * 3 + 1]!, z = dimer.positions[i * 3 + 2]!;
      const nx = dimer.normals[i * 3]!, ny = dimer.normals[i * 3 + 1]!, nz = dimer.normals[i * 3 + 2]!;
      const o = (k * count + i) * 3;
      positions[o] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
      positions[o + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
      positions[o + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
      const qx = m[0]! * nx + m[4]! * ny + m[8]! * nz;
      const qy = m[1]! * nx + m[5]! * ny + m[9]! * nz;
      const qz = m[2]! * nx + m[6]! * ny + m[10]! * nz;
      const l = Math.hypot(qx, qy, qz) || 1;
      normals[o] = qx / l;
      normals[o + 1] = qy / l;
      normals[o + 2] = qz / l;
      aux.set([x, y, z, 1], (k * count + i) * 4);
    }
    for (let j = 0; j < dimer.indices.length; j++) indices[k * dimer.indices.length + j] = dimer.indices[j]! + k * count;
  });
  return { positions, normals, aux, indices };
}
