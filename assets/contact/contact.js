(function () {
  'use strict';
  var CFG = window.CONTACT_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  /* ---- option lists: defaults, replaced by the backend (doGet) so Sheet/CONFIG edits need no GitHub change ---- */
  var LISTS = {
    method: ['WhatsApp', 'Phone call', 'E-mail'], time: ['Morning (9-12)', 'Afternoon (12-4)', 'Evening (4-8)'],
    lang: ['Bengali', 'Hindi', 'English', 'Urdu'], frame: ['Yes, framed', 'No, canvas / paper only', 'Please suggest'],
    paintingTypes: ['Portrait', 'Couple / Family portrait', 'Pet portrait', 'Landscape / Nature', 'Flowers', 'Abstract', 'Religious / Calligraphy', 'Other'],
    sizes: ['A4 (8x12 in)', 'A3 (12x16 in)', 'A2 (16x24 in)', 'Bigger than A2', 'Not sure - please suggest'],
    mediums: ['Acrylic', 'Oil', 'Watercolour', 'Pencil / Charcoal', 'Not sure - please suggest'],
    budgets: ['Under ₹2,000', '₹2,000 - ₹5,000', '₹5,000 - ₹10,000', '₹10,000 - ₹20,000', 'Above ₹20,000', 'Not decided'],
    occasion: ['Birthday', 'Wedding / Anniversary', 'Gift', 'Home decor', 'Memorial', 'Other'],
    topic: ['Prices', 'Delivery / shipping', 'Payment', 'Frames / packing', 'Something else'],
    kind: ['Exhibition / Event', 'Workshop / Class', 'Brand collaboration', 'Media / Interview', 'Other'],
    public: ['Yes, with my first name', 'Yes, anonymously', 'No, keep it private'],
    source: ['Instagram', 'Facebook', 'WhatsApp / Friend', 'Google search', 'Exhibition / Event', 'Other']
  };
  var STATE = { whatsapp: String(CFG.WHATSAPP || '').replace(/\D/g, ''), replyWithin: '24 hours', consent: 'I agree that Arté By Ayesha may contact me about this enquiry. My details are used only to reply to me.' };

  var TYPES = [
    { key: 'buy', icon: '🖼️', label: 'Buy an existing painting', hint: 'Tell us which artwork you like (see "My Paintings" on the website).' },
    { key: 'commission', icon: '🎨', label: 'Custom commission (made for me)', hint: 'The more detail you give, the more accurate the quote. Send reference photos on WhatsApp or paste a Drive / Instagram link.' },
    { key: 'general', icon: '💬', label: 'Price / delivery / general question', hint: '' },
    { key: 'collab', icon: '🤝', label: 'Collaboration, exhibition or workshop', hint: '' },
    { key: 'feedback', icon: '⭐', label: 'Feedback or review', hint: 'We love hearing from you.' }
  ];
  var ABOUT = [
    { k: 'name', label: 'Your full name', kind: 'name', req: 1, ac: 'name' },
    { k: 'email', label: 'Your e-mail', kind: 'email', req: 1, help: 'Our reply and your Enquiry ID come here.', ac: 'email' },
    { k: 'phone', label: 'Phone / WhatsApp number', kind: 'phone', req: 1, help: '10-digit mobile number, no +91 or spaces.', ac: 'tel-national' },
    { k: 'city', label: 'City & State', kind: 'text', req: 1, help: 'Helps us estimate delivery time and cost.', ac: 'address-level2' },
    { k: 'method', label: 'Preferred way to contact you', kind: 'radio', req: 1, list: 'method', full: 1 },
    { k: 'time', label: 'Best time to reach you', kind: 'multi', list: 'time', full: 1 },
    { k: 'lang', label: 'Preferred language', kind: 'radio', req: 1, list: 'lang', full: 1 }
  ];
  var BY = {
    buy: [
      { k: 'b_painting', label: 'Which painting are you interested in?', kind: 'text', req: 1, help: 'Painting title, or describe it.', full: 1 },
      { k: 'b_pin', label: 'Delivery PIN code', kind: 'pin', req: 1 },
      { k: 'b_frame', label: 'Do you want it framed?', kind: 'radio', req: 1, list: 'frame', full: 1 },
      { k: 'b_note', label: 'Anything else about the purchase?', kind: 'long', full: 1 }],
    commission: [
      { k: 'c_type', label: 'Type of painting', kind: 'select', req: 1, list: 'paintingTypes' },
      { k: 'c_size', label: 'Size', kind: 'select', req: 1, list: 'sizes' },
      { k: 'c_medium', label: 'Medium', kind: 'radio', req: 1, list: 'mediums', full: 1 },
      { k: 'c_budget', label: 'Budget (₹)', kind: 'select', req: 1, list: 'budgets' },
      { k: 'c_needed', label: 'Needed by (date)', kind: 'date', req: 1, help: 'Allow enough time; urgent orders may cost extra.' },
      { k: 'c_occasion', label: 'Occasion', kind: 'radio', list: 'occasion', full: 1 },
      { k: 'c_idea', label: 'Tell us your idea', kind: 'long', req: 1, min: 20, full: 1, help: 'Subject, colours, mood, any text to include, who is in it ...' },
      { k: 'c_ref', label: 'Reference photo link', kind: 'url', full: 1, help: 'Google Drive / Instagram link. You can also send photos on WhatsApp.' }],
    general: [
      { k: 'g_topic', label: 'Your question is about', kind: 'radio', req: 1, list: 'topic', full: 1 },
      { k: 'g_question', label: 'Your question', kind: 'long', req: 1, full: 1 }],
    collab: [
      { k: 'l_kind', label: 'Type of collaboration', kind: 'radio', req: 1, list: 'kind', full: 1 },
      { k: 'l_org', label: 'Organisation / Brand name', kind: 'text' },
      { k: 'l_date', label: 'Expected date / duration', kind: 'text' },
      { k: 'l_details', label: 'Details of your proposal', kind: 'long', req: 1, full: 1 }],
    feedback: [
      { k: 'f_rating', label: 'Your rating', kind: 'scale', req: 1, full: 1 },
      { k: 'f_text', label: 'Your feedback', kind: 'long', req: 1, full: 1 },
      { k: 'f_public', label: 'May we show your feedback on our website?', kind: 'radio', req: 1, list: 'public', full: 1 }]
  };
  var END = [
    { k: 'source', label: 'How did you find Arté By Ayesha?', kind: 'radio', list: 'source', full: 1 },
    { k: 'consent', label: '', kind: 'consent', req: 1, full: 1 }
  ];

  var RE = { phone: /^[6-9][0-9]{9}$/, pin: /^[1-9][0-9]{5}$/, email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, url: /^https?:\/\/[^\s]+$/i, name: /^[^0-9<>@=\/\\]{2,60}$/ };

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var a in (attrs || {})) {
      if (a === 'text') e.textContent = attrs[a];
      else if (a === 'class') e.className = attrs[a];
      else e.setAttribute(a, attrs[a]);
    }
    (kids || []).forEach(function (k) { if (k) e.appendChild(k); });
    return e;
  }
  function listOf(f) { return LISTS[f.list] || []; }

  function build(f) {
    var id = 'f_' + f.k, wrap = el('div', { class: 'field' + (f.full ? ' full' : ''), 'data-k': f.k });
    var labelText = f.label + (f.req ? '' : ' (optional)');
    var star = f.req ? el('span', { class: 'req', text: ' *' }) : null;
    var control, labelEl;
    if (f.kind === 'radio' || f.kind === 'multi' || f.kind === 'scale') {
      labelEl = el('div', { class: 'lbl', id: id + '_l' }, [document.createTextNode(labelText), star]);
      wrap.appendChild(labelEl);
      if (f.help) wrap.appendChild(el('div', { class: 'help', text: f.help }));
      var vals = f.kind === 'scale' ? ['1', '2', '3', '4', '5'] : listOf(f);
      control = el('div', { class: 'opts' + (f.kind === 'scale' ? ' rating' : ''), role: f.kind === 'multi' ? 'group' : 'radiogroup', 'aria-labelledby': id + '_l' });
      vals.forEach(function (v, i) {
        var inp = el('input', { type: f.kind === 'multi' ? 'checkbox' : 'radio', name: f.k, value: v, id: id + '_' + i });
        control.appendChild(el('label', { class: 'opt' }, [inp, el('span', { text: v })]));
      });
      if (f.kind === 'scale') control.appendChild(el('span', { class: 'muted small', text: '  1 = Poor · 5 = Excellent' }));
    } else if (f.kind === 'consent') {
      var cb = el('input', { type: 'checkbox', name: 'consent', id: id });
      control = el('label', { class: 'consent', for: id }, [cb, el('span', { text: STATE.consent + ' *' })]);
    } else {
      labelEl = el('label', { for: id }, [document.createTextNode(labelText), star]);
      wrap.appendChild(labelEl);
      if (f.help) wrap.appendChild(el('div', { class: 'help', id: id + '_h', text: f.help }));
      if (f.kind === 'select') {
        control = el('select', { id: id, name: f.k });
        control.appendChild(el('option', { value: '', text: 'Choose…' }));
        listOf(f).forEach(function (v) { control.appendChild(el('option', { value: v, text: v })); });
      } else if (f.kind === 'long') {
        control = el('textarea', { id: id, name: f.k, rows: '4', maxlength: '2000' });
      } else {
        var type = { email: 'email', phone: 'tel', url: 'url', date: 'date' }[f.kind] || 'text';
        control = el('input', { id: id, name: f.k, type: type, maxlength: '200' });
        if (f.kind === 'phone') { control.setAttribute('inputmode', 'numeric'); control.setAttribute('maxlength', '10'); }
        if (f.kind === 'pin') { control.setAttribute('inputmode', 'numeric'); control.setAttribute('maxlength', '6'); }
        if (f.kind === 'date') control.setAttribute('min', new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
        if (f.ac) control.setAttribute('autocomplete', f.ac);
      }
      if (f.req) control.setAttribute('aria-required', 'true');
    }
    wrap.appendChild(control);
    wrap.appendChild(el('p', { class: 'err', 'data-err': f.k, id: id + '_e' }));
    return wrap;
  }
  function render(container, specs) {
    container.textContent = '';
    specs.forEach(function (f) { container.appendChild(build(f)); });
  }

  function readValue(f) {
    var form = $('form');
    if (f.kind === 'radio' || f.kind === 'scale') { var r = form.querySelector('input[name="' + f.k + '"]:checked'); return r ? r.value : ''; }
    if (f.kind === 'multi') return Array.prototype.map.call(form.querySelectorAll('input[name="' + f.k + '"]:checked'), function (x) { return x.value; });
    if (f.kind === 'consent') return $('f_consent').checked;
    var c = form.elements[f.k]; return c ? String(c.value).trim() : '';
  }
  function check(f, v) {
    var empty = v === '' || v === false || (Array.isArray(v) && !v.length);
    if (empty) return f.req ? (f.kind === 'consent' ? 'Please tick the consent box.' : (f.kind === 'radio' || f.kind === 'scale' || f.kind === 'select') ? 'Please choose an option.' : 'This field is required.') : '';
    if (f.kind === 'name' && !RE.name.test(v)) return 'Please enter your name (2-60 letters).';
    if (f.kind === 'email' && !RE.email.test(v)) return 'Enter a valid e-mail address.';
    if (f.kind === 'phone' && !RE.phone.test(v)) return 'Enter a valid 10-digit mobile number.';
    if (f.kind === 'pin' && !RE.pin.test(v)) return 'Enter a valid 6-digit PIN code.';
    if (f.kind === 'url' && !RE.url.test(v)) return 'Enter a valid link starting with https://';
    if (f.kind === 'long' && f.min && v.length < f.min) return 'Please write at least ' + f.min + ' characters (' + v.length + ' so far).';
    if (f.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Choose a valid date.';
    return '';
  }
  function setErr(k, msg) {
    var p = document.querySelector('[data-err="' + k + '"]');
    if (p) p.textContent = msg || '';
    var wrap = document.querySelector('[data-k="' + k + '"]');
    if (wrap) wrap.classList.toggle('invalid', !!msg);
  }
  var current = '';
  function activeSpecs() { return ABOUT.concat(BY[current] || [], END); }

  function validate() {
    var first = null, ok = true;
    $('formErr').textContent = '';
    activeSpecs().forEach(function (f) {
      var m = check(f, readValue(f)); setErr(f.k, m);
      if (m) { ok = false; if (!first) first = f; }
    });
    if (!current) { document.querySelector('[data-err="type"]').textContent = 'Please choose what you want to contact us about.'; ok = false; first = first || { k: 'type' }; }
    if (!ok && first) {
      var t = first.k === 'type' ? document.querySelector('#types input') : document.querySelector('[data-k="' + first.k + '"] input, [data-k="' + first.k + '"] select, [data-k="' + first.k + '"] textarea');
      if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); }
    }
    return ok;
  }

  function chooseType(key) {
    current = key;
    document.querySelector('[data-err="type"]').textContent = '';
    var t = TYPES.filter(function (x) { return x.key === key; })[0];
    $('detailsTitle').textContent = t.label;
    $('detailsHint').textContent = t.hint || '';
    $('detailsHint').hidden = !t.hint;
    render($('fsDynamic'), BY[key]);
    $('fsDetails').hidden = false;
    $('finalN').textContent = '4';
  }
  function buildTypes() {
    var box = $('types'); box.textContent = '';
    TYPES.forEach(function (t) {
      var inp = el('input', { type: 'radio', name: 'type', value: t.key, id: 'type_' + t.key });
      inp.addEventListener('change', function () { chooseType(t.key); });
      box.appendChild(el('label', { class: 'type' }, [inp, el('span', {}, [el('b', { text: t.icon }), document.createTextNode(t.label)])]));
    });
  }

  function applyContact() {
    var wa = STATE.whatsapp.length === 10 ? '91' + STATE.whatsapp : STATE.whatsapp;
    var link = wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hello Arté By Ayesha, I have a query.') : '';
    ['waTop', 'waBottom', 'waDone'].forEach(function (id) {
      var a = $(id);
      if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; if (id === 'waTop') a.textContent = '💬 Chat on WhatsApp'; }
      else a.hidden = true;
    });
    if (CFG.GOOGLE_FORM_URL) { $('gfLink').href = CFG.GOOGLE_FORM_URL; $('gfWrap').hidden = false; }
    $('replyWithin').textContent = STATE.replyWithin;
    Array.prototype.forEach.call(document.querySelectorAll('.rw'), function (x) { x.textContent = STATE.replyWithin; });
  }

  function fetchJson(url, opts, ms) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 25000) : null;
    if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) { if (timer) clearTimeout(timer); return r.json(); }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function loadConfig() {
    if (!CFG.WEB_APP_URL) {
      var n = $('notice'); n.hidden = false;
      n.textContent = 'This form is not connected yet. ' + (CFG.GOOGLE_FORM_URL ? 'Please use the Google Form link below.' : 'Please contact us on WhatsApp.');
      return Promise.resolve();
    }
    return fetchJson(CFG.WEB_APP_URL + (CFG.WEB_APP_URL.indexOf('?') < 0 ? '?' : '&') + 'action=config', { method: 'GET' }, 12000).then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var d = res.data;
      if (d.lists) { var m = { METHOD: 'method', TIME: 'time', LANG: 'lang', FRAME: 'frame', OCCASION: 'occasion', TOPIC: 'topic', KIND: 'kind', PUBLIC: 'public', SOURCE: 'source' }; for (var k in m) if (d.lists[k]) LISTS[m[k]] = d.lists[k]; }
      ['paintingTypes', 'sizes', 'mediums', 'budgets'].forEach(function (k) { if (d[k] && d[k].length) LISTS[k] = d[k]; });
      if (d.whatsapp) STATE.whatsapp = String(d.whatsapp).replace(/\D/g, '');
      if (d.replyWithin) STATE.replyWithin = d.replyWithin;
      if (d.consent) STATE.consent = d.consent;
      if (d.tagline) $('tagline').textContent = d.tagline;
      if (d.open === false) { var n = $('notice'); n.hidden = false; n.textContent = 'The form is not taking messages right now. Please contact us on WhatsApp.'; $('send').disabled = true; }
    }).catch(function () { /* keep defaults */ });
  }

  function payload() {
    var data = {};
    activeSpecs().forEach(function (f) { var v = readValue(f); if (v !== '' && !(Array.isArray(v) && !v.length) && v !== false) data[f.k] = v; });
    return { action: 'submit', type: current, data: data, website: $('form').elements.website.value };
  }
  function showError(msg) { $('formErr').textContent = msg; }
  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (!CFG.WEB_APP_URL) { showError('This form is not connected yet. Please contact us on WhatsApp' + (CFG.GOOGLE_FORM_URL ? ' or use the Google Form.' : '.')); return; }
    var btn = $('send'); btn.disabled = true; btn.textContent = 'Sending…'; $('formErr').textContent = '';
    var body = payload();
    fetchJson(CFG.WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (res) {
      if (res && res.ok) { success(body.data); return; }
      showError((res && res.error) || 'Could not send your message. Please try again.');
    }).catch(function () {
      showError('Could not reach the server. Check your internet and try again' + (STATE.whatsapp ? ', or WhatsApp us.' : '.'));
    }).then(function () { btn.disabled = false; btn.textContent = 'Send message'; });
  }
  function success(d) {
    $('doneName').textContent = (d.name || '').split(' ')[0];
    $('doneMethod').textContent = d.method || 'your preferred method';
    $('doneEmail').textContent = d.email || '';
    $('form').hidden = true; $('done').hidden = false; $('done').focus();
    $('waDone').hidden = !(current === 'commission' && STATE.whatsapp);
    window.scrollTo(0, 0);
  }
  function reset() {
    $('form').reset(); current = ''; $('fsDetails').hidden = true; $('finalN').textContent = '3';
    render($('fsAbout'), ABOUT); render($('fsEnd'), END);
    document.querySelectorAll('.err').forEach(function (p) { p.textContent = ''; });
    $('form').hidden = false; $('done').hidden = true;
  }

  function init() {
    $('year').textContent = new Date().getFullYear();
    if (CFG.HOME_URL) { $('homeLink').href = CFG.HOME_URL; $('backLink').href = CFG.HOME_URL; }
    loadConfig().then(function () {
      applyContact(); buildTypes(); render($('fsAbout'), ABOUT); render($('fsEnd'), END);
      var q = (location.search.match(/[?&]type=(\w+)/) || [])[1];
      if (q && BY[q]) { var r = $('type_' + q); if (r) { r.checked = true; chooseType(q); } }
    });
    $('form').addEventListener('submit', submit);
    $('form').addEventListener('input', function (e) {
      var k = e.target.name;
      if (k && document.querySelector('[data-k="' + k + '"].invalid')) {
        var f = activeSpecs().filter(function (x) { return x.k === k; })[0];
        if (f) setErr(k, check(f, readValue(f)));
      }
    });
    $('again').addEventListener('click', reset);
  }
  init();
})();
