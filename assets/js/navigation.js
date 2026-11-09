/* Header menu, REGISTER NOW buttons, section/nav visibility, dynamic footer navigation. */
(function () {
  'use strict';
  var el = U.el;

  function closeMenu() {
    var b = document.getElementById('menu-btn'), n = document.getElementById('nav');
    n.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Open menu');
  }

  function sectionVisible(id) { var t = document.getElementById(id); return !!t && !t.hidden; }
  function internalTarget(url) {
    var id = String(url || '').trim().replace(/^(?:index\.html)?#\/?/, '').replace(/^\//, '');
    return id && sectionVisible(id) ? id : '';
  }
  function goInternal(id) {
    var t = document.getElementById(id);
    if (!t) return;
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
  }

  var Nav = {
    init: function () {
      var b = document.getElementById('menu-btn'), n = document.getElementById('nav');
      b.addEventListener('click', function () {
        var open = !n.classList.contains('open');
        n.classList.toggle('open', open);
        b.setAttribute('aria-expanded', String(open));
        b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      n.addEventListener('click', function (e) { if (e.target.closest('a,button')) closeMenu(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
      // Delegate internal links (header, hero, footer) so dynamically added links work.
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a || a.hasAttribute('data-noscroll')) return;
        var id = internalTarget(a.getAttribute('href'));
        if (id) { e.preventDefault(); goInternal(id); }
      });
    },

    /** Hide menu links whose section is empty/hidden (e.g. Products before any product is published). */
    syncLinks: function () {
      document.querySelectorAll('#nav a[data-section]').forEach(function (a) { a.hidden = !sectionVisible(a.getAttribute('data-section')); });
    },

    /** Show/hide and configure every REGISTER NOW button (header, hero, menu, contact, mobile bar) from Settings. */
    setRegister: function (s) {
      var url = String(s.Register_Button_URL || '').trim();
      var on = U.isActive(s.Register_Button_Status) && U.isHttp(url);
      var text = String(s.Register_Button_Text || 'REGISTER NOW').trim() || 'REGISTER NOW';
      var target = String(s.Register_Button_Target || '_blank').trim() === '_self' ? '_self' : '_blank';
      document.querySelectorAll('.js-register').forEach(function (a) {
        a.hidden = !on;
        if (!on) return;
        a.textContent = text;
        a.setAttribute('href', url);
        a.setAttribute('target', target);
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('data-noscroll', '');
      });
      document.getElementById('reg-bar').hidden = !on;
      document.body.classList.toggle('has-regbar', on);
    },

    /** Build footer columns from Footer_Navigation rows (already filtered to Active + sorted by the API). */
    renderFooter: function (rows) {
      var host = document.getElementById('footer-cols');
      U.clear(host);
      var sections = [], map = {};
      (rows || []).forEach(function (r) {
        if (!U.isActive(r.Status)) return;
        var title = String(r.Title || '').trim();
        if (!title) return;
        var type = String(r.Link_Type || '').trim().toLowerCase();
        var url = String(r.URL || '').trim();
        var href = '', external = false;
        if (U.isHttp(url) || /^(mailto:|tel:)/i.test(url)) { href = url; external = type !== 'internal' || U.isHttp(url); }
        else if (/^#/.test(url)) { if (internalTarget(url)) href = url; }
        else if (type === 'internal' && /^[\w./-]+(\?[^\s]*)?(#[^\s]*)?$/.test(url) && url.indexOf('//') === -1) href = url; // relative page
        if (!href || href === '#') return;
        var sec = String(r.Section_Name || 'Links').trim() || 'Links';
        if (!map[sec]) { map[sec] = []; sections.push(sec); }
        map[sec].push({ title: title, href: href, newTab: String(r.Target || '').trim() === '_blank', external: external });
      });
      sections.forEach(function (sec) {
        var ul = el('ul');
        map[sec].forEach(function (l) {
          var a = el('a', { href: l.href, text: l.title });
          if (l.newTab) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
          else if (l.external) a.setAttribute('rel', 'noopener noreferrer');
          ul.appendChild(el('li', null, a));
        });
        host.appendChild(el('div', null, el('h4', { text: sec }), ul));
      });
    }
  };
  window.Nav = Nav;
})();
