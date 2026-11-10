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

function wzInitial(H) {
  const c = H.cfg || {};
  return {
    purpose: c.purpose || '', custom: c.customScenario || '', hours: c.durationHours && c.durationHours <= 72 ? c.durationHours : (H.cfg ? 72 : 0),
    where: (c.strategies || []).includes('mobile') ? ((c.strategies || []).includes('shelter') ? 'both' : 'mobile') : (H.cfg ? 'shelter' : ''),
    people: H.people.length ? clone(H.people) : [personShape({ id: uid(), name: '', age: 35 })],
    pets: Object.fromEntries(H.pets.map(p => [p.species, true])), needsYes: null, equipment: {},
  };
}
function wzDraft(H) { if (!H.setup.draft || H.setup.draft.purpose === undefined) { H.setup.draft = wzInitial(H); H.setup.step = 0; persist(); } return H.setup.draft; }
function wzSteps(d) {
  const s = ['purpose'];
  if (d.purpose !== 'car') s.push('hours', 'where');
  s.push('people');
  if (d.purpose !== 'car') { s.push('pets', 'needs'); if (d.needsYes) s.push('needsDetail'); }
  s.push('equip', 'bags');
  return s;
}
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }

const ans = (act, data, label, sub, on, ic) => h`<button type="button" class="ans" aria-pressed="${on ? 'true' : 'false'}" data-act="${act}" ${raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '))}>${ic ? icon(ic) : ''}<span>${label}${sub ? h`<small>${sub}</small>` : ''}</span><span class="mark">${icon('check')}</span></button>`;

route('/wizard', H => {
  const d = wzDraft(H); const steps = wzSteps(d); const i = clamp(H.setup.step || 0, 0, steps.length - 1); const key = steps[i];
  const last = i === steps.length - 1;
  let q, body, next = true;
  if (key === 'purpose') {
    q = 'Wofür packst du?'; next = d.purpose === 'custom';
    body = h`<div class="answers">${WZ_PURPOSE.map(([k, l, s, ic]) => ans('wz-pick', { f: 'purpose', v: k }, l, s, d.purpose === k, ic))}</div>
      ${d.purpose === 'custom' ? h`<div class="field"><label for="wzc">Eigener Zweck</label><input id="wzc" type="text" value="${d.custom}" data-input="wz-text" data-path="custom" maxlength="60"></div>` : ''}`;
  } else if (key === 'hours') {
    q = 'Für wie lange?'; next = false;
    body = h`<div class="answers">${[[24, '24 Stunden', ''], [48, '48 Stunden', ''], [72, '72 Stunden', 'Üblicher Richtwert']].map(([v, l, s]) => ans('wz-pick', { f: 'hours', v }, l, s, +d.hours === v))}</div>`;
  } else if (key === 'where') {
    q = 'Wo kommt ihr unter?'; next = false;
    body = h`<div class="answers">${[['shelter', 'Verwandte, Hotel oder Notunterkunft', ''], ['mobile', 'Draußen unterwegs', 'Zelt oder Tarp, Wasser aufbereiten'], ['both', 'Beides möglich', '']].map(([v, l, s]) => ans('wz-pick', { f: 'where', v }, l, s, d.where === v))}</div>`;
  } else if (key === 'people') {
    q = 'Wer packt mit?';
    body = h`<div class="stack-s">${d.people.map((p, k) => h`<div class="person-card"><div class="row nowrap"><div class="field grow"><label>Name</label><input type="text" value="${p.name || ''}" data-input="wz-text" data-path="people.${k}.name" placeholder="${+p.age < 18 ? 'Kind' : 'Erwachsene/r'}" maxlength="40"></div>
        <div class="field" style="width:5.5rem"><label>Alter</label><input type="number" min="0" max="110" inputmode="numeric" value="${p.age ?? ''}" data-input="wz-num" data-path="people.${k}.age"></div>
        ${d.people.length > 1 ? h`<button class="btn icon danger" style="align-self:flex-end" data-act="wz-del-person" data-i="${k}" aria-label="Person entfernen">${icon('trash')}</button>` : ''}</div></div>`)}</div>
      <div class="btns"><button class="btn" data-act="wz-add-person" data-kind="adult">${icon('plus')} Erwachsene/r</button><button class="btn" data-act="wz-add-person" data-kind="child">${icon('plus')} Kind</button></div>`;
  } else if (key === 'pets') {
    q = 'Kommen Tiere mit?';
    body = h`<div class="answers">${ans('wz-nopet', {}, 'Kein Tier', '', !WZ_PETS.some(s => d.pets[s]))}${WZ_PETS.map(s => ans('wz-pet', { v: s }, s, '', !!d.pets[s], 'paw'))}</div>`;
  } else if (key === 'needs') {
    q = 'Braucht jemand täglich Medikamente oder Hilfsmittel?'; next = false;
    body = h`<div class="answers">${ans('wz-pick', { f: 'needsYes', v: '0' }, 'Nein', '', d.needsYes === false)}${ans('wz-pick', { f: 'needsYes', v: '1' }, 'Ja', 'Freiwillig – bleibt auf diesem Gerät', d.needsYes === true)}</div>`;
  } else if (key === 'needsDetail') {
    q = 'Was wird gebraucht?';
    body = h`<div class="stack-s">${d.people.map((p, k) => h`<div class="person-card"><strong>${p.name || (+p.age < 18 ? 'Kind' : 'Erwachsene/r')}</strong>
      <div class="field"><label>Medikamente</label><input type="text" value="${p._meds ?? (p.needs.meds || []).map(m => m.name).join(', ')}" data-input="wz-text" data-path="people.${k}._meds" placeholder="mit Komma trennen"></div>
      <div class="field"><label>Hilfsmittel</label><input type="text" value="${p.needs.aids || ''}" data-input="wz-text" data-path="people.${k}.needs.aids" placeholder="z. B. Brille, Hörgerät"></div>
      <div class="field"><label>Allergien</label><input type="text" value="${p.needs.allergies || ''}" data-input="wz-text" data-path="people.${k}.needs.allergies"></div></div>`)}</div>`;
  } else if (key === 'equip') {
    q = 'Was hast du schon?';
    body = h`<div class="stack-s">${WZ_EQUIP.map(([k, label]) => h`<div class="person-card"><div class="row nowrap"><span class="grow bold">${label}</span><div class="stepper"><button type="button" data-act="wz-eq" data-key="${k}" data-d="-1" aria-label="${label} weniger">−</button><span>${d.equipment[k] || 0}</span><button type="button" data-act="wz-eq" data-key="${k}" data-d="1" aria-label="${label} mehr">+</button></div></div></div>`)}</div>`;
  } else {
    q = 'Welche Taschen hast du?';
    body = h`<div class="stack-s">${H.bags.map(b => h`<div class="tile"><span class="ti">${icon('bag')}</span><span class="grow"><span class="tt">${b.name}</span><br><span class="ts">${(BAG_TYPE[b.type] || {}).label || ''} · ${fmt0(b.liters)} l</span></span></div>`)}</div>
      <button class="btn lg block" data-act="bag-new" data-stay="1">${icon('plus')} Tasche hinzufügen</button>
      ${H.bags.length ? '' : h`<p class="muted small">Ohne Tasche schlägt die App passende Rucksäcke vor.</p>`}`;
  }
  return {
    full: true, title: 'Packassistent',
    html: h`<div class="topbar">${i > 0 ? h`<button class="btn icon ghost" data-act="wz-prev" aria-label="Zurück">${icon('back')}</button>` : ''}<div class="grow">${bar(Math.round((i + 1) / steps.length * 100))}</div><span class="small muted mono">${i + 1}/${steps.length}</span><button class="btn icon ghost" data-act="wz-later" aria-label="Schließen">${icon('close')}</button></div>
      <main class="page"><div class="page-inner"><h1 class="q">${q}</h1>${body}
        ${next ? h`<div class="actionbar"><button class="btn primary lg" data-act="${last ? 'wz-finish' : 'wz-next'}">${last ? h`${icon('check')} Packliste erstellen` : h`Weiter ${icon('chev')}`}</button></div>` : ''}
      </div></main>`,
  };
});

/* ---- Aktionen ---- */
INPUT['wz-text'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); persist(); };
INPUT['wz-num'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value === '' ? '' : +el.value); persist(); };
function wzGo(delta) { const H = HH(); const n = wzSteps(wzDraft(H)).length; H.setup.step = clamp((H.setup.step || 0) + delta, 0, n - 1); persist(); rerender(); }
ACT['wz-pick'] = d => {
  const w = wzDraft(HH()); const f = d.f;
  w[f] = f === 'hours' ? +d.v : f === 'needsYes' ? d.v === '1' : d.v;
  persist();
  if (f === 'purpose' && d.v === 'custom') { rerender(); return; }
  wzGo(1);
};
ACT['wz-nopet'] = () => { wzDraft(HH()).pets = {}; persist(); rerender(true); };
ACT['wz-pet'] = d => { const w = wzDraft(HH()); w.pets[d.v] = !w.pets[d.v]; persist(); rerender(true); };
ACT['wz-add-person'] = d => { wzDraft(HH()).people.push(personShape({ id: uid(), name: '', age: d.kind === 'child' ? 6 : 35 })); persist(); rerender(true); };
ACT['wz-del-person'] = d => { const w = wzDraft(HH()); if (w.people.length > 1) w.people.splice(+d.i, 1); persist(); rerender(true); };
ACT['wz-eq'] = d => { const w = wzDraft(HH()); w.equipment[d.key] = clamp((w.equipment[d.key] || 0) + (+d.d), 0, 30); persist(); rerender(true); };
ACT['wz-prev'] = () => wzGo(-1);
ACT['wz-next'] = () => {
  const H = HH(); const d = wzDraft(H); const key = wzSteps(d)[H.setup.step || 0];
  if (key === 'purpose' && !d.purpose) { toast('Bitte eine Antwort wählen.'); return; }
  if (key === 'people') for (const p of d.people) if (p.age === '' || p.age === null || isNaN(+p.age) || +p.age < 0 || +p.age > 110) { toast('Alter fehlt (0–110).'); return; }
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
  go('#/review'); toast(`${H.items.length - before} Sachen auf der Liste – hake ab, was du hast`);
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
  // Tiere nur als Bedarfskriterium
  const wanted = WZ_PETS.filter(s => d.pets[s]);
  H.pets = H.pets.filter(p => wanted.includes(p.species) || !WZ_PETS.includes(p.species));
  for (const s of wanted) if (!H.pets.some(p => p.species === s)) H.pets.push({ id: uid(), species: s, name: '', count: 1, age: '', weightKg: '', needs: '' });
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
  const report = applyPlan(H, S);
  H.setup.done = true; H.setup.skipped = false;
  return report;
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
