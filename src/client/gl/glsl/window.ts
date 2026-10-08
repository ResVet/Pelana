// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Daylight through the ventilation blocks (roster) in the bathroom wall:
// a grid of square concrete blocks, each with a round opening. A point is in
// the sun when the line from it towards the sun passes through an opening.
// Needs u_sunDir, u_window (z0, y0, z1, y1) and u_windowParams (wall x, block size).

export const WINDOW_LIGHT = /* glsl */ `
float roster(vec2 q, float soft) {
  float size = u_windowParams.y;
  vec2 c = mod(q, size) - 0.5 * size;
  return smoothstep(-soft, soft, 0.4 * size - length(c));
}

float windowLight(vec3 P) {
  vec3 L = u_sunDir;
  if (L.x > -0.02) return 0.0;
  float t = (u_windowParams.x - P.x) / L.x;
  if (t < -0.5) return 0.0;
  vec3 H = P + L * max(t, 0.0);
  float soft = 0.35 + max(t, 0.0) * 0.012;
  float inside = smoothstep(u_window.x - soft, u_window.x + soft, H.z) * smoothstep(u_window.z + soft, u_window.z - soft, H.z);
  inside *= smoothstep(u_window.y - soft, u_window.y + soft, H.y) * smoothstep(u_window.w + soft, u_window.w - soft, H.y);
  return inside * roster(vec2(H.z - u_window.x, H.y - u_window.y), soft);
}
`;
