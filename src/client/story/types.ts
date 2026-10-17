// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { BeatKey, SceneId } from '../../shared/course.ts';

/** What the story tells the 3D stage on every frame it changes. */
export interface StoryState {
  /** Continuous day value, e.g. -29.4. */
  day: number;
  /** Index of the current beat and progress through it, 0..1. */
  beat: number;
  progress: number;
  scene: SceneId;
  /** Scene of the next beat, and how far the hand-over to it has gone (0..1). */
  nextScene: SceneId;
  blend: number;
  key: BeatKey;
}

export type PartKey = 'lyre' | 'legs' | 'proboscis' | 'wings';

/** The 3D stage, loaded on demand. Every method is safe to call at any time. */
export interface Stage {
  update(state: StoryState): void;
  drain(on: boolean): void;
  highlight(part: PartKey | null): void;
  explode(level: number): void;
  /** Turns the model a step, for the buttons that stand in for dragging. */
  turn(direction: number): void;
  resize(): void;
  setActive(active: boolean): void;
  dispose(): void;
}
