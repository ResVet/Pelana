// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Entry for the text pages (sources, about, not found).

import { $ } from '../core/dom.ts';
import { Mosaic, fontReady } from '../core/mosaic.ts';
import { isDark, onPrefs, reducedMotion } from '../core/prefs.ts';
import { initPage } from '../core/ui.ts';

initPage();

const canvas = $<HTMLCanvasElement>('[data-mosaic]');
if (canvas) {
  const text = canvas.dataset.mosaicText ?? '';
  const holder = canvas.parentElement;
  void fontReady().then(() => {
    const mosaic = new Mosaic(canvas, { rows: 9, align: 'left', still: reducedMotion });
    const colors = () => {
      const style = getComputedStyle(document.documentElement);
      mosaic.setColors(style.getPropertyValue('--c-water').trim(), isDark() ? 'rgba(220,233,230,0.07)' : 'rgba(15,44,50,0.07)');
    };
    colors();
    mosaic.set(text);
    holder?.setAttribute('data-mosaic-ready', '');
    onPrefs(colors);
    // Text size and rotation change the height the numerals are drawn at.
    if (holder) new ResizeObserver(() => mosaic.resize()).observe(holder);
  });
}
