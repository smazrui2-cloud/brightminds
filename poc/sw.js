// ════════════════════════════════════════════════════════════
// BrightMinds Service Worker — offline support + asset caching
// Cache-first for static assets, network-first for the HTML shell.
// Bumping CACHE_VERSION clears all old caches on next load.
// ════════════════════════════════════════════════════════════
const CACHE_VERSION = 'brightminds-v51';
// Loud, unmissable log so we can confirm via DevTools that the running SW
// is the build we expect (especially on mobile where DevTools is harder).
try { console.log('[SW] booting', CACHE_VERSION); } catch (_) {}

// Per-request cache hit/miss tracking so the page can show real numbers in the
// Debug Panel. Counters are sent on demand via the GET_STATS message.
let _cacheHits = 0, _cacheMisses = 0;

// Core files that must be available offline (the app shell)
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './i18n.js',
  './sounds.js',
  './cloudvoice.js',
  './mascot.js',
  './digits.js',
  './achievements.js',
  './addition.js',
  './letters.js',
  './memory.js',
  './findletter.js',
  './colorhunt.js',
  './wordbuilder.js',
  './maze.js',
  './puzzle.js',
  './story.js',
  './parentpin.js',
  './analytics.js',
  './premium.js',
  './paywall.js',
  './teacher.js',
  './shop.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.svg',
  './audio/manifest.json',
];

// ── Canonical-host guard ──
// If this SW happens to be installed on a duplicate Vercel alias (e.g.
// brightminds-nine.vercel.app), it should self-unregister + wipe caches so
// stale PWAs on those hosts can never serve old content.
const CANONICAL_HOSTS = new Set([
  'brightminds-app.vercel.app',
  'brightminds.kids',
  'www.brightminds.kids',
  'poc-gamma-sepia.vercel.app',  // current Vercel project alias
  'localhost',
  '127.0.0.1',
]);
// Also accept every preview deployment under this project so SW + PWA work
// on auto-generated URLs (e.g. poc-<hash>-smazrui2-clouds-projects.vercel.app)
const IS_VERCEL_PREVIEW = /^poc-[\w-]+-smazrui2-clouds-projects\.vercel\.app$/.test(self.location.hostname);
const IS_CANONICAL = CANONICAL_HOSTS.has(self.location.hostname) || IS_VERCEL_PREVIEW;

async function selfDestruct() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url)); // force reload → triggers redirect
  } catch (_) {}
}

self.addEventListener('install', (event) => {
  if (!IS_CANONICAL) { event.waitUntil(selfDestruct()); return; }
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (!IS_CANONICAL) { event.waitUntil(selfDestruct()); return; }
  // Remove any old caches from previous versions, claim clients, and BROADCAST
  // the new version to every open tab so the Debug Panel can display it.
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
    const all = await self.clients.matchAll({ type: 'window' });
    all.forEach(c => c.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION }));
    try { console.log('[SW] activated', CACHE_VERSION); } catch (_) {}
  })());
});

// Reply to on-demand queries from the page. Two message types:
//   GET_VERSION → returns { type: 'SW_VERSION', version }
//   GET_STATS   → returns { type: 'SW_STATS', hits, misses, audioCount }
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'GET_VERSION') {
    event.source?.postMessage?.({ type: 'SW_VERSION', version: CACHE_VERSION });
  } else if (event.data.type === 'GET_STATS') {
    (async () => {
      let audioCount = 0;
      try {
        const cache = await caches.open(CACHE_VERSION);
        const keys = await cache.keys();
        audioCount = keys.filter(r => r.url.includes('/audio/') && r.url.endsWith('.mp3')).length;
      } catch (_) {}
      event.source?.postMessage?.({
        type: 'SW_STATS',
        version: CACHE_VERSION,
        hits: _cacheHits,
        misses: _cacheMisses,
        audioCount,
      });
    })();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Skip non-GET (POST goes to /api/*, must reach network)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Don't intercept the Web Speech API or external resources
  if (url.origin !== self.location.origin) return;

  // Never cache API responses (subscription state must be fresh)
  if (url.pathname.startsWith('/api/')) return;

  // For audio MP3s — cache the first time, serve from cache thereafter.
  if (url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // For HTML — network first so updates are picked up immediately
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else (CSS/JS/SVG/etc.) → cache first
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);
  if (cached) { _cacheHits++; return cached; }
  _cacheMisses++;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    return cached || new Response('Offline', { status: 503 });
  }
}
