// End-to-End-Test der Web-Oberflaeche (Chromium). Fuehrt den kompletten Ablauf aus und prueft auf Konsolenfehler.
const { chromium } = require('playwright');
const { start } = require('./serve');
const assert = require('assert');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'OK  ' : 'FAIL', name, extra || '']); if (!cond) process.exitCode = 1; };
(async () => {
  const srv = await start(8123);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 1, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  const shot = n => p.screenshot({ path: `tests/out/${n}.png` });
  const click = sel => p.locator(sel).first().click();
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.topbar');
  ok('Erststart öffnet Einrichtungsassistent', (await p.evaluate(() => location.hash)) === '#/wizard');
  // Schritt 1
  for (const id of ['bag72', 'stock10', 'blackout', 'flood', 'pet', 'family']) await p.locator(`input[data-id="${id}"]`).check();
  await p.locator('input[data-id="shelter"][data-change="wz-strategy"]').check();
  await shot('02-wz1'); await click('[data-act=wz-next]');
  // Schritt 2
  await click('[data-act=wz-add-person][data-kind=adult]'); await click('[data-act=wz-add-person][data-kind=child]');
  const names = p.locator('input[data-path^="people."][data-path$=".name"]');
  await names.nth(0).fill('Anna'); await names.nth(1).fill('Ben'); await names.nth(2).fill('Mia');
  const ages = p.locator('input[data-path^="people."][data-path$=".age"]'); await ages.nth(0).fill('38'); await ages.nth(1).fill('40'); await ages.nth(2).fill('3');
  await click('[data-act=wz-add-pet]'); await p.locator('input[data-path="pets.0.name"]').fill('Rex');
  await shot('03-wz2'); await click('[data-act=wz-next]');
  // Schritt 3
  await p.selectOption('[data-change=wz-country]', 'DE'); await p.selectOption('select[data-path=region]', 'Bayern');
  await p.selectOption('select[data-path="housing.hasWater"]', '1'); await p.fill('input[data-path="housing.waterL"]', '20');
  await p.selectOption('select[data-path="housing.fireplace"]', '1'); await p.selectOption('select[data-path="housing.car"]', '1');
  await shot('04-wz3'); await click('[data-act=wz-next]');
  // Schritt 4
  await p.locator('input[data-path="people.0.needs.allergies"]').fill('Pollen');
  await click('[data-act=wz-add-med][data-i="0"]');
  await p.locator('input[data-path="people.0.needs.meds.0.name"]').fill('Ramipril'); await p.locator('input[data-path="people.0.needs.meds.0.expiry"]').fill('2026-12-01');
  await shot('05-wz4'); await click('[data-act=wz-next]');
  // Schritt 5
  await click('[data-act=wz-eq][data-key=powerbank][data-d="1"]'); await click('[data-act=wz-eq][data-key=powerbank][data-d="1"]'); await click('[data-act=wz-eq][data-key=headlamp][data-d="1"]');
  await click('[data-act=wz-add-bag]');
  await shot('06-wz5'); await click('[data-act=wz-next]');
  // Schritt 6
  await p.locator('input[name=dur][value="336"]').check(); await click('[data-act=wz-next]');
  await shot('07-wz7'); await click('[data-act=wz-finish]');
  await p.waitForSelector('.modal');
  await shot('08-result');
  ok('Planergebnis-Dialog erscheint', await p.locator('.modal').innerText().then(t => /persönlicher Plan/.test(t)));
  await click('[data-act=plan-review]'); await p.waitForSelector('.tabs');
  ok('Weiter zur Prüfung', (await p.evaluate(() => location.hash)) === '#/review');
  await shot('09-review');
  // Habe ich / Fehlt
  const have = await p.locator('[data-act=rv-have]').count(); ok('Prüfliste hat Positionen', have > 20, 'n=' + have);
  for (let i = 0; i < 6; i++) await p.locator('[data-act=rv-have]').first().click();
  for (let i = 0; i < 4; i++) await p.locator('[data-act=rv-miss]').first().click();
  const stats = await p.evaluate(() => { const H = HH(); return { owned: H.items.filter(i => i.status === 'owned').length, missing: H.items.filter(i => i.status === 'missing').length, shop: H.shop.length, items: H.items.length, bags: H.bags.length }; });
  ok('Habe ich/Fehlt wirken, Einkaufsliste wächst', stats.missing === 4 && stats.shop === 4 && stats.owned >= 6, JSON.stringify(stats));
  // Seiten durchgehen
  const bagId = await p.evaluate(() => HH().bags[0].id); const itemId = await p.evaluate(() => HH().items.find(i => i.status === 'owned').id);
  const pid = await p.evaluate(() => HH().people[0].id);
  const routes = ['home', 'bags', 'bags/' + bagId, 'items', 'item/' + itemId, 'stock', 'shop', 'recs', 'people', 'people/' + pid, 'contacts', 'rooms', 'remind', 'safe', 'sos', 'settings', 'more', 'docs', 'tasks', 'sources', 'households', 'users'];
  for (const r of routes) {
    const before = errs.length; await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(250);
    const txt = await p.locator('body').innerText(); const bad = /Anzeige fehlgeschlagen|Nicht gefunden|undefined|NaN|\[object|<\/?(div|span|button|a|li|input|label|select|option)[ >]|class="/.test(txt);
    ok('Seite #/' + r.split('/')[0] + ' ohne Fehler', !bad && errs.length === before, bad ? txt.match(/Anzeige fehlgeschlagen.*|undefined|NaN|\[object[^\]]*\]/)[0] : '');
    if (['home', 'bags/' + bagId, 'stock', 'recs', 'shop'].includes(r)) await shot('10-' + r.replace('/', '-').slice(0, 12));
  }
  // Persistenz nach Reload
  await p.goto('http://localhost:8123/#/home'); await p.reload(); await p.waitForSelector('.topbar');
  const persisted = await p.evaluate(() => ({ n: HH().items.length, owned: HH().items.filter(i => i.status === 'owned').length }));
  ok('Daten bleiben nach Neustart erhalten', persisted.n === stats.items && persisted.owned === stats.owned, JSON.stringify(persisted));
  console.log(results.map(r => r.join(' ')).join('\n')); console.log('Konsolenfehler:', errs.length ? errs : 'keine');
  if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
