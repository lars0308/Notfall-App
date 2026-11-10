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
route('/review', H => {
  const live = H.items.filter(i => !i.archived);
  const cnt = { check: live.filter(i => i.status === 'planned').length, missing: live.filter(i => i.status === 'missing').length, owned: live.filter(i => i.status === 'owned').length };
  const status = REV.tab === 'check' ? 'planned' : REV.tab;
  let list = live.filter(i => i.status === status && (REV.prio === 'all' || i.prio === REV.prio));
  const groups = new Map();
  for (const it of list) { const [k, label] = groupInfo(H, it); if (!groups.has(k)) groups.set(k, { label, items: [] }); groups.get(k).items.push(it); }
  const order = { must: 0, rec: 1, opt: 2 };
  for (const g of groups.values()) g.items.sort((a, b) => order[a.prio] - order[b.prio] || a.name.localeCompare(b.name));
  return {
    title: 'Ausrüstung prüfen', back: '#/more',
    html: h`<p class="muted">Gehe die Liste durch: Hast du den Gegenstand bereits, tippe <b>Habe ich</b>. Fehlt er, tippe <b>Fehlt</b> – er landet automatisch in der Einkaufsliste.</p>
    <div class="tabs" role="tablist">${[['check', 'Zu prüfen'], ['missing', 'Fehlt'], ['owned', 'Vorhanden']].map(([k, l]) => h`<button role="tab" aria-selected="${REV.tab === k}" data-act="rv-tab" data-tab="${k}">${l} (${cnt[k]})</button>`)}</div>
    <div class="chips">${[['all', 'Alle'], ['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional']].map(([k, l]) => h`<button class="chip" aria-pressed="${REV.prio === k}" data-act="rv-prio" data-prio="${k}">${l}</button>`)}</div>
    ${reviewGroups(H, groups)}`,
  };
});

function reviewGroups(H, groups) {
  if (!groups.size) {
    if (REV.tab !== 'check') return empty('Keine Einträge.');
    return H.items.length ? noticeBox('ok', 'Alles geprüft', 'Es gibt keine ungeprüften Positionen in dieser Auswahl.') : empty('Noch keine Planung vorhanden.', h`<a class="btn primary" href="#/wizard">Einrichtung starten</a>`);
  }
  return [...groups.entries()].map(([k, g]) => {
    const bulk = REV.tab === 'check' ? h`<button class="btn sm" data-act="rv-group-have" data-group="${k}">${icon('check')} Alle vorhanden</button>` : '';
    return h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>${g.label} <span class="badge">${g.items.length}</span></h3>${bulk}</div><div class="list">${g.items.map(it => reviewRow(H, it))}</div></div>`;
  });
}
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
  const H = HH(); const items = H.items.filter(i => !i.archived && i.status === 'planned' && groupInfo(H, i)[0] === d.group && (REV.prio === 'all' || i.prio === REV.prio));
  if (!items.length) return;
  const ok = await confirmDlg('Alle als vorhanden markieren?', `${items.length} Positionen werden als „Habe ich“ bestätigt. Prüfe vorher, ob sie wirklich vorhanden sind – Fehlendes wird sonst nicht eingekauft.`, { ok: 'Ja, alle vorhanden' });
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
    title: 'Inventar', back: '#/more', actions: h`<button class="btn primary sm" data-act="item-new">${icon('plus')}<span>Neu</span></button>`,
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
  const bagOpts = [['', '– kein Rucksack –'], ...H.bags.map(b => [b.id, b.name])];
  const bag = byId(H.bags, it.bagId);
  const compOpts = [['', '– kein Fach –'], ...((bag && bag.comps) || []).map(c => [c.id, c.name])];
  const people = [['', '– niemand / gemeinsam –'], ...H.people.map(p => [p.id, p.name]), ...H.pets.map(p => ['pet:' + p.id, 'Tier: ' + p.species + (p.name ? ' ' + p.name : '')])];
  const unitOpts = UNITS.includes(it.unit) ? UNITS : [...UNITS, it.unit];
  return h`<div class="stack">
    ${F.text('name', 'Name', it.name, { req: true, max: 120 })}
    ${F.area('desc', 'Beschreibung', it.desc, { rows: 2 })}
    <div class="form-grid">${F.select('category', 'Kategorie', CATEGORIES, it.category)}${F.select('status', 'Status', [['owned', 'Vorhanden'], ['planned', 'Zu prüfen'], ['missing', 'Fehlt (auf Einkaufsliste)']], it.status)}</div>
    <div class="form-grid">${F.num('qty', 'Anzahl / Menge', it.qty, { req: true })}${F.select('unit', 'Einheit', unitOpts, it.unit)}</div>
    <div class="form-grid">${F.num('weightG', 'Gewicht pro Einheit (g)', it.weightG || '')}${F.num('volL', 'Volumen pro Einheit (Liter)', it.volL || '', { hint: 'Packvolumen für die Rucksack-Auslastung' })}
      ${F.num('liters', 'Wasser pro Einheit (Liter)', it.liters || '', { hint: 'Nur bei Getränken: z. B. 1,5' })}${F.num('kcal', 'Energie pro Einheit (kcal)', it.kcal || '', { hint: 'Nur bei Lebensmitteln, für die Reichweite' })}</div>
    <div class="form-grid">${F.select('container', 'Aufbewahrung', [['home', 'Zuhause'], ['bag', 'In einem Rucksack'], ['car', 'Im Auto']], it.container)}${F.text('place', 'Lagerort', it.place, { ph: 'z. B. Keller Regal 2', max: 80 })}
      ${F.select('bagId', 'Rucksack', bagOpts, it.bagId || '')}${F.select('compId', 'Fach', compOpts, it.compId || '')}</div>
    ${F.select('who', 'Gehört zu / für', people, it.petId ? 'pet:' + it.petId : it.personId || '')}
    <div class="form-grid">${F.date('purchaseDate', 'Kaufdatum', it.purchaseDate)}${F.date('expiry', 'Ablaufdatum', it.expiry)}${F.select('condition', 'Zustand', [['', 'Keine Angabe'], ...CONDITIONS], it.condition)}${F.num('price', 'Preis (€)', it.price ?? '')}</div>
    <div class="form-grid">${F.num('minQty', 'Mindestbestand', it.minQty || '', { hint: 'Warnung bei Unterschreitung' })}${F.num('remindDays', 'Erinnerung alle … Tage', it.remindDays || '', { hint: 'z. B. 90 für Prüfung' })}${F.text('barcode', 'Barcode (EAN)', it.barcode, { mode: 'numeric', max: 20 })}${F.select('prio', 'Wichtigkeit', [['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional']], it.prio)}</div>
    ${F.text('manualUrl', 'Bedienungsanleitung (Link oder Hinweis)', it.manualUrl || '', { ph: 'https://… oder „im Ordner Technik“' })}
    ${F.area('notes', 'Persönliche Notizen', it.notes, { rows: 4 })}
    ${it.why ? h`<div class="notice info">${icon('info')}<div><p class="nt">Warum wurde das vorgeschlagen?</p><p>${it.why}</p></div></div>` : ''}
  </div>`;
}
function applyItemForm(H, it, fd) {
  const name = (fd.get('name') || '').trim(); if (!name) throw new Error('Bitte einen Namen eintragen.');
  const qty = num(fd.get('qty'), 1); if (qty < 0) throw new Error('Die Anzahl darf nicht negativ sein.');
  const oldStatus = it.status;
  Object.assign(it, { name, desc: fd.get('desc') || '', category: fd.get('category'), qty, unit: fd.get('unit'), weightG: num(fd.get('weightG')), volL: num(fd.get('volL')), liters: num(fd.get('liters')), kcal: num(fd.get('kcal')), container: fd.get('container'), place: (fd.get('place') || '').trim(), purchaseDate: fd.get('purchaseDate') || '', expiry: fd.get('expiry') || '', condition: fd.get('condition') || '', price: fd.get('price') === '' || fd.get('price') === null ? null : num(fd.get('price')), minQty: num(fd.get('minQty')), remindDays: num(fd.get('remindDays')), barcode: (fd.get('barcode') || '').trim(), prio: fd.get('prio'), manualUrl: (fd.get('manualUrl') || '').trim(), notes: fd.get('notes') || '' });
  const who = fd.get('who') || ''; it.personId = who && !who.startsWith('pet:') ? who : null; it.petId = who.startsWith('pet:') ? who.slice(4) : null;
  if (it.container === 'bag') { it.bagId = fd.get('bagId') || null; if (!it.bagId) throw new Error('Bitte einen Rucksack wählen – oder „Aufbewahrung“ ändern.'); it.compId = fd.get('compId') || null; }
  else { it.bagId = null; it.compId = null; }
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
    if (preset) { if (preset.container) it.container = preset.container; if (preset.bagId) { it.container = 'bag'; it.bagId = preset.bagId; } if (preset.compId) it.compId = preset.compId; if (preset.barcode) it.barcode = preset.barcode; if (preset.name) it.name = preset.name; if (preset.personId) it.personId = preset.personId; if (preset.petId) it.petId = preset.petId; if (preset.status) it.status = preset.status; }
    if (!it.id) it.id = uid(); it.why = ''; it.prio = it.prio || 'rec';
  } else it = byId(H.items, id);
  formDlg({ title: isNew ? 'Neuer Gegenstand' : 'Gegenstand bearbeiten', wide: true, body: itemFields(H, it), ok: 'Speichern',
    onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { applyItemForm(H, it, fd); if (isNew) { if (it.status === 'owned' && it.key) { /* ok */ } H.items.push(it); if (it.status === 'missing') ensureShopEntry(H, it); } persist(); rerender(); toast('Gespeichert'); } });
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
    <div class="card"><h3>Kaufbeleg und Anleitung</h3><div class="stack-s"><div class="label">Kaufbelege</div>${photoStrip(it.receipts, 'item-ph-del', { id: it.id, kind: 'receipts' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="receipts">${icon('camera')} Beleg fotografieren</button>
      <div class="label" style="margin-top:8px">Anleitung (Fotos/Scans)</div>${photoStrip(it.manuals, 'item-ph-del', { id: it.id, kind: 'manuals' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="manuals">${icon('camera')} Seite fotografieren</button></div></div>
    <div class="card"><h3>Aktionen</h3><div class="btns"><button class="btn" data-act="item-dup" data-id="${it.id}">${icon('copy')} Duplizieren</button><button class="btn" data-act="item-move" data-id="${it.id}">${icon('move')} Verschieben</button><button class="btn" data-act="item-arch" data-id="${it.id}">${icon('archive')} ${it.archived ? 'Wiederherstellen' : 'Archivieren'}</button><button class="btn danger" data-act="item-del" data-id="${it.id}">${icon('trash')} Löschen</button></div></div>`,
    after: () => bindItemBag($('#itemform')),
  };
});
FORM['item-save'] = (fd, f) => { const H = HH(); const it = byId(H.items, f.dataset.id); applyItemForm(H, it, fd); persist(); rerender(); toast('Gespeichert'); };
function saveFormSilently() { const f = $('#itemform'); if (!f) return; const H = HH(); const it = byId(H.items, f.dataset.id); try { applyItemForm(H, it, new FormData(f)); persist(); } catch (e) { /* unvollstaendig: ignorieren */ } }
ACT['item-pack'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; it.packed = !it.packed; persist(); rerender(); };
ACT['item-ph-add'] = async d => { saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const pid = await addPhotoTo(null); if (!pid) return; const k = d.kind || 'photos'; it[k] = it[k] || []; it[k].push(pid); persist(); rerender(true); };
ACT['item-ph-del'] = async d => { const ok = await confirmDlg('Foto entfernen?', 'Das Foto wird gelöscht.', { ok: 'Entfernen', danger: true }); if (!ok) return; saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const k = d.kind || 'photos'; it[k] = (it[k] || []).filter(x => x !== d.pid); persist(); setTimeout(sweepPhotos, 300); rerender(true); };
ACT['item-dup'] = d => { const H = HH(); const it = byId(H.items, d.id); const c = clone(it); c.id = uid(); c.name = it.name + ' (Kopie)'; c.packed = false; c.source = 'manual'; H.items.push(c); if (c.status === 'missing') ensureShopEntry(H, c); persist(); go('#/item/' + c.id); toast('Dupliziert'); };
ACT['item-arch'] = d => { const H = HH(); const it = byId(H.items, d.id); it.archived = !it.archived; if (it.archived) H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); persist(); rerender(); };
ACT['item-del'] = async d => { const ok = await confirmDlg('Gegenstand löschen?', 'Der Gegenstand und seine Fotos werden endgültig gelöscht. Tipp: „Archivieren“ behält ihn im Hintergrund.', { ok: 'Löschen', danger: true }); if (!ok) return; removeItem(HH(), d.id); persist(); go('#/items'); };
ACT['item-move'] = d => {
  const H = HH(); const it = byId(H.items, d.id);
  formDlg({ title: 'Verschieben', body: h`${F.select('container', 'Ziel', [['home', 'Zuhause'], ['bag', 'In einen Rucksack'], ['car', 'Auto']], it.container)}${F.select('bagId', 'Rucksack', [['', '–'], ...H.bags.map(b => [b.id, b.name])], it.bagId || '')}${F.select('compId', 'Fach', [['', '– automatisch –'], ...(((byId(H.bags, it.bagId) || {}).comps) || []).map(c => [c.id, c.name])], it.compId || '')}${F.text('place', 'Lagerort (Zuhause)', it.place)}`, ok: 'Verschieben', onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { it.container = fd.get('container'); if (it.container === 'bag') { it.bagId = fd.get('bagId') || null; if (!it.bagId) throw new Error('Bitte einen Rucksack wählen.'); it.compId = fd.get('compId') || null; if (!it.compId) autoPack(H, byId(H.bags, it.bagId), { onlyUnassigned: true }); } else { it.bagId = null; it.compId = null; it.place = fd.get('place') || it.place; } it.packed = false; persist(); rerender(); toast('Verschoben'); } });
};

/* ---------- Barcode-Scanner (falls vom System unterstuetzt) ---------- */
const CAN_SCAN = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
function scanBarcode() {
  return new Promise(resolve => {
    let stream = null, stop = false, done = false; const fin = v => { if (done) return; done = true; stop = true; if (stream) stream.getTracks().forEach(t => t.stop()); resolve(v); };
    const m = openModal({ title: 'Barcode scannen', body: h`<video id="scanv" playsinline muted style="width:100%;border-radius:10px;background:#000;max-height:50vh"></video><p class="muted small">Halte den Barcode ruhig in den Bildausschnitt. Nichts wird übertragen.</p><div class="field"><label for="manb">Oder Nummer eintippen</label><input id="manb" inputmode="numeric" type="text" placeholder="EAN, z. B. 4012345678901"></div>`, foot: dlgButtons([{ label: 'Abbrechen', act: 'dlg-no' }, { label: 'Nummer übernehmen', cls: 'primary', act: 'scan-manual' }]), onClose: () => fin(null) });
    m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'dlg-no') closeModal(m); else if (a.dataset.act === 'scan-manual') { const v = ($('#manb', m.el).value || '').replace(/\D/g, ''); if (v.length < 6) { toast('Bitte eine gültige Nummer eintragen.'); return; } fin(v); closeModal(m); } });
    if (!CAN_SCAN) { $('#scanv', m.el).replaceWith(Object.assign(document.createElement('div'), { className: 'notice info', textContent: 'Kamera-Scan wird von diesem Gerät nicht unterstützt. Bitte die Nummer eintippen.' })); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(async s => {
      stream = s; const v = $('#scanv', m.el); if (!v) { fin(null); return; } v.srcObject = s; await v.play().catch(() => { });
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const loop = async () => { if (stop) return; try { const r = await det.detect(v); if (r && r[0] && r[0].rawValue) { fin(r[0].rawValue); closeModal(m); return; } } catch { /* weiter */ } setTimeout(loop, 250); };
      loop();
    }).catch(() => toast('Kein Kamerazugriff – Nummer bitte eintippen.'));
  });
}
async function scanAndFind() {
  const code = await scanBarcode(); if (!code) return; const H = HH();
  const hit = H.items.find(i => !i.archived && i.barcode === code);
  if (hit) { go('#/item/' + hit.id); toast('Gefunden: ' + hit.name); } else { toast('Neuer Barcode – Gegenstand anlegen'); openItemForm(null, { barcode: code, container: 'home' }); }
}
ACT['scan'] = () => scanAndFind();

/* ---------- Hausvorrat ---------- */
const STOCK_GROUPS = [['Wasser', ['Wasser']], ['Lebensmittel', ['Lebensmittel']], ['Medizin & Hygiene', ['Medizin', 'Hygiene']], ['Licht, Strom & Brennstoff', ['Licht & Strom', 'Kochen & Brennstoff', 'Kommunikation']], ['Sonstiges', null]];
route('/stock', H => {
  const S = DB.settings; const sup = calcSupplies(H, S); const ctx = sup.ctx;
  const home = H.items.filter(i => !i.archived && i.container === 'home');
  const owned = home.filter(i => i.status === 'owned'); const todo = home.filter(i => i.status !== 'owned');
  const known = new Set(STOCK_GROUPS.flatMap(g => g[1] || []));
  const grpOf = i => STOCK_GROUPS.find(g => g[1] && g[1].includes(i.category)) || STOCK_GROUPS[STOCK_GROUPS.length - 1];
  const byGroup = new Map(STOCK_GROUPS.map(g => [g[0], []])); for (const i of owned) byGroup.get(grpOf(i)[0]).push(i);
  void known;
  const low = owned.filter(i => i.minQty > 0 && i.qty < i.minQty);
  const days = ctx.homeDays || 7;
  return {
    title: 'Hausvorrat', back: '#/more', actions: h`<button class="btn primary sm" data-act="stock-new">${icon('plus')}<span>Neu</span></button>`,
    html: h`<div class="card"><h2>Reichweite</h2><p class="muted small">Schätzwerte für ${sup.calc.n} ${plural(sup.calc.n, 'Person', 'Personen')}${H.pets.length ? ' und ' + H.pets.length + ' Tier(e)' : ''}. Ziel: ${days} Tage${ctx.homeDays ? '' : ' (kein Hausvorrat in der Planung, Beispielwert)'}.</p>
      <div class="stack" style="margin-top:12px">
        <div><div class="row spread"><span class="bold">${icon('drop')} Trinkwasser</span><span class="mono bold">${fmt(sup.waterDays)} Tage</span></div>${bar(pct(sup.waterDays, days), sup.waterDays >= days ? 'ok' : sup.waterDays >= days / 2 ? 'rec' : 'must')}<div class="small muted">${fmt(sup.waterL)} l vorhanden von ${fmt(sup.perDayWater * days)} l Ziel · Bedarf ${fmt(sup.perDayWater)} l/Tag${sup.waterBagL ? ' · zusätzlich ' + fmt(sup.waterBagL) + ' l im Rucksack' : ''}</div></div>
        <div><div class="row spread"><span class="bold">${icon('food')} Lebensmittel</span><span class="mono bold">${fmt(sup.foodDays)} Tage</span></div>${bar(pct(sup.foodDays, days), sup.foodDays >= days ? 'ok' : sup.foodDays >= days / 2 ? 'rec' : 'must')}<div class="small muted">${fmt0(sup.kcal)} kcal vorhanden von ${fmt0(sup.calc.kcalDay * days)} kcal Ziel · Bedarf ${fmt0(sup.calc.kcalDay)} kcal/Tag${sup.noKcal ? ' · ' + sup.noKcal + ' Position(en) ohne kcal-Angabe zählen nicht mit' : ''}</div></div></div>
      <div class="btns" style="margin-top:12px"><a class="btn sm" href="#/settings">Bedarfswerte ändern</a><button class="btn sm" data-act="scan">${icon('scan')} Barcode scannen</button></div></div>
    ${low.length ? noticeBox('must', 'Mindestbestand unterschritten', low.map(i => i.name).join(', ')) : ''}
    ${stockGroups(byGroup)}
    ${todo.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>Fehlende / ungeprüfte Vorräte</h3><span class="badge rec">${todo.length}</span></div><div class="list">${todo.sort((a, b) => ({ must: 0, rec: 1, opt: 2 }[a.prio] - { must: 0, rec: 1, opt: 2 }[b.prio])).map(i => reviewRow(H, i))}</div></div>` : ''}`,
  };
});

function stockGroups(byGroup) {
  const out = [];
  for (const [name, items] of byGroup.entries()) {
    if (!items.length) continue;
    items.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    out.push(h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>${name}</h3><span class="badge">${items.length}</span></div><div class="list">${items.map(i => stockRow(i))}</div></div>`);
  }
  return out.length ? out : empty('Noch keine Vorräte bestätigt. Prüfe die Vorschläge unter „Fehlende Vorräte“ oder lege Vorräte neu an.');
}
function stockRow(i) {
  const dl = i.expiry ? daysUntil(i.expiry) : null; const low = i.minQty > 0 && i.qty < i.minQty;
  return h`<div class="li ${low ? 'must' : dl !== null && dl <= 30 ? 'rec' : ''}" style="flex-wrap:wrap"><a class="grow" href="#/item/${i.id}" style="color:inherit;text-decoration:none;min-width:11rem"><span class="t">${i.name}</span><br><span class="s">${i.place || 'Zuhause'}${i.expiry ? ' · bis ' + fmtDate(i.expiry) : ''}${i.minQty ? ' · Min ' + fmt(i.minQty) : ''}</span></a>
    ${low ? h`<span class="badge must">Zu wenig</span>` : ''}${dl !== null && dl <= 30 ? h`<span class="badge ${dl < 0 ? 'must' : 'rec'}">${dl < 0 ? 'Abgelaufen' : relDays(i.expiry)}</span>` : ''}
    <div class="stepper"><button type="button" data-act="st-adj" data-id="${i.id}" data-d="-1" aria-label="Eins weniger">−</button><span>${fmt(i.qty)}</span><button type="button" data-act="st-adj" data-id="${i.id}" data-d="1" aria-label="Eins mehr">+</button></div><span class="small muted" style="min-width:3.5rem">${i.unit}</span>
    <button class="btn sm" data-act="st-use" data-id="${i.id}">Verbrauch</button><button class="btn sm" data-act="st-fill" data-id="${i.id}">Auffüllen</button></div>`;
}
ACT['stock-new'] = () => ACT['item-new']({ container: 'home' });
ACT['st-adj'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; const nq = Math.max(0, +(it.qty + (+d.d)).toFixed(2)); H.usage.push({ id: uid(), itemId: it.id, delta: nq - it.qty, at: new Date().toISOString(), note: 'Schnellkorrektur' }); it.qty = nq; persist(); rerender(true); };
ACT['st-use'] = d => {
  const H = HH(); const it = byId(H.items, d.id);
  formDlg({ title: 'Verbrauch erfassen: ' + it.name, body: h`<p class="muted">Aktuell ${itemQtyLabel(it)}.</p>${F.num('amt', 'Verbrauchte Menge (' + it.unit + ')', '1', { req: true, min: 0.01 })}${F.text('note', 'Notiz (optional)', '')}`, ok: 'Abziehen',
    onSubmit: fd => { const a = num(fd.get('amt')); if (a <= 0) throw new Error('Bitte eine Menge größer 0 eintragen.'); it.qty = Math.max(0, +(it.qty - a).toFixed(2)); H.usage.push({ id: uid(), itemId: it.id, delta: -a, at: new Date().toISOString(), note: fd.get('note') || '' }); persist(); rerender(true); if (it.minQty > 0 && it.qty < it.minQty) toast('Mindestbestand unterschritten – auf Einkaufsliste setzen?'); } });
};
ACT['st-fill'] = d => {
  const H = HH(); const it = byId(H.items, d.id);
  formDlg({ title: 'Bestand auffüllen: ' + it.name, body: h`<p class="muted">Aktuell ${itemQtyLabel(it)}.</p>${F.num('amt', 'Hinzugefügte Menge (' + it.unit + ')', '1', { req: true, min: 0.01 })}${F.date('expiry', 'Neues Ablaufdatum (optional)', '', { hint: 'Wird übernommen, wenn es früher ist als das bisherige oder keines eingetragen ist.' })}${F.num('price', 'Preis (optional, €)', '')}`, ok: 'Hinzufügen',
    onSubmit: fd => { const a = num(fd.get('amt')); if (a <= 0) throw new Error('Bitte eine Menge größer 0 eintragen.'); it.qty = +(it.qty + a).toFixed(2); const e = fd.get('expiry'); if (e && (!it.expiry || e < it.expiry)) it.expiry = e; H.usage.push({ id: uid(), itemId: it.id, delta: a, at: new Date().toISOString(), note: 'Aufgefüllt' }); persist(); rerender(true); } });
};
