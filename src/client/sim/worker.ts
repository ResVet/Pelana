// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Runs the outbreak model off the main thread, so dragging a slider never
// waits for the solver. Each request carries an id; the page only uses the
// newest answer.

import { type Controls, NO_ACTION, type Result, type Season, simulate } from '../../shared/model.ts';

export interface SimRequest {
  id: number;
  controls: Controls;
}

export interface SimResponse {
  id: number;
  current: Result;
  baseline: Result;
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<SimRequest>) => void) | null;
  postMessage(message: SimResponse): void;
}

const scope = self as unknown as WorkerScope;

// The "no action" run only depends on the season, so it is computed once per season.
const baselines = new Map<Season, Result>();

scope.onmessage = (event) => {
  const { id, controls } = event.data;
  let baseline = baselines.get(controls.season);
  if (!baseline) {
    baseline = simulate({ ...NO_ACTION, season: controls.season });
    baselines.set(controls.season, baseline);
  }
  scope.postMessage({ id, current: simulate(controls), baseline });
};
