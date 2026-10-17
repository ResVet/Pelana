// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The lit shader every solid object goes through. Materials are procedural:
// tiles, mosquito scales, eggs, larvae, proteins, membranes, skin, blood
// cells. With BATHROOM defined it also knows about the water in the bak
// mandi: light through the ventilation blocks, caustics, and the colour the
// water adds along every line of sight.

import { COMMON } from './common.ts';
import { WINDOW_LIGHT } from './window.ts';

export const INSTANCE_VS = /* glsl */ `
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_aux;
layout(location = 3) in vec4 i_m0;
layout(location = 4) in vec4 i_m1;
layout(location = 5) in vec4 i_m2;
layout(location = 6) in vec4 i_m3;
layout(location = 7) in vec4 i_color;
layout(location = 8) in vec4 i_params;
`;

export const SOLID_VS = /* glsl */ `
${INSTANCE_VS}
uniform mat4 u_viewProj;

out vec3 v_world;
out vec3 v_normal;
out vec3 v_local;
out vec4 v_aux;
flat out vec4 v_color;
flat out vec4 v_params;
flat out vec3 v_scale;

void main() {
  mat4 m = mat4(i_m0, i_m1, i_m2, i_m3);
  vec4 world = m * vec4(a_position, 1.0);
  mat3 r = mat3(m);
  vec3 s2 = vec3(dot(r[0], r[0]), dot(r[1], r[1]), dot(r[2], r[2]));
  // Columns are orthogonal, so M * (n / s^2) is the inverse transpose applied to n.
  v_normal = normalize(r * (a_normal / max(s2, vec3(1e-12))));
  v_world = world.xyz;
  v_local = a_position;
  v_aux = a_aux;
  v_color = i_color;
  v_params = i_params;
  v_scale = sqrt(s2);
  gl_Position = u_viewProj * world;
}
`;

export const DEPTH_VS = /* glsl */ `
${INSTANCE_VS}
uniform mat4 u_viewProj;
void main() {
  mat4 m = mat4(i_m0, i_m1, i_m2, i_m3);
  gl_Position = u_viewProj * (m * vec4(a_position, 1.0));
}
`;

export const DEPTH_FS = /* glsl */ `
void main() {}
`;

export const SOLID_FS = /* glsl */ `
${COMMON}

in vec3 v_world;
in vec3 v_normal;
in vec3 v_local;
in vec4 v_aux;
flat in vec4 v_color;
flat in vec4 v_params;
flat in vec3 v_scale;

uniform vec3 u_camPos;
uniform float u_time;
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform vec3 u_skyColor;
uniform vec3 u_groundColor;
uniform vec3 u_rimDir;
uniform vec3 u_rimColor;
uniform float u_exposure;
uniform vec4 u_fog;
uniform vec2 u_fogRange;
uniform sampler2DShadow u_shadowMap;
uniform mat4 u_shadowMatrix;
uniform vec3 u_shadow;
uniform vec4 u_highlight;
uniform vec3 u_highlightColor;
uniform vec4 u_cut;
uniform vec3 u_cutCenter;
uniform vec4 u_xray;
uniform float u_clipY;
uniform vec3 u_grout;
uniform vec4 u_bite;

#ifdef BATHROOM
uniform vec4 u_water;
uniform vec3 u_waterAbs;
uniform vec3 u_waterTint;
uniform vec4 u_tub;
uniform float u_tubFloor;
uniform vec4 u_window;
uniform vec4 u_windowParams;
uniform vec4 u_stain;
uniform float u_causticScale;
uniform vec3 u_skyLight;
uniform float u_tubRim;
#endif

out vec4 o_color;

#define M_PLAIN 0
#define M_TILE 1
#define M_CHITIN 2
#define M_WING 3
#define M_EYE 4
#define M_EGG 5
#define M_LARVA 6
#define M_PROTEIN 7
#define M_MEMBRANE 8
#define M_SKIN 9
#define M_RBC 10
#define M_CELL 11
#define M_CORE 12
#define M_RNA 13
#define M_PLASTIC 14
#define M_CHROME 15
#define M_PAINT 16
#define M_GLOW 17
#define M_HAIR 18
#define M_DROPLET 19
#define M_WATERBODY 20

struct Surface {
  vec3 albedo;
  vec3 N;
  float rough;
  float spec;
  float metal;
  float ao;
  float sss;
  vec3 sssColor;
  vec3 emissive;
  float alpha;
  float white;
};

Surface surface(vec3 albedo, vec3 N) {
  Surface s;
  s.albedo = albedo;
  s.N = N;
  s.rough = 0.5;
  s.spec = 0.04;
  s.metal = 0.0;
  s.ao = 1.0;
  s.sss = 0.0;
  s.sssColor = vec3(1.0, 0.35, 0.25);
  s.emissive = vec3(0.0);
  s.alpha = 1.0;
  s.white = 0.0;
  return s;
}

float shadowAt(vec3 P, vec3 N) {
  if (u_shadow.x < 0.5) return 1.0;
  vec4 sp = u_shadowMatrix * vec4(P + N * u_shadow.z * 3.0, 1.0);
  vec3 c = sp.xyz / sp.w * 0.5 + 0.5;
  if (c.x <= 0.0 || c.x >= 1.0 || c.y <= 0.0 || c.y >= 1.0 || c.z >= 1.0) return 1.0;
  float t = u_shadow.y;
  float sum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      sum += texture(u_shadowMap, vec3(c.xy + vec2(float(x), float(y)) * t * 1.25, c.z - u_shadow.z));
    }
  }
  return sum / 9.0;
}

// Ambient light from a sky above and a floor below, as a function of direction.
vec3 hemisphere(vec3 d) {
  return mix(u_groundColor, u_skyColor, smoothstep(-0.55, 0.75, d.y));
}

vec3 shade(Surface s, vec3 V, vec3 sun) {
  vec3 N = s.N;
  vec3 L = u_sunDir;
  float NoL = dot(N, L);
  float w = s.sss * 0.6;
  float diff = clamp((NoL + w) / ((1.0 + w) * (1.0 + w)), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float NoV = max(dot(N, V), 1e-3);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);
  float cNoL = max(NoL, 0.0);
  float a = max(s.rough * s.rough, 0.0025);
  float a2 = a * a;
  float dn = NoH * NoH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * dn * dn);
  float k = a * 0.5;
  float Vis = 0.25 / ((NoV * (1.0 - k) + k) * (cNoL * (1.0 - k) + k));
  vec3 f0 = mix(vec3(s.spec), s.albedo, s.metal);
  vec3 F = f0 + (1.0 - f0) * pow(1.0 - VoH, 5.0);
  vec3 kd = (1.0 - s.metal) * s.albedo;
  vec3 col = (kd * diff + D * Vis * F * cNoL) * sun;
  // Light passing through thin, soft things (larvae, ear lobes, a full abdomen).
  float back = pow(clamp(dot(V, -L), 0.0, 1.0), 3.0) * s.sss;
  col += s.sssColor * kd * sun * (back * 0.9 + smoothstep(-0.5, 0.1, NoL) * (1.0 - smoothstep(0.1, 0.6, NoL)) * s.sss * 0.35);
  // Ambient and blurred environment reflection.
  col += kd * hemisphere(N) * s.ao;
  vec3 R = reflect(-V, N);
  vec3 Fe = f0 + (max(vec3(1.0 - s.rough), f0) - f0) * pow(1.0 - NoV, 5.0);
  col += hemisphere(R) * Fe * s.ao * (1.0 - 0.75 * s.rough);
  float rim = pow(1.0 - NoV, 3.0) * (0.35 + 0.65 * max(dot(N, u_rimDir), 0.0));
  col += u_rimColor * rim * s.ao * (1.0 - s.metal * 0.5);
  return col + s.emissive;
}

// --- Tiles ---------------------------------------------------------------

void tileSurface(inout Surface s, vec3 P, vec3 Ng, float size, float grout) {
  vec3 a = abs(Ng);
  vec2 c;
  vec3 T;
  vec3 B;
  if (a.x > a.y && a.x > a.z) {
    c = vec2(P.z * sign(Ng.x), P.y);
    T = vec3(0.0, 0.0, sign(Ng.x));
    B = vec3(0.0, 1.0, 0.0);
  } else if (a.z > a.y) {
    c = vec2(-P.x * sign(Ng.z), P.y);
    T = vec3(-sign(Ng.z), 0.0, 0.0);
    B = vec3(0.0, 1.0, 0.0);
  } else {
    c = vec2(P.x, -P.z * sign(Ng.y));
    T = vec3(1.0, 0.0, 0.0);
    B = vec3(0.0, 0.0, -sign(Ng.y));
  }
  vec2 g = c / size;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 e = (0.5 - abs(f)) * size;
  float edge = min(e.x, e.y);
  float hg = grout * 0.5;
  float aa = max(fwidth(edge), 1e-5);
  float inGrout = 1.0 - smoothstep(hg - aa, hg + aa, edge);
  float bw = max(grout * 0.45, size * 0.012);
  vec2 tilt = (1.0 - smoothstep(hg, hg + bw, e)) * sign(f) * (1.0 - inGrout);
  float h = hash(id + vec2(size * 13.7, 3.1));
  float wav = noise(g * 2.3 + id * 7.0);
  vec3 N = Ng + (T * tilt.x + B * tilt.y) * 0.9;
  N += (T * (wav - 0.5) + B * (noise(g * 2.3 + vec2(4.0, 9.0)) - 0.5)) * 0.05 * (1.0 - inGrout);
  s.N = normalize(N);
  vec3 tile = s.albedo * (0.95 + 0.07 * h) * (1.0 - 0.03 * smoothstep(0.55, 0.9, noise(c * 3.0 / size)));
  s.albedo = mix(tile, u_grout * (0.9 + 0.2 * noise(c * 40.0 / size)), inGrout);
  s.rough = mix(0.07 + 0.08 * wav, 0.88, inGrout);
  s.spec = mix(0.05, 0.02, inGrout);
  s.ao = mix(1.0, 0.6, inGrout) * mix(0.82, 1.0, smoothstep(hg, hg + bw * 1.6, edge));
}

// --- Mosquito -------------------------------------------------------------

float lyre(vec3 L) {
  vec2 d = L.xz;
  float dorsal = smoothstep(0.1, 0.42, L.y);
  float arm = 0.19 + 0.35 * smoothstep(0.86, 0.3, d.y) - 0.09 * smoothstep(0.05, -0.7, d.y);
  float armLine = 1.0 - smoothstep(0.045, 0.085, abs(abs(d.x) - arm));
  armLine *= smoothstep(-0.78, -0.62, d.y) * smoothstep(0.93, 0.8, d.y);
  float hook = (1.0 - smoothstep(0.04, 0.08, length(vec2(abs(d.x) - 0.15, d.y - 0.8)) - 0.05));
  float mid = 1.0 - smoothstep(0.016, 0.034, abs(abs(d.x) - 0.065));
  mid *= smoothstep(-0.6, -0.48, d.y) * smoothstep(0.72, 0.6, d.y);
  return max(max(armLine, hook), mid) * dorsal;
}

void chitinSurface(inout Surface s, vec3 P, vec3 L, vec3 V, int pattern, float param) {
  float white = 0.0;
  if (pattern == 1) {
    white = lyre(L);
    float side = smoothstep(0.72, 0.9, abs(L.x)) * (1.0 - smoothstep(0.0, 0.35, abs(L.y + 0.05)));
    white = max(white, side * step(0.42, noise(L.yz * 5.0 + 3.0)));
  } else if (pattern == 2 || pattern == 12) {
    float band = smoothstep(0.5, 0.62, L.z) * smoothstep(-0.3, 0.0, L.y);
    float spot = smoothstep(0.7, 0.84, abs(L.x)) * smoothstep(0.05, 0.3, L.z) * (1.0 - smoothstep(-0.1, 0.25, L.y));
    white = max(band, spot);
  } else if (pattern == 3) {
    white = 1.0 - smoothstep(param - 0.025, param + 0.025, L.y);
  } else if (pattern == 4) {
    white = smoothstep(0.88, 0.94, L.y);
  } else if (pattern == 6) {
    white = smoothstep(0.6, 0.7, L.y);
  } else if (pattern == 7) {
    white = (1.0 - smoothstep(0.12, 0.28, abs(L.x))) * smoothstep(0.15, 0.45, L.y);
  } else if (pattern == 8) {
    white = 1.0;
  } else if (pattern == 9) {
    white = 0.45;
  } else if (pattern == 10) {
    white = 0.05 * smoothstep(0.3, 0.7, fract(L.y * 18.0));
  }
  s.white = white;
  // Scales: a fine grain along the body that catches the light.
  float grain = noise(L * vec3(60.0, 60.0, 22.0));
  s.N = bump(P, s.N, grain, 0.0006 * max(v_scale.x, v_scale.z));
  vec3 silver = vec3(0.74, 0.78, 0.76);
  s.albedo = mix(s.albedo * (0.8 + 0.4 * grain), silver, white);
  s.rough = mix(0.62, 0.3, white);
  s.spec = mix(0.04, 0.12, white);
  s.ao = mix(0.55, 1.0, white);
  if (pattern == 12) {
    // A blood meal stretches the abdomen thin and shows the red through it.
    float fed = param;
    vec3 blood = vec3(0.42, 0.012, 0.01);
    s.albedo = mix(s.albedo, blood, fed * 0.85 * (1.0 - white * 0.6));
    s.sss = fed * 0.9;
    s.sssColor = vec3(1.0, 0.08, 0.05);
    s.rough = mix(s.rough, 0.2, fed);
    s.spec = mix(s.spec, 0.06, fed);
  }
}

void eyeSurface(inout Surface s, vec3 P, vec3 L, vec3 V) {
  vec3 a = abs(L);
  vec2 uv = a.x > a.y && a.x > a.z ? L.yz : (a.y > a.z ? L.xz : L.xy);
  vec4 c = cells(uv * 9.0, 0.0);
  s.N = bump(P, s.N, -c.x * c.x, 0.0012 * v_scale.x);
  float ndv = max(dot(s.N, V), 0.0);
  s.albedo = vec3(0.01, 0.011, 0.01);
  s.rough = 0.2;
  s.spec = 0.06;
  s.emissive = (0.5 + 0.5 * cos(6.2831 * (ndv * 1.2 + vec3(0.0, 0.33, 0.67)))) * 0.015 * (1.0 - ndv);
}

void wingSurface(inout Surface s, vec3 V, vec4 aux) {
  float x = aux.x;
  float y = aux.y;
  float vein = 0.0;
  for (int k = 0; k < 7; k++) {
    float p = 0.9 - float(k) * 0.29;
    float target = p * (1.0 - 0.28 * x) + 0.04 * sin(x * 3.0 + float(k));
    float wv = 0.045 * (1.0 - 0.4 * x);
    float on = step(0.04 + float(k) * 0.015, x) * step(x, 0.99 - abs(p) * 0.05);
    vein = max(vein, (1.0 - smoothstep(wv * 0.5, wv, abs(y - target))) * on);
  }
  float cross1 = (1.0 - smoothstep(0.008, 0.016, abs(x - 0.42 - y * 0.05))) * step(-0.3, y) * step(y, 0.3);
  vein = max(vein, cross1);
  float fringe = smoothstep(-0.86, -0.96, y) * step(0.5, fract(x * 140.0));
  float thick = 1.4 + 0.8 * fbm(aux.xy * 3.0) + (1.0 - max(dot(s.N, V), 0.0)) * 1.2;
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (thick * vec3(1.0, 0.85, 0.7) + vec3(0.0, 0.1, 0.25)));
  s.albedo = mix(film * 0.35 + 0.05, vec3(0.03, 0.025, 0.022), max(vein, fringe));
  s.alpha *= max(0.2, max(vein * 0.85, fringe * 0.45));
  s.rough = 0.18;
  s.spec = 0.06;
}

// --- Aquatic stages -------------------------------------------------------

void eggSurface(inout Surface s, vec3 P, vec3 L) {
  vec2 uv = vec2(atan(L.z, L.x) * 1.6, L.y * 4.5);
  vec4 c = cells(uv, 0.0);
  float rim = smoothstep(0.0, 0.12, c.y - c.x);
  s.N = bump(P, s.N, rim, 0.06 * v_scale.x);
  s.albedo = vec3(0.012, 0.013, 0.016) * (0.7 + 0.6 * rim);
  s.rough = mix(0.55, 0.16, rim);
  s.spec = 0.05;
}

void larvaSurface(inout Surface s, vec3 P, vec3 L, vec3 V, float kind) {
  float ndv = max(dot(s.N, V), 0.0);
  if (kind < 0.5) {
    vec3 gut = vec3(0.09, 0.075, 0.045);
    s.albedo = mix(s.albedo, gut, pow(ndv, 3.0) * 0.4);
    float ring = smoothstep(0.8, 0.98, abs(L.y));
    s.albedo *= 1.0 - 0.12 * ring;
    s.sss = 0.75;
    s.sssColor = vec3(0.95, 0.85, 0.55);
    s.rough = 0.3;
    s.spec = 0.045;
    s.N = bump(P, s.N, noise(L * 14.0), 0.03 * v_scale.x);
  } else if (kind < 1.5) {
    float eye = 1.0 - smoothstep(0.16, 0.22, length(vec2(abs(L.x) - 0.62, L.z - 0.15)));
    s.albedo = mix(s.albedo, vec3(0.01), eye);
    s.rough = 0.32;
    s.sss = 0.35;
    s.sssColor = vec3(0.8, 0.6, 0.3);
  } else if (kind < 2.5) {
    s.rough = 0.35;
    s.sss = 0.3;
  } else if (kind < 3.5) {
    s.albedo = mix(s.albedo, s.albedo * 0.45, pow(ndv, 1.5) * 0.6);
    s.sss = 0.45;
    s.sssColor = vec3(0.7, 0.6, 0.4);
    s.rough = 0.28;
    s.spec = 0.05;
  } else {
    s.rough = 0.4;
  }
}

// --- Virus particle -------------------------------------------------------

const vec3 DOMAIN_I = vec3(0.552, 0.082, 0.05);
const vec3 DOMAIN_II = vec3(0.737, 0.479, 0.068);
const vec3 DOMAIN_III = vec3(0.05, 0.159, 0.479);
const vec3 FUSION_LOOP = vec3(0.693, 0.223, 0.024);

vec3 domainColour(vec3 L) {
  float side = L.z >= 0.0 ? 1.0 : -1.0;
  float u = L.x * side + (noise(L.xz * 16.0) - 0.5) * 0.05;
  if (u < -0.31) return DOMAIN_III;
  if (u < -0.08) return DOMAIN_I;
  if (u < 0.41) return DOMAIN_II;
  return FUSION_LOOP;
}

void proteinSurface(inout Surface s, vec3 P, vec3 L) {
  vec3 c = domainColour(L);
  s.albedo = c * s.albedo;
  float lumps = noise(L * 22.0) + 0.4 * noise(L * 48.0);
  s.N = bump(P, s.N, lumps, 0.0045 * v_scale.x);
  s.ao = mix(0.45, 1.0, smoothstep(-0.11, 0.07, L.y)) * (0.8 + 0.2 * lumps);
  s.rough = 0.55;
  s.spec = 0.035;
  s.sss = 0.2;
  s.sssColor = c;
}

void membraneSurface(inout Surface s, vec3 P, vec3 L) {
  float heads = noise(L * 46.0);
  s.N = bump(P, s.N, heads, 0.012 * v_scale.x);
  s.albedo *= 0.85 + 0.3 * heads;
  s.rough = 0.5;
  s.sss = 0.3;
  s.sssColor = s.albedo;
  if (!gl_FrontFacing) {
    s.albedo *= 0.5;
    s.ao = 0.55;
  }
}

// --- Skin and blood -------------------------------------------------------

void skinSurface(inout Surface s, vec3 P) {
  vec2 q = P.xz + vec2(noise(P.xz * 1.3), noise(P.xz * 1.3 + 5.0)) * 0.35;
  vec4 c = cells(q * 1.6, 0.0);
  vec4 c2 = cells(q * 4.1 + 3.0, 0.0);
  float crease = 1.0 - smoothstep(0.0, 0.05, c.y - c.x);
  float fine = 1.0 - smoothstep(0.0, 0.06, c2.y - c2.x);
  float pore = 1.0 - smoothstep(0.02, 0.05, length(c.zw - vec2(0.21, -0.14)));
  s.N = bump(P, s.N, -crease * 0.6 - fine * 0.25 + noise(P.xz * 9.0) * 0.2 - pore * 0.4, 0.006);
  s.albedo *= (1.0 - crease * 0.08 - fine * 0.04 - pore * 0.15) * (0.93 + 0.14 * noise(P.xz * 0.7));
  if (u_bite.w > 0.0) {
    float d = length(P - u_bite.xyz);
    s.albedo = mix(s.albedo, s.albedo * vec3(1.15, 0.72, 0.68), (1.0 - smoothstep(0.0, u_bite.w, d)) * 0.55);
  }
  s.sss = 0.5;
  s.sssColor = vec3(0.85, 0.25, 0.14);
  s.rough = mix(0.45, 0.62, crease);
  s.spec = 0.03;
}

void cellSurface(inout Surface s, vec3 P, vec4 aux) {
  vec2 q = aux.xy - 0.5;
  float nucleus = 1.0 - smoothstep(0.1, 0.19, length(q * vec2(1.0, 2.3)));
  float border = smoothstep(0.4, 0.5, max(abs(q.x), abs(q.y)));
  s.albedo = mix(s.albedo, vec3(0.3, 0.14, 0.32), nucleus * 0.55);
  s.albedo *= 1.0 + border * 0.25;
  s.N = bump(P, s.N, nucleus * 0.6 + noise(P * 4.0) * 0.2, 0.08);
  s.sss = 0.6;
  s.sssColor = vec3(1.0, 0.45, 0.4);
  s.rough = 0.42;
}

// --- Bathroom ---------------------------------------------------------------

#ifdef BATHROOM
// Length of the segment a-b inside the water in the tub.
float waterPath(vec3 a, vec3 b) {
  vec3 lo = vec3(u_tub.x, u_tubFloor, u_tub.y);
  vec3 hi = vec3(u_tub.z, u_water.x, u_tub.w);
  vec3 d = b - a;
  vec3 safe = d + vec3(lessThan(abs(d), vec3(1e-5))) * 1e-5;
  vec3 t0 = (lo - a) / safe;
  vec3 t1 = (hi - a) / safe;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float enter = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
  float leave = min(min(tmax.x, tmax.y), min(tmax.z, 1.0));
  return max(leave - enter, 0.0) * length(d);
}

bool underwater(vec3 p) {
  return u_water.w > 0.5 && p.y < u_water.x && p.x > u_tub.x - 0.01 && p.x < u_tub.z + 0.01 && p.z > u_tub.y - 0.01 && p.z < u_tub.w + 0.01;
}

${WINDOW_LIGHT}

// Soft darkening where surfaces meet: the room's corners, the foot of the
// tub, and inside the tub, which gets less of the sky the deeper it goes.
float roomOcclusion(vec3 P, vec3 N) {
  float ao = 1.0;
  ao *= 1.0 - 0.32 * exp(-max(P.y, 0.0) / 16.0) * (1.0 - abs(N.y));
  ao *= 1.0 - 0.32 * exp(-max(P.z + 100.0, 0.0) / 16.0) * (1.0 - abs(N.z));
  ao *= 1.0 - 0.32 * exp(-max(P.x + 100.0, 0.0) / 16.0) * (1.0 - abs(N.x));
  vec3 c = vec3((u_tub.x + u_tub.z) * 0.5 - 5.0, u_tubRim * 0.5, (u_tub.y + u_tub.w) * 0.5 - 5.0);
  vec3 h = vec3((u_tub.z - u_tub.x) * 0.5 + 15.0, u_tubRim * 0.5, (u_tub.w - u_tub.y) * 0.5 + 15.0);
  float d = length(max(abs(P - c) - h, 0.0));
  if (d > 0.05) ao *= 1.0 - 0.45 * exp(-d / 10.0);
  if (P.x > u_tub.x - 0.05 && P.x < u_tub.z + 0.05 && P.z > u_tub.y - 0.05 && P.z < u_tub.w + 0.05 && P.y < u_tubRim + 0.5) {
    float dx = min(P.x - u_tub.x, u_tub.z - P.x);
    float dz = min(P.z - u_tub.y, u_tub.w - P.z);
    float dy = P.y - u_tubFloor;
    ao *= 1.0 - 0.3 * exp(-max(dx, 0.0) / 7.0) * (1.0 - abs(N.x));
    ao *= 1.0 - 0.3 * exp(-max(dz, 0.0) / 7.0) * (1.0 - abs(N.z));
    ao *= 1.0 - 0.35 * exp(-max(dy, 0.0) / 7.0) * (1.0 - abs(N.y));
    ao *= mix(0.6, 1.0, smoothstep(u_tubFloor, u_tubRim + 8.0, P.y));
  }
  return ao;
}
#endif

void main() {
  vec3 P = v_world;
  if (P.y < u_clipY) discard;
  int mat = int(v_params.x + 0.5);
  if (v_params.z < -0.5 && dot(P - u_cutCenter, u_cut.xyz) > u_cut.w) discard;
  vec3 Ng = normalize(v_normal);
  if (!gl_FrontFacing) Ng = -Ng;
  vec3 V = normalize(u_camPos - P);
  vec3 L = v_local;
  Surface s = surface(v_color.rgb, Ng);
  s.alpha = v_color.a;
  float part = v_params.w;

  if (u_xray.x > 0.5 && (mat == M_CHITIN || mat == M_EYE || mat == M_WING)) {
    float ndv = abs(dot(Ng, V));
    float edge = pow(1.0 - ndv, 2.2);
    vec3 c = u_xray.yzw * (edge * 1.3 + 0.05);
    // Wings are a single thin membrane: seen edge on they would read as solid.
    float a = clamp(edge * 1.05 + 0.1, 0.0, 1.0) * (mat == M_WING ? 0.35 : 1.0);
    o_color = vec4(c, a);
    return;
  }

  if (mat == M_PLAIN) {
    s.rough = v_params.y;
    s.metal = v_params.z > 0.0 ? v_params.z : 0.0;
  } else if (mat == M_TILE) {
    tileSurface(s, P, Ng, v_params.y, v_params.z);
#ifdef BATHROOM
    if (u_stain.w > 0.0 && P.x > u_tub.x - 0.02 && P.x < u_tub.z + 0.02 && P.z > u_tub.y - 0.02 && P.z < u_tub.w + 0.02 && P.y > u_tubFloor) {
      float ring = exp(-pow((P.y - u_stain.x) / u_stain.y, 2.0));
      s.albedo *= mix(vec3(1.0), vec3(0.86, 0.8, 0.66), ring * u_stain.w);
      float film = smoothstep(u_stain.x, u_stain.x - 25.0, P.y) * u_stain.w;
      s.albedo *= mix(vec3(1.0), vec3(0.82, 0.92, 0.82), film * 0.6);
      s.rough = mix(s.rough, 0.35, ring * u_stain.w * 0.6);
    }
#endif
  } else if (mat == M_PAINT) {
    float n = noise(P.xy * 0.9 + P.z * 0.4);
    s.albedo *= 0.96 + 0.05 * n;
    s.rough = 0.85;
    s.spec = 0.025;
#ifdef BATHROOM
    // The blocks themselves, seen from inside: daylight through the gaps.
    if (abs(P.x - u_windowParams.x) < 0.5 && P.z > u_window.x && P.z < u_window.z && P.y > u_window.y && P.y < u_window.w) {
      float open = roster(vec2(P.z - u_window.x, P.y - u_window.y), 0.15);
      s.albedo = mix(vec3(0.5, 0.5, 0.47), vec3(0.0), open);
      s.emissive = u_skyLight * open;
    }
#endif
  } else if (mat == M_CHITIN) {
    chitinSurface(s, P, L, V, int(v_params.y + 0.5), v_params.z);
  } else if (mat == M_WING) {
    wingSurface(s, V, v_aux);
  } else if (mat == M_EYE) {
    eyeSurface(s, P, L, V);
  } else if (mat == M_EGG) {
    eggSurface(s, P, L);
  } else if (mat == M_LARVA) {
    larvaSurface(s, P, L, V, v_params.y);
  } else if (mat == M_PROTEIN) {
    // Merged particles keep each dimer's own coordinates in aux.
    proteinSurface(s, P, v_aux.w > 0.5 ? v_aux.xyz : L);
  } else if (mat == M_MEMBRANE) {
    membraneSurface(s, P, L);
  } else if (mat == M_CORE) {
    float lumps = noise(L * 18.0);
    s.N = bump(P, s.N, lumps, 0.03 * v_scale.x);
    s.albedo *= 0.8 + 0.35 * lumps;
    s.rough = 0.6;
    if (!gl_FrontFacing) s.albedo *= 0.55;
  } else if (mat == M_RNA) {
    s.rough = 0.35;
    s.emissive = s.albedo * 0.35;
  } else if (mat == M_SKIN) {
    skinSurface(s, P);
  } else if (mat == M_RBC) {
    s.rough = 0.36;
    s.spec = 0.04;
    s.sss = 0.55;
    s.sssColor = vec3(1.0, 0.12, 0.08);
  } else if (mat == M_CELL) {
    cellSurface(s, P, v_aux);
  } else if (mat == M_PLASTIC) {
    s.rough = v_params.y > 0.0 ? v_params.y : 0.22;
    s.spec = 0.05;
    s.sss = 0.35;
    s.sssColor = s.albedo;
  } else if (mat == M_CHROME) {
    s.metal = 1.0;
    s.rough = 0.1;
  } else if (mat == M_GLOW) {
    o_color = vec4(s.albedo * v_params.y, v_color.a);
    return;
  } else if (mat == M_HAIR) {
    s.rough = 0.4;
    s.sss = 0.4;
  } else if (mat == M_DROPLET) {
    float ndv = max(dot(Ng, V), 0.0);
    s.rough = 0.08;
    s.spec = 0.05;
    s.sss = 0.8;
    s.sssColor = s.albedo;
    s.alpha = v_color.a * (0.55 + 0.45 * pow(1.0 - ndv, 2.0));
  }

  // Highlighting one part of the mosquito: the rest steps back.
  if (u_highlight.x > 0.5) {
    float amount = u_highlight.y;
    if (abs(part - u_highlight.x) < 0.5) {
      float ndv = max(dot(s.N, V), 0.0);
      float glow = pow(1.0 - ndv, 2.0) * 0.6 + s.white * 0.8 + 0.12;
      s.emissive += u_highlightColor * glow * amount;
    } else if (part > 0.5 || mat == M_CHITIN || mat == M_EYE) {
      s.albedo *= 1.0 - 0.45 * amount;
      s.spec *= 1.0 - 0.5 * amount;
    }
  }

  vec3 sun = u_sunColor;
  float vis = shadowAt(P, s.N);

#ifdef BATHROOM
  if (mat == M_TILE || mat == M_PAINT) s.ao *= roomOcclusion(P, Ng);
  vis *= windowLight(P);
  if (underwater(P)) {
    float depth = u_water.x - P.y;
    float path = depth / max(u_sunDir.y, 0.15);
    vec3 Ps = P + u_sunDir * path;
    float c = caustic(Ps.xz * u_causticScale, u_time * 0.85);
    float contrast = exp(-depth * 0.04);
    sun *= exp(-u_waterAbs * path * u_water.z) * mix(1.0, mix(0.3, 2.3, clamp(c, 0.0, 1.0)), contrast);
  }
#endif

  vec3 col = shade(s, V, sun * vis);

#ifdef BATHROOM
  if (u_water.w > 0.5) {
    vec3 lens = u_camPos + normalize(P - u_camPos) * u_water.y;
    float inside = waterPath(lens, P);
    vec3 T = exp(-u_waterAbs * inside * u_water.z);
    col = col * T + u_waterTint * (1.0 - T);
  }
#endif

  col *= u_exposure;
  vec3 outc = tonemap(col);
  if (u_fog.w > 0.0) {
    float dist = length(u_camPos - P);
    float f = smoothstep(u_fogRange.x, u_fogRange.y, dist) * u_fog.w;
    outc = mix(outc, u_fog.rgb, f);
  }
  o_color = vec4(outc, s.alpha);
}
`;
