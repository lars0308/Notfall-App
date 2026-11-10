// Daten-Tests: Migration alter Daten, Assistent (spaeter/fortsetzen/Auto), Gegenstaende, Einkauf, Tasche kopieren,
// Backup/Restore, PIN-Sperre, eingeschraenkter Notfallmodus.
const { chromium } = require('playwright');
const { start } = require('./serve');
const fs = require('fs');

const results = [];
const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:8123/';

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const errs = [];
  const newPage = async () => {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    return p;
  };
  const noModal = p => p.waitForFunction(() => !document.querySelector('.modal'));

  /* ---------- 1) Migration: Datenbank der Version 2.0 (v3) ---------- */
  let p = await newPage();
  await p.goto(URL);
  await p.waitForSelector('.q');
  const old = {
    v: 3, active: 'h', settings: { theme: 'dark' }, users: [],
    households: [{
      id: 'h', name: 'Altbestand', setup: { done: true }, cfg: { goals: ['bag72', 'stock10'], strategies: ['home'], country: 'DE', housing: {}, durationHours: 240 },
      people: [{ id: 'p1', name: 'Anna', age: 38, needs: { allergies: 'Pollen', meds: [{ id: 'm1', name: 'Ramipril', dose: '5 mg', expiry: '' }] } }],
      pets: [], bags: [{ id: 'b1', name: 'Alter Rucksack', type: 'trekking', liters: 55, ownKg: 2, owner: 'p1', photos: [], comps: [{ id: 'c1', name: 'Hauptfach', slot: 'main', capL: 30 }, { id: 'c2', name: 'Geheimfach', slot: null, capL: 2 }] }],
      items: [
        { id: 'i1', name: 'Fenix Taschenlampe', category: 'Licht & Strom', qty: 1, unit: 'Stück', status: 'owned', packed: true, container: 'bag', bagId: 'b1', compId: 'c2', notes: 'Batterien im Deckel', photos: [], tags: ['light'], weightG: 150, volL: .2, prio: 'must' },
        { id: 'i2', name: 'Trinkwasser', category: 'Wasser', qty: 54, unit: 'Liter', status: 'owned', container: 'home', key: 'water_stock', photos: [], tags: ['water_supply'], prio: 'must' },
      ],
      shop: [], contacts: [{ id: 'k1', name: 'Oma Erna', type: 'ice', phone: '030 1', relation: 'Oma' }], meeting: [{ id: 'm', name: 'Spielplatz', address: 'Ecke' }], shelters: [],
      rooms: [{ id: 'r1', name: 'Keller', risks: [], checklist: [] }], reminders: [{ id: 'rm', key: 'bagcheck', title: 'Rucksackkontrolle', interval: 90, next: '2027-01-01', enabled: true }], docs: [], tasks: [{ id: 't1', title: 'x', done: false }], recs: {},
    }],
  };
  await p.evaluate(async o => { await flushDB(); await KV.put('db', JSON.stringify(o)); DB = null; }, old);
  await p.goto(URL + '#/home');
  await p.reload();
  await p.waitForSelector('.tile');
  const mig = await p.evaluate(async () => {
    const H = HH(); const it = H.items.find(i => i.id === 'i1');
    return {
      v: DB.v, backup: !!(await KV.get('db_vor_v4')), backupIsOld: JSON.parse(await KV.get('db_vor_v4')).v, name: H.name, bag: H.bags[0].name, comps: H.bags[0].comps.length,
      note: it.notes, packed: it.packed, comp: it.compId, water: H.items.find(i => i.id === 'i2').qty, box: H.box.enabled, rooms: H.rooms.length, tasks: H.tasks.length,
      contact: H.contacts[0].name, meet: H.meeting[0].name, allergy: H.people[0].needs.allergies, med: H.people[0].needs.meds[0].name, shared: Object.values(H.people[0].share).some(Boolean), hash: location.hash,
    };
  });
  ok('Migration: alter Stand wird vorher unverändert gesichert (db_vor_v4)', mig.backup && mig.backupIsOld === 3);
  ok('Migration: Tasche, Fächer, Gegenstand samt Notiz/Fach/Packstatus bleiben', mig.v === 4 && mig.bag === 'Alter Rucksack' && mig.comps === 2 && mig.note === 'Batterien im Deckel' && mig.packed && mig.comp === 'c2', JSON.stringify(mig));
  ok('Migration: Personen/Gesundheit/Kontakte/Treffpunkte bleiben; nichts automatisch freigegeben', mig.allergy === 'Pollen' && mig.med === 'Ramipril' && mig.contact === 'Oma Erna' && mig.meet === 'Spielplatz' && !mig.shared);
  ok('Migration: vorhandener Hausvorrat erscheint als Notfallkiste; gestrichene Bereiche bleiben als Daten erhalten', mig.box && mig.water === 54 && mig.rooms === 1 && mig.tasks === 1);
  ok('Migration: Start ohne erzwungenen Assistenten', mig.hash === '#/home' || mig.hash === '');
  const txt = await p.locator('body').innerText();
  ok('Startseite zeigt die alte Tasche', /Alter Rucksack/.test(txt));
  await p.goto(URL + '#/stock'); await p.waitForTimeout(200);
  ok('Notfallkiste zeigt alten Wasservorrat', /Trinkwasser/.test(await p.locator('body').innerText()) && /54/.test(await p.locator('body').innerText()));
  await p.close();

  /* ---------- 2) Assistent: schliessen, fortsetzen, Auto-Tasche ---------- */
  p = await newPage();
  await p.goto(URL); await p.waitForSelector('.q');
  await p.click('[data-act=wz-pick][data-v=evac]'); await p.click('[data-act=wz-pick][data-v="48"]');
  await p.click('[data-act=wz-later]'); await p.waitForSelector('.tile');
  ok('Assistent schließen führt zum Start (kein Zwang)', (await p.evaluate(() => location.hash)) === '#/home' && /Packassistent fortsetzen/.test(await p.locator('body').innerText()));
  await p.evaluate(() => flushDB()); await p.reload(); await p.waitForSelector('.tile');
  await p.click('a[href="#/wizard"]'); await p.waitForSelector('.q');
  ok('Zwischenstand bleibt nach Neustart (Antworten und Schritt)', await p.evaluate(() => HH().setup.draft.purpose === 'evac' && HH().setup.draft.hours === 48 && HH().setup.step === 2));
  await p.click('[data-act=wz-pick][data-v=mobile]');
  await p.locator('input[data-path="people.0.age"]').fill(''); await p.click('[data-act=wz-next]'); await p.waitForTimeout(150);
  ok('Fehlendes Alter: kurzer Hinweis statt Weiter', /Alter fehlt/.test(await p.locator('#toasts').innerText()));
  await p.locator('input[data-path="people.0.age"]').fill('30'); await p.click('[data-act=wz-next]');
  await p.click('[data-act=wz-next]'); await p.click('[data-act=wz-pick][data-f=needsYes][data-v="0"]'); await p.click('[data-act=wz-next]'); await p.click('[data-act=wz-finish]');
  await p.waitForFunction(() => location.hash === '#/review');
  const a = await p.evaluate(() => { const H = HH(); return { bags: H.bags.length, sug: H.bags[0].suggested, tarp: H.items.some(i => i.key === 'tarp'), days: H.items.find(i => i.key === 'food_ration').qty, home: H.items.filter(i => i.container === 'home').length }; });
  ok('Ohne eigene Tasche wird ein Rucksack vorgeschlagen; „draußen unterwegs“ plant Tarp; 48 h → 2 Tagesrationen', a.bags === 1 && a.sug && a.tarp && a.days === 2 && a.home === 0, JSON.stringify(a));
  await p.goto(URL + '#/wizard'); await p.waitForSelector('.q'); await p.click('[data-act=wz-pick][data-v=car]'); await p.click('[data-act=wz-next]'); await p.click('[data-act=wz-next]'); await p.click('[data-act=wz-finish]');
  await p.waitForFunction(() => location.hash === '#/review');
  const c = await p.evaluate(() => { const H = HH(); const cb = H.bags.find(x => x.role === 'car'); return { bags: H.bags.length, car: !!cb, tri: cb && H.items.some(i => i.bagId === cb.id && i.key === 'car_triangle'), keep: H.items.some(i => i.key === 'tarp') }; });
  ok('Zweiter Durchlauf „Auto“ ergänzt eine Auto-Notfalltasche, die erste Packliste bleibt', c.bags === 2 && c.car && c.tri && c.keep, JSON.stringify(c));

  /* ---------- 3) Gegenstand, Foto-loser Ablauf, Einkauf, Tasche kopieren/löschen ---------- */
  const bid = await p.evaluate(() => HH().bags.find(x => x.role !== 'car').id);
  await p.goto(URL + '#/bags/' + bid); await p.waitForSelector('.bag2d');
  await p.click('[data-act=item-new-bag]'); await p.waitForSelector('#tpllist .li'); await p.click('[data-act=tpl-blank]'); await p.waitForSelector('.modal [name=name]');
  await p.fill('.modal [name=name]', 'Lieblingsbuch'); await p.fill('.modal [name=notes]', 'liegt im Regal'); await p.locator('.modal [name=lastMinute]').check(); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  const it = await p.evaluate(id => { const x = HH().items.find(i => i.name === 'Lieblingsbuch'); return x && { bag: x.bagId === id, comp: !!x.compId, last: x.lastMinute, note: x.notes, id: x.id }; }, bid);
  ok('Eigener Gegenstand: Tasche vorbelegt, Fach automatisch, Notiz, „erst bei Abreise“', it && it.bag && it.comp && it.last && it.note === 'liegt im Regal');
  await p.goto(URL + '#/item/' + it.id); await p.waitForSelector('#itemform'); await p.fill('#itemform [name=notes]', 'geändert'); await p.locator('#itemform button[type=submit]').click(); await p.waitForTimeout(150);
  ok('Notiz auf der Detailseite änderbar', await p.evaluate(id => HH().items.find(i => i.id === id).notes, it.id) === 'geändert');
  await p.goto(URL + '#/review'); await p.waitForSelector('[data-act=ask-start]'); await p.click('[data-act=ask-start]'); await p.waitForSelector('[data-act=ask-no]'); await p.click('[data-act=ask-no]'); await p.waitForTimeout(100);
  await p.goto(URL + '#/shop'); await p.waitForSelector('[data-act=shop-buy]'); await p.click('[data-act=shop-buy]'); await p.waitForSelector('.modal [name=price]'); await p.fill('.modal [name=price]', '12'); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  ok('„Fehlt“ → Einkaufsliste → „Gekauft“ übernimmt als vorhanden', await p.evaluate(() => { const s = HH().shop[0]; const i = HH().items.find(x => x.id === s.itemId); return s.bought && i.status === 'owned' && i.price === 12; }));
  await p.goto(URL + '#/bags/' + bid); await p.waitForSelector('.bag2d'); const n0 = await p.evaluate(() => HH().items.length);
  await p.click('[data-act=bag-copy]'); await p.waitForTimeout(300);
  const cp = await p.evaluate(id => { const H = HH(); const nb = H.bags[H.bags.length - 1]; return { bags: H.bags.length, name: nb.name, items: H.items.filter(i => i.bagId === nb.id).length, src: H.items.filter(i => i.bagId === id).length, compsDistinct: !H.bags.find(x => x.id === id).comps.some(c => nb.comps.some(d => d.id === c.id)), newId: nb.id }; }, bid);
  ok('Tasche kopieren: eigene Fächer und Inhalte, Original unverändert', cp.bags === 3 && /Kopie/.test(cp.name) && cp.items === cp.src && cp.compsDistinct, JSON.stringify(cp));
  await p.click('[data-act=bag-del]'); await p.click('[data-act=dlg-yes]'); await p.waitForTimeout(300);
  ok('Tasche löschen behält die Gegenstände (kein Datenverlust)', await p.evaluate(([id, n]) => !HH().bags.some(x => x.id === id) && HH().items.length === n, [cp.newId, n0 + cp.items]));

  /* ---------- 4) Notfallpass-Daten + Backup/Restore ---------- */
  const pid = await p.evaluate(() => HH().people[0].id);
  await p.evaluate(id => { const H = HH(); const x = H.people.find(q => q.id === id); x.name = 'Anna'; x.needs.allergies = 'Penicillin'; x.needs.conditions = 'Diabetes'; x.share.allergies = true; const k = { id: 'kk', name: 'Ben', relation: 'Partner', phone: '0171 5', type: 'ice' }; H.contacts.push(k); x.passContacts = ['kk']; H.bags[0].location = 'Kellerregal'; persist(); }, pid);
  await p.goto(URL + '#/settings'); await p.waitForSelector('[data-act=backup-make]');
  const before = await p.evaluate(() => JSON.stringify({ i: HH().items.length, b: HH().bags.length, s: HH().shop.length }));
  await p.click('[data-act=backup-make]'); await p.fill('.modal [name=p1]', 'Backup-Pass-99'); await p.fill('.modal [name=p2]', 'Backup-Pass-99');
  const dl = p.waitForEvent('download'); await p.locator('.modal button[type=submit]').click(); const d = await dl; const bpath = 'tests/out/t.nfbak'; fs.copyFileSync(await d.path(), bpath);
  const bak = fs.readFileSync(bpath, 'utf8');
  ok('Backup ist verschlüsselt (kein Klartext von Namen/Gesundheit/Kontakten)', bak.includes('"kind":"backup"') && !/Anna|Penicillin|Diabetes|0171 5|Lieblingsbuch|Kellerregal/.test(bak), bak.length + ' Bytes');
  await p.click('[data-act=wipe-all]'); await p.fill('.modal [name=v]', 'LÖSCHEN'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(800);
  ok('„Alle Daten löschen“ leert alles', await p.evaluate(() => HH().items.length === 0 && HH().people.length === 0));
  await p.goto(URL + '#/settings'); await p.waitForSelector('[data-act=backup-restore]');
  let [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act=backup-restore]')]); await fc.setFiles(bpath);
  await p.waitForSelector('.modal [name=v]'); await p.fill('.modal [name=v]', 'falsch'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(1500);
  ok('Falsches Backup-Passwort ändert nichts', await p.evaluate(() => HH().items.length === 0));
  [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act=backup-restore]')]); await fc.setFiles(bpath);
  await p.waitForSelector('.modal [name=v]'); await p.fill('.modal [name=v]', 'Backup-Pass-99'); await p.locator('.modal button[type=submit]').click(); await p.waitForSelector('[data-act=dlg-yes]', { timeout: 15000 }); await p.click('[data-act=dlg-yes]'); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => JSON.stringify({ i: HH().items.length, b: HH().bags.length, s: HH().shop.length }));
  const rp = await p.evaluate(() => { const x = HH().people[0]; return x.needs.conditions === 'Diabetes' && x.share.allergies === true && x.passContacts[0] === 'kk' && HH().bags[0].location === 'Kellerregal'; });
  ok('Wiederherstellung bringt alles zurück (Taschen, Gegenstände, Pass, Freigaben, Kontakte)', before === after && rp, before + ' / ' + after);

  /* ---------- 5) PIN-Sperre und Notfallpass ohne Entsperren ---------- */
  await p.goto(URL + '#/settings'); await p.waitForSelector('[data-act=lock-enable]'); await p.click('[data-act=lock-enable]');
  await p.fill('.modal [name=pin]', '1111'); await p.fill('.modal [name=pin2]', '1111'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(400);
  ok('Zu einfache PIN wird abgelehnt', await p.evaluate(() => DB.users.length === 0));
  await p.fill('.modal [name=pin]', '2468'); await p.fill('.modal [name=pin2]', '2468'); await p.locator('.modal button[type=submit]').click(); await noModal(p);
  ok('PIN gesetzt (nur als Hash gespeichert)', await p.evaluate(() => DB.users.length === 1 && !JSON.stringify(DB.users).includes('2468')));
  await p.evaluate(() => flushDB()); await p.reload(); await p.waitForSelector('.lock');
  const pin = async digits => { for (const k of digits) await p.locator('[data-act=pin-key][data-k="' + k + '"]').click(); await p.click('[data-act=pin-ok]'); };
  await pin('9999'); await p.waitForTimeout(400); ok('Falsche PIN bleibt gesperrt', await p.locator('.lock').isVisible());
  await p.click('[data-act=lock-sos]'); await p.waitForSelector('.callbtn');
  const sos = await p.locator('body').innerText();
  ok('Ohne Entsperren: Notruf, Kontakt und NUR freigegebene Angaben (Allergie ja, Krankheit nein)', /112/.test(sos) && /Ben/.test(sos) && /Penicillin/.test(sos) && !/Diabetes/.test(sos));
  ok('Ohne Entsperren keine Navigation in andere Bereiche', (await p.locator('.bottomnav:visible').count()) === 0 && (await p.locator('a[href^="#/pass/"]:visible').count()) === 0);
  await p.goto(URL + '#/pass/' + pid); await p.waitForTimeout(300); ok('Direktaufruf des Profils führt zurück zur Sperre', await p.locator('.lock').isVisible());
  await pin('2468'); await p.waitForSelector('.topbar'); ok('Richtige PIN entsperrt', true);
  await p.goto(URL + '#/settings'); await p.waitForSelector('[data-act=lock-disable]'); await p.click('[data-act=lock-disable]'); await p.click('[data-act=dlg-yes]'); await p.waitForTimeout(200);
  ok('Sperre lässt sich wieder ausschalten', await p.evaluate(() => DB.users.length === 0));

  console.log(results.map(r => r.join(' ')).join('\n'));
  console.log('Konsolenfehler:', errs.length ? errs : 'keine');
  if (errs.length) process.exitCode = 1;
  await b.close();
  srv.close();
})().catch(e => { console.error('FAIL', String(e.message).split('\n').slice(0, 6).join('\n')); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
