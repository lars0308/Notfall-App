// Einrichtungsassistent: Später / Überspringen / Fortsetzen / erneut starten
const { chromium } = require('playwright'); const { start } = require('./serve');
const results = []; const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };
(async () => {
  const srv = await start(8123); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 420, height: 860 } })).newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  const click = s => p.locator(s).first().click();
  await p.goto('http://localhost:8123/'); await p.waitForSelector('[data-act=wz-next]');
  await p.locator('input[data-id="bag48"]').check(); await click('[data-act=wz-next]'); await p.locator('input[data-path="people.0.name"]').fill('Zwischenstand'); await click('[data-act=wz-later]');
  await p.waitForFunction(() => document.body.innerText.includes('Einrichtung fortsetzen')); ok('Später: Startseite statt Zwangsweiterleitung, Banner „Einrichtung fortsetzen“', (await p.evaluate(() => location.hash)) === '#/home');
  await p.evaluate(() => flushDB()); await p.reload(); await p.waitForSelector('.topbar'); await click('a[href="#/wizard"]'); await p.waitForSelector('[data-act=wz-next]');
  ok('Zwischenstand bleibt nach Neustart erhalten (Schritt + Eingaben)', await p.evaluate(() => HH().setup.step === 1 && wzDraft(HH()).people[0].name === 'Zwischenstand' && wzDraft(HH()).goals.includes('bag48')));
  await click('[data-act=wz-skip]'); await click('[data-act=dlg-yes]'); await p.waitForTimeout(300);
  ok('Überspringen führt zur Startseite', (await p.evaluate(() => location.hash)) === '#/home' && await p.evaluate(() => HH().setup.skipped === true));
  await p.goto('http://localhost:8123/#/settings'); await click('[data-act=wz-restart]'); await click('[data-act=dlg-yes]'); await p.waitForSelector('[data-act=wz-next]');
  ok('Erneut starten öffnet den Assistenten wieder', (await p.evaluate(() => location.hash)) === '#/wizard');
  // Pflichtangabe Alter wird geprüft
  await click('[data-act=wz-next]'); await p.locator('input[data-path="people.0.age"]').fill(''); await click('[data-act=wz-next]'); await p.waitForTimeout(200);
  ok('Leeres Alter blockiert „Weiter“ mit Hinweis', await p.evaluate(() => HH().setup.step === 1) && /Alter/.test(await p.locator('#toasts').innerText()));
  console.log(results.map(r => r.join(' ')).join('\n')); console.log('Konsolenfehler:', errs.length ? errs : 'keine'); if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
