var CACHE = 'wod-v2';

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Network first — always try to get the latest
  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache successful responses for offline fallback
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
      }
      return response;
    }).catch(function() {
      // Offline: use cache
      return caches.match(e.request);
    })
  );
});
