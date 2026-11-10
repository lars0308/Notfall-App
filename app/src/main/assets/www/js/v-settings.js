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
      ${radio('theme', [['dark', 'Dunkel'], ['light', 'Hell'], ['system', 'Wie Gerät']], S.theme, 'set-theme')}
      ${radio('scale', [['m', 'Schrift normal'], ['l', 'Groß'], ['xl', 'Sehr groß']], S.scale, 'set-scale')}
      ${F.check('contrast', 'Hoher Kontrast (ohne Glas-Effekt)', S.contrast === 'high', { attrs: { 'data-change': 'set-contrast' } })}</div></div>
    <div class="card"><h2>Sicherheit</h2><div class="stack">
      <div class="row spread"><b>App-Sperre (PIN)</b>${lockOn ? h`<span class="btns"><button class="btn sm" data-act="lock-now">${icon('lock')} Sperren</button><button class="btn sm danger" data-act="lock-disable">Ausschalten</button></span>` : h`<button class="btn primary" data-act="lock-enable">${icon('lock')} Einrichten</button>`}</div>
      ${lockOn ? F.select('lockMin', 'Automatisch sperren', [[0, 'Sofort'], [1, 'Nach 1 Minute'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']], S.lockMin, { attrs: { 'data-change': 'set-lockmin' } }) : ''}
      ${lockOn ? F.check('lockContacts', 'Notfallpass ohne Entsperren zeigen', S.lockContacts, { desc: 'Nur freigegebene Angaben', attrs: { 'data-change': 'set-lockcontacts' } }) : ''}
      ${F.check('secure', 'Screenshots verhindern', S.secure, { attrs: { 'data-change': 'set-secure' } })}
      <p class="small muted">Alle Daten bleiben auf diesem Gerät. Kein Konto. Internet nur, wenn du eine Karte herunterlädst.</p></div></div>
    <div class="card"><h2>Erinnerungen</h2><div class="stack">
      <div class="row spread"><b>Benachrichtigungen</b>${S.notif.on ? h`<button class="btn sm" data-act="notif-off">Ausschalten</button>` : h`<button class="btn primary" data-act="notif-enable">${icon('bell')} Einschalten</button>`}</div>
      <div class="form-grid">${F.select('hour', 'Uhrzeit', [...Array(24).keys()].filter(x => x >= 6 && x <= 22).map(x => [x, x + ':00 Uhr']), S.notif.hour, { attrs: { 'data-change': 'set-hour' } })}${F.select('leadDays', 'Ablaufwarnung vorher', [[7, '7 Tage'], [14, '14 Tage'], [30, '30 Tage'], [60, '60 Tage'], [90, '90 Tage']], S.notif.leadDays, { attrs: { 'data-change': 'set-lead' } })}</div></div></div>
    <div class="card"><h2>Backup</h2><p class="muted small">${S.backupLastAt ? 'Letztes Backup: ' + fmtDate(S.backupLastAt.slice(0, 10)) : 'Noch kein Backup.'} Verschlüsselt mit deinem Passwort, Ablage in „Downloads/Notfall“.</p>
      <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="backup-make">${icon('download')} Backup erstellen</button><button class="btn" data-act="backup-restore">${icon('upload')} Wiederherstellen</button></div></div>
    <form class="card" data-form="set-plan"><h2>Schätzwerte</h2><div class="stack">
      <div class="form-grid">${F.num('carryKg', 'Tragfähigkeit Erwachsene (kg)', S.plan.carryKg, { min: 3, step: 0.5 })}${F.num('waterPerDay', 'Wasser je Erwachsenem/Tag (l)', S.plan.waterPerDay, { min: 0.5, step: 0.1 })}${F.num('adultKcal', 'Energie Erwachsene (kcal/Tag)', S.plan.adultKcal, { min: 1200, step: 50 })}</div>
      <input type="hidden" name="reserve" value="${S.plan.reserve}"><input type="hidden" name="budget" value="${S.plan.budget || 0}">
      <div class="btns"><button class="btn primary" type="submit">${icon('check')} Speichern</button><button class="btn" type="button" data-act="plan-defaults">Standard</button></div></div></form>
    <div class="card"><h2>Daten</h2><div class="btns">
      <button class="btn" data-act="plan-update">${icon('repeat')} Packliste aktualisieren</button><a class="btn" href="#/households">${icon('home')} Haushalte (${DB.households.length})</a>
      <button class="btn" data-act="export-csv" data-what="items">${icon('download')} Gegenstände als CSV</button><button class="btn" data-act="load-sample">${icon('cube')} Beispielhaushalt</button>
      ${legacy ? h`<button class="btn" data-act="legacy-import">${icon('download')} Alte Version importieren</button>` : ''}
      <button class="btn danger" data-act="wipe-all">${icon('trash')} Alle Daten löschen</button></div></div>
    <p class="muted small center">Notfall! ${info.version || '2.1.0 (Browser)'}${info.sdk ? ' · Android API ' + info.sdk : ''}</p>`,
  };
});
INPUT['set-theme'] = el => { DB.settings.theme = el.value; persist(); applyTheme(); };
INPUT['set-scale'] = el => { DB.settings.scale = el.value; persist(); applyTheme(); };
INPUT['set-contrast'] = el => { DB.settings.contrast = el.checked ? 'high' : 'normal'; persist(); applyTheme(); };
INPUT['set-lockmin'] = el => { DB.settings.lockMin = +el.value; persist(); };
INPUT['set-secure'] = el => { DB.settings.secure = el.checked; persist(); if (NATIVE && NATIVE.setSecure) NATIVE.setSecure(el.checked);  };
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
  try { await flushDB(); await restoreEntries(entries); await loadDB(); pruneMaps().catch(() => { }); Vault.lock(); UI.userId = null; UI.locked = DB.users.length > 0; applyTheme(); go('#/home'); render(); toast('Backup wiederhergestellt'); }
  catch (e) { toast(e.message); await loadDB(); render(); }
};
ACT['wipe-all'] = async () => {
  const t = await promptDlg('Alle Daten löschen', 'Alle Haushalte, Fotos, der Safe und die Sperre werden unwiderruflich gelöscht. Tipp: erstelle vorher ein Backup. Zum Bestätigen LÖSCHEN eintippen.', ''); if (t === null) return;
  if (t.trim() !== 'LÖSCHEN') { toast('Nichts gelöscht.'); return; }
  for (const p of (DB.maps || [])) await MapTiles.del(p.id);
  await KV.wipe(); if (NATIVE && NATIVE.bioClear) NATIVE.bioClear('vault'); try { localStorage.removeItem('notfall_data'); } catch { /* egal */ }
  Vault.lock(); Photos.cache.clear(); DB = emptyDB(); UI.userId = null; UI.locked = false; persist(); await flushDB(); syncNotifications(); applyTheme(); go('#/wizard'); render(); toast('Alle Daten gelöscht');
};
ACT['legacy-import'] = async () => {
  const old = readLegacy(); if (!old) { toast('Keine Daten der alten Version gefunden.'); return; }
  const ok = await confirmDlg('Alte Daten importieren?', `${old.items.length} Gegenstände, ${old.bags.length} Taschen – als eigener Haushalt.`, { ok: 'Importieren' }); if (!ok) return;
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
