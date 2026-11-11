'use strict';
/* ===== Notfall! – „Rucksäcke & Taschen“: Zweck, Dauer, Unterkunft, wer trägt was ===== */
const WZ_PURPOSE = [
  ['evac', 'Notfallrucksack', 'Evakuierung, schnell aus dem Haus', 'bag'],
  ['travel', 'Reise-Notfall', 'Unterwegs gestrandet, Übernachtung auswärts', 'map'],
  ['car', 'Auto-Notfalltasche', 'Panne, Stau, Winter', 'car'],
  ['custom', 'Eigener Zweck', '', 'edit'],
];
const WZ_BAG_TYPES = ['day', 'hiking', 'tactical', 'trekking', 'kids', 'school'];
function wzCarryDefault(H, p) {
  const own = H.bags.find(b => b.owner === p.id && b.role !== 'car'); if (own) return 'bag:' + own.id;
  if (p.noBag) return 'none';
  const a = p.age === '' || p.age === undefined ? 35 : +p.age;
  return a < 6 ? 'none' : a < 13 ? 'type:kids' : a < 18 || a >= 65 ? 'type:hiking' : 'type:trekking';
}
function wzCarryOf(H, d, p) { return d.carryPicked && d.carryPicked[p.id] && d.carry[p.id] ? d.carry[p.id] : wzCarryDefault(H, p); }

WZ_STEP.purpose = {
  view: (H, d) => ({
    q: 'Wofür packst du?', next: d.purpose === 'custom',
    body: h`<div class="answers">${WZ_PURPOSE.map(([k, l, sub, ic]) => ans('wz-pick', { f: 'purpose', v: k }, l, sub, d.purpose === k, ic))}</div>
      ${d.purpose === 'custom' ? h`<div class="field"><label for="wzc">Eigener Zweck</label><input id="wzc" type="text" value="${d.custom}" data-input="wz-text" data-path="custom" maxlength="60"></div>` : ''}`,
  }),
  check: (H, d) => d.purpose ? '' : 'Bitte eine Antwort wählen.',
};
WZ_STEP.hours = {
  view: (H, d) => ({ q: 'Für wie lange?', next: false, body: h`<div class="answers">${[[24, '24 Stunden', ''], [48, '48 Stunden', ''], [72, '72 Stunden', 'Üblicher Richtwert']].map(([v, l, sub]) => ans('wz-pick', { f: 'hours', v }, l, sub, +d.hours === v))}</div>` }),
};
WZ_STEP.where = {
  view: (H, d) => ({ q: 'Wo kommt ihr unter?', next: false, body: h`<div class="answers">${[['shelter', 'Verwandte, Hotel oder Notunterkunft', ''], ['mobile', 'Draußen unterwegs', 'Zelt oder Tarp, Wasser aufbereiten'], ['both', 'Beides möglich', '']].map(([v, l, sub]) => ans('wz-pick', { f: 'where', v }, l, sub, d.where === v))}</div>` }),
};
WZ_STEP.bags = {
  view: (H, d) => {
    const own = H.bags.filter(b => b.role !== 'car');
    return {
      q: 'Wer trägt welchen Rucksack?',
      body: h`<div class="stack-s">${d.people.map((p, k) => { const sel = wzCarryOf(H, d, p); return h`<div class="person-card"><div class="row nowrap">${wzAvatar(p, k)}<span class="grow"><strong>${wzPersonLabel(p, k)}</strong><br><span class="muted small">${wzCalcLine(p).split(' · ')[1] || ''}</span></span></div>
          <div class="chips" style="margin-top:10px">${chip('wz-carry', { id: p.id, v: 'none' }, 'Keinen', sel === 'none')}
            ${own.map(b => chip('wz-carry', { id: p.id, v: 'bag:' + b.id }, b.name, sel === 'bag:' + b.id))}
            ${WZ_BAG_TYPES.map(t => chip('wz-carry', { id: p.id, v: 'type:' + t }, `${BAG_TYPE[t].label.replace('-/MOLLE', '')} ${fmt0(BAG_TYPE[t].liters)} l`, sel === 'type:' + t))}</div></div>`; })}</div>
        <label class="check"><input type="checkbox" data-change="wz-shared" ${d.shared ? raw('checked') : ''}><span><span class="t">Gemeinsame Familientasche</span><br><span class="s">Reisetasche für Dinge, die alle brauchen</span></span></label>
        ${d.purpose === 'car' ? h`<p class="muted small">Für das Auto wird zusätzlich eine Auto-Notfalltasche angelegt.</p>` : ''}`,
    };
  },
};

ACT['wz-carry'] = d => { const w = wzDraft(HH()); w.carry[d.id] = d.v; w.carryPicked = Object.assign(w.carryPicked || {}, { [d.id]: true }); persist(); rerender(true); };
INPUT['wz-shared'] = el => { wzDraft(HH()).shared = el.checked; persist(); };
ACT['wz-finish'] = () => {
  const H = HH(); const d = wzDraft(H);
  const before = H.items.length;
  finishWizard(H, d);
  H.setup.step = 0; H.setup.draft = null; persist(); flushDB();
  REV.tab = 'check'; REV.prio = 'all';
  PICK.cat = null; const b = packBags(H)[0]; const c = b && nextOpenCat(H, b); go(b && c ? bagHref(b.id, c.id) : '#/review'); toast('Jetzt Kategorie für Kategorie abhaken, was du hast');
};
function finishWizard(H, d) {
  const S = DB.settings;
  finishProfile(H, d); H.profileDone = true;
  const hours = d.purpose === 'car' ? ((H.cfg && H.cfg.durationHours) || 72) : (+d.hours || 72);
  const prev = ((H.cfg && H.cfg.goals) || []).filter(g => g === 'car' || (d.purpose === 'car' && /^bag|^evac$/.test(g)));
  const goals = Array.from(new Set(prev.concat(d.purpose === 'car' ? ['car'] : ['bag' + hours])));
  const strategies = d.purpose === 'travel' ? ['travel'] : d.where === 'both' ? ['shelter', 'mobile'] : [d.where || 'shelter'];
  H.cfg = Object.assign({}, H.cfg || {}, { purpose: d.purpose || 'evac', customScenario: d.custom || '', goals, strategies, durationHours: hours, boxOnly: !goals.some(g => /^bag/.test(g)), country: (H.cfg && H.cfg.country) || 'DE', housing: Object.assign({}, (H.cfg && H.cfg.housing) || {}, H.home || {}) });
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
