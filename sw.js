/* NAV CAL offline cache: app files, libraries and map tiles visited online. */
const CACHE_VERSION = 'navcal-offline-v3';
const APP_CACHE = `${CACHE_VERSION}-app`;
const TILE_CACHE = `${CACHE_VERSION}-tiles`;
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const MAX_TILE_ENTRIES = 1200;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('navcal-offline-') && ![APP_CACHE, TILE_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILE_ENTRIES) {
    // Remove oldest entries first; newly visited tiles remain available.
    await Promise.all(keys.slice(0, keys.length - MAX_TILE_ENTRIES).map(k => cache.delete(k)));
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // HTML: network first so GitHub Pages updates are picked up; offline fallback.
  if (url.origin === self.location.origin && (req.mode === 'navigate' || req.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) (await caches.open(APP_CACHE)).put('./index.html', response.clone());
        return response;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // Cache same-origin assets and third-party JS/CSS after first successful load.
  const isAppAsset = url.origin === self.location.origin;
  const isLibrary = /^(unpkg\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname) &&
                    (req.destination === 'script' || req.destination === 'style');
  if (isAppAsset || isLibrary) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response && (response.ok || response.type === 'opaque')) await cache.put(req, response.clone());
        return response;
      } catch (err) {
        const fallback = await cache.match(req);
        if (fallback) return fallback;
        throw err;
      }
    })());
    return;
  }

  // Satellite imagery and map labels: save only tiles actually viewed online.
  const isMapTile =
    url.hostname === 'server.arcgisonline.com' ||
    /\.basemaps\.cartocdn\.com$/.test(url.hostname);
  if (isMapTile && (req.destination === 'image' || /\/tile\/|\.png(?:\?|$)/i.test(url.pathname + url.search))) {
    event.respondWith((async () => {
      const cache = await caches.open(TILE_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        // ArcGIS/Carto may return opaque responses; Cache API can store them.
        if (response && (response.ok || response.type === 'opaque')) {
          await cache.put(req, response.clone());
          await trimTileCache(cache);
        }
        return response;
      } catch (err) {
        const fallback = await cache.match(req);
        if (fallback) return fallback;
        throw err;
      }
    })());
  }
});
