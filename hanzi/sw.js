const CACHE='hanzi-strokes-v1';
const ASSETS=['./','./index.html','./style.css','./grid.css','./steps.css','./topbar.css','./app.js','./steps.js','./install.js','./data.js','./vendor/hanzi-writer.min.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
