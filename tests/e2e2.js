// Vertiefter End-to-End-Test: Formulare, 3D-Picking, Safe, Backup/Restore, PIN-Sperre ...
const { chromium } = require('playwright'); const { start } = require('./serve'); const fs = require('fs');
const results = []; const ok = (name, cond, extra) => { results.push([cond ? 'OK  ' : 'FAIL', name, extra === undefined ? '' : String(extra)]); if (!cond) process.exitCode = 1; };
(async () => {
  const srv = await start(8123); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, acceptDownloads: true, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  const click = s => p.locator(s).first().click(); const shot = n => p.screenshot({ path: `tests/out/${n}.png` });
  const waitText = (t, to = 8000) => p.waitForFunction(t => document.body.innerText.includes(t), t, { timeout: to });
  const confirmYes = () => p.locator('[data-act=dlg-yes]').click();
  const H = () => p.evaluate(() => { const h = HH(); return { items: h.items.length, owned: h.items.filter(i => i.status === 'owned').length, shop: h.shop.filter(s => !s.bought).length, bags: h.bags.length, contacts: h.contacts.length, rooms: h.rooms.length, name: h.name }; });
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.topbar');
  // --- Beispielhaushalt
  await click('[data-act=load-sample]'); await confirmYes(); await waitText('Beispielhaushalt');
  const s0 = await H(); ok('Beispielhaushalt geladen (2 Erw., 1 Kind, 2 Rucksäcke)', s0.bags === 2 && (await p.evaluate(() => HH().people.length)) === 3, JSON.stringify(s0));
  ok('Beispieldaten enthalten 54 l Wasser', await p.evaluate(() => HH().items.some(i => i.key === 'water_stock' && i.status === 'owned' && i.qty >= 54)));
  // --- Rucksack-Detail + 3D Picking
  await p.goto('http://localhost:8123/#/bags'); await p.waitForSelector('[data-bagthumb]'); await p.locator('a.card').first().click(); await p.waitForSelector('#bagcv');
  await p.waitForTimeout(300);
  const pickPt = await p.evaluate(() => { const g = UI.bag3d; const hit = g.hits.slice().reverse().find(h => h.slot && g.comps.some(c => c.slot === h.slot)); if (!hit) return null; const cx = hit.pts.reduce((a, q) => a + q[0], 0) / hit.pts.length, cy = hit.pts.reduce((a, q) => a + q[1], 0) / hit.pts.length; const r = g.cv.getBoundingClientRect(); return { x: r.left + cx / g.dpr, y: r.top + cy / g.dpr, slot: hit.slot }; });
  ok('3D-Ansicht hat anklickbare Fächer', !!pickPt, JSON.stringify(pickPt));
  await p.locator('#bagcv').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
  const pt2 = await p.evaluate(() => { const g = UI.bag3d; const hit = g.hits.slice().reverse().find(h => h.slot && g.comps.some(c => c.slot === h.slot)); const cx = hit.pts.reduce((a, q) => a + q[0], 0) / hit.pts.length, cy = hit.pts.reduce((a, q) => a + q[1], 0) / hit.pts.length; const r = g.cv.getBoundingClientRect(); return { x: r.left + cx / g.dpr, y: r.top + cy / g.dpr }; });
  await p.mouse.click(pt2.x, pt2.y); await p.waitForTimeout(250);
  const sel = await p.evaluate(() => BAGUI.sel); ok('Tippen auf Fach wählt es aus', !!sel, sel);
  await shot('20-bag-selected');
  // Drehen per Drag verändert Ansicht
  const yaw0 = await p.evaluate(() => UI.bag3d.yaw); const cb = await p.locator('#bagcv').boundingBox();
  await p.mouse.move(cb.x + 100, cb.y + 100); await p.mouse.down(); await p.mouse.move(cb.x + 220, cb.y + 110, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok('Ziehen dreht das Modell', (await p.evaluate(() => UI.bag3d.yaw)) !== yaw0);
  await click('[data-act=bg-view][data-v=back]'); await p.waitForTimeout(500); ok('Rückansicht-Button', Math.abs(Math.abs(await p.evaluate(() => UI.bag3d.yaw % (2 * Math.PI))) - Math.PI) < 0.2);
  await click('[data-act=bg-zoom][data-z="1.2"]'); ok('Zoom', (await p.evaluate(() => UI.bag3d.zoom)) > 1);
  // Fach hinzufügen / umbenennen / löschen
  const nComps = await p.evaluate(() => HH().bags[0].comps.length);
  await click('[data-act=comp-add]'); await p.waitForSelector('.modal'); await p.fill('.modal [name=name]', 'Erste-Hilfe-Fach'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Fach hinzugefügt', (await p.evaluate(() => HH().bags[0].comps.length)) === nComps + 1);
  const cid = await p.evaluate(() => HH().bags[0].comps.find(c => c.name === 'Erste-Hilfe-Fach').id);
  await p.evaluate(id => { BAGUI.sel = id; rerender(true); }, cid); await click('[data-act=comp-edit]'); await p.fill('.modal [name=name]', 'Notfallfach'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Fach umbenannt', await p.evaluate(() => HH().bags[0].comps.some(c => c.name === 'Notfallfach')));
  // Gegenstand in Fach verschieben
  await p.evaluate(() => { BAGUI.sel = null; rerender(true); });
  const mv = await p.evaluate(() => { const b = HH().bags[0]; const it = b && H_items(b)[0]; function H_items(b) { return HH().items.filter(i => i.bagId === b.id); } return it ? it.id : null; });
  await p.locator(`[data-act=bag-item-move][data-id="${mv}"]`).click(); await p.selectOption('.modal [name=compId]', cid); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Gegenstand ins neue Fach verschoben', await p.evaluate(id => HH().items.find(i => i.id === id).compId, mv) === cid);
  await p.evaluate(id => { BAGUI.sel = id; rerender(true); }, cid); await click('[data-act=comp-del]'); await confirmYes(); await p.waitForTimeout(200);
  ok('Fach gelöscht, Gegenstand bleibt erhalten', !(await p.evaluate(() => HH().bags[0].comps.some(c => c.name === 'Notfallfach'))) && !!(await p.evaluate(id => HH().items.find(i => i.id === id), mv)));
  // Gepackt-Checkbox
  const packBefore = await p.evaluate(() => HH().items.filter(i => i.packed).length); await p.locator('[data-change=bag-pack-toggle]').first().check(); await p.waitForTimeout(150);
  ok('Packstatus per Checkbox', (await p.evaluate(() => HH().items.filter(i => i.packed).length)) === packBefore + 1);
  // --- Neuer Gegenstand per Vorlage mit Foto-Notiz
  await p.goto('http://localhost:8123/#/items'); await p.fill('#invq', 'zzzzqqqq'); await p.waitForFunction(() => /Keine Gegenstände gefunden/.test(document.body.innerText)); ok('Inventar-Suche ohne Treffer zeigt Hinweis (kein Fehler)', true); await p.fill('#invq', ''); await click('[data-act=item-new]'); await p.waitForSelector('#tpllist .li'); await p.fill('#tq', 'Taschenlampe'); await p.waitForTimeout(100);
  await p.locator('#tpllist [data-act=tpl-pick]').first().click(); await p.waitForSelector('.modal [name=name]');
  await p.fill('.modal [name=notes]', 'Ersatzbatterien im Seitenfach'); await p.fill('.modal [name=weightG]', '150'); await p.fill('.modal [name=expiry]', '2026-11-20'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(250);
  ok('Gegenstand angelegt mit Notiz', await p.evaluate(() => HH().items.some(i => i.notes === 'Ersatzbatterien im Seitenfach' && i.expiry === '2026-11-20')));
  const newId = await p.evaluate(() => HH().items.find(i => i.notes === 'Ersatzbatterien im Seitenfach').id);
  await p.goto('http://localhost:8123/#/item/' + newId); await p.waitForSelector('#itemform');
  await p.fill('#itemform [name=notes]', 'Notiz geändert'); await p.locator('#itemform button[type=submit]').click(); await p.waitForTimeout(150);
  ok('Notiz auf Detailseite bearbeitbar', await p.evaluate(id => HH().items.find(i => i.id === id).notes, newId) === 'Notiz geändert');
  await click('[data-act=item-dup]'); await p.waitForTimeout(250); ok('Duplizieren', await p.evaluate(() => HH().items.some(i => /\(Kopie\)/.test(i.name))));
  await click('[data-act=item-arch]'); await p.waitForTimeout(150); ok('Archivieren', await p.evaluate(() => HH().items.some(i => i.archived)));
  await click('[data-act=item-del]'); await confirmYes(); await p.waitForTimeout(250); ok('Löschen', !(await p.evaluate(() => HH().items.some(i => /\(Kopie\)/.test(i.name)))));
  // --- Einkaufsliste: Doppelkauf-Erkennung
  await p.goto('http://localhost:8123/#/shop'); await click('[data-act=shop-new]'); await p.fill('.modal [name=name]', 'Zelt'); await p.locator('.modal button[type=submit]').click(); await waitText('Schon vorhanden');
  ok('Doppelkauf-Warnung erscheint', true); await p.locator('[data-act=dlg-no]').last().click(); await p.waitForFunction(() => !document.querySelector('.modal'));
  await click('[data-act=shop-new]'); await p.fill('.modal [name=name]', 'Sonnencreme'); await p.fill('.modal [name=estPrice]', '8.5'); await p.fill('.modal [name=qty]', '2'); await p.locator('.modal button[type=submit]').click(); await p.waitForFunction(() => HH().shop.some(s => s.name === 'Sonnencreme'), null, { timeout: 5000 }).catch(() => { }); await p.waitForTimeout(200);
  ok('Artikel auf Einkaufsliste', await p.evaluate(() => HH().shop.some(s => s.name === 'Sonnencreme' && !s.bought)), await p.evaluate(() => JSON.stringify(HH().shop.map(s => s.name)) + ' modal:' + (document.querySelector('.modal') ? document.querySelector('.modal').innerText.slice(0, 120) : 'none')));
  await click('[data-act=shop-buy]'); await p.waitForSelector('.modal [name=price]'); await p.fill('.modal [name=price]', '16'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(250);
  const bought = await p.evaluate(() => { const it = HH().items.find(i => i.name === 'Sonnencreme'); return it && it.status === 'owned' && it.price === 16; });
  ok('Kauf übernimmt Gegenstand ins Inventar (mit Preis)', bought);
  // --- Empfehlungen
  await p.goto('http://localhost:8123/#/recs'); await p.waitForSelector('.card');
  const shop0 = (await H()).shop; await click('[data-act=rec-shop]'); await p.waitForTimeout(400);
  ok('Empfehlung → Einkaufsliste', (await H()).shop > shop0);
  await click('[data-act=rec-hide]'); await p.waitForTimeout(200); ok('Empfehlung ausblenden', await p.evaluate(() => Object.values(HH().recs).some(r => r.state === 'hidden')));
  // --- Kontakte
  await p.goto('http://localhost:8123/#/contacts'); await click('[data-act=contact-edit][data-id=""]'); await p.fill('.modal [name=name]', 'Oma Erna'); await p.fill('.modal [name=phone]', '0301234567'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Kontakt gespeichert', await p.evaluate(() => HH().contacts.some(c => c.name === 'Oma Erna' && c.phone === '0301234567')));
  await click('[data-act=ct-tab][data-tab=meeting]'); await click('[data-act=place-edit]'); await p.fill('.modal [name=name]', 'Spielplatz'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(200);
  ok('Treffpunkt gespeichert', await p.evaluate(() => HH().meeting.length === 1));
  // --- Schutzraum
  await p.goto('http://localhost:8123/#/rooms'); await click('[data-act=room-new]'); await p.fill('.modal [name=name]', 'Keller'); await p.locator('.modal button[type=submit]').click(); await p.waitForSelector('#roomform');
  await p.locator('[data-change=room-risk]').first().check(); await p.waitForTimeout(150);
  ok('Schutzraum-Risiko markierbar + Hinweis „nicht geprüft“', await p.evaluate(() => HH().rooms[0].risks[0].flag) && /Nicht fachlich geprüft/.test(await p.locator('body').innerText()));
  ok('Risiko erzeugt Empfehlung', await p.evaluate(() => computeRecs(HH(), DB.settings).some(r => r.id.startsWith('r:room:'))));
  // --- Erinnerungen
  await p.goto('http://localhost:8123/#/remind'); const nextBefore = await p.evaluate(() => HH().reminders[0].next); const rid = await p.evaluate(() => HH().reminders[0].id);
  await p.locator(`[data-act=rem-done][data-id="${rid}"]`).click(); await p.waitForTimeout(150); ok('Erinnerung erledigt verschiebt Termin', (await p.evaluate(id => HH().reminders.find(r => r.id === id).lastDone, rid)) !== null);
  // --- Notfallmodus
  await p.goto('http://localhost:8123/#/sos'); await p.waitForSelector('.callbtn'); ok('Notfallmodus: 112 + Hinweis auf Behörden', /112/.test(await p.locator('body').innerText()) && /Vorrang/.test(await p.locator('body').innerText())); await shot('21-sos');
  // --- Einstellungen: Theme/Textgröße
  await p.goto('http://localhost:8123/#/settings'); await p.locator('input[name=theme][value=light]').check(); await p.locator('input[name=scale][value=xl]').check(); await p.waitForTimeout(100);
  ok('Hell-Modus + große Schrift', await p.evaluate(() => document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.scale === 'xl')); await shot('22-settings-light');
  await p.locator('input[name=theme][value=dark]').check(); await p.locator('input[name=scale][value=m]').check();
  // --- Safe
  await p.goto('http://localhost:8123/#/safe'); await p.waitForSelector('[data-form=safe-create]');
  await p.fill('[data-form=safe-create] [name=p1]', 'Geheimes-Passwort-123'); await p.fill('[data-form=safe-create] [name=p2]', 'Geheimes-Passwort-123'); await p.locator('[data-form=safe-create] button[type=submit]').click(); await p.waitForSelector('[data-act=safe-import]', { timeout: 15000 });
  ok('Safe angelegt und entsperrt', await p.evaluate(() => Vault.unlocked));
  fs.writeFileSync('tests/out/geheim.pdf', '%PDF-1.4 STRENG-GEHEIMER-INHALT-4711 Personalausweis Nummer L01X00T47');
  let [fc] = await Promise.all([p.waitForEvent('filechooser'), click('[data-act=safe-import]')]); await fc.setFiles('tests/out/geheim.pdf'); await p.waitForSelector('.modal [name=name]');
  await p.fill('.modal [name=name]', 'Mein-Reisepass-Scan.pdf'); await p.selectOption('.modal [name=category]', 'Reisepass'); await p.locator('.modal button[type=submit]').click(); await waitText('Mein-Reisepass-Scan.pdf');
  ok('PDF importiert und gelistet', true);
  const raw = await p.evaluate(async () => { const out = []; for (const k of await KV.list('')) out.push(k + '=' + (await KV.get(k))); return out.join('\n'); });
  ok('Safe: Dateiinhalt NICHT im Klartext gespeichert', !/STRENG-GEHEIMER|4711|L01X00T47/.test(raw));
  ok('Safe: Dateiname/Metadaten NICHT im Klartext gespeichert', !/Mein-Reisepass-Scan/.test(raw));
  await click('[data-act=safe-lock]'); await p.waitForSelector('[data-form=safe-unlock]'); await p.fill('[data-form=safe-unlock] [name=p1]', 'falsch'); await p.locator('[data-form=safe-unlock] button[type=submit]').click(); await p.waitForTimeout(600);
  ok('Falsches Safe-Passwort bleibt gesperrt', !(await p.evaluate(() => Vault.unlocked)));
  await p.fill('[data-form=safe-unlock] [name=p1]', 'Geheimes-Passwort-123'); await p.locator('[data-form=safe-unlock] button[type=submit]').click(); await waitText('Mein-Reisepass-Scan.pdf'); ok('Richtiges Passwort entsperrt', true);
  const dl = p.waitForEvent('download'); await click('[data-act=safe-open]'); await p.waitForSelector('.modal'); await click('[data-act=safe-export]'); await confirmYes(); const d1 = await dl; const exported = fs.readFileSync(await d1.path(), 'utf8');
  ok('Export liefert Originalinhalt (entschlüsselt)', exported.includes('STRENG-GEHEIMER-INHALT-4711'));
  // --- Backup & Restore
  await p.goto('http://localhost:8123/#/settings'); const cnt0 = await H(); await click('[data-act=backup-make]'); await p.fill('.modal [name=p1]', 'Backup-Passwort-9'); await p.fill('.modal [name=p2]', 'Backup-Passwort-9');
  const dl2 = p.waitForEvent('download'); await p.locator('.modal button[type=submit]').click(); const d2 = await dl2; const bpath = 'tests/out/test.nfbak'; fs.copyFileSync(await d2.path(), bpath);
  const bak = fs.readFileSync(bpath, 'utf8'); ok('Backup ist verschlüsselt (kein Klartext)', !/Sonnencreme|Oma Erna|STRENG-GEHEIMER|Anna|ramipril/i.test(bak) && bak.includes('"kind":"backup"'), bak.length + ' Bytes');
  await click('[data-act=wipe-all]'); await p.fill('.modal [name=v]', 'LÖSCHEN'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(800);
  ok('Alle Daten gelöscht', (await p.evaluate(() => HH().items.length)) === 0 && (await p.evaluate(async () => !(await Vault.exists()))));
  await p.goto('http://localhost:8123/#/settings'); [fc] = await Promise.all([p.waitForEvent('filechooser'), click('[data-act=backup-restore]')]); await fc.setFiles(bpath);
  await p.waitForSelector('.modal [name=v]'); await p.fill('.modal [name=v]', 'falsches'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(1500);
  ok('Restore mit falschem Passwort scheitert ohne Datenänderung', (await p.evaluate(() => HH().items.length)) === 0);
  [fc] = await Promise.all([p.waitForEvent('filechooser'), click('[data-act=backup-restore]')]); await fc.setFiles(bpath);
  await p.waitForSelector('.modal [name=v]'); await p.fill('.modal [name=v]', 'Backup-Passwort-9'); await p.locator('.modal button[type=submit]').click(); await p.waitForSelector('[data-act=dlg-yes]', { timeout: 15000 }); await confirmYes(); await p.waitForTimeout(1500);
  const cnt1 = await H(); ok('Restore stellt alle Daten wieder her', cnt1.items === cnt0.items && cnt1.contacts === cnt0.contacts && cnt1.bags === cnt0.bags, JSON.stringify([cnt0, cnt1]));
  await p.goto('http://localhost:8123/#/safe'); await p.waitForSelector('[data-form=safe-unlock]'); await p.fill('[data-form=safe-unlock] [name=p1]', 'Geheimes-Passwort-123'); await p.locator('[data-form=safe-unlock] button[type=submit]').click(); await waitText('Mein-Reisepass-Scan.pdf', 8000);
  ok('Safe nach Restore weiterhin entsperrbar', true);
  // --- PIN-Sperre
  await p.goto('http://localhost:8123/#/users'); await click('[data-act=lock-enable]'); await p.fill('.modal [name=name]', 'Anna'); await p.fill('.modal [name=pin]', '2468'); await p.fill('.modal [name=pin2]', '2468'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(800);
  ok('PIN gespeichert (gehasht, nicht im Klartext)', await p.evaluate(() => DB.users.length === 1 && !JSON.stringify(DB.users).includes('2468') && DB.users[0].pin.hash.length > 20));
  await p.reload(); await p.waitForSelector('.lock'); ok('Nach Neustart ist die App gesperrt', await p.locator('.lock').isVisible());
  ok('Sperrbildschirm zeigt Notruf-Zugang', /Notruf/.test(await p.locator('.lock').innerText()));
  for (const k of '1111') await p.locator(`[data-act=pin-key][data-k="${k}"]`).click(); await click('[data-act=pin-ok]'); await p.waitForTimeout(400); ok('Falsche PIN wird abgewiesen', await p.locator('.lock').isVisible());
  for (const k of '2468') await p.locator(`[data-act=pin-key][data-k="${k}"]`).click(); await click('[data-act=pin-ok]'); await p.waitForSelector('.topbar', { timeout: 5000 }); ok('Richtige PIN entsperrt', true);
  console.log(results.map(r => r.join(' ')).join('\n')); console.log('Konsolenfehler:', errs.length ? errs : 'keine'); if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
