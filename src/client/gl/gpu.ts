// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Thin wrappers over WebGL2: shader programs with typed uniform setters,
// instanced meshes, multisampled render targets and a shadow map. Every
// object here can be thrown away and rebuilt, which is how the renderer
// survives a lost context.

import { mat4, type Mat4 } from './math.ts';

/** Attribute locations, fixed in every vertex shader with layout(location = n). */
export const ATTR = { position: 0, normal: 1, aux: 2, model: 3, color: 7, params: 8 } as const;

/** Floats per instance: a 4x4 model matrix, an RGBA colour and four material parameters. */
export const INSTANCE_FLOATS = 24;

export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  /** Four free values per vertex (texture coordinates, domain ids, baked occlusion...). */
  aux: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export function createContext(canvas: HTMLCanvasElement, allowSoftware: boolean): WebGL2RenderingContext | null {
  try {
    return canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      // A software renderer would draw this at a few frames a second and
      // make scrolling worse, so the page keeps its CSS fallback instead.
      failIfMajorPerformanceCaveat: !allowSoftware,
    });
  } catch {
    return null;
  }
}

type UniformValue = number | boolean | ArrayLike<number>;

interface UniformInfo {
  loc: WebGLUniformLocation;
  type: number;
}

const HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2DShadow;\n';

function numbered(source: string): string {
  return source
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4)}  ${line}`)
    .join('\n');
}

export class Program {
  readonly handle: WebGLProgram;
  private readonly gl: WebGL2RenderingContext;
  private readonly name: string;
  private readonly shaders: WebGLShader[];
  private readonly sources: string[];
  private uniforms = new Map<string, UniformInfo>();
  private linked = false;

  constructor(gl: WebGL2RenderingContext, name: string, vertex: string, fragment: string, defines: string[] = []) {
    this.gl = gl;
    this.name = name;
    const prefix = HEADER + defines.map((d) => `#define ${d}\n`).join('');
    this.sources = [prefix + vertex, prefix + fragment];
    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    this.handle = program;
    this.shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('createShader failed');
      gl.shaderSource(shader, this.sources[i]!);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      return shader;
    });
    // Linking starts here; with KHR_parallel_shader_compile it finishes in
    // the background and ready() reports when it has.
    gl.linkProgram(program);
  }

  /** True once compiling and linking have finished. Throws if they failed. */
  ready(parallel: KHR_parallel_shader_compile | null): boolean {
    if (this.linked) return true;
    const gl = this.gl;
    if (parallel && !gl.getProgramParameter(this.handle, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(this.handle, gl.LINK_STATUS)) {
      const logs = this.shaders.map((s, i) => {
        const log = gl.getShaderInfoLog(s);
        return log ? `${i ? 'fragment' : 'vertex'}: ${log}\n${__DEV__ ? numbered(this.sources[i]!) : ''}` : '';
      });
      throw new Error(`Shader "${this.name}" failed:\n${gl.getProgramInfoLog(this.handle) ?? ''}\n${logs.join('\n')}`);
    }
    for (const s of this.shaders) {
      gl.detachShader(this.handle, s);
      gl.deleteShader(s);
    }
    const count = gl.getProgramParameter(this.handle, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(this.handle, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(this.handle, info.name);
      if (loc) this.uniforms.set(info.name.replace(/\[0\]$/, ''), { loc, type: info.type });
    }
    this.linked = true;
    return true;
  }

  use(): this {
    this.gl.useProgram(this.handle);
    return this;
  }

  has(name: string): boolean {
    return this.uniforms.has(name);
  }

  /** Sets a uniform by name. Unknown names are ignored, so shared code can set optional uniforms freely. */
  set(name: string, value: UniformValue): this {
    const u = this.uniforms.get(name);
    if (!u) return this;
    const gl = this.gl;
    const v = value as ArrayLike<number> & Float32List;
    switch (u.type) {
      case gl.FLOAT:
        if (typeof value === 'number') gl.uniform1f(u.loc, value);
        else gl.uniform1fv(u.loc, v);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(u.loc, v);
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(u.loc, v);
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(u.loc, v);
        break;
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(u.loc, false, v);
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(u.loc, false, v);
        break;
      case gl.INT:
      case gl.BOOL:
      case gl.SAMPLER_2D:
      case gl.SAMPLER_2D_SHADOW:
        gl.uniform1i(u.loc, typeof value === 'boolean' ? Number(value) : (value as number));
        break;
      default:
        break;
    }
    return this;
  }

  /** Binds a texture to a unit and points the sampler uniform at it. */
  texture(name: string, unit: number, texture: WebGLTexture | null): this {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    return this.set(name, unit);
  }

  dispose(): void {
    this.gl.deleteProgram(this.handle);
  }
}

/** A mesh drawn with per-instance transforms, colours and material parameters. */
export class Mesh {
  readonly count: number;
  readonly data: Float32Array;
  instances = 0;
  private readonly gl: WebGL2RenderingContext;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffers: WebGLBuffer[] = [];
  private readonly instanceBuffer: WebGLBuffer;
  private readonly indexType: number;
  private readonly capacity: number;

  constructor(gl: WebGL2RenderingContext, geo: Geometry, capacity = 1) {
    this.gl = gl;
    this.capacity = Math.max(1, capacity);
    this.data = new Float32Array(this.capacity * INSTANCE_FLOATS);
    this.count = geo.indices.length;
    this.indexType = geo.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('createVertexArray failed');
    this.vao = vao;
    gl.bindVertexArray(vao);
    const attribute = (location: number, array: Float32Array, size: number) => {
      const buffer = gl.createBuffer()!;
      this.buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    };
    attribute(ATTR.position, geo.positions, 3);
    attribute(ATTR.normal, geo.normals, 3);
    attribute(ATTR.aux, geo.aux, 4);

    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const stride = INSTANCE_FLOATS * 4;
    for (let i = 0; i < 6; i++) {
      const location = ATTR.model + i;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, stride, i * 16);
      gl.vertexAttribDivisor(location, 1);
    }

    const index = gl.createBuffer()!;
    this.buffers.push(index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  get size(): number {
    return this.capacity;
  }

  /** Writes instance i. Colour and params default to white and zeros. */
  set(i: number, model: Mat4, color: ArrayLike<number> = WHITE, params: ArrayLike<number> = ZERO4): void {
    if (i >= this.capacity) return;
    const o = i * INSTANCE_FLOATS;
    const d = this.data;
    d.set(model, o);
    d[o + 16] = color[0] ?? 1;
    d[o + 17] = color[1] ?? 1;
    d[o + 18] = color[2] ?? 1;
    d[o + 19] = color[3] ?? 1;
    d[o + 20] = params[0] ?? 0;
    d[o + 21] = params[1] ?? 0;
    d[o + 22] = params[2] ?? 0;
    d[o + 23] = params[3] ?? 0;
  }

  /** Sends the first n instances to the GPU. */
  upload(n: number): void {
    this.instances = Math.min(n, this.capacity);
    if (!this.instances) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.instances * INSTANCE_FLOATS);
  }

  draw(instances = this.instances): void {
    if (instances <= 0) return;
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.count, this.indexType, 0, instances);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteVertexArray(this.vao);
    for (const b of this.buffers) gl.deleteBuffer(b);
    gl.deleteBuffer(this.instanceBuffer);
  }
}

const WHITE = [1, 1, 1, 1];
const ZERO4 = [0, 0, 0, 0];

/** A single static object: a mesh with one instance at the identity transform. */
export function staticMesh(gl: WebGL2RenderingContext, geo: Geometry, color: ArrayLike<number> = WHITE, params: ArrayLike<number> = ZERO4): Mesh {
  const mesh = new Mesh(gl, geo, 1);
  mesh.set(0, mat4(), color, params);
  mesh.upload(1);
  return mesh;
}

/**
 * Where a scene is drawn: a multisampled colour and depth buffer, resolved
 * into a texture that later passes can sample.
 */
export class Target {
  width = 0;
  height = 0;
  readonly texture: WebGLTexture;
  private readonly gl: WebGL2RenderingContext;
  private readonly samples: number;
  private readonly fbo: WebGLFramebuffer;
  private readonly msaa: WebGLFramebuffer | null;
  private color: WebGLRenderbuffer | null = null;
  private depth: WebGLRenderbuffer | null = null;

  constructor(gl: WebGL2RenderingContext, samples: number) {
    this.gl = gl;
    this.samples = samples;
    this.texture = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.msaa = samples > 0 ? gl.createFramebuffer() : null;
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    const gl = this.gl;
    this.width = width;
    this.height = height;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

    if (this.color) gl.deleteRenderbuffer(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    this.depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    if (this.msaa) {
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, width, height);
      this.color = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.color);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.color);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    } else {
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Framebuffer incomplete: ${status}`);
  }

  /** Binds the target for drawing. */
  bind(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa ?? this.fbo);
    gl.viewport(0, 0, this.width, this.height);
  }

  /** Copies the multisampled image into the texture. Leaves the target bound for more drawing. */
  resolve(): void {
    if (!this.msaa) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaa);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo);
    gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteFramebuffer(this.fbo);
    if (this.msaa) gl.deleteFramebuffer(this.msaa);
    if (this.color) gl.deleteRenderbuffer(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
  }
}

/** A depth texture rendered from the key light, sampled with hardware comparison. */
export class ShadowMap {
  readonly size: number;
  readonly texture: WebGLTexture;
  readonly matrix: Mat4 = mat4();
  private readonly gl: WebGL2RenderingContext;
  private readonly fbo: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext, size: number) {
    this.gl = gl;
    this.size = size;
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.texture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  begin(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.size, this.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteFramebuffer(this.fbo);
  }
}
