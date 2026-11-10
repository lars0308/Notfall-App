// Zufalls-Test ("Monkey"): klickt zufaellig durch die App und meldet JS-Fehler.
// Gefaehrliche Aktionen (Daten loeschen usw.) werden uebersprungen.
const { chromium } = require('playwright');
const { start } = require('./serve');

const SKIP = /wipe|lock-disable|person-del|bag-del|box-off|hh-del|safe-reset|lock-enable|user-del|lock-now|legacy-import|backup-restore|safe-import|safe-scan|ph-add|ph-cam|ph-gal|hh-new|load-sample|wz-skip|scan|notif-/;

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let s = +(process.argv[2] || 1);
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  await p.goto('http://localhost:8123/');
  await p.waitForSelector('.q');
  await p.evaluate(() => { loadSampleHousehold(); const H = HH(); H.items.slice(0, 40).forEach(i => { i.status = 'owned'; }); persist(); go('#/home'); });
  await p.waitForTimeout(500);
  const bid = await p.evaluate(() => HH().bags[0].id); const pid = await p.evaluate(() => HH().people[0].id);
  const routes = ['home', 'bags', 'bags/' + bid, 'bags/' + bid + '/pack', 'bags/' + bid + '/missing', 'items', 'stock', 'shop', 'recs', 'pass', 'pass/' + pid, 'ice/' + pid, 'places', 'remind', 'sos', 'settings', 'more', 'review', 'households', 'wizard'];
  let clicks = 0;
  for (let i = 0; i < 350; i++) {
    if (i % 12 === 0) {
      await p.goto('http://localhost:8123/#/' + routes[Math.floor(rnd() * routes.length)]);
      await p.waitForTimeout(60);
    }
    const els = await p.$$('[data-act]:visible, a[href^="#/"]:visible, input[type=checkbox]:visible, select:visible');
    if (!els.length) continue;
    const el = els[Math.floor(rnd() * els.length)];
    const act = await el.getAttribute('data-act');
    if (act && SKIP.test(act)) continue;
    const tag = await el.evaluate(e => e.tagName);
    try {
      if (tag === 'SELECT') {
        const opts = await el.$$('option');
        if (opts.length) await el.selectOption({ index: Math.floor(rnd() * opts.length) });
      } else {
        await el.click({ timeout: 800 });
      }
      clicks++;
    } catch (e) { /* nicht klickbar */ }
    const m = await p.$('.modal');
    if (m) {
      const r = rnd();
      if (r < 0.35) {
        const f = await p.$('.modal form');
        if (f) await p.locator('.modal button[type=submit]').first().click({ timeout: 500 }).catch(() => { });
        else await p.locator('[data-act=dlg-yes]').first().click({ timeout: 500 }).catch(() => { });
      } else {
        await p.locator('[data-act=modal-close]').last().click({ timeout: 500 }).catch(() => { });
      }
    }
    await p.waitForTimeout(20);
  }
  const bad = await p.evaluate(() => /Anzeige fehlgeschlagen/.test(document.body.innerText));
  console.log('Seed ' + process.argv[2] + ': ' + clicks + ' Aktionen, Konsolenfehler: ' + errs.length + ', Fehlerseite: ' + bad);
  if (errs.length) console.log([...new Set(errs)].slice(0, 8));
  if (errs.length || bad) process.exitCode = 1;
  await b.close();
  srv.close();
})();
