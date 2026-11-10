'use strict';
/* ===== Notfall! – Kontakte, Treffpunkte, Unterkünfte, Kontaktkarten, Notfallmodus ===== */
const CT = { tab: 'contacts' };
const CONTACT_TYPES = [['ice', 'Notfallkontakt (ICE)'], ['person', 'Familie / Freunde'], ['doctor', 'Arzt'], ['vet', 'Tierarzt'], ['official', 'Behörde / Notruf'], ['other', 'Sonstiges']];
const typeLabel = t => (CONTACT_TYPES.find(x => x[0] === t) || [0, 'Kontakt'])[1];
const callBtn = (num, label) => h`<button class="btn sm primary" data-act="call" data-n="${num}" aria-label="${label || 'Anrufen'} ${num}">${icon('phone')}<span>${num}</span></button>`;
ACT['call'] = d => dial(d.n);

route('/contacts', H => {
  const tabs = [['contacts', 'Kontakte'], ['meeting', 'Treffpunkte'], ['shelter', 'Unterkünfte'], ['cards', 'Karten']];
  let body;
  if (CT.tab === 'contacts') {
    const sorted = H.contacts.slice().sort((a, b) => (a.type === 'official') - (b.type === 'official') || (a.priority || 9) - (b.priority || 9) || a.name.localeCompare(b.name, 'de'));
    body = h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Kontakte</h2><button class="btn primary sm" data-act="contact-edit" data-id="">${icon('plus')} Neu</button></div><div class="list">${sorted.length ? sorted.map(c => h`<div class="li ${c.todo && !c.phone ? 'rec' : ''}" style="flex-wrap:wrap"><button class="grow" style="background:none;border:0;text-align:left;cursor:pointer;color:inherit;min-width:11rem;padding:0" data-act="contact-edit" data-id="${c.id}"><span class="t">${c.name}</span> <span class="badge">${typeLabel(c.type)}</span>${c.priority && c.type !== 'official' ? h` <span class="badge info">Prio ${c.priority}</span>` : ''}<br><span class="s">${c.phone || (c.todo ? 'Bitte ausfüllen' : 'Keine Nummer')}${c.relation ? ' · ' + c.relation : ''}${c.alt ? ' · alternativ: ' + c.alt : ''}</span></button>${c.phone ? callBtn(c.phone, c.name) : ''}</div>`) : empty('Noch keine Kontakte.')}</div></div>`;
  } else if (CT.tab === 'meeting') {
    body = placeList('Treffpunkte', 'Wo trefft ihr euch, wenn ihr getrennt seid? Lege einen nahen (z. B. vor dem Haus) und einen entfernten Punkt fest.', H.meeting, 'meeting', 'map');
  } else if (CT.tab === 'shelter') {
    body = placeList('Ausweichunterkünfte', 'Verwandte, Freunde, Hotels oder bekannte Notunterkünfte. Vorher absprechen: Platz, Haustiere, Anfahrt.', H.shelters, 'shelter', 'building');
  } else {
    body = cardsTab(H);
  }
  return { title: 'Kontakte & Treffpunkte', back: '#/more', html: h`<div class="tabs" role="tablist">${tabs.map(([k, l]) => h`<button role="tab" aria-selected="${CT.tab === k}" data-act="ct-tab" data-tab="${k}">${l}</button>`)}</div>${body}<p class="small muted">Alles ist offline verfügbar.</p>` };
});
ACT['ct-tab'] = d => { CT.tab = d.tab; rerender(true); };
function placeList(title, hint, list, kind, ic) {
  return h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>${title}</h2><button class="btn primary sm" data-act="place-edit" data-kind="${kind}" data-id="">${icon('plus')} Neu</button></div><p class="muted small" style="padding:0 16px">${hint}</p><div class="list">${list.length ? list.map(p => h`<button class="li" data-act="place-edit" data-kind="${kind}" data-id="${p.id}">${icon(ic)}<span class="grow"><span class="t">${p.name}</span> ${p.far ? h`<span class="badge">weiter entfernt</span>` : ''}<br><span class="s">${p.address || 'Keine Adresse'}${p.phone ? ' · ' + p.phone : ''}${p.note ? ' · ' + p.note : ''}</span></span>${icon('chev', 'chev')}</button>`) : empty('Noch nichts eingetragen.')}</div></div>`;
}
ACT['contact-edit'] = d => {
  const H = HH(); const c = d.id ? byId(H.contacts, d.id) : { type: 'ice', priority: 3 };
  formDlg({ title: d.id ? 'Kontakt bearbeiten' : 'Kontakt hinzufügen', wide: true, body: h`${F.text('name', 'Name', c.name || '', { req: true })}<div class="form-grid">${F.select('type', 'Art', CONTACT_TYPES, c.type)}${F.select('priority', 'Priorität', [[1, '1 – zuerst anrufen'], [2, '2'], [3, '3'], [4, '4'], [5, '5 – zuletzt']], c.priority || 3)}${F.text('relation', 'Beziehung', c.relation || '', { ph: 'z. B. Schwester' })}</div>
    <div class="form-grid">${F.text('phone', 'Telefonnummer', c.phone || '', { type: 'tel', mode: 'tel' })}${F.text('alt', 'Alternativer Kontaktweg', c.alt || '', { ph: 'z. B. zweite Nummer, Nachbar, Messenger' })}${F.text('email', 'E-Mail', c.email || '', { type: 'email' })}</div>
    ${F.text('address', 'Adresse', c.address || '')}${F.area('notes', 'Notizen', c.notes || '', { rows: 3 })}`,
    extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'contact-del', data: { id: d.id } }] : [],
    onSubmit: fd => { const o = { name: fd.get('name').trim(), type: fd.get('type'), priority: +fd.get('priority'), relation: fd.get('relation'), phone: fd.get('phone').trim(), alt: fd.get('alt'), email: fd.get('email'), address: fd.get('address'), notes: fd.get('notes') }; if (d.id) { Object.assign(c, o); delete c.todo; } else H.contacts.push(Object.assign({ id: uid() }, o)); persist(); rerender(true); } });
};
ACT['contact-del'] = async d => { const ok = await confirmDlg('Kontakt löschen?', 'Der Kontakt wird entfernt.', { ok: 'Löschen', danger: true }); if (!ok) return; const H = HH(); H.contacts = H.contacts.filter(c => c.id !== d.id); closeAllModals(); persist(); rerender(true); };
ACT['place-edit'] = d => {
  const H = HH(); const list = d.kind === 'meeting' ? H.meeting : H.shelters; const p = d.id ? byId(list, d.id) : {};
  formDlg({ title: (d.kind === 'meeting' ? 'Treffpunkt' : 'Unterkunft') + (d.id ? ' bearbeiten' : ' hinzufügen'), body: h`${F.text('name', 'Name', p.name || '', { req: true, ph: d.kind === 'meeting' ? 'z. B. Spielplatz an der Ecke' : 'z. B. Oma Müller' })}${F.text('address', 'Adresse / Beschreibung', p.address || '')}${d.kind === 'shelter' ? F.text('phone', 'Telefon', p.phone || '', { type: 'tel' }) : ''}${F.check('far', d.kind === 'meeting' ? 'Weiter entfernter Treffpunkt (falls der nahe nicht erreichbar ist)' : 'Weiter entfernt (> 30 km)', p.far)}${F.area('note', 'Hinweise (Platz, Tiere, Anfahrt …)', p.note || '', { rows: 3 })}`,
    extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'place-del', data: { kind: d.kind, id: d.id } }] : [],
    onSubmit: fd => { const o = { name: fd.get('name').trim(), address: fd.get('address') || '', phone: fd.get('phone') || '', far: fdBool(fd, 'far'), note: fd.get('note') || '' }; if (d.id) Object.assign(p, o); else list.push(Object.assign({ id: uid() }, o)); persist(); rerender(true); } });
};
ACT['place-del'] = async d => { const H = HH(); const ok = await confirmDlg('Eintrag löschen?', 'Der Eintrag wird entfernt.', { ok: 'Löschen', danger: true }); if (!ok) return; if (d.kind === 'meeting') H.meeting = H.meeting.filter(p => p.id !== d.id); else H.shelters = H.shelters.filter(p => p.id !== d.id); closeAllModals(); persist(); rerender(true); };

function cardsTab(H) {
  return h`<div class="card"><h2>Kontaktkarte zum Ausdrucken</h2><p class="muted">Eine Karte mit Notfallkontakten, Treffpunkten und Unterkünften – für Rucksack, Portemonnaie oder Kühlschrank. Ohne Gesundheitsdaten, sofern du sie nicht ausdrücklich wählst.</p>
    <div class="stack-s">${F.check('inclMed', 'Allergien und Medikamente aufnehmen', false, { desc: 'Nur wählen, wenn du die Karte sicher aufbewahrst.' })}
    ${F.check('inclShelters', 'Treffpunkte und Unterkünfte aufnehmen', true)}</div>
    <div class="btns" style="margin-top:12px"><button class="btn primary" data-act="cards-print">${icon('print')} Karte drucken / als PDF speichern</button></div></div>`;
}
ACT['cards-print'] = () => {
  const H = HH(); const incMed = $('[name=inclMed]') && $('[name=inclMed]').checked && can('health'); const incPl = $('[name=inclShelters]') && $('[name=inclShelters]').checked;
  const cs = H.contacts.filter(c => c.phone && c.type !== 'official').sort((a, b) => (a.priority || 9) - (b.priority || 9));
  const off = H.contacts.filter(c => c.type === 'official' && c.phone);
  let html = `<h1>Notfallkarte – ${esc(H.name)}</h1><div class="card"><h2>Notfallkontakte</h2>${cs.length ? '<table>' + cs.map(c => `<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.relation || typeLabel(c.type))}</small></td><td>${esc(c.phone)}${c.alt ? '<br><small>alt.: ' + esc(c.alt) + '</small>' : ''}</td></tr>`).join('') + '</table>' : '<p>Keine Kontakte mit Nummer eingetragen.</p>'}</div><div class="card"><h2>Notruf</h2><p>${off.map(c => esc(c.phone + ' ' + c.name)).join(' · ')}</p></div>`;
  if (incPl) html += `<div class="card"><h2>Treffpunkte</h2>${H.meeting.length ? '<ul>' + H.meeting.map(p => `<li><b>${esc(p.name)}</b> ${esc(p.address || '')}${p.far ? ' (weiter entfernt)' : ''}</li>`).join('') + '</ul>' : '<p>–</p>'}<h2>Ausweichunterkünfte</h2>${H.shelters.length ? '<ul>' + H.shelters.map(p => `<li><b>${esc(p.name)}</b> ${esc(p.address || '')} ${esc(p.phone || '')}</li>`).join('') + '</ul>' : '<p>–</p>'}</div>`;
  if (incMed) html += `<div class="card"><h2>Medizinische Hinweise</h2>${H.people.map(p => `<p><b>${esc(p.name)}</b>: Allergien ${esc(p.needs.allergies || '–')}; Medikamente ${esc((p.needs.meds || []).map(m => m.name + (m.dose ? ' ' + m.dose : '')).join(', ') || '–')}; Geräte ${esc(p.needs.devices || '–')}</p>`).join('')}</div>`;
  html += `<p><small>Stand ${fmtDate(todayISO())} – erstellt mit Notfall!</small></p>`;
  printDoc('Notfallkarte', html);
};

/* ---------- Notfallmodus ---------- */
const EVAC = [
  'Warnungen und Anweisungen von Feuerwehr, Polizei und Behörden befolgen – sie haben Vorrang vor allem hier.',
  'Ruhe bewahren, alle Personen und Tiere zählen. Bei Lebensgefahr zuerst sich und andere in Sicherheit bringen.',
  'Notfallrucksäcke, Medikamente, Ausweise und Handy mitnehmen – nur wenn das gefahrlos möglich ist.',
  'Bei Brand: Türen schließen, keinen Aufzug benutzen, Haus verlassen und 112 wählen. Nicht zurückgehen.',
  'Strom, Gas und Wasser nur abstellen, wenn es gefahrlos möglich ist oder ausdrücklich angewiesen wird.',
  'Nachbarn informieren, besonders Ältere und Kinder unterstützen.',
  'Zum vereinbarten Treffpunkt gehen. Ziel nur nach amtlicher Anweisung: offizielle Sammel- oder Notunterkunft oder vorbereitete Ausweichunterkunft.',
  'Familie informieren, Handy sparsam nutzen (Flugmodus, Powerbank), Radio für amtliche Durchsagen bereithalten.',
];
route('/sos', H => {
  const limited = UI.sosLimited || (DB.users.length && !UI.userId);
  const S = DB.settings; const c = COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE;
  const medOk = !limited ? can('sos') : S.lockMedical;
  const ice = H.contacts.filter(x => x.phone && x.type !== 'official').sort((a, b) => (a.priority || 9) - (b.priority || 9));
  return {
    title: 'NOTFALLMODUS', back: limited ? null : '#/home', actions: limited ? h`<button class="btn sm" data-act="sos-exit">${icon('lock')}<span>Sperren</span></button>` : '',
    html: h`<div class="notice must" role="alert">${icon('alert')}<div><p class="nt">Bei akuter Gefahr: 112 anrufen.</p><p>Offizielle Warnungen und Anweisungen der Behörden haben immer Vorrang vor dieser App.</p></div></div>
    <div class="stack-s">${c.numbers.map(([n, t, s]) => h`<button class="callbtn ${n === '112' ? '' : 'alt'}" data-act="call" data-n="${n}">${icon('phone')}<span><span style="display:block">${n} – ${t}</span><small>${s || 'Öffnet die Wählansicht'}</small></span></button>`)}</div>
    ${ice.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Notfallkontakte</h2></div><div class="list">${ice.map(x => h`<div class="li"><span class="grow"><span class="t">${x.name}</span><br><span class="s">${x.relation || typeLabel(x.type)}${x.alt ? ' · alt.: ' + x.alt : ''}</span></span>${callBtn(x.phone, x.name)}</div>`)}</div></div>` : noticeBox('rec', 'Keine Notfallkontakte hinterlegt', 'Trage im Bereich Kontakte mindestens zwei Personen ein.')}
    <div class="card"><h2>Offizielle Warnungen</h2><p>${c.warnHint}</p><ul class="stack-s" style="padding-left:20px">${c.warn.map(([t, u]) => h`<li>${t}</li>`)}<li>Batterie- oder Kurbelradio einschalten und regionalen Sender hören.</li></ul>
      ${!limited ? h`<div class="btns">${c.warn.slice(0, 2).map(([t, u]) => h`<button class="btn sm" data-act="open-url" data-url="${u}">${icon('eye')} ${t.split(' – ')[0]}</button>`)}</div>` : ''}</div>
    ${H.meeting.length || H.shelters.length ? h`<div class="card"><h2>Treffpunkte und Unterkünfte</h2><div class="stack-s">${H.meeting.map(p => h`<div><b>${icon('map')} ${p.name}</b> ${p.far ? h`<span class="badge">weiter entfernt</span>` : ''}<br><span class="muted">${p.address || ''} ${p.note || ''}</span></div>`)}${H.shelters.map(p => h`<div><b>${icon('building')} ${p.name}</b><br><span class="muted">${p.address || ''} ${p.phone || ''} ${p.note || ''}</span></div>`)}</div></div>` : ''}
    ${medOk ? h`<div class="card"><h2>Medizinische Hinweise</h2><div class="stack-s">${H.people.map(p => h`<div><b>${p.name}</b> <span class="muted">(${p.age} J.)</span><br>Allergien: ${p.needs.allergies || '–'}<br>Medikamente: ${(p.needs.meds || []).map(m => m.name + (m.dose ? ' ' + m.dose : '')).join(', ') || '–'}<br>Geräte/Hilfsmittel: ${[p.needs.devices, p.needs.aids].filter(Boolean).join(', ') || '–'}${p.needs.care ? h`<br>Pflege: ${p.needs.care}` : ''}</div>`)}${H.pets.length ? h`<div><b>Haustiere:</b> ${H.pets.map(p => p.species + (p.name ? ' ' + p.name : '') + (p.needs ? ' (' + p.needs + ')' : '')).join(', ')}</div>` : ''}</div></div>` : ''}
    ${!limited ? h`<div class="card"><h2>Mein Notfallplan</h2><p class="muted">${H.cfg ? 'Strategie: ' + (H.cfg.strategies || []).map(s => STRATEGIES.find(x => x.id === s).label).join('; ') : 'Noch keine Strategie gewählt.'}</p>${H.plan.strategyNote ? h`<p style="white-space:pre-wrap">${H.plan.strategyNote}</p>` : ''}<button class="btn sm" data-act="plan-note">${icon('edit')} Eigene Notizen zum Plan</button></div>
      <div class="card"><h2>Packstatus der Rucksäcke</h2>${H.bags.length ? h`<div class="stack">${H.bags.map(b => { const st = bagStats(H, S, b); const miss = bagItems(H, b).filter(i => i.status !== 'owned' && i.prio === 'must').slice(0, 4); return h`<a href="#/bags/${b.id}" style="color:inherit;text-decoration:none"><div class="row spread"><b>${b.name}</b><span>${st.packed}/${st.total}</span></div>${bar(st.packedPct, 'ok')}${miss.length ? h`<div class="small" style="color:var(--must)">Fehlt noch: ${miss.map(i => i.name).join(', ')}</div>` : ''}</a>`; })}</div>` : empty('Keine Rucksäcke.')}</div>
      ${can('vault') ? h`<a class="btn block" href="#/safe">${icon('lock')} Dokumente (Safe)</a>` : ''}` : ''}
    <div class="card"><h2>Evakuierungs-Checkliste</h2><p class="small muted">Allgemeine Hinweise ohne Anspruch auf Vollständigkeit. Es gilt immer die konkrete Lage und die Anweisung der Einsatzkräfte.</p><ul class="stack-s" style="padding-left:20px">${EVAC.map(e => h`<li>${e}</li>`)}</ul></div>`,
  };
});
ACT['sos-exit'] = () => { UI.sosLimited = false; UI.locked = true; go('#/home'); render(); };
ACT['plan-note'] = async () => { const H = HH(); const v = await promptDlg('Notizen zum Plan', 'Strategie, Treffpunkte, Absprachen …', H.plan.strategyNote || ''); if (v === null) return; H.plan.strategyNote = v; persist(); rerender(true); };
