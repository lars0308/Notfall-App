'use strict';
/* ===== Notfall! – Taschen-Fenster: Inhalt nach Kategorien, abhaken, hinzufügen; alles Weitere unter „⋯“ ===== */
const BS = { open: new Set() };

function bagSheetBody(H, bid) {
  const bag = byId(H.bags, bid); if (!bag) return h`<p class="muted">Tasche nicht gefunden.</p>`;
  const S = DB.settings; const st = bagStats(H, S, bag); const its = bagItemsOf(H, bid);
  const have = its.filter(i => i.status === 'owned').length; const trim = (st.overweight || st.overfull) ? trimmable(H, bag).length : 0;
  const cats = pickVisible(H, bag).map(c => ({ c, rows: groupRows(its.filter(i => itemCat(i) === c.id).sort(sortPrio)) })).filter(x => x.rows.length || x.c.custom);
  const cls = st.overweight ? (st.overFactor > 1.25 ? 'must' : 'rec') : 'ok';
  return h`<div class="bshead"><div class="row spread"><b>${its.length ? `${have} von ${its.length} da` : 'Noch leer'}</b><span class="small ${st.overweight ? 't' + cls : 'muted'}">${fmt(st.totalG / 1000)}${st.capKg ? ' / ' + fmt(st.capKg) : ''} kg${st.overfull ? ' · zu voll' : ''}</span></div>
      ${its.length ? bar(Math.round(have / its.length * 100), 'ok') : ''}</div>
    ${trim ? h`<div class="trimbar"><span class="grow small"><b>Passt nicht alles rein.</b> ${trim} Vorschläge können raus.</span><button class="btn sm" data-act="bs-trim" data-id="${bid}">Herausnehmen</button></div>` : ''}
    <div class="btnrow"><button class="btn primary" data-act="add-open" data-bag="${bid}">${icon('plus')} Hinzufügen</button><button class="btn icon" data-act="bs-menu" data-id="${bid}" aria-label="Mehr zur Tasche">${icon('dots')}</button></div>
    ${cats.length ? h`<div class="bscats">${cats.map(({ c, rows }) => { const n = rows.filter(r => r.every(i => i.status === 'owned')).length; const open = BS.open.has(bid + ':' + c.id); const imp = rows.some(r => r[0].prio === 'must' && r.some(i => i.status !== 'owned'));
      return h`<div class="bscat"><div class="bscathead"><button class="foldhead" data-act="bs-cat" data-k="${bid + ':' + c.id}" aria-expanded="${open ? 'true' : 'false'}">${icon(rows.length && n === rows.length ? 'check' : c.icon)}<span class="grow"><b>${c.short || c.label}</b></span><span class="small muted cnt">${n}/${rows.length}</span>${dotSlot(imp ? 'must' : '', 'Wichtiges offen')}${icon('chev', 'chev')}</button><button class="catmore" data-act="bs-catmenu" data-bag="${bid}" data-cat="${c.id}" aria-label="Mehr zu ${c.label}">${icon('dots')}</button></div>
        ${open ? h`${rows.length ? h`<div class="list">${rows.map(r => tickRow(r, H))}</div>` : h`<p class="muted small" style="padding:10px 14px">Noch leer.</p>`}<button class="btn sm ghost addin" data-act="add-open" data-bag="${bid}" data-cat="${c.id}">${icon('plus')} In „${c.short || c.label}“ hinzufügen</button>` : ''}</div>`; })}</div>` : empty('Noch nichts drin. Tippe auf „Hinzufügen“.')}
    <button class="btn block ghost" data-act="bs-newcat" data-bag="${bid}">${icon('plus')} Eigene Kategorie</button>`;
}
function openBagSheet(bid) {
  const H = HH(); const bag = byId(H.bags, bid); if (!bag) return;
  PICK.bag = bid;
  const m = openModal({ title: bag.name, body: h`<div id="bsbody" class="stack-s">${bagSheetBody(H, bid)}</div>`, onClose: () => { if (!UI.rendering) rerender(true); } });
  m.el.classList.add('sheet-tall');
  m.refresh = () => { const b = $('#bsbody', m.el); if (b) { b.innerHTML = bagSheetBody(HH(), bid).s; hydratePhotos(b); } const t = $('h2', m.el); const bg = byId(HH().bags, bid); if (t && bg) t.textContent = bg.name; };
  m.el.addEventListener('click', e => {
    const a = e.target.closest('[data-act=bs-cat]'); if (!a) return;
    e.stopPropagation(); const k = a.dataset.k; if (BS.open.has(k)) BS.open.delete(k); else BS.open.add(k); m.refresh();
  }, true);
  return m;
}
ACT['bag-open'] = d => openBagSheet(d.id);
ACT['bs-trim'] = d => { const H = HH(); const b = byId(H.bags, d.id); if (!b) return; const n = trimBagToFit(H, DB.settings, b); persist(); refreshView(); toast(n ? `${n} Vorschläge herausgenommen` : 'Nichts mehr herauszunehmen'); };
/* „⋯“ – alles Weitere, Löschen immer ganz unten */
ACT['bs-menu'] = d => {
  const H = HH(); const b = byId(H.bags, d.id); if (!b) return;
  const open = H.items.filter(i => i.bagId === b.id && i.status === 'planned').length;
  const row = (attrs, ic, label, cls = '') => h`<button class="li menurow ${cls}" ${raw(attrs)}>${icon(ic)}<span class="grow">${label}</span></button>`;
  const m = openModal({ title: b.name, body: h`<div class="list menulist">
      ${row(`data-act="go-bag" data-id="${b.id}"`, 'cube', 'Fächer & 3D-Ansicht')}
      ${open ? row(`data-act="ask-start" data-bag="${b.id}"`, 'list', `Einzeln abfragen (${open} offen)`) : ''}
      ${row(`data-act="go-pack" data-id="${b.id}"`, 'check', 'Packanleitung Schritt für Schritt')}
      ${row(`data-act="bag-share" data-id="${b.id}"`, 'upload', 'Packliste teilen')}
      ${row(`data-act="bag-print" data-id="${b.id}"`, 'print', 'Drucken / PDF')}
      ${row(`data-act="bag-label" data-id="${b.id}"`, 'scan', 'QR-Etikett')}
      ${row(`data-act="bag-edit" data-id="${b.id}"`, 'edit', 'Name, Größe, Träger ändern')}
      ${row(`data-act="bag-copy" data-id="${b.id}"`, 'copy', 'Kopieren')}
      ${(b.hiddenCats || []).length ? row(`data-act="bs-unhide" data-id="${b.id}"`, 'repeat', `Entfernte Kategorien wieder zeigen (${b.hiddenCats.length})`) : ''}
      ${row(`data-act="bag-del" data-id="${b.id}"`, 'trash', 'Tasche löschen', 'danger')}</div>` });
  m.el.addEventListener('click', e => { if (e.target.closest('.menurow')) closeModal(m); }, true);
};
ACT['go-bag'] = d => go('#/bags/' + d.id);
ACT['go-pack'] = d => go('#/bags/' + d.id + '/pack');

/* ---- Kategorien: eigene anlegen, umbenennen, löschen; vorhandene aus einer Tasche entfernen ---- */
ACT['bs-newcat'] = async d => {
  const name = await promptDlg('Eigene Kategorie', 'Name', '', { placeholder: 'z. B. Angelzeug, Spiele, Werkzeug Auto', ok: 'Anlegen' });
  const label = String(name || '').trim().slice(0, 40); if (!label) return;
  const H = HH(); H.customCats = H.customCats || [];
  if (H.customCats.some(c => norm(c.label) === norm(label))) { toast('Diese Kategorie gibt es schon.'); return; }
  const id = 'cc_' + uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 10); H.customCats.push({ id, label });
  BS.open.add(d.bag + ':' + id); persist(); refreshView(); toast(`Kategorie „${label}“ angelegt`);
};
ACT['bs-catmenu'] = d => {
  const H = HH(); const b = byId(H.bags, d.bag); const c = catDef(d.cat, H); if (!b || !c) return;
  const row = (attrs, ic, label, cls = '') => h`<button class="li menurow ${cls}" ${raw(attrs)}>${icon(ic)}<span class="grow">${label}</span></button>`;
  const m = openModal({ title: c.label, body: h`<div class="list menulist">
      ${row(`data-act="add-open" data-bag="${b.id}" data-cat="${c.id}"`, 'plus', 'Sache hinzufügen')}
      ${c.custom ? row(`data-act="bs-catren" data-cat="${c.id}"`, 'edit', 'Umbenennen') : ''}
      ${c.custom ? row(`data-act="bs-catdel" data-cat="${c.id}"`, 'trash', 'Kategorie löschen', 'danger') : row(`data-act="bs-cathide" data-bag="${b.id}" data-cat="${c.id}"`, 'trash', 'Aus dieser Tasche entfernen', 'danger')}</div>` });
  m.el.addEventListener('click', e => { if (e.target.closest('.menurow')) closeModal(m); }, true);
};
ACT['bs-catren'] = async d => {
  const H = HH(); const c = (H.customCats || []).find(x => x.id === d.cat); if (!c) return;
  const name = await promptDlg('Kategorie umbenennen', 'Name', c.label, { ok: 'Speichern' }); const label = String(name || '').trim().slice(0, 40); if (!label) return;
  c.label = label; persist(); refreshView();
};
function removeItems(H, pred) {
  const gone = H.items.filter(pred); const ids = new Set(gone.map(i => i.id));
  H.items = H.items.filter(i => !ids.has(i.id)); H.shop = H.shop.filter(s => !ids.has(s.itemId) || s.bought); return gone.length;
}
ACT['bs-catdel'] = async d => {
  const H = HH(); const c = (H.customCats || []).find(x => x.id === d.cat); if (!c) return;
  const n = H.items.filter(i => i.pcat === c.id).length;
  const ok = await confirmDlg(`„${c.label}“ löschen?`, n ? `Die Kategorie und ${n} ${n === 1 ? 'Sache' : 'Sachen'} darin werden in allen Taschen gelöscht.` : 'Die Kategorie wird gelöscht.', { ok: 'Löschen', danger: true }); if (!ok) return;
  removeItems(H, i => i.pcat === c.id); H.customCats = H.customCats.filter(x => x.id !== c.id); persist(); refreshView(); toast('Kategorie gelöscht');
};
ACT['bs-cathide'] = async d => {
  const H = HH(); const b = byId(H.bags, d.bag); const c = catDef(d.cat, H); if (!b || !c) return;
  const n = bagItems(H, b).filter(i => itemCat(i) === c.id).length;
  const ok = await confirmDlg(`„${c.label}“ aus „${b.name}“ entfernen?`, n ? `${n} ${n === 1 ? 'Sache' : 'Sachen'} darin werden aus dieser Tasche gelöscht. Die App schlägt dafür nichts mehr vor.` : 'Die App schlägt dafür nichts mehr vor.', { ok: 'Entfernen', danger: true }); if (!ok) return;
  removeItems(H, i => i.bagId === b.id && itemCat(i) === c.id); b.hiddenCats = Array.from(new Set((b.hiddenCats || []).concat(c.id))); persist(); refreshView(); toast('Kategorie entfernt');
};
ACT['bs-unhide'] = d => { const H = HH(); const b = byId(H.bags, d.id); if (!b) return; b.hiddenCats = []; persist(); refreshView(); toast('Kategorien sind wieder da'); };
