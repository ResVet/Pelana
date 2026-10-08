// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A host and vector model of one dengue outbreak in a neighbourhood of 1,000
// people (after Esteva and Vargas 1998, with an aquatic stage for the
// mosquito). Humans are S, E, I, R plus P, protected by a vaccine. Mosquitoes
// are A (eggs, larvae and pupae in water), then S, E, I as adults; an adult
// mosquito that becomes infectious stays infectious for life.
//
// Parameter values sit inside the ranges collected by Andraud et al. 2012 and
// the incubation periods in the WHO guidelines. This is a teaching model and
// not a forecast for any real place.

export interface Params {
  /** Bites per mosquito per day. Andraud 2012: 0.3-1. */
  biting: number;
  /** Chance that a bite by an infectious mosquito infects a person. Andraud 2012: 0.1-0.75. */
  bh: number;
  /** Chance that biting an infectious person infects a mosquito. Andraud 2012: 0.5-1. */
  bv: number;
  /** Extrinsic incubation in the mosquito, days. WHO: 8-12. */
  eip: number;
  /** Intrinsic incubation in a person, days. WHO: 4-10. */
  iip: number;
  /** Infectious period of a person, days. Andraud 2012: 3-14. */
  infectious: number;
  /** Mean adult mosquito lifespan, days. Andraud 2012: 4-50. */
  lifespan: number;
  /** Mean time from egg to adult, days. CDC: 7-10. */
  development: number;
  /** Daily mortality in the aquatic stage. */
  aquaticMortality: number;
  /** Eggs per female per day that enter the water. */
  eggs: number;
  /** Adult mosquitoes per person at equilibrium in the rainy season with no breeding sites removed. */
  mosquitoesPerPerson: number;
  /** Breeding capacity in the dry season relative to the rainy season. */
  dryCapacity: number;
  /**
   * Share by which wMel cuts transmission when every local mosquito carries
   * it. Ferguson et al. 2015 estimate that wMel lowers R0 by 66-75%; the model
   * applies it to the chance that a mosquito picks up the virus.
   */
  wolbachiaBlock: number;
  /**
   * Share of vaccinated people the model treats as protected from infection.
   * Biswal 2019 measured 80.2% efficacy against dengue with symptoms,
   * confirmed in the laboratory, in the first year; the model assumes the
   * vaccine blocks infection as well, which the trial did not measure.
   */
  vaccineEfficacy: number;
  /** Extra adult mortality per day while fogging works. */
  fogKill: number;
  /** Days that one round of fogging keeps killing adults. */
  fogDays: number;
  /** People in the neighbourhood. */
  people: number;
}

export const PARAMS: Params = {
  biting: 0.5,
  bh: 0.4,
  bv: 0.6,
  eip: 10,
  iip: 6,
  infectious: 5,
  lifespan: 14,
  development: 8.5,
  aquaticMortality: 0.05,
  eggs: 5,
  mosquitoesPerPerson: 1.4,
  dryCapacity: 0.45,
  wolbachiaBlock: 0.7,
  vaccineEfficacy: 0.8,
  fogKill: 0.7,
  fogDays: 3,
  people: 1000,
};

export type Season = 'rainy' | 'dry';

export interface Controls {
  /** Share of breeding sites removed, 0-0.9. */
  breeding: number;
  /** Share of local mosquitoes carrying wMel, 0-1. */
  wolbachia: number;
  /** Share of people vaccinated before the outbreak, 0-0.8. */
  vaccine: number;
  season: Season;
  /** Days on which the neighbourhood is fogged. */
  fog: number[];
}

export const NO_ACTION: Controls = { breeding: 0, wolbachia: 0, vaccine: 0, season: 'rainy', fog: [] };

// State vector layout.
const S = 0, E = 1, I = 2, R = 3, P = 4, A = 5, SV = 6, EV = 7, IV = 8, C = 9;
const SIZE = 10;

export interface DayState {
  day: number;
  susceptible: number;
  exposed: number;
  infectious: number;
  recovered: number;
  protected: number;
  mosquitoes: number;
  infectiousMosquitoes: number;
  /** Cumulative new infections since day 0, including the first case. */
  cumulative: number;
}

export interface Result {
  days: DayState[];
  /** New infections in each week, week 1 = days 0-6. */
  weekly: number[];
  /** People infected over the whole run, including the first case. */
  total: number;
  /** Week with the most new infections (1-based), or 0 if nobody else was infected. */
  peakWeek: number;
  /** Reproduction number at the start, with the chosen measures in place. */
  r: number;
}

function capacity(params: Params, controls: Controls): number {
  // At equilibrium the adult population is (development rate / adult death
  // rate) * K * (1 - 1/Q). Solve for the K that gives the target density.
  const sigma = 1 / params.development;
  const mu = 1 / params.lifespan;
  const q = (params.eggs * sigma) / ((sigma + params.aquaticMortality) * mu);
  const target = params.mosquitoesPerPerson * params.people;
  const k = target / ((sigma / mu) * (1 - 1 / q));
  const season = controls.season === 'dry' ? params.dryCapacity : 1;
  return k * season * (1 - clamp(controls.breeding, 0, 0.95));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Adult mosquitoes and aquatic stage at equilibrium for a given capacity. */
export function equilibrium(params: Params, k: number): { aquatic: number; adults: number } {
  const sigma = 1 / params.development;
  const mu = 1 / params.lifespan;
  const q = (params.eggs * sigma) / ((sigma + params.aquaticMortality) * mu);
  if (q <= 1) return { aquatic: 0, adults: 0 };
  const aquatic = k * (1 - 1 / q);
  return { aquatic, adults: (sigma / mu) * aquatic };
}

/**
 * Reproduction number counted from person to person through the mosquito
 * (the Ross-Macdonald form): mosquitoes infected by one case, times the people
 * each of those mosquitoes goes on to infect. Above 1 an outbreak can grow.
 * The next-generation value per transmission step is its square root.
 */
export function reproductionNumber(params: Params, controls: Controls, susceptibleShare = 1): number {
  const { adults } = equilibrium(params, capacity(params, controls));
  const m = adults / params.people;
  const mu = 1 / params.lifespan;
  const gv = 1 / params.eip;
  const bv = params.bv * (1 - params.wolbachiaBlock * clamp(controls.wolbachia, 0, 1));
  const mosquitoesPerCase = params.biting * m * bv * params.infectious;
  const peoplePerMosquito = ((params.biting * params.bh * gv) / (mu * (gv + mu))) * susceptibleShare;
  return mosquitoesPerCase * peoplePerMosquito;
}

type Derivative = (t: number, y: Float64Array, out: Float64Array) => void;

/** One classical fourth-order Runge-Kutta step, in place. */
export function rk4Step(f: Derivative, t: number, y: Float64Array, dt: number, scratch: Float64Array[]): void {
  const [k1, k2, k3, k4, tmp] = scratch as [Float64Array, Float64Array, Float64Array, Float64Array, Float64Array];
  const n = y.length;
  f(t, y, k1);
  for (let i = 0; i < n; i++) tmp[i] = y[i]! + 0.5 * dt * k1[i]!;
  f(t + 0.5 * dt, tmp, k2);
  for (let i = 0; i < n; i++) tmp[i] = y[i]! + 0.5 * dt * k2[i]!;
  f(t + 0.5 * dt, tmp, k3);
  for (let i = 0; i < n; i++) tmp[i] = y[i]! + dt * k3[i]!;
  f(t + dt, tmp, k4);
  for (let i = 0; i < n; i++) y[i] = y[i]! + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!);
}

export function makeScratch(n: number): Float64Array[] {
  return Array.from({ length: 5 }, () => new Float64Array(n));
}

export const DAYS = 245;

export function simulate(controls: Controls, params: Params = PARAMS, days = DAYS, dt = 0.5): Result {
  const k = capacity(params, controls);
  const eq = equilibrium(params, k);
  const people = params.people;
  const vaccinated = clamp(controls.vaccine, 0, 0.8) * people;
  const protectedPeople = vaccinated * params.vaccineEfficacy;

  const sigma = 1 / params.development;
  const mu = 1 / params.lifespan;
  const gv = 1 / params.eip;
  const gh = 1 / params.iip;
  const recover = 1 / params.infectious;
  const bv = params.bv * (1 - params.wolbachiaBlock * clamp(controls.wolbachia, 0, 1));
  const fogs = [...controls.fog].sort((x, y) => x - y);

  const fogMortality = (t: number): number => {
    let extra = 0;
    for (const f of fogs) if (t >= f && t < f + params.fogDays) extra += params.fogKill;
    return extra;
  };

  const f: Derivative = (t, y, out) => {
    const nv = y[SV]! + y[EV]! + y[IV]!;
    const deathV = mu + fogMortality(t);
    const forceH = (params.biting * params.bh * y[IV]!) / people;
    const forceV = (params.biting * bv * y[I]!) / people;
    const newH = forceH * y[S]!;
    const newV = forceV * y[SV]!;
    out[S] = -newH;
    out[E] = newH - gh * y[E]!;
    out[I] = gh * y[E]! - recover * y[I]!;
    out[R] = recover * y[I]!;
    out[P] = 0;
    out[A] = params.eggs * nv * Math.max(0, 1 - y[A]! / Math.max(k, 1e-9)) - (sigma + params.aquaticMortality) * y[A]!;
    out[SV] = sigma * y[A]! - newV - deathV * y[SV]!;
    out[EV] = newV - (gv + deathV) * y[EV]!;
    out[IV] = gv * y[EV]! - deathV * y[IV]!;
    out[C] = newH;
  };

  const y = new Float64Array(SIZE);
  y[S] = people - protectedPeople - 1;
  y[I] = 1;
  y[P] = protectedPeople;
  y[A] = eq.aquatic;
  y[SV] = eq.adults;
  y[C] = 1;

  const scratch = makeScratch(SIZE);
  const out: DayState[] = [];
  const record = (day: number) => {
    out.push({
      day,
      susceptible: y[S]!,
      exposed: y[E]!,
      infectious: y[I]!,
      recovered: y[R]!,
      protected: y[P]!,
      mosquitoes: y[SV]! + y[EV]! + y[IV]!,
      infectiousMosquitoes: y[IV]!,
      cumulative: y[C]!,
    });
  };
  record(0);
  const stepsPerDay = Math.round(1 / dt);
  for (let day = 1; day <= days; day++) {
    for (let s = 0; s < stepsPerDay; s++) {
      const t = day - 1 + s * dt;
      rk4Step(f, t, y, dt, scratch);
      for (let i = 0; i < SIZE; i++) if (y[i]! < 0) y[i] = 0;
    }
    record(day);
  }

  const weekly: number[] = [];
  for (let w = 0; w * 7 < days; w++) {
    const start = out[w * 7]!.cumulative;
    const end = out[Math.min(days, (w + 1) * 7)]!.cumulative;
    weekly.push(Math.max(0, end - start));
  }
  let peakWeek = 0;
  let peak = 0.5;
  weekly.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      peakWeek = i + 1;
    }
  });

  return {
    days: out,
    weekly,
    total: out[out.length - 1]!.cumulative,
    peakWeek,
    r: reproductionNumber(params, controls, (people - protectedPeople) / people),
  };
}
