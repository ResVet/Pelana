// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

import type { SpotKey } from '../../shared/house.ts';

export interface HouseState {
  done: Set<SpotKey>;
  selected: SpotKey | null;
}

export interface HouseStageOptions {
  labels: Record<SpotKey, string>;
  onSelect: (key: SpotKey) => void;
}

export interface HouseStage {
  update(state: HouseState): void;
  focus(key: SpotKey | null): void;
  /** Turns the house a step, for the buttons that stand in for dragging. */
  turn(direction: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}
