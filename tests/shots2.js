// Screenshots der neuen Bildschirme (Karte mit Test-Kacheln, Kartendesigner, Lage, Probealarm)
const { chromium } = require('playwright');
const { start } = require('./serve');

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // Attrappe: liefert gezeichnete Test-Kacheln (Raster + Koordinaten), damit die Karte sichtbar wird
  await p.addInitScript(() => {
    const store = {}; const tiles = {};
    const draw = (z, x, y) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = (x + y) % 2 ? '#d9e4d0' : '#e3ead9'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#9fb3c8'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); g.fillStyle = '#7a8a99'; g.font = '14px sans-serif'; g.fillText(`${z}/${x}/${y}`, 8, 20); return c.toDataURL('image/png').split(',')[1]; };
    window.NotfallAndroid = {
      info: () => '{"native":true}', storeGet: k => (k in store ? store[k] : null), storePut: (k, v) => { store[k] = v; return true; }, storeDel: k => { delete store[k]; return true; }, storeList: q => JSON.stringify(Object.keys(store).filter(k => k.startsWith(q))), storeWipe: () => {},
      scheduleReminders: j => JSON.parse(j).length, notifStatus: () => 'granted', exactAlarmStatus: () => 'granted', alarmLog: () => '[]', requestNotifications: cb => setTimeout(() => window.__nativeResult(cb, '{"ok":true}'), 5),
      setBars: () => {}, setSecure: () => {}, printHtml: () => {}, dial: () => {}, openUrl: () => {}, openSettings: () => {}, bioAvailable: () => false, bioHas: () => false, bioClear: () => {},
      httpGet: (cb, url) => { const m = /(\d+)\/(\d+)\/(\d+)/.exec(url); setTimeout(() => window.__nativeResult(cb, JSON.stringify({ ok: true, status: 200, type: 'image/png', b64: draw(+m[1], +m[2], +m[3]) })), 1); },
      mapPut: (q, z, x, y, b64) => { tiles[`${q}/${z}/${x}/${y}`] = b64; return true; }, mapGet: (q, z, x, y) => tiles[`${q}/${z}/${x}/${y}`] ? 'data:image/png;base64,' + tiles[`${q}/${z}/${x}/${y}`] : null, mapBytes: () => 0, mapDelete: () => {},
    };
  });
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  await p.evaluate(async () => {
    loadSampleHousehold(); const H = HH(); H.items.slice(0, 50).forEach(i => { i.status = 'owned'; }); H.bags[0].location = 'Flurschrank'; H.bags[1].location = 'Keller';
    H.contacts.push({ id: 'k1', name: 'Oma Erna', relation: 'Oma', phone: '030 123456', type: 'ice' }, { id: 'k2', name: 'Anna', relation: 'Mama', phone: '0170 1111111', type: 'ice' });
    const k = H.people[2]; k.name = 'Mia'; k.role = 'Kind'; k.passContacts = ['k2', 'k1']; k.needs.allergies = 'Erdnüsse (Atemnot)'; k.share.allergies = true; k.pickup = 'Oma Erna'; k.share.pickup = true;
    H.meeting = [{ id: 'm1', name: 'Spielplatz Lindenstraße', lat: 52.5205, lon: 13.4095 }, { id: 'm2', name: 'Kirche am Markt', lat: 52.5172, lon: 13.4011, far: true }];
    const pack = await downloadRegion({ name: 'Mitte', url: 'https://karten.example/{z}/{x}/{y}.png', bbox: bboxAround(52.519, 13.405, 1.5), minz: 12, maxz: 15, attribution: '© Beispielkarte' });
    DB.maps = [pack]; MAPUI.lat = 52.519; MAPUI.lon = 13.405; MAPUI.z = 14.5; persist(); go('#/home');
  });
  const kid = await p.evaluate(() => HH().people[2].id);
  for (const [r, n] of [['map', 'karte'], ['card/' + kid, 'designer'], ['sos?s=evac', 'lage'], ['alarm', 'probealarm']]) {
    await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(800);
    await p.evaluate(() => { document.getElementById('toasts').innerHTML = ''; });
    await p.screenshot({ path: `tests/out/n-${n}.png` });
  }
  console.log('Fehler:', errs.length ? errs : 'keine');
  await b.close(); srv.close();
})();
