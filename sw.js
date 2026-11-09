/* Service worker for Arté By Ayesha.
   - Precaches the site shell so the app is installable and opens offline (shows content last loaded).
   - Pages: network first, falling back to cache, then offline.html.  Static files: stale-while-revalidate.
   - Google Apps Script / Drive / fonts are never intercepted (live Sheets data needs internet;
     app.js keeps the last loaded content in localStorage for offline viewing). */
var CACHE = 'arte-shell-v2';
var SHELL = ['./', 'index.html', 'offline.html', 'manifest.webmanifest',
  'assets/css/style.css', 'assets/js/config.js', 'assets/js/api.js', 'assets/js/navigation.js', 'assets/js/gallery.js',
  'assets/js/pwa.js', 'assets/js/app.js', 'assets/data/sample.json',
  'assets/images/logo.png', 'assets/images/logo-small.png', 'assets/images/icon-192.png', 'assets/images/favicon-64.png',
  'assets/images/art/ayesha-parveen.jpg', 'assets/images/art/crimson-and-checks.jpg', 'assets/images/art/rose-reverie.jpg',
  'assets/images/art/where-faith-blooms.jpg', 'assets/images/art/golden-verses.jpg', 'assets/images/art/the-price-of-becoming.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // add one by one so a single missing optional file never blocks installation
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('index.html').then(function (i) { return url.pathname.slice(-10) === 'admin.html' ? caches.match('offline.html') : (i || caches.match('offline.html')); }); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return r;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
