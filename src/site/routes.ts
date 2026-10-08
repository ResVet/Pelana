// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.

export type Lang = 'en' | 'id';
export const LANGS: Lang[] = ['id', 'en'];

export type PageKey = 'home' | 'tracker' | 'testing' | 'house' | 'outbreak' | 'sources' | 'about';

/** URL of every page in each language. Slugs are translated so each page reads naturally in its own language. */
export const ROUTES: Record<PageKey, Record<Lang, string>> = {
  home: { en: '/en/', id: '/id/' },
  tracker: { en: '/en/count-the-days/', id: '/id/hitung-hari/' },
  testing: { en: '/en/testing/', id: '/id/tes-darah/' },
  house: { en: '/en/house-check/', id: '/id/cek-rumah/' },
  outbreak: { en: '/en/outbreak/', id: '/id/simulasi-wabah/' },
  sources: { en: '/en/sources/', id: '/id/sumber/' },
  about: { en: '/en/about/', id: '/id/tentang/' },
};

export const PAGE_KEYS = Object.keys(ROUTES) as PageKey[];

export const TOOL_KEYS = ['tracker', 'testing', 'house', 'outbreak'] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export function href(lang: Lang, page: PageKey, hash = ''): string {
  return ROUTES[page][lang] + (hash ? `#${hash}` : '');
}

export function other(lang: Lang): Lang {
  return lang === 'en' ? 'id' : 'en';
}

/** Path of the HTML file a route is written to inside dist/. */
export function fileFor(path: string): string {
  return path.replace(/^\//, '') + 'index.html';
}
