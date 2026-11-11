const CACHE='hanzi-strokes-v4';
const ASSETS=['./','./index.html','./style.css','./grid.css','./steps.css','./topbar.css','./offline.css','./app.js','./steps.js','./install.js','./offline.js','./data-index.js','./vendor/hanzi-writer.min.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hanzi-strokes-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const url=new URL(event.request.url);if(!url.pathname.includes('/data/chunks/')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));});
