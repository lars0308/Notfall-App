// Wischen mit dem Finger (Touch) muss auf langen Seiten scrollen – Handy-Emulation.
const { chromium, devices } = require('playwright');
const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  let fails = 0; const ok = (n, c, d) => { console.log((c ? 'OK   ' : 'FAIL ') + n + (c ? '' : ' ' + d)); if (!c) fails++; };
  const swipe = async () => { const x = 200, y = 600; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 15; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 350 * i / 15 }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400); };
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  await p.evaluate(() => { loadSampleHousehold(); persist(); go('#/home'); });
  const pid = await p.evaluate(() => HH().people[0].id); const bid = await p.evaluate(() => HH().bags[0].id);
  for (const r of ['items', 'more', 'bags/' + bid, 'pass/' + pid, 'settings', 'remind', 'sos', 'card/' + pid]) {
    await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(400);
    const room = await p.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
    await swipe(); const st = await p.evaluate(() => document.scrollingElement.scrollTop);
    ok(`Wischen scrollt: #/${r.split('/')[0]}`, room < 50 || st > 100, `scrollTop=${st}, Platz=${room}`);
    const nav = await p.evaluate(() => { const n = document.querySelector('.bottomnav'), t = document.querySelector('.topbar'); return n.getBoundingClientRect().bottom <= innerHeight + 1 && t.getBoundingClientRect().top === 0; });
    ok(`Kopfzeile und Navigation bleiben sichtbar: #/${r.split('/')[0]}`, nav, '');
  }
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
