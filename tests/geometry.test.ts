// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The generated meshes must be closed and face outwards, and the virus
// particle must have the architecture the page describes.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { icosphere, lathe, roundedBox, segment, sphere, torus, tube } from '../src/client/gl/geometry.ts';
import type { Geometry } from '../src/client/gl/gpu.ts';
import { v3, type Vec3 } from '../src/client/gl/math.ts';
import { SHELL_RADIUS, dimerGeometry, dimerPlacements, raftFaces } from '../src/client/stage/models/virion.ts';

/** Signed volume: positive when the triangles wind counter-clockwise seen from outside. */
function volume(g: Geometry): number {
  const p = g.positions;
  let v = 0;
  for (let t = 0; t < g.indices.length; t += 3) {
    const a = g.indices[t]! * 3;
    const b = g.indices[t + 1]! * 3;
    const c = g.indices[t + 2]! * 3;
    const A: Vec3 = [p[a]!, p[a + 1]!, p[a + 2]!];
    const B: Vec3 = [p[b]!, p[b + 1]!, p[b + 2]!];
    const C: Vec3 = [p[c]!, p[c + 1]!, p[c + 2]!];
    v += v3.dot(A, v3.cross(B, C)) / 6;
  }
  return v;
}

/** Share of vertices whose normal points away from the shape's centre. */
function outward(g: Geometry, centre: Vec3 = [0, 0, 0]): number {
  let ok = 0;
  const n = g.positions.length / 3;
  for (let i = 0; i < n; i++) {
    const p: Vec3 = [g.positions[i * 3]!, g.positions[i * 3 + 1]!, g.positions[i * 3 + 2]!];
    const nn: Vec3 = [g.normals[i * 3]!, g.normals[i * 3 + 1]!, g.normals[i * 3 + 2]!];
    if (v3.dot(v3.sub(p, centre), nn) >= -1e-6) ok++;
  }
  return ok / n;
}

test('closed meshes face outwards and enclose the right volume', () => {
  const s = sphere(32, 24);
  assert.ok(Math.abs(volume(s) - (4 / 3) * Math.PI) < 0.05, `sphere volume ${volume(s)}`);
  assert.equal(outward(s), 1);
  const ico = icosphere(3);
  assert.ok(Math.abs(volume(ico) - (4 / 3) * Math.PI) < 0.05);
  const box = roundedBox([2, 1, 3], 0.2, 3, 2);
  // A box with rounded edges is an inner box grown by a sphere of radius r.
  const [a, b, c, r] = [1.6, 0.6, 2.6, 0.2];
  const expected = a * b * c + 2 * r * (a * b + b * c + c * a) + Math.PI * r * r * (a + b + c) + (4 / 3) * Math.PI * r ** 3;
  assert.ok(Math.abs(volume(box) - expected) < 0.03, `box volume ${volume(box)} vs ${expected}`);
  assert.equal(outward(box), 1);
  const seg = segment(24, 3, 1);
  assert.ok(Math.abs(volume(seg) - Math.PI) < 0.05, `segment volume ${volume(seg)}`);
  const ring = torus(0.3, 48, 24);
  // Torus: 2 * pi^2 * R * r^2 with R = 0.7, r = 0.3.
  assert.ok(Math.abs(volume(ring) - 2 * Math.PI ** 2 * 0.7 * 0.09) < 0.03, `torus volume ${volume(ring)}`);
});

test('a tube follows its path without twisting into itself', () => {
  const points: Vec3[] = Array.from({ length: 40 }, (_, i) => [Math.cos(i / 6), i * 0.05, Math.sin(i / 6)]);
  const g = tube(points, 0.05, 8, true);
  assert.ok(volume(g) > 0);
  assert.ok(g.positions.every(Number.isFinite));
});

test('a lathe profile with a repeated point makes a sharp, outward edge', () => {
  const cup = lathe([[0, 0], [1, 0], [1, 0], [1, 1], [1, 1], [0, 1]], 32);
  assert.ok(volume(cup) > 0);
});

test('the shell has 30 rafts on the two-fold axes, in a consistent herringbone', () => {
  const faces = raftFaces();
  assert.equal(faces.length, 30);
  for (const f of faces) {
    assert.ok(Math.abs(v3.length(f.n) - 1) < 1e-9);
    // Dimers lie flat on the face, along one pair of rhombus edges.
    assert.ok(Math.abs(v3.dot(f.along, f.n)) < 1e-9);
    assert.ok(Math.abs(v3.dot(f.step, f.n)) < 1e-9);
    // The rhombus of the triacontahedron has an acute angle of arctan(2), about 63.4 degrees.
    const angle = (Math.acos(v3.dot(f.along, f.step)) * 180) / Math.PI;
    assert.ok(Math.abs(angle - 63.435) < 0.01, `angle ${angle}`);
  }
  // Two-fold axes come in opposite pairs.
  for (const f of faces) assert.ok(faces.some((g) => v3.dot(f.n, g.n) < -0.9999));
});

test('180 copies of E: 90 dimers, three to a raft, all at the shell radius', () => {
  const placed = dimerPlacements();
  assert.equal(placed.length, 90);
  const perRaft = new Map<number, number>();
  for (const d of placed) {
    perRaft.set(d.raft, (perRaft.get(d.raft) ?? 0) + 1);
    const r = v3.length(d.centre);
    assert.ok(r >= SHELL_RADIUS - 1e-9 && r < SHELL_RADIUS * 1.06, `radius ${r}`);
  }
  assert.equal(perRaft.size, 30);
  for (const n of perRaft.values()) assert.equal(n, 3);
  // Neighbouring dimers in a raft sit side by side, not overlapping.
  const raft0 = placed.filter((d) => d.raft === 0).sort((a, b) => a.slot - b.slot);
  const gap = v3.length(v3.sub(raft0[1]!.centre, raft0[0]!.centre));
  assert.ok(gap > 0.19, `gap ${gap}`);
});

test('the dimer mesh is closed and a two-fold symmetric shape', () => {
  const g = dimerGeometry('high');
  assert.ok(volume(g) > 0);
  // Turning it half a circle about y maps the shape onto itself: compare extents.
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < g.positions.length; i += 3) {
    minX = Math.min(minX, g.positions[i]!);
    maxX = Math.max(maxX, g.positions[i]!);
  }
  assert.ok(Math.abs(minX + maxX) < 1e-6);
});
