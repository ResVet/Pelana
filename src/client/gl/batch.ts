// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Collects instances into a mesh during a frame: several models (the
// mosquito, the larvae, the eggs) add their parts to the same few meshes,
// which are then drawn with one call each.

import type { Mesh } from './gpu.ts';
import type { Mat4 } from './math.ts';

export class Batch {
  readonly mesh: Mesh;
  count = 0;

  constructor(mesh: Mesh) {
    this.mesh = mesh;
  }

  begin(): this {
    this.count = 0;
    return this;
  }

  push(model: Mat4, color: ArrayLike<number>, params: ArrayLike<number>): void {
    if (this.count >= this.mesh.size) return;
    this.mesh.set(this.count++, model, color, params);
  }

  end(): this {
    this.mesh.upload(this.count);
    return this;
  }

  draw(): void {
    this.mesh.draw(this.count);
  }
}
