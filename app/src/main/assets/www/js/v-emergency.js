'use strict';
/* ===== Notfall! – Notfallmodus und Treffpunkte ===== */
ACT['call'] = d => dial(d.n);

route('/places', H => ({
  title: 'Treffpunkte', back: '#/more', actions: h`<button class="btn primary sm" data-act="place-edit" data-kind="meeting" data-id="">${icon('plus')}<span>Neu</span></button>`,
  html: h`${placeList(H.meeting, 'meeting', 'map')}${H.shelters.length ? h`<h2>Ausweichunterkünfte</h2>${placeList(H.shelters, 'shelter', 'building')}` : ''}`,
}));
function placeList(list, kind, ic) {
  return list.length ? list.map(p => h`<button class="tile" data-act="place-edit" data-kind="${kind}" data-id="${p.id}"><span class="ti">${icon(ic)}</span><span class="grow"><span class="tt">${p.name}</span><br><span class="ts">${[p.address, p.far ? 'weiter entfernt' : '', p.note].filter(Boolean).join(' · ')}</span></span></button>`) : empty('Noch kein Treffpunkt.');
}
ACT['place-edit'] = d => {
  const H = HH(); const list = d.kind === 'meeting' ? H.meeting : H.shelters; const p = d.id ? byId(list, d.id) : {};
  formDlg({ title: d.kind === 'meeting' ? 'Treffpunkt' : 'Unterkunft', body: h`${F.text('name', 'Name', p.name || '', { req: true, ph: 'z. B. Spielplatz an der Ecke' })}${F.text('address', 'Adresse / Beschreibung', p.address || '')}${F.check('far', 'Weiter entfernt (falls der nahe nicht erreichbar ist)', p.far)}${F.text('note', 'Notiz', p.note || '')}`,
    extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'place-del', data: { kind: d.kind, id: d.id } }] : [],
    onSubmit: fd => { const o = { name: fd.get('name').trim(), address: fd.get('address') || '', far: fdBool(fd, 'far'), note: fd.get('note') || '' }; if (d.id) Object.assign(p, o); else list.push(Object.assign({ id: uid() }, o)); persist(); rerender(true); } });
};
ACT['place-del'] = d => { const H = HH(); if (d.kind === 'meeting') H.meeting = H.meeting.filter(p => p.id !== d.id); else H.shelters = H.shelters.filter(p => p.id !== d.id); closeAllModals(); persist(); rerender(true); };

/* ---------- Notfallmodus: Notruf, freigegebene Pässe, Treffpunkte, Taschen ---------- */
route('/sos', H => {
  const limited = UI.sosLimited || (DB.users.length && !UI.userId);
  const S = DB.settings; const c = COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE;
  return {
    title: 'NOTFALL', back: limited ? null : '#/home', actions: limited ? h`<button class="btn sm" data-act="sos-exit">${icon('lock')}<span>Sperren</span></button>` : '',
    html: h`<div class="notice must" role="alert">${icon('alert')}<div><p class="nt">Akute Gefahr: 112</p><p>Anweisungen der Behörden haben Vorrang.</p></div></div>
    <div class="stack-s">${c.numbers.map(([n, t, s]) => h`<button class="callbtn ${n === '112' ? '' : 'alt'}" data-act="call" data-n="${n}">${icon('phone')}<span><span style="display:block">${n} – ${t}</span>${s ? h`<small>${s}</small>` : ''}</span></button>`)}</div>
    ${H.people.map(p => iceCard(H, p, { link: !limited }))}
    ${H.meeting.length ? h`<div class="card"><h2>Treffpunkte</h2><div class="stack-s" style="margin-top:8px">${H.meeting.map(p => h`<div><b>${p.name}</b>${p.far ? h` <span class="badge">weiter entfernt</span>` : ''}<br><span class="muted">${[p.address, p.note].filter(Boolean).join(' · ')}</span></div>`)}</div></div>` : ''}
    ${H.bags.length ? h`<div class="card"><h2>Taschen</h2><div class="stack" style="margin-top:8px">${H.bags.map(b => { const st = bagStats(H, S, b); return h`<div><div class="row spread"><b>${b.name}</b><span class="mono">${st.packed}/${st.total}</span></div><div class="muted small">${b.location || 'Lagerort nicht eingetragen'}</div>${bar(st.packedPct, 'ok')}</div>`; })}</div></div>` : ''}
    <p class="muted small">${c.warnHint}</p>`,
  };
});
ACT['sos-exit'] = () => { UI.sosLimited = false; UI.locked = true; go('#/home'); render(); };
