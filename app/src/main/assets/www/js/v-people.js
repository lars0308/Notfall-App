'use strict';
/* ===== Notfall! – Haushalt, Personen, Haustiere, Benutzer, Haushalte ===== */
route('/people', H => {
  const S = DB.settings; const calc = householdCalc(H, S);
  return {
    title: 'Haushalt & Personen', back: '#/more',
    html: h`<div class="card"><div class="card-head"><div><h2>${H.name}</h2><p class="muted">${calc.n} ${plural(calc.n, 'Person', 'Personen')} · Bedarf ca. ${fmt(calc.waterDay)} l Wasser und ${fmt0(calc.kcalDay)} kcal pro Tag (Schätzwerte)</p></div><button class="btn sm" data-act="hh-rename">${icon('edit')} Umbenennen</button></div>
      <div class="btns"><a class="btn" href="#/households">${icon('home')} Haushalte (${DB.households.length})</a><a class="btn" href="#/docs">${icon('doc')} Dokumenten-Checkliste</a></div></div>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Personen</h2><button class="btn primary sm" data-act="person-new">${icon('plus')} Person</button></div><div class="list">${calc.people.map(({ p, c }) => h`<a class="li" href="#/people/${p.id}">${thumb(null, 'users')}<span class="grow"><span class="t">${p.name}</span><br><span class="s">${AGE_LABEL[c.group]}, ${p.age} J. · ${fmt(c.waterL)} l/Tag · ${fmt0(c.kcal)} kcal · trägt bis ${fmt(c.carryKg)} kg</span></span>${icon('chev', 'chev')}</a>`)}</div></div>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Haustiere</h2><button class="btn sm" data-act="pet-edit" data-id="">${icon('plus')} Haustier</button></div><div class="list">${H.pets.length ? H.pets.map(p => h`<button class="li" data-act="pet-edit" data-id="${p.id}">${thumb(null, 'paw')}<span class="grow"><span class="t">${p.species}${p.name ? ' ' + p.name : ''} ×${p.count || 1}</span><br><span class="s">${p.age !== '' && p.age !== undefined ? p.age + ' J.' : 'Alter unbekannt'}${p.weightKg ? ' · ' + p.weightKg + ' kg' : ''}${p.needs ? ' · ' + p.needs : ''}</span></span>${icon('chev', 'chev')}</button>`) : empty('Keine Haustiere eingetragen.')}</div></div>
    <div class="btns"><a class="btn" href="#/wizard" data-act="wz-restart">${icon('repeat')} Einrichtungsassistent erneut starten</a></div>`,
  };
});
ACT['hh-rename'] = async () => { const H = HH(); const v = await promptDlg('Haushalt umbenennen', 'Name', H.name); if (!v || !v.trim()) return; H.name = v.trim(); persist(); rerender(true); };
function personFormFields(p) {
  return h`${F.text('name', 'Name', p.name || '', { req: true, max: 60 })}<div class="form-grid">${F.num('age', 'Alter in Jahren', p.age ?? '', { req: true, min: 0, maxv: 110, step: 1 })}${F.num('carryKg', 'Tragfähigkeit (kg, optional)', p.carryKg ?? '', { hint: 'Leer = Richtwert nach Alter. Für Rucksack-Gewichtswarnungen.' })}</div>`;
}
ACT['person-new'] = () => {
  const H = HH();
  formDlg({ title: 'Person hinzufügen', body: personFormFields({ age: 35 }), ok: 'Hinzufügen', onSubmit: fd => { const age = num(fd.get('age'), NaN); if (!(age >= 0 && age <= 110)) throw new Error('Bitte ein Alter zwischen 0 und 110 eintragen.'); const p = { id: uid(), name: fd.get('name').trim(), age, needs: emptyNeeds() }; if (fd.get('carryKg') !== '') p.carryKg = num(fd.get('carryKg')); H.people.push(p); persist(); toast('Person hinzugefügt. Mit „Plan aktualisieren“ ergänzt die App passende Ausrüstung.'); go('#/people/' + p.id); } });
};
route('/people/:id', (id, H) => {
  const p = byId(H.people, id); const S = DB.settings;
  if (!p) return { title: 'Person', back: '#/people', html: empty('Person nicht gefunden.') };
  const c = personCalc(p, S); const n = p.needs; const hOk = can('health');
  const mine = H.items.filter(i => !i.archived && i.personId === p.id);
  return {
    title: p.name, back: '#/people',
    html: h`<div class="card"><div class="card-head"><div><h2>${p.name}</h2><p class="muted">${AGE_LABEL[c.group]}, ${p.age} Jahre</p></div><button class="btn sm" data-act="person-edit" data-id="${p.id}">${icon('edit')} Bearbeiten</button></div>
      <div class="grid c3"><div class="stat"><span class="v">${fmt(c.waterL)} l</span><span class="l">Wasser pro Tag (Schätzwert)</span></div><div class="stat"><span class="v">${fmt0(c.kcal)}</span><span class="l">kcal pro Tag (Schätzwert)</span></div><div class="stat"><span class="v">${fmt(c.carryKg)} kg</span><span class="l">Tragfähigkeit (Richtwert)</span></div></div></div>
    <div class="card"><h2>Persönliche Ausrüstung</h2><p class="muted">${mine.length} Positionen sind dieser Person zugeordnet.</p><div class="btns"><a class="btn" href="#/items" data-act="inv-person" data-id="${p.id}">Im Inventar ansehen</a><button class="btn" data-act="plan-update">${icon('repeat')} Plan aktualisieren</button></div></div>
    ${hOk ? h`<form class="card" data-form="person-health" data-id="${p.id}"><h2>Gesundheit und Bedürfnisse</h2><p class="muted small">Freiwillig. Lokal verschlüsselt gespeichert. Keine medizinische Beratung.</p>
      <div class="stack"><div class="form-grid">${F.text('allergies', 'Allergien', n.allergies)}${F.text('intolerances', 'Unverträglichkeiten', n.intolerances)}${F.text('diet', 'Ernährungseinschränkungen', n.diet)}${F.text('devices', 'Medizinische Geräte (mit Komma trennen)', n.devices)}${F.text('aids', 'Hilfsmittel', n.aids)}${F.text('care', 'Pflegebedarf / Unterstützung', n.care)}${F.text('mobility', 'Körperliche Einschränkungen', n.mobility)}${F.text('hygiene', 'Besondere Hygieneprodukte', n.hygiene)}</div>
      <div class="btns"><button class="btn primary" type="submit">${icon('check')} Speichern</button></div></div></form>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Medikamente</h2><button class="btn sm" data-act="med-edit" data-p="${p.id}" data-id="">${icon('plus')} Medikament</button></div><div class="list">${(n.meds || []).length ? n.meds.map(m => h`<button class="li ${daysUntil(m.expiry) !== null && daysUntil(m.expiry) < 0 ? 'must' : daysUntil(m.expiry) !== null && daysUntil(m.expiry) <= 30 ? 'rec' : ''}" data-act="med-edit" data-p="${p.id}" data-id="${m.id}"><span class="grow"><span class="t">${m.name}</span><br><span class="s">${m.dose || 'Dosierung offen'}${m.expiry ? ' · haltbar bis ' + fmtDate(m.expiry) : ''}</span></span>${icon('chev', 'chev')}</button>`) : empty('Keine Medikamente eingetragen.')}</div></div>` : noticeBox('info', 'Gesundheitsdaten geschützt', 'Für dein Benutzerprofil sind Gesundheitsdaten nicht freigegeben.')}
    <div class="card"><h3>Person entfernen</h3><p class="muted small">Zugeordnete Gegenstände bleiben im Inventar erhalten.</p><button class="btn danger" data-act="person-del" data-id="${p.id}">${icon('trash')} Person löschen</button></div>`,
  };
});
ACT['inv-person'] = () => { INV.q = ''; };
ACT['plan-update'] = async () => {
  const H = HH(); if (!H.cfg) { toast('Starte zuerst den Einrichtungsassistenten.'); go('#/wizard'); return; }
  const ok = await confirmDlg('Plan aktualisieren?', 'Die App ergänzt neue Vorschläge für Änderungen (Personen, Gesundheit, Haustiere). Bestehende Gegenstände, Notizen und Fotos bleiben unverändert.', { ok: 'Aktualisieren' }); if (!ok) return;
  const r = applyPlan(H, DB.settings); persist(); rerender(true); toast(r.added ? r.added + ' neue Vorschläge ergänzt' : 'Keine neuen Vorschläge nötig');
};
FORM['person-health'] = (fd, f) => { const p = byId(HH().people, f.dataset.id); for (const k of ['allergies', 'intolerances', 'diet', 'devices', 'aids', 'care', 'mobility', 'hygiene']) p.needs[k] = (fd.get(k) || '').trim(); persist(); toast('Gespeichert. „Plan aktualisieren“ ergänzt passende Ausrüstung.'); };
ACT['person-edit'] = d => {
  const H = HH(); const p = byId(H.people, d.id);
  formDlg({ title: 'Person bearbeiten', body: personFormFields(p), onSubmit: fd => { const age = num(fd.get('age'), NaN); if (!(age >= 0 && age <= 110)) throw new Error('Bitte ein Alter zwischen 0 und 110 eintragen.'); p.name = fd.get('name').trim(); p.age = age; if (fd.get('carryKg') === '') delete p.carryKg; else p.carryKg = num(fd.get('carryKg')); persist(); rerender(true); } });
};
ACT['person-del'] = async d => {
  const H = HH(); const p = byId(H.people, d.id); if (H.people.length <= 1) { toast('Mindestens eine Person muss im Haushalt bleiben.'); return; }
  const ok = await confirmDlg('Person löschen?', `„${p.name}“ wird entfernt. Rucksäcke dieser Person bleiben ohne Träger erhalten.`, { ok: 'Löschen', danger: true }); if (!ok) return;
  H.people = H.people.filter(x => x.id !== p.id); H.bags.forEach(b => { if (b.owner === p.id) b.owner = null; }); H.items.forEach(i => { if (i.personId === p.id) i.personId = null; }); persist(); go('#/people');
};
ACT['med-edit'] = d => {
  const H = HH(); const p = byId(H.people, d.p); const m = d.id ? (p.needs.meds || []).find(x => x.id === d.id) : { name: '', dose: '', expiry: '' };
  formDlg({ title: d.id ? 'Medikament bearbeiten' : 'Medikament hinzufügen', body: h`${F.text('name', 'Medikament', m.name, { req: true })}${F.text('dose', 'Dosierung', m.dose || '')}${F.date('expiry', 'Haltbar bis', m.expiry || '')}`, extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'med-del', data: { p: p.id, id: d.id } }] : [],
    onSubmit: fd => { const nm = fd.get('name').trim(); if (!nm) throw new Error('Bitte einen Namen eintragen.'); if (d.id) { m.name = nm; m.dose = fd.get('dose'); m.expiry = fd.get('expiry'); } else { p.needs.meds = p.needs.meds || []; p.needs.meds.push({ id: uid(), name: nm, dose: fd.get('dose'), expiry: fd.get('expiry') }); } persist(); rerender(true); } });
};
ACT['med-del'] = async d => { const p = byId(HH().people, d.p); p.needs.meds = p.needs.meds.filter(m => m.id !== d.id); closeAllModals(); persist(); rerender(true); };
ACT['pet-edit'] = d => {
  const H = HH(); const p = d.id ? byId(H.pets, d.id) : { species: 'Hund', count: 1 };
  formDlg({ title: d.id ? 'Haustier bearbeiten' : 'Haustier hinzufügen', body: h`${F.select('species', 'Tierart', ['Hund', 'Katze', 'Kleintier', 'Vogel', 'Sonstiges'], p.species)}${F.text('name', 'Name (optional)', p.name || '')}<div class="form-grid">${F.num('count', 'Anzahl', p.count || 1, { min: 1, step: 1 })}${F.num('age', 'Alter (Jahre)', p.age ?? '')}${F.num('weightKg', 'Gewicht (kg, optional)', p.weightKg ?? '')}</div>${F.text('needs', 'Besondere Bedürfnisse (Medikamente, Diät …)', p.needs || '')}`, extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'pet-del', data: { id: d.id } }] : [],
    onSubmit: fd => { const o = { species: fd.get('species'), name: fd.get('name').trim(), count: Math.max(1, Math.round(num(fd.get('count'), 1))), age: fd.get('age') === '' ? '' : num(fd.get('age')), weightKg: fd.get('weightKg') === '' ? '' : num(fd.get('weightKg')), needs: fd.get('needs').trim() }; if (d.id) Object.assign(p, o); else H.pets.push(Object.assign({ id: uid() }, o)); persist(); rerender(true); toast('Gespeichert. „Plan aktualisieren“ ergänzt Tier-Ausrüstung.'); } });
};
ACT['pet-del'] = async d => { const H = HH(); const ok = await confirmDlg('Haustier löschen?', 'Der Eintrag wird entfernt; zugeordnete Gegenstände bleiben erhalten.', { ok: 'Löschen', danger: true }); if (!ok) return; H.pets = H.pets.filter(p => p.id !== d.id); H.items.forEach(i => { if (i.petId === d.id) i.petId = null; }); closeAllModals(); persist(); rerender(true); };

/* ---------- Haushalte ---------- */
route('/households', H => ({
  title: 'Haushalte', back: '#/people',
  html: h`<p class="muted">Du kannst mehrere Haushalte verwalten, z. B. dein Zuhause und das der Eltern. Jeder Haushalt hat eigene Personen, Ausrüstung und Pläne.</p>
  <div class="card flush"><div class="list">${DB.households.map(x => h`<div class="li ${x.id === DB.active ? 'ok' : ''}" style="flex-wrap:wrap"><span class="grow"><span class="t">${x.name}${x.sample ? ' (Testdaten)' : ''}</span><br><span class="s">${x.people.length} Personen · ${x.items.length} Gegenstände</span></span>${x.id === DB.active ? h`<span class="badge ok">Aktiv</span>` : h`<button class="btn sm primary" data-act="hh-switch" data-id="${x.id}">Wechseln</button>`}<button class="btn sm danger" data-act="hh-del" data-id="${x.id}" aria-label="${x.name} löschen">${icon('trash')}</button></div>`)}</div></div>
  <div class="btns"><button class="btn primary" data-act="hh-new">${icon('plus')} Neuer Haushalt</button><button class="btn" data-act="load-sample">${icon('cube')} Beispielhaushalt laden</button></div>`,
}));
ACT['hh-switch'] = d => { DB.active = d.id; persist(); Vault.lock(); go('#/home'); };
ACT['hh-new'] = async () => { const v = await promptDlg('Neuer Haushalt', 'Name', 'Haushalt ' + (DB.households.length + 1)); if (!v || !v.trim()) return; const n = newHousehold(v.trim()); DB.households.push(n); DB.active = n.id; persist(); go('#/wizard'); };
ACT['hh-del'] = async d => {
  if (DB.households.length <= 1) { toast('Der letzte Haushalt kann nicht gelöscht werden. Nutze „Alle Daten löschen“ in den Einstellungen.'); return; }
  const x = byId(DB.households, d.id); const t = await promptDlg('Haushalt löschen', `Zum Bestätigen „${x.name}“ eintippen. Alle Daten dieses Haushalts werden gelöscht.`, '', { ok: 'Endgültig löschen' });
  if (t === null) return; if (t.trim() !== x.name) { toast('Name stimmt nicht überein – nichts gelöscht.'); return; }
  DB.households = DB.households.filter(h => h.id !== d.id); if (DB.active === d.id) DB.active = DB.households[0].id; persist(); setTimeout(sweepPhotos, 300); rerender();
};

/* ---------- Benutzer & Sperre ---------- */
const PERMS = [['edit', 'Daten bearbeiten'], ['health', 'Gesundheitsdaten sehen'], ['vault', 'Dokumenten-Safe öffnen'], ['sos', 'Medizinische Infos im Notfallmodus'], ['settings', 'Einstellungen ändern']];
route('/users', H => {
  const u = curUser();
  if (DB.users.length && !(u && u.role === 'admin')) return { title: 'Benutzer', back: '#/settings', html: noticeBox('info', 'Nur für Administratoren', 'Benutzer und Berechtigungen kann nur ein Administrator verwalten.') };
  return {
    title: 'Benutzer & Sperre', back: '#/settings',
    html: h`${noticeBox('info', 'Wie die Trennung funktioniert', 'Die PIN-Sperre schützt die App vor fremdem Zugriff. Die Berechtigungen blenden Bereiche in der Oberfläche aus. Der Dokumenten-Safe ist zusätzlich durch sein eigenes Passwort verschlüsselt. Alle App-Daten liegen verschlüsselt im Android-Keystore, aber nicht getrennt pro Benutzer.')}
    ${DB.users.length ? h`<div class="card flush"><div class="list">${DB.users.map(x => h`<button class="li" data-act="user-edit" data-id="${x.id}"><span class="grow"><span class="t">${x.name}</span><br><span class="s">${x.role === 'admin' ? 'Administrator' : 'Mitglied'}${x.bio ? ' · Biometrie aktiv' : ''}${x.role !== 'admin' ? ' · ' + PERMS.filter(([k]) => x.perms && x.perms[k]).map(p => p[1]).join(', ') : ''}</span></span>${icon('chev', 'chev')}</button>`)}</div></div>
      <div class="btns"><button class="btn primary" data-act="user-edit" data-id="">${icon('plus')} Benutzer hinzufügen</button><button class="btn" data-act="lock-now">${icon('lock')} Jetzt sperren</button></div>`
      : h`<div class="card"><h2>App-Sperre ist aus</h2><p class="muted">Aktiviere die Sperre, um Gesundheitsdaten und Dokumente zu schützen. Du legst einen Administrator mit PIN an.</p><button class="btn primary" data-act="lock-enable">${icon('lock')} App-Sperre aktivieren</button></div>`}`,
  };
});
ACT['lock-now'] = () => lockNow();
function pinFields(req) { return h`<div class="form-grid">${F.text('pin', 'PIN (4–8 Ziffern)' + (req ? '' : ' – leer = unverändert'), '', { type: 'password', mode: 'numeric', max: 8, req })}${F.text('pin2', 'PIN wiederholen', '', { type: 'password', mode: 'numeric', max: 8, req })}</div>`; }
async function readPin(fd, req) {
  const a = fd.get('pin') || '', b = fd.get('pin2') || ''; if (!a && !req) return null;
  if (!/^\d{4,8}$/.test(a)) throw new Error('Die PIN muss aus 4 bis 8 Ziffern bestehen.'); if (a !== b) throw new Error('Die PINs stimmen nicht überein.');
  if (/^(\d)\1+$/.test(a) || a === '1234' || a === '123456') throw new Error('Diese PIN ist zu einfach.');
  return makePin(a);
}
ACT['lock-enable'] = () => {
  formDlg({ title: 'App-Sperre aktivieren', body: h`${F.text('name', 'Dein Name', DB.settings.lastName || '', { req: true })}${pinFields(true)}<p class="small muted">Merke dir die PIN gut. Ohne sie ist der Zugriff nur durch Zurücksetzen (Datenverlust) möglich. Mache vorher ein Backup.</p>`, ok: 'Aktivieren',
    onSubmit: async fd => { const pin = await readPin(fd, true); const u = { id: uid(), name: fd.get('name').trim(), role: 'admin', pin, perms: { edit: true, health: true, vault: true, sos: true, settings: true }, bio: false, fails: 0, lockUntil: 0 }; DB.users.push(u); UI.userId = u.id; persist(); rerender(); toast('App-Sperre aktiv'); } });
};
ACT['user-edit'] = d => {
  const x = d.id ? byId(DB.users, d.id) : { name: '', role: 'member', perms: { edit: true, health: false, vault: false, sos: false, settings: false } };
  const bioAvail = NATIVE && NATIVE.bioAvailable && NATIVE.bioAvailable();
  formDlg({ title: d.id ? 'Benutzer bearbeiten' : 'Benutzer hinzufügen', wide: true, body: h`${F.text('name', 'Name', x.name, { req: true })}${F.select('role', 'Rolle', [['member', 'Mitglied (eingeschränkt)'], ['admin', 'Administrator (alles)']], x.role)}${pinFields(!d.id)}
    <div class="stack-s"><div class="label">Berechtigungen (nur für Mitglieder)</div>${PERMS.map(([k, l]) => F.check('perm_' + k, l, x.perms && x.perms[k]))}</div>
    ${bioAvail ? F.check('bio', 'Entsperren mit Fingerabdruck/Gesicht erlauben', x.bio, { desc: 'Die PIN bleibt als Rückfall bestehen.' }) : h`<p class="small muted">Biometrie ist auf diesem Gerät nicht verfügbar oder nicht eingerichtet.</p>`}`,
    extraFoot: d.id && DB.users.length > 1 ? [{ label: 'Löschen', cls: 'danger', act: 'user-del', data: { id: d.id } }] : [],
    onSubmit: async fd => {
      const pin = await readPin(fd, !d.id); const role = fd.get('role');
      if (d.id && x.role === 'admin' && role !== 'admin' && DB.users.filter(u => u.role === 'admin').length <= 1) throw new Error('Es muss mindestens einen Administrator geben.');
      const o = { name: fd.get('name').trim(), role, perms: Object.fromEntries(PERMS.map(([k]) => [k, fdBool(fd, 'perm_' + k)])), bio: bioAvail ? fdBool(fd, 'bio') : false };
      if (o.bio && !x.bio) { const r = await nativeAsync('bioAuth', 'Biometrie aktivieren', o.name); if (!r.ok) { o.bio = false; toast('Biometrie nicht aktiviert: ' + (r.error || '')); } }
      if (d.id) { Object.assign(x, o); if (pin) { x.pin = pin; x.fails = 0; x.lockUntil = 0; } } else DB.users.push(Object.assign({ id: uid(), pin, fails: 0, lockUntil: 0 }, o));
      persist(); rerender(true);
    } });
};
ACT['user-del'] = async d => {
  const x = byId(DB.users, d.id); if (x.role === 'admin' && DB.users.filter(u => u.role === 'admin').length <= 1) { toast('Der letzte Administrator kann nicht gelöscht werden.'); return; }
  const ok = await confirmDlg('Benutzer löschen?', `„${x.name}“ wird entfernt.`, { ok: 'Löschen', danger: true }); if (!ok) return;
  DB.users = DB.users.filter(u => u.id !== d.id); closeAllModals(); persist(); if (UI.userId === d.id) { UI.userId = null; lockNow(); } else rerender(true);
};

/* ---------- Dokumenten-Checkliste ---------- */
route('/docs', H => ({
  title: 'Dokumenten-Checkliste', back: '#/safe',
  html: h`<p class="muted">Welche wichtigen Unterlagen hast du griffbereit? „Original“ = du weißt, wo es liegt. „Kopie“ = Kopie im Rucksack oder USB-Stick. „Safe“ = verschlüsselt in der App.</p>
  <div class="card flush"><div class="list">${H.docs.map(d => h`<div class="li ${d.na ? '' : d.orig && (d.copy || d.vault) ? 'ok' : 'rec'}" style="flex-wrap:wrap"><span class="grow" style="min-width:12rem"><span class="t">${d.title}</span>${d.note ? h`<br><span class="s">${d.note}</span>` : ''}</span>
    <label class="check" style="min-height:40px"><input type="checkbox" data-change="doc-toggle" data-id="${d.id}" data-k="orig" ${d.orig ? raw('checked') : ''}><span class="t">Original</span></label><label class="check" style="min-height:40px"><input type="checkbox" data-change="doc-toggle" data-id="${d.id}" data-k="copy" ${d.copy ? raw('checked') : ''}><span class="t">Kopie</span></label><label class="check" style="min-height:40px"><input type="checkbox" data-change="doc-toggle" data-id="${d.id}" data-k="vault" ${d.vault ? raw('checked') : ''}><span class="t">Safe</span></label><label class="check" style="min-height:40px"><input type="checkbox" data-change="doc-toggle" data-id="${d.id}" data-k="na" ${d.na ? raw('checked') : ''}><span class="t">Entfällt</span></label></div>`)}</div></div>
  <button class="btn" data-act="doc-add">${icon('plus')} Eigenes Dokument</button>`,
}));
INPUT['doc-toggle'] = el => { const d = byId(HH().docs, el.dataset.id); if (d) { d[el.dataset.k] = el.checked; persist(); rerender(true); } };
ACT['doc-add'] = async () => { const t = await promptDlg('Eigenes Dokument', 'Bezeichnung', ''); if (!t || !t.trim()) return; HH().docs.push({ id: uid(), key: 'u' + uid(), title: t.trim(), orig: false, copy: false, vault: false, na: false, note: '' }); persist(); rerender(true); };
