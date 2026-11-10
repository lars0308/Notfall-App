'use strict';
/* ===== Notfall! – UI-Kern: Router, Shell, Dialoge, Formulare, Sperre ===== */

const ACT = {}, FORM = {}, INPUT = {}, ROUTES = [];
const UI = { route: '#/home', params: {}, modals: [], locked: false, userId: null, afterRender: null, bag3d: null };
const route = (pattern, fn) => ROUTES.push({ re: new RegExp('^' + pattern.replace(/:[a-z]+/g, '([^/]+)') + '$'), fn });

/* ---- Rechte ---- */
function curUser() { return DB.users.find(u => u.id === UI.userId) || null; }
function can(perm) { if (!DB.users.length) return true; const u = curUser(); if (!u) return false; if (u.role === 'admin') return true; return !!(u.perms && u.perms[perm]); }
function needPerm(perm, msg) { if (can(perm)) return true; toast(msg || 'Dafür fehlt dir die Berechtigung.'); return false; }

/* ---- Navigation ---- */
function go(hash) { if (location.hash === hash) rerender(); else location.hash = hash; }
function goReplace(hash) { history.replaceState(null, '', hash); render(); }
function parseRoute() {
  const hash = location.hash || '#/home'; const path = hash.replace(/^#/, '').split('?')[0];
  for (const r of ROUTES) { const m = r.re.exec(path); if (m) return { fn: r.fn, params: m.slice(1).map(decodeURIComponent), path }; }
  return null;
}
window.addEventListener('hashchange', () => { closeAllModals(); render(); });

const NAV_MAIN = [
  ['#/home', 'Start', 'home'], ['#/bags', 'Taschen', 'bag'], ['#/review', 'Packliste', 'check'], ['#/pass', 'Notfallpass', 'shield'], ['#/more', 'Mehr', 'grid'],
];
const NAV_ALL = [
  ['#/home', 'Start', 'home'], ['#/bags', 'Meine Taschen', 'bag'], ['#/review', 'Packliste', 'check'], ['#/pass', 'Notfallpass & Kontakte', 'shield'],
  ['#/shop', 'Einkaufsliste', 'cart'], ['#/remind', 'Erinnerungen', 'bell'], ['#/more', 'Mehr', 'grid'],
];
function navCounts() {
  const H = HH(); const S = DB.settings; const c = {};
  try {
    c['#/shop'] = H.shop.filter(s => !s.bought).length;
    c['#/review'] = H.items.filter(i => !i.archived && i.container !== 'home' && i.status === 'planned').length;
    c['#/remind'] = H.reminders.filter(r => r.enabled && daysUntil(r.next) !== null && daysUntil(r.next) <= 0).length;
  } catch (e) { console.error(e); }
  return c;
}
const NAV_GROUP = { '#/pass': ['#/pass', '#/ice', '#/contacts'], '#/more': ['#/more', '#/items', '#/item', '#/recs', '#/safe', '#/settings', '#/stock', '#/places', '#/map', '#/alarm', '#/sources', '#/households', '#/docs'] };
function navLink(href, label, ic, counts, cur) {
  const n = counts[href]; const active = cur === href || (href !== '#/home' && cur.startsWith(href + '/')) || (NAV_GROUP[href] || []).some(r => cur === r || cur.startsWith(r + '/'));
  return h`<a href="${href}" ${active ? raw('aria-current="page"') : ''}>${icon(ic)}<span>${label}</span>${n ? h`<span class="count">${n}</span>` : ''}</a>`;
}

/* ---- Rendering ---- */
let _renderBusy = false;
function rerender() { render(true); }
/* Die ganze Seite scrollt (nicht ein innerer Bereich) – das ist in der Android-WebView am zuverlaessigsten. */
const scroller = () => document.scrollingElement || document.documentElement;
function render(keepScroll) {
  if (!DB) return;
  const root = $('#app'); $('#boot') && $('#boot').remove(); root.hidden = false;
  closeAllModals();
  if (UI.bag3d) { UI.bag3d.destroy(); UI.bag3d = null; }
  if (UI.mapView) { UI.mapView.destroy(); UI.mapView = null; }
  if (UI.locked) { renderLock(root); return; }
  const H = HH();
  let cur = location.hash || '#/home';
  if (!H.setup.done && !H.setup.skipped && !H.bags.length && !/^#\/(wizard|setup|settings|sos|households|ice)/.test(cur)) { const to = H.profileDone ? '#/wizard' : '#/setup'; history.replaceState(null, '', to); cur = to; }
  if (UI.sosLimited && !/^#\/sos/.test(cur)) { UI.sosLimited = false; UI.locked = !!DB.users.length; if (UI.locked) { renderLock(root); return; } }
  const rt = parseRoute() || { fn: () => ({ title: 'Nicht gefunden', html: h`<div class="empty">Diese Seite gibt es nicht. <a href="#/home">Zur Startseite</a></div>` }), params: [], path: cur };
  UI.route = rt.path; UI.params = rt.params; UI.q = new URLSearchParams((location.hash.split('?')[1]) || '');
  const wasTop = scroller().scrollTop;
  let view;
  try { view = rt.fn(...rt.params, H) || {}; } catch (e) { console.error(e); view = { title: 'Fehler', html: h`<div class="notice must"><div><p class="nt">Anzeige fehlgeschlagen</p><p>${String(e.message || e)}</p><p><a href="#/home">Zur Startseite</a></p></div></div>` }; }
  const counts = navCounts();
  const fullscreen = !!view.full;
  const sos = rt.path.startsWith('/sos');
  const topLeft = view.back ? h`<a class="btn icon ghost" href="${view.back}" aria-label="Zurück">${icon('back')}</a>` : '';
  const limited = UI.sosLimited && sos;
  const shell = fullscreen ? h`<div class="main">${view.html}</div>` : limited ? h`<div class="shell"><div class="main sos-screen"><header class="topbar"><h1>${view.title || ''}</h1>${view.actions || ''}</header><main class="page" id="page"><div class="page-inner">${view.html}</div></main></div></div>` : h`
    <div class="shell">
      <nav class="rail" aria-label="Hauptnavigation"><div class="brand">Notfall<span>!</span></div>
        ${NAV_ALL.map(([href, label, ic]) => navLink(href, label, ic, counts, '#' + rt.path))}
        <div style="padding:16px 8px 0"><a class="btn sos block" href="#/sos" style="color:#fff">${icon('alert')} Notfallmodus</a></div>
        <div class="small muted" style="padding:16px 12px">${esc(H.name)}${H.sample ? ' · Testdaten' : ''}</div>
      </nav>
      <div class="main withnav ${sos ? 'sos-screen' : ''}">
        <header class="topbar">${topLeft}<h1>${view.title || ''}</h1>${view.actions || ''}<a class="btn sos sm" href="#/sos" aria-label="Notfallmodus öffnen">${icon('alert')}<span>Notfall</span></a></header>
        <main class="page" id="page"><div class="page-inner">${view.html}</div></main>
        <nav class="bottomnav" aria-label="Navigation">${NAV_MAIN.map(([href, label, ic]) => navLink(href, label, ic, counts, '#' + rt.path))}</nav>
      </div>
    </div>`;
  root.innerHTML = shell.s;
  scroller().scrollTop = keepScroll ? wasTop : 0;
  if (!KV.native && !UI.browserNoticeShown) { UI.browserNoticeShown = true; toast('Browser-Testmodus: Daten sind hier nicht Keystore-verschlüsselt.', 5000); }
  hydratePhotos(root);
  if (view.after) { try { view.after(); } catch (e) { console.error(e); } }
  applyBars();
  document.title = 'Notfall! – ' + (view.title || '');
}

/* ---- Theme ---- */
function applyTheme() {
  const s = DB.settings; const root = document.documentElement;
  const dark = s.theme === 'dark' || (s.theme === 'system' && !(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches));
  root.dataset.theme = dark ? 'dark' : 'light'; root.dataset.scale = s.scale === 'l' ? 'l' : s.scale === 'xl' ? 'xl' : 'm'; root.dataset.contrast = s.contrast === 'high' ? 'high' : 'normal';
  applyBars();
}
function applyBars() {
  if (!NATIVE || !NATIVE.setBars) return;
  const cs = getComputedStyle(document.documentElement); const col = (UI.route && UI.route.startsWith('/sos')) ? '#241012' : cs.getPropertyValue('--surface').trim() || '#171d22';
  const m = /^#([0-9a-f]{6})$/i.exec(col); const c = m ? parseInt(m[1], 16) : 0x171d22;
  NATIVE.setBars(0xFF000000 | c, document.documentElement.dataset.theme === 'light');
}
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (DB && DB.settings.theme === 'system') applyTheme(); });

/* ---- Dialoge ---- */
function openModal({ title, body, foot, wide, onClose }) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const id = 'm' + uid();
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}"><div class="modal-head"><h2 id="${id}">${esc(title)}</h2><button class="btn icon ghost" data-act="modal-close" aria-label="Schließen" type="button">${icon('close').s}</button></div><div class="modal-body">${body && body.s !== undefined ? body.s : esc(body || '')}</div>${foot ? `<div class="modal-foot">${foot.s}</div>` : ''}</div>`;
  $('#overlay').appendChild(bg); $('#overlay').style.pointerEvents = 'auto';
  const m = { el: bg, onClose }; UI.modals.push(m);
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(m); });
  const first = $('input:not([type=hidden]):not([type=checkbox]),select,textarea', bg); if (first && !first.matches('[data-nofocus]')) first.focus();
  hydratePhotos(bg);
  return m;
}
function closeModal(m) {
  m = m || UI.modals[UI.modals.length - 1]; if (!m) return false;
  m.el.remove(); UI.modals = UI.modals.filter(x => x !== m);
  if (!UI.modals.length) $('#overlay').style.pointerEvents = 'none';
  if (m.onClose) m.onClose();
  return true;
}
function closeAllModals() { while (UI.modals.length) closeModal(); }
window.__handleBack = () => { if (UI.modals.length) { closeModal(); return true; } return false; };
function dlgButtons(buttons) { return h`${buttons.map(b => h`<button type="${b.submit ? 'submit' : 'button'}" class="btn ${b.cls || ''}" ${b.form ? raw('form="' + esc(b.form) + '"') : ''} ${b.act ? raw('data-act="' + esc(b.act) + '"') : ''} ${b.data ? raw(Object.entries(b.data).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ')) : ''}>${b.icon ? icon(b.icon) : ''}${b.label}</button>`)}`; }
function confirmDlg(title, text, { ok = 'Bestätigen', danger = false, cancel = 'Abbrechen' } = {}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = openModal({ title, body: typeof text === 'string' ? h`<p>${text}</p>` : text, foot: dlgButtons([{ label: cancel, act: 'dlg-no' }, { label: ok, cls: danger ? 'danger solid' : 'primary', act: 'dlg-yes' }]), onClose: () => fin(false) });
    m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'dlg-yes') { fin(true); closeModal(m); } else if (a.dataset.act === 'dlg-no') { closeModal(m); } });
  });
}
function promptDlg(title, label, value = '', { type = 'text', ok = 'OK', hint = '', placeholder = '' } = {}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = openModal({ title, body: h`<form id="pdlg" class="stack"><div class="field"><label for="pd">${label}</label><input id="pd" name="v" type="${type}" value="${value}" placeholder="${placeholder}" autocomplete="off">${hint ? h`<div class="hint">${hint}</div>` : ''}</div></form>`, foot: dlgButtons([{ label: 'Abbrechen', act: 'dlg-no' }, { label: ok, cls: 'primary', submit: true, form: 'pdlg' }]), onClose: () => fin(null) });
    $('#pdlg', m.el).addEventListener('submit', e => { e.preventDefault(); fin(new FormData(e.target).get('v')); closeModal(m); });
    m.el.addEventListener('click', e => { const a = e.target.closest('[data-act="dlg-no"]'); if (a) closeModal(m); });
  });
}
/* Dialog mit eigenem Formular; handler(FormData, form) -> true/Promise<true> schliesst */
function formDlg({ title, body, ok = 'Speichern', wide, extraFoot = [], onSubmit, onOpen }) {
  const fid = 'fd' + uid();
  const m = openModal({ title, wide, body: h`<form id="${fid}" class="stack" autocomplete="off">${body}</form>`, foot: dlgButtons([...extraFoot, { label: 'Abbrechen', act: 'dlg-no' }, { label: ok, cls: 'primary', submit: true, form: fid }]) });
  const f = $('#' + fid, m.el);
  f.addEventListener('submit', async e => {
    e.preventDefault(); const btn = $('button[type=submit]', m.el); if (btn) btn.disabled = true;
    try { const r = await onSubmit(new FormData(f), f, m); if (r !== false) closeModal(m); } catch (err) { toast(err.message || String(err)); }
    if (btn) btn.disabled = false;
  });
  m.el.addEventListener('click', e => { const a = e.target.closest('[data-act="dlg-no"]'); if (a) closeModal(m); });
  if (onOpen) onOpen(m, f);
  return m;
}

/* ---- Formularbausteine ---- */
const attrs = o => raw(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== false && v !== null).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' '));
const F = {
  text: (n, l, v = '', o = {}) => h`<div class="field"><label for="f_${n}">${l}</label><input id="f_${n}" type="${o.type || 'text'}" name="${n}" value="${v ?? ''}" ${attrs({ placeholder: o.ph, required: o.req, inputmode: o.mode, maxlength: o.max, min: o.min, max: o.maxv, step: o.step, autocomplete: 'off', list: o.list })} ${o.attrs ? attrs(o.attrs) : ''}>${o.hint ? h`<div class="hint">${o.hint}</div>` : ''}</div>`,
  num: (n, l, v = '', o = {}) => F.text(n, l, v, Object.assign({ type: 'number', mode: 'decimal', step: 'any', min: 0 }, o)),
  date: (n, l, v = '', o = {}) => F.text(n, l, v, Object.assign({ type: 'date' }, o)),
  area: (n, l, v = '', o = {}) => h`<div class="field"><label for="f_${n}">${l}</label><textarea id="f_${n}" name="${n}" ${attrs({ placeholder: o.ph, rows: o.rows || 4 })}>${v ?? ''}</textarea>${o.hint ? h`<div class="hint">${o.hint}</div>` : ''}</div>`,
  select: (n, l, opts, v = '', o = {}) => h`<div class="field"><label for="f_${n}">${l}</label><select id="f_${n}" name="${n}" ${o.attrs ? attrs(o.attrs) : ''}>${opts.map(op => { const [val, lab] = Array.isArray(op) ? op : [op, op]; return h`<option value="${val}" ${String(val) === String(v) ? raw('selected') : ''}>${lab}</option>`; })}</select>${o.hint ? h`<div class="hint">${o.hint}</div>` : ''}</div>`,
  check: (n, l, checked, o = {}) => h`<label class="check"><input type="checkbox" name="${n}" value="${o.value ?? '1'}" ${checked ? raw('checked') : ''} ${o.attrs ? attrs(o.attrs) : ''}><span><span class="t">${l}</span>${o.desc ? h`<span class="s" style="display:block">${o.desc}</span>` : ''}</span></label>`,
  yn: (n, l, v, o = {}) => F.select(n, l, [['', 'Keine Angabe'], ['1', 'Ja'], ['0', 'Nein']], v === true ? '1' : v === false ? '0' : '', o),
  section: (t, inner) => h`<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="bold" style="padding:0 0 8px">${t}</legend>${inner}</fieldset>`,
};
const fdBool = (fd, n) => fd.get(n) === '1' || fd.get(n) === 'on';
const fdYN = (fd, n) => fd.get(n) === '1' ? true : fd.get(n) === '0' ? false : null;
function noticeBox(level, title, text, extra) {
  const ic = { must: 'alert', rec: 'alert', ok: 'check', info: 'info' }[level] || 'info';
  return h`<div class="notice ${level}" role="note">${icon(ic)}<div class="grow">${title ? h`<p class="nt">${title}</p>` : ''}${text ? h`<p>${text}</p>` : ''}${extra || ''}</div></div>`;
}
const levelBadge = lv => h`<span class="badge ${lv === 'must' ? 'must' : lv === 'rec' ? 'rec' : ''}">${PRIO_LABEL[lv] || lv}</span>`;
const bar = (p, cls = '') => h`<div class="progress ${cls}" role="progressbar" aria-valuenow="${clamp(p, 0, 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${clamp(p, 0, 100)}%"></i></div>`;
const empty = (text, btn) => h`<div class="empty"><p>${text}</p>${btn || ''}</div>`;
const thumb = (photoId, ic = 'image', big = false) => photoId ? h`<span class="thumb ${big ? 'lg' : ''}"><img data-ph="${photoId}" alt=""></span>` : h`<span class="thumb ${big ? 'lg' : ''}">${icon(ic)}</span>`;
function pageHead(title, sub, actions) { return h`<div class="row spread" style="align-items:flex-start"><div class="grow"><h2>${title}</h2>${sub ? h`<p class="muted">${sub}</p>` : ''}</div>${actions ? h`<div class="btns">${actions}</div>` : ''}</div>`; }

/* ---- Event-Weiterleitung ---- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'modal-close') { closeModal(); return; }
  if (a === 'dlg-yes' || a === 'dlg-no') return;
  const fn = ACT[a]; if (!fn) { console.warn('Unbekannte Aktion', a); return; }
  if (el.tagName === 'A') e.preventDefault();
  try { await fn(el.dataset, el, e); } catch (err) { console.error(err); toast(err.message || 'Fehler: ' + err); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const fn = FORM[f.dataset.form]; if (!fn) return;
  try { await fn(new FormData(f), f); } catch (err) { console.error(err); toast(err.message || 'Fehler: ' + err); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUT[el.dataset.input]) INPUT[el.dataset.input](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && INPUT[el.dataset.change]) INPUT[el.dataset.change](el, e); });
ACT['noop'] = () => {};

/* ---- Sperrbildschirm ---- */
let _pin = '', _lockUser = null;
function lockNow() { if (!DB.users.length) return; UI.locked = true; UI.userId = null; Vault.lock(); _pin = ''; _lockUser = null; render(); }
function renderLock(root) {
  const users = DB.users; const S = DB.settings;
  if (!_lockUser) _lockUser = users.length === 1 ? users[0].id : (users.find(u => u.id === S.lastUserId) ? null : null);
  const u = users.find(x => x.id === _lockUser);
  const bioOk = u && u.bio && NATIVE && NATIVE.bioAvailable && NATIVE.bioAvailable();
  root.innerHTML = h`<div class="lock"><div class="lock-box">
    <div class="center"><div class="boot-logo">Notfall<span>!</span></div><p class="muted">${u ? 'PIN für ' + u.name : 'Wer bist du?'}</p></div>
    ${u ? h`<div class="pin-dots" aria-label="PIN-Eingabe">${[...Array(Math.max(4, _pin.length))].map((_, i) => h`<i class="${i < _pin.length ? 'on' : ''}"></i>`)}</div>
      <div id="lockmsg" class="center small must" role="alert" style="color:var(--must);min-height:1.4em"></div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => h`<button type="button" data-act="pin-key" data-k="${n}">${n}</button>`)}
        <button type="button" data-act="pin-back" aria-label="Löschen">⌫</button><button type="button" data-act="pin-key" data-k="0">0</button><button type="button" class="btn primary" style="font-size:1rem" data-act="pin-ok">OK</button></div>
      ${bioOk ? h`<button class="btn block" data-act="pin-bio">${icon('eye')} Mit Fingerabdruck/Gesicht entsperren</button>` : ''}
      ${users.length > 1 ? h`<button class="btn ghost block" data-act="pin-switch">Anderen Benutzer wählen</button>` : ''}`
      : h`<div class="stack-s">${users.map(x => h`<button class="btn block" data-act="pin-user" data-id="${x.id}">${icon('users')} ${x.name}</button>`)}</div>`}
    ${S.lockContacts ? h`<a class="btn danger block" href="#/sos" data-act="lock-sos">${icon('alert')} Notruf & Notfallpass</a>` : ''}
  </div></div>`.s;
}
ACT['pin-user'] = d => { _lockUser = d.id; _pin = ''; render(); };
ACT['pin-switch'] = () => { _lockUser = null; _pin = ''; render(); };
ACT['pin-key'] = d => { if (_pin.length < 8) { _pin += d.k; renderLock($('#app')); } };
ACT['pin-back'] = () => { _pin = _pin.slice(0, -1); renderLock($('#app')); };
ACT['lock-sos'] = () => { UI.sosLimited = true; UI.locked = false; UI.userId = null; go('#/sos'); };
ACT['pin-ok'] = async () => {
  const u = DB.users.find(x => x.id === _lockUser); if (!u) return;
  const now = Date.now(); const msg = $('#lockmsg');
  if (u.lockUntil && u.lockUntil > now) { msg.textContent = 'Gesperrt. Bitte warte ' + Math.ceil((u.lockUntil - now) / 1000) + ' s.'; _pin = ''; return; }
  if (_pin.length < 4) { msg.textContent = 'Mindestens 4 Ziffern.'; return; }
  if (await checkPin(u, _pin)) { u.fails = 0; u.lockUntil = 0; unlockAs(u); }
  else { u.fails = (u.fails || 0) + 1; if (u.fails >= 5) { u.lockUntil = now + Math.min(3600, 30 * Math.pow(2, u.fails - 5)) * 1000; } persist(); _pin = ''; renderLock($('#app')); $('#lockmsg').textContent = u.fails >= 5 ? 'Zu viele Versuche. Kurz warten.' : 'Falsche PIN (' + u.fails + '/5).'; }
};
ACT['pin-bio'] = async () => {
  const u = DB.users.find(x => x.id === _lockUser); if (!u) return;
  const r = await nativeAsync('bioAuth', 'Notfall! entsperren', u.name);
  if (r.ok) unlockAs(u); else if ($('#lockmsg')) $('#lockmsg').textContent = r.error && r.error !== 'abgebrochen' ? r.error : '';
};
function unlockAs(u) { UI.locked = false; UI.userId = u.id; DB.settings.lastUserId = u.id; persist(); _pin = ''; _lockUser = null; UI.sosLimited = false; if (UI.pendingRoute) { const r = UI.pendingRoute; UI.pendingRoute = null; location.hash = r; } render(); }
document.addEventListener('keydown', e => { if (UI.locked && _lockUser) { if (/^[0-9]$/.test(e.key)) ACT['pin-key']({ k: e.key }); else if (e.key === 'Backspace') ACT['pin-back'](); else if (e.key === 'Enter') ACT['pin-ok'](); } });
let _hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (!DB) return;
  if (document.visibilityState === 'hidden') { _hiddenAt = EXT.until > Date.now() ? 0 : Date.now(); }
  else if (DB.users.length && !UI.locked && _hiddenAt) {
    const mins = (Date.now() - _hiddenAt) / 60000; if (mins >= (DB.settings.lockMin || 0) - 1e-9) lockNow();
  }
});

/* ---- Gemeinsame Helfer fuer Gegenstaende ---- */
function personName(H, id) { const p = byId(H.people, id); return p ? (p.name || 'Person') : ''; }
function whereOf(H, it) {
  if (it.container === 'bag') { const b = byId(H.bags, it.bagId); const c = b && byId(b.comps, it.compId); return b ? b.name + (c ? ' › ' + c.name : '') : 'Kein Rucksack'; }
  if (it.container === 'car') return 'Auto'; return it.place || 'Zuhause';
}
function itemQtyLabel(it) { return `${fmt(it.qty)} ${it.unit || ''}`.trim(); }
function statusBadge(it) {
  if (it.status === 'owned') return h`<span class="badge ok">Vorhanden</span>`;
  if (it.status === 'missing') return h`<span class="badge must">Fehlt</span>`;
  return h`<span class="badge rec">Zu prüfen</span>`;
}
function newItemDefaults(o) {
  return Object.assign({ id: uid(), key: '', name: '', desc: '', category: 'Sonstiges', qty: 1, unit: 'Stück', weightG: 0, volL: 0, kcal: 0, liters: 0, status: 'owned', packed: false, container: 'home', bagId: null, compId: null, place: '', personId: null, petId: null, prio: 'rec', why: '', source: 'manual', tags: [], zone: 'main', expiry: '', photos: [], notes: '', price: null, purchaseDate: '', condition: '', barcode: '', minQty: 0, remindDays: 0, kind: 'gear', archived: false, created: new Date().toISOString(), uniq: '', flex: false }, o);
}
function removeItem(H, id) {
  const it = byId(H.items, id); if (!it) return;
  H.items.splice(H.items.indexOf(it), 1);
  H.shop = H.shop.filter(s => s.itemId !== id);
  setTimeout(sweepPhotos, 500);
}
async function addPhotoTo(arr, { camera = true } = {}) {
  // Rueckgabe: neue Foto-ID oder null
  return new Promise(resolve => {
    const m = openModal({ title: 'Foto hinzufügen', body: h`<div class="stack"><button class="btn block" data-act="ph-cam">${icon('camera')} Mit Kamera aufnehmen</button><button class="btn block" data-act="ph-gal">${icon('image')} Aus Galerie wählen</button></div>`, onClose: () => resolve(null) });
    m.el.addEventListener('click', async e => {
      const a = e.target.closest('[data-act]'); if (!a) return; let url = null;
      if (a.dataset.act === 'ph-cam') {
        if (IS_NATIVE) { const r = await nativeAsync('takePhoto'); if (!r.ok) { if (r.error !== 'abgebrochen') toast(r.error); return; } url = r.dataUrl; }
        else { const f = (await pickFiles({ accept: 'image/*' }))[0]; if (!f) return; url = await imageToDataUrl(f); }
      } else if (a.dataset.act === 'ph-gal') { const f = (await pickFiles({ accept: 'image/*' }))[0]; if (!f) return; try { url = await imageToDataUrl(f); } catch { toast('Bild konnte nicht gelesen werden.'); return; } }
      else return;
      m.onClose = null; closeModal(m);
      try { const id = await Photos.add(url); resolve(id); } catch (err) { toast('Foto speichern fehlgeschlagen'); resolve(null); }
    });
  });
}
function photoStrip(ids, delAct, data = {}) {
  return h`<div class="photos">${(ids || []).map(id => h`<div class="ph"><img data-ph="${id}" data-full="1" alt="Foto" data-act="ph-view" data-id="${id}" style="cursor:zoom-in"><button type="button" data-act="${delAct}" data-pid="${id}" ${raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '))} aria-label="Foto entfernen">×</button></div>`)}</div>`;
}
ACT['ph-view'] = async d => { const url = await Photos.get(d.id, false); openModal({ title: 'Foto', wide: true, body: h`<img src="${url}" alt="Foto" style="width:100%;border-radius:10px">` }); };

/* ---- Hilfen zum Drucken ---- */
function printDoc(title, bodyHtml) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px system-ui,sans-serif;color:#000;margin:16px}h1{font-size:20px}h2{font-size:16px;margin:16px 0 6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4px 6px;text-align:left;vertical-align:top}.card{border:2px solid #000;border-radius:8px;padding:10px;margin:8px 0;page-break-inside:avoid}small{color:#333}</style></head><body>${bodyHtml}</body></html>`;
  if (NATIVE && NATIVE.printHtml) NATIVE.printHtml(title, html);
  else { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.print(); } else toast('Drucken nicht verfügbar'); }
}

ACT['quick-search'] = () => { INV.q = ''; go('#/items'); setTimeout(() => { const i = $('#invq'); if (i) i.focus(); }, 120); };
