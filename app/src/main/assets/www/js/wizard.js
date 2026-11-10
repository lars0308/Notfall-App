'use strict';
/* ===== Notfall! – Assistent: Grundgerüst =====
   Zwei Abläufe mit einer Frage pro Bildschirm:
   1) „Haushalt anlegen“ (#/setup) beim ersten Start – Schritte in wz-setup.js
   2) „Rucksäcke & Taschen“ (#/wizard) danach – Schritte in wz-bags.js
   Jeder Schritt meldet sich in WZ_STEP an: { view(H, d, k) → { q, body, next, foot }, check(H, d, k) → Fehlertext } */
const WZ_STEP = {};
const WZ_PETS = ['Hund', 'Katze', 'Kleintier', 'Vogel'];

function wzInitial(H) {
  const c = H.cfg || {}; const hs = Object.assign({}, c.housing || {}, H.home || {});
  const people = H.people.length ? clone(H.people) : [personShape({ id: uid(), name: '', age: 35 })];
  const ice = clone(H.contacts.filter(x => x.type === 'ice'));
  const meet = clone(H.meeting || []);
  if (!meet.some(m => !m.far)) meet.unshift({ id: uid(), name: '', far: false });
  if (!meet.some(m => m.far)) meet.push({ id: uid(), name: '', far: true });
  return {
    purpose: c.purpose || '', custom: c.customScenario || '', hours: c.durationHours && c.durationHours <= 72 ? c.durationHours : (H.cfg ? 72 : 0),
    where: (c.strategies || []).includes('mobile') ? ((c.strategies || []).includes('shelter') ? 'both' : 'mobile') : (H.cfg ? 'shelter' : ''),
    people, petList: clone(H.pets || []),
    contacts: ice.length ? ice : [{ id: uid(), type: 'ice', name: '', relation: '', phone: '', priority: 1 }], meet,
    name: H.name && H.name !== 'Mein Haushalt' ? H.name : '', home: hs.type || '', place: hs.place || '', lat: typeof hs.lat === 'number' ? hs.lat : null, lon: typeof hs.lon === 'number' ? hs.lon : null, acc: hs.acc || null,
    carry: Object.fromEntries(people.map(p => [p.id, wzCarryDefault(H, p)])), shared: H.bags.some(b => !b.owner && b.role !== 'car' && b.type === 'travel'),
  };
}
function wzDraft(H) {
  const d = H.setup.draft;
  if (!d || d.purpose === undefined || d.petList === undefined) { H.setup.draft = wzInitial(H); H.setup.step = 0; persist(); }
  else if (d.contacts === undefined || d.meet === undefined) { const f = wzInitial(H); d.contacts = f.contacts; d.meet = f.meet; persist(); }   // Entwurf aus 2.6 ergänzen
  return H.setup.draft;
}

const wzFlow = () => UI.route === '/setup' ? 'setup' : 'bags';
function profSteps(H, d) { const s = H.profileDone || H.setup.done ? [] : ['welcome']; s.push('household', 'people'); d.people.forEach((p, k) => s.push('p' + k)); s.push('pets', 'contacts', 'meet', 'share', 'pdone'); return s; }
function bagSteps(d) { const s = ['purpose']; if (d.purpose !== 'car') s.push('hours', 'where'); s.push('bags'); return s; }
function wzSteps(d, H = HH()) { return wzFlow() === 'setup' ? profSteps(H, d) : bagSteps(d); }
const stepKey = () => wzFlow() === 'setup' ? 'pstep' : 'step';
const stepDef = key => /^p\d+$/.test(key) ? [WZ_STEP.person, +key.slice(1)] : [WZ_STEP[key], null];

function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function wzPersonLabel(p, k) { return (p.name || '').trim() || (+p.age < 18 ? 'Kind' : 'Person ' + (k + 1)); }
/* Bedarf je Person – gleiche Rechnung wie die Packliste */
function wzCalcLine(p) {
  const c = personCalc(p, DB.settings);
  return `${fmt0(c.kcal)} kcal und ${fmt(c.waterL)} l Wasser pro Tag${c.carrier && !p.noBag ? ` · trägt bis ${fmt(c.carryKg)} kg` : ' · trägt keinen Rucksack'}`;
}
const dataAttrs = data => raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '));
const ans = (act, data, label, sub, on, ic) => h`<button type="button" class="ans" aria-pressed="${on ? 'true' : 'false'}" data-act="${act}" ${dataAttrs(data)}>${ic ? icon(ic) : ''}<span>${label}${sub ? h`<small>${sub}</small>` : ''}</span><span class="mark">${icon('check')}</span></button>`;
const chip = (act, data, label, on) => h`<button type="button" class="chip" aria-pressed="${on ? 'true' : 'false'}" data-act="${act}" ${dataAttrs(data)}>${label}</button>`;
const wzField = (label, path, val, o = {}) => h`<div class="field ${o.cls || ''}"><label for="wf-${path}">${label}</label><input id="wf-${path}" type="${o.type || 'text'}" value="${val ?? ''}" data-input="${o.num ? 'wz-num' : 'wz-text'}" data-path="${path}" ${o.num ? raw('inputmode="decimal"') : o.type === 'tel' ? raw('inputmode="tel" autocomplete="tel"') : ''} ${o.ph ? raw(`placeholder="${esc(o.ph)}"`) : ''} maxlength="${o.max || 80}"></div>`;
const wzAvatar = (p, k, cls = '') => h`<span class="avatar ${cls}">${p.photo ? h`<img data-ph="${p.photo}" alt="">` : (wzPersonLabel(p, k)[0] || '?').toUpperCase()}</span>`;

function wzView(H) {
  const d = wzDraft(H); const steps = wzSteps(d, H); const i = clamp(H.setup[stepKey()] || 0, 0, steps.length - 1); const key = steps[i];
  const last = i === steps.length - 1; const flow = wzFlow();
  const [def, k] = stepDef(key);
  const v = Object.assign({ next: true, foot: null }, def ? def.view(H, d, k) : { q: '?', body: '' });
  const title = flow === 'setup' ? 'Haushalt anlegen' : 'Rucksäcke & Taschen';
  const foot = v.foot || (v.next ? h`<button class="btn primary lg" data-act="${last ? 'wz-finish' : 'wz-next'}">${last ? h`Packliste erstellen ${icon('chev')}` : h`Weiter ${icon('chev')}`}</button>` : null);
  const back = i > 0 ? h`<button class="btn icon ghost" data-act="wz-prev" aria-label="Zurück">${icon('back')}</button>` : flow === 'bags' && H.profileDone ? h`<a class="btn icon ghost" href="#/setup" aria-label="Zurück zum Haushalt">${icon('back')}</a>` : '';
  return {
    full: true, title,
    html: h`<div class="topbar">${back}<div class="grow"><div class="small muted bold">${title}</div>${bar(Math.round((i + 1) / steps.length * 100))}</div><span class="small muted mono">${i + 1}/${steps.length}</span><button class="btn icon ghost" data-act="wz-later" aria-label="Schließen">${icon('close')}</button></div>
      <main class="page"><div class="page-inner"><h1 class="q">${v.q}</h1>${v.body}
        ${foot ? h`<div class="actionbar">${foot}</div>` : ''}
      </div></main>`,
  };
}
route('/setup', H => wzView(H));
route('/wizard', H => { if (!H.profileDone && !H.people.length) { history.replaceState(null, '', '#/setup'); UI.route = '/setup'; } return wzView(H); });

/* ---- Eingaben und Blättern ---- */
const WZ_ON_INPUT = [];
INPUT['wz-text'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); persist(); WZ_ON_INPUT.forEach(f => f(el)); };
INPUT['wz-num'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value === '' ? '' : +el.value); persist(); WZ_ON_INPUT.forEach(f => f(el)); };
INPUT['wz-sel'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); persist(); };
INPUT['wz-check'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.checked); persist(); };
function wzGo(delta) { const H = HH(); const k = stepKey(); const n = wzSteps(wzDraft(H), H).length; H.setup[k] = clamp((H.setup[k] || 0) + delta, 0, n - 1); persist(); rerender(); }
ACT['wz-pick'] = d => {
  const w = wzDraft(HH()); const f = d.f;
  w[f] = f === 'hours' ? +d.v : d.v;
  persist();
  if (f === 'purpose' && d.v === 'custom') { rerender(); return; }
  wzGo(1);
};
ACT['wz-set'] = d => { wzDraft(HH())[d.f] = d.v; persist(); rerender(true); };
ACT['wz-prev'] = () => wzGo(-1);
ACT['wz-next'] = () => {
  const H = HH(); const d = wzDraft(H); const key = wzSteps(d, H)[H.setup[stepKey()] || 0];
  const [def, k] = stepDef(key);
  const err = def && def.check ? def.check(H, d, k) : '';
  if (err) { toast(err); return; }
  wzGo(1);
};
ACT['wz-later'] = () => { HH().setup.skipped = true; persist(); flushDB(); go('#/home'); };
ACT['wz-restart'] = () => { const H = HH(); H.setup.draft = wzInitial(H); H.setup.step = 0; persist(); go('#/wizard'); };

/* Standort: Haushalt (ohne Ziel) oder Treffpunkt (data-target="meet.0") */
ACT['wz-gps'] = d => {
  if (!navigator.geolocation) { toast('Standort ist auf diesem Gerät nicht verfügbar.'); return; }
  toast('Standort wird bestimmt …');
  navigator.geolocation.getCurrentPosition(pos => {
    const w = wzDraft(HH()); const t = d.target ? getPath(w, d.target) : w; if (!t) return;
    t.lat = +pos.coords.latitude.toFixed(6); t.lon = +pos.coords.longitude.toFixed(6); if (!d.target) t.acc = Math.round(pos.coords.accuracy || 0);
    persist(); rerender(true); toast('Standort gespeichert');
  }, err => toast(err && err.code === 1 ? 'Standort nicht erlaubt.' : 'Standort nicht gefunden. Draußen oder am Fenster erneut versuchen.'), { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
};
ACT['wz-gps-del'] = d => { const w = wzDraft(HH()); const t = d.target ? getPath(w, d.target) : w; if (!t) return; t.lat = null; t.lon = null; if (!d.target) t.acc = null; persist(); rerender(true); };

function loadSampleHousehold() {
  const cur = HH();
  const pristine = !cur.items.length && !cur.people.length && !cur.setup.done;
  const sample = createSampleHousehold();
  if (pristine) DB.households = DB.households.filter(h => h.id !== cur.id);
  DB.households.push(sample); DB.active = sample.id; persist();
}
ACT['load-sample'] = async () => {
  const ok = await confirmDlg('Beispielhaushalt laden?', 'Erfundene Testdaten. Lässt sich unter Einstellungen → Haushalte wieder löschen.', { ok: 'Laden' });
  if (!ok) return; loadSampleHousehold(); go('#/home');
};
