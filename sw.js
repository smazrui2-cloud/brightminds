// ════════════════════════════════════════════════════════════
// BrightMinds Service Worker — offline support + asset caching
// Cache-first for static assets, network-first for the HTML shell.
// Bumping CACHE_VERSION clears all old caches on next load.
// ════════════════════════════════════════════════════════════
const CACHE_VERSION = 'brightminds-v35';

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Remove any old caches from previous versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
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
  if (cached) return cached;
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
