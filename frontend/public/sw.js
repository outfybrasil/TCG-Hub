const CACHE = 'tcg-megastore-shell-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/icons/icon-192.png', '/icons/icon-512.png'])).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode === 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error()));
});
