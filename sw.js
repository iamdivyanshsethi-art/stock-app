// Keeps the app itself on the phone so it opens with no network wait. Stock figures are NOT
// cached here - they live in the page's own storage with their timestamp, so an old copy is
// always labelled as old. Bump VERSION whenever index.html changes.
var VERSION = 'sr-v5';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  // cache:'reload' skips the browser's HTTP cache. Without it a new VERSION can install holding the
  // OLD page, because GitHub Pages lets browsers keep files for 10 minutes (seen 26-Sep, sr-v4).
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// App files: answer from the phone at once, fetch a fresh copy behind it for the next open.
// Anything from another address (the API, Drive photos) goes straight to the network.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req.url, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
