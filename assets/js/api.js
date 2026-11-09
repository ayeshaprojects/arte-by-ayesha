/* API client + shared helpers (safe DOM building, URL checks, Drive/local image delivery). */
(function () {
  'use strict';
  var cfg = window.ARTE_CONFIG || {};
  var KEY = 'arte_data_v2';
  var TTL = (cfg.CACHE_MINUTES || 5) * 60 * 1000;

  var U = {
    /** Build a DOM node. Text is ALWAYS set via textContent/createTextNode, never innerHTML. */
    el: function (tag, attrs) {
      var n = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      });
      for (var i = 2; i < arguments.length; i++) {
        var c = arguments[i];
        if (c === null || c === undefined || c === false) continue;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
      return n;
    },
    clear: function (n) { while (n.firstChild) n.removeChild(n.firstChild); },
    isActive: function (s) {
      return ['published', 'active', 'enabled', 'yes', 'true', '1', 'live', 'show']
        .indexOf(String(s == null ? '' : s).trim().toLowerCase()) !== -1;
    },
    truthy: function (s) { return ['yes', 'true', '1', 'y', 'featured'].indexOf(String(s == null ? '' : s).trim().toLowerCase()) !== -1; },
    /** Only http(s), mailto, tel and #anchors are allowed as link targets. */
    safeUrl: function (u) {
      u = String(u == null ? '' : u).trim();
      if (/^(https?:\/\/|mailto:|tel:)/i.test(u) || /^#/.test(u)) return u;
      return '';
    },
    isHttp: function (u) { return /^https?:\/\//i.test(String(u || '').trim()); },
    /** Image shipped with the website, e.g. assets/images/art/rose-reverie.jpg (no "..", no protocol). */
    localPath: function (v) {
      v = String(v == null ? '' : v).trim();
      return /^assets\/[\w\-./]+\.(png|jpe?g|webp|svg)$/i.test(v) && v.indexOf('..') === -1 ? v : '';
    },
    /** Accepts a Drive file ID, or any Drive share link, and returns the file ID (or ''). */
    driveId: function (v) {
      v = String(v == null ? '' : v).trim();
      if (!v || U.localPath(v)) return '';
      var m = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([\w-]+)/) ||
        v.match(/lh3\.googleusercontent\.com\/d\/([\w-]+)/) || v.match(/[?&]id=([\w-]{20,})/);
      if (m) return m[1];
      return /^[\w-]{20,}$/.test(v) ? v : '';
    },
    hash: function (s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); },
    /** Generated placeholder in the logo colours (plum / orchid / gold) for missing or broken images. */
    placeholder: function (seed) {
      var h = U.hash(seed), hue = [318, 326, 334, 342, 300, 40][h % 6], hue2 = (hue + 24) % 360;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="hsl(' + hue + ',48%,30%)"/><stop offset="1" stop-color="hsl(' + hue2 + ',55%,18%)"/></linearGradient></defs>' +
        '<rect width="400" height="450" fill="url(#g)"/><circle cx="' + (90 + h % 220) + '" cy="' + (110 + (h >> 4) % 100) + '" r="95" fill="#f3d58f" fill-opacity=".12"/>' +
        '<path d="M-20 380 Q120 ' + (270 + h % 70) + ' 230 340 T430 300 V470 H-20Z" fill="#ee5b9d" fill-opacity=".22"/>' +
        '<g fill="none" stroke="#f3d58f" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"><path d="M170 215h60M200 185v60"/></g></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    /**
     * Set an <img> from a Drive ID / link / URL / shipped file with lazy loading, srcset and a fallback chain:
     * Drive thumbnail -> googleusercontent -> placeholder (or onFail). Never throws.
     */
    setImage: function (img, value, o) {
      o = o || {};
      var w = o.w || 800, id = U.driveId(value), local = U.localPath(value), chain = [];
      if (local) chain.push(local);
      else if (id) {
        chain.push('https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w);
        chain.push('https://lh3.googleusercontent.com/d/' + id + '=w' + w);
      } else if (U.isHttp(value)) chain.push(String(value).trim());
      if (!o.noPlaceholder) chain.push(U.placeholder(o.seed || value || 'x'));
      if (!chain.length) { if (o.onFail) o.onFail(); return; }
      var i = 0;
      img.loading = o.eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.onerror = function () {
        i++;
        img.removeAttribute('srcset');
        if (i < chain.length) img.src = chain[i];
        else { img.onerror = null; if (o.onFail) o.onFail(); }
      };
      if (id && o.responsive) {
        img.sizes = o.sizes || '(min-width:900px) 33vw, (min-width:640px) 33vw, 50vw';
        img.srcset = [Math.round(w / 2), w].map(function (x) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + x + ' ' + x + 'w'; }).join(', ');
      }
      img.src = chain[0];
    }
  };

  function readCache() {
    try { var c = JSON.parse(localStorage.getItem(KEY)); return c && c.data ? c : null; } catch (e) { return null; }
  }
  function writeCache(data) { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) { /* storage full/blocked */ } }

  function getJson(url) {
    return fetch(url, { redirect: 'follow' }).then(function (r) {
      if (!r.ok) throw new Error('Network error (' + r.status + ')');
      return r.json();
    });
  }

  var Api = {
    demo: !cfg.API_URL,
    /**
     * Load all public content. Calls render(data) immediately with cached data (if any), then again with
     * fresh data when it differs. Works offline: the last saved content is shown.
     */
    load: function (render) {
      if (Api.demo) {
        return getJson(cfg.SAMPLE_DATA || 'assets/data/sample.json').then(function (d) { render(d.data || d); });
      }
      var cached = readCache(), rendered = false, shown = '';
      if (cached) { render(cached.data); rendered = true; shown = JSON.stringify(cached.data); }
      if (cached && Date.now() - cached.t < 60 * 1000) return Promise.resolve();
      return getJson(cfg.API_URL + '?action=bootstrap').then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Could not load content');
        writeCache(res.data);
        var s = JSON.stringify(res.data);
        if (!rendered || s !== shown) render(res.data);
      }).catch(function (e) { if (!rendered) throw e; });
    },
    /** POST as text/plain so the browser does not send a CORS preflight (Apps Script cannot answer one). */
    post: function (body) {
      if (Api.demo) return Promise.resolve({ ok: true, demo: true });
      return fetch(cfg.API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); });
    }
  };

  window.U = U;
  window.Api = Api;
})();
