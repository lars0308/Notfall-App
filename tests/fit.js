// Alles passt auf schmale Handys (360 px): keine Seite, kein Dialog, kein Knopf ragt über den Rand.
const { chromium } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fails = 0; const ok = (n, c, d = '') => { console.log((c ? 'OK   ' : 'FAIL ') + n + (c ? '' : ' ' + d)); if (!c) fails++; };
  const check = async name => {
    await p.waitForTimeout(120);
    const r = await p.evaluate(() => {
      const W = innerWidth; const wide = document.scrollingElement.scrollWidth - W;
      const out = [...document.querySelectorAll('button, a.btn, input, select, .modal, .card, .tile, .chip')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 1 || b.left < -1); }).map(e => (e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 24));
      return { wide, out: out.slice(0, 4) };
    });
    ok(`passt: ${name}`, r.wide <= 1 && !r.out.length, JSON.stringify(r));
  };
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  ok('Erster Start öffnet „Haushalt anlegen“', await p.evaluate(() => location.hash) === '#/setup');
  // Anlegen: jeden Schritt prüfen
  for (let i = 0; i < 12; i++) {
    const q = await p.locator('.q').innerText(); await check('Anlegen – ' + q);
    if (await p.locator('[data-act=setup-done][data-then=bags]').count()) break;
    if (/Wer gehört/.test(q)) await p.click('[data-act=wz-add-person][data-kind=child]');
    if (/^Tiere/.test(q)) await p.click('[data-act=wz-add-pet][data-v=Hund]');
    await p.click('.actionbar [data-act=wz-next]');
  }
  await p.click('[data-act=setup-done][data-then=bags]'); await p.waitForFunction(() => /Wofür/.test(document.querySelector('.q').textContent));
  for (let i = 0; i < 6; i++) {
    const q = await p.locator('.q').innerText(); await check('Rucksäcke – ' + q);
    if (await p.locator('.actionbar [data-act=wz-finish]').count()) { await p.click('.actionbar [data-act=wz-finish]'); break; }
    const pick = p.locator('[data-act=wz-pick]').first(); if (await pick.count()) await pick.click(); else await p.click('.actionbar [data-act=wz-next]');
  }
  await p.waitForFunction(() => location.hash.startsWith('#/review'));
  await p.evaluate(() => { loadSampleHousehold(); persist(); });
  const H = await p.evaluate(() => ({ bag: HH().bags[0].id, pid: HH().people[0].id, item: HH().items[0].id }));
  for (const r of ['home', 'bags', 'bags/' + H.bag, 'bags/' + H.bag + '/pack', 'bags/' + H.bag + '/missing', 'review', 'review/b/' + H.bag, 'review/b/' + H.bag + '/c/tech', 'review/search', 'review/ask', 'pass', 'pass/' + H.pid, 'card/' + H.pid, 'ice/' + H.pid, 'more', 'items', 'item/' + H.item, 'shop', 'remind', 'map', 'alarm', 'sos', 'settings', 'stock', 'recs', 'setup', 'wizard']) {
    await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(250); await check('#/' + r);
  }
  // Dialoge
  for (const [r, act] of [['bags/' + H.bag, '.topbar [data-act=bag-del]'], ['bags/' + H.bag, '.topbar [data-act=bag-edit]'], ['bags', '[data-act=bag-new]'], ['review/b/' + H.bag + '/c/tech', '[data-act=pick-custom-open]'], ['alarm', '[data-act=al-new]']]) {
    await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(200); await p.click(act); await p.waitForSelector('.modal'); await check('Dialog ' + act + ' auf #/' + r);
    const foot = await p.evaluate(() => { const f = document.querySelector('.modal-foot'); if (!f) return true; const b = f.getBoundingClientRect(); return b.bottom <= innerHeight + 1; }); ok('Dialog-Knöpfe sichtbar: ' + act, foot);
    await p.keyboard.press('Escape'); await p.evaluate(() => closeAllModals());
  }
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
