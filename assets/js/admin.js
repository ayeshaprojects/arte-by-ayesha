/* Private admin dashboard. The password is never stored here: it is checked by Apps Script, which returns a
   signed, expiring token kept only in sessionStorage. Every change is written to Google Sheets / Drive. */
(function () {
  'use strict';
  var el = U.el, app = document.getElementById('app'), dlg = document.getElementById('dlg'), dform = document.getElementById('dform');
  var token = '', tab = 'dashboard';
  try { token = sessionStorage.getItem('arte_admin') || ''; } catch (e) { /* ignore */ }

  var COLL = {
    artwork: { label: 'Artwork', key: 'Artwork_ID', on: 'Published', folder: 'Artwork Gallery', cols: ['Title', 'Category', 'Availability', 'Featured', 'Display_Order', 'Status'],
      fields: ['Title', 'Category', 'Image_ID', 'Description', 'Medium', 'Dimensions', 'Year', 'Availability', 'Featured', 'Display_Order', 'Status'] },
    categories: { label: 'Categories', key: 'Category_ID', on: 'Active', cols: ['Category_Name', 'Filter_Type', 'Display_Order', 'Status'], fields: ['Category_Name', 'Description', 'Display_Order', 'Status', 'Filter_Type'] },
    services: { label: 'Services', key: 'Service_ID', on: 'Active', folder: 'Service Images', cols: ['Title', 'Price', 'Display_Order', 'Status'], fields: ['Title', 'Image_ID', 'Description', 'Price', 'Enquiry_URL', 'Display_Order', 'Status'] },
    products: { label: 'Products', key: 'Product_ID', on: 'Active', folder: 'Product Images', cols: ['Product_Name', 'Price', 'Availability', 'Featured', 'Status'], fields: ['Product_Name', 'Image_ID', 'Description', 'Price', 'Availability', 'Enquiry_URL', 'Featured', 'Status'] },
    'social-links': { label: 'Social links', key: 'ID', on: 'Active', cols: ['Platform', 'URL', 'Display_Order', 'Status'], fields: ['Platform', 'Icon', 'URL', 'Display_Order', 'Status'] },
    'footer-navigation': { label: 'Footer links', key: 'ID', on: 'Active', cols: ['Title', 'URL', 'Section_Name', 'Display_Order', 'Status'], fields: ['Title', 'URL', 'Link_Type', 'Target', 'Section_Name', 'Display_Order', 'Status'] },
    'gallery-featured': { label: 'Featured list', key: 'ID', on: 'Active', cols: ['Artwork_ID', 'Display_Order', 'Status'], fields: ['Artwork_ID', 'Display_Order', 'Status'] }
  };
  var SETTING_UPLOADS = { Logo_ID: 'Website Logo', Favicon_ID: 'Website Logo', Hero_Image_ID: 'Other Media', Profile_Image_ID: 'Profile Images' };

  function call(body) {
    body.token = token;
    return Api.post(body).then(function (r) {
      if (!r.ok) {
        if (/Unauthorized|expired/i.test(r.error || '')) { token = ''; try { sessionStorage.removeItem('arte_admin'); } catch (e) {} show(); }
        throw new Error(r.error || 'Request failed');
      }
      return r;
    });
  }
  function msg(node, text, cls) { node.textContent = text; node.className = cls || ''; }

  function login() {
    U.clear(app);
    var status = el('p');
    var pw = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Admin password' });
    var f = el('form', { class: 'card login' }, el('h2', { text: 'Admin login' }), pw, el('p'), el('button', { class: 'p', type: 'submit', text: 'Log in' }), status);
    if (Api.demo) status.textContent = 'Demo mode: set API_URL in assets/js/config.js first.';
    f.addEventListener('submit', function (e) {
      e.preventDefault(); msg(status, 'Checking…');
      Api.post({ action: 'admin-login', password: pw.value }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        token = r.token; try { sessionStorage.setItem('arte_admin', token); } catch (x) {}
        show();
      }).catch(function (x) { msg(status, x.message || 'Login failed', 'err'); });
    });
    app.appendChild(f);
  }

  function show() {
    document.getElementById('logout').hidden = !token;
    if (!token) return login();
    U.clear(app);
    var tabs = el('div', { class: 'tabs' });
    [['dashboard', 'Dashboard'], ['requests', 'Commission requests']].concat(Object.keys(COLL).map(function (k) { return [k, COLL[k].label]; }), [['settings', 'Settings / Logo / Register'], ['messages', 'Messages']])
      .forEach(function (t) { tabs.appendChild(el('button', { type: 'button', 'aria-pressed': String(tab === t[0]), text: t[1], onclick: function () { tab = t[0]; show(); } })); });
    var body = el('div');
    app.appendChild(tabs); app.appendChild(body);
    if (tab === 'dashboard') dashboard(body); else if (tab === 'settings') settings(body); else if (tab === 'messages') messages(body); else if (tab === 'requests') requests(body); else collection(body, tab);
  }

  function dashboard(host) {
    host.appendChild(el('p', { text: 'Loading…' }));
    call({ action: 'admin-stats' }).then(function (r) {
      U.clear(host);
      var g = el('div', { class: 'stats' });
      Object.keys(r.data).forEach(function (k) { g.appendChild(el('div', { class: 'stat' }, el('b', { text: r.data[k].active + ' / ' + r.data[k].total }), el('span', { text: k + ' (live / total)' }))); });
      host.appendChild(el('div', { class: 'card' }, el('h3', { text: 'Website statistics' }), g,
        el('p', { class: 'hint', text: 'Only rows with Status Published/Active appear on the public website.' }),
        el('button', { type: 'button', text: 'Refresh public cache now', onclick: function () { call({ action: 'cache-clear' }).then(function () { alert('Cache cleared.'); }); } })));
    }).catch(function (e) { U.clear(host); host.appendChild(el('p', { class: 'err', text: e.message })); });
  }

  function upload(folder, input) {
    var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/jpeg,image/png,image/webp,image/svg+xml';
    f.onchange = function () {
      var file = f.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) return alert('Image is larger than 5 MB.');
      var rd = new FileReader();
      rd.onload = function () {
        input.placeholder = 'Uploading…';
        call({ action: 'image-upload', filename: file.name, mimeType: file.type, base64: String(rd.result), folder: folder })
          .then(function (r) { input.value = r.fileId; input.placeholder = ''; })
          .catch(function (e) { alert(e.message); });
      };
      rd.readAsDataURL(file);
    };
    f.click();
  }

  function editor(name, rec, done) {
    var c = COLL[name], inputs = {};
    U.clear(dform);
    dform.appendChild(el('h3', { text: (rec ? 'Edit ' : 'Add ') + c.label }));
    c.fields.forEach(function (fld) {
      var inp = fld === 'Description' ? el('textarea', { rows: 4 }) : el('input', { type: 'text' });
      if (fld === 'Status') { inp = el('select'); [c.on, 'Draft'].forEach(function (o) { inp.appendChild(el('option', { value: o, text: o })); }); }
      inp.value = rec && rec[fld] != null ? rec[fld] : (fld === 'Status' ? c.on : '');
      inputs[fld] = inp;
      var lab = el('label', { text: fld.replace(/_/g, ' ') }, inp);
      if (fld === 'Image_ID') {
        lab.appendChild(el('div', { class: 'row' }, el('button', { type: 'button', text: 'Upload image to Drive', onclick: function () { upload(c.folder || 'Artwork Gallery', inp); } }),
          el('span', { class: 'hint', text: 'or paste a Drive file ID / share link' })));
      }
      dform.appendChild(lab);
    });
    var st = el('p');
    dform.appendChild(st);
    dform.appendChild(el('div', { class: 'row' }, el('button', { class: 'p', type: 'button', text: 'Save', onclick: function () {
      var data = {}; Object.keys(inputs).forEach(function (k) { data[k] = inputs[k].value; });
      msg(st, 'Saving…');
      var req = rec ? { action: name + '-update', id: rec[c.key], data: data } : { action: name + '-create', data: data };
      call(req).then(function () { dlg.close(); done(); }).catch(function (e) { msg(st, e.message, 'err'); });
    } }), el('button', { type: 'button', text: 'Cancel', onclick: function () { dlg.close(); } })));
    dlg.showModal();
  }

  function collection(host, name) {
    var c = COLL[name];
    host.appendChild(el('p', { text: 'Loading…' }));
    call({ action: name + '-list' }).then(function (r) {
      U.clear(host);
      var table = el('table'), head = el('tr');
      c.cols.concat(['']).forEach(function (h) { head.appendChild(el('th', { text: h.replace(/_/g, ' ') })); });
      table.appendChild(el('thead', null, head));
      var tb = el('tbody'); table.appendChild(tb);
      r.data.forEach(function (rec) {
        var tr = el('tr');
        c.cols.forEach(function (k) { tr.appendChild(el('td', { text: String(rec[k] == null ? '' : rec[k]) })); });
        var live = U.isActive(rec.Status);
        tr.appendChild(el('td', null, el('div', { class: 'row' },
          el('button', { type: 'button', text: 'Edit', onclick: function () { editor(name, rec, function () { show(); }); } }),
          el('button', { type: 'button', text: live ? 'Unpublish' : 'Publish', onclick: function () {
            call({ action: name + '-update', id: rec[c.key], data: { Status: live ? 'Draft' : c.on } }).then(show).catch(function (e) { alert(e.message); }); } }),
          el('button', { class: 'd', type: 'button', text: 'Delete', onclick: function () {
            if (confirm('Delete this record permanently?')) call({ action: name + '-delete', id: rec[c.key] }).then(show).catch(function (e) { alert(e.message); }); } }))));
        tb.appendChild(tr);
      });
      host.appendChild(el('div', { class: 'card' }, el('div', { class: 'row' }, el('h3', { text: c.label + ' (' + r.data.length + ')' }),
        el('button', { class: 'p', type: 'button', text: '+ Add new', onclick: function () { editor(name, null, show); } })), el('div', { class: 'wrapx' }, table)));
    }).catch(function (e) { U.clear(host); host.appendChild(el('p', { class: 'err', text: e.message })); });
  }

  function settings(host) {
    host.appendChild(el('p', { text: 'Loading…' }));
    call({ action: 'settings-list' }).then(function (r) {
      U.clear(host);
      var inputs = {}, box = el('div', { class: 'card' }, el('h3', { text: 'Site settings' }),
        el('p', { class: 'hint', text: 'Logo_ID, Favicon_ID: upload an image or paste a Drive ID. Register_Button_URL: your Google Form link. Register_Button_Status: Active / Draft.' }));
      r.data.forEach(function (s) {
        var long = /About_|Description|Announcement|Footer_Text|Subtitle|Commission_Types|Commission_Sizes|Tagline/.test(s.Setting_Key);
        var inp = long ? el('textarea', { rows: 3 }) : el('input', { type: 'text' });
        inp.value = s.Setting_Value == null ? '' : s.Setting_Value; inputs[s.Setting_Key] = inp;
        var lab = el('label', { text: s.Setting_Key.replace(/_/g, ' ') }, inp);
        if (SETTING_UPLOADS[s.Setting_Key]) lab.appendChild(el('button', { type: 'button', text: 'Upload image', onclick: function () { upload(SETTING_UPLOADS[s.Setting_Key], inp); } }));
        box.appendChild(lab);
      });
      var st = el('p');
      box.appendChild(el('button', { class: 'p', type: 'button', text: 'Save settings', onclick: function () {
        var values = {}; Object.keys(inputs).forEach(function (k) { values[k] = inputs[k].value; });
        msg(st, 'Saving…'); call({ action: 'settings-update', values: values }).then(function () { msg(st, 'Saved. The website updates within the cache time (a few minutes) or after a cache refresh.', 'ok'); }).catch(function (e) { msg(st, e.message, 'err'); });
      } }));
      box.appendChild(st); host.appendChild(box);
    }).catch(function (e) { U.clear(host); host.appendChild(el('p', { class: 'err', text: e.message })); });
  }

  function requests(host) {
    host.appendChild(el('p', { text: 'Loading…' }));
    call({ action: 'commission-requests-list' }).then(function (r) {
      U.clear(host);
      var box = el('div', { class: 'card' }, el('h3', { text: 'Commission requests (' + r.data.length + ')' }),
        el('p', { class: 'hint', text: 'Reference photos are private: open them while signed in to the Google account that owns the Drive.' }));
      r.data.slice().reverse().forEach(function (m) {
        var done = String(m.Status).toLowerCase() === 'done';
        var line = function (k, v) { return v ? el('div', null, el('b', { text: k + ': ' }), String(v)) : null; };
        box.appendChild(el('div', { class: 'card' },
          el('div', { class: 'row' }, el('strong', { text: m.Full_Name || '(no name)' }), el('span', { class: 'pill' + (done ? ' done' : ''), text: m.Status || 'New' }), el('span', { class: 'hint', text: m.Date })),
          line('Email', m.Email), line('Phone/WhatsApp', m.Phone), line('City', m.City), line('Type', m.Painting_Type), line('Size', m.Size), line('Budget (₹)', m.Budget), line('Needed by', m.Needed_By),
          el('p', { class: 'req', text: m.Idea }),
          U.isHttp(m.Reference_Photo) ? el('a', { href: m.Reference_Photo, target: '_blank', rel: 'noopener noreferrer', text: 'Open reference photo' }) : null,
          el('div', { class: 'row' },
            el('button', { type: 'button', text: done ? 'Mark as new' : 'Mark as done', onclick: function () { call({ action: 'commission-requests-update', id: m.Request_ID, data: { Status: done ? 'New' : 'Done' } }).then(show).catch(function (e) { alert(e.message); }); } }),
            el('button', { class: 'd', type: 'button', text: 'Delete', onclick: function () { if (confirm('Delete this request permanently?')) call({ action: 'commission-requests-delete', id: m.Request_ID }).then(show).catch(function (e) { alert(e.message); }); } }))));
      });
      if (!r.data.length) box.appendChild(el('p', { text: 'No commission requests yet.' }));
      host.appendChild(box);
    }).catch(function (e) { U.clear(host); host.appendChild(el('p', { class: 'err', text: e.message })); });
  }

  function messages(host) {
    host.appendChild(el('p', { text: 'Loading…' }));
    call({ action: 'messages-list' }).then(function (r) {
      U.clear(host);
      var box = el('div', { class: 'card' }, el('h3', { text: 'Contact messages (' + r.data.length + ')' }));
      r.data.slice().reverse().forEach(function (m) {
        box.appendChild(el('div', { class: 'card' }, el('strong', { text: (m.Subject || '(no subject)') + ' - ' + m.Name }), el('div', { class: 'hint', text: m.Email + ' · ' + m.Date }), el('p', { text: m.Message })));
      });
      if (!r.data.length) box.appendChild(el('p', { text: 'No messages yet.' }));
      host.appendChild(box);
    }).catch(function (e) { U.clear(host); host.appendChild(el('p', { class: 'err', text: e.message })); });
  }

  document.getElementById('logout').addEventListener('click', function () { token = ''; try { sessionStorage.removeItem('arte_admin'); } catch (e) {} show(); });
  show();
})();
