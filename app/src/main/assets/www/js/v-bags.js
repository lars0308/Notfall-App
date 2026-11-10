'use strict';
/* ===== Notfall! – Meine Taschen: Liste, Fachansicht (2D, optional 3D), Packliste, Packanleitung ===== */
const BAGUI = { sel: null, cam: null, bagId: null, view: '2d', skip: new Set() };

function bagModel(bag) { return (BAG_TYPE[bag.type] || BAG_TYPE.trekking).model; }
function comps3d(H, S, bag) { return bagStats(H, S, bag).comps.map(c => ({ id: c.id, slot: c.slot, name: c.name, weightG: c.weightG, fillPct: c.fillPct, status: c.status })); }

/* ---- 2D-Fachansicht (Basis): Rechtecke je Fach, antippbar ---- */
const BAG2D = {
  trek: { body: [48, 8, 104, 212], s: { lid: [52, 10, 96, 34], main: [52, 48, 96, 120], front: [70, 84, 60, 66], bottom: [52, 172, 96, 44], sideL: [20, 96, 26, 96], sideR: [154, 96, 26, 96] } },
  tac: { body: [48, 8, 104, 212], s: { top: [60, 10, 80, 26], main: [52, 40, 96, 176], front2: [66, 56, 68, 52], front: [66, 122, 68, 76], sideL: [20, 90, 26, 96], sideR: [154, 90, 26, 96] } },
  day: { body: [54, 24, 92, 190], s: { main: [58, 28, 84, 182], front: [72, 112, 56, 82], sideL: [26, 110, 26, 80], sideR: [148, 110, 26, 80] } },
  kid: { body: [60, 46, 80, 160], s: { main: [64, 50, 72, 152], front: [76, 122, 48, 64], sideL: [34, 116, 24, 70] } },
  school: { body: [52, 24, 96, 190], s: { main: [56, 28, 88, 182], front: [66, 104, 68, 92], sideL: [24, 110, 26, 80], sideR: [150, 110, 26, 80] } },
  duffel: { body: [28, 78, 144, 96], s: { top: [50, 62, 100, 22], main: [32, 88, 136, 82], endL: [6, 98, 22, 64], endR: [172, 98, 22, 64] } },
  case: { body: [46, 14, 108, 232], s: { lid: [50, 18, 100, 104], main: [50, 126, 100, 116], front: [66, 36, 68, 52] } },
};
const ST_FILL = { empty: 'rgba(140,155,170,.25)', open: 'rgba(150,170,190,.5)', partial: 'rgba(245,165,36,.75)', packed: 'rgba(61,214,140,.75)', over: 'rgba(255,90,95,.8)' };
function bag2d(bag, comps, sel, opts = {}) {
  const L = BAG2D[bagModel(bag)] || BAG2D.trek; const order = ['main', 'lid', 'top', 'bottom', 'sideL', 'sideR', 'endL', 'endR', 'front', 'front2'];
  const rects = order.map(slot => { const c = comps.find(x => x.slot === slot); const r = L.s[slot]; if (!c || !r) return ''; const kg = c.weightG >= 100 ? fmt(c.weightG / 1000) + ' kg' : ''; const small = r[2] < 40;
    return `<g class="c ${c.id === sel ? 'sel' : ''}" data-act="${opts.act || 'bg-sel'}" data-id="${esc(c.id)}" role="button" aria-label="${esc(c.name)}"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="10" fill="${ST_FILL[c.status] || ST_FILL.empty}"/>${small ? `<text class="sm" x="${r[0] + r[2] / 2}" y="${r[1] + r[3] / 2}" transform="rotate(-90 ${r[0] + r[2] / 2} ${r[1] + r[3] / 2})">${esc(c.name.slice(0, 14))}</text>` : slot === 'main' ? `<text x="${r[0] + r[2] / 2}" y="${r[1] + r[3] - 8}">${esc(c.name.slice(0, 14))}${kg ? ' · ' + kg : ''}</text>` : `<text x="${r[0] + r[2] / 2}" y="${r[1] + r[3] / 2 - (kg ? 3 : -4)}">${esc(c.name.slice(0, 18))}</text>${kg ? `<text x="${r[0] + r[2] / 2}" y="${r[1] + r[3] / 2 + 11}" style="font-weight:500">${kg}</text>` : ''}`}</g>`; }).join('');
  const b = L.body;
  return raw(`<svg class="bag2d" viewBox="0 0 200 250" role="group" aria-label="Fachansicht"><rect class="body" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="18"/>${rects}</svg>`);
}
function innerChips(comps, sel, act = 'bg-sel') { const inner = comps.filter(c => !c.slot); return inner.length ? h`<div class="chips">${inner.map(c => h`<button class="chip" aria-pressed="${c.id === sel ? 'true' : 'false'}" data-act="${act}" data-id="${c.id}">${c.name}${c.weightG >= 100 ? ' · ' + fmt(c.weightG / 1000) + ' kg' : ''}</button>`)}</div>` : ''; }

function bagMeta(H, b) { const o = byId(H.people, b.owner); return [(BAG_TYPE[b.type] || {}).label, fmt0(b.liters) + ' l', o && o.name, b.location].filter(Boolean).join(' · '); }
route('/bags', H => {
  const S = DB.settings;
  return {
    title: 'Meine Taschen',
    html: h`${H.bags.map(b => { const st = bagStats(H, S, b); return h`<a class="tile" href="#/bags/${b.id}">${b.photos[0] ? thumb(b.photos[0]) : h`<span class="ti">${icon(b.role === 'car' ? 'car' : 'bag')}</span>`}<span class="grow"><span class="tt">${b.name}</span><br><span class="ts">${bagMeta(H, b)}</span><br><span class="ts">${bagLine(st)}${st.overweight ? ' · zu schwer' : ''}</span><span style="display:block;margin-top:6px">${bar(st.packedPct, 'ok')}</span></span>${icon('chev', 'chev')}</a>`; })}
    ${H.bags.length ? '' : empty('Noch keine Tasche.')}
    ${H.bags.filter(b => b.owner).length > 1 ? h`<button class="btn" data-act="bags-balance">${icon('repeat')} Gewicht ausgleichen</button>` : ''}
    <div class="actionbar"><button class="btn primary lg" data-act="bag-new">${icon('plus')} Neue Tasche</button></div>`,
  };
});

route('/bags/:id', (id, H) => {
  const S = DB.settings; const bag = byId(H.bags, id);
  if (!bag) return { title: 'Tasche', back: '#/bags', html: empty('Nicht gefunden.') };
  if (BAGUI.bagId !== id) { BAGUI.bagId = id; BAGUI.sel = null; BAGUI.cam = null; BAGUI.skip = new Set(); }
  if (BAGUI.sel && !byId(bag.comps, BAGUI.sel)) BAGUI.sel = null;
  const st = bagStats(H, S, bag); const items = bagItems(H, bag);
  const selComp = BAGUI.sel ? byId(bag.comps, BAGUI.sel) : null;
  const shown = (selComp ? items.filter(i => i.compId === selComp.id) : items).sort((a, b) => (a.packed - b.packed) || a.name.localeCompare(b.name, 'de'));
  const noDims = items.some(i => !i.weightG || !i.volL);
  return {
    title: bag.name, back: '#/bags',
    html: h`<div class="card"><div class="row nowrap">${bag.photos[0] ? h`<span class="thumb lg"><img data-ph="${bag.photos[0]}" data-act="ph-view" data-id="${bag.photos[0]}" alt="Foto"></span>` : h`<button class="thumb lg" data-act="bag-ph-add" data-id="${bag.id}" aria-label="Foto hinzufügen" style="cursor:pointer">${icon('camera')}</button>`}
        <div class="grow"><div class="muted small">${bagMeta(H, bag)}${bag.use ? ' · ' + bag.use : ''}</div><div class="bold" style="font-size:1.125rem;margin:2px 0">${bagLine(st)}</div>
        <div class="muted small">${noDims ? 'ca. ' : ''}${fmt(st.totalG / 1000)} kg${st.capKg ? ' von ' + fmt(st.capKg) + ' kg' : ''} · ${noDims ? 'ca. ' : ''}${fmt0(st.fillPct)} % Volumen</div></div></div>
      <div style="margin-top:12px">${bar(st.packedPct, 'ok')}</div></div>
    ${st.overweight ? noticeBox(st.overFactor > 1.25 ? 'must' : 'rec', `Zu schwer: ${fmt(st.totalG / 1000)} kg (Richtwert ${fmt(st.capKg)} kg)`, '', H.bags.filter(b => b.owner).length > 1 ? h`<button class="btn sm" data-act="bags-balance">Gewicht ausgleichen</button>` : '') : ''}
    ${st.overfull ? noticeBox('must', `Zu voll: ${fmt(st.volL)} l bei ${fmt(st.usableL)} l nutzbar`, 'Nichts wird gestrichen. Größere Tasche oder umverteilen.') : ''}
    <div class="card"><div class="card-head"><h2>Fächer</h2><div class="tabs" style="padding:2px"><button aria-selected="${BAGUI.view === '2d' ? 'true' : 'false'}" data-act="bg-mode" data-v="2d" style="min-height:36px">2D</button><button aria-selected="${BAGUI.view === '3d' ? 'true' : 'false'}" data-act="bg-mode" data-v="3d" style="min-height:36px">3D</button></div></div>
      ${BAGUI.view === '3d' ? h`<div class="bag3d"><canvas id="bagcv" tabindex="0" role="img" aria-label="3D-Ansicht"></canvas><div class="bag3d-tools">${[['iso', 'Schräg'], ['front', 'Vorne'], ['back', 'Hinten'], ['left', 'Links'], ['right', 'Rechts']].map(([k, l]) => h`<button class="btn sm" data-act="bg-view" data-v="${k}">${l}</button>`)}</div></div>` : bag2d(bag, st.comps, BAGUI.sel)}
      ${innerChips(st.comps, BAGUI.sel)}
      <div class="btns" style="margin-top:12px">${selComp ? h`<button class="btn sm" data-act="comp-edit" data-bag="${bag.id}" data-id="${selComp.id}">${icon('edit')} ${selComp.name}</button><button class="btn sm danger" data-act="comp-del" data-bag="${bag.id}" data-id="${selComp.id}" aria-label="Fach entfernen">${icon('trash')}</button><button class="btn sm ghost" data-act="bg-sel" data-id="">Alle zeigen</button>` : ''}<button class="btn sm" data-act="comp-add" data-bag="${bag.id}">${icon('plus')} Fach</button></div></div>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>${selComp ? selComp.name : 'Packliste'}</h2><span class="badge">${shown.length}</span></div>
      <div class="list">${shown.length ? shown.map(it => bagItemRow(H, bag, it, !selComp)) : empty(selComp ? 'Leer.' : 'Noch nichts in der Tasche.')}</div></div>
    <div class="btns"><a class="btn" href="#/bags/${bag.id}/missing">${icon('alert')} Was fehlt?${st.missing ? h` <span class="count">${st.missing}</span>` : ''}</a><button class="btn" data-act="bag-print" data-id="${bag.id}">${icon('print')} Drucken</button><button class="btn" data-act="bag-edit" data-id="${bag.id}">${icon('edit')} Bearbeiten</button><button class="btn" data-act="bag-pack" data-id="${bag.id}">${icon('cube')} Fächer neu zuteilen</button><button class="btn" data-act="bag-copy" data-id="${bag.id}">${icon('copy')} Kopieren</button><button class="btn danger" data-act="bag-del" data-id="${bag.id}">${icon('trash')} Löschen</button></div>
    ${bag.photos.length ? h`<div class="card"><h3>Fotos</h3>${photoStrip(bag.photos, 'bag-ph-del', { id: bag.id })}<button class="btn sm" style="margin-top:8px" data-act="bag-ph-add" data-id="${bag.id}">${icon('camera')} Foto</button></div>` : ''}
    <div class="actionbar"><a class="btn primary lg" href="#/bags/${bag.id}/pack">${icon('check')} Packen starten</a><button class="btn lg" data-act="item-new-bag" data-bag="${bag.id}" data-comp="${BAGUI.sel || ''}">${icon('plus')} Gegenstand</button></div>`,
    after: () => {
      const cv = $('#bagcv'); if (!cv) return;
      const g = new Bag3D(cv, { onPick: cid => { saveCam(); BAGUI.sel = cid; rerender(true); } });
      UI.bag3d = g; g.setModel(bagModel(bag), bag.color); g.setComps(comps3d(H, S, bag), BAGUI.sel);
      if (BAGUI.cam) { g.yaw = BAGUI.cam.yaw; g.pitch = BAGUI.cam.pitch; g.zoom = BAGUI.cam.zoom; }
      g.resize(); setTimeout(() => g.resize(), 80);
    },
  };
});
function saveCam() { if (UI.bag3d) BAGUI.cam = { yaw: UI.bag3d.yaw, pitch: UI.bag3d.pitch, zoom: UI.bag3d.zoom }; }
function bagItemRow(H, bag, it, showComp) {
  const c = byId(bag.comps, it.compId);
  return h`<div class="li ${it.status === 'missing' ? 'must' : it.status === 'planned' ? 'rec' : ''}">
    ${it.status === 'owned' ? h`<input type="checkbox" style="width:1.75rem;height:1.75rem;accent-color:var(--ok);flex:none" ${it.packed ? raw('checked') : ''} data-change="bag-pack-toggle" data-id="${it.id}" aria-label="${it.name} gepackt">` : h`<span style="width:1.75rem;flex:none"></span>`}
    ${it.photos[0] ? thumb(it.photos[0]) : ''}
    <a class="grow" href="#/item/${it.id}" style="color:inherit;text-decoration:none"><span class="t" ${it.packed ? raw('style="text-decoration:line-through;color:var(--muted)"') : ''}>${it.name}</span><br><span class="s">${[itemQtyLabel(it), it.weightG ? fmtKg(it.weightG * it.qty) : '', showComp ? (c ? c.name : 'ohne Fach') : '', it.lastMinute ? 'erst bei Abreise' : '', it.status === 'missing' ? 'fehlt' : it.status === 'planned' ? 'ungeprüft' : ''].filter(Boolean).join(' · ')}</span></a>
    <button class="btn icon sm" data-act="bag-item-move" data-id="${it.id}" aria-label="${it.name} in anderes Fach">${icon('move')}</button></div>`;
}
ACT['bg-mode'] = d => { BAGUI.view = d.v; rerender(true); };

/* ---- Was fehlt? ---- */
route('/bags/:id/missing', (id, H) => {
  const bag = byId(H.bags, id); if (!bag) return { title: 'Was fehlt?', back: '#/bags', html: empty('Nicht gefunden.') };
  const miss = bagItems(H, bag).filter(i => i.status !== 'owned').sort((a, b) => ({ must: 0, rec: 1, opt: 2 }[a.prio] - { must: 0, rec: 1, opt: 2 }[b.prio]));
  const recs = openRecs(H, DB.settings).filter(r => r.level !== 'opt' && (!r.bagId || r.bagId === bag.id) && r.action.type === 'template').slice(0, 8);
  return {
    title: 'Was fehlt?', back: '#/bags/' + bag.id,
    html: h`${miss.length ? h`<div class="card flush"><div class="list">${miss.map(it => reviewRow(H, it))}</div></div>` : noticeBox('ok', 'Alles vorhanden', '')}
    ${recs.length ? h`<h2>Vorschläge</h2>${recs.map(r => recRow(r))}` : ''}`,
  };
});

/* ---- Packanleitung: Schritt für Schritt ---- */
route('/bags/:id/pack', (id, H) => {
  const S = DB.settings; const bag = byId(H.bags, id); if (!bag) return { title: 'Packen', back: '#/bags', html: empty('Nicht gefunden.') };
  if (BAGUI.bagId !== id) { BAGUI.bagId = id; BAGUI.skip = new Set(); }
  const ps = packSteps(H, bag); const all = ps.steps; const done = all.filter(x => x.item.packed).length;
  let cur = all.find(x => !x.item.packed && !BAGUI.skip.has(x.item.id)); if (!cur && BAGUI.skip.size) { BAGUI.skip.clear(); cur = all.find(x => !x.item.packed); }
  const st = bagStats(H, S, bag); const bal = sideBalance(H, S, bag);
  const head = h`<div class="row spread"><span class="bold">${done} von ${all.length}</span><button class="btn sm ghost" data-act="pack-reset" data-id="${bag.id}">${icon('repeat')} Neu packen</button></div>${bar(pct(done, all.length), 'ok')}`;
  if (!all.length) return { title: 'Packen', back: '#/bags/' + bag.id, html: h`${empty('Noch nichts Vorhandenes in dieser Tasche.')}${ps.missing.length ? h`<a class="btn block" href="#/bags/${bag.id}/missing">Was fehlt? (${ps.missing.length})</a>` : ''}` };
  if (cur) {
    const it = cur.item;
    return {
      title: 'Packen', back: '#/bags/' + bag.id,
      html: h`${head}
      <div class="stepcard"><span class="badge info">${cur.reason}</span><div class="big">${it.name}</div><div class="muted">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) : ''}</div>
        <div class="row" style="margin-top:4px">${icon('chev')}<span class="bold" style="font-size:1.125rem">${cur.comp ? cur.comp.name : 'Fach wählen'}</span><button class="btn sm" data-act="bag-item-move" data-id="${it.id}">Ändern</button></div>
        ${it.notes ? h`<div class="small">${it.notes}</div>` : ''}${it.photos[0] ? h`<span class="thumb lg"><img data-ph="${it.photos[0]}" alt=""></span>` : ''}</div>
      ${bag2d(bag, st.comps, cur.comp ? cur.comp.id : null, { act: 'noop' })}
      <div class="actionbar"><button class="btn lg" data-act="pack-skip" data-id="${it.id}">Später</button><button class="btn primary lg" style="flex:2" data-act="pack-done" data-id="${it.id}">${icon('check')} Eingepackt</button></div>`,
    };
  }
  return {
    title: 'Packen', back: '#/bags/' + bag.id,
    html: h`${head}${noticeBox('ok', 'Fertig gepackt', bag.location ? 'Lagerort: ' + bag.location : '')}
    ${bal ? noticeBox('rec', 'Seitlich ungleich', `${bal.heavier} ist ${fmtKg(bal.diffG)} schwerer.`) : ''}
    ${ps.later.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Erst bei Abreise</h2></div><div class="list">${ps.later.map(x => bagItemRow(H, bag, x.item, true))}</div></div>` : ''}
    ${ps.missing.length ? h`<a class="btn block" href="#/bags/${bag.id}/missing">${icon('alert')} Was fehlt? (${ps.missing.length})</a>` : ''}
    <div class="actionbar"><button class="btn lg" data-act="bag-print" data-id="${bag.id}">${icon('print')} Drucken</button><a class="btn primary lg" href="#/bags/${bag.id}">Fertig</a></div>`,
  };
});
ACT['pack-done'] = d => {
  const H = HH(); const it = byId(H.items, d.id); if (!it) return; it.packed = true;
  const bag = byId(H.bags, it.bagId); if (bag && !packSteps(H, bag).steps.some(x => !x.item.packed)) { bag.checkedAt = todayISO(); const r = H.reminders.find(x => x.key === 'bagcheck'); if (r) { r.lastDone = todayISO(); r.next = addDays(todayISO(), r.interval || 90); } }
  persist(); rerender();
};
ACT['pack-skip'] = d => { BAGUI.skip.add(d.id); rerender(); };
ACT['pack-reset'] = async d => {
  const H = HH(); const bag = byId(H.bags, d.id); const ok = await confirmDlg('Neu packen?', 'Alle Häkchen dieser Tasche werden entfernt.', { ok: 'Neu packen' }); if (!ok) return;
  bagItems(H, bag).forEach(i => { i.packed = false; }); BAGUI.skip.clear(); persist(); rerender();
};
ACT['bag-copy'] = d => {
  const H = HH(); const b = byId(H.bags, d.id); const nb = clone(b); nb.id = uid(); nb.name = b.name + ' (Kopie)'; nb.photos = []; nb.checkedAt = '';
  const map = {}; nb.comps.forEach(c => { const n = uid(); map[c.id] = n; c.id = n; });
  H.bags.push(nb);
  for (const it of bagItems(H, b)) { const c = clone(it); c.id = uid(); c.bagId = nb.id; c.compId = map[it.compId] || null; c.packed = false; c.status = 'planned'; c.photos = []; H.items.push(c); }
  persist(); go('#/bags/' + nb.id); toast('Kopiert – bitte Inhalt prüfen');
};
INPUT['bag-pack-toggle'] = el => { const it = byId(HH().items, el.dataset.id); if (it) { it.packed = el.checked; persist(); rerender(true); } };
ACT['bg-view'] = d => { if (UI.bag3d) UI.bag3d.setView(d.v); };
ACT['bg-zoom'] = d => { if (UI.bag3d) { UI.bag3d.zoom = clamp(UI.bag3d.zoom * +d.z, .5, 3.5); UI.bag3d.invalidate(); } };
ACT['bg-sel'] = d => { saveCam(); BAGUI.sel = d.id || null; rerender(true); };
ACT['item-new-bag'] = d => ACT['item-new']({ bagId: d.bag, compId: d.comp, container: 'bag' });
ACT['bag-item-move'] = d => {
  const H = HH(); const it = byId(H.items, d.id); const bag = byId(H.bags, it.bagId);
  formDlg({ title: 'Gegenstand verschieben', body: h`<p class="muted">${it.name} (${itemQtyLabel(it)})</p>${F.select('bagId', 'In Rucksack', H.bags.map(b => [b.id, b.name]), it.bagId)}${F.select('compId', 'In Fach', [['', '– automatisch –'], ...bag.comps.map(c => [c.id, c.name])], it.compId || '')}`, ok: 'Verschieben',
    onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { it.bagId = fd.get('bagId'); it.compId = fd.get('compId') || null; it.container = 'bag'; it.packed = false; if (!it.compId) autoPack(H, byId(H.bags, it.bagId), { onlyUnassigned: true }); persist(); rerender(true); } });
};

/* ---- Fächer ---- */
function freeSlots(bag) {
  const model = bagModel(bag); const slots = MODEL_SLOTS[model] || MODEL_SLOTS.trek;
  const used = new Set(bag.comps.map(c => c.slot).filter(Boolean));
  return slots.filter(s => !used.has(s[0]));
}
function slotOptions(bag, current) {
  const model = bagModel(bag); const slots = MODEL_SLOTS[model] || MODEL_SLOTS.trek;
  const used = new Set(bag.comps.map(c => c.slot).filter(x => x && x !== current));
  return [['', 'Innenfach (ohne Position am Modell)'], ...slots.filter(s => !used.has(s[0])).map(s => [s[0], SLOT_NAMES[s[0]] || s[1]])];
}
ACT['comp-add'] = d => {
  const H = HH(); const bag = byId(H.bags, d.bag); const fs = freeSlots(bag);
  formDlg({ title: 'Fach hinzufügen', body: h`${F.text('name', 'Name des Fachs', fs[0] ? fs[0][1] : 'Innenfach ' + (bag.comps.length + 1), { req: true, max: 40 })}${F.select('slot', 'Position am Rucksack', slotOptions(bag, null), fs[0] ? fs[0][0] : '')}${F.num('capL', 'Fassungsvermögen (Liter)', Math.max(1, Math.round(bag.liters * .06 * 10) / 10), { req: true })}`,
    onSubmit: fd => { bag.comps.push({ id: uid(), name: fd.get('name').trim() || 'Fach', slot: fd.get('slot') || null, capL: num(fd.get('capL')) }); persist(); rerender(true); } });
};
ACT['comp-edit'] = d => {
  const H = HH(); const bag = byId(H.bags, d.bag); const c = byId(bag.comps, d.id);
  formDlg({ title: 'Fach bearbeiten', body: h`${F.text('name', 'Name', c.name, { req: true, max: 40 })}${F.select('slot', 'Position am Rucksack', slotOptions(bag, c.slot), c.slot || '')}${F.num('capL', 'Fassungsvermögen (Liter)', c.capL || '')}`,
    onSubmit: fd => { c.name = fd.get('name').trim() || c.name; c.slot = fd.get('slot') || null; c.capL = num(fd.get('capL')); persist(); rerender(true); } });
};
ACT['comp-del'] = async d => {
  const H = HH(); const bag = byId(H.bags, d.bag); const c = byId(bag.comps, d.id);
  if (bag.comps.length <= 1) { toast('Ein Rucksack braucht mindestens ein Fach.'); return; }
  const n = bagItems(H, bag).filter(i => i.compId === c.id).length;
  const ok = await confirmDlg('Fach entfernen?', n ? `„${c.name}“ enthält ${n} Gegenstände. Sie werden in andere Fächer verschoben, nichts wird gelöscht.` : `„${c.name}“ wird entfernt.`, { ok: 'Entfernen', danger: true });
  if (!ok) return;
  bag.comps = bag.comps.filter(x => x.id !== c.id);
  for (const i of H.items.filter(i => i.bagId === bag.id && i.compId === c.id)) i.compId = null;
  autoPack(H, bag, { onlyUnassigned: true }); BAGUI.sel = null; persist(); rerender(true);
};

/* ---- Rucksack anlegen / bearbeiten ---- */
function bagFormFields(H, b, isNew) {
  const ppl = [['', '– niemand –'], ...H.people.map(p => [p.id, p.name])];
  return h`<div class="stack">${F.select('type', 'Typ', BAG_TYPES.map(t => [t.id, t.label]), b.type, { attrs: { 'data-change': 'bagform-type' } })}
    ${F.text('name', 'Name', b.name, { req: true, max: 60 })}
    <div class="form-grid">${F.num('liters', 'Volumen (Liter)', b.liters, { req: true, min: 1, maxv: 300 })}${F.select('owner', 'Besitzer', ppl, b.owner || '')}${F.text('location', 'Fester Lagerort', b.location, { ph: 'z. B. Flur', max: 60 })}${F.text('use', 'Verwendung', b.use, { ph: 'z. B. Evakuierung', max: 60 })}</div>
    <details><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer">Weitere Angaben</summary><div class="stack" style="margin-top:8px">
      <div class="form-grid">${F.num('ownKg', 'Eigengewicht (kg)', b.ownKg)}${F.num('maxLoadKg', 'Empfohlene Zuladung (kg)', b.maxLoadKg || '')}${F.text('maker', 'Hersteller', b.maker, { max: 40 })}${F.text('model', 'Modell', b.model, { max: 40 })}${isNew ? F.num('compCount', 'Anzahl Fächer', '', { min: 1, maxv: 12, step: 1 }) : ''}${F.select('color', 'Farbe', Object.entries(BAG_COLORS).map(([k, v]) => [k, v[0]]), b.color)}</div>
      <div class="choice-grid">${F.check('hip', 'Hüftgurt', b.hip)}${F.check('chest', 'Brustgurt', b.chest)}${F.check('hydration', 'Trinksystem', b.hydration)}${F.check('ext', 'Außenbefestigungen', b.ext)}</div>
      ${F.area('notes', 'Notizen', b.notes, { rows: 2 })}</div></details></div>`;
}
INPUT['bagform-type'] = el => { const bt = BAG_TYPE[el.value]; const f = el.closest('form'); if (!bt || !f) return; if (f.dataset.new) { f.elements.liters.value = bt.liters; f.elements.ownKg.value = bt.ownKg; if (!f.elements.name.value || BAG_TYPES.some(t => t.label === f.elements.name.value)) f.elements.name.value = bt.label; } const set = (n, v) => { if (f.elements[n]) f.elements[n].checked = v; }; set('hip', bt.hip); set('chest', bt.chest); };
function saveBagFields(b, fd) {
  b.type = fd.get('type'); b.name = fd.get('name').trim(); b.maker = fd.get('maker') || ''; b.model = fd.get('model') || '';
  b.liters = num(fd.get('liters'), 30); if (b.liters <= 0) throw new Error('Das Volumen muss größer als 0 sein.');
  b.ownKg = num(fd.get('ownKg')); b.maxLoadKg = num(fd.get('maxLoadKg')); b.owner = fd.get('owner') || null; b.use = fd.get('use') || ''; b.location = fd.get('location') || ''; b.color = fd.get('color');
  b.hip = fdBool(fd, 'hip'); b.chest = fdBool(fd, 'chest'); b.hydration = fdBool(fd, 'hydration'); b.ext = fdBool(fd, 'ext'); b.notes = fd.get('notes') || ''; b.suggested = false;
  const slots = (MODEL_SLOTS[(BAG_TYPE[b.type] || BAG_TYPE.trekking).model] || []).map(s => s[0]);
  for (const c of b.comps) if (c.slot && !slots.includes(c.slot)) c.slot = null;
}
ACT['bag-new'] = d => {
  const H = HH(); const b = newBag({ name: BAG_TYPE.trekking.label, type: 'trekking' });
  const m = formDlg({ title: 'Neue Tasche', wide: true, body: bagFormFields(H, b, true), ok: 'Anlegen',
    onSubmit: fd => { const nb = newBag({ type: fd.get('type'), liters: num(fd.get('liters'), 30), ownKg: num(fd.get('ownKg')), compCount: Math.round(num(fd.get('compCount'))) || 0, name: 'x' }); saveBagFields(nb, fd); H.bags.push(nb); persist(); if (d && d.stay) rerender(true); else go('#/bags/' + nb.id); } });
  m.el.querySelector('form').dataset.new = '1';
};
ACT['bag-edit'] = d => {
  const H = HH(); const b = byId(H.bags, d.id);
  formDlg({ title: 'Tasche bearbeiten', wide: true, body: bagFormFields(H, b, false), onSubmit: fd => { saveBagFields(b, fd); persist(); rerender(true); } });
};
ACT['bag-del'] = async d => {
  const H = HH(); const b = byId(H.bags, d.id); const n = bagItems(H, b).length;
  const ok = await confirmDlg('Rucksack löschen?', `„${b.name}“ wird gelöscht. Die ${n} Gegenstände darin bleiben im Inventar erhalten und werden „Zuhause“ zugeordnet.`, { ok: 'Rucksack löschen', danger: true });
  if (!ok) return;
  for (const i of H.items.filter(i => i.bagId === b.id)) { i.container = 'home'; i.bagId = null; i.compId = null; i.packed = false; if (!i.place) i.place = 'Zuhause (aus ' + b.name + ')'; }
  H.bags = H.bags.filter(x => x.id !== b.id); persist(); setTimeout(sweepPhotos, 300); go('#/bags');
};
ACT['bag-ph-add'] = async d => { const b = byId(HH().bags, d.id); const pid = await addPhotoTo(null); if (!pid) return; b.photos.push(pid); persist(); rerender(true); };
ACT['bag-ph-del'] = async d => { const ok = await confirmDlg('Foto entfernen?', 'Das Foto wird gelöscht.', { ok: 'Entfernen', danger: true }); if (!ok) return; const b = byId(HH().bags, d.id); b.photos = b.photos.filter(x => x !== d.pid); persist(); setTimeout(sweepPhotos, 300); rerender(true); };
ACT['bag-pack'] = d => { const H = HH(); const b = byId(H.bags, d.id); autoPack(H, b); persist(); rerender(true); toast('Fächer neu zugeteilt'); };
ACT['bag-allpacked'] = async d => { const H = HH(); const b = byId(H.bags, d.id); const its = bagItems(H, b).filter(i => i.status === 'owned'); const ok = await confirmDlg('Alles als gepackt markieren?', `${its.length} vorhandene Gegenstände werden als gepackt markiert. Fehlende bleiben offen.`, { ok: 'Markieren' }); if (!ok) return; its.forEach(i => { i.packed = true; }); persist(); rerender(true); };
ACT['bag-checked'] = d => { const b = byId(HH().bags, d.id); b.checkedAt = todayISO(); const r = HH().reminders.find(x => x.key === 'bagcheck'); if (r) { r.lastDone = todayISO(); r.next = addDays(todayISO(), r.interval || 90); } persist(); rerender(true); toast('Kontrolle vermerkt'); };
ACT['bag-print'] = d => {
  const H = HH(); const S = DB.settings; const b = byId(H.bags, d.id); const st = bagStats(H, S, b);
  const rows = bagItems(H, b).map(i => `<tr><td>${i.packed ? '☑' : '☐'}</td><td>${esc(i.name)}</td><td>${esc(itemQtyLabel(i))}</td><td>${esc((byId(b.comps, i.compId) || {}).name || '')}</td><td>${i.weightG ? esc(fmtKg(i.weightG * i.qty)) : ''}</td><td>${i.status === 'owned' ? '' : 'fehlt/ungeprüft'}</td></tr>`).join('');
  printDoc('Packliste ' + b.name, `<h1>Packliste: ${esc(b.name)}</h1><p>${fmt(st.totalG / 1000)} kg gesamt · ${fmt0(st.fillPct)} % Volumen · Stand ${fmtDate(todayISO())}</p><table><tr><th></th><th>Gegenstand</th><th>Menge</th><th>Fach</th><th>Gewicht</th><th>Status</th></tr>${rows}</table>`);
};
ACT['bags-balance'] = async () => {
  const H = HH(); const S = DB.settings; const moves = suggestBalance(H, S);
  if (!moves.length) { toast('Die Last ist bereits ausgewogen oder es gibt keine verschiebbaren Gegenstände.'); return; }
  const ok = await confirmDlg('Verteilung vorschlagen', h`<p>Diese Gegenstände würden verschoben, damit die relative Last ausgewogener ist:</p><ul>${moves.map(m => h`<li>${m.name} (${fmtKg(m.weightG)}): ${byId(H.bags, m.from).name} → ${byId(H.bags, m.to).name}</li>`)}</ul>`, { ok: 'Verschieben' });
  if (!ok) return;
  for (const m of moves) { const it = byId(H.items, m.itemId); if (it) { it.bagId = m.to; it.compId = null; it.packed = false; } }
  for (const b of H.bags) autoPack(H, b, { onlyUnassigned: true });
  persist(); rerender(true); toast(moves.length + ' Gegenstände verschoben');
};
