/* ============================================================
 * SAC Notfallblatt – Service Worker
 * Strategy:
 *   - App shell: cache-first
 *   - Content (md, json): network-first w/ cache fallback
 *   - Everything else: cache-first
 * CACHE_VERSION is replaced at build time by build.js
 * ============================================================ */

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME    = `sac-notfall-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  'index.html',
  'app.js',
  'styles.css',
  'manifest.json',
  'version.json',
  'content/index.json',
  'content/01-verhalten.md',
  'content/02-notruf.md',
  'content/03-krisenstab.md',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('sac-notfall-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Content + version.json: network-first (so updates show up quickly)
  if (url.pathname.endsWith('.md') ||
      url.pathname.endsWith('index.json') ||
      url.pathname.endsWith('version.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: cache-first
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}
