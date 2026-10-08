// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The renderer core shared by the story and the house check: the compiled
// programs, the scene and reflection targets, the shadow map, canvas sizing
// that adapts to the frame rate, and the final composite to the screen.

import { BACKDROP_FS, FULLSCREEN_VS, LENS_FS, POST_FS, WATER_FS, WATER_VS } from './glsl/passes.ts';
import { DEPTH_FS, DEPTH_VS, SOLID_FS, SOLID_VS } from './glsl/solid.ts';
import { Program, ShadowMap, Target, type Mesh } from './gpu.ts';
import { lookAt, mat4, multiply, ortho, v3, type Mat4, type Vec3 } from './math.ts';

export interface Programs {
  solid: Program;
  bath: Program;
  depth: Program;
  water: Program;
  lens: Program;
  backdrop: Program;
  post: Program;
}

/** The light in a scene. Colours are linear RGB; intensities are folded into them. */
export interface Lighting {
  sunDir: Vec3;
  sunColor: Vec3;
  sky: Vec3;
  ground: Vec3;
  rimDir: Vec3;
  rimColor: Vec3;
  exposure: number;
}

export interface BackdropBlob {
  /** Centre in screen UV (0..1), radius as a fraction of the screen height, strength 0..1. */
  x: number;
  y: number;
  r: number;
  a: number;
  color: Vec3;
}

const coarsePointer = (): boolean => window.matchMedia('(pointer: coarse)').matches;

/** Most pixels the drawing buffer may have: about 2400 by 1300. */
const MAX_PIXELS = 3.1e6;

export class Engine {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;
  readonly programs: Programs;
  readonly samples: number;
  readonly scene: [Target, Target];
  readonly reflection: Target;
  readonly shadow: ShadowMap;
  readonly lightViewProj: Mat4 = mat4();
  width = 0;
  height = 0;
  quality: number;
  private readonly parallel: KHR_parallel_shader_compile | null;
  private readonly empty: WebGLVertexArrayObject;
  private samplesDt: number[] = [];
  private lastAdjust = 0;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, options: { house?: boolean } = {}) {
    this.canvas = canvas;
    this.gl = gl;
    this.parallel = gl.getExtension('KHR_parallel_shader_compile');
    const maxSamples = (gl.getParameter(gl.MAX_SAMPLES) as number) || 0;
    this.samples = Math.min(4, maxSamples);
    this.quality = coarsePointer() ? 0.8 : 1;
    const p = (name: string, vs: string, fs: string, defines: string[] = []) => new Program(gl, name, vs, fs, defines);
    const solid = p('solid', SOLID_VS, SOLID_FS);
    // The house check has no tub of water, so it skips compiling those shaders.
    const story = !options.house;
    this.programs = {
      solid,
      bath: story ? p('bath', SOLID_VS, SOLID_FS, ['BATHROOM']) : solid,
      depth: p('depth', DEPTH_VS, DEPTH_FS),
      water: story ? p('water', WATER_VS, WATER_FS) : solid,
      lens: story ? p('lens', FULLSCREEN_VS, LENS_FS) : solid,
      backdrop: p('backdrop', FULLSCREEN_VS, BACKDROP_FS),
      post: p('post', FULLSCREEN_VS, POST_FS),
    };
    this.scene = [new Target(gl, this.samples), new Target(gl, this.samples)];
    this.reflection = new Target(gl, 0);
    this.shadow = new ShadowMap(gl, coarsePointer() ? 1024 : 2048);
    this.empty = gl.createVertexArray()!;
  }

  /** True once every program has compiled. Throws if one failed. */
  ready(): boolean {
    let all = true;
    for (const program of new Set(Object.values(this.programs) as Program[])) {
      if (!program.ready(this.parallel)) all = false;
    }
    return all;
  }

  /** Matches the drawing buffer to the canvas. Returns true when the size changed. */
  resize(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = this.canvas.clientWidth * dpr * this.quality;
    let h = this.canvas.clientHeight * dpr * this.quality;
    // Two multisampled targets at retina size on a large screen would need
    // close to a gigabyte of video memory, so the pixel count is capped.
    const budget = MAX_PIXELS / (w * h);
    if (budget < 1) {
      w *= Math.sqrt(budget);
      h *= Math.sqrt(budget);
    }
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.scene[0].resize(w, h);
    this.scene[1].resize(w, h);
    this.reflection.resize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    return true;
  }

  /**
   * Feeds the time between frames into a running check: when frames take too
   * long the drawing buffer shrinks, and when there is room again it grows.
   */
  track(dt: number): boolean {
    this.clock += dt;
    // A single long frame (a tab switch, a world being built) is not a trend.
    if (dt > 0.1) return false;
    this.samplesDt.push(dt);
    if (this.samplesDt.length > 40) this.samplesDt.shift();
    if (this.samplesDt.length < 30 || this.clock - this.lastAdjust < 1.5) return false;
    const sorted = [...this.samplesDt].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1]!;
    let next = this.quality;
    if (median > 0.024) next = Math.max(0.5, this.quality * 0.85);
    else if (median < 0.0175 && this.clock - this.lastAdjust > 4) next = Math.min(1, this.quality * 1.08);
    if (Math.abs(next - this.quality) < 0.01) return false;
    this.quality = next;
    this.lastAdjust = this.clock;
    this.samplesDt = [];
    return this.resize();
  }

  fullscreen(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  /** Sets the light uniforms shared by the lit shaders. */
  light(program: Program, l: Lighting): void {
    program
      .set('u_sunDir', v3.normalize(l.sunDir))
      .set('u_sunColor', l.sunColor)
      .set('u_skyColor', l.sky)
      .set('u_groundColor', l.ground)
      .set('u_rimDir', v3.normalize(l.rimDir))
      .set('u_rimColor', l.rimColor)
      .set('u_exposure', l.exposure);
  }

  /** Resets the optional uniforms of a lit program to "off". */
  defaults(program: Program): void {
    program
      .set('u_highlight', [0, 0, 0, 0])
      .set('u_highlightColor', [1, 1, 1])
      .set('u_cut', [0, 0, 1, 1e9])
      .set('u_cutCenter', [0, 0, 0])
      .set('u_xray', [0, 0, 0, 0])
      .set('u_clipY', -1e9)
      .set('u_fog', [0, 0, 0, 0])
      .set('u_fogRange', [1, 2])
      .set('u_shadow', [0, 0, 0])
      .set('u_grout', [0.5, 0.5, 0.5])
      .set('u_bite', [0, 0, 0, 0]);
    // The shadow sampler must always point at a depth texture, even when unused.
    program.texture('u_shadowMap', 3, this.shadow.texture);
  }

  /**
   * Renders the shadow casters from the sun into the shadow map, framing a
   * sphere of `radius` around `centre`, and returns to `target`.
   */
  renderShadow(sunDir: Vec3, centre: Vec3, radius: number, casters: Mesh[], target: Target): void {
    const gl = this.gl;
    const L = v3.normalize(sunDir);
    const eye = v3.add(centre, v3.scale(L, radius * 3));
    const up: Vec3 = Math.abs(L[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
    const view = lookAt(mat4(), eye, centre, up);
    const proj = ortho(mat4(), -radius, radius, -radius, radius, radius * 0.5, radius * 6);
    multiply(this.lightViewProj, proj, view);
    this.shadow.begin();
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 2);
    const depth = this.programs.depth.use();
    depth.set('u_viewProj', this.lightViewProj);
    for (const mesh of casters) mesh.draw();
    gl.disable(gl.POLYGON_OFFSET_FILL);
    target.bind();
  }

  /** Points a lit program at the shadow map rendered by renderShadow. */
  useShadow(program: Program, bias: number): void {
    program
      .set('u_shadowMatrix', this.lightViewProj)
      .set('u_shadow', [1, 1 / this.shadow.size, bias])
      .texture('u_shadowMap', 3, this.shadow.texture);
  }

  /** Draws a gradient with soft blobs of light behind everything else. */
  backdrop(top: Vec3, bottom: Vec3, blobs: BackdropBlob[]): void {
    const gl = this.gl;
    const p = this.programs.backdrop.use();
    const data = new Float32Array(32);
    const colors = new Float32Array(24);
    blobs.slice(0, 8).forEach((b, i) => {
      data.set([b.x, b.y, b.r, b.a], i * 4);
      colors.set(b.color, i * 3);
    });
    p.set('u_top', top).set('u_bottom', bottom).set('u_blobs', data).set('u_blobColors', colors).set('u_blobCount', Math.min(8, blobs.length)).set('u_resolution', [this.width, this.height]);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.BLEND);
    this.fullscreen();
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
  }

  /** Composites one or two scene targets onto the canvas. */
  present(a: Target, b: Target | null, mix: number, grout: Vec3, vignette: number, sweep: [number, number]): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    const p = this.programs.post.use();
    p.texture('u_a', 0, a.texture);
    p.texture('u_b', 1, (b ?? a).texture);
    const tile = Math.max(24, Math.round(Math.min(this.width, this.height) / 9));
    p.set('u_mix', b ? mix : 0)
      .set('u_resolution', [this.width, this.height])
      .set('u_tile', tile)
      .set('u_grout', grout)
      .set('u_vignette', vignette)
      .set('u_sweep', sweep);
    this.fullscreen();
  }

  dispose(): void {
    for (const program of new Set(Object.values(this.programs) as Program[])) program.dispose();
    this.scene.forEach((t) => t.dispose());
    this.reflection.dispose();
    this.shadow.dispose();
    this.gl.deleteVertexArray(this.empty);
  }
}
