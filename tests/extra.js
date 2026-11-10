// Tests der Erweiterungen aus dem Gesamtauftrag: Pass-Baukasten, Kartendesigner, Lagen in der Notfallansicht,
// Probealarm, Offline-Karten (mit Android-Attrappe), Notfallkiste (MHD/Verbrauchsdatum, aeltestes zuerst), QR-Etikett.
const { chromium } = require('playwright');
const { start } = require('./serve');
const fs = require('fs');

const results = [];
const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:8123/';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function attrappe(png) {
  const store = {}; const tiles = {}; const calls = []; window.__calls = calls; window.__tiles = tiles; window.__http = { status: 200 };
  const rec = (n, ...a) => calls.push([n, ...a]); let log = [];
  window.__setLog = l => { log = l; };
  window.NotfallAndroid = {
    info: () => '{"native":true,"sdk":34,"version":"2.2.0"}',
    storeGet: k => (k in store ? store[k] : null), storePut: (k, v) => { store[k] = v; return true; }, storeDel: k => { delete store[k]; return true; }, storeList: p => JSON.stringify(Object.keys(store).filter(k => k.startsWith(p))), storeWipe: () => { for (const k of Object.keys(store)) delete store[k]; },
    scheduleReminders: j => { rec('schedule', j); return JSON.parse(j).length; }, notifStatus: () => 'granted', exactAlarmStatus: () => 'denied', alarmLog: () => JSON.stringify(log),
    requestNotifications: cb => setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 5), openSettings: k => rec('openSettings', k),
    setBars: () => {}, setSecure: () => {}, printHtml: (t, h) => rec('print', t, h), dial: n => rec('dial', n), openUrl: u => rec('openUrl', u), saveDownload: () => true,
    bioAvailable: () => false, bioHas: () => false, bioClear: () => {},
    httpGet: (cb, url) => { rec('http', url); const st = window.__http.status; setTimeout(() => window.__nativeResult(cb, JSON.stringify(st === 200 ? { ok: true, status: 200, type: 'image/png', b64: png } : { ok: false, status: st })), 1); },
    mapPut: (p, z, x, y, b64) => { tiles[`${p}/${z}/${x}/${y}`] = b64; return true; },
    mapGet: (p, z, x, y) => tiles[`${p}/${z}/${x}/${y}`] ? 'data:image/png;base64,' + tiles[`${p}/${z}/${x}/${y}`] : null,
    mapBytes: p => Object.keys(tiles).filter(k => k.startsWith(p + '/')).length * 70, mapDelete: p => { rec('mapDelete', p); for (const k of Object.keys(tiles)) if (k.startsWith(p + '/')) delete tiles[k]; },
    mapImport: (cb, pack) => { for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) tiles[`${pack}/1/${x}/${y}`] = png; setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, meta: { name: 'Import-Test', bounds: '-180,-85,180,85', minzoom: '1', maxzoom: '1', minzoomReal: 1, maxzoomReal: 1, tiles: 4, bytes: 280, attribution: '<a>© Testquelle</a>' } })), 5); },
  };
}

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const errs = [];
  const page = async native => {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    if (native) await p.addInitScript(attrappe, PNG);
    await p.goto(URL); await p.waitForSelector('.q');
    await p.evaluate(() => { loadSampleHousehold(); const H = HH(); H.items.forEach(i => { i.status = 'owned'; }); persist(); go('#/home'); });
    await p.waitForSelector('.page-inner');
    return p;
  };
  const noModal = p => p.waitForFunction(() => !document.querySelector('.modal'));
  const body = p => p.locator('body').innerText();

  /* ===== A) Browser ===== */
  let p = await page(false);
  const kid = await p.evaluate(() => HH().people[2].id);
  // Pass-Baukasten
  await p.goto(URL + '#/pass/' + kid); await p.waitForSelector('#pf_birth');
  await p.click('[data-act=pc-custom-add]'); await p.waitForSelector('[data-change=pc-custom][data-f=label]');
  await p.fill('[data-change=pc-custom][data-f=label]', 'Kita'); await p.locator('[data-change=pc-custom][data-f=label]').dispatchEvent('change');
  await p.fill('[data-change=pc-custom][data-f=value]', 'Sonnenschein, Tel. 030 9'); await p.locator('[data-change=pc-custom][data-f=value]').dispatchEvent('change');
  await p.locator('[data-change=pc-custom][data-f=share]').check();
  await p.fill('#pf_pickup', 'Oma Erna, Onkel Tom'); await p.locator('#pf_pickup').dispatchEvent('change'); await p.locator('[data-change=pass-share][data-k=pickup]').check();
  await p.fill('#pf_doctor', 'Dr. Muster'); await p.locator('#pf_doctor').dispatchEvent('change');
  await p.fill('#pf_confirmedBy', 'Mama'); await p.locator('#pf_confirmedBy').dispatchEvent('change');
  await p.selectOption('#pf_organ', 'unbekannt'); await p.locator('[data-change=pass-share][data-k=organ]').check();
  await p.click('[data-act=med-edit][data-id=""]'); await p.fill('.modal [name=name]', 'Salbutamol-Spray'); await p.fill('.modal [name=purpose]', 'Asthmaanfall'); await p.locator('.modal [name=emergency]').check(); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  await p.locator('[data-change=pass-share][data-k=meds]').check();
  let sh = await p.evaluate(id => passShared(HH(), HH().people.find(x => x.id === id)).map(r => r.join(': ')).join(' | '), kid);
  ok('Eigenes Feld, Abholberechtigte, Notfallmedikament (mit Zweck) erscheinen nur, wenn freigegeben', /Kita: Sonnenschein/.test(sh) && /Abholberechtigt: Oma Erna/.test(sh) && /Salbutamol-Spray \(Notfallmedikament\) – Asthmaanfall/.test(sh) && !/Dr. Muster/.test(sh), sh);
  await p.click('[data-act=pass-modules]'); await p.locator('.modal [name=m_organ]').uncheck(); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  sh = await p.evaluate(id => passShared(HH(), HH().people.find(x => x.id === id)).map(r => r[0]).join('|'), kid);
  ok('Ausgeblendetes Modul (Organspende) wird trotz Freigabe nicht gezeigt und verschwindet aus dem Editor', !/Organspende/.test(sh) && !(await p.locator('#pf_organ').count()));
  ok('„Stand“ und „bestätigt von“ im Notfallpass', await (async () => { await p.goto(URL + '#/ice/' + kid); await p.waitForSelector('#qrtext'); return /bestätigt von Mama/.test(await body(p)) && /Stand /.test(await body(p)); })());
  // Kartendesigner
  await p.goto(URL + '#/card/' + kid); await p.waitForSelector('#cardprev .nfc');
  ok('Kartendesigner: Vorschau mit Vorder- und Rückseite, QR auf der Rückseite', (await p.locator('#cardprev .nfc').count()) === 2 && (await p.locator('#cardprev .nfc').nth(1).locator('svg').count()) === 1);
  await p.selectOption('[name=lang]', 'en'); await p.waitForSelector('#cardprev .nfc');
  let prev = await p.locator('#cardprev').innerText();
  ok('Sprache Englisch: Kartentitel und Beschriftungen übersetzt, QR-Text englisch', /EMERGENCY CARD/.test(prev) && /Authorised to pick up/.test(prev) && /^EMERGENCY CARD/.test(await p.evaluate(id => passQrText(HH(), HH().people.find(x => x.id === id)).text, kid)));
  await p.selectOption('[name=twoSided]', '0'); await p.waitForSelector('#cardprev .nfc');
  ok('Eine Seite: alles auf einer Fläche', (await p.locator('#cardprev .nfc').count()) === 1);
  await p.locator('[data-change=card-mod]').nth(5).uncheck(); await p.waitForTimeout(200);
  ok('Modul abwählbar (QR-Code aus)', (await p.locator('#cardprev svg').count()) === 0);
  await p.locator('[data-change=card-mod]').nth(5).check(); await p.selectOption('[name=twoSided]', '1'); await p.selectOption('[name=size]', 'a6'); await p.waitForTimeout(200);
  await p.click('[data-act=card-up][data-i="4"]'); await p.waitForTimeout(150);
  ok('Reihenfolge änderbar, Format A6 gespeichert', await p.evaluate(id => { const c = HH().people.find(x => x.id === id).card; return c.mods[3].k === 'info' && c.size === 'a6'; }, kid));
  const html = await p.evaluate(async id => { let out = ''; const o = window.open; window.open = () => ({ document: { write: h => { out = h; }, close() { } }, print() { } }); ACT['card-print']({ id }); await new Promise(r => setTimeout(r, 300)); const dlg = document.querySelector('.modal'); const txt = dlg ? dlg.innerText : ''; document.querySelector('[data-act=dlg-yes]').click(); await new Promise(r => setTimeout(r, 500)); window.open = o; return { txt, out }; }, kid);
  ok('Vor dem Drucken: Bestätigung „Das steht auf der Karte“ mit allen sichtbaren Angaben', /Das steht auf der Karte/.test(html.txt) && /Kita: Sonnenschein/.test(html.txt) && /QR-Code/.test(html.txt) && !/Dr. Muster/.test(html.txt));
  ok('Druck-HTML enthält Karte mit QR, ohne private Angaben', /EMERGENCY CARD/.test(html.out) && /<svg/.test(html.out) && !/Dr\. Muster/.test(html.out));
  await p.selectOption('[name=lang]', 'de');
  // Lagen in der Notfallansicht
  await p.evaluate(() => { const H = HH(); const pp = H.people[0]; pp.needs.meds = [{ id: 'm9', name: 'Geheimmedizin', dose: '' }]; applyPlan(H, DB.settings); H.items.filter(i => /Geheimmedizin/.test(i.name)).forEach(i => { i.status = 'owned'; }); H.bags[0].location = 'Flurschrank'; persist(); });
  await p.goto(URL + '#/sos?s=fire_house'); await p.waitForSelector('.own');
  let sos = await body(p);
  ok('Lage „Brand im Gebäude“: eigene Checkliste klar getrennt, Taschen „Nicht danach suchen“', /Eigene Checkliste/.test(sos) && /Keine amtliche Anweisung/.test(sos) && /Nicht nach Rucksäcken suchen/.test(sos) && /Nicht danach suchen/.test(sos));
  await p.goto(URL + '#/sos?s=evac'); await p.waitForSelector('.own'); sos = await body(p);
  ok('Lage „Evakuierung“: Lagerort, „Bei sicherer Evakuierung mitnehmen“, „Bei Abreise mitnehmen“', /Ort: Flurschrank/.test(sos) && /Bei sicherer Evakuierung mitnehmen/.test(sos) && /Bei Abreise mitnehmen/.test(sos));
  ok('Medikamentenname bleibt privat (nur „Medikamente & Hilfsmittel“)', !/Geheimmedizin/.test(sos) && /Medikamente & Hilfsmittel/.test(sos));
  ok('Keine amtliche Warnung vorgetäuscht, keine 1–10-Skala', !/Stufe \d|\d\/10|Warnstufe/.test(sos));
  // Probealarm-Logik
  const al = await p.evaluate(() => { const now = Date.now(); const d = new Date(now - 10 * 86400000); const at = isoDate(d) + 'T08:00'; return { once: alarmNext({ at, repeat: 0 }), rep: alarmNext({ at, repeat: 90 }), past: alarmPast({ at, repeat: 90 }).length, fut: alarmNext({ at: isoDate(new Date(now + 2 * 86400000)) + 'T09:30', repeat: 0 }) }; });
  ok('Probealarm: einmalig vergangen → kein Termin; wiederkehrend → nächster in ≤ 90 Tagen', al.once === null && al.rep > Date.now() && al.rep - Date.now() < 91 * 86400000 && al.past === 1 && al.fut > Date.now());
  const ev = await p.evaluate(() => { DB.settings.notif.on = false; addAlarm({ scen: 'flood', at: isoDate(new Date(Date.now() + 86400000)) + 'T19:15', repeat: 90 }); return buildNotifEvents(); });
  ok('Probealarm wird auch bei ausgeschalteten Erinnerungen geplant: TEST-Titel, genaue Uhrzeit, öffnet Notfallansicht', ev.length === 1 && ev[0].kind === 'test' && ev[0].exact === true && /TESTALARM – KEINE ECHTE GEFAHR/.test(ev[0].title) && /^#\/sos\?test=.+&s=flood$/.test(ev[0].route) && new Date(ev[0].at).getHours() === 19, JSON.stringify(ev[0]));
  // Kiste: MHD / Verbrauchsdatum / aeltestes zuerst
  await p.evaluate(() => { const H = HH(); H.box.enabled = true; const past = isoDate(new Date(Date.now() - 5 * 86400000)), soon = isoDate(new Date(Date.now() + 200 * 86400000)), later = isoDate(new Date(Date.now() + 400 * 86400000));
    H.items.push(newItemDefaults({ name: 'Nudeln', container: 'home', qty: 2, unit: 'kg', expiry: past, expiryType: 'mhd' }), newItemDefaults({ name: 'H-Milch', container: 'home', qty: 1, expiry: past, expiryType: 'use' }), newItemDefaults({ name: 'Bohnen', container: 'home', qty: 1, expiry: later }), newItemDefaults({ name: 'Bohnen', container: 'home', qty: 1, expiry: soon })); persist(); });
  await p.goto(URL + '#/stock'); await p.waitForTimeout(300); const st = await body(p);
  ok('MHD überschritten wird als „prüfen“ gezeigt, Verbrauchsdatum als überschritten (nicht gleichgesetzt)', /MHD überschritten – prüfen/.test(st) && /Verbrauchsdatum überschritten/.test(st));
  const fifo = await p.evaluate(() => { const rows = [...document.querySelectorAll('.li')].filter(r => /Bohnen/.test(r.innerText)); return rows.map(r => /Zuerst verbrauchen/.test(r.innerText)); });
  ok('Gleiche Vorräte: älteste Charge steht oben und ist „zuerst verbrauchen“', fifo.length === 2 && fifo[0] === true && fifo[1] === false, JSON.stringify(fifo));
  const rr = await p.evaluate(() => computeRecs(HH(), DB.settings).filter(r => r.id.startsWith('r:exp:')).map(r => r.level + ':' + r.title).join(' | '));
  ok('Empfehlungen: MHD → „Empfohlen“, Verbrauchsdatum → „Notwendig“', /rec:MHD überschritten: Nudeln/.test(rr) && /must:H-Milch ist abgelaufen/.test(rr), rr);
  // QR-Etikett
  const lab = await p.evaluate(() => bagLabelText(HH(), HH().bags[0]));
  ok('QR-Etikett der Tasche: Name, Ort, Inhalt, ohne Medikamente, kurz genug', /^NOTFALL-TASCHE/.test(lab) && /Ort: Flurschrank/.test(lab) && /Inhalt:/.test(lab) && !/Geheimmedizin|Medikament/.test(lab) && new TextEncoder().encode(lab).length <= 700);
  await p.close();

  /* ===== B) Android-Attrappe: Probealarm und Karten ===== */
  p = await page(true);
  await p.goto(URL + '#/alarm'); await p.waitForSelector('[data-act=al-new]');
  ok('Hinweis, wenn genaue Alarme nicht erlaubt sind, mit Knopf zu den Einstellungen', /Genaue Uhrzeit erlauben/.test(await body(p)));
  await p.click('[data-act=al-new]'); await p.selectOption('.modal [name=scen]', 'blackout'); await p.fill('.modal [name=date]', await p.evaluate(() => isoDate(new Date(Date.now() + 2 * 86400000)))); await p.fill('.modal [name=time]', '07:45'); await p.selectOption('.modal [name=repeat]', '90'); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  let sched = await p.evaluate(() => { const c = window.__calls.filter(x => x[0] === 'schedule').pop(); return c ? JSON.parse(c[1]).filter(e => e.kind === 'test') : []; });
  ok('Geplanter Probealarm wird an Android übergeben (Datum, 07:45, TEST)', sched.length === 1 && new Date(sched[0].at).getHours() === 7 && new Date(sched[0].at).getMinutes() === 45 && /TESTALARM/.test(sched[0].title));
  const aid = await p.evaluate(() => HH().alarms[0].id);
  // Termin in die Vergangenheit legen, als waere der Alarm bereits ausgeloest worden
  const occ = await p.evaluate(() => { const a = HH().alarms[0]; const d = new Date(Date.now() - 3600000); d.setSeconds(0, 0); a.at = localDT(d); persist(); return d.getTime(); });
  const route = `#/sos?test=${aid}&t=${occ}&s=blackout`;
  await p.evaluate(([id, t]) => window.__setLog([{ key: `a:${id}:${t}@${t}`, kind: 'test', firedAt: t + 2000, shown: true }]), [aid, occ]);
  await p.evaluate(r => window.__openRoute(r), route); await p.waitForSelector('.testbanner');
  ok('Antippen der Testbenachrichtigung öffnet dieselbe Notfallansicht mit TEST-Kennzeichnung und Lage', /TESTALARM – KEINE ECHTE GEFAHR/.test(await body(p)) && /Stromausfall/.test(await body(p)) && /Im Test nicht anrufen/.test(await body(p)));
  await p.click('[data-act=al-heard][data-v=yes]'); await p.locator('[data-change=al-check][data-k=bags]').check(); await p.click('[data-act=al-finish]'); await p.waitForSelector('[data-act=al-new]');
  await p.locator('details summary').first().click();
  const evalTxt = await p.locator('details').first().innerText();
  ok('Auswertung sichtbar: ausgelöst mit Uhrzeit, geöffnet, Ungeprüftes als „nicht geprüft“', /Ausgelöst\s+ja, \d\d:\d\d/.test(evalTxt) && /Geöffnet\s+ja/.test(evalTxt) && /Notfallkontakte aktuell\s+nicht geprüft/.test(evalTxt), evalTxt.replace(/\n/g, ' | ').slice(0, 300));
  const resObj = await p.evaluate(([id, t]) => { const r = alarmResult(HH(), id, t); return { opened: !!r.opened, heard: r.heard, bags: r.checks.bags, contacts: !!r.checks.contacts, fired: !!alarmFired(id, t) }; }, [aid, occ]);
  ok('Auswertung gespeichert: ausgelöst laut Android-Protokoll, geöffnet, gehört, Taschen geprüft, Kontakte nicht geprüft', resObj.fired && resObj.opened && resObj.heard === 'yes' && resObj.bags === true && resObj.contacts === false, JSON.stringify(resObj));
  // gesperrt: Testalarm oeffnet eingeschraenkte Notfallansicht
  await p.evaluate(async () => { DB.users = [{ id: 'u', name: 'Ich', role: 'admin', pin: await makePin('2468'), perms: {}, fails: 0, lockUntil: 0 }]; persist(); lockNow(); });
  await p.evaluate(r => window.__openRoute(r), route); await p.waitForSelector('.testbanner');
  ok('Bei gesperrter App: Testalarm zeigt eingeschränkte Notfallansicht ohne Navigation', (await p.locator('.bottomnav:visible').count()) === 0 && /TESTALARM/.test(await body(p)));
  await p.evaluate(() => { DB.users = []; UI.sosLimited = false; UI.locked = false; persist(); go('#/home'); render(); });
  // Karten: Server einstellen, Gebiet laden
  await p.goto(URL + '#/map'); await p.waitForSelector('#mapcv');
  await p.click('[data-act=map-server]'); await p.fill('.modal [name=url]', 'http://tiles.example/{z}/{x}/{y}.png'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Kartenserver ohne HTTPS wird abgelehnt', await p.evaluate(() => DB.settings.mapUrl === '') && !!(await p.$('.modal')));
  await p.fill('.modal [name=url]', 'https://tiles.example/{z}/{x}/{y}.png'); await p.fill('.modal [name=attr]', '© Testkarten'); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  await p.click('[data-act=map-dl]'); await p.waitForSelector('.modal [name=area]');
  if (await p.locator('.modal select[name=area] option[value=point]').count()) await p.selectOption('.modal [name=area]', 'point');
  await p.fill('.modal [name=coord]', '52.52, 13.405'); await p.locator('.modal [name=coord]').dispatchEvent('input'); await p.selectOption('.modal [name=km]', '2'); await p.selectOption('.modal [name=maxz]', '13');
  const est = await p.locator('#dlest').innerText(); const expect = await p.evaluate(() => countTiles(bboxAround(52.52, 13.405, 2), 4, 13));
  ok('Schätzung der Kachelanzahl vor dem Download', new RegExp(expect.toLocaleString('de-DE').replace('.', '\\.')).test(est), est + ' / ' + expect);
  await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Download nur nach Bestätigung der Anbieter-Bedingungen', await p.evaluate(() => (DB.maps || []).length === 0) && /Bedingungen/.test(await p.locator('#toasts').innerText()));
  await p.locator('.modal [name=terms]').check(); await p.locator('.modal button[type=submit]').click();
  await p.waitForFunction(() => (DB.maps || []).length === 1, null, { timeout: 20000 });
  const pk = await p.evaluate(() => ({ m: DB.maps[0], stored: Object.keys(window.__tiles).filter(k => k.startsWith(DB.maps[0].id + '/')).length, urls: window.__calls.filter(c => c[0] === 'http').length, host: window.__calls.find(c => c[0] === 'http')[1] }));
  ok('Gebiet geladen: alle Kacheln gespeichert, Quelle und Grenzen gemerkt', pk.stored === expect && pk.m.tiles === expect && pk.urls === expect && pk.m.attribution === '© Testkarten' && /^https:\/\/tiles\.example\/\d+\/\d+\/\d+\.png$/.test(pk.host), JSON.stringify({ stored: pk.stored, expect }));
  await p.evaluate(() => { DB.settings.mapOnline = false; window.__calls.length = 0; persist(); }); await p.goto(URL + '#/home'); await p.goto(URL + '#/map'); await p.waitForSelector('#mapcv'); await p.waitForTimeout(600);
  const view = await p.evaluate(() => ({ shown: UI.mapView.shown, http: window.__calls.filter(c => c[0] === 'http').length }));
  ok('Offline-Anzeige: Kacheln kommen aus dem Speicher, keine Netzabfrage', view.shown > 0 && view.http === 0, JSON.stringify(view));
  ok('Quellenangabe der Karte wird angezeigt', /© Testkarten/.test(await p.locator('#mapattr').innerText()));
  // Treffpunkt auf Karte setzen
  await p.evaluate(() => { HH().meeting = [{ id: 'mt1', name: 'Spielplatz', address: '' }]; MAPUI.pick = 'mt1'; persist(); rerender(); });
  await p.waitForSelector('#mapcv'); await p.waitForTimeout(300);
  const box = await p.locator('#mapcv').boundingBox(); const center = await p.evaluate(() => ({ lat: UI.mapView.lat, lon: UI.mapView.lon }));
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(300);
  const mp = await p.evaluate(() => HH().meeting[0]);
  ok('Treffpunkt per Tippen auf die Karte positioniert', Math.abs(mp.lat - center.lat) < 0.01 && Math.abs(mp.lon - center.lon) < 0.01, JSON.stringify([mp.lat, mp.lon, center]));
  ok('Treffpunkt erscheint als Markierung', await p.evaluate(() => (UI.mapView.hits || []).some(h => h.id === 'mt1')));
  // Fehlerfall: Server verweigert
  await p.evaluate(() => { window.__http.status = 403; });
  await p.click('[data-act=map-dl]'); await p.waitForSelector('.modal [name=area]'); await p.selectOption('.modal [name=area]', 'point'); await p.fill('.modal [name=coord]', '48.1, 11.5'); await p.locator('.modal [name=coord]').dispatchEvent('input'); await p.selectOption('.modal [name=km]', '2'); await p.selectOption('.modal [name=maxz]', '12'); await p.locator('.modal [name=terms]').check(); await p.locator('.modal button[type=submit]').click();
  await p.waitForFunction(() => /verweigert/.test(document.getElementById('toasts').innerText), null, { timeout: 15000 });
  ok('Verweigerter Download: klare Meldung, kein halbes Kartenpaket', await p.evaluate(() => DB.maps.length === 1 && window.__calls.some(c => c[0] === 'mapDelete')));
  // Zu gross
  await p.evaluate(() => { window.__http.status = 200; }); await p.click('[data-act=map-dl]'); await p.waitForSelector('.modal [name=area]'); await p.selectOption('.modal [name=area]', 'point'); await p.fill('.modal [name=coord]', '48.1, 11.5'); await p.locator('.modal [name=coord]').dispatchEvent('input'); await p.selectOption('.modal [name=km]', '40'); await p.selectOption('.modal [name=maxz]', '17');
  ok('Zu großes Gebiet wird vor dem Download erkannt', /zu groß/.test(await p.locator('#dlest').innerText()));
  await p.click('.modal [data-act=modal-close]'); await noModal(p);
  // MBTiles-Import
  await p.click('[data-act=map-import]'); await p.waitForFunction(() => DB.maps.length === 2, null, { timeout: 5000 });
  ok('MBTiles-Import legt Kartenpaket an (Quellenangabe ohne HTML)', await p.evaluate(() => DB.maps[1].name === 'Import-Test' && DB.maps[1].attribution === '© Testquelle' && DB.maps[1].tiles === 4));
  // Paket ohne Kacheln (z. B. nach Wiederherstellung) wird entfernt
  await p.evaluate(async () => { DB.maps.push({ id: 'ghost', name: 'Weg', bbox: { w: 0, e: 1, s: 0, n: 1 }, minz: 5, maxz: 8, tiles: 9 }); await pruneMaps(); });
  ok('Kartenpaket ohne Kacheln auf dem Gerät wird bereinigt', await p.evaluate(() => !DB.maps.some(m => m.id === 'ghost') && DB.maps.length === 2));
  await p.click('[data-act=map-del][data-id="' + (await p.evaluate(() => DB.maps[0].id)) + '"]'); await p.click('[data-act=dlg-yes]'); await p.waitForTimeout(200);
  ok('Karte löschen entfernt Paket und Kacheln', await p.evaluate(() => DB.maps.length === 1 && !Object.keys(window.__tiles).some(k => k.startsWith('d'))));
  await p.close();

  console.log(results.map(r => r.join(' ')).join('\n'));
  console.log('Konsolenfehler:', errs.length ? [...new Set(errs)] : 'keine');
  if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', String(e.message).split('\n').slice(0, 6).join('\n')); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
