const { chromium } = require('playwright'); const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch();
  for (const [name, vp, scheme] of [['tablet', { width: 1100, height: 820 }, 'dark'], ['phone-light', { width: 400, height: 860 }, 'light']]) {
    const p = await (await b.newContext({ viewport: vp, colorScheme: scheme })).newPage();
    await p.goto('http://localhost:8123/'); await p.waitForSelector('[data-act=load-sample]'); await p.click('[data-act=load-sample]'); await p.click('[data-act=dlg-yes]'); await p.waitForTimeout(400);
    await p.screenshot({ path: `tests/out/s-${name}-home.png` });
    const id = await p.evaluate(() => HH().bags[0].id); await p.goto('http://localhost:8123/#/bags/' + id); await p.waitForSelector('#bagcv'); await p.waitForTimeout(500); await p.screenshot({ path: `tests/out/s-${name}-bag.png` });
    await p.goto('http://localhost:8123/#/sos'); await p.waitForTimeout(300); await p.screenshot({ path: `tests/out/s-${name}-sos.png` });
  }
  await b.close(); srv.close();
})();
