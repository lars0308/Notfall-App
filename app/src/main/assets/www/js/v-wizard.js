'use strict';
/* ===== Notfall! – Packassistent: eine Frage pro Schritt, grosse Antwortkarten ===== */
const WZ_EQUIP = [
  ['water_bottle', 'Trinkflaschen'], ['water_filter', 'Wasserfilter'], ['flashlight', 'Taschenlampen'], ['headlamp', 'Stirnlampen'], ['radio', 'Radio (Batterie/Kurbel)'],
  ['powerbank', 'Powerbanks'], ['firstaid', 'Erste-Hilfe-Sets'], ['sleeping_bag', 'Schlafsäcke'], ['sleeping_mat', 'Isomatten'], ['stove', 'Kocher'], ['fuel', 'Brennstoff'],
  ['cookware', 'Kochgeschirr'], ['tent', 'Zelte'], ['tarp', 'Tarps'], ['multitool', 'Messer / Multitool'], ['hygiene_kit', 'Hygiene-Sets'],
];
const WZ_PURPOSE = [
  ['evac', 'Notfallrucksack', 'Evakuierung, schnell aus dem Haus', 'bag'],
  ['travel', 'Reise-Notfall', 'Unterwegs gestrandet, Übernachtung auswärts', 'map'],
  ['car', 'Auto-Notfalltasche', 'Panne, Stau, Winter', 'car'],
  ['custom', 'Eigener Zweck', '', 'edit'],
];
const WZ_PETS = ['Hund', 'Katze', 'Kleintier', 'Vogel'];

const BLOOD_TYPES = ['', '0+', '0−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'];
const FITNESS = [['low', 'Wenig aktiv'], ['mid', 'Normal'], ['high', 'Sportlich']];
const WZ_BAG_TYPES = ['day', 'hiking', 'tactical', 'trekking', 'kids', 'school'];
function wzInitial(H) {
  const c = H.cfg || {}; const hs = c.housing || {};
  const people = H.people.length ? clone(H.people) : [personShape({ id: uid(), name: '', age: 35 })];
  return {
    purpose: c.purpose || '', custom: c.customScenario || '', hours: c.durationHours && c.durationHours <= 72 ? c.durationHours : (H.cfg ? 72 : 0),
    where: (c.strategies || []).includes('mobile') ? ((c.strategies || []).includes('shelter') ? 'both' : 'mobile') : (H.cfg ? 'shelter' : ''),
    people, petList: clone(H.pets || []), equipment: {},
    name: H.name && H.name !== 'Mein Haushalt' ? H.name : '', home: hs.type || '', place: hs.place || '', lat: typeof hs.lat === 'number' ? hs.lat : null, lon: typeof hs.lon === 'number' ? hs.lon : null, acc: hs.acc || null,
    carry: Object.fromEntries(people.map(p => [p.id, wzCarryDefault(H, p)])), shared: H.bags.some(b => !b.owner && b.role !== 'car' && b.type === 'travel'),
  };
}
function wzCarryDefault(H, p) {
  const own = H.bags.find(b => b.owner === p.id && b.role !== 'car'); if (own) return 'bag:' + own.id;
  if (p.noBag) return 'none';
  const a = p.age === '' || p.age === undefined ? 35 : +p.age;
  return a < 6 ? 'none' : a < 13 ? 'type:kids' : a < 18 || a >= 65 ? 'type:hiking' : 'type:trekking';
}
function wzCarryOf(H, d, p) { return d.carryPicked && d.carryPicked[p.id] && d.carry[p.id] ? d.carry[p.id] : wzCarryDefault(H, p); }
function wzDraft(H) { if (!H.setup.draft || H.setup.draft.purpose === undefined || H.setup.draft.petList === undefined) { H.setup.draft = wzInitial(H); H.setup.step = 0; persist(); } return H.setup.draft; }
function wzSteps(d) {
  const s = ['household', 'people'];
  d.people.forEach((p, k) => s.push('p' + k));
  s.push('pets', 'purpose');
  if (d.purpose !== 'car') s.push('hours', 'where');
  s.push('bags');
  return s;
}
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
function wzPersonLabel(p, k) { return (p.name || '').trim() || (+p.age < 18 ? 'Kind' : 'Person ' + (k + 1)); }
/* Bedarf je Person – gleiche Rechnung wie die Packliste */
function wzCalcLine(p) {
  const c = personCalc(p, DB.settings);
  return `${fmt0(c.kcal)} kcal und ${fmt(c.waterL)} l Wasser pro Tag${c.carrier && !p.noBag ? ` · trägt bis ${fmt(c.carryKg)} kg` : ' · trägt keinen Rucksack'}`;
}

const ans = (act, data, label, sub, on, ic) => h`<button type="button" class="ans" aria-pressed="${on ? 'true' : 'false'}" data-act="${act}" ${raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '))}>${ic ? icon(ic) : ''}<span>${label}${sub ? h`<small>${sub}</small>` : ''}</span><span class="mark">${icon('check')}</span></button>`;
const chip = (act, data, label, on) => h`<button type="button" class="chip" aria-pressed="${on ? 'true' : 'false'}" data-act="${act}" ${raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '))}>${label}</button>`;
const wzField = (label, path, val, o = {}) => h`<div class="field ${o.cls || ''}"><label for="wf-${path}">${label}</label><input id="wf-${path}" type="${o.type || 'text'}" value="${val ?? ''}" data-input="${o.num ? 'wz-num' : 'wz-text'}" data-path="${path}" ${o.num ? raw('inputmode="decimal"') : ''} ${o.ph ? raw(`placeholder="${esc(o.ph)}"`) : ''} maxlength="${o.max || 80}"></div>`;

route('/wizard', H => {
  const d = wzDraft(H); const steps = wzSteps(d); const i = clamp(H.setup.step || 0, 0, steps.length - 1); const key = steps[i];
  const last = i === steps.length - 1;
  let q, body, next = true;
  if (key === 'household') {
    q = 'Dein Haushalt';
    body = h`${wzField('Name', 'name', d.name, { ph: 'z. B. Familie Müller', max: 40 })}
      ${wzField('Adresse oder Ort', 'place', d.place, { ph: 'z. B. Lindenstraße 4, Köln', max: 80 })}
      <div class="card"><div class="row spread"><div><h3>Standort</h3><p class="muted small">${d.lat !== null ? `${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}${d.acc ? ' · ± ' + fmt0(d.acc) + ' m' : ''}` : 'Für Karte und Entfernung zu Treffpunkten. Freiwillig.'}</p></div>
        ${d.lat !== null ? h`<button class="btn sm ghost" data-act="wz-gps-del">Entfernen</button>` : ''}</div>
        <button class="btn block" style="margin-top:10px" data-act="wz-gps">${icon('map')} ${d.lat !== null ? 'Neu bestimmen' : 'Standort bestimmen'}</button></div>
      <div class="label">Wohnsituation</div>
      <div class="chips">${[['flat', 'Wohnung in der Stadt'], ['house', 'Haus in der Stadt'], ['rural', 'Auf dem Land']].map(([v, l]) => chip('wz-set', { f: 'home', v }, l, d.home === v))}</div>
      ${d.home === 'rural' ? h`<p class="muted small">Auf dem Land: Wasserfilter wird Pflicht, Solar-Ladegerät wird vorgeschlagen.</p>` : ''}`;
  } else if (key === 'people') {
    q = 'Wer gehört dazu?';
    body = h`<div class="stack-s">${d.people.map((p, k) => h`<div class="tile"><span class="avatar">${p.photo ? h`<img data-ph="${p.photo}" alt="">` : (wzPersonLabel(p, k)[0] || '?').toUpperCase()}</span><span class="grow"><span class="tt">${wzPersonLabel(p, k)}</span><br><span class="ts">${p.age !== '' && p.age !== null ? p.age + ' Jahre' : 'Alter fehlt'}</span></span>
        ${d.people.length > 1 ? h`<button class="btn icon sm danger" data-act="wz-del-person" data-i="${k}" aria-label="${wzPersonLabel(p, k)} entfernen">${icon('trash')}</button>` : ''}</div>`)}</div>
      <div class="btns"><button class="btn" data-act="wz-add-person" data-kind="adult">${icon('plus')} Erwachsene/r</button><button class="btn" data-act="wz-add-person" data-kind="child">${icon('plus')} Kind</button></div>
      <p class="muted small">Danach kommt jede Person einzeln dran.</p>`;
  } else if (/^p\d+$/.test(key)) {
    const k = +key.slice(1); const p = d.people[k]; const P = `people.${k}`;
    q = wzPersonLabel(p, k);
    body = h`<div class="row nowrap" style="gap:16px"><button class="avatar xl" data-act="wz-photo" data-i="${k}" aria-label="Foto" style="cursor:pointer">${p.photo ? h`<img data-ph="${p.photo}" alt="">` : icon('camera')}</button>
        <div class="grow">${wzField('Name', P + '.name', p.name, { ph: +p.age < 18 ? 'Kind' : 'Vorname', max: 40 })}</div></div>
      <div class="form-grid">${wzField('Alter', P + '.age', p.age, { num: true, type: 'number', max: 3 })}${wzField('Geburtsdatum', P + '.birth', p.birth, { type: 'date' })}</div>
      <div class="label">Geschlecht</div><div class="chips">${[['f', 'weiblich'], ['m', 'männlich'], ['d', 'divers']].map(([v, l]) => chip('wz-pset', { i: k, f: 'sex', v }, l, p.sex === v))}</div>
      <div class="form-grid">${wzField('Gewicht (kg)', P + '.weightKg', p.weightKg, { num: true, type: 'number', max: 3 })}${wzField('Größe (cm)', P + '.heightCm', p.heightCm, { num: true, type: 'number', max: 3 })}</div>
      <div class="label">Fitness</div><div class="chips">${FITNESS.map(([v, l]) => chip('wz-pset', { i: k, f: 'fitness', v }, l, p.fitness === v))}</div>
      <div class="notice info" id="wzcalc"><div><p class="nt">Bedarf</p><p>${wzCalcLine(p)}</p></div></div>
      <div class="field"><label for="wf-blood">Blutgruppe</label><select id="wf-blood" data-change="wz-sel" data-path="${P}.needs.blood">${BLOOD_TYPES.map(b => h`<option value="${b}" ${(p.needs.blood || '') === b ? raw('selected') : ''}>${b || 'unbekannt'}</option>`)}</select></div>
      ${wzField('Allergien', P + '.needs.allergies', p.needs.allergies, { ph: 'z. B. Erdnüsse (Atemnot)' })}
      ${wzField('Vorerkrankungen', P + '.needs.conditions', p.needs.conditions, { ph: 'z. B. Asthma, Diabetes' })}
      ${wzField('Medikamente', P + '._meds', p._meds ?? (p.needs.meds || []).map(m => m.name).join(', '), { ph: 'mit Komma trennen', max: 300 })}
      ${wzField('Hilfsmittel', P + '.needs.aids', p.needs.aids, { ph: 'z. B. Brille, Hörgerät' })}
      ${wzField('Eingeschränkt beim Gehen/Tragen', P + '.needs.mobility', p.needs.mobility, { ph: 'leer lassen, wenn nicht' })}
      <p class="muted small">Bleibt auf diesem Gerät. Was im Notfallpass sichtbar ist, stellst du dort ein.</p>`;
  } else if (key === 'pets') {
    q = 'Tiere';
    body = h`${d.petList.length ? h`<div class="stack-s">${d.petList.map((t, k) => h`<div class="person-card"><div class="row spread"><strong>${t.species}</strong><button class="btn icon sm danger" data-act="wz-del-pet" data-i="${k}" aria-label="${t.species} entfernen">${icon('trash')}</button></div>
        <div class="form-grid">${wzField('Name', `petList.${k}.name`, t.name, { max: 40 })}${wzField('Anzahl', `petList.${k}.count`, t.count, { num: true, type: 'number', max: 2 })}${t.species === 'Hund' ? wzField('Gewicht (kg)', `petList.${k}.weightKg`, t.weightKg, { num: true, type: 'number', max: 3 }) : ''}</div></div>`)}</div>` : h`<p class="muted">Keine Tiere. Einfach weiter.</p>`}
      <div class="btns">${WZ_PETS.map(s => h`<button class="btn" data-act="wz-add-pet" data-v="${s}">${icon('plus')} ${s}</button>`)}</div>`;
  } else if (key === 'purpose') {
    q = 'Wofür packst du?'; next = d.purpose === 'custom';
    body = h`<div class="answers">${WZ_PURPOSE.map(([k, l, sub, ic]) => ans('wz-pick', { f: 'purpose', v: k }, l, sub, d.purpose === k, ic))}</div>
      ${d.purpose === 'custom' ? h`<div class="field"><label for="wzc">Eigener Zweck</label><input id="wzc" type="text" value="${d.custom}" data-input="wz-text" data-path="custom" maxlength="60"></div>` : ''}`;
  } else if (key === 'hours') {
    q = 'Für wie lange?'; next = false;
    body = h`<div class="answers">${[[24, '24 Stunden', ''], [48, '48 Stunden', ''], [72, '72 Stunden', 'Üblicher Richtwert']].map(([v, l, sub]) => ans('wz-pick', { f: 'hours', v }, l, sub, +d.hours === v))}</div>`;
  } else if (key === 'where') {
    q = 'Wo kommt ihr unter?'; next = false;
    body = h`<div class="answers">${[['shelter', 'Verwandte, Hotel oder Notunterkunft', ''], ['mobile', 'Draußen unterwegs', 'Zelt oder Tarp, Wasser aufbereiten'], ['both', 'Beides möglich', '']].map(([v, l, sub]) => ans('wz-pick', { f: 'where', v }, l, sub, d.where === v))}</div>`;
  } else {
    q = 'Wer trägt welchen Rucksack?';
    const own = H.bags.filter(b => b.role !== 'car');
    body = h`<div class="stack-s">${d.people.map((p, k) => { const sel = wzCarryOf(H, d, p); return h`<div class="person-card"><div class="row nowrap"><span class="avatar">${p.photo ? h`<img data-ph="${p.photo}" alt="">` : (wzPersonLabel(p, k)[0] || '?').toUpperCase()}</span><span class="grow"><strong>${wzPersonLabel(p, k)}</strong><br><span class="muted small">${wzCalcLine(p).split(' · ')[1] || ''}</span></span></div>
        <div class="chips" style="margin-top:10px">${chip('wz-carry', { id: p.id, v: 'none' }, 'Keinen', sel === 'none')}
          ${own.map(b => chip('wz-carry', { id: p.id, v: 'bag:' + b.id }, b.name, sel === 'bag:' + b.id))}
          ${WZ_BAG_TYPES.map(t => chip('wz-carry', { id: p.id, v: 'type:' + t }, `${BAG_TYPE[t].label.replace('-/MOLLE', '')} ${fmt0(BAG_TYPE[t].liters)} l`, sel === 'type:' + t))}</div></div>`; })}</div>
      <label class="check"><input type="checkbox" data-change="wz-shared" ${d.shared ? raw('checked') : ''}><span><span class="t">Gemeinsame Familientasche</span><br><span class="s">Reisetasche für Dinge, die alle brauchen</span></span></label>
      ${d.purpose === 'car' ? h`<p class="muted small">Für das Auto wird zusätzlich eine Auto-Notfalltasche angelegt.</p>` : ''}`;
  }
  return {
    full: true, title: 'Notfallplan',
    html: h`<div class="topbar">${i > 0 ? h`<button class="btn icon ghost" data-act="wz-prev" aria-label="Zurück">${icon('back')}</button>` : ''}<div class="grow">${bar(Math.round((i + 1) / steps.length * 100))}</div><span class="small muted mono">${i + 1}/${steps.length}</span><button class="btn icon ghost" data-act="wz-later" aria-label="Schließen">${icon('close')}</button></div>
      <main class="page"><div class="page-inner"><h1 class="q">${q}</h1>${body}
        ${next ? h`<div class="actionbar"><button class="btn primary lg" data-act="${last ? 'wz-finish' : 'wz-next'}">${last ? h`Weiter: Rucksäcke packen ${icon('chev')}` : h`Weiter ${icon('chev')}`}</button></div>` : ''}
      </div></main>`,
  };
});

/* ---- Aktionen ---- */
INPUT['wz-text'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); persist(); wzCalcRefresh(el); };
INPUT['wz-num'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value === '' ? '' : +el.value); persist(); wzCalcRefresh(el); };
INPUT['wz-sel'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); persist(); };
function wzCalcRefresh(el) {
  const m = /^people\.(\d+)\.(age|weightKg|heightCm|needs\.mobility|birth)$/.exec(el.dataset.path || ''); const box = $('#wzcalc p:last-child'); if (!m || !box) return;
  const p = wzDraft(HH()).people[+m[1]];
  if (m[2] === 'birth' && p.birth) { const a = Math.floor((Date.now() - new Date(p.birth)) / 31557600000); if (a >= 0 && a <= 110) { p.age = a; const ai = $(`[data-path="people.${m[1]}.age"]`); if (ai) ai.value = a; persist(); } }
  box.textContent = wzCalcLine(p);
}
function wzGo(delta) { const H = HH(); const n = wzSteps(wzDraft(H)).length; H.setup.step = clamp((H.setup.step || 0) + delta, 0, n - 1); persist(); rerender(); }
ACT['wz-pick'] = d => {
  const w = wzDraft(HH()); const f = d.f;
  w[f] = f === 'hours' ? +d.v : d.v;
  persist();
  if (f === 'purpose' && d.v === 'custom') { rerender(); return; }
  wzGo(1);
};
ACT['wz-set'] = d => { wzDraft(HH())[d.f] = d.v; persist(); rerender(true); };
ACT['wz-pset'] = d => { const p = wzDraft(HH()).people[+d.i]; p[d.f] = p[d.f] === d.v ? '' : d.v; persist(); rerender(true); };
ACT['wz-carry'] = d => { const w = wzDraft(HH()); w.carry[d.id] = d.v; w.carryPicked = Object.assign(w.carryPicked || {}, { [d.id]: true }); persist(); rerender(true); };
INPUT['wz-shared'] = el => { wzDraft(HH()).shared = el.checked; persist(); };
ACT['wz-photo'] = async d => { const pid = await addPhotoTo(null); if (!pid) return; wzDraft(HH()).people[+d.i].photo = pid; persist(); rerender(true); };
ACT['wz-gps'] = () => {
  if (!navigator.geolocation) { toast('Standort ist auf diesem Gerät nicht verfügbar.'); return; }
  toast('Standort wird bestimmt …');
  navigator.geolocation.getCurrentPosition(pos => { const w = wzDraft(HH()); w.lat = +pos.coords.latitude.toFixed(6); w.lon = +pos.coords.longitude.toFixed(6); w.acc = Math.round(pos.coords.accuracy || 0); persist(); rerender(true); toast('Standort gespeichert'); },
    err => toast(err && err.code === 1 ? 'Standort nicht erlaubt.' : 'Standort nicht gefunden. Draußen oder am Fenster erneut versuchen.'), { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
};
ACT['wz-gps-del'] = () => { const w = wzDraft(HH()); w.lat = null; w.lon = null; w.acc = null; persist(); rerender(true); };
ACT['wz-add-pet'] = d => { wzDraft(HH()).petList.push({ id: uid(), species: d.v, name: '', count: 1, age: '', weightKg: '', needs: '' }); persist(); rerender(true); };
ACT['wz-del-pet'] = d => { wzDraft(HH()).petList.splice(+d.i, 1); persist(); rerender(true); };
ACT['wz-add-person'] = d => { const w = wzDraft(HH()); const p = personShape({ id: uid(), name: '', age: d.kind === 'child' ? 6 : 35 }); w.people.push(p); w.carry[p.id] = wzCarryDefault(HH(), p); persist(); rerender(true); };
ACT['wz-del-person'] = d => { const w = wzDraft(HH()); if (w.people.length > 1) { const [p] = w.people.splice(+d.i, 1); delete w.carry[p.id]; } persist(); rerender(true); };
ACT['wz-prev'] = () => wzGo(-1);
ACT['wz-next'] = () => {
  const H = HH(); const d = wzDraft(H); const key = wzSteps(d)[H.setup.step || 0];
  if (key === 'purpose' && !d.purpose) { toast('Bitte eine Antwort wählen.'); return; }
  if (/^p\d+$/.test(key)) { const p = d.people[+key.slice(1)]; if (p.age === '' || p.age === null || isNaN(+p.age) || +p.age < 0 || +p.age > 110) { toast('Alter fehlt (0–110).'); return; } }
  if (key === 'people') for (const p of d.people) if (p.age === '' || p.age === null || isNaN(+p.age)) { p.age = 35; }
  if (key === 'p' + (d.people.length - 1) || key === 'people') for (const p of d.people) if (!d.carry[p.id]) d.carry[p.id] = wzCarryDefault(H, p);
  wzGo(1);
};
ACT['wz-later'] = () => { HH().setup.skipped = true; persist(); flushDB(); go('#/home'); };
ACT['wz-restart'] = () => { const H = HH(); H.setup.draft = wzInitial(H); H.setup.step = 0; persist(); go('#/wizard'); };
ACT['wz-finish'] = () => {
  const H = HH(); const d = wzDraft(H);
  const before = H.items.length;
  finishWizard(H, d);
  H.setup.step = 0; H.setup.draft = null; persist(); flushDB();
  REV.tab = 'check'; REV.prio = 'all';
  PICK.cat = null; go('#/review'); toast(`${H.items.length - before} Sachen vorgeschlagen – hake ab, was du hast`);
};
function finishWizard(H, d) {
  const S = DB.settings;
  const prevDone = (H.cfg && H.cfg.equipDone) || {};
  H.people = d.people.map((p, i) => {
    const kid = +p.age < 18; const n = d.people.slice(0, i).filter(x => (+x.age < 18) === kid).length + 1;
    const q = personShape(Object.assign({}, p, { id: p.id || uid(), name: (p.name || '').trim() || (kid ? 'Kind ' + n : 'Erwachsene/r ' + n), age: +p.age }));
    if (typeof p._meds === 'string') { const names = splitList(p._meds); q.needs.meds = names.map(nm => (q.needs.meds || []).find(m => m.name === nm) || { id: uid(), name: nm, dose: '', expiry: '' }); }
    delete q._meds; q.needs.meds = (q.needs.meds || []).filter(m => m.name && m.name.trim());
    return q;
  });
  const ids = new Set(H.people.map(p => p.id));
  H.items.forEach(i => { if (i.personId && !ids.has(i.personId)) i.personId = null; });
  H.bags.forEach(b => { if (b.owner && !ids.has(b.owner)) b.owner = null; });
  // Tiere
  if (Array.isArray(d.petList)) H.pets = d.petList.map(t => Object.assign({ id: uid(), name: '', count: 1, age: '', weightKg: '', needs: '' }, t, { count: Math.max(1, +t.count || 1) }));
  const hours = d.purpose === 'car' ? ((H.cfg && H.cfg.durationHours) || 72) : (+d.hours || 72);
  const prev = ((H.cfg && H.cfg.goals) || []).filter(g => g === 'car' || (d.purpose === 'car' && /^bag|^evac$/.test(g)));
  const goals = Array.from(new Set(prev.concat(d.purpose === 'car' ? ['car'] : ['bag' + hours])));
  const strategies = d.purpose === 'travel' ? ['travel'] : d.where === 'both' ? ['shelter', 'mobile'] : [d.where || 'shelter'];
  H.cfg = Object.assign({}, H.cfg || {}, { purpose: d.purpose || 'evac', customScenario: d.custom || '', goals, strategies, durationHours: hours, boxOnly: !goals.some(g => /^bag/.test(g)), country: (H.cfg && H.cfg.country) || 'DE', housing: (H.cfg && H.cfg.housing) || {}, equipDone: Object.assign({}, prevDone) });
  for (const [key, qty] of Object.entries(d.equipment || {})) {
    const add = qty - (prevDone[key] || 0); if (add <= 0) continue;
    H.items.push(makeItem({ key, qty: add, container: 'home' }, { status: 'owned', source: 'wizard', place: '', prio: 'rec' }));
    H.cfg.equipDone[key] = qty;
  }
  if ((d.name || '').trim()) H.name = d.name.trim();
  H.cfg.housing = Object.assign({}, H.cfg.housing || {}, { type: d.home || '', place: (d.place || '').trim(), lat: d.lat ?? null, lon: d.lon ?? null, acc: d.acc || null });
  wzApplyBags(H, d);
  const report = applyPlan(H, S);
  H.setup.done = true; H.setup.skipped = false;
  return report;
}
/* Rucksack je Person: vorhandenen zuordnen, neuen anlegen oder keinen */
function wzApplyBags(H, d) {
  for (const p of H.people) {
    const v = wzCarryOf(H, Object.assign({ carry: {} }, d), d.people.find(x => x.id === p.id) || p);
    p.noBag = v === 'none';
    const mine = H.bags.filter(b => b.owner === p.id && b.role !== 'car');
    if (v === 'none') { mine.forEach(b => { b.owner = null; }); continue; }
    if (v.startsWith('bag:')) { const b = byId(H.bags, v.slice(4)); if (b) { mine.filter(x => x !== b).forEach(x => { x.owner = null; }); b.owner = p.id; } continue; }
    const type = v.slice(5); const bt = BAG_TYPE[type]; if (!bt) continue;
    const same = mine.find(b => b.type === type);
    mine.filter(x => x !== same).forEach(x => { x.owner = null; });
    if (!same) H.bags.push(newBag({ type, liters: bt.liters, ownKg: bt.ownKg, owner: p.id, name: (type === 'kids' ? 'Kinderrucksack ' : 'Rucksack ') + p.name }));
  }
  const shared = H.bags.find(b => !b.owner && b.role !== 'car' && b.type === 'travel');
  if (d.shared && !shared) H.bags.push(newBag({ type: 'travel', liters: BAG_TYPE.travel.liters, ownKg: BAG_TYPE.travel.ownKg, name: 'Familientasche' }));
}
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
