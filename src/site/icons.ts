// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Icons drawn for Pelana on a 24-unit grid with a 1.75 stroke. They are
// decorative (aria-hidden); every control that uses one also has a text label.

import { Html, raw } from './html.ts';

const PATHS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/>',
  print:
    '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  chat: '<path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.3-3.6A7.9 7.9 0 0 1 4 12z"/><path d="M9 11h6M9 14h4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  drop: '<path d="M12 3.5c3.5 4.4 6 7.7 6 10.5a6 6 0 0 1-12 0c0-2.8 2.5-6.1 6-10.5z"/>',
  thermometer:
    '<path d="M10 14.8V5a2 2 0 0 1 4 0v9.8a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  sound: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
  fog: '<path d="M4 9h11a3 3 0 1 0-3-3M4 13h15M6 17h9a3 3 0 1 1-3 3"/>',
  tile: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  turnLeft: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>',
  turnRight: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4.5h-4.5"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, className = 'icon'): Html {
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`,
  );
}

/**
 * The Pelana mark: one glazed tile with the fever curve running across it.
 * The curve rises, dips and rises a little again, the saddle the project is
 * named after. Used for the favicon and the header.
 */
export function mark(className = 'mark'): Html {
  return raw(
    `<svg class="${className}" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">` +
      `<rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="var(--mark-tile, #1d6a71)"/>` +
      `<path d="M6 21.5C8 12 10.5 8.5 13 12.5s3.2 9.5 5.6 7.6S22.8 13 26 15" fill="none" stroke="var(--mark-line, #f4f8f7)" stroke-width="2.6" stroke-linecap="round"/>` +
      `</svg>`,
  );
}
