var CACHE = 'wod-v1';
var ASSETS = ['/', '/styles.css', '/app.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(cache) { return cache.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // API calls: network first
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
    return;
  }
  // Static: cache first, then network
  e.respondWith(caches.match(e.request).then(function(cached) {
    var fetched = fetch(e.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
      return response;
    });
    return cached || fetched;
  }));
});
