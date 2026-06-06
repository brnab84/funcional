// Service Worker - auto-updates on new version
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  // Clear ALL caches on activate (new version deployed)
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
  // Notify all clients to reload
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) { client.postMessage({type:'SW_UPDATED'}); });
  });
});

// Network first - always get latest
self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).catch(function() { return caches.match(e.request); })
  );
});
