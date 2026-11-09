/* Dynamic gallery: category filters, search, featured/latest rows, load more, commission section, details modal. */
(function () {
  'use strict';
  var el = U.el, PER = 9;
  var all = [], pool = [], commission = [], cats = [], featIds = [], commCat = 'commission work';
  var state = { cat: 'all', q: '', page: 1 }, visible = [], modalList = [], current = -1, lastFocus = null;
  var onEnquire = function () {};

  function norm(s) { return String(s == null ? '' : s).toLowerCase().trim(); }
  function artCats(a) { return String(a.Category || '').split(',').map(norm).filter(Boolean); }
  function isFeatured(a) { return U.truthy(a.Featured) || featIds.indexOf(String(a.Artwork_ID)) !== -1; }
  function time(a) { var t = Date.parse(a.Created_At); return isNaN(t) ? 0 : t; }
  function isCommission(a) { return artCats(a).indexOf(commCat) !== -1; }

  function featured() {
    return pool.filter(isFeatured).sort(function (a, b) {
      var x = featIds.indexOf(String(a.Artwork_ID)), y = featIds.indexOf(String(b.Artwork_ID));
      if (x < 0) x = 1e6; if (y < 0) y = 1e6;
      return x - y;
    });
  }
  function latest() {
    return pool.map(function (a, i) { return { a: a, i: i }; })
      .sort(function (p, q) { return (time(q.a) - time(p.a)) || (q.i - p.i); })
      .slice(0, PER).map(function (o) { return o.a; });
  }
  function catList(c) {
    var type = norm(c.Filter_Type), name = norm(c.Category_Name);
    if (type === 'featured' || (!type && name === 'featured artwork')) return featured();
    if (type === 'latest' || (!type && name === 'latest creations')) return latest();
    return pool.filter(function (a) { return artCats(a).indexOf(name) !== -1; });
  }

  function listForState() {
    var base = pool;
    if (state.cat !== 'all') {
      var c = cats.filter(function (x) { return String(x.Category_ID) === state.cat; })[0];
      if (c) base = catList(c);
    }
    var q = norm(state.q);
    if (!q) return base;
    return base.filter(function (a) {
      return [a.Title, a.Description, a.Category, a.Medium, a.Year].some(function (f) { return norm(f).indexOf(q) !== -1; });
    });
  }

  function card(a, list) {
    var img = el('img', { alt: (a.Title || 'Artwork') + (a.Medium ? ' - ' + a.Medium : ''), width: 400, height: 450 });
    U.setImage(img, a.Image_ID, { w: 800, seed: a.Artwork_ID || a.Title, responsive: true });
    var avail = String(a.Availability || '').trim();
    var ph = el('button', { class: 'ph', type: 'button', 'aria-label': 'View ' + (a.Title || 'artwork') }, img,
      avail ? el('span', { class: 'badge', text: avail }) : null,
      isFeatured(a) && list !== 'commission' ? el('span', { class: 'badge star', text: '★' }) : null);
    var open = function () { Gallery.open(String(a.Artwork_ID), list); };
    ph.addEventListener('click', open);
    return el('article', { class: 'card' }, ph,
      el('div', { class: 'card-body' },
        list === 'commission' ? null : el('span', { class: 'cat', text: String(a.Category || '').split(',')[0] }),
        el('h3', { text: a.Title || 'Untitled' }),
        a.Description ? el('p', { text: a.Description }) : null,
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'View Artwork', onclick: open })));
  }

  function renderFilters() {
    var host = document.getElementById('filters');
    U.clear(host);
    var mk = function (id, label) {
      var b = el('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(state.cat === id), text: label });
      b.addEventListener('click', function () { state.cat = id; state.page = 1; renderFilters(); renderGrid(); renderExtras(); });
      return b;
    };
    host.appendChild(mk('all', 'All'));
    // Only categories that currently contain artwork get a filter chip.
    cats.forEach(function (c) { if (catList(c).length) host.appendChild(mk(String(c.Category_ID), c.Category_Name)); });
  }

  function renderExtras() {
    var host = document.getElementById('gallery-extras');
    U.clear(host);
    if (state.cat !== 'all' || state.q) return;
    var row = function (title, items) {
      if (!items.length) return;
      var g = el('div', { class: 'grid' });
      items.slice(0, 3).forEach(function (a) { g.appendChild(card(a, 'pool')); });
      host.appendChild(el('h3', { class: 'sub-h', text: title }));
      host.appendChild(g);
    };
    if (pool.length > 6) { row('Featured artwork', featured()); row('Latest creations', latest()); }
    if (host.firstChild) host.appendChild(el('h3', { class: 'sub-h', text: 'All artwork' }));
  }

  function renderGrid() {
    var grid = document.getElementById('grid'), more = document.getElementById('more');
    U.clear(grid);
    visible = listForState();
    var shown = visible.slice(0, state.page * PER);
    if (!pool.length) grid.appendChild(el('div', { class: 'empty', text: 'New artwork is coming soon.' }));
    else if (!shown.length) grid.appendChild(el('div', { class: 'empty', text: 'No artwork matches your search.' }));
    shown.forEach(function (a) { grid.appendChild(card(a, 'pool')); });
    more.hidden = visible.length <= shown.length;
  }

  /* ---------- modal ---------- */
  function fill(a) {
    document.getElementById('m-cat').textContent = String(a.Category || '');
    document.getElementById('m-title').textContent = a.Title || 'Untitled';
    var d = document.getElementById('m-desc'); d.textContent = a.Description || ''; d.hidden = !a.Description;
    var img = document.getElementById('m-img');
    img.alt = (a.Title || 'Artwork') + (a.Medium ? ' - ' + a.Medium : '');
    U.setImage(img, a.Image_ID, { w: 1600, seed: a.Artwork_ID || a.Title, eager: true });
    var dl = document.getElementById('m-meta');
    U.clear(dl);
    [['Medium', a.Medium], ['Dimensions', a.Dimensions], ['Year', a.Year], ['Availability', a.Availability]].forEach(function (p) {
      if (String(p[1] == null ? '' : p[1]).trim()) { dl.appendChild(el('dt', { text: p[0] })); dl.appendChild(el('dd', { text: String(p[1]) })); }
    });
    dl.hidden = !dl.firstChild;
    var enq = document.getElementById('m-enquire');
    enq.onclick = function (e) { e.preventDefault(); Gallery.close(); onEnquire(a); };
    document.getElementById('m-prev').hidden = document.getElementById('m-next').hidden = modalList.length < 2;
    try { history.replaceState(null, '', '#artwork/' + encodeURIComponent(a.Artwork_ID)); } catch (e) { /* ignore */ }
  }

  var Gallery = {
    init: function (cb) {
      onEnquire = cb || onEnquire;
      var s = document.getElementById('search'), t;
      s.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { state.q = s.value; state.page = 1; renderGrid(); renderExtras(); }, 180);
      });
      document.getElementById('more').addEventListener('click', function () { state.page++; renderGrid(); });
      var m = document.getElementById('modal');
      m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) Gallery.close(); });
      document.getElementById('m-prev').addEventListener('click', function () { Gallery.step(-1); });
      document.getElementById('m-next').addEventListener('click', function () { Gallery.step(1); });
      document.addEventListener('keydown', function (e) {
        if (m.hidden) return;
        if (e.key === 'Escape') Gallery.close();
        else if (e.key === 'ArrowLeft') Gallery.step(-1);
        else if (e.key === 'ArrowRight') Gallery.step(1);
        else if (e.key === 'Tab') { // keep focus inside the dialog
          var f = m.querySelectorAll('button:not([hidden]),a[href]');
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    },
    /** commissionCategory: artwork in this category go to the "Commission Work" section instead of the gallery. */
    setData: function (artworks, categories, featuredRows, commissionCategory) {
      commCat = norm(commissionCategory) || 'commission work';
      all = (artworks || []).filter(function (a) { return U.isActive(a.Status); });
      commission = all.filter(isCommission);
      pool = all.filter(function (a) { return !isCommission(a); });
      cats = (categories || []).filter(function (c) { return U.isActive(c.Status) && c.Category_Name && norm(c.Category_Name) !== commCat; });
      featIds = (featuredRows || []).filter(function (r) { return U.isActive(r.Status); }).map(function (r) { return String(r.Artwork_ID); });
      if (state.cat !== 'all' && !cats.some(function (c) { return String(c.Category_ID) === state.cat; })) state.cat = 'all';
      renderFilters(); renderExtras(); renderGrid();
      var host = document.getElementById('commission-grid'); U.clear(host);
      commission.forEach(function (a) { host.appendChild(card(a, 'commission')); });
      return commission.length;
    },
    open: function (id, list) {
      var a = all.filter(function (x) { return String(x.Artwork_ID) === String(id); })[0];
      if (!a) return false;
      var src = list === 'commission' || isCommission(a) ? commission : visible;
      modalList = src.indexOf(a) === -1 ? all.slice() : src.slice();
      current = modalList.indexOf(a);
      lastFocus = document.activeElement;
      var m = document.getElementById('modal');
      fill(a);
      m.hidden = false; document.body.classList.add('lock');
      m.querySelector('.modal-close').focus();
      return true;
    },
    step: function (d) {
      if (modalList.length < 2) return;
      current = (current + d + modalList.length) % modalList.length;
      fill(modalList[current]);
    },
    close: function () {
      var m = document.getElementById('modal');
      if (m.hidden) return;
      m.hidden = true; document.body.classList.remove('lock');
      try { history.replaceState(null, '', '#gallery'); } catch (e) { /* ignore */ }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    },
    openFromHash: function () {
      var m = location.hash.match(/^#artwork\/(.+)$/);
      if (m) Gallery.open(decodeURIComponent(m[1]));
    }
  };
  window.Gallery = Gallery;
})();
