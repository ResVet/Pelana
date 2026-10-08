// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Mosaic numerals. Text is rasterised in Plus Jakarta Sans at a large size,
// then sampled onto a coarse grid; every cell becomes a small glazed tile
// whose size follows how much of the glyph covers it, so the numerals keep
// the typeface's shape at a few dozen tiles. When the text changes, tiles
// flip like split-flap letters in a wave from left to right.

import { onFrame } from './motion.ts';

export interface MosaicOptions {
  rows: number;
  /** Number of columns to reserve, so a counter does not change width. */
  cols?: number;
  align?: 'left' | 'right' | 'center';
  weight?: number;
  /** Return true to skip the flip animation. */
  still?: () => boolean;
}

type Grid = Float32Array;

const FONT_FAMILY = '"Plus Jakarta Sans", "Pelana Fallback", system-ui, sans-serif';
const FLIP = 0.26;
const STAGGER = 0.022;

export class Mosaic {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly opts: Required<Omit<MosaicOptions, 'cols'>> & { cols: number | undefined };
  private readonly sample = document.createElement('canvas');
  private text = '';
  private color = '#0f2c32';
  private grout = 'rgba(15,44,50,0.08)';
  private cols = 0;
  private from: Grid = new Float32Array(0);
  private to: Grid = new Float32Array(0);
  private fromColor = this.color;
  private started = 0;
  private clock = 0;
  private stop: (() => void) | null = null;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, opts: MosaicOptions) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.opts = {
      rows: opts.rows,
      cols: opts.cols,
      align: opts.align ?? 'right',
      weight: opts.weight ?? 800,
      still: opts.still ?? (() => false),
    };
  }

  setColors(tile: string, grout: string): void {
    this.color = tile;
    this.grout = grout;
    this.draw(1);
  }

  /** Shows `text`, flipping from whatever is on screen. */
  set(text: string, color?: string): void {
    if (text === this.text && (!color || color === this.color)) return;
    const next = this.rasterise(text);
    const previous = this.currentGrid();
    this.fromColor = this.color;
    if (color) this.color = color;
    this.text = text;
    this.from = previous.length === next.length ? previous : new Float32Array(next.length);
    this.to = next;
    if (this.opts.still()) {
      this.from = next;
      this.draw(1);
      return;
    }
    this.started = this.clock;
    if (!this.stop) {
      this.stop = onFrame((dt) => {
        this.clock += dt;
        const done = this.draw(this.clock - this.started);
        if (done) {
          this.from = this.to;
          this.stop = null;
          return false;
        }
        return true;
      });
    }
  }

  /** Re-measures the canvas after a layout change and redraws. */
  resize(): void {
    // The CSS height may have changed even when the number of columns has
    // not, so the backing store is always matched to it again.
    if (this.cols) this.layout();
    const grid = this.text ? this.rasterise(this.text) : new Float32Array(0);
    this.from = grid;
    this.to = grid;
    this.draw(1e3);
  }

  private currentGrid(): Grid {
    // Mid-flip, treat cells that have already turned as showing the new value.
    if (!this.stop) return this.to;
    const out = new Float32Array(this.to.length);
    const elapsed = this.clock - this.started;
    for (let i = 0; i < out.length; i++) {
      const col = i % this.cols;
      out[i] = elapsed - col * STAGGER > FLIP / 2 ? this.to[i]! : this.from[i]!;
    }
    return out;
  }

  private rasterise(text: string): Grid {
    const rows = this.opts.rows;
    const cell = 24;
    const size = rows * cell * 1.32;
    const font = `${this.opts.weight} ${size}px ${FONT_FAMILY}`;
    const s = this.sample;
    const sctx = s.getContext('2d', { willReadFrequently: true });
    if (!sctx) return new Float32Array(0);
    sctx.font = font;
    const metrics = sctx.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.72;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const glyphHeight = ascent + descent;
    const scale = (rows * cell) / glyphHeight;
    const width = Math.ceil(metrics.width * scale);
    const needCols = Math.ceil(width / cell) + 1;
    const cols = Math.max(needCols, this.opts.cols ?? 0);
    if (cols !== this.cols) {
      this.cols = cols;
      this.layout();
    }
    s.width = cols * cell;
    s.height = rows * cell;
    sctx.clearRect(0, 0, s.width, s.height);
    sctx.save();
    const x =
      this.opts.align === 'right' ? s.width - width - cell * 0.35 : this.opts.align === 'center' ? (s.width - width) / 2 : cell * 0.35;
    sctx.translate(x, 0);
    sctx.scale(scale, scale);
    sctx.font = font;
    sctx.fillStyle = '#000';
    sctx.textBaseline = 'alphabetic';
    sctx.fillText(text, 0, ascent);
    sctx.restore();
    const data = sctx.getImageData(0, 0, s.width, s.height).data;
    const grid = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        // Sample a 6x6 lattice inside each cell.
        for (let sy = 0; sy < 6; sy++) {
          for (let sx = 0; sx < 6; sx++) {
            const px = Math.floor(c * cell + (sx + 0.5) * (cell / 6));
            const py = Math.floor(r * cell + (sy + 0.5) * (cell / 6));
            sum += data[(py * s.width + px) * 4 + 3]!;
          }
        }
        grid[r * cols + c] = sum / (36 * 255);
      }
    }
    return grid;
  }

  private layout(): void {
    const rect = this.canvas.getBoundingClientRect();
    const height = rect.height || 80;
    const cssCell = height / this.opts.rows;
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.canvas.style.width = `${Math.round(cssCell * this.cols)}px`;
    this.canvas.width = Math.round(cssCell * this.cols * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
  }

  /** Draws the grid at `elapsed` seconds into a flip. Returns true when the flip is complete. */
  private draw(elapsed: number): boolean {
    const { ctx, canvas } = this;
    const rows = this.opts.rows;
    const cols = this.cols;
    if (!cols) return true;
    const cell = canvas.height / rows;
    const gap = Math.max(1, cell * 0.11);
    const radius = Math.max(1, cell * 0.14);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let done = true;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const t = (elapsed - c * STAGGER - (r % 2) * 0.008) / FLIP;
        let coverage: number;
        let squash = 1;
        let color = this.color;
        if (t >= 1) {
          coverage = this.to[i] ?? 0;
        } else {
          done = false;
          if (t <= 0) {
            coverage = this.from[i] ?? 0;
            color = this.fromColor;
          } else if (t < 0.5) {
            coverage = this.from[i] ?? 0;
            color = this.fromColor;
            squash = Math.cos(t * Math.PI);
          } else {
            coverage = this.to[i] ?? 0;
            squash = -Math.cos(t * Math.PI);
          }
        }
        const x = c * cell;
        const y = r * cell;
        // Bare tile, so the grid reads even where the numeral is not.
        ctx.fillStyle = this.grout;
        roundRect(ctx, x + gap / 2, y + gap / 2, cell - gap, cell - gap, radius);
        if (coverage < 0.06) continue;
        const k = Math.min(1, 0.32 + Math.sqrt(coverage) * 0.78);
        const size = (cell - gap) * k;
        const h = size * Math.max(0.02, squash);
        ctx.fillStyle = color;
        roundRect(ctx, x + (cell - size) / 2, y + (cell - h) / 2, size, h, Math.min(radius, h / 2));
      }
    }
    return done;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

/** Waits for the display weight of the web font, so the first raster uses it. */
export async function fontReady(weight = 800): Promise<void> {
  try {
    await document.fonts.load(`${weight} 64px "Plus Jakarta Sans"`, '0123456789−');
  } catch {
    // Fall back to whatever font is available.
  }
}
