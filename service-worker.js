self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('kelimelerim-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/script.js',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png'
      ]);
    })
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request);
    })
  );
});