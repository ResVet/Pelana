// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Behaviour shared by every page: the settings and menu sheets, the Tools
// disclosure, the language switch and the masthead that tucks away while you
// read.

import './sound.ts';
import { $, $$ } from './dom.ts';
import { type Prefs, onPrefs, prefs, setPref } from './prefs.ts';

function initDialogs(): void {
  let opener: HTMLElement | null = null;

  $$<HTMLButtonElement>('[data-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.open ?? '') as HTMLDialogElement | null;
      if (!dialog || typeof dialog.showModal !== 'function') return;
      // One sheet at a time: opening settings from the menu closes the menu.
      $$<HTMLDialogElement>('dialog[open]').forEach((d) => d !== dialog && d.close());
      opener = button;
      dialog.showModal();
      button.setAttribute('aria-expanded', 'true');
    });
  });

  $$<HTMLDialogElement>('dialog.sheet').forEach((dialog) => {
    // Close when the backdrop (the dialog element itself) is clicked.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      $$(`[data-open="${dialog.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
      if (opener && document.contains(opener) && opener.offsetParent !== null) opener.focus();
      opener = null;
    });
    // Links inside a sheet (chapters, menu) close it after navigating, and
    // focus stays wherever the link sent it rather than going back to the opener.
    dialog.addEventListener('click', (event) => {
      const link = (event.target as Element).closest('a[href^="#"]');
      if (!link) return;
      opener = null;
      dialog.close();
    });
  });
}

function initSettings(): void {
  const sync = (p: Prefs) => {
    $$<HTMLFieldSetElement>('[data-pref]').forEach((set) => {
      const key = set.dataset.pref as keyof Prefs;
      $$<HTMLInputElement>('input[type="radio"]', set).forEach((input) => {
        input.checked = input.value === p[key];
      });
    });
  };
  $$<HTMLFieldSetElement>('[data-pref]').forEach((set) => {
    set.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.type !== 'radio') return;
      setPref(set.dataset.pref as keyof Prefs, input.value as never);
    });
  });
  sync(prefs());
  onPrefs(sync);
}

function initDisclosures(): void {
  const disclosures = $$<HTMLDetailsElement>('[data-disclosure]');
  document.addEventListener('click', (event) => {
    disclosures.forEach((d) => {
      if (d.open && !d.contains(event.target as Node)) d.open = false;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    disclosures.forEach((d) => {
      if (d.open) {
        d.open = false;
        d.querySelector('summary')?.focus();
      }
    });
  });
}

function initLanguageSwitch(): void {
  $$<HTMLAnchorElement>('[data-lang-switch]').forEach((link) => {
    link.addEventListener('click', () => {
      const lang = link.dataset.langSwitch;
      const other = lang === 'en' ? 'id' : 'en';
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      // Read by the redirect rules at "/" so returning visitors land in the language they chose.
      document.cookie = `pelana_${lang}=1; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      document.cookie = `pelana_${other}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
      // Carry the reader's place across: same chapter in the other language.
      if (location.hash && link.hash === '') link.hash = location.hash;
    });
  });
}

function initMasthead(): void {
  const masthead = $('[data-masthead]');
  if (!masthead) return;
  let last = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const open = document.querySelector('dialog[open], details[open]');
    const hide = y > 240 && y > last + 4 && !open && !masthead.contains(document.activeElement);
    const show = y < last - 4 || y < 240;
    if (hide) masthead.setAttribute('data-hidden', '');
    else if (show) masthead.removeAttribute('data-hidden');
    last = y;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  masthead.addEventListener('focusin', () => masthead.removeAttribute('data-hidden'));
}

function initServiceWorker(): void {
  if (!('serviceWorker' in navigator) || __DEV__) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Offline support is an extra; the site works without it.
    });
  });
}

export function initPage(): void {
  initDialogs();
  initSettings();
  initDisclosures();
  initLanguageSwitch();
  initMasthead();
  initServiceWorker();
}
