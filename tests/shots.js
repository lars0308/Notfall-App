// Sicht-Pruefung: Tablet-Layout und helles Farbschema (Screenshots nach tests/out/)
const { chromium } = require('playwright');
const { start } = require('./serve');

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const errs = [];
  for (const [name, vp, theme] of [['tablet', { width: 1100, height: 820 }, 'dark'], ['hell', { width: 400, height: 860 }, 'light']]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
    await p.goto('http://localhost:8123/');
    await p.waitForSelector('.q');
    await p.screenshot({ path: `tests/out/s-${name}-frage.png` });
    await p.evaluate(t => {
      loadSampleHousehold(); const H = HH();
      H.items.slice(0, 45).forEach(i => { i.status = 'owned'; });
      H.contacts.push({ id: 'k1', name: 'Oma Erna', relation: 'Oma', phone: '030 123', type: 'ice' });
      H.people[2].passContacts = ['k1']; H.people[2].needs.allergies = 'Erdnüsse'; H.people[2].share.allergies = true;
      DB.settings.theme = t; persist(); applyTheme(); go('#/home');
    }, theme);
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getElementById('toasts').innerHTML = ''; });
    await p.screenshot({ path: `tests/out/s-${name}-start.png` });
    const bid = await p.evaluate(() => HH().bags[0].id); const pid = await p.evaluate(() => HH().people[2].id);
    for (const [r, n] of [['bags/' + bid, 'tasche'], ['bags/' + bid + '/pack', 'packen'], ['pass/' + pid, 'pass'], ['ice/' + pid, 'qr'], ['review', 'liste'], ['sos', 'notfall']]) {
      await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(350);
      await p.screenshot({ path: `tests/out/s-${name}-${n}.png` });
    }
    await p.close();
  }
  console.log('Fehler:', errs.length ? errs : 'keine');
  await b.close(); srv.close();
})();
