'use strict';
/* ===== Notfall! – „Was fehlt?“: alles Fehlende zusammengefasst, nach Wichtigkeit, mit „Habe ich“ oder „Kaufen“ ===== */
const NEED_GROUPS = [['must', 'Zuerst besorgen', 'Ohne das wird es im Notfall schwierig.'], ['rec', 'Sinnvoll', 'Macht vieles leichter.'], ['opt', 'Wenn Platz ist', '']];
/* Gleiche Sachen (gleicher Vorlagen-Schlüssel oder Name) zusammenfassen – über alle Rucksäcke */
function needList(H, only) {
  const map = new Map();
  for (const i of H.items) {
    if (i.archived || i.status === 'owned' || i.container === 'home' || (only && !only(i))) continue;
    const k = (String(i.key || '').split(':')[0] || 'n:' + norm(i.name)) + '|' + (i.unit || '');
    let g = map.get(k);
    if (!g) { g = { k, name: i.name, unit: i.unit || '', qty: 0, prio: i.prio, items: [], who: new Set(), why: i.why || '' }; map.set(k, g); }
    g.qty += +i.qty || 0; g.items.push(i);
    if (PRIO_ORDER[i.prio] < PRIO_ORDER[g.prio]) g.prio = i.prio;
    const b = i.bagId && byId(H.bags, i.bagId); const p = i.personId && byId(H.people, i.personId);
    g.who.add(p ? p.name : b ? b.name : 'gemeinsam');
  }
  return [...map.values()].sort((a, b) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || a.name.localeCompare(b.name, 'de'));
}
const NEEDUI = { opt: false };
function needRow(g) {
  const onList = g.items.every(i => i.status === 'missing');
  return h`<div class="li need"><div class="grow"><span class="t">${g.name}</span><br><span class="s">${fmt(g.qty)} ${g.unit} · ${[...g.who].join(', ')}${onList ? ' · auf der Einkaufsliste' : ''}</span></div>
    ${dotSlot(g.prio === 'must' ? 'must' : '', 'wichtig')}
    <button class="btn icon ok sm" data-act="need-have" data-k="${g.k}" aria-label="${g.name}: habe ich" title="Habe ich">${icon('check')}</button>
    ${onList ? h`<a class="btn icon sm ghost" href="#/shop" aria-label="Zur Einkaufsliste" title="Auf der Einkaufsliste">${icon('cart')}</a>` : h`<button class="btn icon sm" data-act="need-buy" data-k="${g.k}" aria-label="${g.name}: kaufen" title="Kaufen">${icon('cart')}</button>`}</div>`;
}
const needLegend = () => h`<p class="hint">${icon('check')} = habe ich · ${icon('cart')} = kaufen</p>`;
route('/needs', H => {
  const list = needList(H);
  const by = Object.fromEntries(NEED_GROUPS.map(([p]) => [p, list.filter(g => g.prio === p)]));
  const toBuy = list.filter(g => g.prio === 'must' && !g.items.every(i => i.status === 'missing'));
  return {
    title: 'Was fehlt?', back: '#/home',
    html: h`${list.length ? h`<div class="card"><h2>${by.must.length ? `${by.must.length} wichtige ${by.must.length === 1 ? 'Sache fehlt' : 'Sachen fehlen'}` : 'Das Wichtigste ist da'}</h2>
        <p class="muted" style="margin-top:4px">${by.must.length ? 'Fang oben an. Was du schon hast, tippst du einfach weg.' : 'Der Rest ist nicht dringend.'}</p>
        ${needLegend()}${toBuy.length ? h`<button class="btn primary block" style="margin-top:12px" data-act="need-buy-all">${icon('cart')} Alles Wichtige kaufen (${toBuy.length})</button>` : ''}</div>`
      : h`<div class="notice ok">${icon('check')}<div><p class="nt">Nichts fehlt</p><p>Alles auf den Packlisten ist vorhanden.</p></div></div>`}
    ${NEED_GROUPS.map(([p, label, sub]) => by[p].length ? (p === 'opt' && !NEEDUI.opt ? h`<button class="btn block" data-act="need-opt">${label}: ${by[p].length} zeigen</button>`
      : h`<div class="card flush"><div class="card-head" style="padding:14px 16px 0"><h3>${label}</h3><span class="badge">${by[p].length}</span></div><div class="list">${by[p].map(needRow)}</div></div>`) : '')}
    ${recCount(H) ? h`<a class="tile slim" href="#/recs"><span class="grow"><span class="tt">Hinweise zur Ausrüstung</span><br><span class="ts">${recCount(H)} Hinweise, z. B. Kocher ohne Brennstoff</span></span>${icon('chev', 'chev')}</a>` : ''}`,
  };
});
const needGroup = k => needList(HH()).find(g => g.k === k) || needList(HH(), () => true).find(g => g.k === k);
function recCount(H) { try { return openRecs(H, DB.settings).filter(r => r.action && r.action.type !== 'template').length; } catch { return 0; } }
ACT['need-have'] = d => { const H = HH(); const g = needGroup(d.k); if (!g) return; g.items.forEach(i => setItemStatus(H, i, 'owned')); persist(); rerender(true); toast(g.name + ': vorhanden'); };
ACT['need-buy'] = d => { const H = HH(); const g = needGroup(d.k); if (!g) return; g.items.forEach(i => setItemStatus(H, i, 'missing')); persist(); rerender(true); toast(g.name + ' auf der Einkaufsliste'); };
ACT['need-buy-all'] = () => { const H = HH(); const gs = needList(H).filter(g => g.prio === 'must'); gs.forEach(g => g.items.forEach(i => { if (i.status !== 'missing') setItemStatus(H, i, 'missing'); })); persist(); toast(gs.length + ' Sachen auf der Einkaufsliste'); go('#/shop'); };
ACT['need-opt'] = () => { NEEDUI.opt = true; rerender(true); };
