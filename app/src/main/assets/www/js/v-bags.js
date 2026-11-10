'use strict';
/* ===== Notfall! – Rucksäcke: Liste, Detail mit 3D-Ansicht, Fächer, Packstatus ===== */
const BAGUI = { sel: null, cam: null, bagId: null };

function bagModel(bag) { return (BAG_TYPE[bag.type] || BAG_TYPE.trekking).model; }
function comps3d(H, S, bag) { return bagStats(H, S, bag).comps.map(c => ({ id: c.id, slot: c.slot, name: c.name, weightG: c.weightG, fillPct: c.fillPct, status: c.status })); }
function bagWarnings(H, S, b, st) {
  const out = []; const o = byId(H.people, b.owner);
  if (st.overweight) out.push(noticeBox(st.overFactor > 1.25 ? 'must' : 'rec', `Zu schwer: ${fmt(st.totalG / 1000)} kg bei ${fmt(st.capKg)} kg Tragfähigkeit${o ? ' (' + o.name + ')' : ''}`, 'Prüfe, ob du die Ausrüstung anders verteilen kannst. Wichtige Gegenstände bleiben trotzdem auf der Liste – lass sie nicht einfach weg.', h`<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="bags-balance">Verteilung vorschlagen</button></div>`));
  if (st.overfull) out.push(noticeBox('must', `Volumen überschritten: ${fmt(st.volL)} l bei nutzbaren ${fmt(st.usableL)} l`, 'Rechnerisch passt nicht alles hinein. Nichts wird automatisch gestrichen. Optionen: größeren Rucksack wählen, auf einen anderen Rucksack verteilen oder platzsparender packen.'));
  const missing = st.missing; if (missing) out.push(noticeBox('rec', `${missing} Position${missing > 1 ? 'en' : ''} noch nicht bestätigt oder fehlend`, 'Diese Teile sind in Gewicht und Volumen schon eingerechnet.'));
  return out;
}
route('/bags', H => {
  const S = DB.settings;
  return {
    title: 'Rucksäcke', actions: h`<button class="btn primary sm" data-act="bag-new">${icon('plus')}<span>Neu</span></button>`,
    html: h`${H.bags.length > 1 ? h`<div class="btns"><button class="btn" data-act="bags-balance">${icon('repeat')} Gewicht auf Rucksäcke verteilen</button></div>` : ''}
    ${H.bags.length ? h`<div class="grid c2">${H.bags.map(b => { const st = bagStats(H, S, b); const o = byId(H.people, b.owner); return h`
      <a class="card" href="#/bags/${b.id}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:8px">
        <div class="row nowrap"><canvas data-bagthumb="${b.id}" width="160" height="160" style="width:80px;height:80px;border-radius:8px;background:var(--surface2);flex:none" aria-hidden="true"></canvas>
          <div class="grow"><div class="bold">${b.name}</div><div class="small muted">${BAG_TYPE[b.type] ? BAG_TYPE[b.type].label : b.type} · ${fmt0(b.liters)} l${o ? ' · ' + o.name : ''}</div>
          <div class="row" style="margin-top:4px">${b.suggested ? h`<span class="badge rec">Vorschlag</span>` : ''}${st.overweight ? h`<span class="badge must">Zu schwer</span>` : ''}${st.overfull ? h`<span class="badge must">Voll</span>` : ''}</div></div></div>
        <div class="row spread small"><span>${fmt(st.totalG / 1000)} kg${st.capKg ? ' von ' + fmt(st.capKg) + ' kg' : ''}</span><span>${fmt0(st.fillPct)} % Volumen</span></div>${bar(pct(st.totalG, st.capKg * 1000), st.overweight ? 'must' : st.capKg && st.totalG > st.capKg * 800 ? 'rec' : '')}
        <div class="row spread small"><span>Gepackt ${st.packed}/${st.total}</span><span>${st.missing ? st.missing + ' offen' : 'vollständig'}</span></div>${bar(st.packedPct, 'ok')}</a>`; })}</div>`
      : empty('Noch kein Rucksack angelegt.', h`<button class="btn primary" data-act="bag-new">${icon('plus')} Rucksack hinzufügen</button>`)}`,
    after: () => { $$('canvas[data-bagthumb]').forEach(cv => { const b = byId(HH().bags, cv.dataset.bagthumb); if (!b) return; const g = new Bag3D(cv, { static: true }); g.setModel(bagModel(b), b.color); g.yaw = -.6; g.pitch = .2; g.zoom = 1.1; g.setComps([], null); g.draw(); }); },
  };
});

route('/bags/:id', (id, H) => {
  const S = DB.settings; const bag = byId(H.bags, id);
  if (!bag) return { title: 'Rucksack', back: '#/bags', html: empty('Rucksack nicht gefunden.') };
  if (BAGUI.bagId !== id) { BAGUI.bagId = id; BAGUI.sel = null; BAGUI.cam = null; }
  if (BAGUI.sel && !byId(bag.comps, BAGUI.sel)) BAGUI.sel = null;
  const st = bagStats(H, S, bag); const owner = byId(H.people, bag.owner);
  const items = bagItems(H, bag);
  const selComp = BAGUI.sel ? byId(bag.comps, BAGUI.sel) : null;
  const shown = selComp ? items.filter(i => i.compId === selComp.id) : items;
  const unassigned = items.filter(i => !i.compId || !byId(bag.comps, i.compId));
  const free = freeSlots(bag);
  return {
    title: bag.name, back: '#/bags',
    html: h`<div class="bag3d"><canvas id="bagcv" tabindex="0" role="img" aria-label="Interaktive 3D-Ansicht von ${bag.name}. Ziehen zum Drehen, Tippen auf ein Fach zum Auswählen."></canvas>
      <div class="bag3d-tools" role="toolbar" aria-label="Ansicht">${[['iso', 'Schräg'], ['front', 'Vorne'], ['back', 'Hinten'], ['left', 'Links'], ['right', 'Rechts'], ['top', 'Oben']].map(([k, l]) => h`<button class="btn sm" data-act="bg-view" data-v="${k}">${l}</button>`)}
        <button class="btn sm icon" data-act="bg-zoom" data-z="1.2" aria-label="Vergrößern">${icon('plus')}</button><button class="btn sm icon" data-act="bg-zoom" data-z="0.83" aria-label="Verkleinern">${icon('minus')}</button></div></div>
    <div class="legend" aria-label="Legende"><span><i style="background:#8a97a3"></i>Leer</span><span><i style="background:#96aabe"></i>Noch nicht gepackt</span><span><i style="background:#f5a524"></i>Teilweise gepackt</span><span><i style="background:#3dd68c"></i>Gepackt</span><span><i style="background:#ff5a5f"></i>Fach überfüllt</span></div>
    <p class="small muted">Schematische Darstellung. Ziehen = drehen, Zwei-Finger-Zoom oder Mausrad = zoomen, Tippen auf ein Fach = auswählen, Doppeltippen = zurücksetzen.</p>
    ${bagWarnings(H, S, bag, st)}
    <div class="btns"><button class="btn" data-act="bag-edit" data-id="${bag.id}">${icon('edit')} Rucksack bearbeiten</button><button class="btn" data-act="comp-add" data-bag="${bag.id}">${icon('plus')} Fach hinzufügen</button></div>
    <div class="card"><div class="grid c3">
      <div class="stat"><span class="v">${fmt(st.totalG / 1000)} kg</span><span class="l">Gesamtgewicht${st.capKg ? ' (Tragfähigkeit ' + fmt(st.capKg) + ' kg)' : ''}</span></div>
      <div class="stat"><span class="v">${fmt(st.itemsG / 1000)} kg</span><span class="l">Inhalt · Rucksack leer ${fmt(bag.ownKg)} kg</span></div>
      <div class="stat"><span class="v">${fmt0(st.fillPct)} %</span><span class="l">Volumen (${fmt(st.volL)} von ${fmt(st.usableL)} l nutzbar)</span></div>
      <div class="stat"><span class="v">${st.packed}/${st.total}</span><span class="l">gepackt</span></div></div>
      <div style="margin-top:12px">${bar(st.packedPct, 'ok')}</div>
      ${owner ? h`<p class="small muted" style="margin-top:8px">Träger/in: ${owner.name}. Tragfähigkeit ist ein Richtwert und lässt sich im Personenprofil ändern.</p>` : h`<p class="small muted" style="margin-top:8px">Kein Träger zugeordnet – es gilt die Standard-Tragfähigkeit.</p>`}</div>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Fächer</h2><button class="btn sm" data-act="comp-add" data-bag="${bag.id}">${icon('plus')} Fach hinzufügen</button></div>
      <div class="list">${st.comps.map(c => h`<button class="li ${c.status === 'over' ? 'must' : c.id === BAGUI.sel ? 'rec' : ''}" data-act="bg-sel" data-id="${c.id}" aria-pressed="${c.id === BAGUI.sel}"><span class="grow"><span class="t">${c.name}</span> ${!c.slot ? h`<span class="badge">Innenfach</span>` : ''}<br><span class="s">${fmt(c.weightG / 1000)} kg · ${c.capL ? fmt0(c.fillPct) + ' % von ' + fmt(c.capL) + ' l' : fmt(c.volL) + ' l'} · ${c.packed}/${c.total} gepackt</span></span>${c.status === 'over' ? h`<span class="badge must">Überfüllt</span>` : c.status === 'packed' ? h`<span class="badge ok">Gepackt</span>` : c.status === 'partial' ? h`<span class="badge rec">Teilweise</span>` : ''}${icon('chev', 'chev')}</button>`)}</div></div>
    ${selComp ? h`<div class="card"><div class="card-head"><h3>Fach: ${selComp.name}</h3><button class="btn sm ghost" data-act="bg-sel" data-id="">Auswahl aufheben</button></div>
      <div class="btns"><button class="btn sm" data-act="comp-edit" data-bag="${bag.id}" data-id="${selComp.id}">${icon('edit')} Umbenennen / Position</button><button class="btn sm danger" data-act="comp-del" data-bag="${bag.id}" data-id="${selComp.id}">${icon('trash')} Fach entfernen</button><button class="btn sm" data-act="item-new-bag" data-bag="${bag.id}" data-comp="${selComp.id}">${icon('plus')} Gegenstand ins Fach</button></div></div>` : ''}
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>${selComp ? 'Inhalt: ' + selComp.name : 'Alle Gegenstände'}</h2><span class="badge">${shown.length}</span></div>
      <div class="list">${shown.length ? shown.sort((a, b) => (a.compId || '').localeCompare(b.compId || '') || a.name.localeCompare(b.name, 'de')).map(it => bagItemRow(H, bag, it, !selComp)) : empty(selComp ? 'Dieses Fach ist leer.' : 'Noch keine Gegenstände im Rucksack.')}</div></div>
    ${unassigned.length && selComp ? '' : ''}
    <div class="card"><h3>Fotos des echten Rucksacks</h3>${photoStrip(bag.photos, 'bag-ph-del', { id: bag.id })}<button class="btn" style="margin-top:8px" data-act="bag-ph-add" data-id="${bag.id}">${icon('camera')} Foto hinzufügen</button></div>
    <div class="card"><h3>Aktionen</h3><div class="btns"><button class="btn" data-act="bag-pack" data-id="${bag.id}">${icon('cube')} Aufteilung auf Fächer vorschlagen</button><button class="btn" data-act="bag-allpacked" data-id="${bag.id}">${icon('check')} Alles Vorhandene als gepackt markieren</button><button class="btn" data-act="bag-print" data-id="${bag.id}">${icon('print')} Packliste drucken</button><button class="btn" data-act="bag-checked" data-id="${bag.id}">${icon('clock')} Kontrolle erledigt</button><button class="btn danger" data-act="bag-del" data-id="${bag.id}">${icon('trash')} Rucksack löschen</button></div>${bag.checkedAt ? h`<p class="small muted" style="margin-top:8px">Letzte Kontrolle: ${fmtDate(bag.checkedAt)}</p>` : ''}</div>`,
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
  return h`<div class="li ${it.status === 'missing' ? 'must' : it.status === 'planned' ? 'rec' : ''}" style="flex-wrap:wrap">
    ${it.status === 'owned' ? h`<input type="checkbox" style="width:1.6rem;height:1.6rem;accent-color:var(--ok)" ${it.packed ? raw('checked') : ''} data-change="bag-pack-toggle" data-id="${it.id}" aria-label="${it.name} gepackt">` : h`<span style="width:1.6rem"></span>`}
    <a class="grow" href="#/item/${it.id}" style="color:inherit;text-decoration:none;min-width:10rem"><span class="t" ${it.packed ? raw('style="text-decoration:line-through;color:var(--muted)"') : ''}>${it.name}</span><br><span class="s">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) : ' · Gewicht fehlt'}${showComp ? ' · ' + (c ? c.name : 'ohne Fach') : ''}${it.personId ? ' · ' + personName(H, it.personId) : ''}</span></a>
    ${statusBadge(it)}<button class="btn sm" data-act="bag-item-move" data-id="${it.id}" aria-label="${it.name} verschieben">${icon('move')}<span>Verschieben</span></button></div>`;
}
INPUT['bag-pack-toggle'] = el => { const it = byId(HH().items, el.dataset.id); if (it) { it.packed = el.checked; persist(); rerender(true); } };
ACT['bg-view'] = d => { if (UI.bag3d) UI.bag3d.setView(d.v); };
ACT['bg-zoom'] = d => { if (UI.bag3d) { UI.bag3d.zoom = clamp(UI.bag3d.zoom * +d.z, .5, 3.5); UI.bag3d.invalidate(); } };
ACT['bg-sel'] = d => { saveCam(); BAGUI.sel = d.id || null; rerender(true); };
ACT['item-new-bag'] = d => ACT['item-new']({ bagId: d.bag, compId: d.comp, container: 'bag' });
ACT['bag-item-move'] = d => {
  const H = HH(); const it = byId(H.items, d.id); const bag = byId(H.bags, it.bagId);
  formDlg({ title: 'Gegenstand verschieben', body: h`<p class="muted">${it.name} (${itemQtyLabel(it)})</p>${F.select('bagId', 'In Rucksack', H.bags.map(b => [b.id, b.name]), it.bagId)}${F.select('compId', 'In Fach', [['', '– automatisch –'], ...bag.comps.map(c => [c.id, c.name])], it.compId || '')}`, ok: 'Verschieben',
    onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { it.bagId = fd.get('bagId'); it.compId = fd.get('compId') || null; it.container = 'bag'; it.packed = false; if (!it.compId) autoPack(H, byId(H.bags, it.bagId), { onlyUnassigned: true }); persist(); rerender(true); toast('Verschoben'); } });
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
  return h`<div class="stack">${F.select('type', 'Rucksacktyp', BAG_TYPES.map(t => [t.id, t.label]), b.type, { attrs: { 'data-change': 'bagform-type' } })}
    ${F.text('name', 'Name', b.name, { req: true, max: 60 })}
    <div class="form-grid">${F.text('maker', 'Hersteller', b.maker, { max: 40 })}${F.text('model', 'Modell', b.model, { max: 40 })}${F.num('liters', 'Volumen (Liter)', b.liters, { req: true, min: 1, maxv: 300 })}${F.num('ownKg', 'Eigengewicht (kg)', b.ownKg)}${F.num('maxLoadKg', 'Empfohlene Zuladung (kg, falls bekannt)', b.maxLoadKg || '')}</div>
    <div class="form-grid">${F.select('owner', 'Besitzer / Träger', ppl, b.owner || '')}${F.text('use', 'Einsatzbereich', b.use, { ph: 'z. B. Evakuierung, Auto, Zuhause', max: 60 })}${F.text('location', 'Aufbewahrungsort', b.location, { ph: 'z. B. Flur Garderobe', max: 60 })}${isNew ? F.num('compCount', 'Anzahl der Fächer', '', { hint: 'Leer lassen für typische Aufteilung', min: 1, maxv: 12, step: 1 }) : ''}</div>
    <div class="form-grid">${F.select('color', 'Farbe (3D-Ansicht)', Object.entries(BAG_COLORS).map(([k, v]) => [k, v[0]]), b.color)}</div>
    <div class="choice-grid">${F.check('hip', 'Hüftgurt vorhanden', b.hip)}${F.check('chest', 'Brustgurt vorhanden', b.chest)}${F.check('hydration', 'Trinksystem vorhanden', b.hydration)}${F.check('ext', 'Außenbefestigungen (MOLLE, Schlaufen)', b.ext)}</div>
    ${F.area('notes', 'Notizen', b.notes, { rows: 3 })}</div>`;
}
INPUT['bagform-type'] = el => { const bt = BAG_TYPE[el.value]; const f = el.closest('form'); if (!bt || !f) return; if (f.dataset.new) { f.elements.liters.value = bt.liters; f.elements.ownKg.value = bt.ownKg; } const set = (n, v) => { if (f.elements[n]) f.elements[n].checked = v; }; set('hip', bt.hip); set('chest', bt.chest); };
function saveBagFields(b, fd) {
  b.type = fd.get('type'); b.name = fd.get('name').trim(); b.maker = fd.get('maker') || ''; b.model = fd.get('model') || '';
  b.liters = num(fd.get('liters'), 30); if (b.liters <= 0) throw new Error('Das Volumen muss größer als 0 sein.');
  b.ownKg = num(fd.get('ownKg')); b.maxLoadKg = num(fd.get('maxLoadKg')); b.owner = fd.get('owner') || null; b.use = fd.get('use') || ''; b.location = fd.get('location') || ''; b.color = fd.get('color');
  b.hip = fdBool(fd, 'hip'); b.chest = fdBool(fd, 'chest'); b.hydration = fdBool(fd, 'hydration'); b.ext = fdBool(fd, 'ext'); b.notes = fd.get('notes') || ''; b.suggested = false;
  const slots = (MODEL_SLOTS[(BAG_TYPE[b.type] || BAG_TYPE.trekking).model] || []).map(s => s[0]);
  for (const c of b.comps) if (c.slot && !slots.includes(c.slot)) c.slot = null;
}
ACT['bag-new'] = () => {
  const H = HH(); const b = newBag({ name: '', type: 'trekking' }); b.name = '';
  const m = formDlg({ title: 'Rucksack hinzufügen', wide: true, body: bagFormFields(H, b, true), ok: 'Anlegen',
    onSubmit: fd => { const nb = newBag({ type: fd.get('type'), liters: num(fd.get('liters'), 30), ownKg: num(fd.get('ownKg')), compCount: Math.round(num(fd.get('compCount'))) || 0, name: 'x' }); saveBagFields(nb, fd); H.bags.push(nb); persist(); go('#/bags/' + nb.id); toast('Rucksack angelegt'); } });
  m.el.querySelector('form').dataset.new = '1';
};
ACT['bag-edit'] = d => {
  const H = HH(); const b = byId(H.bags, d.id);
  formDlg({ title: 'Rucksack bearbeiten', wide: true, body: bagFormFields(H, b, false), onSubmit: fd => { saveBagFields(b, fd); persist(); rerender(true); toast('Gespeichert'); } });
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
ACT['bag-pack'] = async d => {
  const H = HH(); const b = byId(H.bags, d.id);
  const ok = await confirmDlg('Aufteilung vorschlagen?', 'Alle Gegenstände werden anhand ihrer Art (schwer nach hinten/unten, Schnellzugriff oben, Wasser seitlich …) neu auf die Fächer verteilt. Bereits gepackte Markierungen bleiben erhalten.', { ok: 'Verteilen' });
  if (!ok) return; autoPack(H, b); persist(); rerender(true); toast('Aufteilung aktualisiert');
};
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
