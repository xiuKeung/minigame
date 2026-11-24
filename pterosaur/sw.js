const CACHE_NAME = 'brick-archive-shell-v2';
const SHELL = ['./index.html', './assets/icon.svg', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Network-first keeps newly deployed modules from being hidden behind an
  // older installed-app cache. The cache is only an offline fallback.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && !url.pathname.endsWith('.glb') && !url.pathname.includes('/photos/')) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
