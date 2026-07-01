/* ============================================================
 * boneCV Pro — Service Worker
 * Offline-first PWA shell + intelligent runtime caching.
 *
 * Strategy summary
 *   • App shell (HTML/JS/manifest/icons) → precached on install.
 *   • Navigations (HTML)   → network-first, fall back to cache,
 *                            then to offline.html.
 *   • Static CDN (Tailwind, FontAwesome, Google Fonts) →
 *                            stale-while-revalidate (works offline
 *                            after first visit).
 *   • Same-origin assets   → cache-first with background refresh.
 *   • Versioned caches, old versions purged on activate.
 *   • Update flow: page can postMessage {type:'SKIP_WAITING'}.
 *   • Background Sync + Push scaffolding included (ready to use).
 * ============================================================ */

const VERSION = 'v1.3.0';
const SHELL_CACHE = `bonecv-shell-${VERSION}`;
const RUNTIME_CACHE = `bonecv-runtime-${VERSION}`;
const FONT_CACHE = `bonecv-fonts-${VERSION}`;
const OFFLINE_URL = './offline.html';

/* App shell — everything needed to boot fully offline. */
const SHELL_ASSETS = [
  './',
  './index.html',
  './cv.html',
  './kontrata.html',
  './kerkesa.html',
  './arkiva.html',
  './cilesimet.html',
  './offline.html',
  './master.js',
  './manifest.json',
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-192.png',
  './assets/icons/maskable-512.png',
  './assets/icons/monochrome-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-source.svg'
];

/* Cross-origin static assets we want available offline.
   These are cached on first fetch (stale-while-revalidate). */
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ---------------- Install: precache shell ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll is atomic; if one asset 404s the whole install fails,
    // so add resiliently one-by-one and don't block on optional files.
    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { /* non-fatal: keep installing */ }
    }));
    self.skipWaiting();
  })());
});

/* ---------------- Activate: cleanup old caches ---------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => keep.has(k) ? null : caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* ---------------- Fetch router ---------------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Page navigations → network-first, offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(event));
    return;
  }

  // 2) Google Fonts (CSS + font files) → cache-first, long-lived.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  // 3) Other CDN static (Tailwind runtime, FontAwesome) → SWR.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  // 4) Same-origin assets → cache-first with background update.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // 5) Everything else → try network, fall back to any cache.
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

/* ---------------- Strategies ---------------- */
async function networkFirstPage(event) {
  const req = event.request;
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      putInCache(SHELL_CACHE, req, preload.clone());
      return preload;
    }
    const fresh = await fetch(req);
    putInCache(SHELL_CACHE, req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) {
    // refresh in the background (don't await)
    fetch(req).then((res) => putInCache(cacheName, req, res.clone())).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    putInCache(cacheName, req, res.clone());
    return res;
  } catch (e) {
    return caches.match(req);
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cached = await caches.match(req);
  const network = fetch(req)
    .then((res) => { putInCache(cacheName, req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}

async function putInCache(cacheName, req, res) {
  try {
    if (!res || (res.status !== 200 && res.type !== 'opaque')) return;
    const cache = await caches.open(cacheName);
    await cache.put(req, res);
  } catch (e) { /* quota or opaque errors ignored */ }
}

/* ---------------- Messaging (update flow) ---------------- */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  }
});

/* ---------------- Background Sync (ready) ----------------
   Documents are stored locally (localStorage). This hook is
   scaffolding for future server sync — safe no-op today. */
self.addEventListener('sync', (event) => {
  if (event.tag === 'bonecv-sync') {
    event.waitUntil(syncDocuments());
  }
});
async function syncDocuments() {
  // Placeholder: broadcast a sync signal to open clients.
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'SYNC_DONE', at: Date.now() }));
}

/* ---------------- Push Notifications (ready) ---------------- */
self.addEventListener('push', (event) => {
  let payload = { title: 'boneCV Pro', body: 'Njoftim i ri', url: './index.html' };
  try { if (event.data) payload = Object.assign(payload, event.data.json()); } catch (e) {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/monochrome-96.png',
    data: { url: payload.url }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
