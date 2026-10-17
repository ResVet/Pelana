// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// What every 3D world on the story page receives each frame, and what it
// must provide.

import type { SceneId } from '../../shared/course.ts';
import { smooth } from '../core/motion.ts';
import type { Target } from '../gl/gpu.ts';
import type { PartKey } from '../story/types.ts';

export interface Frame {
  /** Animation clock in seconds. It stands still when motion is reduced. */
  time: number;
  dt: number;
  width: number;
  height: number;
  aspect: number;
  dark: boolean;
  reduced: boolean;
  /** Where the words sit: beside the picture on wide screens, under it on phones. */
  layout: 'wide' | 'tall';
}

export interface WorldInput {
  scene: SceneId;
  next: SceneId;
  /** How far the hand-over from `scene` to `next` has gone, 0..1. */
  blend: number;
  /** How far through the current chapter the reader is, 0..1. */
  progress: number;
  day: number;
  /** Drained tub, 0..1. */
  drain: number;
  highlight: PartKey | null;
  highlightAmount: number;
  /** Layers taken off the virus particle, 0..3. */
  explode: number;
  /** Turn added by dragging, in radians. */
  yaw: number;
  pitch: number;
}

export interface World {
  render(target: Target, input: WorldInput, frame: Frame): void;
  dispose(): void;
}

/**
 * Off-centre framing: the subject moves right of the words on wide screens,
 * and above them on phones, where the words come up from the bottom. Phones
 * held sideways and small tablets keep the cards on the left, so there the
 * subject drifts right as the screen gets wider.
 */
export function framing(frame: Frame, wide = 0.3, tall = 0.38): [number, number] {
  if (frame.layout === 'wide') return [wide, 0];
  if (frame.aspect < 1) return [0, tall];
  const k = smooth(1, 1.6, frame.aspect);
  return [wide * k, tall * 0.45 * (1 - k)];
}
