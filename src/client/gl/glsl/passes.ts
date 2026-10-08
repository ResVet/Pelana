// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Shaders for the passes that are not ordinary objects: the water surface
// in the tub, the waterline across the lens, soft backdrops, and the final
// composite that hands one scene over to the next a tile at a time.

import { COMMON } from './common.ts';
import { INSTANCE_VS } from './solid.ts';
import { WINDOW_LIGHT } from './window.ts';

/** A triangle that covers the screen, with no vertex buffer. */
export const FULLSCREEN_VS = /* glsl */ `
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const WATER_VS = /* glsl */ `
${INSTANCE_VS}
uniform mat4 u_viewProj;
out vec3 v_world;
void main() {
  mat4 m = mat4(i_m0, i_m1, i_m2, i_m3);
  vec4 w = m * vec4(a_position, 1.0);
  v_world = w.xyz;
  gl_Position = u_viewProj * w;
}
`;

const WAVES = /* glsl */ `
uniform vec4 u_drips[4];
uniform vec4 u_dimples[6];
uniform float u_calm;

float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += 0.30 * sin(dot(p, vec2(0.82, 0.57)) * 0.55 + t * 1.1);
  h += 0.22 * sin(dot(p, vec2(-0.45, 0.89)) * 0.8 + t * 1.45);
  h += 0.12 * sin(dot(p, vec2(0.96, -0.28)) * 1.6 + t * 2.2);
  h += 0.3 * (noise(p * 0.45 + vec2(t * 0.22, -t * 0.17)) - 0.5);
  h *= u_calm;
  for (int i = 0; i < 4; i++) {
    vec4 d = u_drips[i];
    float age = t - d.z;
    if (d.w <= 0.0 || age < 0.0 || age > 5.0) continue;
    float r = length(p - d.xy);
    float x = r - age * 8.0;
    float env = exp(-x * x / (0.8 + age * 3.0)) * exp(-age * 0.9) * d.w / (1.0 + r * 0.15);
    h += env * cos(x * 3.2);
  }
  // Feet standing on the surface press small dents into it.
  for (int i = 0; i < 6; i++) {
    vec4 d = u_dimples[i];
    if (d.w <= 0.0) continue;
    vec2 q = p - d.xy;
    h -= d.w * exp(-dot(q, q) / (d.z * d.z));
  }
  return h;
}
`;

export const WATER_FS = /* glsl */ `
${COMMON}
${WAVES}
in vec3 v_world;
uniform sampler2D u_scene;
uniform sampler2D u_reflection;
uniform float u_hasReflection;
uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform float u_time;
uniform vec4 u_water;
uniform vec3 u_waterTint;
uniform vec4 u_tub;
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform vec3 u_skyColor;
uniform vec3 u_groundColor;
uniform vec4 u_window;
uniform vec4 u_windowParams;
uniform float u_refract;
uniform float u_waveAmp;
uniform float u_waveStep;
uniform float u_exposure;
out vec4 o_color;

${WINDOW_LIGHT}

void main() {
  vec3 P = v_world;
  float e = u_waveStep;
  float h0 = waveHeight(P.xz, u_time);
  float hx = waveHeight(P.xz + vec2(e, 0.0), u_time);
  float hz = waveHeight(P.xz + vec2(0.0, e), u_time);
  vec3 N = normalize(vec3(-(hx - h0) / e * u_waveAmp, 1.0, -(hz - h0) / e * u_waveAmp));

  // Water climbs a little up each wall it touches: the meniscus.
  float dx0 = P.x - u_tub.x;
  float dx1 = u_tub.z - P.x;
  float dz0 = P.z - u_tub.y;
  float dz1 = u_tub.w - P.z;
  float dmin = min(min(dx0, dx1), min(dz0, dz1));
  vec3 wall = dmin == dx0 ? vec3(-1, 0, 0) : dmin == dx1 ? vec3(1, 0, 0) : dmin == dz0 ? vec3(0, 0, -1) : vec3(0, 0, 1);
  float men = exp(-max(dmin, 0.0) / 0.12);
  N = normalize(N + wall * men * 2.5);

  vec3 V = normalize(u_camPos - P);
  bool below = u_camPos.y < u_water.x;
  if (below) N = -N;
  float NoV = max(dot(N, V), 0.0);
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 offs = N.xz * u_refract * (1.0 - men);
  vec3 refr = texture(u_scene, clamp(uv + offs, 0.001, 0.999)).rgb;
  vec3 col;
  if (!below) {
    float F = 0.02 + 0.98 * pow(1.0 - NoV, 5.0);
    vec3 R = reflect(-V, N);
    vec3 env = tonemap(mix(u_groundColor, u_skyColor, smoothstep(-0.2, 0.7, R.y)) * u_exposure);
    vec3 refl = u_hasReflection > 0.5 ? texture(u_reflection, clamp(uv + offs * 0.7, 0.001, 0.999)).rgb : env;
    col = mix(refr, refl, clamp(F + men * 0.35, 0.0, 1.0));
    vec3 H = normalize(u_sunDir + V);
    float glint = pow(max(dot(N, H), 0.0), 900.0) * 60.0 * windowLight(P);
    col += tonemap(u_sunColor * glint * u_exposure * 0.08);
  } else {
    // From under the water the surface is a mirror past the critical angle.
    float tir = smoothstep(0.62, 0.72, 1.0 - NoV);
    vec3 mirror = tonemap(u_waterTint * 1.6 * u_exposure);
    col = mix(refr, mirror, tir);
  }
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  o_color = vec4(col, 1.0);
}
`;

/**
 * Drawn over the tub scenes when the camera sits at the waterline: the line
 * where the water meets the front of the lens, and a faint haze and light
 * shafts in the half that is underwater.
 */
export const LENS_FS = /* glsl */ `
${COMMON}
${WAVES}
in vec2 v_uv;
uniform mat4 u_invViewProj;
uniform vec3 u_camPos;
uniform vec4 u_water;
uniform float u_time;
uniform vec3 u_haze;
uniform float u_lensOn;
out vec4 o_color;

void main() {
  vec4 far = u_invViewProj * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(far.xyz / far.w - u_camPos);
  vec3 lens = u_camPos + dir * u_water.y;
  float wave = waveHeight(lens.xz, u_time) * 0.02 * u_water.y;
  float d = lens.y - u_water.x - wave;
  float px = d / max(fwidth(d), 1e-6);
  float line = exp(-px * px / 5.0);
  float under = 1.0 - smoothstep(-1.5, 1.5, px);
  float band = smoothstep(-26.0, -2.0, px) * under;
  float shafts = pow(noise(vec2(v_uv.x * 9.0 + u_time * 0.05, 0.0)) * noise(vec2(v_uv.x * 23.0 - u_time * 0.08, 3.0)), 1.6);
  float depthFade = clamp(-d / (u_water.y * 1.2), 0.0, 1.0);
  vec3 col = vec3(0.0);
  float a = 0.0;
  // Haze and shafts below the line.
  col += u_haze * under;
  a += under * (0.1 + 0.18 * depthFade);
  col += vec3(0.85, 0.95, 0.92) * shafts * under * (1.0 - depthFade) * 0.6;
  a += shafts * under * (1.0 - depthFade) * 0.12;
  // A dark band just under the waterline, and a bright line on it.
  col = mix(col, u_haze * 0.35, band * 0.5);
  a = max(a, band * 0.35);
  col = mix(col, vec3(0.96, 1.0, 0.98), line);
  a = max(a, line * 0.85);
  o_color = vec4(col, a * u_lensOn);
}
`;

/** A soft gradient with blurred circles of light, for the close-up scenes. */
export const BACKDROP_FS = /* glsl */ `
${COMMON}
in vec2 v_uv;
uniform vec3 u_top;
uniform vec3 u_bottom;
uniform vec4 u_blobs[8];
uniform vec3 u_blobColors[8];
uniform int u_blobCount;
uniform vec2 u_resolution;
out vec4 o_color;

void main() {
  vec2 uv = v_uv;
  vec3 col = mix(u_bottom, u_top, smoothstep(0.0, 1.0, uv.y));
  float aspect = u_resolution.x / u_resolution.y;
  for (int i = 0; i < 8; i++) {
    if (i >= u_blobCount) break;
    vec4 b = u_blobs[i];
    vec2 d = (uv - b.xy) * vec2(aspect, 1.0);
    float r = length(d) / b.z;
    float disc = smoothstep(1.0, 0.86, r) * (0.82 + 0.18 * smoothstep(0.55, 0.95, r));
    float glow = exp(-r * r * 1.6) * 0.35;
    col = mix(col, u_blobColors[i], clamp(disc * b.w + glow * b.w, 0.0, 1.0));
  }
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  o_color = vec4(col, 1.0);
}
`;

/**
 * The last pass: hands scene A over to scene B one tile at a time, adds a
 * faint vignette and dithers away banding.
 */
export const POST_FS = /* glsl */ `
${COMMON}
in vec2 v_uv;
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform float u_mix;
uniform vec2 u_resolution;
uniform float u_tile;
uniform vec3 u_grout;
uniform float u_vignette;
uniform vec2 u_sweep;
out vec4 o_color;

void main() {
  vec2 uv = v_uv;
  vec3 col;
  if (u_mix <= 0.0) {
    col = texture(u_a, uv).rgb;
  } else if (u_mix >= 1.0) {
    col = texture(u_b, uv).rgb;
  } else {
    vec2 px = gl_FragCoord.xy;
    vec2 cell = floor(px / u_tile);
    vec2 f = fract(px / u_tile) - 0.5;
    vec2 centre = (cell + 0.5) * u_tile / u_resolution;
    float order = dot(centre - 0.5, u_sweep) * 0.7 + 0.5 + (hash(cell) - 0.5) * 0.22;
    float width = 0.35;
    float local = clamp((u_mix * (1.0 + width) - order) / width, 0.0, 1.0);
    float s = abs(local - 0.5) * 2.0;
    float edge = max(abs(f.x), abs(f.y));
    float aa = 1.0 / u_tile;
    float inside = 1.0 - smoothstep(0.5 * s - 0.045 - aa, 0.5 * s - 0.045 + aa, edge);
    vec3 src = local < 0.5 ? texture(u_a, uv).rgb : texture(u_b, uv).rgb;
    col = mix(u_grout, src, inside);
  }
  vec2 q = uv - 0.5;
  col *= 1.0 - u_vignette * smoothstep(0.35, 0.95, dot(q, q) * 2.2);
  col += (hash(gl_FragCoord.xy + 7.0) - 0.5) / 255.0;
  o_color = vec4(col, 1.0);
}
`;
