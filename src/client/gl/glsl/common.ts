// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// GLSL shared by several shaders: hashing, noise, cell patterns, the bump
// mapping helper and the tone curve.

export const COMMON = /* glsl */ `
const float PI = 3.14159265;

// Integer hash (constants from Chris Wellons' hash prospector, public domain).
uint mixbits(uint x) {
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
uvec2 lattice(vec2 p) { return uvec2(ivec2(floor(p)) + 1048576); }
uvec3 lattice(vec3 p) { return uvec3(ivec3(floor(p)) + 1048576); }
float hash(vec2 p) {
  uvec2 q = lattice(p);
  return float(mixbits(q.x ^ mixbits(q.y + 0x9e3779b9u)) >> 8u) / 16777216.0;
}
float hash(vec3 p) {
  uvec3 q = lattice(p);
  return float(mixbits(q.x ^ mixbits(q.y ^ mixbits(q.z + 0x85ebca6bu))) >> 8u) / 16777216.0;
}
vec2 hash2(vec2 p) {
  uvec2 q = lattice(p);
  uint h = mixbits(q.x ^ mixbits(q.y + 0x27d4eb2fu));
  return vec2(float(h & 0xffffu), float(h >> 16u)) / 65535.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash(i), hash(i + vec3(1, 0, 0)), u.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

// Distances to the nearest and second nearest of a field of moving points,
// plus the offset to the nearest one.
vec4 cells(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  vec2 nearest = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        nearest = r;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return vec4(sqrt(d1), sqrt(d2), nearest);
}

// Light focused by a rippling water surface: bright lines where cells meet.
float caustic(vec2 p, float t) {
  vec4 a = cells(p, t);
  vec4 b = cells(p * 1.63 + vec2(3.1, 7.7), t * 1.27 + 2.0);
  float la = 1.0 - smoothstep(0.0, 0.2, a.y - a.x);
  float lb = 1.0 - smoothstep(0.0, 0.16, b.y - b.x);
  return la * 0.7 + lb * 0.5;
}

// Bump mapping without tangents: perturbs N by the screen-space slope of a
// height value h (after Mikkelsen, 2010).
vec3 bump(vec3 P, vec3 N, float h, float strength) {
  vec3 dpdx = dFdx(P);
  vec3 dpdy = dFdy(P);
  float dhdx = dFdx(h) * strength;
  float dhdy = dFdy(h) * strength;
  vec3 r1 = cross(dpdy, N);
  vec3 r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * N - grad);
}

// A filmic tone curve (Narkowicz's fit of the ACES curve) and sRGB encoding.
vec3 tonemap(vec3 c) {
  c = max(c, 0.0);
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}
`;
