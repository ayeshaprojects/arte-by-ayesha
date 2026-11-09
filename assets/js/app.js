/* Main controller: turns the JSON from Google Sheets into the page. No content lives in this file. */
(function () {
  'use strict';
  var el = U.el, S = {}, started = false;

  function $(id) { return document.getElementById(id); }
  function val(k, d) { var v = S[k]; return v == null || String(v).trim() === '' ? (d || '') : String(v).trim(); }
  function setText(id, t) { var n = $(id); if (n) n.textContent = t; }
  function meta(sel, attr, v) { var n = document.querySelector(sel); if (n && v) n.setAttribute(attr, v); }
  function shade(hex, pct) {
    var n = parseInt(hex.slice(1), 16), f = 1 - pct;
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(function (c) { return ('0' + Math.round(c * f).toString(16)).slice(-2); }).join('');
  }

  function enquire(prefill) {
    var t = $('f-idea');
    if (prefill && !t.value.trim()) t.value = prefill + '\n';
    $('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { t.focus({ preventScroll: true }); }, 500);
  }

  var ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M11 8.5c2.5-1 4.5.5 4 3s-2 3.5-3.5 3L10.5 20M10 15l1-4"/>',
    whatsapp: '<path d="M4 20l1.2-4A8 8 0 1 1 8 18.8z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .5c-1-.5-1.5-1-2-2l.5-1-1-2z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  function icon(name) {
    name = String(name || '').toLowerCase();
    var key = ICONS[name] ? name : 'link';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[key]; // static, developer-written markup only (never sheet data)
    return svg;
  }

  function list(v) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  function renderSettings() {
    var brand = val('Brand_Name', 'Arté By Ayesha'), tag = val('Tagline');
    var tc = val('Theme_Colour');
    if (/^#[0-9a-f]{6}$/i.test(tc)) {
      document.documentElement.style.setProperty('--accent', tc);
      document.documentElement.style.setProperty('--accent-d', shade(tc, .18));
    }
    var title = brand + (val('Meta_Title') ? ' | ' + val('Meta_Title') : (tag ? ' | ' + tag : ''));
    document.title = title;
    var desc = val('Meta_Description', tag);
    meta('meta[name=description]', 'content', desc);
    meta('meta[property="og:title"]', 'content', title);
    meta('meta[property="og:description"]', 'content', desc);
    meta('meta[property="og:site_name"]', 'content', brand);
    var site = val('Site_URL');
    if (U.isHttp(site) && site.indexOf('YOUR-GITHUB') === -1) {
      meta('link[rel=canonical]', 'href', site);
      try { meta('meta[property="og:image"]', 'content', new URL('assets/images/og-image.jpg', site).href); } catch (e) { /* ignore */ }
    }
    // brand + logo (text fallback when no logo / logo fails)
    setText('brand-text', brand); setText('hero-title', brand); setText('footer-brand', brand);
    var logo = $('logo-img'), hl = $('hero-logo');
    logo.hidden = true; hl.hidden = true; document.body.classList.remove('has-logo');
    if (val('Logo_ID')) {
      var fail = function () { logo.hidden = true; hl.hidden = true; document.body.classList.remove('has-logo'); };
      var ok = function () { logo.hidden = false; hl.hidden = false; document.body.classList.add('has-logo'); };
      logo.alt = brand + ' logo';
      logo.onload = ok;
      U.setImage(logo, val('Logo_ID'), { w: 600, noPlaceholder: true, eager: true, onFail: fail });
      U.setImage(hl, val('Logo_ID'), { w: 600, noPlaceholder: true, eager: true, onFail: fail });
    }
    // favicon
    var fav = val('Favicon_ID'), fid = U.driveId(fav), fl = U.localPath(fav);
    if (fl) $('favicon').href = fl; else if (fid) $('favicon').href = 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w64'; else if (U.isHttp(fav)) $('favicon').href = fav;
    var an = val('Website_Announcement'); $('announce').hidden = !an; setText('announce', an);
    // titles / texts (all editable in Settings)
    setText('hero-eyebrow', val('Hero_Eyebrow', 'Handmade art • Custom commissions'));
    setText('hero-tag', tag);
    setText('hero-primary', val('Hero_Primary_Text', 'Order a Commission'));
    setText('gallery-h', val('Paintings_Title', 'My Paintings')); setText('nav-gallery', val('Nav_Paintings_Label', 'Paintings'));
    setText('gallery-sub', val('Paintings_Subtitle')); $('gallery-sub').hidden = !val('Paintings_Subtitle');
    setText('commissions-h', val('Commission_Title', 'Commission Work')); setText('nav-commissions', val('Nav_Commission_Label', 'Commission Work'));
    setText('commissions-sub', val('Commission_Subtitle')); $('commissions-sub').hidden = !val('Commission_Subtitle');
    setText('services-h', val('Services_Title', 'Services')); setText('products-h', val('Products_Title', 'Products'));
    setText('contact-h', val('Contact_Title', 'Contact & Commission Request')); setText('contact-sub', val('Contact_Subtitle')); $('contact-sub').hidden = !val('Contact_Subtitle');
    // about
    setText('about-heading', val('About_Heading', 'Hello')); setText('about-intro', val('About_Introduction')); $('about-intro').hidden = !val('About_Introduction');
    setText('about-details', val('About_Details')); $('about-details').hidden = !val('About_Details');
    U.setImage($('about-img'), val('Profile_Image_ID'), { w: 900, seed: 'about' });
    $('about-img').alt = 'Portrait of ' + val('Artist_Name', 'the artist');
    var blocks = $('about-blocks'); U.clear(blocks);
    [['Creative journey', 'About_Journey'], ['Artistic interests', 'About_Interests'], ['Philosophy', 'About_Philosophy'], ['Achievements', 'About_Achievements']].forEach(function (p) {
      if (val(p[1])) blocks.appendChild(el('div', null, el('h4', { text: p[0] }), el('p', { text: val(p[1]) })));
    });
    var specs = $('about-specs'); U.clear(specs);
    list(val('About_Specialities')).forEach(function (s) { specs.appendChild(el('li', { text: s })); });
    // contact
    var ul = $('contact-list'); U.clear(ul);
    var email = val('Email'), phone = val('Phone'), loc = val('Location');
    if (email && email.indexOf('example.com') === -1) ul.appendChild(el('li', null, el('b', { text: 'Email' }), el('a', { href: 'mailto:' + email.replace(/[^\w.+@-]/g, ''), text: email })));
    if (phone) ul.appendChild(el('li', null, el('b', { text: 'Phone' }), el('a', { href: 'tel:' + phone.replace(/[^\d+]/g, ''), text: phone })));
    if (loc) ul.appendChild(el('li', null, el('b', { text: 'Location' }), el('span', { text: loc })));
    ul.hidden = !ul.firstChild;
    var wa = val('WhatsApp'), waUrl = '';
    if (U.isHttp(wa)) waUrl = wa; else if (/^\+?[\d\s()-]{7,}$/.test(wa)) waUrl = 'https://wa.me/' + wa.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hello, I would like to enquire about a painting.');
    var wb = $('wa-btn'); wb.hidden = !waUrl; if (waUrl) { wb.href = waUrl; wb.target = '_blank'; wb.rel = 'noopener noreferrer'; wb.setAttribute('data-noscroll', ''); }
    var cf = val('Contact_Form_URL'), fb = $('form-btn'); fb.hidden = !U.isHttp(cf);
    if (U.isHttp(cf)) { fb.href = cf; fb.target = '_blank'; fb.rel = 'noopener noreferrer'; fb.setAttribute('data-noscroll', ''); }
    setText('footer-text', val('Footer_Text'));
    setText('copyright', val('Copyright_Text', '© ' + brand));
    // commission form choices
    fillSelect($('f-type'), list(val('Commission_Types', 'Portrait, Calligraphy, Floral, Landscape, Custom Design')));
    fillSelect($('f-size'), list(val('Commission_Sizes', 'A4, A5, A3, A2, Custom size')));
  }

  function fillSelect(sel, items) {
    var cur = sel.value; U.clear(sel);
    items.forEach(function (i) { sel.appendChild(el('option', { value: i, text: i })); });
    if (cur && items.indexOf(cur) !== -1) sel.value = cur;
  }

  function renderCards(hostId, rows, build) {
    var host = $(hostId); U.clear(host);
    rows.forEach(function (r) { host.appendChild(build(r)); });
    return rows.length;
  }

  function enquiryBtn(r, text) {
    var u = String(r.Enquiry_URL || '').trim();
    if (U.isHttp(u) || /^mailto:/i.test(u)) return el('a', { class: 'btn btn-ghost', href: u, target: '_blank', rel: 'noopener noreferrer', 'data-noscroll': '', text: 'Enquire' });
    return el('button', { class: 'btn btn-ghost', type: 'button', text: 'Enquire', onclick: function () { enquire(text); } });
  }

  function renderServices(rows) {
    var n = renderCards('services-grid', rows.filter(function (r) { return U.isActive(r.Status) && r.Title; }), function (r) {
      var withImg = !!(U.driveId(r.Image_ID) || U.localPath(r.Image_ID) || U.isHttp(r.Image_ID));
      var img = el('img', { alt: r.Title, width: 640, height: 400 });
      if (withImg) U.setImage(img, r.Image_ID, { w: 800, seed: r.Service_ID || r.Title });
      return el('article', { class: 'card svc' }, withImg ? el('div', { class: 'ph' }, img) : null,
        el('div', { class: 'card-body' }, el('h3', { text: r.Title }), r.Description ? el('p', { text: r.Description }) : null,
          String(r.Price || '').trim() ? el('span', { class: 'price', text: 'From ' + r.Price }) : null, enquiryBtn(r, 'Enquiry: ' + r.Title)));
    });
    $('services').hidden = !n;
  }

  function renderProducts(rows) {
    rows = rows.filter(function (r) { return U.isActive(r.Status) && r.Product_Name; })
      .sort(function (a, b) { return (U.truthy(b.Featured) ? 1 : 0) - (U.truthy(a.Featured) ? 1 : 0); });
    var n = renderCards('products-grid', rows, function (r) {
      var img = el('img', { alt: r.Product_Name, width: 640, height: 400 });
      U.setImage(img, r.Image_ID, { w: 800, seed: r.Product_ID || r.Product_Name });
      var av = String(r.Availability || '').trim();
      return el('article', { class: 'card prd' },
        el('div', { class: 'ph' }, img, av ? el('span', { class: 'badge', text: av }) : null, U.truthy(r.Featured) ? el('span', { class: 'badge star', text: '★' }) : null),
        el('div', { class: 'card-body' }, el('h3', { text: r.Product_Name }), r.Description ? el('p', { text: r.Description }) : null,
          String(r.Price || '').trim() ? el('span', { class: 'price', text: String(r.Price) }) : null, enquiryBtn(r, 'Enquiry: ' + r.Product_Name)));
    });
    $('products').hidden = !n;
  }

  function renderSocial(rows) {
    ['social', 'footer-social'].forEach(function (id) {
      var ul = $(id); U.clear(ul);
      rows.forEach(function (r) {
        var u = U.safeUrl(r.URL);
        if (!U.isActive(r.Status) || !u || u === '#' || u.charAt(0) === '#') return;
        var ic = icon(r.Icon || r.Platform), name = String(r.Platform || 'Link');
        var a = el('a', { href: u, 'aria-label': name, title: name, 'data-noscroll': '' });
        if (U.isHttp(u)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.appendChild(ic);
        ul.appendChild(el('li', null, a));
      });
      ul.hidden = !ul.firstChild;
    });
  }

  function renderHeroBg() {
    var id = val('Hero_Image_ID'), bg = $('hero-bg'); bg.style.backgroundImage = '';
    var did = U.driveId(id), url = U.localPath(id) || (did ? 'https://drive.google.com/thumbnail?id=' + did + '&sz=w1600' : (U.isHttp(id) ? id : ''));
    if (!url) return;
    var t = new Image();
    t.onload = function () { bg.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")'; };
    t.src = url; // on error the gradient stays - the page never breaks
  }

  function structuredData(social) {
    var ld = { '@context': 'https://schema.org', '@type': 'Person', name: val('Artist_Name', 'Ayesha Parveen'), jobTitle: 'Artist',
      brand: { '@type': 'Brand', name: val('Brand_Name', 'Arté By Ayesha') }, description: val('Meta_Description', val('Tagline')),
      sameAs: social.filter(function (r) { return U.isActive(r.Status) && U.isHttp(r.URL); }).map(function (r) { return r.URL; }) };
    var site = val('Site_URL'); if (U.isHttp(site) && site.indexOf('YOUR-GITHUB') === -1) ld.url = site;
    $('ld-json').textContent = JSON.stringify(ld);
  }

  function render(d) {
    S = d.settings || {};
    renderSettings();
    var nComm = Gallery.setData(d.artwork, d.categories, d['gallery-featured'], val('Commission_Category', 'Commission Work'));
    $('commissions').hidden = !nComm;
    renderServices(d.services || []);
    renderProducts(d.products || []);
    renderSocial(d['social-links'] || []);
    Nav.syncLinks();
    Nav.setRegister(S);
    Nav.renderFooter(d['footer-navigation'] || []);
    renderHeroBg();
    structuredData(d['social-links'] || []);
    if (!started) { started = true; Gallery.openFromHash(); }
  }

  /* ---------- commission request form ---------- */
  function readFile(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = function () { rej(new Error('Could not read the photo.')); }; r.readAsDataURL(file);
    });
  }

  function initForm() {
    var form = $('commission-form'), st = $('form-status'), btn = form.querySelector('button[type=submit]');
    var d = new Date(); $('f-date').min = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    function fail(m) { st.textContent = m; st.className = 'form-status err'; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form), body = { action: 'commission-request' };
      ['name', 'email', 'phone', 'city', 'painting_type', 'size', 'budget', 'needed_by', 'idea', 'website'].forEach(function (k) { body[k] = String(f.get(k) || '').trim(); });
      st.className = 'form-status';
      if (!body.name || !body.idea) return fail('Please enter your name and tell me your idea.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return fail('Please enter a valid email address.');
      if (body.phone && !/^[\d\s+()\-]{5,40}$/.test(body.phone)) return fail('Please enter a valid phone number.');
      var file = $('f-ref').files[0];
      if (file) {
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) return fail('Please upload a JPG, PNG or WebP reference photo.');
        if (file.size > 3 * 1024 * 1024) return fail('Please use a reference photo under 3 MB.');
      }
      btn.disabled = true; st.textContent = 'Sending…';
      (file ? readFile(file).then(function (b64) { body.reference = { filename: file.name, mimeType: file.type, base64: b64 }; }) : Promise.resolve())
        .then(function () { return Api.post(body); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.error || 'Could not send');
          st.textContent = r.demo ? 'Demo mode: nothing was sent. Connect your Apps Script URL in config.js to receive requests.' : 'Thank you! Your request has been sent. I will get back to you soon.';
          st.className = 'form-status ok'; form.reset();
        }).catch(function (err) {
          fail(err && err.message && !/fetch|network|Failed/i.test(err.message) ? err.message : 'Could not send right now. Please try again, or contact me using the details above.');
        }).then(function () { btn.disabled = false; });
    });
  }

  function init() {
    Nav.init();
    Gallery.init(function (a) { enquire('Enquiry about "' + (a.Title || 'artwork') + '":'); });
    initForm();
    window.addEventListener('hashchange', function () { if (started) Gallery.openFromHash(); });
    Api.load(render).catch(function () {
      U.clear($('grid'));
      $('grid').appendChild(el('div', { class: 'empty', text: 'We could not load the content right now. Please check your connection and refresh.' }));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
