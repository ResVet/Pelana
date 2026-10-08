// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Service worker. On install it caches the hashed assets and every page of
// the site together, under a name that changes with each build, so the whole
// site reads offline from the first visit and a cached page is never paired
// with assets from another build. Pages still go to the network first, so a
// reader who is online always gets the newest text; without a connection
// they get the cached copy, and failing that an offline page in their
// language.

interface SWScope {
  addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: Location;
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

const sw = self as unknown as SWScope;
const CACHE = `pelana-${__VERSION__}`;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(__PRECACHE__))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pelana-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

/** Indonesian for Indonesian devices, English otherwise: the same choice the server makes for the bare domain. */
function deviceLang(): 'id' | 'en' {
  return (self.navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
}

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

/** Saves a copy without holding up the response: a full quota must not turn a good page into an error. */
function keep(cache: Cache, request: Request, response: Response, wait: (p: Promise<unknown>) => void): void {
  wait(cache.put(request, response).catch(() => undefined));
}

async function page(request: Request, wait: (p: Promise<unknown>) => void): Promise<Response> {
  const cache = await caches.open(CACHE);
  try {
    const response = await timeout(4000, fetch(request));
    // Addresses with a query are never kept: they would pile up, and a form
    // could have put something personal in one.
    if (response.ok && !new URL(request.url).search) keep(cache, request, response.clone(), wait);
    return response;
  } catch {
    const path = new URL(request.url).pathname;
    // The bare domain is a redirect on the server; offline, go straight to the home page.
    const cached = await cache.match(path === '/' ? `/${deviceLang()}/` : request, { ignoreSearch: true });
    if (cached) return cached;
    const lang = path.startsWith('/id/') ? 'id' : path.startsWith('/en/') ? 'en' : deviceLang();
    const offline = await cache.match(`/${lang}/offline/`);
    return offline ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function asset(request: Request, wait: (p: Promise<unknown>) => void): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) keep(cache, request, response.clone(), wait);
  return response;
}

async function staleWhileRevalidate(request: Request, wait: (p: Promise<unknown>) => void): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) keep(cache, request, response.clone(), wait);
      return response;
    })
    .catch(() => cached ?? Response.error());
  wait(fresh);
  return cached ?? fresh;
}

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request, (p) => event.waitUntil(p)));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(asset(request, (p) => event.waitUntil(p)));
    return;
  }
  event.respondWith(staleWhileRevalidate(request, (p) => event.waitUntil(p)));
});
