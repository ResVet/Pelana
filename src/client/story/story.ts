// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// The scroll timeline. The page scrolls natively; this module reads where
// each chapter's text sits relative to the viewport and turns that into a
// continuous day value, the current scene and how far the hand-over to the
// next scene has gone. A spring smooths the day so the counter, the chart and
// the camera glide instead of stepping.

import { BEATS, COURSE, type Beat, type BeatKey, type Phase, type SceneId, courseAt, phaseOf, railIndex } from '../../shared/course.ts';
import { $, $$, clamp, pageData, setText } from '../core/dom.ts';
import { Mosaic, fontReady } from '../core/mosaic.ts';
import { Spring, onFrame, smooth } from '../core/motion.ts';
import { isDark, onPrefs, reducedMotion } from '../core/prefs.ts';
import { tick } from '../core/sound.ts';
import type { PartKey, Stage, StoryState } from './types.ts';

interface Strings {
  before: string;
  during: string;
  after: string;
  phases: Record<Phase, string>;
  parts: Record<PartKey, string>;
  layers: string[];
}

interface Marker {
  beat: Beat;
  el: HTMLElement;
  /** Scroll position at which this beat becomes current. */
  at: number;
}

// The saddle chapter carries its own full chart, so the stage shows none there.
const OVERLAYS: Partial<Record<SceneId, string>> = {
  chart: 'chart',
  leak: 'tube',
  heal: 'tube',
};

export class Story {
  private readonly root: HTMLElement;
  private readonly strings: Strings;
  private markers: Marker[] = [];
  /** Scroll position at which the big "fever breaks" line comes up from the bottom of a phone screen; null on wide screens. */
  private takeoverFrom: number | null = null;
  private stage: Stage | null = null;
  private readonly day = new Spring(-30, 0.18);
  private state: StoryState;
  private mosaic: Mosaic | null = null;
  private shownDay = Number.NaN;
  private readonly lang: 'en' | 'id';
  private running: (() => void) | null = null;

  private readonly counterLabel = $('[data-counter-label]');
  private readonly counterText = $('[data-counter-text]');
  private readonly counterPhase = $('[data-counter-phase]');
  private readonly tiles = $$<HTMLElement>('.dayrail__tile');
  private readonly chart = $('.stage__overlay .feverchart');
  private readonly tubeCells = $<SVGRectElement>('[data-tube-cells]');
  private readonly tubeBuffy = $<SVGRectElement>('[data-tube-buffy]');
  private readonly tubeValue = $('[data-tube-value]');
  private readonly takeover = $('[data-takeover]');

  constructor(root: HTMLElement) {
    this.root = root;
    const data = pageData<Strings>();
    this.strings = data.strings;
    this.lang = data.lang;
    const first = BEATS[0]!;
    this.state = { day: first.day, beat: 0, progress: 0, scene: first.scene, nextScene: first.scene, blend: 0, key: first.key };
    this.measure();
    this.bind();
    this.read(true);
    void this.initMosaic();
  }

  attach(stage: Stage): void {
    this.stage = stage;
    stage.update(this.state);
    // Controls that only act on the 3D appear now that it runs.
    $$<HTMLElement>('[data-needs-gl]', this.root).forEach((el) => el.removeAttribute('hidden'));
  }

  private measure = (): void => {
    const vh = window.innerHeight;
    const desktop = window.matchMedia('(min-width: 64rem)').matches;
    this.markers = BEATS.map((beat) => {
      const el = beat.key === 'hero' ? this.root.querySelector<HTMLElement>('.beat--hero')! : document.getElementById(beat.key)!;
      const text = el.querySelector<HTMLElement>('.beat__text') ?? el;
      const top = text.getBoundingClientRect().top + window.scrollY;
      // A chapter takes over when its text is about two-thirds of the way up
      // the screen (on phones, where the text sits low, a little earlier).
      const line = desktop ? 0.62 : 0.72;
      return { beat, el, at: beat.key === 'hero' ? 0 : Math.max(0, top - vh * line) };
    });
    // On phones the chart and the big line would cross, so the chart steps
    // aside once the line comes on screen. On wide screens the line stays in
    // the left half and the chart in the right. The line is sticky, so its
    // place is read from its section, which is not.
    const section = this.takeover?.closest<HTMLElement>('section');
    this.takeoverFrom =
      section && !desktop ? section.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(section).paddingTop) - vh : null;
  };

  private bind(): void {
    const ro = new ResizeObserver(() => {
      this.measure();
      this.read(false);
      this.stage?.resize();
      this.mosaic?.resize();
    });
    ro.observe(document.documentElement);
    window.addEventListener('scroll', () => this.read(false), { passive: true });
    document.fonts?.ready.then(() => {
      this.measure();
      this.read(false);
    });

    // Tiles on the rail jump to their chapter (desktop pointer convenience;
    // the chapter list is the keyboard route).
    $$<HTMLElement>('[data-rail-beat]').forEach((seg) => {
      seg.addEventListener('click', () => this.jumpTo(seg.dataset.railBeat as BeatKey));
    });
    $$<HTMLAnchorElement>('[data-chapter]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.jumpTo(link.dataset.chapter as BeatKey);
        history.replaceState(null, '', link.hash);
      });
    });

    this.bindDrain();
    this.bindParts();
    this.bindExplode();
    $$<HTMLButtonElement>('[data-turn-by]', this.root).forEach((button) => {
      button.addEventListener('click', () => this.stage?.turn(Number(button.dataset.turnBy)));
    });
    onPrefs(() => this.paintCounter(true));
  }

  private jumpTo(key: BeatKey): void {
    const marker = this.markers.find((m) => m.beat.key === key);
    if (!marker) return;
    const target = key === 'hero' ? 0 : marker.at + window.innerHeight * 0.02;
    window.scrollTo({ top: target, behavior: reducedMotion() ? 'auto' : 'smooth' });
    // Move focus to the chapter heading for keyboard and screen reader users.
    const heading = marker.el.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      // After the chapter list has closed, which would otherwise take focus back.
      setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  }

  /** Reads the scroll position and sets the targets. Cheap: no layout reads. */
  private read = (instant: boolean): void => {
    const y = window.scrollY;
    const ms = this.markers;
    let i = 0;
    while (i < ms.length - 1 && y >= ms[i + 1]!.at) i++;
    const current = ms[i]!;
    const next = ms[Math.min(i + 1, ms.length - 1)]!;
    const span = Math.max(1, next.at - current.at);
    const progress = i === ms.length - 1 ? clamp((y - current.at) / window.innerHeight, 0, 1) : clamp((y - current.at) / span, 0, 1);
    const dayTarget = current.beat.day + (next.beat.day - current.beat.day) * smooth(0.15, 0.95, progress);
    this.day.target = dayTarget;
    if (instant || reducedMotion()) this.day.snap(dayTarget);
    const blend = next.beat.scene === current.beat.scene ? 0 : smooth(0.72, 1, progress);
    this.state = {
      ...this.state,
      beat: i,
      progress,
      scene: current.beat.scene,
      nextScene: next.beat.scene,
      blend,
      key: current.beat.key,
    };
    if (!this.running && !this.day.settled()) this.running = onFrame(this.frame);
    this.root.dataset.scene = current.beat.scene;
    // The big "fever breaks" line steps aside before the paragraphs under it arrive.
    let lineInView = false;
    if (this.takeover) {
      const at = ms.findIndex((m) => m.beat.key === 'breaks');
      const shown = i < at ? 1 : i > at ? 0 : 1 - smooth(0.2, 0.36, progress);
      this.takeover.style.opacity = shown.toFixed(3);
      lineInView = this.takeoverFrom !== null && y > this.takeoverFrom && shown > 0;
    }
    const overlay = [OVERLAYS[current.beat.scene], blend > 0.5 ? OVERLAYS[next.beat.scene] : undefined]
      .filter((o) => o && !(o === 'chart' && lineInView))
      .join(' ');
    if (this.root.dataset.overlay !== overlay) this.root.dataset.overlay = overlay;
    this.paintFrame();
  };

  private frame = (dt: number): boolean => {
    this.day.step(dt);
    this.paintFrame();
    if (this.day.settled()) {
      this.running = null;
      return false;
    }
    return true;
  };

  private paintFrame(): void {
    const day = this.day.value;
    this.state = { ...this.state, day };
    this.stage?.update(this.state);
    this.paintCounter(false);
    this.paintChart(day);
  }

  /** The whole number shown for a continuous day: never zero, there is no day 0. */
  private displayDay(day: number): number {
    let d = Math.round(day);
    if (d === 0) d = day < 0 ? -1 : 1;
    return d;
  }

  private paintCounter(force: boolean): void {
    const d = this.displayDay(this.day.value);
    if (d === this.shownDay && !force) return;
    if (!force && !Number.isNaN(this.shownDay)) tick(0.9 + (railIndex(d) / 40) * 0.35);
    this.shownDay = d;
    const phase = phaseOf(d);
    this.root.dataset.phase = phase;
    const after = this.state.key === 'again';
    setText(this.counterLabel, after ? this.strings.after : d < 0 ? this.strings.before : this.strings.during);
    setText(this.counterText, String(Math.abs(d)));
    setText(this.counterPhase, this.strings.phases[phase]);
    const index = railIndex(d);
    this.tiles.forEach((tile, i) => {
      tile.toggleAttribute('data-on', i <= index);
      tile.toggleAttribute('data-current', i === index);
    });
    this.mosaic?.set(String(Math.abs(d)), this.phaseColor(phase));
  }

  private phaseColor(phase: Phase): string {
    return getComputedStyle(document.documentElement).getPropertyValue(`--ph-${phase}`).trim() || '#0f2c32';
  }

  private paintChart(day: number): void {
    if (!this.chart || day < 0.5) return;
    const d = clamp(day, 1, COURSE.length);
    const reveal = ((d - 0.5) / COURSE.length) * 100 + 2.5;
    const cursor = ((d - 0.5) / COURSE.length) * 100;
    const values = courseAt(d);
    const nf = (v: number, digits = 0) =>
      new Intl.NumberFormat(this.lang === 'id' ? 'id-ID' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    this.chart.querySelectorAll<HTMLElement>('.fpanel__plot').forEach((plot) => {
      plot.style.setProperty('--reveal', `${reveal.toFixed(2)}%`);
      plot.style.setProperty('--cursor', `${cursor.toFixed(2)}%`);
    });
    const set = (series: string, text: string) => setText(this.chart!.querySelector(`[data-series="${series}"] [data-value]`), text);
    set('temp', `${nf(values.temp, 1)}\u00a0°C`);
    set('hct', `${nf(values.hct)}%`);
    set('plt', nf(Math.round(values.plt) * 1000));
    const today = Math.round(d);
    this.chart.querySelectorAll<HTMLElement>('.feverchart__days span').forEach((el) => {
      el.toggleAttribute('data-now', Number(el.dataset.day) === today);
    });
    if (this.tubeCells && this.tubeBuffy) {
      const height = 200 * (values.hct / 100);
      this.tubeCells.setAttribute('y', (210 - height).toFixed(1));
      this.tubeCells.setAttribute('height', height.toFixed(1));
      this.tubeBuffy.setAttribute('y', (207 - height).toFixed(1));
      setText(this.tubeValue, `${nf(values.hct)}%`);
    }
  }

  private async initMosaic(): Promise<void> {
    const canvas = $<HTMLCanvasElement>('[data-mosaic]', this.root);
    if (!canvas) return;
    await fontReady();
    this.mosaic = new Mosaic(canvas, { rows: 9, cols: 7, align: 'right', still: reducedMotion });
    const colors = () => this.mosaic?.setColors(this.phaseColor(phaseOf(this.displayDay(this.day.value))), isDark() ? 'rgba(220,233,230,0.075)' : 'rgba(15,44,50,0.07)');
    colors();
    this.paintCounter(true);
    $('[data-counter]')?.setAttribute('data-mosaic-ready', '');
    onPrefs(colors);
  }

  private bindDrain(): void {
    const box = $('[data-drain]');
    if (!box) return;
    const drain = $<HTMLButtonElement>('[data-action="drain"]', box);
    const refill = $<HTMLButtonElement>('[data-action="refill"]', box);
    const note = $('[data-drained]', box);
    drain?.addEventListener('click', () => {
      this.stage?.drain(true);
      note?.removeAttribute('hidden');
      refill?.removeAttribute('hidden');
      drain.setAttribute('hidden', '');
      refill?.focus();
    });
    refill?.addEventListener('click', () => {
      this.stage?.drain(false);
      note?.setAttribute('hidden', '');
      refill.setAttribute('hidden', '');
      drain?.removeAttribute('hidden');
      drain?.focus();
    });
  }

  private bindParts(): void {
    const buttons = $$<HTMLButtonElement>('[data-part]');
    const note = $('[data-part-note]');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const pressed = button.getAttribute('aria-pressed') === 'true';
        buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        const part = pressed ? null : (button.dataset.part as PartKey);
        if (part) button.setAttribute('aria-pressed', 'true');
        setText(note, part ? this.strings.parts[part] : '');
        this.stage?.highlight(part);
      });
    });
  }

  private bindExplode(): void {
    const input = $<HTMLInputElement>('[data-explode-input]');
    if (!input) return;
    const update = () => {
      const level = Number(input.value);
      input.setAttribute('aria-valuetext', this.strings.layers[level] ?? '');
      input.style.setProperty('--fill', `${(level / 3) * 100}%`);
      this.stage?.explode(level);
    };
    input.addEventListener('input', update);
    update();
  }
}
