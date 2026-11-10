'use strict';
/* ===== Notfall! – Karte & Treffpunkte ===== */
const MAPUI = { lat: null, lon: null, z: null, pick: null, sel: null };
const mapPacks = () => DB.maps || [];
const placeCoord = p => (typeof p.lat === 'number' && typeof p.lon === 'number') ? { lat: p.lat, lon: p.lon } : null;
const fmtMB = b => b >= 1048576 ? fmt(b / 1048576) + ' MB' : fmt0(b / 1024) + ' KB';

route('/map', H => {
  const packs = mapPacks(); const pick = MAPUI.pick ? (byId(H.meeting, MAPUI.pick) || byId(H.shelters, MAPUI.pick)) : null;
  const pts = H.meeting.concat(H.shelters);
  return {
    title: 'Karte & Treffpunkte', back: '#/more',
    html: h`${pick ? h`<div class="notice info">${icon('map')}<div class="grow"><p class="nt">Position für „${pick.name}“ antippen</p></div><button class="btn sm" data-act="map-pick-cancel">Abbrechen</button></div>` : ''}
    <div class="mapbox"><canvas id="mapcv" aria-label="Karte" role="img"></canvas>
      <div class="mapctl"><button class="btn icon" data-act="map-zoom" data-d="1" aria-label="Vergrößern">${icon('plus')}</button><button class="btn icon" data-act="map-zoom" data-d="-1" aria-label="Verkleinern">${icon('minus')}</button><button class="btn icon" data-act="map-fit" aria-label="Alles zeigen">${icon('grid')}</button></div>
      <div class="mapattr" id="mapattr"></div></div>
    ${!packs.length && !DB.settings.mapOnline ? h`<p class="muted small">Noch keine Karte gespeichert. Treffpunkte funktionieren auch ohne Karte.</p>` : ''}
    <div class="row spread"><h2>Treffpunkte</h2>${canPlaceSearch() ? h`<button class="btn sm" data-act="map-search">${icon('search')} In der Nähe suchen</button>` : ''}</div>
    ${pts.length ? pts.map(p => { const c = placeCoord(p); const kind = H.meeting.includes(p) ? 'meeting' : 'shelter'; return h`<div class="tile"><span class="ti">${icon(kind === 'meeting' ? 'map' : 'building')}</span><button class="grow" style="background:none;border:0;text-align:left;color:inherit;cursor:pointer;padding:0;font:inherit" data-act="map-goto" data-id="${p.id}"><span class="tt">${p.name}</span><br><span class="ts">${[p.address, c ? 'Position gesetzt' : 'ohne Position', p.far ? 'weiter entfernt' : ''].filter(Boolean).join(' · ')}</span></button><button class="btn icon sm" data-act="place-edit" data-kind="${kind}" data-id="${p.id}" aria-label="${p.name} bearbeiten">${icon('edit')}</button></div>`; }) : empty('Noch kein Treffpunkt.')}
    <h2>Gespeicherte Karten</h2>
    ${packs.length ? packs.map(p => h`<div class="tile"><span class="ti">${icon('map')}</span><span class="grow"><span class="tt">${p.name}</span><br><span class="ts">Zoom ${p.minz}–${p.maxz} · ${fmt0(p.tiles)} Kacheln${p.bytes ? ' · ' + fmtMB(p.bytes) : ''}${p.attribution ? ' · ' + p.attribution : ''}</span></span><button class="btn icon sm" data-act="map-show" data-id="${p.id}" aria-label="Anzeigen">${icon('eye')}</button><button class="btn icon sm danger" data-act="map-del" data-id="${p.id}" aria-label="Löschen">${icon('trash')}</button></div>`) : empty('Keine Karte gespeichert.')}
    <div class="btns"><button class="btn" data-act="map-server">${icon('gear')} Kartenserver</button>${IS_NATIVE ? h`<button class="btn" data-act="map-import">${icon('upload')} MBTiles-Datei importieren</button>` : ''}</div>
    <div class="actionbar"><button class="btn lg" data-act="place-edit" data-kind="meeting" data-id="">${icon('plus')} Treffpunkt</button><button class="btn primary lg" data-act="map-dl">${icon('download')} Gebiet laden</button></div>`,
    after: () => {
      const cv = $('#mapcv'); if (!cv) return;
      const mv = new MapView(cv, {
        packs: mapPacks, online: () => DB.settings.mapOnline && DB.settings.mapUrl ? DB.settings.mapUrl : null, selection: () => MAPUI.sel,
        markers: () => HH().meeting.concat(HH().shelters).filter(placeCoord).map(p => ({ id: p.id, lat: p.lat, lon: p.lon, label: p.name.slice(0, 22), color: HH().meeting.includes(p) ? '#ff5a5f' : '#3b82f6' })),
        onMove: () => { MAPUI.lat = mv.lat; MAPUI.lon = mv.lon; MAPUI.z = mv.z; },
        onTap: (lat, lon, hitId) => {
          if (MAPUI.pick) { const H = HH(); const p = byId(H.meeting, MAPUI.pick) || byId(H.shelters, MAPUI.pick); if (p) { p.lat = +lat.toFixed(6); p.lon = +lon.toFixed(6); persist(); } MAPUI.pick = null; MAPUI.lat = lat; MAPUI.lon = lon; rerender(true); toast('Position gesetzt'); return; }
          if (hitId) { const H = HH(); const kind = byId(H.meeting, hitId) ? 'meeting' : 'shelter'; ACT['place-edit']({ kind, id: hitId }); }
        },
      });
      UI.mapView = mv;
      if (MAPUI.lat !== null) mv.setView(MAPUI.lat, MAPUI.lon, MAPUI.z);
      else { const all = HH().meeting.concat(HH().shelters).filter(placeCoord); if (packs.length) mv.fit(packs[packs.length - 1].bbox, 0); else if (all.length) mv.setView(all[0].lat, all[0].lon, 13); }
      MAPUI.lat = mv.lat; MAPUI.lon = mv.lon; MAPUI.z = mv.z;
      const attrs = Array.from(new Set(packs.map(p => p.attribution).filter(Boolean))); if (DB.settings.mapOnline && DB.settings.mapAttr) attrs.push(DB.settings.mapAttr);
      const at = $('#mapattr'); if (at) at.textContent = attrs.join(' · ');
    },
  };
});
route('/places', H => { history.replaceState(null, '', '#/map'); return ROUTES.find(r => r.re.test('/map')).fn(H); });

ACT['map-search'] = () => {
  const H = HH(); const c = homeCoord(H) || (MAPUI.lat !== null && MAPUI.z >= 11 ? { lat: MAPUI.lat, lon: MAPUI.lon } : null);
  if (!c) { toast('Erst den Standort im Haushalt bestimmen oder die Karte auf deine Gegend stellen.'); return; }
  openPlaceSearch({ center: c, onPick: p => {
    const H2 = HH(); H2.meeting.push({ id: uid(), name: p.name, lat: p.lat, lon: p.lon, far: (p.dist || 0) > 2000 });
    MAPUI.lat = p.lat; MAPUI.lon = p.lon; MAPUI.z = Math.max(MAPUI.z || 0, 15); persist(); rerender(true); toast(p.name + ' als Treffpunkt gespeichert');
  } });
};
ACT['map-zoom'] = d => UI.mapView && UI.mapView.zoomBy(+d.d);
ACT['map-fit'] = () => { const mv = UI.mapView; if (!mv) return; const pts = HH().meeting.concat(HH().shelters).filter(placeCoord); const bs = mapPacks().map(p => p.bbox).concat(pts.map(p => ({ w: p.lon - .01, e: p.lon + .01, s: p.lat - .01, n: p.lat + .01 }))); if (!bs.length) return; mv.fit({ w: Math.min(...bs.map(b => b.w)), e: Math.max(...bs.map(b => b.e)), s: Math.min(...bs.map(b => b.s)), n: Math.max(...bs.map(b => b.n)) }); };
ACT['map-show'] = d => { const p = mapPacks().find(x => x.id === d.id); if (p && UI.mapView) { UI.mapView.fit(p.bbox, 0); scroller().scrollTop = 0; } };
ACT['map-goto'] = d => { const H = HH(); const p = byId(H.meeting, d.id) || byId(H.shelters, d.id); const c = p && placeCoord(p); if (!c) { MAPUI.pick = d.id; rerender(); return; } if (UI.mapView) { UI.mapView.setView(c.lat, c.lon, Math.max(UI.mapView.z, 14)); scroller().scrollTop = 0; } };
ACT['map-pick-cancel'] = () => { MAPUI.pick = null; rerender(true); };
ACT['map-del'] = async d => {
  const p = mapPacks().find(x => x.id === d.id); const ok = await confirmDlg('Karte löschen?', `„${p.name}“ wird vom Gerät gelöscht.`, { ok: 'Löschen', danger: true }); if (!ok) return;
  await MapTiles.del(p.id); DB.maps = mapPacks().filter(x => x.id !== p.id); persist(); rerender(true);
};
ACT['map-server'] = () => {
  const S = DB.settings;
  formDlg({ title: 'Kartenserver', body: h`${F.text('url', 'Kachel-Adresse', S.mapUrl || '', { ph: 'https://…/{z}/{x}/{y}.png' })}${F.text('attr', 'Quellenangabe der Karte', S.mapAttr || '', { ph: 'z. B. © OpenStreetMap-Mitwirkende' })}
    ${F.check('online', 'Online-Vorschau zum Auswählen des Gebiets', !!S.mapOnline)}
    <p class="small muted">Nur Anbieter nutzen, deren Bedingungen das Speichern für die Offline-Nutzung erlauben. Die öffentlichen OpenStreetMap-Server erlauben keine Massen-Downloads.</p>`,
    onSubmit: fd => { const url = (fd.get('url') || '').trim(); if (url) { const e = checkTileTemplate(url); if (e) throw new Error(e); } S.mapUrl = url; S.mapAttr = (fd.get('attr') || '').trim(); S.mapOnline = !!url && fdBool(fd, 'online'); persist(); rerender(true); } });
};
ACT['map-dl'] = () => {
  const H = HH(); const S = DB.settings; const mv = UI.mapView; const pts = H.meeting.concat(H.shelters).filter(placeCoord);
  const viewOk = mv && (mv.shown > 0 || pts.length || mapPacks().length);
  const ptOpts = [['', '– Koordinaten eingeben –'], ...pts.map(p => [p.id, p.name])];
  const m = formDlg({ title: 'Gebiet laden', ok: 'Herunterladen', body: h`
    ${F.select('area', 'Gebiet', [...(viewOk ? [['view', 'Sichtbarer Kartenausschnitt']] : []), ['point', 'Umkreis um einen Ort']], viewOk ? 'view' : 'point', { attrs: { 'data-change': 'mapdl-calc' } })}
    <div id="dlpoint" class="stack" ${viewOk ? raw('hidden') : ''}>${F.select('pt', 'Ort', ptOpts, pts[0] ? pts[0].id : '', { attrs: { 'data-change': 'mapdl-calc' } })}${F.text('coord', 'Koordinaten (Breite, Länge)', '', { ph: '52.5200, 13.4050', attrs: { 'data-input': 'mapdl-calc' } })}${F.select('km', 'Umkreis', [[2, '2 km'], [5, '5 km'], [10, '10 km'], [20, '20 km'], [40, '40 km']], 5, { attrs: { 'data-change': 'mapdl-calc' } })}</div>
    ${F.select('maxz', 'Genauigkeit', [[12, 'Übersicht (Zoom 12)'], [13, 'Ort (13)'], [14, 'Stadtteil (14)'], [15, 'Straßen (15)'], [16, 'Detail (16)'], [17, 'Sehr genau (17)']], 15, { attrs: { 'data-change': 'mapdl-calc' } })}
    ${F.text('name', 'Name', 'Karte ' + (mapPacks().length + 1), { req: true, max: 40 })}
    ${F.text('url', 'Kachel-Adresse', S.mapUrl || '', { req: true, ph: 'https://…/{z}/{x}/{y}.png' })}${F.text('attr', 'Quellenangabe', S.mapAttr || '')}
    ${F.check('terms', 'Der Anbieter erlaubt das Speichern für die Offline-Nutzung', false)}
    <p class="bold" id="dlest"></p>`,
    onSubmit: async fd => {
      const o = mapdlRead(fd); if (!o.bbox) throw new Error('Ort oder Koordinaten fehlen.');
      const e = checkTileTemplate(o.url); if (e) throw new Error(e); if (!fdBool(fd, 'terms')) throw new Error('Bitte die Bedingungen des Anbieters bestätigen.');
      S.mapUrl = o.url; S.mapAttr = o.attribution; persist();
      const prog = openModal({ title: 'Karte wird geladen', body: h`<div id="dlprog">${bar(0)}<p class="muted small" style="margin-top:8px">0 von ${fmt0(o.total)} Kacheln</p></div>`, foot: dlgButtons([{ label: 'Abbrechen', cls: 'danger', act: 'map-dl-cancel' }]) });
      try {
        const pack = await downloadRegion(o, j => { const box = $('#dlprog'); if (box) box.innerHTML = bar(pct(j.done + j.fail, j.total)).s + `<p class="muted small" style="margin-top:8px">${fmt0(j.done)} von ${fmt0(j.total)} Kacheln${j.fail ? ' · ' + j.fail + ' Fehler' : ''}</p>`; });
        DB.maps = mapPacks().concat([pack]); MAPUI.lat = null; MAPUI.sel = null; persist(); closeModal(prog); toast(`Gespeichert: ${fmt0(pack.tiles)} Kacheln${pack.failed ? ', ' + pack.failed + ' fehlgeschlagen' : ''}`); rerender(true);
      } catch (err) { closeModal(prog); toast(err.message); }
    },
  });
  m.el.querySelector('form').dataset.mapdl = '1'; INPUT['mapdl-calc'](m.el.querySelector('[name=area]'));
};
function mapdlRead(fd) {
  const H = HH(); let bbox = null;
  if (fd.get('area') === 'view' && UI.mapView) { const b = UI.mapView.bbox(); bbox = { w: b.w, e: b.e, s: b.s, n: b.n }; }
  else { const c = parseCoord(fd.get('coord')) || placeCoord(byId(H.meeting, fd.get('pt')) || byId(H.shelters, fd.get('pt')) || {}); if (c) bbox = bboxAround(c.lat, c.lon, +fd.get('km') || 5); }
  const maxz = clamp(+fd.get('maxz') || 15, 6, MAP_LIMIT.maxZoom); const minz = Math.max(4, maxz - 9);
  return { bbox, minz, maxz, name: (fd.get('name') || 'Karte').trim(), url: (fd.get('url') || '').trim(), attribution: (fd.get('attr') || '').trim(), total: bbox ? countTiles(bbox, minz, maxz) : 0 };
}
INPUT['mapdl-calc'] = el => {
  const f = el && el.closest('form'); if (!f) return; const fd = new FormData(f);
  const pt = $('#dlpoint', f); if (pt) pt.hidden = fd.get('area') === 'view';
  const o = mapdlRead(fd); MAPUI.sel = o.bbox; if (UI.mapView) UI.mapView.invalidate();
  const est = $('#dlest', f); if (!est) return;
  est.textContent = !o.bbox ? 'Ort oder Koordinaten fehlen.' : o.total > MAP_LIMIT.tiles ? `${fmt0(o.total)} Kacheln – zu groß (max. ${fmt0(MAP_LIMIT.tiles)})` : `ca. ${fmt0(o.total)} Kacheln · ca. ${fmtMB(o.total * 20 * 1024)}`;
  est.style.color = o.total > MAP_LIMIT.tiles ? 'var(--must)' : '';
};
ACT['map-dl-cancel'] = () => { if (MapDownload.running) MapDownload.running.cancel = true; };
ACT['map-import'] = async () => {
  const id = 'i' + uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const prog = openModal({ title: 'Karte importieren', body: h`<div id="improg"><p class="muted">Datei auswählen …</p></div>` });
  window.__mapProgress = (done, total) => { const b = $('#improg'); if (b) b.innerHTML = bar(pct(done, total)).s + `<p class="muted small" style="margin-top:8px">${fmt0(done)} von ${fmt0(total)} Kacheln</p>`; };
  const r = await nativeAsync('mapImport', id); closeModal(prog);
  if (!r.ok) { if (r.error !== 'abgebrochen') toast(r.error || 'Import fehlgeschlagen'); return; }
  const m = r.meta || {}; const bb = String(m.bounds || '').split(',').map(Number);
  const bbox = bb.length === 4 && bb.every(Number.isFinite) ? { w: bb[0], s: bb[1], e: bb[2], n: bb[3] } : { w: -180, s: -MAX_LAT, e: 180, n: MAX_LAT };
  DB.maps = mapPacks().concat([{ id, name: m.name || 'Importierte Karte', bbox, minz: +m.minzoomReal || +m.minzoom || 0, maxz: +m.maxzoomReal || +m.maxzoom || 14, tiles: +m.tiles || 0, bytes: +m.bytes || 0, attribution: m.attribution ? String(m.attribution).replace(/<[^>]*>/g, '') : '', source: 'MBTiles', created: new Date().toISOString() }]);
  persist(); MAPUI.lat = null; rerender(true); toast('Karte importiert');
};

/* ---- Treffpunkt bearbeiten (inkl. Position) ---- */
ACT['place-edit'] = d => {
  const H = HH(); const list = d.kind === 'shelter' ? H.shelters : H.meeting; const p = d.id ? byId(list, d.id) : {};
  const c = placeCoord(p);
  formDlg({ title: d.kind === 'shelter' ? 'Unterkunft' : 'Treffpunkt', body: h`${F.text('name', 'Name', p.name || '', { req: true, ph: 'z. B. Spielplatz an der Ecke' })}${F.text('address', 'Adresse / Beschreibung', p.address || '')}
      ${F.text('coord', 'Position (Breite, Länge)', c ? `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}` : '', { ph: 'leer lassen oder auf der Karte wählen' })}
      ${F.check('far', 'Weiter entfernt (falls der nahe nicht erreichbar ist)', p.far)}${F.text('note', 'Notiz', p.note || '')}`,
    extraFoot: [...(d.id ? [{ label: 'Löschen', cls: 'danger', act: 'place-del', data: { kind: d.kind, id: d.id } }] : []), { label: 'Auf Karte wählen', act: 'place-pick', data: { kind: d.kind, id: d.id || '' } }],
    onSubmit: fd => {
      const o = { name: fd.get('name').trim(), address: fd.get('address') || '', far: fdBool(fd, 'far'), note: fd.get('note') || '' };
      const raw = (fd.get('coord') || '').trim(); if (raw) { const cc = parseCoord(raw); if (!cc) throw new Error('Position: z. B. 52.52, 13.405'); o.lat = cc.lat; o.lon = cc.lon; } else { o.lat = undefined; o.lon = undefined; }
      let target = p; if (d.id) Object.assign(p, o); else { target = Object.assign({ id: uid() }, o); list.push(target); }
      if (o.lat === undefined) { delete target.lat; delete target.lon; }
      persist(); rerender(true);
    } });
};
ACT['place-pick'] = d => {
  const H = HH(); const form = $('.modal form'); const fd = form ? new FormData(form) : null;
  let id = d.id;
  if (!id) { const name = fd && fd.get('name') ? fd.get('name').trim() : ''; if (!name) { toast('Erst einen Namen eingeben.'); return; } const p = { id: uid(), name, address: fd.get('address') || '', far: fdBool(fd, 'far'), note: fd.get('note') || '' }; (d.kind === 'shelter' ? H.shelters : H.meeting).push(p); id = p.id; persist(); }
  closeAllModals(); MAPUI.pick = id; go('#/map');
};
ACT['place-del'] = d => { const H = HH(); if (d.kind === 'meeting') H.meeting = H.meeting.filter(p => p.id !== d.id); else H.shelters = H.shelters.filter(p => p.id !== d.id); closeAllModals(); persist(); rerender(true); };
