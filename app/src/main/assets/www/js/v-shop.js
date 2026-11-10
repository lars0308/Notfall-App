'use strict';
/* ===== Notfall! – Einkaufsliste und Budget ===== */
const SHOP = { prio: 'all', showBought: false };
function shopTotals(H, S) {
  const open = H.shop.filter(s => !s.bought), bought = H.shop.filter(s => s.bought);
  const est = open.reduce((a, s) => a + (+s.estPrice || 0) * (+s.qty || 1), 0);
  const spent = bought.reduce((a, s) => a + (+s.actualPrice || 0), 0);
  const budget = +H.budget || +S.plan.budget || 0;
  return { open, bought, est, spent, budget, noPrice: open.filter(s => !(+s.estPrice)).length };
}
route('/shop', H => {
  const S = DB.settings; const t = shopTotals(H, S);
  const unchecked = H.items.filter(i => !i.archived && i.status === 'planned').length;
  const order = { must: 0, rec: 1, opt: 2 };
  const list = t.open.filter(s => SHOP.prio === 'all' || s.priority === SHOP.prio).sort((a, b) => order[a.priority] - order[b.priority] || (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name, 'de'));
  return {
    title: 'Einkaufsliste', back: '#/more', actions: h`<button class="btn primary sm" data-act="shop-new">${icon('plus')}<span>Neu</span></button>`,
    html: h`${t.est || t.spent ? h`<div class="card"><div class="row spread"><span>Geschätzt offen</span><span class="bold">${fmtEUR(t.est)}</span></div>${t.spent ? h`<div class="row spread"><span>Ausgegeben</span><span class="bold">${fmtEUR(t.spent)}</span></div>` : ''}</div>` : ''}
    ${unchecked ? h`<a class="btn" href="#/review">${unchecked} Positionen noch offen – erst prüfen</a>` : ''}
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Zu besorgen</h2><span class="badge">${list.length}</span></div><div class="list">${list.length ? list.map(s => shopRow(s)) : empty('Nichts zu besorgen.')}</div></div>
    ${t.bought.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Gekauft</h2><button class="btn sm" data-act="shop-toggle-bought">${SHOP.showBought ? 'Ausblenden' : 'Anzeigen (' + t.bought.length + ')'}</button></div>${SHOP.showBought ? h`<div class="list">${t.bought.map(s => h`<div class="li done"><span class="grow"><span class="t">${s.name}</span><br><span class="s">${fmt(s.qty)} ${s.unit || ''} · ${s.actualPrice ? fmtEUR(s.actualPrice) : 'ohne Preis'}${s.store ? ' · ' + s.store : ''}</span></span><button class="btn sm" data-act="shop-unbuy" data-id="${s.id}">Rückgängig</button></div>`)}</div>` : ''}</div>` : ''}`,
  };
});
function shopRow(s) {
  return h`<div class="li ${s.priority === 'must' ? 'must' : s.priority === 'rec' ? 'rec' : ''}" style="flex-wrap:wrap;align-items:flex-start">
    <div class="grow" style="min-width:11rem"><a href="#" data-act="shop-edit" data-id="${s.id}" class="t" style="color:inherit;text-decoration:none">${s.name}</a>
      <div class="s">${fmt(s.qty)} ${s.unit || ''} · ${s.category || ''}${s.estPrice ? ' · ca. ' + fmtEUR(s.estPrice * s.qty) : ''}${s.store ? ' · ' + s.store : ''}</div>
      ${s.reason ? h`<details class="small muted"><summary style="cursor:pointer;min-height:32px;display:flex;align-items:center">Warum?</summary><p>${s.reason}</p></details>` : ''}${s.notes ? h`<div class="small">${s.notes}</div>` : ''}</div>
    ${levelBadge(s.priority)}${s.url ? h`<button class="btn sm" data-act="open-url" data-url="${s.url}">${icon('eye')}<span>Link</span></button>` : ''}
    <button class="btn sm" data-act="shop-edit" data-id="${s.id}" aria-label="${s.name} bearbeiten">${icon('edit')}</button>
    <button class="btn sm ok" data-act="shop-buy" data-id="${s.id}">${icon('check')} Gekauft</button></div>`;
}
ACT['shop-prio'] = d => { SHOP.prio = d.prio; rerender(true); };
ACT['shop-toggle-bought'] = () => { SHOP.showBought = !SHOP.showBought; rerender(true); };
ACT['budget-set'] = async () => { const H = HH(); const v = await promptDlg('Budget festlegen', 'Gesamtbudget in Euro (0 = kein Budget)', H.budget || '', { type: 'number', hint: 'Gilt für diesen Haushalt.' }); if (v === null) return; H.budget = Math.max(0, num(v)); persist(); rerender(true); };

function shopFields(s, isNew) {
  return h`${F.text('name', 'Gegenstand', s.name, { req: true, max: 120 })}
    <div class="form-grid">${F.select('category', 'Kategorie', CATEGORIES, s.category || 'Sonstiges')}${F.select('priority', 'Priorität', [['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional']], s.priority || 'rec')}${F.num('qty', 'Anzahl', s.qty ?? 1, { req: true, min: 0.01 })}${F.select('unit', 'Einheit', UNITS.includes(s.unit) ? UNITS : [...UNITS, s.unit || 'Stück'], s.unit || 'Stück')}</div>
    <div class="form-grid">${F.num('estPrice', 'Geschätzter Preis pro Einheit (€, optional)', s.estPrice ?? '')}${F.text('store', 'Händler', s.store || '', { max: 60 })}</div>
    ${F.text('url', 'Produktlink (optional)', s.url || '', { type: 'url', ph: 'https://…' })}${F.area('notes', 'Notizen', s.notes || '', { rows: 3 })}`;
}
ACT['shop-new'] = () => {
  const H = HH();
  formDlg({ title: 'Zur Einkaufsliste hinzufügen', wide: true, body: shopFields({ qty: 1 }, true), ok: 'Hinzufügen',
    onSubmit: async fd => {
      const name = fd.get('name').trim(); if (!name) throw new Error('Bitte einen Namen eintragen.');
      const dups = findOwnedDuplicates(H, name, null);
      if (dups.length) {
        const ok = await confirmDlg('Schon vorhanden?', h`<p>Du hast bereits eingetragen:</p><ul>${dups.slice(0, 4).map(d => h`<li><b>${d.name}</b> – ${itemQtyLabel(d)} (${whereOf(H, d)})</li>`)}</ul><p>Möchtest du trotzdem kaufen?</p>`, { ok: 'Trotzdem hinzufügen', cancel: 'Nicht kaufen' });
        if (!ok) return true;
      }
      const planned = H.items.find(i => !i.archived && (i.status === 'planned' || i.status === 'missing') && similar(i.name, name) >= 0.75);
      let it = planned;
      if (!it) { it = newItemDefaults({ name, category: fd.get('category'), qty: num(fd.get('qty'), 1), unit: fd.get('unit'), status: 'missing', source: 'shop', prio: fd.get('priority'), tags: inferTags(name) }); H.items.push(it); }
      else { it.status = 'missing'; }
      const s = ensureShopEntry(H, it); Object.assign(s, { name, category: fd.get('category'), priority: fd.get('priority'), qty: num(fd.get('qty'), 1), unit: fd.get('unit'), estPrice: fd.get('estPrice') === '' ? null : num(fd.get('estPrice')), store: fd.get('store') || '', url: fd.get('url') || '', notes: fd.get('notes') || '' });
      it.qty = s.qty; persist(); rerender(true); toast('Auf der Einkaufsliste');
    } });
};
ACT['shop-edit'] = d => {
  const H = HH(); const s = byId(H.shop, d.id); if (!s) return;
  formDlg({ title: 'Eintrag bearbeiten', wide: true, body: shopFields(s), extraFoot: [{ label: 'Von der Liste nehmen', cls: 'danger', act: 'shop-remove', data: { id: s.id } }],
    onSubmit: fd => { Object.assign(s, { name: fd.get('name').trim() || s.name, category: fd.get('category'), priority: fd.get('priority'), qty: num(fd.get('qty'), 1), unit: fd.get('unit'), estPrice: fd.get('estPrice') === '' ? null : num(fd.get('estPrice')), store: fd.get('store') || '', url: fd.get('url') || '', notes: fd.get('notes') || '' }); const it = byId(H.items, s.itemId); if (it) { it.name = s.name; it.qty = s.qty; it.unit = s.unit; it.prio = s.priority; } persist(); rerender(true); } });
};
ACT['shop-remove'] = async d => {
  const H = HH(); const s = byId(H.shop, d.id); const it = s && byId(H.items, s.itemId);
    H.shop = H.shop.filter(x => x.id !== d.id); if (it && it.status === 'missing') it.status = 'planned'; closeAllModals(); persist(); rerender(true);
};
ACT['shop-buy'] = d => {
  const H = HH(); const s = byId(H.shop, d.id); const it = byId(H.items, s.itemId);
  formDlg({ title: 'Gekauft: ' + s.name, body: h`${F.num('qty', 'Gekaufte Menge (' + (s.unit || 'Stück') + ')', s.qty, { req: true, min: 0.01 })}${F.num('price', 'Tatsächlicher Kaufpreis gesamt (€, optional)', s.estPrice ? +(s.estPrice * s.qty).toFixed(2) : '')}${F.text('store', 'Händler', s.store || '')}${F.date('date', 'Kaufdatum', todayISO())}${F.date('expiry', 'Ablaufdatum (falls vorhanden)', '')}`, ok: 'Ins Inventar übernehmen',
    onSubmit: fd => {
      const q = num(fd.get('qty'), s.qty); if (q <= 0) throw new Error('Bitte eine Menge größer 0 eintragen.');
      s.bought = true; s.actualPrice = fd.get('price') === '' ? null : num(fd.get('price')); s.store = fd.get('store') || s.store; s.boughtAt = fd.get('date') || todayISO(); s.boughtQty = q;
      let item = it; if (!item) { item = newItemDefaults({ name: s.name, category: s.category, qty: q, unit: s.unit, source: 'shop', prio: s.priority, tags: inferTags(s.name) }); H.items.push(item); s.itemId = item.id; }
      item.status = 'owned'; item.qty = q; item.price = s.actualPrice; item.purchaseDate = s.boughtAt; if (fd.get('expiry')) item.expiry = fd.get('expiry'); item.packed = false;
      if (item.container === 'bag' && item.bagId) { const b = byId(H.bags, item.bagId); if (b) autoPack(H, b, { onlyUnassigned: true }); } else if (item.container === 'bag' && !item.bagId) { assignToBags(H, DB.settings); H.bags.forEach(b => autoPack(H, b, { onlyUnassigned: true })); }
      persist(); rerender(true); toast('Ins Inventar übernommen');
    } });
};
ACT['shop-unbuy'] = d => { const H = HH(); const s = byId(H.shop, d.id); s.bought = false; const it = byId(H.items, s.itemId); if (it) it.status = 'missing'; persist(); rerender(true); };
