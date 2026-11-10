// Abnahme-Ablauf v1 (Fokus-Update): Tasche anlegen -> Fragen -> Packliste -> Fach -> packen -> Notfallpass/QR
const { chromium } = require('playwright'); const { start } = require('./serve'); const fs = require('fs');
const results = []; const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };
(async () => {
  const srv = await start(8123); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, colorScheme: 'dark', acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  const click = s => p.locator(s).first().click(); const shot = n => p.screenshot({ path: `tests/out/f-${n}.png` });
  const hash = () => p.evaluate(() => location.hash); const body = () => p.locator('body').innerText();
  const noMarkup = async name => { const t = await body(); ok(name + ': kein Fehler/Markup im Text', !/Anzeige fehlgeschlagen|undefined|NaN|\[object|<\/?(div|span|button|a|svg)[ >]|class="/.test(t), (t.match(/Anzeige fehlgeschlagen.*|undefined|NaN|\[object[^\]]*\]|class="/) || [''])[0]); };
  await p.goto('http://localhost:8123/'); await p.waitForSelector('.q');
  ok('Erster Start: Packassistent mit einer Frage', (await hash()) === '#/wizard' && (await p.locator('.q').count()) === 1); await shot('01-frage');
  await p.fill('#wzn', 'Familie Test'); await click('[data-act=wz-next]');
  await p.locator('input[data-path="people.0.name"]').fill('Anna'); await p.locator('input[data-path="people.0.age"]').fill('38');
  await click('[data-act=wz-add-person][data-kind=child]'); await p.locator('input[data-path="people.1.name"]').fill('Mia'); await p.locator('input[data-path="people.1.age"]').fill('4'); await shot('02-personen');
  await click('[data-act=wz-next]'); ok('Nach Name und Personen: Frage nach dem Wohnort', /Wo wohnst du/.test(await p.locator('.q').innerText()));
  await p.fill('#wzo', 'Köln'); await click('[data-act=wz-pick][data-f=home][data-v=flat]');
  await click('[data-act=wz-pick][data-v=evac]'); ok('Antwortkarte springt direkt zur nächsten Frage', /wie lange/i.test(await p.locator('.q').innerText()));
  await click('[data-act=wz-pick][data-v="72"]'); await click('[data-act=wz-pick][data-v=shelter]');
  await click('[data-act=wz-pet][data-v=Hund]'); await click('[data-act=wz-next]');
  await click('[data-act=wz-pick][data-f=needsYes][data-v="1"]'); await p.locator('input[data-path="people.0._meds"]').fill('Ramipril'); await p.locator('input[data-path="people.1.needs.allergies"]').fill('Erdnüsse'); await click('[data-act=wz-next]');
  // Rucksack auswählen
  ok('Danach: Rucksack auswählen', /Welchen Rucksack/.test(await p.locator('.q').innerText()) && (await p.locator('[data-act=wz-bag]').count()) >= 6);
  await click('[data-act=wz-bag][data-type=tactical]'); await p.waitForTimeout(100); await click('[data-act=bag-edit]'); await p.waitForSelector('.modal [name=name]');
  await p.fill('.modal [name=name]', 'Mein Tactical'); await p.fill('.modal [name=location]', 'Flur'); await p.locator('.modal button[type=submit]').click();
  await p.waitForFunction(() => !document.querySelector('.modal')); ok('Tasche im Assistenten angelegt, Assistent bleibt offen', (await hash()) === '#/wizard' && await p.evaluate(() => HH().bags.length === 1 && HH().bags[0].name === 'Mein Tactical' && HH().setup.draft.name === 'Familie Test' && HH().setup.draft.place === 'Köln'), await p.evaluate(() => JSON.stringify([HH().bags.map(b => b.name), HH().setup.draft && HH().setup.draft.name]))); await shot('03-taschen');
  await click('[data-act=wz-finish]'); await p.waitForFunction(() => location.hash === '#/review');
  ok('Name und Wohnort gespeichert', await p.evaluate(() => HH().name === 'Familie Test' && HH().cfg.housing.place === 'Köln' && HH().cfg.housing.type === 'flat'));
  const s1 = await p.evaluate(() => { const H = HH(); return { items: H.items.length, bags: H.bags.length, home: H.items.filter(i => i.container === 'home' && i.source === 'plan').length, med: H.items.some(i => /Ramipril/.test(i.name) && i.lastMinute), pet: H.items.some(i => i.petId), bagOwner: H.bags[0].owner === H.people[0].id }; });
  ok('Packliste erzeugt (ohne Hausvorrat), Medikament „erst bei Abreise“, Tier berücksichtigt, eigene Tasche zugeordnet', s1.items > 40 && s1.home === 0 && s1.med && s1.pet && s1.bagOwner && s1.bags === 1, JSON.stringify(s1)); await shot('04-packliste'); await noMarkup('Packliste');
  { const t0 = await body(); ok('Packliste: „Das brauchst du“ mit Kategorien', /Das brauchst du/.test(t0) && /hake ab, was du schon hast/i.test(t0) && ['Allgemein', 'Medikamente', 'Kleidung', 'Werkzeug', 'Feuer', 'Wasser', 'Nahrung', 'Technik'].every(w => t0.includes(w))); }
  const cats = await p.locator('a.cat').evaluateAll(as => as.map(a => a.getAttribute('href')));
  const o0 = await p.evaluate(() => HH().items.filter(i => i.status === 'owned').length); let ticked = 0;
  for (const c of cats) { if (ticked >= 10) break; await p.goto('http://localhost:8123/' + c); await p.waitForSelector('.page-inner');
    while (ticked < 10 && await p.locator('[data-change=rv-tick]:not(:checked)').count()) { await p.locator('[data-change=rv-tick]:not(:checked)').first().click(); ticked++; await p.waitForTimeout(30); } }
  ok('In den Kategorien abhaken markiert als vorhanden', ticked === 10 && await p.evaluate(n => HH().items.filter(i => i.status === 'owned').length === n + 10, o0));
  await p.locator('[data-change=rv-tick]:checked').first().click(); await p.waitForTimeout(50);
  ok('Haken entfernen macht es wieder offen', await p.evaluate(n => HH().items.filter(i => i.status === 'owned').length === n + 9, o0));
  ok('Abgehakte Sachen: Foto-Knopf', (await p.locator('[data-act=pick-photo]').count()) > 0);
  await p.goto('http://localhost:8123/#/review/c/tools'); await p.waitForSelector('[data-act=pick-add]'); const k0 = await p.locator('[data-act=pick-add]').first().getAttribute('data-key');
  await click('[data-act=pick-add]'); await p.waitForTimeout(100);
  ok('Werkzeug antippen fügt es der Tasche hinzu (vorhanden, Fach zugeteilt)', await p.evaluate(k => { const i = HH().items.find(x => x.key === k && x.source === 'pick'); return !!i && i.status === 'owned' && !!i.bagId && !!i.compId; }, k0));
  await p.goto('http://localhost:8123/#/review/search'); await p.waitForSelector('#pickq'); await p.keyboard.type('Feuerstahl'); await p.waitForSelector('#pickres [data-act=pick-add]');
  await p.locator('#pickres [data-act=pick-add]').first().click(); await p.waitForTimeout(100);
  await p.fill('#pickq', 'Ersatzakku Kamera'); await p.waitForTimeout(50); await click('[data-act=pick-custom]'); await p.waitForTimeout(100); await shot('04a-suche');
  ok('Lupe: suchen und direkt hinzufügen, auch eigene Sachen', await p.evaluate(() => HH().items.some(i => i.key === 'ferro_rod' && i.status === 'owned') && HH().items.some(i => i.name === 'Ersatzakku Kamera' && i.status === 'owned' && i.bagId)));
  await p.goto('http://localhost:8123/#/review'); await p.waitForSelector('a.cat');
  await click('[data-act=ask-start]'); await p.waitForSelector('[data-act=ask-yes]');
  ok('Einzeln abfragen fragt „Hast du das?“', /Hast du das\?/.test(await body()));
  for (let i = 0; i < 3; i++) { await click('[data-act=ask-yes]'); await p.waitForTimeout(40); } await click('[data-act=ask-skip]'); await p.waitForTimeout(40);
  for (let i = 0; i < 2; i++) { await click('[data-act=ask-no]'); await p.waitForTimeout(40); }
  await shot('04b-abfragen');
  await p.goto('http://localhost:8123/#/review'); await p.waitForSelector('a.cat');
  ok('Vorhanden/Fehlt markiert, Einkaufsliste gefüllt', await p.evaluate(() => HH().shop.length === 2 && HH().items.filter(i => i.status === 'owned').length >= 12));
  // Start
  await p.goto('http://localhost:8123/#/home'); await p.waitForSelector('.tile'); await shot('05-start'); await noMarkup('Start');
  const t = await body(); ok('Start zeigt Tasche mit „X von Y gepackt“, Neue Tasche, Packliste, Notfallpass, Kontrolle', /von \d+ gepackt/.test(t) && /Neue Tasche anlegen/.test(t) && /Notfallplan/.test(t) && /Notfallpass/.test(t) && /Rucksackkontrolle|Kontrolle/.test(t));
  ok('Kein Bereitschafts-Score auf dem Start', !/%/.test(t));
  // Tasche
  const bid = await p.evaluate(() => HH().bags[0].id); await p.goto('http://localhost:8123/#/bags/' + bid); await p.waitForSelector('.bag2d'); await shot('06-tasche'); await noMarkup('Tasche');
  await p.locator('.bag2d g.c[aria-label="Admin-Fach oben"] rect').click(); await p.waitForTimeout(150); ok('2D-Fachansicht: Fach antippen wählt aus', !!(await p.evaluate(() => BAGUI.sel)));
  await click('[data-act=comp-add]'); await p.fill('.modal [name=name]', 'Dokumentenfach'); await p.locator('.modal button[type=submit]').click(); await p.waitForFunction(() => !document.querySelector('.modal'));
  const itemId = await p.evaluate(() => { BAGUI.sel = null; rerender(true); return HH().items.find(i => i.status === 'owned' && i.bagId).id; });
  await p.locator(`[data-act=bag-item-move][data-id="${itemId}"]`).click(); const cid = await p.evaluate(() => HH().bags[0].comps.find(c => c.name === 'Dokumentenfach').id); await p.selectOption('.modal [name=compId]', cid); await p.locator('.modal button[type=submit]').click(); await p.waitForFunction(() => !document.querySelector('.modal'));
  ok('Gegenstand einem eigenen Fach zugewiesen', await p.evaluate(([i, c]) => HH().items.find(x => x.id === i).compId === c, [itemId, cid]));
  await click('[data-act=bg-mode][data-v="3d"]'); await p.waitForSelector('#bagcv'); await p.waitForTimeout(300); ok('3D ist optional zuschaltbar', await p.evaluate(() => !!UI.bag3d && UI.bag3d.hits.length > 0)); await click('[data-act=bg-mode][data-v="2d"]');
  // Packanleitung
  await p.goto('http://localhost:8123/#/bags/' + bid + '/pack'); await p.waitForSelector('.stepcard'); await shot('07-packen'); await noMarkup('Packen');
  const order = await p.evaluate(id => { const H = HH(); const b = H.bags.find(x => x.id === id); return packSteps(H, b).steps.map(s => [s.comp ? s.comp.slot || 'innen' : '-', s.item.qty * s.item.weightG, s.reason]); }, bid);
  const rk = { bottom: 1, main: 2, innen: 3, lid: 5, top: 5, front: 6, front2: 6, sideL: 7, sideR: 7 }; ok('Packreihenfolge: unten → Hauptfach (schwer zuerst) → oben/außen', order.every((o, i) => i === 0 || (rk[order[i - 1][0]] || 9) <= (rk[o[0]] || 9)), order.map(o => o[0]).join('>'));
  const n0 = await p.evaluate(() => HH().items.filter(i => i.packed).length); await click('[data-act=pack-done]'); await p.waitForTimeout(100); await click('[data-act=pack-skip]'); await p.waitForTimeout(100); await click('[data-act=pack-done]');
  ok('„Eingepackt“ hakt ab, „Später“ überspringt', await p.evaluate(() => HH().items.filter(i => i.packed).length) === n0 + 2);
  for (let i = 0; i < 40 && await p.locator('[data-act=pack-done]').count(); i++) { await click('[data-act=pack-done]'); await p.waitForTimeout(30); }
  const fin = await body(); ok('Am Ende: „Fertig gepackt“, Liste „Erst bei Abreise“, Hinweis auf Fehlendes', /Fertig gepackt/.test(fin) && /Erst bei Abreise/.test(fin) && /Was fehlt\?/.test(fin)); await shot('08-fertig');
  await p.goto('http://localhost:8123/#/bags/' + bid + '/missing'); await p.waitForTimeout(200); await noMarkup('Was fehlt'); ok('„Was fehlt?“ listet offene Teile', (await p.locator('[data-act=rv-have]').count()) > 0); await shot('09-fehlt');
  // Druck (Browser: neues Fenster) – Inhalt pruefen
  const html = await p.evaluate(id => { let out = ''; const orig = window.open; window.open = () => ({ document: { write: h => { out = h; }, close() { } }, print() { } }); ACT['bag-print']({ id }); window.open = orig; return out; }, bid);
  ok('Packliste druckbar mit Fachbelegung', /Packliste/.test(html) && /Dokumentenfach/.test(html));
  // Notfallpass
  await p.goto('http://localhost:8123/#/pass'); await p.waitForSelector('.tile'); await noMarkup('Pass-Übersicht');
  const kid = await p.evaluate(() => HH().people[1].id); await p.goto('http://localhost:8123/#/pass/' + kid); await p.waitForSelector('#pf_birth');
  await p.fill('#pf_birth', '2022-03-04'); await p.locator('#pf_birth').dispatchEvent('change'); await p.waitForTimeout(150);
  await p.fill('#pf_role', 'Kind'); await p.locator('#pf_role').dispatchEvent('change'); await p.fill('#pf_conditions', 'Asthma'); await p.locator('#pf_conditions').dispatchEvent('change');
  await p.selectOption('#pf_organ', 'unbekannt');
  ok('Profil speichert automatisch (Geburtsdatum → Alter, Rolle, Krankheit)', await p.evaluate(id => { const x = HH().people.find(q => q.id === id); return x.birth === '2022-03-04' && x.age === ageFromBirth('2022-03-04') && x.role === 'Kind' && x.needs.conditions === 'Asthma' && x.organ.status === 'unbekannt'; }, kid));
  for (const [nm, rel, tel] of [['Anna', 'Mama', '0170 1111111'], ['Ben', 'Papa', '0170 2222222'], ['Oma Erna', 'Oma', '030 333333']]) { await click('[data-act=pc-add]'); if (await p.locator('[data-act=pc-new]').count()) await click('[data-act=pc-new]'); await p.waitForSelector('.modal [name=name]'); await p.fill('.modal [name=name]', nm); await p.fill('.modal [name=relation]', rel); await p.fill('.modal [name=phone]', tel); await p.locator('.modal button[type=submit]').click(); await p.waitForFunction(() => !document.querySelector('.modal')); }
  ok('Bis zu drei priorisierte Kontakte; danach kein weiterer wählbar', await p.evaluate(id => HH().people.find(q => q.id === id).passContacts.length === 3, kid) && (await p.locator('[data-act=pc-add]').count()) === 0);
  await p.locator('[data-act=pc-up][data-i="2"]').click(); ok('Reihenfolge änderbar', await p.evaluate(id => { const H = HH(); const x = H.people.find(q => q.id === id); return H.contacts.find(c => c.id === x.passContacts[1]).name === 'Oma Erna'; }, kid)); await shot('10-pass');
  // Freigabe: zunaechst alles privat
  await p.goto('http://localhost:8123/#/ice/' + kid); await p.waitForSelector('#qrtext'); let q = await p.locator('#qrtext').innerText();
  ok('Standard: Gesundheitsdaten privat – QR enthält nur Name und Kontakte', /Mia/.test(q) && /0170 1111111/.test(q) && !/Erdnüsse|Asthma|2022|Organspende/.test(q), q.replace(/\n/g, ' | '));
  await p.goto('http://localhost:8123/#/pass/' + kid); await p.waitForSelector('#pf_birth'); await p.locator('input[data-change=pass-share][data-k=allergies]').check(); await p.waitForTimeout(100);
  await p.goto('http://localhost:8123/#/ice/' + kid); await p.waitForSelector('#qrtext'); q = await p.locator('#qrtext').innerText();
  ok('Nach ausdrücklicher Freigabe erscheint nur das freigegebene Feld', /Erdnüsse/.test(q) && !/Asthma|Organspende/.test(q)); await shot('11-qr'); await noMarkup('Notfallpass');
  ok('Warnhinweis „jeder kann das lesen“ + Hinweis Android-Notfallinfos', /Jeder, der den Code scannt/.test(await body()) && /Android-Notfallinfos/.test(await body()));
  // QR wirklich dekodieren (jsQR)
  await p.evaluate(() => { const s = document.createElement('style'); s.id = 'tmpst'; s.textContent = '.actionbar,#toasts,.bottomnav,.topbar{display:none!important}'; document.head.appendChild(s); }); await p.locator('#qrbox').screenshot({ path: 'tests/out/qr.png' }); await p.evaluate(() => document.getElementById('tmpst').remove());
  const { PNG } = require('/tmp/claude-0/npm/node_modules/pngjs'); const jsQR = require('/tmp/claude-0/npm/node_modules/jsqr'); const png = PNG.sync.read(fs.readFileSync('tests/out/qr.png')); const dec = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  ok('QR-Code ist mit Standard-Decoder lesbar und enthält genau den Vorschautext (Umlaute korrekt)', !!dec && dec.data === q, dec ? dec.data.split('\n')[1] : 'nicht dekodiert');
  const card = await p.evaluate(async id => passCardHtml(HH(), HH().people.find(x => x.id === id)), kid);
  ok('Druckkarte: Name, 3 Kontakte, QR, freigegebene Angabe – keine privaten Daten', /Mia/.test(card) && /<svg/.test(card) && /Oma Erna/.test(card) && /Erdnüsse/.test(card) && !/Asthma/.test(card));
  // Notfallmodus
  await p.goto('http://localhost:8123/#/sos'); await p.waitForSelector('.callbtn'); const sos = await body(); await shot('12-notfall'); await noMarkup('Notfall');
  ok('Notfallmodus: 112, Pässe mit Kontakten, Lagerort der Tasche, keine privaten Daten', /112/.test(sos) && /Oma Erna/.test(sos) && /Flur/.test(sos) && /Erdnüsse/.test(sos) && !/Asthma|Ramipril/.test(sos), [/112/.test(sos), /Oma Erna/.test(sos), /Flur/.test(sos), /Erdnüsse/.test(sos), /Asthma/.test(sos), /Ramipril/.test(sos)].join());
  // weitere Seiten
  for (const r of ['bags', 'review', 'more', 'shop', 'remind', 'places', 'items', 'stock', 'recs', 'settings', 'sources', 'households']) { const before = errs.length; await p.goto('http://localhost:8123/#/' + r); await p.waitForTimeout(150); await noMarkup('#/' + r); if (errs.length !== before) ok('#/' + r + ' ohne Konsolenfehler', false, errs.slice(before).join(';')); }
  ok('Gestrichene Bereiche nicht mehr in der Navigation (Schutzräume, Benutzerverwaltung, Safe, Aufgaben)', !/Schutzr|Benutzer|Safe|Aufgaben|Empfehlungen/.test(await (async () => { await p.goto('http://localhost:8123/#/more'); await p.waitForTimeout(100); return body(); })()));
  // Kiste optional
  await p.goto('http://localhost:8123/#/stock'); await click('[data-act=box-on]'); await p.locator('.modal button[type=submit]').click(); await p.waitForTimeout(300);
  ok('Notfallkiste ist optional und erzeugt erst nach Anlegen Vorratsvorschläge', await p.evaluate(() => HH().box.enabled && HH().items.some(i => i.key === 'water_stock'))); await shot('13-kiste');
  // Persistenz
  await p.evaluate(() => flushDB()); await p.reload(); await p.waitForSelector('.topbar');
  ok('Nach Neustart alles da (Tasche, Pass, Kontakte)', await p.evaluate(id => HH().bags.length === 1 && HH().people.find(x => x.id === id).passContacts.length === 3 && HH().people.find(x => x.id === id).share.allergies === true, kid));
  console.log(results.map(r => r.join(' ')).join('\n')); console.log('Konsolenfehler:', errs.length ? errs : 'keine'); if (errs.length) process.exitCode = 1;
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 6).join('\n')); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
