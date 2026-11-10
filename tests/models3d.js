const { chromium } = require('playwright'); const { start } = require('./serve');
(async () => {
  const srv = await start(8123); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1100, height: 760 }, colorScheme: 'dark' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.topbar');
  await p.evaluate(() => {
    document.body.innerHTML = '<div id="g" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;background:#171d22"></div>';
    const models = ['trek', 'tac', 'day', 'kid', 'school', 'duffel', 'case', 'trek']; const colors = ['olive', 'coyote', 'navy', 'red', 'grey', 'black', 'orange', 'olive'];
    const views = [[-.55, .22], [-.55, .22], [-.55, .22], [-.55, .22], [-.55, .22], [-.55, .22], [-.55, .22], [Math.PI, .15]];
    models.forEach((m, i) => {
      const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:300px;background:#1f272e;border-radius:8px'; document.getElementById('g').appendChild(cv);
      const g = new Bag3D(cv, { onPick() {} }); g.setModel(m, colors[i]);
      const slots = (MODEL_SLOTS[m] || MODEL_SLOTS.trek).map((s, k) => ({ id: 'c' + k, slot: s[0], name: s[1], weightG: 1200 + k * 700, fillPct: 50, status: ['packed', 'partial', 'open', 'over', 'empty', 'packed'][k % 6] }));
      g.setComps(slots, i === 0 ? 'c3' : null); g.yaw = views[i][0]; g.pitch = views[i][1]; g.resize(); g.draw();
    });
  });
  await p.waitForTimeout(300); await p.screenshot({ path: 'tests/out/3d-models.png' });
  console.log('errors', errs); await b.close(); srv.close();
})();
