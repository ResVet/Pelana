// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// localStorage with every access guarded: private windows, blocked site data
// and full quotas all throw, and the site has to keep working when they do.

const PREFIX = 'pelana:';

/**
 * Reads a stored value. Anything missing, unreadable or of a different
 * shape from the fallback (an object where an array belongs, null, a
 * string) gives the fallback, so a damaged entry cannot stop a page.
 */
export function readJSON<T>(key: string, fallback: T, valid?: (value: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    if (!sameShape(value, fallback) || (valid && !valid(value))) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}

function sameShape(value: unknown, like: unknown): boolean {
  if (Array.isArray(like)) return Array.isArray(value);
  if (like !== null && typeof like === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === typeof like;
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to do: storage is unavailable, so there is nothing stored.
  }
}

/** Removes every key Pelana has written. */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage unavailable.
  }
}
