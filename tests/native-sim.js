// Vertragstest der JS<->Android-Schnittstelle mit einer Attrappe von window.NotfallAndroid.
// Prueft Aufrufnamen, Argumentreihenfolge, Rueckgabeformate und die Verwendung des nativen Speichers.
const { chromium } = require('playwright'); const { start } = require('./serve');
const results = []; const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };
(async () => {
  const srv = await start(8123); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 420, height: 860 }, acceptDownloads: true })).newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.addInitScript(() => {
    const store = {}; const calls = []; window.__calls = calls; window.__store = store;
    const rec = (n, ...a) => { calls.push([n, ...a]); };
    window.NotfallAndroid = {
      info: () => JSON.stringify({ native: true, sdk: 34, version: '2.0.0', device: 'Test' }),
      storeGet: k => (k in store ? store[k] : null), storePut: (k, v) => { store[k] = v; return true; }, storeDel: k => { delete store[k]; return true; }, storeList: pre => JSON.stringify(Object.keys(store).filter(k => k.startsWith(pre))), storeWipe: () => { for (const k of Object.keys(store)) delete store[k]; },
      saveDownload: (n, m, b64) => { rec('saveDownload', n, m, b64.length); return true; },
      takePhoto: cb => { rec('takePhoto', cb); setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=' })), 20); },
      scheduleReminders: json => { rec('scheduleReminders', json); return JSON.parse(json).length; },
      notifStatus: () => 'granted', requestNotifications: cb => { rec('requestNotifications', cb); setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 10); },
      openSettings: k => rec('openSettings', k),
      bioAvailable: () => true, bioHas: a => !!store['__bio_' + a], bioClear: a => { delete store['__bio_' + a]; },
      bioAuth: (cb, t, s) => { rec('bioAuth', cb, t, s); setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 10); },
      bioEnroll: (cb, alias, secret, title) => { rec('bioEnroll', cb, alias, title); store['__bio_' + alias] = secret; setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 10); },
      bioUnlock: (cb, alias, title) => { rec('bioUnlock', cb, alias, title); setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, data: store['__bio_' + alias] })), 10); },
      printHtml: (t, h) => rec('printHtml', t, h.length), openUrl: u => rec('openUrl', u), dial: n => rec('dial', n), setBars: (c, d) => rec('setBars', c, d), setSecure: o => rec('setSecure', o), quit: () => rec('quit'),
    };
  });
  const click = s => p.locator(s).first().click(); const calls = () => p.evaluate(() => window.__calls);
  await p.goto('http://localhost:8123/'); await p.waitForSelector('[data-act=load-sample]');
  ok('Native erkannt (kein Browser-Hinweis)', await p.evaluate(() => IS_NATIVE === true && KV.native === true));
  ok('setBars beim Start (ARGB Int32, Icons)', (await calls()).some(c => c[0] === 'setBars' && typeof c[1] === 'number' && c[1] < 0));
  await click('[data-act=load-sample]'); await click('[data-act=dlg-yes]'); await p.waitForTimeout(900);
  ok('Datenbank liegt im nativen (Keystore-)Speicher unter „db“', await p.evaluate(() => typeof window.__store.db === 'string' && window.__store.db.includes('households')));
  ok('Keine Daten im WebView-localStorage/IndexedDB', await p.evaluate(async () => { const dbs = indexedDB.databases ? await indexedDB.databases() : []; return localStorage.length === 0 && !dbs.some(d => d.name === 'notfall_kv'); }));
  // Benachrichtigungen
  await p.goto('http://localhost:8123/#/settings'); await p.waitForSelector('[data-act=notif-enable]'); await click('[data-act=notif-enable]'); await p.waitForTimeout(500);
  let c = await calls(); const sch = c.filter(x => x[0] === 'scheduleReminders').pop();
  ok('Benachrichtigungen: Berechtigung angefragt + Termine geplant', c.some(x => x[0] === 'requestNotifications') && !!sch);
  const evs = JSON.parse(sch[1]); ok('Termine haben id/at/title/text, at in Millisekunden', evs.length > 0 && evs.every(e => e.id && Number.isFinite(e.at) && e.at > 1.7e12 && e.title && typeof e.text === 'string'), evs.length + ' Termine');
  ok('Benachrichtigungstexte enthalten keine Gesundheitsdaten', !evs.some(e => /Ramipril|Allergie|Medikament:/i.test(e.title + e.text)));
  await click('[data-act=notif-off]'); await p.waitForTimeout(300); c = await calls(); ok('Ausschalten leert alle geplanten Alarme', JSON.parse(c.filter(x => x[0] === 'scheduleReminders').pop()[1]).length === 0);
  // Screenshots verhindern
  await p.locator('input[data-change=set-secure]').check(); ok('FLAG_SECURE-Schalter ruft setSecure(true)', (await calls()).some(x => x[0] === 'setSecure' && x[1] === true));
  // Foto + Dokument scannen
  const id = await p.evaluate(() => HH().items.find(i => i.status === 'owned').id); await p.goto('http://localhost:8123/#/item/' + id); await p.waitForSelector('[data-act=item-ph-add]'); await click('[data-act=item-ph-add][data-kind=photos]'); await click('[data-act=ph-cam]'); await p.waitForTimeout(500);
  ok('Kamera-Foto landet als Foto am Gegenstand (verschlüsselter Speicher)', await p.evaluate(id => { const it = HH().items.find(i => i.id === id); return it.photos.length === 1 && typeof window.__store['photo_' + it.photos[0]] === 'string' && !!window.__store['thumb_' + it.photos[0]]; }, id));
  // Safe + Biometrie
  await p.goto('http://localhost:8123/#/safe'); await p.waitForSelector('[data-form=safe-create]'); await p.fill('[data-form=safe-create] [name=p1]', 'Safe-Passwort-1234'); await p.fill('[data-form=safe-create] [name=p2]', 'Safe-Passwort-1234'); await p.locator('[data-form=safe-create] button[type=submit]').click(); await p.waitForSelector('[data-act=safe-bio-on]', { timeout: 15000 });
  await click('[data-act=safe-bio-on]'); await p.waitForTimeout(400); c = await calls(); const be = c.find(x => x[0] === 'bioEnroll'); ok('Biometrie: bioEnroll(alias=vault)', !!be && be[2] === 'vault');
  await click('[data-act=safe-lock]'); await p.waitForSelector('[data-act=safe-bio]'); await click('[data-act=safe-bio]'); await p.waitForSelector('[data-act=safe-import]', { timeout: 15000 }); ok('Safe lässt sich per Biometrie entsperren', await p.evaluate(() => Vault.unlocked));
  ok('Safe-Datenbestand im nativen Speicher nur verschlüsselt (vault_*)', await p.evaluate(() => Object.keys(window.__store).filter(k => k.startsWith('vault_')).length >= 2 && !/Safe-Passwort/.test(JSON.stringify(window.__store).replace(/__bio_vault":"[^"]*"/, ''))));
  // Safe darf beim Wechsel zur Kamera NICHT sperren, beim normalen Verlassen der App aber schon
  const hide = () => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
  await p.evaluate(() => { EXT.until = Date.now() + 60000; }); await hide();
  ok('Safe bleibt entsperrt, während Kamera/Dateiauswahl geöffnet ist', await p.evaluate(() => Vault.unlocked));
  await p.evaluate(() => { EXT.until = 0; }); await hide();
  ok('Safe sperrt beim Verlassen der App', !(await p.evaluate(() => Vault.unlocked)));
  // Backup -> saveDownload
  await p.goto('http://localhost:8123/#/settings'); await click('[data-act=backup-make]'); await p.fill('.modal [name=p1]', 'Backup-Pass-99'); await p.fill('.modal [name=p2]', 'Backup-Pass-99'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(2500);
  c = await calls(); const sd = c.find(x => x[0] === 'saveDownload'); ok('Backup nutzt saveDownload(.nfbak)', !!sd && /\.nfbak$/.test(sd[1]) && sd[3] > 1000, sd && sd[1]);
  // Drucken + Notruf
  await p.goto('http://localhost:8123/#/contacts'); await click('[data-act=ct-tab][data-tab=cards]'); await click('[data-act=cards-print]'); await p.waitForTimeout(200); ok('Kontaktkarte nutzt printHtml', (await calls()).some(x => x[0] === 'printHtml'));
  await p.goto('http://localhost:8123/#/sos'); await p.waitForSelector('.callbtn'); await click('.callbtn'); ok('Notruf-Button öffnet nur die Wählansicht (dial("112"))', (await calls()).some(x => x[0] === 'dial' && x[1] === '112'));
  console.log(results.map(r => r.join(' ')).join('\n')); console.log('Konsolenfehler:', errs.length ? errs : 'keine'); if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
