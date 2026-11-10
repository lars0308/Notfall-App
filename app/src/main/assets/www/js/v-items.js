'use strict';
/* ===== Notfall! – Ausrüstung prüfen, Inventar, Gegenstandsdetails, Hausvorrat ===== */
const UNITS = ['Stück', 'Set', 'Paar', 'Packung', 'Liter', 'kg', 'g', 'Tagesration', 'Rolle', 'Flasche', 'Dose', 'Euro', 'Personentage', 'Vorrat', 'Blatt'];

function groupInfo(H, it) {
  if (it.petId) { const pet = byId(H.pets, it.petId); return ['pet:' + it.petId, 'Haustier' + (pet ? ': ' + pet.species + (pet.name ? ' ' + pet.name : '') : '')]; }
  if (it.container === 'bag') return it.personId ? ['bag:' + it.personId, 'Rucksack – ' + personName(H, it.personId)] : ['bag:shared', 'Gemeinsame Ausrüstung im Rucksack'];
  if (it.container === 'car') return ['car', 'Auto'];
  return ['home', 'Hausvorrat & Zuhause'];
}
const REV = { tab: 'check', prio: 'all' };
const PRIO_ORDER = { must: 0, rec: 1, opt: 2 };
/* Packliste als Abhakliste: zeigt alles, was gebraucht wird; Haken = „habe ich“ */
route('/review', H => {
  const live = H.items.filter(i => !i.archived);
  const have = live.filter(i => i.status === 'owned').length, miss = live.filter(i => i.status === 'missing').length, open = live.length - have - miss;
  const groups = new Map();
  for (const it of live) { const [k, label] = groupInfo(H, it); if (!groups.has(k)) groups.set(k, { label, items: [] }); groups.get(k).items.push(it); }
  for (const g of groups.values()) g.items.sort((a, b) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || a.name.localeCompare(b.name, 'de'));
  if (!live.length) return { title: 'Packliste', html: h`${empty('Noch keine Packliste.')}<div class="actionbar"><a class="btn primary lg" href="#/wizard">${icon('list')} Packliste erstellen</a></div>` };
  return {
    title: 'Packliste',
    actions: h`<a class="btn sm" href="#/wizard">${icon('list')}<span>Assistent</span></a>`,
    html: h`<div class="card"><h2>${open + miss ? 'Das brauchst du' : 'Alles da'}</h2>
      <p class="muted" style="margin:4px 0 12px">${open + miss ? 'Hake ab, was du schon hast.' : 'Alles abgehakt.'}</p>
      ${bar(Math.round(have / live.length * 100), 'ok')}
      <div class="row spread" style="margin-top:8px"><span class="bold">${have} von ${live.length} vorhanden</span>${miss ? h`<a class="badge must" href="#/shop" style="text-decoration:none">${miss} ${miss === 1 ? "fehlt" : "fehlen"}</a>` : ''}</div>
      ${open ? h`<button class="btn block" style="margin-top:12px" data-act="ask-start">${icon('chev')} Einzeln abfragen (${open} offen)</button>` : ''}</div>
    ${[...groups.entries()].map(([k, g]) => { const left = g.items.filter(i => i.status !== 'owned').length; return h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>${g.label} <span class="badge">${g.items.length - left}/${g.items.length}</span></h3>${left ? h`<button class="btn sm" data-act="rv-group-have" data-group="${k}">${icon('check')} Alle</button>` : ''}</div><div class="list">${g.items.map(it => tickRow(it))}</div></div>`; })}
    <div class="actionbar">${open + miss ? h`<button class="btn primary lg" data-act="rv-done">${icon('check')} Fertig</button>` : h`<a class="btn primary lg" href="#/bags">${icon('bag')} Taschen packen</a>`}</div>`,
  };
});
function tickRow(it) {
  const own = it.status === 'owned'; const mark = own ? 'done' : it.prio === 'must' ? 'must' : it.prio === 'rec' ? 'rec' : '';
  return h`<div class="li tick ${mark}"><label class="tickl grow"><input type="checkbox" data-change="rv-tick" data-id="${it.id}" ${own ? raw('checked') : ''} aria-label="${it.name} vorhanden"><span class="grow"><span class="t">${it.name}</span><br><span class="s">${itemQtyLabel(it)} · ${levelBadge(it.prio)}${it.status === 'missing' ? h` <span class="badge must">fehlt</span>` : ''}</span></span></label>
    <a class="btn icon ghost sm" href="#/item/${it.id}" aria-label="Details zu ${it.name}">${icon('chev')}</a></div>`;
}
INPUT['rv-tick'] = el => { const H = HH(); const it = byId(H.items, el.dataset.id); if (!it) return; if (el.checked) setItemStatus(H, it, 'owned'); else { setItemStatus(H, it, 'planned'); H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); } persist(); rerender(true); };
ACT['rv-done'] = async () => {
  const H = HH(); const open = H.items.filter(i => !i.archived && i.status === 'planned');
  if (open.length) {
    const ok = await confirmDlg(`${open.length} nicht abgehakt`, 'Diese Sachen als „fehlt“ auf die Einkaufsliste setzen?', { ok: 'Auf die Einkaufsliste' });
    if (!ok) return; open.forEach(i => setItemStatus(H, i, 'missing')); persist();
  }
  go('#/shop');
};

/* Einzeln abfragen: eine Frage pro Gegenstand, wichtigste zuerst */
const ASK = { skip: new Set(), yes: 0, no: 0 };
route('/review/ask', H => {
  const open = H.items.filter(i => !i.archived && i.status === 'planned' && !ASK.skip.has(i.id)).sort((a, b) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || groupInfo(H, a)[1].localeCompare(groupInfo(H, b)[1], 'de') || a.name.localeCompare(b.name, 'de'));
  if (!open.length) {
    const miss = H.items.filter(i => !i.archived && i.status === 'missing').length;
    return { title: 'Abfragen', back: '#/review', html: h`<div class="card"><h2>Fertig</h2><p style="margin-top:8px">${ASK.yes} vorhanden · ${ASK.no} ${ASK.no === 1 ? "fehlt" : "fehlen"}${ASK.skip.size ? ` · ${ASK.skip.size} übersprungen` : ''}</p></div>
      <div class="actionbar"><a class="btn lg" href="#/review">Zur Liste</a>${miss ? h`<a class="btn primary lg" href="#/shop">${icon('cart')} Einkaufsliste</a>` : h`<a class="btn primary lg" href="#/bags">${icon('bag')} Taschen packen</a>`}</div>` };
  }
  const it = open[0];
  return {
    title: 'Abfragen', back: '#/review',
    html: h`<div class="row spread"><span class="muted small">${groupInfo(H, it)[1]}</span><span class="muted small mono">noch ${open.length}</span></div>
      <div class="card"><p class="muted">Hast du das?</p><h1 class="q" style="margin:6px 0">${it.name}</h1><p class="bold">${itemQtyLabel(it)} · ${levelBadge(it.prio)}</p>${it.why ? h`<p class="muted small" style="margin-top:8px">${it.why}</p>` : ''}</div>
      <button class="btn ghost block" data-act="ask-skip" data-id="${it.id}">Später</button>
      <div class="actionbar"><button class="btn danger lg" data-act="ask-no" data-id="${it.id}">${icon('cart')} Fehlt</button><button class="btn primary lg" data-act="ask-yes" data-id="${it.id}">${icon('check')} Habe ich</button></div>`,
  };
});
ACT['ask-start'] = () => { ASK.skip.clear(); ASK.yes = 0; ASK.no = 0; go('#/review/ask'); };
ACT['ask-yes'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'owned'); ASK.yes++; persist(); rerender(); };
ACT['ask-no'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'missing'); ASK.no++; persist(); rerender(); };
ACT['ask-skip'] = d => { ASK.skip.add(d.id); rerender(); };

function reviewRow(H, it) {
  const mark = it.prio === 'must' ? 'must' : it.prio === 'rec' ? 'rec' : '';
  return h`<div class="li ${mark}" style="flex-wrap:wrap;align-items:flex-start"><div class="grow" style="min-width:12rem"><a class="t" href="#/item/${it.id}" style="color:inherit;text-decoration:none">${it.name}</a>
    <div class="s">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) : ''} · ${levelBadge(it.prio)}</div>
    ${it.why ? h`<details class="small muted" style="margin-top:4px"><summary style="cursor:pointer;min-height:32px;display:flex;align-items:center">Warum?</summary><p>${it.why}</p></details>` : ''}</div>
    <div class="btns">${it.status !== 'owned' ? h`<button class="btn sm ok" data-act="rv-have" data-id="${it.id}">${icon('check')} Habe ich</button>` : ''}${it.status !== 'missing' ? h`<button class="btn sm danger" data-act="rv-miss" data-id="${it.id}">${icon('cart')} Fehlt</button>` : ''}${it.status !== 'planned' ? h`<button class="btn sm ghost" data-act="rv-undo" data-id="${it.id}">Zurück zu „Zu prüfen“</button>` : ''}</div></div>`;
}
ACT['rv-tab'] = d => { REV.tab = d.tab; rerender(); };
ACT['rv-prio'] = d => { REV.prio = d.prio; rerender(); };
ACT['rv-have'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'owned'); persist(); rerender(); };
ACT['rv-miss'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'missing'); persist(); rerender(); };
ACT['rv-undo'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'planned'); H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); persist(); rerender(); };
ACT['rv-group-have'] = async d => {
  const H = HH(); const items = H.items.filter(i => !i.archived && i.status !== 'owned' && groupInfo(H, i)[0] === d.group);
  if (!items.length) return;
  const ok = await confirmDlg(`Alle ${items.length} abhaken?`, 'Du hast alles aus dieser Gruppe.', { ok: 'Ja, alle abhaken' });
  if (!ok) return; items.forEach(i => setItemStatus(H, i, 'owned')); persist(); rerender();
};

/* ---------- Inventar ---------- */
const INV = { q: '', cat: '', status: '', loc: '', archived: false };
function inventoryList(H) {
  const q = norm(INV.q);
  return H.items.filter(i => (INV.archived ? i.archived : !i.archived) && (!INV.cat || i.category === INV.cat) && (!INV.status || i.status === INV.status) && (!INV.loc || i.container === INV.loc) && (!q || norm(i.name + ' ' + i.notes + ' ' + i.desc + ' ' + i.place).includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
function invRows(H, list) {
  if (!list.length) return [empty('Keine Gegenstände gefunden.')];
  return list.slice(0, 300).map(it => h`<a class="li ${it.status === 'missing' ? 'must' : it.status === 'planned' ? 'rec' : ''}" href="#/item/${it.id}">${thumb(it.photos[0])}<span class="grow"><span class="t">${it.name}</span><br><span class="s">${itemQtyLabel(it)} · ${whereOf(H, it)}${it.expiry ? ' · bis ' + fmtDate(it.expiry) : ''}</span></span>${statusBadge(it)}${icon('chev', 'chev')}</a>`).concat(list.length > 300 ? [h`<div class="empty small">Es werden die ersten 300 von ${list.length} angezeigt. Nutze die Suche.</div>`] : []);
}
route('/items', H => {
  const list = inventoryList(H);
  return {
    title: 'Alle Gegenstände', back: '#/more', actions: h`<button class="btn primary sm" data-act="item-new">${icon('plus')}<span>Neu</span></button>`,
    html: h`<div class="card"><div class="stack"><div class="field"><label for="invq">Suchen</label><input id="invq" type="search" value="${INV.q}" data-input="inv-q" placeholder="Name, Notiz, Ort …"></div>
      <div class="form-grid">${F.select('cat', 'Kategorie', [['', 'Alle Kategorien'], ...CATEGORIES], INV.cat, { attrs: { 'data-change': 'inv-f' } })}
      ${F.select('status', 'Status', [['', 'Alle'], ['owned', 'Vorhanden'], ['planned', 'Zu prüfen'], ['missing', 'Fehlt']], INV.status, { attrs: { 'data-change': 'inv-f' } })}
      ${F.select('loc', 'Ort', [['', 'Überall'], ['bag', 'Im Rucksack'], ['home', 'Zuhause'], ['car', 'Auto']], INV.loc, { attrs: { 'data-change': 'inv-f' } })}</div>
      ${F.check('archived', 'Archivierte anzeigen', INV.archived, { attrs: { 'data-change': 'inv-f' } })}</div></div>
    <div class="card flush"><div class="list" id="invlist">${invRows(H, list)}</div></div>`,
  };
});
INPUT['inv-q'] = el => { INV.q = el.value; const H = HH(); $('#invlist').innerHTML = invRows(H, inventoryList(H)).map(x => x.s !== undefined ? x.s : x).join(''); hydratePhotos($('#invlist')); };
INPUT['inv-f'] = el => { if (el.name === 'archived') INV.archived = el.checked; else INV[el.name === 'cat' ? 'cat' : el.name] = el.value; rerender(); };

/* ---------- Neuer Gegenstand: Vorlagenauswahl ---------- */
ACT['item-new'] = (d) => {
  const ctxInfo = d || {};
  const m = openModal({
    title: 'Gegenstand hinzufügen', wide: true,
    body: h`<div class="field"><label for="tq">Vorlage suchen</label><input id="tq" type="search" data-input="tpl-q" placeholder="z. B. Taschenlampe, Schlafsack …" data-nofocus></div><div class="list card flush" id="tpllist" style="max-height:50vh;overflow:auto"></div>`,
    foot: dlgButtons([{ label: 'Leerer Gegenstand', act: 'tpl-blank' }]),
  });
  UI.tplCtx = ctxInfo; UI.tplModal = m; renderTplList('');
  m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'tpl-pick') { closeModal(m); openItemForm(null, { key: a.dataset.key, ...ctxInfo }); } else if (a.dataset.act === 'tpl-blank') { closeModal(m); openItemForm(null, { ...ctxInfo }); } });
};
function renderTplList(q) {
  const s = norm(q); const keys = Object.keys(T).filter(k => !s || norm(T[k].n + ' ' + T[k].c).includes(s)).slice(0, 40);
  const box = $('#tpllist'); if (!box) return;
  box.innerHTML = keys.length ? keys.map(k => `<button class="li" data-act="tpl-pick" data-key="${esc(k)}" type="button"><span class="grow"><span class="t">${esc(T[k].n)}</span><br><span class="s">${esc(T[k].c)}</span></span></button>`).join('') : '<div class="empty small">Keine Vorlage – nutze „Leerer Gegenstand“.</div>';
}
INPUT['tpl-q'] = el => renderTplList(el.value);

/* ---------- Gegenstandsformular (Dialog fuer neu, Seite fuer Details) ---------- */
function itemFields(H, it) {
  const bagOpts = [['', '– keine Tasche –'], ...H.bags.map(b => [b.id, b.name])];
  const bag = byId(H.bags, it.bagId);
  const compOpts = [['', '– automatisch –'], ...((bag && bag.comps) || []).map(c => [c.id, c.name])];
  const people = [['', '– gemeinsam –'], ...H.people.map(p => [p.id, p.name]), ...H.pets.map(p => ['pet:' + p.id, 'Tier: ' + p.species + (p.name ? ' ' + p.name : '')])];
  const unitOpts = UNITS.includes(it.unit) ? UNITS : [...UNITS, it.unit];
  return h`<div class="stack">
    ${F.text('name', 'Name', it.name, { req: true, max: 120 })}
    <div class="form-grid">${F.num('qty', 'Menge', it.qty, { req: true })}${F.select('unit', 'Einheit', unitOpts, it.unit)}${F.select('status', 'Status', [['owned', 'Vorhanden'], ['planned', 'Offen'], ['missing', 'Fehlt']], it.status)}</div>
    <div class="form-grid">${F.select('bagId', 'Tasche', bagOpts, it.bagId || '')}${F.select('compId', 'Fach', compOpts, it.compId || '')}</div>
    ${F.check('lastMinute', 'Erst bei Abreise einpacken', it.lastMinute, { desc: 'Für Dinge im täglichen Gebrauch, z. B. Medikamente' })}
    <div class="form-grid">${F.num('weightG', 'Gewicht je Stück (g)', it.weightG || '')}${F.date('expiry', 'Datum', it.expiry)}${F.select('expiryType', 'Art des Datums', EXP_TYPES, it.expiryType || '')}</div>
    ${F.area('notes', 'Notiz', it.notes, { rows: 3 })}
    <details><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer">Weitere Angaben</summary><div class="stack" style="margin-top:8px">
      ${F.area('desc', 'Beschreibung', it.desc, { rows: 2 })}
      <div class="form-grid">${F.select('category', 'Kategorie', CATEGORIES, it.category)}${F.select('who', 'Für', people, it.petId ? 'pet:' + it.petId : it.personId || '')}${F.select('prio', 'Wichtigkeit', [['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional']], it.prio)}${F.select('container', 'Ort', [['bag', 'In einer Tasche'], ['home', 'Zuhause / Kiste'], ['car', 'Auto']], it.container)}${F.text('place', 'Lagerort', it.place, { max: 80 })}</div>
      <div class="form-grid">${F.num('volL', 'Packvolumen je Stück (Liter)', it.volL || '')}${F.num('liters', 'Wasser je Stück (Liter)', it.liters || '')}${F.num('kcal', 'Energie je Stück (kcal)', it.kcal || '')}${F.num('remindDays', 'Kontrolle alle … Tage', it.remindDays || '')}${F.num('minQty', 'Mindestmenge', it.minQty || '')}</div>
      <div class="form-grid">${F.date('purchaseDate', 'Kaufdatum', it.purchaseDate)}${F.select('condition', 'Zustand', [['', '–'], ...CONDITIONS], it.condition)}${F.num('price', 'Preis (€)', it.price ?? '')}${F.text('barcode', 'Barcode', it.barcode, { mode: 'numeric', max: 20 })}</div>
      ${F.text('manualUrl', 'Anleitung (Link/Hinweis)', it.manualUrl || '')}</div></details>
    ${it.why ? h`<details class="small muted"><summary style="min-height:36px;display:flex;align-items:center;cursor:pointer">Warum vorgeschlagen?</summary><p>${it.why}</p></details>` : ''}
  </div>`;
}
function applyItemForm(H, it, fd) {
  const name = (fd.get('name') || '').trim(); if (!name) throw new Error('Bitte einen Namen eintragen.');
  const qty = num(fd.get('qty'), 1); if (qty < 0) throw new Error('Die Anzahl darf nicht negativ sein.');
  const oldStatus = it.status;
  Object.assign(it, { name, desc: fd.get('desc') || '', category: fd.get('category'), qty, unit: fd.get('unit'), weightG: num(fd.get('weightG')), volL: num(fd.get('volL')), liters: num(fd.get('liters')), kcal: num(fd.get('kcal')), container: fd.get('container'), place: (fd.get('place') || '').trim(), purchaseDate: fd.get('purchaseDate') || '', expiry: fd.get('expiry') || '', condition: fd.get('condition') || '', price: fd.get('price') === '' || fd.get('price') === null ? null : num(fd.get('price')), minQty: num(fd.get('minQty')), remindDays: num(fd.get('remindDays')), barcode: (fd.get('barcode') || '').trim(), prio: fd.get('prio'), manualUrl: (fd.get('manualUrl') || '').trim(), notes: fd.get('notes') || '' });
  const who = fd.get('who') || ''; it.personId = who && !who.startsWith('pet:') ? who : null; it.petId = who.startsWith('pet:') ? who.slice(4) : null;
  it.lastMinute = fdBool(fd, 'lastMinute'); it.expiryType = fd.get('expiryType') || '';
  if (fd.get('bagId')) { it.container = 'bag'; it.bagId = fd.get('bagId'); it.compId = fd.get('compId') || null; }
  else { if (it.container === 'bag') it.container = 'home'; it.bagId = null; it.compId = null; }
  if (it.expiry) it.tags = Array.from(new Set([...(it.tags || []), 'expiring']));
  if (it.category === 'Wasser' && it.liters > 0) it.tags = Array.from(new Set([...(it.tags || []), 'water_supply']));
  if (it.category === 'Lebensmittel' && it.kcal > 0) it.tags = Array.from(new Set([...(it.tags || []), 'food']));
  if (!it.tags || !it.tags.length || it.source === 'manual') it.tags = Array.from(new Set([...(it.tags || []), ...inferTags(name)]));
  if (fd.get('status') !== oldStatus) setItemStatus(H, it, fd.get('status')); else if (it.status === 'missing') { const s = H.shop.find(x => x.itemId === it.id && !x.bought); if (s) { s.name = it.name; s.qty = it.qty; s.unit = it.unit; } }
  it.edited = true;
  if (it.container === 'bag' && it.bagId && !it.compId) { const b = byId(H.bags, it.bagId); if (b) autoPack(H, b, { onlyUnassigned: true }); }
}
function openItemForm(id, preset) {
  const H = HH(); const isNew = !id;
  let it;
  if (isNew) {
    const t = preset && preset.key ? T[preset.key] : null;
    it = newItemDefaults(t ? makeItem({ key: preset.key, qty: preset.qty || 1, container: preset.container || (t.z === 'home' ? 'home' : 'home') }, { status: 'owned', source: 'manual' }) : { source: 'manual' });
    if (preset && !preset.bagId && HH().bags.length === 1 && preset.container !== 'home') { it.container = 'bag'; it.bagId = HH().bags[0].id; }
    if (preset) { if (preset.container) it.container = preset.container; if (preset.bagId) { it.container = 'bag'; it.bagId = preset.bagId; } if (preset.compId) it.compId = preset.compId; if (preset.barcode) it.barcode = preset.barcode; if (preset.name) it.name = preset.name; if (preset.personId) it.personId = preset.personId; if (preset.petId) it.petId = preset.petId; if (preset.status) it.status = preset.status; }
    if (!it.id) it.id = uid(); it.why = ''; it.prio = it.prio || 'rec';
  } else it = byId(H.items, id);
  formDlg({ title: isNew ? 'Neuer Gegenstand' : 'Gegenstand bearbeiten', wide: true, body: itemFields(H, it), ok: 'Speichern',
    onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { applyItemForm(H, it, fd); if (isNew) { if (it.status === 'owned' && it.key) { /* ok */ } H.items.push(it); if (it.status === 'missing') ensureShopEntry(H, it); if (it.container === 'bag' && it.bagId && !it.compId) { const b = byId(H.bags, it.bagId); if (b) autoPack(H, b, { onlyUnassigned: true }); } } persist(); rerender(true); } });
}
function bindItemBag(root) {
  const H = HH(); const bagSel = $('[name=bagId]', root), compSel = $('[name=compId]', root);
  if (!bagSel || !compSel) return;
  bagSel.addEventListener('change', () => { const b = byId(H.bags, bagSel.value); compSel.innerHTML = '<option value="">– kein Fach –</option>' + ((b && b.comps) || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''); if (bagSel.value) { const cont = $('[name=container]', root); if (cont) cont.value = 'bag'; } });
}

/* ---------- Detailseite ---------- */
route('/item/:id', (id, H) => {
  const it = byId(H.items, id);
  if (!it) return { title: 'Gegenstand', back: '#/items', html: empty('Gegenstand nicht gefunden.') };
  const dl = it.expiry ? daysUntil(it.expiry) : null;
  return {
    title: it.name, back: it.container === 'bag' && it.bagId ? '#/bags/' + it.bagId : '#/items',
    html: h`<div class="card"><div class="row spread">${statusBadge(it)}${levelBadge(it.prio)}${it.archived ? h`<span class="badge">Archiviert</span>` : ''}${dl !== null && dl <= (DB.settings.notif.leadDays || 30) ? h`<span class="badge ${dl < 0 ? 'must' : 'rec'}">${dl < 0 ? 'Abgelaufen' : 'Läuft ' + relDays(it.expiry) + ' ab'}</span>` : ''}</div>
      <p class="muted" style="margin-top:8px">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) + ' gesamt' : ''} · ${whereOf(H, it)}</p>
      <div class="btns" style="margin-top:8px">${it.status === 'owned' && it.container === 'bag' ? h`<button class="btn ${it.packed ? 'ok' : ''}" data-act="item-pack" data-id="${it.id}">${icon('check')} ${it.packed ? 'Gepackt' : 'Als gepackt markieren'}</button>` : ''}
        ${it.status !== 'owned' ? h`<button class="btn ok" data-act="rv-have" data-id="${it.id}">${icon('check')} Habe ich</button>` : ''}${it.status !== 'missing' ? h`<button class="btn danger" data-act="rv-miss" data-id="${it.id}">${icon('cart')} Fehlt</button>` : ''}${it.remindDays > 0 && it.status === 'owned' ? h`<button class="btn" data-act="item-checked" data-id="${it.id}">${icon('clock')} Kontrolle erledigt (nächste ${fmtDate(itemRemindNext(it))})</button>` : ''}</div></div>
    <div class="card"><h3>Fotos</h3>${photoStrip(it.photos, 'item-ph-del', { id: it.id })}<div class="btns" style="margin-top:8px"><button class="btn" data-act="item-ph-add" data-id="${it.id}" data-kind="photos">${icon('camera')} Foto hinzufügen</button></div></div>
    <form class="card" id="itemform" data-form="item-save" data-id="${it.id}">${itemFields(H, it)}
      <div class="btns" style="margin-top:16px"><button class="btn primary" type="submit">${icon('check')} Speichern</button></div></form>
    ${(it.receipts || []).length || (it.manuals || []).length ? h`    <div class="card"><h3>Kaufbeleg und Anleitung</h3><div class="stack-s"><div class="label">Kaufbelege</div>${photoStrip(it.receipts, 'item-ph-del', { id: it.id, kind: 'receipts' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="receipts">${icon('camera')} Beleg fotografieren</button>
      <div class="label" style="margin-top:8px">Anleitung (Fotos/Scans)</div>${photoStrip(it.manuals, 'item-ph-del', { id: it.id, kind: 'manuals' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="manuals">${icon('camera')} Seite fotografieren</button></div></div>` : ''}
    <div class="btns"><button class="btn" data-act="item-dup" data-id="${it.id}">${icon('copy')} Duplizieren</button><button class="btn" data-act="item-move" data-id="${it.id}">${icon('move')} Verschieben</button><button class="btn" data-act="item-arch" data-id="${it.id}">${icon('archive')} ${it.archived ? 'Wiederherstellen' : 'Archivieren'}</button><button class="btn danger" data-act="item-del" data-id="${it.id}">${icon('trash')} Löschen</button></div>`,
    after: () => bindItemBag($('#itemform')),
  };
});
FORM['item-save'] = (fd, f) => { const H = HH(); const it = byId(H.items, f.dataset.id); applyItemForm(H, it, fd); persist(); rerender(); toast('Gespeichert'); };
function saveFormSilently() { const f = $('#itemform'); if (!f) return; const H = HH(); const it = byId(H.items, f.dataset.id); try { applyItemForm(H, it, new FormData(f)); persist(); } catch (e) { /* unvollstaendig: ignorieren */ } }
ACT['item-pack'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; it.packed = !it.packed; persist(); rerender(); };
ACT['item-ph-add'] = async d => { saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const pid = await addPhotoTo(null); if (!pid) return; const k = d.kind || 'photos'; it[k] = it[k] || []; it[k].push(pid); persist(); rerender(true); };
ACT['item-ph-del'] = async d => { const ok = await confirmDlg('Foto entfernen?', 'Das Foto wird gelöscht.', { ok: 'Entfernen', danger: true }); if (!ok) return; saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const k = d.kind || 'photos'; it[k] = (it[k] || []).filter(x => x !== d.pid); persist(); setTimeout(sweepPhotos, 300); rerender(true); };
ACT['item-dup'] = d => { const H = HH(); const it = byId(H.items, d.id); const c = clone(it); c.id = uid(); c.name = it.name + ' (Kopie)'; c.packed = false; c.source = 'manual'; H.items.push(c); if (c.status === 'missing') ensureShopEntry(H, c); persist(); go('#/item/' + c.id); };
ACT['item-arch'] = d => { const H = HH(); const it = byId(H.items, d.id); it.archived = !it.archived; if (it.archived) H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); persist(); rerender(); };
ACT['item-del'] = async d => { const ok = await confirmDlg('Gegenstand löschen?', 'Fotos werden mit gelöscht.', { ok: 'Löschen', danger: true }); if (!ok) return; removeItem(HH(), d.id); persist(); history.length > 1 ? history.back() : go('#/home'); };
ACT['item-move'] = d => {
  const H = HH(); const it = byId(H.items, d.id);
  formDlg({ title: 'Verschieben', body: h`${F.select('container', 'Ziel', [['home', 'Zuhause'], ['bag', 'In einen Rucksack'], ['car', 'Auto']], it.container)}${F.select('bagId', 'Rucksack', [['', '–'], ...H.bags.map(b => [b.id, b.name])], it.bagId || '')}${F.select('compId', 'Fach', [['', '– automatisch –'], ...(((byId(H.bags, it.bagId) || {}).comps) || []).map(c => [c.id, c.name])], it.compId || '')}${F.text('place', 'Lagerort (Zuhause)', it.place)}`, ok: 'Verschieben', onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { it.container = fd.get('container'); if (it.container === 'bag') { it.bagId = fd.get('bagId') || null; if (!it.bagId) throw new Error('Bitte einen Rucksack wählen.'); it.compId = fd.get('compId') || null; if (!it.compId) autoPack(H, byId(H.bags, it.bagId), { onlyUnassigned: true }); } else { it.bagId = null; it.compId = null; it.place = fd.get('place') || it.place; } it.packed = false; persist(); rerender(); } });
};

/* ---------- Optionale Notfallkiste zu Hause ---------- */
route('/stock', H => {
  const S = DB.settings;
  if (!H.box.enabled) return { title: 'Notfallkiste zu Hause', back: '#/more', html: h`${empty('Optional: eine Kiste mit Wasser, Essen, Batterien und Hygiene für zu Hause.')}<div class="actionbar"><button class="btn primary lg" data-act="box-on">${icon('plus')} Kiste anlegen</button></div>` };
  const sup = calcSupplies(H, S);
  const home = H.items.filter(i => !i.archived && i.container === 'home');
  const owned = home.filter(i => i.status === 'owned').sort((a, b) => norm(a.name).localeCompare(norm(b.name)) || (a.expiry || '9').localeCompare(b.expiry || '9'));
  const firsts = fifoFirsts(owned); const todo = home.filter(i => i.status !== 'owned').sort((a, b) => ({ must: 0, rec: 1, opt: 2 }[a.prio] - { must: 0, rec: 1, opt: 2 }[b.prio]));
  return {
    title: 'Notfallkiste zu Hause', back: '#/more',
    html: h`<div class="card"><div class="row spread"><span class="bold">${icon('drop')} ${fmt(sup.waterL)} l Wasser</span><span class="muted">ca. ${fmt(sup.waterDays)} Tage</span></div><div class="row spread" style="margin-top:6px"><span class="bold">${icon('food')} Essen</span><span class="muted">ca. ${fmt(sup.foodDays)} Tage</span></div><p class="muted small" style="margin-top:6px">Schätzung für ${sup.calc.n} ${plural(sup.calc.n, 'Person', 'Personen')}, Ziel ${H.box.days} Tage.</p></div>
    ${owned.length ? h`<div class="card flush"><div class="list">${owned.map(i => stockRow(i, firsts.has(i.id)))}</div></div>` : ''}
    ${todo.length ? h`<h2>Offen</h2><div class="card flush"><div class="list">${todo.map(i => reviewRow(H, i))}</div></div>` : ''}
    <div class="btns"><button class="btn" data-act="box-days">${icon('edit')} Ziel: ${H.box.days} Tage</button><button class="btn danger" data-act="box-off">Kiste auflösen</button></div>
    <div class="actionbar"><button class="btn primary lg" data-act="stock-new">${icon('plus')} Gegenstand</button></div>`,
  };
});
const EXP_TYPES = [['', 'Haltbar bis'], ['mhd', 'Mindesthaltbarkeit (MHD)'], ['use', 'Verbrauchsdatum']];
/* Ablaufstatus: MHD ist kein Verfallsdatum – abgelaufene Ware nicht pauschal als verdorben werten */
function expiryState(i) {
  const dl = i.expiry ? daysUntil(i.expiry) : null; if (dl === null) return null;
  if (dl < 0) return i.expiryType === 'mhd' ? { cls: 'rec', label: 'MHD überschritten – prüfen' } : i.expiryType === 'use' ? { cls: 'must', label: 'Verbrauchsdatum überschritten' } : { cls: 'must', label: 'Abgelaufen' };
  if (dl <= 30) return { cls: 'rec', label: relDays(i.expiry) };
  return null;
}
/* Pro gleichem Namen: aelteste Charge zuerst verbrauchen */
function fifoFirsts(list) { const seen = new Map(); for (const i of list) { const k = norm(i.name); if (!seen.has(k)) seen.set(k, []); seen.get(k).push(i); } const out = new Set(); for (const g of seen.values()) if (g.length > 1) { const s = g.filter(i => i.expiry).sort((a, b) => a.expiry.localeCompare(b.expiry)); if (s[0]) out.add(s[0].id); } return out; }
function stockRow(i, first) {
  const ex = expiryState(i);
  return h`<div class="li ${ex ? ex.cls : ''}"><a class="grow" href="#/item/${i.id}" style="color:inherit;text-decoration:none"><span class="t">${i.name}</span><br><span class="s">${[i.unit, i.expiry ? (i.expiryType === 'mhd' ? 'MHD ' : i.expiryType === 'use' ? 'verbrauchen bis ' : 'bis ') + fmtDate(i.expiry) : ''].filter(Boolean).join(' · ')}</span>
    ${ex || first ? h`<span class="row" style="margin-top:4px">${first ? h`<span class="badge info">Zuerst verbrauchen</span>` : ''}${ex ? h`<span class="badge ${ex.cls}">${ex.label}</span>` : ''}</span>` : ''}</a>
    <div class="stepper"><button type="button" data-act="st-adj" data-id="${i.id}" data-d="-1" aria-label="weniger">−</button><span>${fmt(i.qty)}</span><button type="button" data-act="st-adj" data-id="${i.id}" data-d="1" aria-label="mehr">+</button></div></div>`;
}
ACT['stock-new'] = () => ACT['item-new']({ container: 'home' });
ACT['st-adj'] = d => { const it = byId(HH().items, d.id); if (!it) return; it.qty = Math.max(0, +(it.qty + (+d.d)).toFixed(2)); persist(); rerender(true); };
ACT['box-on'] = async () => {
  const H = HH(); const v = await promptDlg('Kiste anlegen', 'Für wie viele Tage?', '3', { type: 'number', ok: 'Anlegen' }); if (v === null) return;
  H.box = { enabled: true, days: clamp(Math.round(num(v, 3)), 1, 30) }; if (!H.cfg) H.cfg = { goals: [], strategies: ['shelter'], boxOnly: true, country: 'DE', housing: {}, durationHours: 72 };
  if (H.people.length) applyPlan(H, DB.settings); persist(); rerender();
};
ACT['box-days'] = async () => { const H = HH(); const v = await promptDlg('Ziel ändern', 'Tage', String(H.box.days), { type: 'number' }); if (v === null) return; H.box.days = clamp(Math.round(num(v, 3)), 1, 30); if (H.people.length) applyPlan(H, DB.settings); persist(); rerender(true); };
ACT['box-off'] = async () => { const ok = await confirmDlg('Kiste auflösen?', 'Die Gegenstände bleiben unter „Alle Gegenstände“ erhalten.', { ok: 'Auflösen' }); if (!ok) return; HH().box.enabled = false; persist(); rerender(); };
