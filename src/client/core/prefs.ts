// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Comfort settings: colours, text size, contrast, motion and sound. They are
// stored on the device, applied as data attributes on <html> (the inline
// pre-paint script applies them before first paint), and broadcast to any
// code that needs to react, such as the 3D renderer pausing for reduced
// motion.

import { readJSON, writeJSON } from './storage.ts';

export interface Prefs {
  theme: 'system' | 'light' | 'dark';
  text: 'normal' | 'large' | 'larger';
  contrast: 'standard' | 'high';
  motion: 'system' | 'full' | 'reduced';
  sound: 'off' | 'on';
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  text: 'normal',
  contrast: 'standard',
  motion: 'system',
  sound: 'off',
};

const VALID: { [K in keyof Prefs]: readonly Prefs[K][] } = {
  theme: ['system', 'light', 'dark'],
  text: ['normal', 'large', 'larger'],
  contrast: ['standard', 'high'],
  motion: ['system', 'full', 'reduced'],
  sound: ['off', 'on'],
};

type Listener = (prefs: Prefs) => void;
const listeners = new Set<Listener>();

function sanitize(raw: Partial<Record<keyof Prefs, unknown>>): Prefs {
  const out: Prefs = { ...DEFAULT_PREFS };
  for (const key of Object.keys(VALID) as (keyof Prefs)[]) {
    const value = raw[key];
    if ((VALID[key] as readonly unknown[]).includes(value)) {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

let current: Prefs = sanitize(readJSON<Partial<Prefs>>('prefs', {}));

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function prefs(): Prefs {
  return current;
}

export function reducedMotion(): boolean {
  if (current.motion === 'reduced') return true;
  if (current.motion === 'full') return false;
  return reducedQuery.matches;
}

export function isDark(): boolean {
  if (current.theme === 'dark') return true;
  if (current.theme === 'light') return false;
  return darkQuery.matches;
}

function apply(): void {
  const root = document.documentElement;
  for (const key of Object.keys(VALID) as (keyof Prefs)[]) root.setAttribute(`data-${key}`, current[key]);
  // The browser bar follows the chosen theme; back on "system" each tag gets
  // its own colour and media query again.
  const color = isDark() ? '#0b1d21' : '#e7eeec';
  THEME_COLORS.forEach(({ meta, content, media }) => {
    if (current.theme === 'system') {
      meta.content = content;
      if (media) meta.media = media;
    } else {
      meta.content = color;
      meta.removeAttribute('media');
    }
  });
}

const THEME_COLORS = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'), (meta) => ({
  meta,
  content: meta.content,
  media: meta.getAttribute('media') ?? '',
}));

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  if (!(VALID[key] as readonly unknown[]).includes(value) || current[key] === value) return;
  current = { ...current, [key]: value };
  writeJSON('prefs', current);
  apply();
  listeners.forEach((fn) => fn(current));
}

export function onPrefs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function systemChanged(): void {
  apply();
  listeners.forEach((fn) => fn(current));
}

reducedQuery.addEventListener?.('change', systemChanged);
darkQuery.addEventListener?.('change', systemChanged);

apply();
