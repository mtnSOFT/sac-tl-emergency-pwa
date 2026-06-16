/* ============================================================
 * SAC Notfall App – Service Worker
 * Strategy: cache-first for everything.
 * Content is refreshed via the SW update cycle: a new deploy
 * produces a new CACHE_VERSION → new SW installs → all APP_SHELL
 * assets are pre-fetched fresh → update toast prompts reload.
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
  'vendor/marked.min.js',
  'version.json',
  'content/index.json',
  'content/01-verhalten.md',
  'content/02-notruf.md',
  'content/03-krisenstab.md',
  'icons/icon-192.png',
  'icons/icon-512.png',
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
  if (event.request.method !== 'GET') return;
  event.respondWith(cacheFirst(event.request));
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
    return Response.error();
  }
}
