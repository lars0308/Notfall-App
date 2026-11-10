const { chromium } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.topbar', { timeout: 8000 });
  console.log('hash', await p.evaluate(() => location.hash), 'title', await p.title());
  await p.screenshot({ path: 'tests/out/01-wizard1.png' });
  console.log('errors:', errs);
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
