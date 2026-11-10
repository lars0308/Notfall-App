'use strict';
/* ===== Notfall! – Empfehlungen ===== */
const RECUI = { tab: 'must' };
const REC_TABS = [['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional'], ['hidden', 'Ausgeblendet'], ['done', 'Erledigt']];
route('/recs', H => {
  const S = DB.settings; const all = computeRecs(H, S);
  const bucket = k => k === 'hidden' ? all.filter(r => r.state === 'hidden') : k === 'done' ? all.filter(r => r.state === 'have' || r.state === 'accepted') : all.filter(r => r.level === k && !r.state);
  const list = bucket(RECUI.tab);
  return {
    title: 'Empfehlungen', back: '#/more',
    html: h`<p class="muted">Die App prüft deine Ausrüstung nach nachvollziehbaren Regeln auf Lücken. Jede Empfehlung erklärt, warum sie erscheint. Sie ersetzt keine amtliche Beratung.</p>
    <div class="tabs" role="tablist">${REC_TABS.map(([k, l]) => h`<button role="tab" aria-selected="${RECUI.tab === k}" data-act="rec-tab" data-tab="${k}">${l} (${bucket(k).length})</button>`)}</div>
    ${list.length ? list.map(r => recCard(H, r)) : (RECUI.tab === 'must' ? noticeBox('ok', 'Keine notwendigen Lücken gefunden', 'Aktuell erkennt die App keine fehlende Pflichtausrüstung. Prüfe trotzdem regelmäßig.') : empty('Keine Einträge.'))}`,
  };
});
function recCard(H, r) {
  const a = r.action || { type: 'none' }; const tpl = a.type === 'template';
  return h`<div class="card" style="border-left:6px solid var(--${r.level === 'must' ? 'must' : r.level === 'rec' ? 'rec-line' : 'opt-line'})">
    <div class="row spread" style="align-items:flex-start"><div class="grow"><div class="row" style="margin-bottom:4px">${levelBadge(r.level)}<span class="badge">${r.cat}</span></div><h3>${r.title}</h3></div></div>
    <p style="margin-top:8px"><b>Warum?</b> ${r.why}</p><p class="small muted">Quelle: ${r.source}</p>
    ${r.note ? h`<div class="notice info" style="margin:8px 0">${icon('edit')}<div><p class="nt">Deine Notiz</p><p>${r.note}</p></div></div>` : ''}
    <div class="btns" style="margin-top:12px">
      ${r.state ? h`<button class="btn" data-act="rec-restore" data-id="${r.id}">Wieder einblenden</button>` : h`
        ${tpl ? h`<button class="btn primary" data-act="rec-shop" data-id="${r.id}">${icon('cart')} Auf Einkaufsliste</button><button class="btn" data-act="rec-add" data-id="${r.id}">${icon('plus')} Gegenstand hinzufügen</button><button class="btn" data-act="rec-have" data-id="${r.id}">${icon('check')} Habe ich schon</button><button class="btn" data-act="rec-accept" data-id="${r.id}">Akzeptieren</button><button class="btn" data-act="rec-alt" data-id="${r.id}">Alternative wählen</button>` : ''}
        ${a.type === 'goto' ? h`<a class="btn primary" href="${a.route}">Öffnen</a><button class="btn" data-act="rec-accept" data-id="${r.id}">Akzeptieren</button>` : ''}
        ${a.type === 'balance' ? h`<button class="btn primary" data-act="bags-balance">${icon('repeat')} Verteilung vorschlagen</button>` : ''}
        ${a.type === 'confirmMed' ? h`<button class="btn primary" data-act="rec-med" data-id="${r.id}">${icon('plus')} Medikament eintragen</button><button class="btn" data-act="rec-have" data-id="${r.id}">${icon('check')} Habe ich schon</button>` : ''}
        ${a.type === 'restock' ? h`<button class="btn primary" data-act="rec-restock" data-id="${r.id}">${icon('cart')} Auf Einkaufsliste</button>` : ''}
        ${a.type === 'none' ? h`<button class="btn" data-act="rec-accept" data-id="${r.id}">Akzeptieren</button>` : ''}
        <button class="btn" data-act="rec-note" data-id="${r.id}">${icon('edit')} Notiz</button><button class="btn ghost" data-act="rec-hide" data-id="${r.id}">Ausblenden</button>`}
    </div></div>`;
}
const recById = (H, id) => computeRecs(H, DB.settings).find(r => r.id === id);
function recSetState(H, id, state) { H.recs[id] = Object.assign(H.recs[id] || {}, { state, at: new Date().toISOString() }); if (!state) delete H.recs[id].state; persist(); rerender(true); }
ACT['rec-tab'] = d => { RECUI.tab = d.tab; rerender(true); };
ACT['rec-hide'] = d => recSetState(HH(), d.id, 'hidden');
ACT['rec-restore'] = d => { const H = HH(); if (H.recs[d.id]) { delete H.recs[d.id].state; if (!H.recs[d.id].note) delete H.recs[d.id]; } persist(); rerender(true); };
ACT['rec-note'] = async d => { const H = HH(); const cur = (H.recs[d.id] || {}).note || ''; const v = await promptDlg('Eigene Notiz', 'Notiz zu dieser Empfehlung', cur); if (v === null) return; H.recs[d.id] = Object.assign(H.recs[d.id] || {}, { note: v.trim() }); if (!v.trim() && !H.recs[d.id].state) delete H.recs[d.id]; persist(); rerender(true); };
ACT['rec-accept'] = d => {
  const H = HH(); const r = recById(H, d.id); if (!r) return; const a = r.action;
  if (a.type === 'template') { recEnsureItem(H, r, 'planned'); }
  recSetState(H, d.id, 'accepted'); toast('Übernommen');
};
function recEnsureItem(H, r, status, nameOverride) {
  const a = r.action; const t = T[a.key] || {};
  let it = a.itemId ? byId(H.items, a.itemId) : null;
  if (!it) it = H.items.find(i => !i.archived && i.key === a.key && i.status !== 'owned' && (!a.personId || i.personId === a.personId) && (!a.petId || i.petId === a.petId) && (a.container ? i.container === a.container : true));
  if (!it) {
    const container = a.container || (t.z === 'home' ? 'home' : t.z === 'car' ? 'car' : 'bag');
    it = makeItem({ key: a.key, qty: a.qty || 1, container, prio: r.level, personId: a.personId, petId: a.petId, name: nameOverride || a.name, flex: !a.personId, why: r.why }, { status, source: 'plan' });
    if (nameOverride) it.name = nameOverride;
    H.items.push(it);
    if (container === 'bag') { assignToBags(H, DB.settings); H.bags.forEach(b => autoPack(H, b, { onlyUnassigned: true })); }
  } else if (nameOverride) it.name = nameOverride;
  if (status === 'missing') setItemStatus(H, it, 'missing'); else if (status === 'owned') setItemStatus(H, it, 'owned');
  return it;
}
ACT['rec-shop'] = async d => {
  const H = HH(); const r = recById(H, d.id); if (!r) return;
  const dups = findOwnedDuplicates(H, T[r.action.key] ? T[r.action.key].n : r.title, r.action.key).filter(x => !r.action.personId || x.personId === r.action.personId);
  if (dups.length) { const ok = await confirmDlg('Schon vorhanden?', h`<p>Du hast bereits: <b>${dups[0].name}</b> (${itemQtyLabel(dups[0])}). Trotzdem auf die Einkaufsliste setzen?</p>`, { ok: 'Trotzdem hinzufügen', cancel: 'Nicht kaufen' }); if (!ok) return; }
  recEnsureItem(H, r, 'missing'); recSetState(H, d.id, 'accepted'); toast('Auf der Einkaufsliste');
};
ACT['rec-have'] = d => {
  const H = HH(); const r = recById(H, d.id); if (!r) return;
  if (r.action.type === 'template') recEnsureItem(H, r, 'owned');
  else if (r.action.type === 'confirmMed') { addMedItem(H, r.action); }
  recSetState(H, d.id, 'have'); toast('Als vorhanden vermerkt');
};
ACT['rec-add'] = d => {
  const H = HH(); const r = recById(H, d.id); if (!r) return; const a = r.action; const t = T[a.key] || {};
  closeAllModals();
  openItemForm(null, { key: a.key, qty: a.qty, container: a.container || (t.z === 'home' ? 'home' : t.z === 'car' ? 'car' : 'home'), personId: a.personId, petId: a.petId, name: a.name });
};
ACT['rec-alt'] = d => {
  const H = HH(); const r = recById(H, d.id); if (!r) return; const alts = ALTS[r.action.key] || [];
  const m = openModal({ title: 'Alternative wählen', body: h`<p class="muted">Wähle eine Variante – sie kommt auf die Einkaufsliste.</p><div class="list card flush">${alts.map(a => h`<button class="li" data-act="alt-pick" data-name="${a}"><span class="grow"><span class="t">${a}</span></span></button>`)}</div><div class="field"><label for="altc">Oder eigene Alternative</label><input id="altc" type="text" placeholder="z. B. Marke und Modell"></div>`, foot: dlgButtons([{ label: 'Abbrechen', act: 'dlg-no' }, { label: 'Eigene übernehmen', cls: 'primary', act: 'alt-custom' }]) });
  m.el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return; let name = null;
    if (a.dataset.act === 'alt-pick') name = a.dataset.name; else if (a.dataset.act === 'alt-custom') name = ($('#altc', m.el).value || '').trim(); else if (a.dataset.act === 'dlg-no') { closeModal(m); return; }
    if (!name) { if (a.dataset.act === 'alt-custom') toast('Bitte eine Bezeichnung eintragen.'); return; }
    closeModal(m); recEnsureItem(H, r, 'missing', name); recSetState(H, d.id, 'accepted'); toast('Auf der Einkaufsliste: ' + name);
  });
};
function addMedItem(H, a) {
  const p = byId(H.people, a.personId); if (!p) return;
  const med = (p.needs.meds || []).find(m => m.name === a.med) || { name: a.med };
  const it = makeItem({ key: 'meds', name: 'Medikament: ' + med.name + (med.dose ? ' (' + med.dose + ')' : ''), qty: 1, unit: 'Vorrat', personId: p.id, container: 'bag', prio: 'must', expiry: med.expiry || '', uniq: 'med:' + med.name, flex: false }, { status: 'owned', source: 'manual' });
  H.items.push(it); assignToBags(H, DB.settings); H.bags.forEach(b => autoPack(H, b, { onlyUnassigned: true }));
}
ACT['rec-med'] = d => { const H = HH(); const r = recById(H, d.id); if (!r) return; addMedItem(H, r.action); recSetState(H, d.id, 'have'); toast('Medikament eingetragen'); };
ACT['rec-restock'] = d => { const H = HH(); const r = recById(H, d.id); const it = byId(H.items, r.action.itemId); if (!it) return; const missingQty = Math.max(1, (it.minQty || 1) * 2 - it.qty); const entry = ensureShopEntry(H, Object.assign({}, it, { qty: missingQty, prio: 'must' })); entry.qty = missingQty; persist(); rerender(true); toast('Auf der Einkaufsliste'); };
