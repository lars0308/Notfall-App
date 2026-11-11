// Notfallpass für Rettungskräfte auf dem Sperrbildschirm – gegen eine Attrappe der Android-Schnittstelle
const { chromium } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fails = 0; const ok = (n, c, d = '') => { console.log((c ? 'OK   ' : 'FAIL ') + n + (c ? '' : ' ' + d)); if (!c) fails++; };
  await p.addInitScript(() => {
    const store = {}; window.__calls = [];
    const rec = (n, ...a) => window.__calls.push([n, ...a]);
    window.NotfallAndroid = {
      info: () => '{"native":true}', storeGet: k => (k in store ? store[k] : null), storePut: (k, v) => { store[k] = v; return true; }, storeDel: k => { delete store[k]; return true; }, storeList: q => JSON.stringify(Object.keys(store).filter(k => k.startsWith(q))), storeWipe: () => {},
      scheduleReminders: j => JSON.parse(j).length, notifStatus: () => 'granted', exactAlarmStatus: () => 'granted', alarmLog: () => '[]', requestNotifications: cb => setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 5),
      setBars: () => {}, setSecure: () => {}, printHtml: () => {}, dial: n => rec('dial', n), openUrl: () => {}, openSettings: () => {}, bioAvailable: () => false, bioHas: () => false, bioClear: () => {},
      mapPut: () => true, mapGet: () => null, mapBytes: () => 0, mapDelete: () => {},
      setLockPass: (json, on) => rec('setLockPass', json, on), lockPassOn: () => false, openLockPass: () => rec('openLockPass'),
      setLockWallpaper: (cb, b64) => { rec('wall', b64.length); setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 5); },
      copyText: (l, t) => rec('copy', t), openEmergencyInfo: () => { rec('emerg'); return true; },
    };
  });
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  await p.evaluate(() => { loadSampleHousehold(); const H = HH(); H.contacts.push({ id: 'k1', name: 'Oma Erna', relation: 'Oma', phone: '030 123456', type: 'ice' });
    const a = H.people[0]; a.passContacts = ['k1']; a.needs.allergies = 'Penicillin'; a.share.allergies = true; a.needs.conditions = 'Geheimkrankheit'; a.share.conditions = false; a.needs.blood = 'A+'; a.share.blood = true; persist(); });
  await p.goto('http://localhost:8123/#/pass'); await p.waitForSelector('a.nextstep[href="#/lockpass"]');
  ok('Notfallpass-Seite: Karte „Für Rettungskräfte“ ganz oben', /Notfallpass auf den Sperrbildschirm/.test(await p.locator('body').innerText()));
  await p.click('a.nextstep[href="#/lockpass"]'); await p.waitForSelector('[data-act=lp-toggle]');
  const t = await p.locator('body').innerText();
  ok('Vorschau zeigt nur Freigegebenes (Allergie, Blutgruppe, Kontakt – keine private Krankheit)', /Penicillin/.test(t) && /A\+/.test(t) && /Oma Erna/.test(t) && !/Geheimkrankheit/.test(t));
  ok('Drei Wege: Hinweis, Sperrbildschirm-Bild, Android-Notfallinformationen', (await p.locator('[data-act=lp-wall]').count()) === 1 && (await p.locator('[data-act=lp-android]').count()) === 1);
  await p.click('[data-act=lp-toggle]'); await p.waitForFunction(() => window.__calls.some(c => c[0] === 'setLockPass' && c[2] === true));
  const sent = await p.evaluate(() => JSON.parse(window.__calls.filter(c => c[0] === 'setLockPass').pop()[1]));
  const s0 = JSON.stringify(sent);
  ok('Einschalten übergibt nur Freigegebenes an Android', /Penicillin/.test(s0) && /030 123456/.test(s0) && !/Geheimkrankheit/.test(s0), s0.slice(0, 200));
  ok("Status „An“", /\bAn\b/.test(await p.locator('[data-act=lp-toggle]').innerText()));
  await p.click('[data-act=lp-test]'); ok('„So sieht es aus“ öffnet die Sperrbildschirm-Ansicht', await p.evaluate(() => window.__calls.some(c => c[0] === 'openLockPass')));
  await p.click('[data-act=lp-wall]'); await p.waitForSelector('.modal img'); ok('Sperrbildschirm-Bild: Vorschau vor dem Setzen', (await p.locator('.modal img').getAttribute('src')).startsWith('data:image/png'));
  await p.click('.modal [data-act=dlg-yes]'); await p.waitForFunction(() => window.__calls.some(c => c[0] === 'wall'));
  ok('Bild wird an Android übergeben', await p.evaluate(() => window.__calls.find(c => c[0] === 'wall')[1] > 10000));
  await p.click('[data-act=lp-android]'); await p.waitForTimeout(600);
  const cp = await p.evaluate(() => (window.__calls.find(c => c[0] === 'copy') || [])[1] || '');
  ok('Android-Notfallinformationen: Text kopiert, Einstellungen geöffnet', /Penicillin/.test(cp) && /Oma Erna/.test(cp) && !/Geheimkrankheit/.test(cp) && await p.evaluate(() => window.__calls.some(c => c[0] === 'emerg')));
  await p.evaluate(() => { window.__calls.length = 0; const a = HH().people[0]; a.needs.allergies = 'Penicillin, Nüsse'; persist(); });
  await p.waitForFunction(() => window.__calls.some(c => c[0] === 'setLockPass' && /Nüsse/.test(c[1])), null, { timeout: 6000 }).catch(() => {});
  ok('Änderung am Pass aktualisiert den Sperrbildschirm automatisch', await p.evaluate(() => window.__calls.some(c => c[0] === 'setLockPass' && /Nüsse/.test(c[1]))));
  const wide = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth); ok('Passt auf 360 px', wide <= 1);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
