// Treffpunkte in der Nähe suchen, Adresse aus Standort, große Familien – gegen eine Attrappe der Android-Schnittstelle
const { chromium } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, geolocation: { latitude: 50.9375, longitude: 6.9603, accuracy: 15 }, permissions: ['geolocation'] }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fails = 0; const ok = (n, c, d = '') => { console.log((c ? 'OK   ' : 'FAIL ') + n + (c ? '' : ' ' + d)); if (!c) fails++; };
  await p.addInitScript(() => {
    const store = {}; window.__urls = [];
    const b64 = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));
    window.NotfallAndroid = {
      info: () => '{"native":true}', storeGet: k => (k in store ? store[k] : null), storePut: (k, v) => { store[k] = v; return true; }, storeDel: k => { delete store[k]; return true; }, storeList: q => JSON.stringify(Object.keys(store).filter(k => k.startsWith(q))), storeWipe: () => {},
      scheduleReminders: j => JSON.parse(j).length, notifStatus: () => 'granted', exactAlarmStatus: () => 'granted', alarmLog: () => '[]', requestNotifications: cb => setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 5),
      setBars: () => {}, setSecure: () => {}, printHtml: () => {}, dial: () => {}, openUrl: () => {}, openSettings: () => {}, bioAvailable: () => false, bioHas: () => false, bioClear: () => {},
      mapPut: () => true, mapGet: () => null, mapBytes: () => 0, mapDelete: () => {},
      pickContact: cb => setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, name: 'Oma Erna', phone: '030 123456' })), 5),
      httpGet: (cb, url) => { window.__urls.push(url); const rev = /\/reverse\?/.test(url);
        const body = rev ? { addresstype: 'building', address: { road: 'Lindenstraße', house_number: '4', postcode: '50674', city: 'Köln' } }
          : [{ name: 'Sportplatz Weit', lat: '50.9600', lon: '6.9900', address: { road: 'Fernweg', city: 'Köln' } }, { name: 'Sportplatz Nah', lat: '50.9380', lon: '6.9610', address: { road: 'Nahweg', suburb: 'Neustadt' } }];
        setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, status: 200, type: 'application/json', b64: b64(body) })), 5); },
    };
  });
  const next = () => p.click('.actionbar [data-act=wz-next]');
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  await p.screenshot({ path: 'tests/out/welcome.png' }); ok('Begrüßung, menschlich formuliert', /Hallo und willkommen/.test(await p.locator('.q').innerText()) && /Schön, dass du da bist/.test(await p.locator('body').innerText()));
  await next();
  await p.screenshot({ path: 'tests/out/perms.png' }); ok('Gleich danach: Erlaubnisse mit Grund (Benachrichtigungen, Alarme)', /Erlaubnisse/.test(await p.locator('.q').innerText()) && /Rucksack-Kontrollen/.test(await p.locator('body').innerText()) && /Erlaubt/.test(await p.locator('body').innerText()));
  await next();
  // Adresse aus Standort
  await p.click('[data-act=wz-gps]'); await p.waitForSelector('.modal [data-act=dlg-yes]'); ok('Vor der Adressabfrage wird gefragt', /OpenStreetMap/.test(await p.locator('.modal').innerText()));
  await p.click('.modal [data-act=dlg-yes]'); await p.waitForFunction(() => /Köln/.test(HH().setup.draft.place));
  ok('Adresse aus Standort übernommen, Stadt erkannt', await p.evaluate(() => HH().setup.draft.place === 'Lindenstraße 4, 50674 Köln' && HH().setup.draft.settlement === 'Stadt'));
  await next();
  // Große Familie
  await p.locator('#wzcount').fill('12'); await p.waitForFunction(() => HH().setup.draft.people.length === 12);
  for (let i = 0; i < 3; i++) await p.click('[data-act=wz-count-step][data-d="1"]');
  ok('Mehr als 10 Personen möglich (Regler bis 30, Plus-Knopf)', await p.evaluate(() => HH().setup.draft.people.length === 15 && +document.getElementById('wzcount').max === 30));
  await p.locator('#wzcount').fill('2'); await p.waitForFunction(() => HH().setup.draft.people.length === 2);
  for (let i = 0; i < 8 && !/anrufen/.test(await p.locator('.q').innerText()); i++) await next();
  await p.click('[data-act=wz-pick-contact]'); await p.waitForFunction(() => HH().setup.draft.contacts[0].name === 'Oma Erna');
  ok('Kontakt aus dem Telefonbuch übernommen', await p.evaluate(() => HH().setup.draft.contacts[0].phone === '030 123456'));
  await next();
  // Treffpunkt suchen
  ok('Treffpunkt: „In der Nähe suchen“', (await p.locator('[data-act=wz-meet-search]').count()) === 2);
  await p.click('[data-act=wz-meet-search][data-i="0"]'); await p.waitForSelector('.modal [data-ps]'); await p.click('.modal [data-ps=Sportplatz]'); await p.waitForSelector('.modal [data-pk]');
  await p.screenshot({ path: 'tests/out/places-suche.png' }); const list = await p.locator('.modal [data-pk] .tt').allInnerTexts(); const sub = await p.locator('.modal [data-pk] .ts').first().innerText();
  ok('Treffer nach Entfernung sortiert, mit Luftlinie', list[0] === 'Sportplatz Nah' && list[1] === 'Sportplatz Weit' && /Luftlinie/.test(sub), JSON.stringify([list, sub]));
  ok('Suche im Umkreis (viewbox, bounded)', await p.evaluate(() => window.__urls.some(u => /\/search\?/.test(u) && /bounded=1/.test(u) && /viewbox=/.test(u) && /q=Sportplatz/.test(u))));
  await p.click('.modal [data-pk="0"]');
  ok('Gewählter Ort wird Treffpunkt mit Position', await p.evaluate(() => { const m = HH().setup.draft.meet[0]; return m.name === 'Sportplatz Nah' && m.lat === 50.938 && m.lon === 6.961; }));
  await next(); await next(); await p.click('[data-act=setup-done][data-then=home]'); await p.waitForFunction(() => location.hash === '#/home');
  // Auf der Karte suchen
  await p.goto('http://localhost:8123/#/map'); await p.waitForSelector('[data-act=map-search]'); const n0 = await p.evaluate(() => HH().meeting.length);
  await p.click('[data-act=map-search]'); await p.waitForSelector('.modal #psq'); await p.fill('.modal #psq', 'Schule'); await p.click('.modal #psform button[type=submit]'); await p.waitForSelector('.modal [data-pk]');
  await p.click('.modal [data-pk="1"]'); await p.waitForTimeout(150);
  ok('Karte: gesuchter Ort als Treffpunkt gespeichert (weit weg → außerhalb)', await p.evaluate(n => { const M = HH().meeting; const m = M[M.length - 1]; return M.length === n + 1 && m.name === 'Sportplatz Weit' && m.far === true; }, n0));
  const wide = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth); ok('Karte passt auf den Bildschirm', wide <= 1);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
