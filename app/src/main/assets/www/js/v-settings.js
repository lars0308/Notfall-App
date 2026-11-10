'use strict';
/* ===== Notfall! – Einstellungen, Backup, Daten ===== */
route('/settings', H => {
  const S = DB.settings; const lockOn = DB.users.length > 0; const legacy = readLegacy();
  const radio = (name, opts, val, change) => h`<div class="choice-grid">${opts.map(([v, l]) => h`<label class="check"><input type="radio" name="${name}" value="${v}" ${String(val) === String(v) ? raw('checked') : ''} data-change="${change}"><span class="t">${l}</span></label>`)}</div>`;
  const info = IS_NATIVE ? (() => { try { return JSON.parse(NATIVE.info()); } catch { return {}; } })() : {};
  return {
    title: 'Einstellungen', back: '#/more',
    html: h`
    <div class="card"><h2>Darstellung</h2><div class="stack">
      <div><div class="label" style="margin-bottom:8px">Farbschema</div>${radio('theme', [['system', 'Wie Gerät'], ['light', 'Hell'], ['dark', 'Dunkel']], S.theme, 'set-theme')}</div>
      <div><div class="label" style="margin-bottom:8px">Schriftgröße</div>${radio('scale', [['m', 'Normal'], ['l', 'Groß'], ['xl', 'Sehr groß']], S.scale, 'set-scale')}</div>
      ${F.check('contrast', 'Hoher Kontrast', S.contrast === 'high', { desc: 'Deutlichere Linien und Texte', attrs: { 'data-change': 'set-contrast' } })}</div></div>
    <div class="card"><h2>Sicherheit & Datenschutz</h2><div class="stack">
      <div class="row spread"><div class="grow"><b>App-Sperre (PIN)</b><div class="small muted">${lockOn ? DB.users.length + ' Benutzer · Gesundheitsdaten geschützt' : 'Aus – empfohlen, sobald Gesundheitsdaten gespeichert sind'}</div></div><a class="btn" href="#/users">${icon('lock')} ${lockOn ? 'Verwalten' : 'Einrichten'}</a></div>
      ${lockOn ? F.select('lockMin', 'Automatisch sperren, nachdem die App verlassen wurde', [[0, 'Sofort'], [1, 'Nach 1 Minute'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']], S.lockMin, { attrs: { 'data-change': 'set-lockmin' } }) : ''}
      ${F.check('secure', 'Screenshots und Vorschau im App-Wechsler verhindern', S.secure, { desc: 'Schützt sensible Inhalte (nur Android-App)', attrs: { 'data-change': 'set-secure' } })}
      ${lockOn ? F.check('lockContacts', 'Notruf und Notfallkontakte ohne Entsperren zeigen', S.lockContacts, { desc: 'Auf dem Sperrbildschirm. Sinnvoll für Ersthelfer.', attrs: { 'data-change': 'set-lockcontacts' } }) + F.check('lockMedical', 'Medizinische Hinweise auch ohne Entsperren zeigen', S.lockMedical, { desc: 'Allergien/Medikamente im Notfallmodus. Standard: aus.', attrs: { 'data-change': 'set-lockmedical' } }) : ''}
      <p class="small muted">Alle Daten bleiben auf diesem Gerät. Die App hat keine Internetberechtigung und sendet nichts an Server. Es gibt keine Werbung, keine Registrierung, keine Analyse.</p></div></div>
    <div class="card"><h2>Benachrichtigungen</h2><div class="stack">
      <div class="row spread"><div class="grow"><b>Lokale Erinnerungen</b><div class="small muted">${S.notif.on ? 'An – auch bei geschlossener App' : 'Aus'}</div></div>${S.notif.on ? h`<button class="btn" data-act="notif-off">Ausschalten</button>` : h`<button class="btn primary" data-act="notif-enable">${icon('bell')} Einschalten</button>`}</div>
      <div class="form-grid">${F.select('hour', 'Uhrzeit der Erinnerungen', [...Array(24).keys()].filter(x => x >= 6 && x <= 22).map(x => [x, x + ':00 Uhr']), S.notif.hour, { attrs: { 'data-change': 'set-hour' } })}${F.select('leadDays', 'Ablaufwarnung vorher', [[7, '7 Tage'], [14, '14 Tage'], [30, '30 Tage'], [60, '60 Tage'], [90, '90 Tage']], S.notif.leadDays, { attrs: { 'data-change': 'set-lead' } })}</div>
      <div class="btns"><a class="btn" href="#/remind">Erinnerungen ansehen</a>${IS_NATIVE ? h`<button class="btn" data-act="open-settings" data-k="notif">Android-Einstellungen</button><button class="btn" data-act="open-settings" data-k="battery">Akku-Optimierung</button>` : ''}</div></div></div>
    <form class="card" data-form="set-plan"><h2>Planungswerte</h2><p class="muted small">Grundlage aller Schätzwerte (Wasser, Lebensmittel, Rucksackgewicht). Änderungen wirken auf neue Berechnungen und die Reichweite.</p><div class="stack">
      <div class="form-grid">${F.num('waterPerDay', 'Wasser pro Erwachsenem und Tag (Liter)', S.plan.waterPerDay, { min: 0.5, step: 0.1 })}${F.num('adultKcal', 'Energiebedarf Erwachsene (kcal/Tag)', S.plan.adultKcal, { min: 1200, step: 50 })}${F.num('reserve', 'Reservefaktor für Vorräte', S.plan.reserve, { min: 1, step: 0.05, hint: '1 = genau Bedarf, 1,2 = 20 % Reserve' })}${F.num('carryKg', 'Tragfähigkeit Erwachsene (kg)', S.plan.carryKg, { min: 3, step: 0.5 })}${F.num('budget', 'Gesamtbudget Einkauf (€, 0 = keins)', S.plan.budget || 0, { min: 0, step: 10 })}</div>
      <div class="btns"><button class="btn primary" type="submit">${icon('check')} Speichern</button><button class="btn" type="button" data-act="plan-defaults">Standardwerte</button></div></div></form>
    <div class="card"><h2>Backup & Wiederherstellung</h2><div class="stack">
      <p class="muted">Backups sind mit einem Passwort verschlüsselt (AES-256) und enthalten alle Daten inklusive Fotos und verschlüsseltem Safe. ${S.backupLastAt ? 'Letztes Backup: ' + fmtDate(S.backupLastAt.slice(0, 10)) : 'Noch kein Backup erstellt.'}</p>
      <div class="btns"><button class="btn primary" data-act="backup-make">${icon('download')} Backup erstellen</button><button class="btn" data-act="backup-restore">${icon('upload')} Backup wiederherstellen</button></div>
      <p class="small muted">Das Backup landet in „Downloads/Notfall“. Bewahre es an einem sicheren Ort auf. Das Passwort kann nicht zurückgesetzt werden.</p></div></div>
    <div class="card"><h2>Daten & Plan</h2><div class="btns">
      <button class="btn" data-act="wz-restart">${icon('repeat')} Einrichtungsassistent erneut starten</button><button class="btn" data-act="plan-update">${icon('repeat')} Plan aktualisieren</button>
      <a class="btn" href="#/households">${icon('home')} Haushalte (${DB.households.length})</a><button class="btn" data-act="load-sample">${icon('cube')} Beispielhaushalt laden</button>
      <button class="btn" data-act="export-csv" data-what="items">${icon('download')} Inventar als CSV exportieren</button><button class="btn" data-act="export-csv" data-what="shop">${icon('download')} Einkaufsliste als CSV exportieren</button>
      ${legacy ? h`<button class="btn" data-act="legacy-import">${icon('download')} Daten der alten Version importieren</button>` : ''}</div>
      ${H.sample ? noticeBox('rec', 'Du nutzt Testdaten', 'Dieser Haushalt enthält erfundene Beispieldaten und kann im Bereich Haushalte gelöscht werden.') : ''}</div>
    <div class="card"><h2>Gefahrenbereich</h2><p class="muted">Löscht alle Haushalte, Fotos, den Safe und die Sperre unwiderruflich von diesem Gerät.</p><button class="btn danger" data-act="wipe-all">${icon('trash')} Alle Daten löschen</button></div>
    <div class="card"><h2>Über Notfall!</h2><p>Version ${info.version || '2.0.0 (Browser)'}${info.device ? ' · ' + info.device : ''}${info.sdk ? ' · Android API ' + info.sdk : ''}</p><p class="muted small">Planungshilfe für Notfallvorsorge. Kein amtliches Warnsystem. Bei Gefahr: 112 und Anweisungen der Behörden.</p><a class="btn" href="#/sources">${icon('info')} Quellen & Hinweise</a></div>`,
  };
});
INPUT['set-theme'] = el => { DB.settings.theme = el.value; persist(); applyTheme(); };
INPUT['set-scale'] = el => { DB.settings.scale = el.value; persist(); applyTheme(); };
INPUT['set-contrast'] = el => { DB.settings.contrast = el.checked ? 'high' : 'normal'; persist(); applyTheme(); };
INPUT['set-lockmin'] = el => { DB.settings.lockMin = +el.value; persist(); };
INPUT['set-secure'] = el => { DB.settings.secure = el.checked; persist(); if (NATIVE && NATIVE.setSecure) NATIVE.setSecure(el.checked); if (!IS_NATIVE) toast('Gilt nur in der Android-App.'); };
INPUT['set-lockcontacts'] = el => { DB.settings.lockContacts = el.checked; persist(); };
INPUT['set-lockmedical'] = el => { DB.settings.lockMedical = el.checked; persist(); };
INPUT['set-hour'] = el => { DB.settings.notif.hour = +el.value; persist(); syncNotifications(); };
INPUT['set-lead'] = el => { DB.settings.notif.leadDays = +el.value; persist(); syncNotifications(); };
ACT['notif-off'] = () => { DB.settings.notif.on = false; persist(); syncNotifications(); rerender(true); };
FORM['set-plan'] = fd => {
  const p = DB.settings.plan; const w = num(fd.get('waterPerDay'), 2), k = num(fd.get('adultKcal'), 2200), r = num(fd.get('reserve'), 1), c = num(fd.get('carryKg'), 12);
  if (w < .5 || w > 10) throw new Error('Wasser pro Tag: bitte 0,5 bis 10 Liter.'); if (k < 1200 || k > 5000) throw new Error('Energiebedarf: bitte 1.200 bis 5.000 kcal.'); if (r < 1 || r > 3) throw new Error('Reservefaktor: bitte 1 bis 3.'); if (c < 3 || c > 40) throw new Error('Tragfähigkeit: bitte 3 bis 40 kg.');
  Object.assign(p, { waterPerDay: w, adultKcal: k, reserve: r, carryKg: c, budget: Math.max(0, num(fd.get('budget'))) }); persist(); toast('Gespeichert');
};
ACT['plan-defaults'] = () => { DB.settings.plan = defaultSettings().plan; persist(); rerender(true); };

/* ---- Backup ---- */
const stampNow = () => { const d = new Date(); return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()); };
ACT['backup-make'] = () => {
  formDlg({ title: 'Verschlüsseltes Backup erstellen', body: h`<p class="muted">Wähle ein Backup-Passwort (mindestens 8 Zeichen). Ohne dieses Passwort lässt sich das Backup nicht öffnen.</p>${F.text('p1', 'Backup-Passwort', '', { type: 'password', req: true })}${F.text('p2', 'Wiederholen', '', { type: 'password', req: true })}`, ok: 'Backup erstellen',
    onSubmit: async fd => {
      const a = fd.get('p1'); if (a.length < 8) throw new Error('Das Passwort braucht mindestens 8 Zeichen.'); if (a !== fd.get('p2')) throw new Error('Die Passwörter stimmen nicht überein.');
      toast('Backup wird erstellt …'); const bytes = await buildBackup(a); const name = `Notfall-Backup-${stampNow()}.nfbak`;
      const ok = await saveFile(name, 'application/octet-stream', bytes); if (ok === false) throw new Error('Speichern der Backup-Datei fehlgeschlagen.');
      DB.settings.backupLastAt = new Date().toISOString(); for (const H of DB.households) { const r = H.reminders.find(x => x.key === 'backup'); if (r) { r.lastDone = todayISO(); r.next = addDays(todayISO(), r.interval || 30); } } persist(); rerender(true); toast('Backup gespeichert: ' + name);
    } });
};
ACT['backup-restore'] = async () => {
  const f = (await pickFiles({ accept: '*/*' }))[0]; if (!f) return;
  const pass = await promptDlg('Backup öffnen', 'Backup-Passwort', '', { type: 'password', ok: 'Entschlüsseln' }); if (pass === null) return;
  let entries; try { toast('Backup wird geprüft …'); entries = await readBackup(await readBuf(f), pass); } catch (e) { toast(e.message || 'Backup konnte nicht gelesen werden.'); return; }
  const hh = JSON.parse(entries.db).households || [];
  const ok = await confirmDlg('Backup wiederherstellen?', `Das Backup enthält ${hh.length} Haushalt(e) (${hh.map(x => x.name).join(', ')}). Alle aktuellen Daten auf diesem Gerät werden ersetzt.`, { ok: 'Wiederherstellen', danger: true }); if (!ok) return;
  try { await flushDB(); await restoreEntries(entries); await loadDB(); Vault.lock(); UI.userId = null; UI.locked = DB.users.length > 0; applyTheme(); go('#/home'); render(); toast('Backup wiederhergestellt'); }
  catch (e) { toast(e.message); await loadDB(); render(); }
};
ACT['wipe-all'] = async () => {
  const t = await promptDlg('Alle Daten löschen', 'Alle Haushalte, Fotos, der Safe und die Sperre werden unwiderruflich gelöscht. Tipp: erstelle vorher ein Backup. Zum Bestätigen LÖSCHEN eintippen.', ''); if (t === null) return;
  if (t.trim() !== 'LÖSCHEN') { toast('Nichts gelöscht.'); return; }
  await KV.wipe(); if (NATIVE && NATIVE.bioClear) NATIVE.bioClear('vault'); try { localStorage.removeItem('notfall_data'); } catch { /* egal */ }
  Vault.lock(); Photos.cache.clear(); DB = emptyDB(); UI.userId = null; UI.locked = false; persist(); await flushDB(); syncNotifications(); applyTheme(); go('#/wizard'); render(); toast('Alle Daten gelöscht');
};
ACT['legacy-import'] = async () => {
  const old = readLegacy(); if (!old) { toast('Keine Daten der alten Version gefunden.'); return; }
  const ok = await confirmDlg('Alte Daten importieren?', `Gefunden: ${old.items.length} Gegenstände, ${old.bags.length} Rucksäcke, ${(old.contacts || []).length} Kontakte. Sie werden als neuer Haushalt „Importierter Haushalt“ angelegt. Die alte Version hatte keine Gesundheitsdaten.`, { ok: 'Importieren' }); if (!ok) return;
  const H = legacyToHousehold(old); DB.households.push(H); DB.active = H.id; persist(); go('#/home'); toast('Importiert');
};

/* ---- CSV-Export (ohne Gesundheitsdaten, unverschlüsselt) ---- */
const csvCell = v => { const t = String(v ?? '').replace(/\r?\n/g, ' '); return /[";,]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
ACT['export-csv'] = async d => {
  const H = HH(); let head, rows, name;
  if (d.what === 'shop') {
    head = ['Gegenstand', 'Kategorie', 'Priorität', 'Anzahl', 'Einheit', 'Geschätzter Preis', 'Tatsächlicher Preis', 'Händler', 'Link', 'Gekauft', 'Notizen'];
    rows = H.shop.map(s => [s.name, s.category, PRIO_LABEL[s.priority], s.qty, s.unit, s.estPrice ?? '', s.actualPrice ?? '', s.store, s.url, s.bought ? 'ja' : 'nein', s.notes]); name = 'Notfall-Einkaufsliste';
  } else {
    head = ['Name', 'Kategorie', 'Anzahl', 'Einheit', 'Status', 'Wichtigkeit', 'Ort', 'Gewicht je Einheit (g)', 'Volumen je Einheit (l)', 'Ablaufdatum', 'Kaufdatum', 'Preis', 'Notizen'];
    rows = H.items.filter(i => !i.archived).map(i => [i.name, i.category, i.qty, i.unit, { owned: 'vorhanden', planned: 'zu prüfen', missing: 'fehlt' }[i.status], PRIO_LABEL[i.prio], whereOf(H, i), i.weightG || '', i.volL || '', i.expiry, i.purchaseDate, i.price ?? '', i.notes]); name = 'Notfall-Inventar';
  }
  const csv = '\ufeff' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
  const ok = await confirmDlg('CSV exportieren?', 'Die Datei wird unverschlüsselt in „Downloads/Notfall“ gespeichert. Sie enthält keine Gesundheitsdaten, aber Gegenstände und Notizen.', { ok: 'Exportieren' });
  if (!ok) return; await saveFile(name + '-' + stampNow() + '.csv', 'text/csv', enc(csv)); toast('Exportiert');
};
