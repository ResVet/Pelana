// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// A small HTML templating layer for build-time rendering. Interpolated values
// are escaped unless they are already Html, so a stray "<" in the copy can
// never become markup.

export class Html {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

export type Part = Html | string | number | boolean | null | undefined | Part[];

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

export function raw(markup: string): Html {
  return new Html(markup);
}

function renderPart(part: Part): string {
  if (part === null || part === undefined || part === false || part === true) return '';
  if (part instanceof Html) return part.value;
  if (Array.isArray(part)) return part.map(renderPart).join('');
  return escape(String(part));
}

export function html(strings: TemplateStringsArray, ...values: Part[]): Html {
  let out = '';
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += renderPart(values[i]);
  });
  return new Html(out);
}

/** Joins rendered parts without a separator. */
export function join(parts: Part[]): Html {
  return new Html(renderPart(parts));
}

const NBSP = '\u00a0';

/**
 * Typographic fixes applied to every piece of copy: a no-break space between
 * a number and its unit, and after "Day", "Hari" and similar labels, so they
 * never wrap apart.
 */
export function typeset(text: string): string {
  return text
    .replace(
      /(\d) (°C|%|nm|mm|cm|m\b|km|kg|µL|mL|jam|hari|days?|hours?|metres?|meter|tahun|years?|weeks?|minggu|bulan|months?)/g,
      `$1${NBSP}$2`,
    )
    .replace(/\b(Day|day|Hari|hari|Minggu|minggu|Week|week) (\d|ke-)/g, `$1${NBSP}$2`);
}

// Tokens with a hyphen or dash that must not break across lines: "ke-3",
// "DENV-1", "TAK-003", "H−30", "3–7". The font has no non-breaking hyphen, so
// they are wrapped in a nowrap span instead.
const NOWRAP = /(ke-\d+|DENV-\d|TAK-\d+|H−\d+|\b\d+(?:[.,]\d+)?–\d+(?:[.,]\d+)?)/g;

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const ITALIC = /(^|[\s(“"'])_([^_]+)_(?=[\s.,;:!?)”"']|$)/g;
// "_id:bak mandi_" is italic and marked as Indonesian, so screen readers
// switch voice; "_en:..._" does the same for English inside Indonesian text.
const FOREIGN = /^(id|en):([\s\S]+)$/;

function italic(_m: string, before: string, inner: string): string {
  const foreign = FOREIGN.exec(inner);
  return foreign ? `${before}<i lang="${foreign[1]}">${foreign[2]}</i>` : `${before}<i>${inner}</i>`;
}

/**
 * Inline markup for copy: _italic_ and [text](href). The text is escaped
 * first, so the copy cannot inject arbitrary HTML.
 */
export function md(text: string): Html {
  let out = escape(typeset(text));
  out = out.replace(LINK, (_m, label: string, href: string) => {
    const external = /^https?:/.test(href);
    const rel = external ? ' rel="noopener" target="_blank"' : '';
    return `<a href="${href}"${rel}>${label}</a>`;
  });
  // Italics and no-wrap spans go into the text between tags only, never into
  // an address such as one containing "TAK-003" or an underscore.
  out = out.replace(/(<[^>]*>)|([^<]+)/g, (_m, tag: string | undefined, run: string | undefined) =>
    tag ?? (run ?? '').replace(ITALIC, italic).replace(NOWRAP, '<span class="nw">$1</span>'),
  );
  return new Html(out);
}

/** Strips inline markup, for meta tags, JSON and text sent to scripts. */
export function plain(text: string): string {
  return text.replace(LINK, '$1').replace(ITALIC, (_m, before: string, inner: string) => before + inner.replace(FOREIGN, '$2'));
}

/** Fills {name} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));
}

/** Builds an attribute string from a record, skipping null and false values. */
export function attrs(record: Record<string, string | number | boolean | null | undefined>): Html {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) parts.push(key);
    else parts.push(`${key}="${escape(String(value))}"`);
  }
  return new Html(parts.length ? ' ' + parts.join(' ') : '');
}

/** Serialises data for a <script type="application/json"> block. */
export function jsonScript(id: string, data: unknown): Html {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return new Html(`<script type="application/json" id="${id}">${json}</script>`);
}
