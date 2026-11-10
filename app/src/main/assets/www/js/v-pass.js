'use strict';
/* ===== Notfall! – Personen, Notfallpass, Kontakte, QR-Notfallkarte ===== */
const ROLES = ['Papa', 'Mama', 'Kind', 'Oma', 'Opa', 'Onkel', 'Tante', 'Partner/in', 'Geschwister', 'Betreuung'];
const ORGAN = [['', 'Keine Angabe'], ['erklaerung', 'Erklärung vorhanden'], ['ja', 'Ja'], ['nein', 'Nein'], ['eingeschraenkt', 'Eingeschränkt'], ['unbekannt', 'Unbekannt']];
const organLabel = v => (ORGAN.find(o => o[0] === v) || [0, ''])[1];
const initials = n => String(n || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const avatar = (photo, name, cls = '') => h`<span class="avatar ${cls}">${photo ? h`<img data-ph="${photo}" alt="">` : initials(name)}</span>`;
function personAge(p) { const a = ageFromBirth(p.birth); return a === null ? p.age : a; }
function passContacts(H, p) { return (p.passContacts || []).map(id => byId(H.contacts, id)).filter(Boolean).slice(0, 3); }

/* Beschriftungen fuer Pass, Karte und QR (Deutsch/Englisch) */
const PL = {
  de: { title: 'NOTFALLPASS', call: 'Im Notfall bitte anrufen', born: 'Geboren', allergies: 'Allergien', conditions: 'Krankheiten', meds: 'Medikamente', aids: 'Hilfsmittel', blood: 'Blutgruppe', organ: 'Organspende', notes: 'Hinweise', pickup: 'Abholberechtigt', doctor: 'Arzt/Ärztin', contact: 'Kontakt', emerg: 'Notfallmedikament', doc: 'Dokument', stand: 'Stand', qrnote: 'Der QR-Code enthält dieselben Angaben als Text.', years: 'Jahre' },
  en: { title: 'EMERGENCY CARD', call: 'In an emergency please call', born: 'Born', allergies: 'Allergies', conditions: 'Conditions', meds: 'Medication', aids: 'Medical aids', blood: 'Blood type', organ: 'Organ donation', notes: 'Notes', pickup: 'Authorised to pick up', doctor: 'Doctor', contact: 'Contact', emerg: 'emergency medication', doc: 'document', stand: 'As of', qrnote: 'The QR code contains the same information as text.', years: 'years' },
};
const ORGAN_EN = { erklaerung: 'Declaration exists', ja: 'Yes', nein: 'No', eingeschraenkt: 'Restricted', unbekannt: 'Unknown' };
/* Nur ausdruecklich freigegebene (und nicht ausgeblendete) Angaben – das sehen Helfer und Fremde */
function passShared(H, p, lang = 'de') {
  const s = p.share || {}, n = p.needs || {}, hd = p.hide || {}, L = PL[lang] || PL.de; const out = [];
  const on = k => s[k] && !hd[k];
  if (on('birth') && p.birth) out.push([L.born, lang === 'en' ? p.birth : fmtDate(p.birth)]);
  if (on('allergies') && n.allergies) out.push([L.allergies, n.allergies]);
  if (on('conditions') && n.conditions) out.push([L.conditions, n.conditions]);
  if (on('meds') && (n.meds || []).length) out.push([L.meds, n.meds.map(m => m.name + (m.dose ? ' ' + m.dose : '') + (m.emergency ? ' (' + L.emerg + ')' : '') + (m.purpose ? ' – ' + m.purpose : '')).join('; ')]);
  if (on('aids') && (n.aids || n.devices)) out.push([L.aids, [n.aids, n.devices].filter(Boolean).join(', ')]);
  if (on('blood') && n.blood) out.push([L.blood, n.blood]);
  if (on('doctor') && p.doctor) out.push([L.doctor, p.doctor]);
  if (on('pickup') && p.pickup) out.push([L.pickup, p.pickup]);
  if (on('organ') && p.organ.status) out.push([L.organ, (lang === 'en' ? ORGAN_EN[p.organ.status] : organLabel(p.organ.status)) + (p.organ.place ? ' – ' + L.doc + ': ' + p.organ.place : '')]);
  if (on('notes') && n.notes) out.push([L.notes, n.notes]);
  for (const c of (p.custom || [])) if (c.share && c.label && c.value) out.push([c.label, c.value]);
  return out;
}
function passQrText(H, p, lang = (p.card && p.card.lang) || 'de') {
  const L = PL[lang] || PL.de;
  const lines = [L.title, p.name + (p.role ? ' (' + p.role + ')' : '')];
  passContacts(H, p).forEach((c, i) => lines.push(`${L.contact} ${i + 1}: ${c.name}${c.relation ? ' (' + c.relation + ')' : ''} ${c.phone || ''}`.trim()));
  for (const [k, v] of passShared(H, p, lang)) lines.push(k + ': ' + v);
  let t = lines.join('\n'); let cut = false;
  while (enc(t).length > 700) { t = t.slice(0, -20); cut = true; }
  return { text: cut ? t + '…' : t, cut };
}
function qrSvg(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return raw(q.createSvgTag({ cellSize: 4, margin: 4, scalable: true })); }

function iceCard(H, p, opts = {}) {
  const rows = passShared(H, p); const cs = passContacts(H, p);
  return h`<div class="card"><div class="row nowrap">${avatar(p.share.photo ? p.photo : null, p.name, 'xl')}<div class="grow"><h2>${p.name}</h2><p class="muted">${[p.role, p.share.birth && p.birth ? personAge(p) + ' Jahre' : ''].filter(Boolean).join(' · ')}</p></div></div>
    ${rows.length ? h`<table class="tbl" style="margin-top:8px"><tbody>${rows.map(([k, v]) => h`<tr><th>${k}</th><td class="bold">${v}</td></tr>`)}</tbody></table>` : ''}
    ${cs.length ? h`<div class="stack-s" style="margin-top:12px">${cs.map((c, i) => h`<div class="row nowrap">${avatar(c.photo, c.name)}<span class="grow"><span class="bold">${i + 1}. ${c.name}</span><br><span class="muted small">${c.relation || ''}${c.alt ? ' · ' + c.alt : ''}</span></span>${c.phone ? h`<button class="btn primary" data-act="call" data-n="${c.phone}" aria-label="${c.name} anrufen">${icon('phone')}<span>${c.phone}</span></button>` : ''}</div>`)}</div>` : (opts.hint ? h`<p class="muted small" style="margin-top:8px">Noch keine Kontakte gewählt.</p>` : '')}
    ${p.passUpdated || p.confirmedBy ? h`<p class="muted small" style="margin-top:8px">${[p.passUpdated ? 'Stand ' + fmtDate(p.passUpdated) : '', p.confirmedBy ? 'bestätigt von ' + p.confirmedBy : ''].filter(Boolean).join(' · ')}</p>` : ''}
    ${opts.link ? h`<div class="btns" style="margin-top:12px"><a class="btn" href="#/ice/${p.id}">${icon('scan')} Karte & QR</a><a class="btn" href="#/pass/${p.id}">${icon('edit')} Bearbeiten</a></div>` : ''}</div>`;
}

/* ---------- Übersicht ---------- */
route('/pass', H => {
  const cs = H.contacts.filter(c => c.type !== 'official');
  return {
    title: 'Notfallpass & Kontakte',
    html: h`${H.people.map(p => h`<a class="tile" href="#/pass/${p.id}">${avatar(p.photo, p.name)}<span class="grow"><span class="tt">${p.name}</span><br><span class="ts">${[p.role, personAge(p) !== '' ? personAge(p) + ' J.' : '', passContacts(H, p).length + ' Kontakte'].filter(Boolean).join(' · ')}</span></span>${icon('chev', 'chev')}</a>`)}
    <button class="tile blue" data-act="person-new"><span class="ti">${icon('plus')}</span><span class="grow"><span class="tt">Person hinzufügen</span></span></button>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Kontakte</h2><button class="btn sm primary" data-act="contact-edit" data-id="">${icon('plus')} Neu</button></div>
      <div class="list">${cs.length ? cs.map(c => h`<div class="li">${avatar(c.photo, c.name)}<button class="grow" style="background:none;border:0;text-align:left;cursor:pointer;color:inherit;padding:0" data-act="contact-edit" data-id="${c.id}"><span class="t">${c.name}</span><br><span class="s">${[c.relation, c.phone || 'Nummer fehlt'].filter(Boolean).join(' · ')}</span></button>${c.phone ? h`<button class="btn icon primary" data-act="call" data-n="${c.phone}" aria-label="${c.name} anrufen">${icon('phone')}</button>` : ''}</div>`) : empty('Noch keine Kontakte.')}</div></div>`,
  };
});
ACT['person-new'] = () => {
  const H = HH();
  formDlg({ title: 'Person hinzufügen', body: h`${F.text('name', 'Name', '', { req: true, max: 60 })}<div class="form-grid">${F.date('birth', 'Geburtsdatum', '')}${F.num('age', 'oder Alter', '', { min: 0, maxv: 110, step: 1 })}</div>${F.text('role', 'Rolle in der Familie', '', { list: 'roles', ph: 'z. B. Mama' })}<datalist id="roles">${ROLES.map(r => h`<option value="${r}">`)}</datalist>`, ok: 'Hinzufügen',
    onSubmit: fd => {
      const birth = fd.get('birth') || ''; const age = birth ? ageFromBirth(birth) : num(fd.get('age'), NaN);
      if (!(age >= 0 && age <= 110)) throw new Error('Geburtsdatum oder Alter fehlt.');
      const p = personShape({ id: uid(), name: fd.get('name').trim(), birth, age, role: fd.get('role').trim() }); H.people.push(p); persist(); go('#/pass/' + p.id);
    } });
};

/* ---------- Profil / Pass bearbeiten (speichert automatisch) ---------- */
function shareBox(p, key) { return h`<label><input type="checkbox" data-change="pass-share" data-id="${p.id}" data-k="${key}" ${p.share[key] ? raw('checked') : ''}>Im Notfallpass zeigen</label>`; }
function passField(p, key, label, val, opts = {}) {
  return h`<div class="field"><div class="sharerow"><label for="pf_${key}" style="color:var(--text);font-size:.9375rem">${label}</label>${opts.noShare ? '' : shareBox(p, opts.share || key)}</div>
    ${opts.area ? h`<textarea id="pf_${key}" rows="2" data-change="pass-set" data-id="${p.id}" data-path="${opts.path || 'needs.' + key}">${val || ''}</textarea>` : h`<input id="pf_${key}" type="${opts.type || 'text'}" value="${val ?? ''}" data-change="pass-set" data-id="${p.id}" data-path="${opts.path || 'needs.' + key}" ${opts.list ? raw('list="' + opts.list + '"') : ''}>`}</div>`;
}
route('/pass/:id', (id, H) => {
  const p = byId(H.people, id); if (!p) return { title: 'Person', back: '#/pass', html: empty('Nicht gefunden.') };
  if (!can('health')) return { title: p.name, back: '#/pass', html: h`${iceCard(H, p, {})}${noticeBox('info', 'Gesundheitsdaten geschützt', '')}` };
  const n = p.needs; const cs = passContacts(H, p);
  return {
    title: p.name, back: '#/pass',
    html: h`<div class="card"><div class="row nowrap">${avatar(p.photo, p.name, 'xl')}<div class="grow stack-s"><div class="btns"><button class="btn sm" data-act="person-photo" data-id="${p.id}">${icon('camera')} Foto</button>${p.photo ? h`<button class="btn sm danger" data-act="person-photo-del" data-id="${p.id}" aria-label="Foto entfernen">${icon('trash')}</button>` : ''}</div>${p.photo ? h`<div class="sharerow">${shareBox(p, 'photo')}</div>` : ''}</div></div>
      <div class="stack" style="margin-top:12px">${passField(p, 'name', 'Name', p.name, { path: 'name', noShare: true })}
      ${passField(p, 'birth', 'Geburtsdatum', p.birth, { path: 'birth', type: 'date' })}
      ${p.birth ? '' : passField(p, 'age', 'Alter', p.age, { path: 'age', type: 'number', noShare: true })}
      ${passField(p, 'role', 'Rolle in der Familie', p.role, { path: 'role', noShare: true, list: 'roles' })}<datalist id="roles">${ROLES.map(r => h`<option value="${r}">`)}</datalist></div></div>
    <div class="card"><div class="card-head"><h2>Kontakte im Notfall</h2><span class="badge">${cs.length}/3</span></div>
      <div class="stack-s">${cs.map((c, i) => h`<div class="row nowrap">${avatar(c.photo, c.name)}<button class="grow" style="background:none;border:0;text-align:left;cursor:pointer;color:inherit;padding:0" data-act="contact-edit" data-id="${c.id}"><span class="bold">${i + 1}. ${c.name}</span><br><span class="muted small">${[c.relation, c.phone || 'Nummer fehlt'].filter(Boolean).join(' · ')}</span></button>${i > 0 ? h`<button class="btn icon sm" data-act="pc-up" data-p="${p.id}" data-i="${i}" aria-label="Nach oben">↑</button>` : ''}<button class="btn icon sm danger" data-act="pc-del" data-p="${p.id}" data-i="${i}" aria-label="Entfernen">${icon('close')}</button></div>`)}</div>
      ${cs.length < 3 ? h`<button class="btn block" style="margin-top:12px" data-act="pc-add" data-p="${p.id}">${icon('plus')} Kontakt wählen</button>` : ''}</div>
    <div class="card"><h2>Gesundheit</h2><p class="muted small">Privat, bis du es freigibst.</p><div class="stack" style="margin-top:8px">
      ${passField(p, 'allergies', 'Allergien und Reaktion', n.allergies)}${passField(p, 'conditions', 'Krankheiten', n.conditions)}
      <div class="field"><div class="sharerow"><span class="label">Medikamente</span>${shareBox(p, 'meds')}</div>
        <div class="stack-s">${(n.meds || []).map(m => h`<button class="btn block" style="justify-content:flex-start" data-act="med-edit" data-p="${p.id}" data-id="${m.id}">${icon('pill')} ${m.name}${m.dose ? ' · ' + m.dose : ''}${m.emergency ? h` <span class="badge must">Notfall</span>` : ''}${m.expiry && daysUntil(m.expiry) <= 30 ? h` <span class="badge ${daysUntil(m.expiry) < 0 ? 'must' : 'rec'}">${daysUntil(m.expiry) < 0 ? 'abgelaufen' : 'läuft ab'}</span>` : ''}</button>`)}<button class="btn sm" data-act="med-edit" data-p="${p.id}" data-id="">${icon('plus')} Medikament</button></div></div>
      ${p.hide.aids ? '' : passField(p, 'aids', 'Hilfsmittel', n.aids)}${p.hide.blood ? '' : passField(p, 'blood', 'Blutgruppe (nur wenn sicher bekannt)', n.blood)}
      ${p.hide.doctor ? '' : passField(p, 'doctor', 'Arzt/Ärztin', p.doctor, { path: 'doctor', share: 'doctor' })}
      ${p.hide.pickup ? '' : passField(p, 'pickup', +personAge(p) < 18 ? 'Abholberechtigt / Betreuung' : 'Betreuung', p.pickup, { path: 'pickup', share: 'pickup' })}
      ${passField(p, 'notes', 'Besondere Hinweise', n.notes, { area: true })}
      ${p.hide.organ ? '' : h`<div class="field"><div class="sharerow"><label for="pf_organ" style="color:var(--text);font-size:.9375rem">Organspende</label>${shareBox(p, 'organ')}</div>
        <select id="pf_organ" data-change="pass-set" data-id="${p.id}" data-path="organ.status">${ORGAN.map(([v, l]) => h`<option value="${v}" ${p.organ.status === v ? raw('selected') : ''}>${l}</option>`)}</select>
        <input type="text" value="${p.organ.place}" placeholder="Wo liegt der Ausweis?" data-change="pass-set" data-id="${p.id}" data-path="organ.place" aria-label="Ablageort des Organspendeausweises">
        <div class="hint">Ersetzt keinen Organspendeausweis und keinen Registereintrag.</div></div>`}
      ${(p.custom || []).map((c, i) => h`<div class="field"><div class="sharerow"><input type="text" value="${c.label}" placeholder="Bezeichnung" data-change="pc-custom" data-id="${p.id}" data-i="${i}" data-f="label" aria-label="Bezeichnung" style="min-height:40px;max-width:60%"><label><input type="checkbox" data-change="pc-custom" data-id="${p.id}" data-i="${i}" data-f="share" ${c.share ? raw('checked') : ''}>Im Notfallpass zeigen</label></div>
        <div class="row nowrap"><input type="text" value="${c.value}" data-change="pc-custom" data-id="${p.id}" data-i="${i}" data-f="value" aria-label="${c.label || 'Eigenes Feld'}"><button class="btn icon danger" data-act="pc-custom-del" data-id="${p.id}" data-i="${i}" aria-label="Feld entfernen">${icon('trash')}</button></div></div>`)}
      <div class="btns"><button class="btn sm" data-act="pc-custom-add" data-id="${p.id}">${icon('plus')} Eigenes Feld</button><button class="btn sm" data-act="pass-modules" data-id="${p.id}">${icon('sliders')} Felder ein-/ausblenden</button></div>
      ${passField(p, 'confirmedBy', 'Angaben bestätigt von', p.confirmedBy, { path: 'confirmedBy', noShare: true })}</div></div>
    <div class="card"><h3>Für den Rucksack</h3><div class="stack" style="margin-top:8px">${passField(p, 'carryKg', 'Tragfähigkeit (kg)', p.carryKg ?? '', { path: 'carryKg', type: 'number', noShare: true })}${passField(p, 'hygiene', 'Besondere Hygieneprodukte', n.hygiene, { noShare: true })}</div></div>
    <button class="btn danger" data-act="person-del" data-id="${p.id}">${icon('trash')} Person löschen</button>
    <div class="actionbar"><a class="btn primary lg" href="#/ice/${p.id}">${icon('shield')} Notfallpass ansehen</a></div>`,
  };
});
INPUT['pass-set'] = el => {
  const p = byId(HH().people, el.dataset.id); if (!p) return; const path = el.dataset.path; let v = el.value;
  if (path === 'name') { v = v.trim(); if (!v) { toast('Name fehlt'); el.value = p.name; return; } }
  if (path === 'age' || path === 'carryKg') { if (v === '') { if (path === 'carryKg') { delete p.carryKg; persist(); } return; } v = num(v); }
  setPath(p, path, v);
  if (path === 'birth') { const a = ageFromBirth(v); if (a !== null) p.age = a; rerender(true); }
  p.passUpdated = todayISO(); persist();
};
INPUT['pc-custom'] = el => { const p = byId(HH().people, el.dataset.id); const c = p.custom[+el.dataset.i]; if (!c) return; c[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim(); p.passUpdated = todayISO(); persist(); };
ACT['pc-custom-add'] = d => { const p = byId(HH().people, d.id); p.custom.push({ id: uid(), label: '', value: '', share: false }); persist(); rerender(true); };
ACT['pc-custom-del'] = d => { const p = byId(HH().people, d.id); p.custom.splice(+d.i, 1); persist(); rerender(true); };
const HIDEABLE = [['aids', 'Hilfsmittel'], ['blood', 'Blutgruppe'], ['doctor', 'Arzt/Ärztin'], ['pickup', 'Abholberechtigt / Betreuung'], ['organ', 'Organspende']];
ACT['pass-modules'] = d => {
  const p = byId(HH().people, d.id);
  formDlg({ title: 'Felder anzeigen', body: h`<div class="stack-s">${HIDEABLE.map(([k, l]) => F.check('m_' + k, l, !p.hide[k]))}</div><p class="small muted">Ausgeblendete Felder werden auch nicht im Notfallpass gezeigt.</p>`,
    onSubmit: fd => { for (const [k] of HIDEABLE) p.hide[k] = !fdBool(fd, 'm_' + k); persist(); rerender(true); } });
};
INPUT['pass-share'] = el => { const p = byId(HH().people, el.dataset.id); p.share[el.dataset.k] = el.checked; persist(); };
ACT['person-photo'] = async d => { const p = byId(HH().people, d.id); const pid = await addPhotoTo(null); if (!pid) return; p.photo = pid; persist(); setTimeout(sweepPhotos, 800); rerender(true); };
ACT['person-photo-del'] = d => { const p = byId(HH().people, d.id); p.photo = null; p.share.photo = false; persist(); setTimeout(sweepPhotos, 800); rerender(true); };
ACT['person-del'] = async d => {
  const H = HH(); const p = byId(H.people, d.id); if (H.people.length <= 1) { toast('Eine Person muss bleiben.'); return; }
  const ok = await confirmDlg('Person löschen?', `„${p.name}“ und der Notfallpass werden gelöscht. Taschen und Gegenstände bleiben.`, { ok: 'Löschen', danger: true }); if (!ok) return;
  H.people = H.people.filter(x => x.id !== p.id); H.bags.forEach(b => { if (b.owner === p.id) b.owner = null; }); H.items.forEach(i => { if (i.personId === p.id) i.personId = null; }); persist(); go('#/pass');
};
ACT['med-edit'] = d => {
  const p = byId(HH().people, d.p); const m = d.id ? (p.needs.meds || []).find(x => x.id === d.id) : { name: '', dose: '', expiry: '' };
  formDlg({ title: d.id ? 'Medikament' : 'Medikament hinzufügen', body: h`${F.text('name', 'Name', m.name, { req: true })}<div class="form-grid">${F.text('dose', 'Dosierung', m.dose || '')}${F.text('purpose', 'Wofür', m.purpose || '')}${F.text('howto', 'Einnahme', m.howto || '', { ph: 'z. B. morgens zum Essen' })}${F.text('place', 'Aufbewahrt', m.place || '', { ph: 'z. B. Kühlschrank' })}${F.date('expiry', 'Haltbar bis', m.expiry || '')}</div>${F.check('emergency', 'Notfallmedikament (z. B. Spray, Pen)', !!m.emergency)}`, extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'med-del', data: { p: p.id, id: d.id } }] : [],
    onSubmit: fd => { const o = { name: fd.get('name').trim(), dose: fd.get('dose').trim(), purpose: fd.get('purpose').trim(), howto: fd.get('howto').trim(), place: fd.get('place').trim(), expiry: fd.get('expiry'), emergency: fdBool(fd, 'emergency') }; if (!o.name) throw new Error('Name fehlt.'); if (d.id) Object.assign(m, o); else { p.needs.meds = p.needs.meds || []; p.needs.meds.push(Object.assign({ id: uid() }, o)); } p.passUpdated = todayISO(); persist(); rerender(true); } });
};
ACT['med-del'] = d => { const p = byId(HH().people, d.p); p.needs.meds = p.needs.meds.filter(m => m.id !== d.id); closeAllModals(); persist(); rerender(true); };

/* ---------- Kontakte ---------- */
function contactDlg(id, onSaved) {
  const H = HH(); const c = id ? byId(H.contacts, id) : { type: 'ice', priority: 3 }; let photo = c.photo || null;
  const m = formDlg({ title: id ? 'Kontakt' : 'Neuer Kontakt', body: h`<div class="row nowrap"><span id="cph">${avatar(photo, c.name || '?', 'xl')}</span><button type="button" class="btn sm" data-act="noop" id="cphbtn">${icon('camera')} Foto</button></div>
      ${F.text('name', 'Name', c.name || '', { req: true })}${F.text('relation', 'Beziehung', c.relation || '', { list: 'roles2', ph: 'z. B. Mama' })}<datalist id="roles2">${ROLES.map(r => h`<option value="${r}">`)}</datalist>
      ${F.text('phone', 'Telefon', c.phone || '', { type: 'tel', mode: 'tel' })}${F.text('alt', 'Zweite Nummer / anderer Weg', c.alt || '')}${F.text('notes', 'Notiz', c.notes || '')}`,
    extraFoot: id && c.type !== 'official' ? [{ label: 'Löschen', cls: 'danger', act: 'contact-del', data: { id } }] : [],
    onSubmit: fd => {
      const o = { name: fd.get('name').trim(), relation: fd.get('relation').trim(), phone: fd.get('phone').trim(), alt: fd.get('alt').trim(), notes: fd.get('notes'), photo };
      if (!o.name) throw new Error('Name fehlt.');
      let saved = c; if (id) { Object.assign(c, o); delete c.todo; } else { saved = Object.assign({ id: uid(), type: 'ice', priority: 3, address: '', email: '' }, o); H.contacts.push(saved); }
      persist(); if (onSaved) onSaved(saved); rerender(true);
    } });
  $('#cphbtn', m.el).addEventListener('click', async () => { const pid = await addPhotoTo(null); if (!pid) return; photo = pid; const box = $('#cph', m.el); if (box) { box.innerHTML = avatar(photo, '', 'xl').s; hydratePhotos(box); } });
}
ACT['contact-edit'] = d => contactDlg(d.id || null);
ACT['contact-del'] = async d => {
  const ok = await confirmDlg('Kontakt löschen?', '', { ok: 'Löschen', danger: true }); if (!ok) return; const H = HH();
  H.contacts = H.contacts.filter(c => c.id !== d.id); H.people.forEach(p => { p.passContacts = (p.passContacts || []).filter(x => x !== d.id); }); closeAllModals(); persist(); rerender(true);
};
ACT['pc-add'] = d => {
  const H = HH(); const p = byId(H.people, d.p); const avail = H.contacts.filter(c => c.type !== 'official' && !(p.passContacts || []).includes(c.id));
  const add = c => { if (p.passContacts.length < 3 && !p.passContacts.includes(c.id)) p.passContacts.push(c.id); persist(); };
  if (!avail.length) { contactDlg(null, add); return; }
  const m = openModal({ title: 'Kontakt wählen', body: h`<div class="answers">${avail.map(c => h`<button class="ans" data-act="pc-pick" data-id="${c.id}">${avatar(c.photo, c.name)}<span>${c.name}<small>${[c.relation, c.phone].filter(Boolean).join(' · ')}</small></span></button>`)}<button class="ans" data-act="pc-new">${icon('plus')}<span>Neuer Kontakt</span></button></div>` });
  m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'pc-pick') { add(byId(H.contacts, a.dataset.id)); closeModal(m); rerender(true); } else if (a.dataset.act === 'pc-new') { closeModal(m); contactDlg(null, add); } });
};
ACT['pc-pick'] = () => {}; ACT['pc-new'] = () => {};
ACT['pc-up'] = d => { const p = byId(HH().people, d.p); const i = +d.i; [p.passContacts[i - 1], p.passContacts[i]] = [p.passContacts[i], p.passContacts[i - 1]]; persist(); rerender(true); };
ACT['pc-del'] = d => { const p = byId(HH().people, d.p); p.passContacts.splice(+d.i, 1); persist(); rerender(true); };

/* ---------- Notfallpass-Ansicht, QR, Druck ---------- */
route('/ice/:id', (id, H) => {
  const p = byId(H.people, id); if (!p) return { title: 'Notfallpass', back: '#/pass', html: empty('Nicht gefunden.') };
  const q = passQrText(H, p);
  return {
    title: 'Notfallpass', back: '#/pass/' + p.id,
    html: h`${iceCard(H, p, { hint: true })}
    <div class="card"><h2>QR-Code</h2><p class="small" style="color:var(--rec)"><b>Jeder, der den Code scannt, kann das lesen:</b></p><pre class="pre small" id="qrtext">${q.text}</pre>
      ${q.cut ? noticeBox('rec', 'Text gekürzt', 'Zu viele Angaben für einen gut lesbaren Code.') : ''}
      <div class="center" style="margin-top:12px"><span class="qrbox" id="qrbox">${qrSvg(q.text)}</span></div>
      <p class="muted small" style="margin-top:8px">Funktioniert ohne Internet und ohne App. Fotos passen nicht in den Code – sie stehen auf der gedruckten Karte.</p></div>
    <p class="muted small">Tipp: Zusätzlich die Android-Notfallinfos einrichten (Einstellungen → Sicherheit & Notfall). Ein gesperrtes Handy zeigt diese App nicht.</p>
    <div class="actionbar"><a class="btn primary lg" href="#/card/${p.id}">${icon('print')} Karte gestalten & drucken</a></div>`,
  };
});

/* ---------- Kartendesigner ---------- */
const MOD_LABEL = Object.fromEntries(CARD_MODS.map(([k, l]) => [k, l]));
const CARD_SIZE = { card: ['85.6mm', '54mm', 'Scheckkarte'], a6: ['105mm', '148mm', 'Postkarte (A6)'] };
async function passCardHtml(H, p) {
  const cfg = p.card; const L = PL[cfg.lang] || PL.de; const [W, Hh] = CARD_SIZE[cfg.size] || CARD_SIZE.card; const small = cfg.size === 'card';
  const img = async (pid, mm) => { if (!pid) return ''; const u = await Photos.get(pid, true); return u ? `<img src="${u}" style="width:${mm}mm;height:${mm}mm;object-fit:cover;border-radius:2mm;border:.3mm solid #888;flex:none">` : ''; };
  const cs = passContacts(H, p); const rows = passShared(H, p, cfg.lang); const q = passQrText(H, p, cfg.lang);
  const mods = cfg.mods.filter(m => m.on);
  const block = async m => {
    if (m.k === 'photo') return p.share.photo && p.photo ? `<div class="nfc-row">${await img(p.photo, small ? 13 : 22)}</div>` : '';
    if (m.k === 'callnote') return cs.length ? `<div class="nfc-call">${esc(L.call)}:</div>` : '';
    if (m.k === 'contacts') { let o = ''; for (const [i, c] of cs.entries()) o += `<div class="nfc-c">${mods.some(x => x.k === 'cphotos') ? await img(c.photo, small ? 8 : 14) : ''}<div><b>${i + 1}. ${esc(c.name)}</b>${c.relation ? ' (' + esc(c.relation) + ')' : ''}<br><span class="nfc-tel">${esc(c.phone || '')}</span>${c.alt ? ' · ' + esc(c.alt) : ''}</div></div>`; return o; }
    if (m.k === 'info') return rows.length ? `<table class="nfc-t">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : '';
    if (m.k === 'qr') return `<div class="nfc-qr">${qrSvg(q.text).s.replace('<svg ', `<svg style="width:${small ? 26 : 45}mm;height:${small ? 26 : 45}mm" `)}</div>`;
    return '';
  };
  const head = `<div class="nfc-h"><div><div class="nfc-n">${esc(p.name)}</div><div class="nfc-s">${esc([p.role, p.share.birth && p.birth && !p.hide.birth ? L.born + ' ' + (cfg.lang === 'en' ? p.birth : fmtDate(p.birth)) : ''].filter(Boolean).join(' · '))}</div></div><div class="nfc-title">${L.title}</div></div>`;
  const face = async (side, withHead) => { let o = withHead ? head : ''; for (const m of mods) if (!cfg.twoSided || m.side === side) o += await block(m); return `<div class="nfc">${o}</div>`; };
  const css = `<style>.nfc-wrap{display:flex;flex-wrap:wrap;gap:4mm;font-family:system-ui,sans-serif;color:#000}.nfc{width:${W};height:${Hh};box-sizing:border-box;padding:${small ? 2.5 : 5}mm;border:.4mm dashed #666;border-radius:3mm;overflow:hidden;font-size:${small ? 6.6 : 10}pt;line-height:1.25;display:flex;flex-direction:column;gap:${small ? 1 : 2}mm;background:#fff}
    .nfc-h{display:flex;justify-content:space-between;gap:2mm;align-items:flex-start}.nfc-n{font-weight:800;font-size:${small ? 9.5 : 15}pt}.nfc-s{color:#333}.nfc-title{font-weight:900;color:#b00000;font-size:${small ? 6.5 : 10}pt;letter-spacing:.03em}
    .nfc-call{font-weight:700}.nfc-c{display:flex;gap:1.5mm;align-items:center}.nfc-tel{font-weight:800;font-size:${small ? 8 : 12}pt}.nfc-t{border-collapse:collapse;width:100%}.nfc-t th{text-align:left;padding:0 1.5mm 0 0;vertical-align:top;white-space:nowrap;border:0;color:#333}.nfc-t td{border:0;padding:0;font-weight:700}.nfc-qr{text-align:center}.nfc-row{display:flex}</style>`;
  const faces = cfg.twoSided ? (await face('f', true)) + (await face('b', false)) : await face('f', true);
  return `${css}<div class="nfc-wrap">${faces}</div><p style="font:9pt system-ui;color:#333">${L.stand} ${cfg.lang === 'en' ? todayISO() : fmtDate(todayISO())}${cfg.twoSided ? ' · Entlang der Linie ausschneiden, Vorder- und Rückseite zusammenfalten oder -kleben.' : ''}</p>`;
}
route('/card/:id', (id, H) => {
  const p = byId(H.people, id); if (!p) return { title: 'Karte', back: '#/pass', html: empty('Nicht gefunden.') };
  const cfg = p.card;
  return {
    title: 'Karte gestalten', back: '#/ice/' + p.id,
    html: h`<div class="cardprev" id="cardprev" aria-label="Vorschau"></div>
    <div class="card"><div class="form-grid">${F.select('size', 'Format', Object.entries(CARD_SIZE).map(([k, v]) => [k, v[2]]), cfg.size, { attrs: { 'data-change': 'card-set', 'data-id': p.id } })}${F.select('lang', 'Sprache', [['de', 'Deutsch'], ['en', 'English']], cfg.lang, { attrs: { 'data-change': 'card-set', 'data-id': p.id } })}${F.select('twoSided', 'Seiten', [['1', 'Vorder- und Rückseite'], ['0', 'Eine Seite']], cfg.twoSided ? '1' : '0', { attrs: { 'data-change': 'card-set', 'data-id': p.id } })}</div></div>
    <div class="card flush"><div class="list">${cfg.mods.map((m, i) => h`<div class="li"><input type="checkbox" style="width:1.6rem;height:1.6rem;accent-color:var(--primary);flex:none" data-change="card-mod" data-id="${p.id}" data-i="${i}" ${m.on ? raw('checked') : ''} aria-label="${MOD_LABEL[m.k]}"><span class="grow t">${MOD_LABEL[m.k]}</span>
      ${cfg.twoSided ? h`<button class="btn sm" data-act="card-side" data-id="${p.id}" data-i="${i}">${m.side === 'f' ? 'Vorne' : 'Hinten'}</button>` : ''}<button class="btn icon sm" data-act="card-up" data-id="${p.id}" data-i="${i}" ${i ? '' : raw('disabled')} aria-label="Nach oben">↑</button></div>`)}</div></div>
    ${!passContacts(H, p).length ? noticeBox('rec', 'Kein Notfallkontakt gewählt', '') : ''}
    <div class="actionbar"><button class="btn primary lg" data-act="card-print" data-id="${p.id}">${icon('print')} Drucken / PDF</button></div>`,
    after: async () => { const box = $('#cardprev'); if (box) box.innerHTML = await passCardHtml(H, p); },
  };
});
INPUT['card-set'] = el => { const p = byId(HH().people, el.dataset.id); p.card[el.name] = el.name === 'twoSided' ? el.value === '1' : el.value; persist(); rerender(true); };
INPUT['card-mod'] = el => { const p = byId(HH().people, el.dataset.id); p.card.mods[+el.dataset.i].on = el.checked; persist(); rerender(true); };
ACT['card-side'] = d => { const p = byId(HH().people, d.id); const m = p.card.mods[+d.i]; m.side = m.side === 'f' ? 'b' : 'f'; persist(); rerender(true); };
ACT['card-up'] = d => { const p = byId(HH().people, d.id); const i = +d.i, a = p.card.mods; if (i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]]; persist(); rerender(true); };
/* Vor dem Export bestaetigen, was sichtbar wird */
ACT['card-print'] = async d => {
  const H = HH(); const p = byId(H.people, d.id); const cfg = p.card; const on = k => cfg.mods.some(m => m.k === k && m.on);
  const cs = passContacts(H, p); const rows = passShared(H, p, cfg.lang);
  const photos = [on('photo') && p.share.photo && p.photo ? 'Foto von ' + p.name : '', on('cphotos') ? cs.filter(c => c.photo).map(c => 'Foto von ' + c.name).join(', ') : ''].filter(Boolean);
  const ok = await confirmDlg('Das steht auf der Karte', h`<ul class="stack-s" style="padding-left:20px;margin:0"><li>${p.name}${p.role ? ' (' + p.role + ')' : ''}</li>
      ${on('contacts') ? cs.map(c => h`<li>${c.name} ${c.phone || ''}</li>`) : ''}${on('info') ? rows.map(([k, v]) => h`<li>${k}: ${v}</li>`) : ''}${photos.map(x => h`<li>${x}</li>`)}${on('qr') ? h`<li>QR-Code mit diesem Text (für jeden lesbar)</li>` : ''}</ul>`, { ok: 'Stimmt – drucken' });
  if (!ok) return;
  printDoc('Notfallpass ' + p.name, await passCardHtml(H, p));
};
ACT['pass-print'] = d => go('#/card/' + d.id);

/* ---------- Haushalte ---------- */
route('/households', H => ({
  title: 'Haushalte', back: '#/settings',
  html: h`<div class="card flush"><div class="list">${DB.households.map(x => h`<div class="li ${x.id === DB.active ? 'ok' : ''}" style="flex-wrap:wrap"><span class="grow"><span class="t">${x.name}${x.sample ? ' (Testdaten)' : ''}</span><br><span class="s">${x.people.length} Personen · ${x.bags.length} Taschen</span></span>${x.id === DB.active ? h`<span class="badge ok">Aktiv</span>` : h`<button class="btn sm primary" data-act="hh-switch" data-id="${x.id}">Wechseln</button>`}<button class="btn sm danger" data-act="hh-del" data-id="${x.id}" aria-label="${x.name} löschen">${icon('trash')}</button></div>`)}</div></div>
  <div class="btns"><button class="btn primary" data-act="hh-new">${icon('plus')} Neuer Haushalt</button><button class="btn" data-act="hh-rename">${icon('edit')} Umbenennen</button><button class="btn" data-act="load-sample">${icon('cube')} Beispielhaushalt</button></div>`,
}));
ACT['hh-rename'] = async () => { const H = HH(); const v = await promptDlg('Haushalt umbenennen', 'Name', H.name); if (!v || !v.trim()) return; H.name = v.trim(); persist(); rerender(true); };
ACT['hh-switch'] = d => { DB.active = d.id; persist(); Vault.lock(); go('#/home'); };
ACT['hh-new'] = async () => { const v = await promptDlg('Neuer Haushalt', 'Name', 'Haushalt ' + (DB.households.length + 1)); if (!v || !v.trim()) return; const n = newHousehold(v.trim()); DB.households.push(n); DB.active = n.id; persist(); go('#/wizard'); };
ACT['hh-del'] = async d => {
  if (DB.households.length <= 1) { toast('Der letzte Haushalt bleibt. Zum Leeren: „Alle Daten löschen“.'); return; }
  const x = byId(DB.households, d.id); const t = await promptDlg('Haushalt löschen', `Zum Bestätigen „${x.name}“ eintippen.`, '', { ok: 'Endgültig löschen' });
  if (t === null) return; if (t.trim() !== x.name) { toast('Name stimmt nicht – nichts gelöscht.'); return; }
  DB.households = DB.households.filter(h => h.id !== d.id); if (DB.active === d.id) DB.active = DB.households[0].id; persist(); setTimeout(sweepPhotos, 300); rerender();
};
ACT['plan-update'] = () => {
  const H = HH(); if (!H.cfg) { go('#/wizard'); return; }
  const r = applyPlan(H, DB.settings); persist(); rerender(true); toast(r.added ? r.added + ' neue Vorschläge' : 'Packliste ist aktuell');
};

/* ---------- App-Sperre (eine PIN, optional Biometrie) ---------- */
async function readPin(fd) {
  const a = fd.get('pin') || '', b = fd.get('pin2') || '';
  if (!/^\d{4,8}$/.test(a)) throw new Error('PIN: 4 bis 8 Ziffern.'); if (a !== b) throw new Error('PINs stimmen nicht überein.');
  if (/^(\d)\1+$/.test(a) || a === '1234' || a === '123456') throw new Error('Diese PIN ist zu einfach.');
  return makePin(a);
}
ACT['lock-enable'] = () => {
  const bio = NATIVE && NATIVE.bioAvailable && NATIVE.bioAvailable();
  formDlg({ title: 'App-Sperre', body: h`<div class="form-grid">${F.text('pin', 'PIN (4–8 Ziffern)', '', { type: 'password', mode: 'numeric', max: 8, req: true })}${F.text('pin2', 'PIN wiederholen', '', { type: 'password', mode: 'numeric', max: 8, req: true })}</div>${bio ? F.check('bio', 'Fingerabdruck / Gesicht erlauben', true) : ''}<p class="small muted">Ohne PIN kein Zugriff. Vorher ein Backup anlegen.</p>`, ok: 'Aktivieren',
    onSubmit: async fd => { const pin = await readPin(fd); const u = { id: uid(), name: 'Ich', role: 'admin', pin, perms: {}, bio: bio && fdBool(fd, 'bio'), fails: 0, lockUntil: 0 }; DB.users = [u]; UI.userId = u.id; persist(); rerender(true); toast('App-Sperre aktiv'); } });
};
ACT['lock-disable'] = async () => {
  const ok = await confirmDlg('App-Sperre ausschalten?', 'Die App öffnet dann ohne PIN.', { ok: 'Ausschalten', danger: true }); if (!ok) return;
  DB.users = []; UI.userId = null; persist(); rerender(true);
};
ACT['lock-now'] = () => lockNow();
