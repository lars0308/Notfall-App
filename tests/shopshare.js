// Einkaufsliste nach Geschäften, Teilen (Packliste/Einkaufsliste), Haltbarkeit beim Abhaken, immer dunkel
const { chromium } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, colorScheme: 'light' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fails = 0; const ok = (n, c, d = '') => { console.log((c ? 'OK   ' : 'FAIL ') + n + (c ? '' : ' ' + d)); if (!c) fails++; };
  await p.addInitScript(() => { window.__shared = []; Object.defineProperty(navigator, 'share', { value: o => { window.__shared.push(o); return Promise.resolve(); }, configurable: true }); });
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  ok('Immer dunkel, auch wenn das Handy hell eingestellt ist', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
  await p.evaluate(() => { loadSampleHousehold(); DB.settings.theme = 'light'; persist(); applyTheme(); });
  ok('Auch alte Einstellung „hell“ wird dunkel', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
  await p.goto('http://localhost:8123/#/settings'); await p.waitForTimeout(200);
  ok('Keine Auswahl Hell/Dunkel mehr in den Einstellungen', (await p.locator('input[name=theme]').count()) === 0);
  // Einkaufsliste nach Geschäft
  await p.evaluate(() => { const H = HH(); needList(H).filter(g => g.prio === 'must').forEach(g => g.items.forEach(i => setItemStatus(H, i, 'missing'))); persist(); });
  await p.goto('http://localhost:8123/#/shop'); await p.waitForSelector('.foldhead');
  const heads = await p.locator('.foldhead b').allInnerTexts();
  ok('Einkaufsliste nach Geschäften gruppiert (Supermarkt, Drogerie/Apotheke …)', heads.length >= 2 && heads.some(t => /Supermarkt/.test(t)) && heads.some(t => /Drogerie/.test(t)), JSON.stringify(heads));
  const [order, all] = await p.evaluate(() => [groupByStore(HH(), HH().shop.filter(s => !s.bought)).map(g => g.id), STORES.map(s => s[0])]);
  ok('Geschäfte in fester Reihenfolge', order.join() === all.filter(id => order.includes(id)).join(), order.join());
  await p.click('[data-act=shop-by][data-v=prio]'); ok('Umschaltbar auf „Nach Wichtigkeit“', /Zuerst besorgen/.test(await p.locator('body').innerText()));
  await p.click('.topbar [data-act=shop-share]'); await p.waitForFunction(() => window.__shared.length === 1);
  const st = await p.evaluate(() => window.__shared[0].text);
  ok('Einkaufsliste teilen: nach Geschäften, mit Kästchen', /SUPERMARKT/.test(st) && /⬜/.test(st), st.slice(0, 120));
  // Packliste teilen
  const bid = await p.evaluate(() => { const H = HH(); const b = H.bags[0]; const it = H.items.find(i => i.bagId === b.id); it.name = 'Medikament: Geheimmedizin'; it.tags = ['meds']; persist(); return b.id; });
  await p.goto('http://localhost:8123/#/bags/' + bid); await p.waitForSelector('[data-act=bag-share]'); await p.click('[data-act=bag-share]'); await p.waitForFunction(() => window.__shared.length === 2);
  const bt = await p.evaluate(() => window.__shared[1].text);
  ok('Packliste teilen: Kategorien, ✅/⬜, Medikamentenname bleibt privat', /Packliste:/.test(bt) && /✅|⬜/.test(bt) && /WASSER|ALLGEMEIN|KLEIDUNG/.test(bt) && !/Geheimmedizin/.test(bt) && /Persönliche Medikamente/.test(bt), bt.slice(0, 160));
  // Haltbarkeit beim Abhaken
  await p.evaluate(() => { const H = HH(); H.items.filter(i => i.bagId === H.bags[0].id && i.key === 'water_carry').forEach(i => { i.status = 'planned'; i.expiry = ''; i.noExpiry = false; }); persist(); });
  await p.goto('http://localhost:8123/#/review/b/' + bid + '/c/water'); await p.waitForSelector('[data-change=rv-tick]');
  const wid = await p.evaluate(b => HH().items.find(i => i.bagId === b && i.key === 'water_carry').id, bid);
  await p.click(`[data-change=rv-tick][data-id="${wid}"]`); await p.waitForSelector('.modal [name=expiry]');
  ok('Beim Abhaken von Wasser: „Haltbar bis?“', /Haltbar bis/.test(await p.locator('.modal').innerText()));
  await p.fill('.modal [name=expiry]', '2028-05-01'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(150);
  ok('Datum gespeichert (MHD)', await p.evaluate(id => { const i = byId(HH().items, id); return i.expiry === '2028-05-01' && i.status === 'owned'; }, wid));
  const tid = await p.evaluate(() => { const H = HH(); const i = H.items.find(x => x.bagId === H.bags[0].id && /^(multitool|work_gloves|cordage|notepad)$/.test(x.key)); if (i) { i.status = 'planned'; persist(); } return i && i.id; });
  if (tid) { await p.goto('http://localhost:8123/#/review/b/' + bid + '/c/tools'); await p.waitForSelector(`[data-change=rv-tick][data-id="${tid}"]`); await p.click(`[data-change=rv-tick][data-id="${tid}"]`); await p.waitForTimeout(200); ok('Werkzeug: keine Datumsfrage', !(await p.locator('.modal').count())); }
  const fid = await p.evaluate(() => { const H = HH(); const i = H.items.find(x => x.bagId === H.bags[0].id && x.key === 'food_ration'); i.status = 'planned'; i.expiry = ''; i.noExpiry = false; persist(); return i.id; });
  await p.goto('http://localhost:8123/#/review/b/' + bid + '/c/food'); await p.waitForSelector(`[data-change=rv-tick][data-id="${fid}"]`); await p.click(`[data-change=rv-tick][data-id="${fid}"]`); await p.waitForSelector('.modal [data-act=exp-skip]');
  await p.click('.modal [data-act=exp-skip]'); await p.waitForTimeout(100);
  ok('„Kein Datum“ – wird nicht wieder gefragt', await p.evaluate(id => byId(HH().items, id).noExpiry === true && !document.querySelector('.modal'), fid));
  const ex = await p.evaluate(() => [['firstaid:aid', ''], ['akku_aa', ''], ['thermometer', 'Medizin'], ['spare_glasses', 'Medizin'], ['multitool', ''], ['water_carry', ''], ['meds:x', 'Medizin'], ['mask_ffp2', 'Medizin'], ['', 'Lebensmittel']].map(([key, category]) => needsExpiry({ key, category, status: 'owned' })));
  ok('Ablauf erkannt: Brille, Akkus, Thermometer, Werkzeug nie; Wasser, Medikamente, Masken, Lebensmittel ja', JSON.stringify(ex) === JSON.stringify([false, false, false, false, false, true, true, true, true]), JSON.stringify(ex));
  await p.evaluate(b => { const H = HH(); for (let k = 0; k < 2; k++) H.items.push(makeItem({ key: 'wet_wipes', qty: 1 }, { bagId: b, container: 'bag', status: 'planned' })); persist(); }, bid);
  await p.goto('http://localhost:8123/#/review/b/' + bid + '/c/hygiene'); await p.waitForSelector('.li.tick');
  ok('Gleiche Sachen im Rucksack: nur eine Zeile', (await p.locator('.li.tick .t', { hasText: 'Feuchttücher' }).count()) === 1);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
