/* PWA: service worker, install button (Android/desktop prompt + iOS instructions), update + offline notices. */
(function () {
  'use strict';
  var deferred = null, toastTimer;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  function btns() { return document.querySelectorAll('.js-install'); }
  function showBtns(on) { btns().forEach(function (b) { b.hidden = !on; }); }

  function toast(msg, action) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg;
    if (action) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', function () { t.hidden = true; action.fn(); }); t.appendChild(b);
    }
    t.hidden = false; clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, action ? 15000 : 7000);
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (!standalone) showBtns(true); });
  window.addEventListener('appinstalled', function () { deferred = null; showBtns(false); toast('App installed. Find it on your home screen.'); });

  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.js-install')) return;
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; showBtns(false); }).catch(function () {});
    } else if (isIOS) toast('To install: tap the Share button, then “Add to Home Screen”.');
    else toast('To install, open your browser menu and choose “Install app” or “Add to Home screen”.');
  });

  // iPhone/iPad Safari has no install event: show the button with instructions instead.
  if (isIOS && !standalone) showBtns(true);

  function net() { var bar = document.getElementById('offline-bar'); if (bar) bar.hidden = navigator.onLine !== false; }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('A new version is ready.', { label: 'Refresh', fn: function () { location.reload(); } });
          });
        });
      }).catch(function () { /* PWA features are optional */ });
    });
  }
})();
