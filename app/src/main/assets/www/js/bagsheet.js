'use strict';
/* ===== Notfall! – Taschen-Fenster: Inhalt nach Kategorien, abhaken, hinzufügen; alles Weitere unter „⋯“ ===== */
const BS = { open: new Set() };

function bagSheetBody(H, bid) {
  const bag = byId(H.bags, bid); if (!bag) return h`<p class="muted">Tasche nicht gefunden.</p>`;
  const S = DB.settings; const st = bagStats(H, S, bag); const its = bagItemsOf(H, bid);
  const have = its.filter(i => i.status === 'owned').length; const trim = (st.overweight || st.overfull) ? trimmable(H, bag).length : 0;
  const cats = pickVisible(H, bag).map(c => ({ c, rows: groupRows(its.filter(i => pickCatOf(i.category) === c.id).sort(sortPrio)) })).filter(x => x.rows.length);
  const cls = st.overweight ? (st.overFactor > 1.25 ? 'must' : 'rec') : 'ok';
  return h`<div class="bshead"><div class="row spread"><b>${its.length ? `${have} von ${its.length} da` : 'Noch leer'}</b><span class="small ${st.overweight ? 't' + cls : 'muted'}">${fmt(st.totalG / 1000)}${st.capKg ? ' / ' + fmt(st.capKg) : ''} kg${st.overfull ? ' · zu voll' : ''}</span></div>
      ${its.length ? bar(Math.round(have / its.length * 100), 'ok') : ''}</div>
    ${trim ? h`<div class="notice rec"><div class="grow"><p class="nt">Passt nicht alles rein</p><p class="small">${trim} Vorschläge können raus – Notwendiges bleibt.</p></div><button class="btn sm" data-act="bs-trim" data-id="${bid}">Herausnehmen</button></div>` : ''}
    <div class="btnrow"><button class="btn primary" data-act="add-open" data-bag="${bid}">${icon('plus')} Hinzufügen</button><button class="btn icon" data-act="bs-menu" data-id="${bid}" aria-label="Mehr zur Tasche">${icon('more')}</button></div>
    ${cats.length ? h`<div class="bscats">${cats.map(({ c, rows }) => { const n = rows.filter(r => r.every(i => i.status === 'owned')).length; const open = BS.open.has(bid + ':' + c.id); const imp = rows.some(r => r[0].prio === 'must' && r.some(i => i.status !== 'owned'));
      return h`<div class="bscat"><button class="foldhead" data-act="bs-cat" data-k="${bid + ':' + c.id}" aria-expanded="${open ? 'true' : 'false'}">${icon(n === rows.length ? 'check' : c.icon)}<span class="grow"><b>${c.short || c.label}</b></span><span class="small muted">${n}/${rows.length}</span>${imp ? h`<span class="sdot must" aria-label="Wichtiges offen"></span>` : ''}${icon('chev', 'chev')}</button>
        ${open ? h`<div class="list">${rows.map(r => tickRow(r, H))}</div>` : ''}</div>`; })}</div>` : empty('Noch nichts drin. Tippe auf „Hinzufügen“.')}`;
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
      ${row(`data-act="bag-del" data-id="${b.id}"`, 'trash', 'Tasche löschen', 'danger')}</div>` });
  m.el.addEventListener('click', e => { if (e.target.closest('.menurow')) closeModal(m); }, true);
};
ACT['go-bag'] = d => go('#/bags/' + d.id);
ACT['go-pack'] = d => go('#/bags/' + d.id + '/pack');
