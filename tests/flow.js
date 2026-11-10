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
  ok('Erster Start: „Haushalt anlegen“ mit Willkommen', (await hash()) === '#/setup' && /willkommen/i.test(await p.locator('.q').innerText())); await shot('01-frage'); await click('[data-act=wz-next]');
  // 1) Haushalt
  ok('Zuerst: Haushalt mit Adresse, Standort und Wohnsituation', /Haushalt/.test(await p.locator('.q').innerText()) && (await p.locator('[data-act=wz-gps]').count()) === 1);
  await p.fill('[data-path=name]', 'Familie Test'); await p.fill('[data-path=place]', 'Köln'); await click('[data-act=wz-set][data-v=flat]'); await click('[data-act=wz-next]');
  // 2) Personen, danach jede Person einzeln
  ok('Personen: Schieberegler für die Anzahl', (await p.locator('input[type=range]#wzcount').count()) === 1);
  await p.locator('#wzcount').fill('2'); await p.waitForFunction(() => document.querySelectorAll('[data-act=wz-group][data-i="1"]').length === 5); await click('[data-act=wz-group][data-i="1"][data-v=child]'); await shot('02-personen'); await click('[data-act=wz-next]');
  ok('Danach jede Person einzeln mit Foto, Blutgruppe, Gewicht, Fitness', (await p.locator('[data-act=wz-photo]').count()) === 1 && (await p.locator('#wf-blood').count()) === 1 && (await p.locator('[data-path="people.0.weightKg"]').count()) === 1 && (await p.locator('[data-act=wz-pset][data-f=fitness]').count()) === 3);
  await p.fill('[data-path="people.0.name"]', 'Anna'); await p.fill('[data-path="people.0.age"]', '38'); ok('Personenstand für Erwachsene', (await p.locator('#wf-mar').count()) === 1); await p.selectOption('#wf-mar', 'married'); await click('[data-act=wz-pset][data-f=sex][data-v=f]');
  await p.fill('[data-path="people.0.weightKg"]', '65'); await p.fill('[data-path="people.0.heightCm"]', '170'); await click('[data-act=wz-pset][data-f=fitness][data-v=mid]');
  await p.selectOption('#wf-blood', 'A+'); await p.fill('[data-path="people.0._meds"]', 'Ramipril');
  ok('Kalorienbedarf aus Gewicht, Größe, Fitness berechnet', /2\.200 kcal/.test(await p.locator('#wzcalc').innerText()), await p.locator('#wzcalc').innerText()); await shot('02b-person');
  await click('[data-act=wz-next]');
  await p.fill('[data-path="people.1.name"]', 'Mia'); await p.fill('[data-path="people.1.birth"]', `${new Date().getFullYear() - 5}-01-01`); await p.waitForSelector('#wzage');
  ok('Geburtsdatum ergibt das Alter, Feld „Alter“ verschwindet', /\b(4|5) Jahre/.test(await p.locator('#wzage').innerText()) && (await p.locator('[data-path="people.1.age"]').count()) === 0);
  await p.fill('[data-path="people.1.needs.allergies"]', 'Erdnüsse'); await click('[data-act=wz-next]');
  ok('Nach den Personen: Übersicht zum Bearbeiten', /Alle Personen/.test(await p.locator('.q').innerText()) && (await p.locator('[data-act=wz-goto][data-ret=pover]').count()) === 2);
  await click('[data-act=wz-goto][data-key=p0]'); ok('Bearbeiten öffnet die Person oben', /Anna/.test(await p.locator('.q').innerText()) && await p.evaluate(() => scrollY) === 0);
  await click('[data-act=wz-next]'); ok('Weiter führt zurück zur Übersicht', /Alle Personen/.test(await p.locator('.q').innerText()));
  await click('[data-act=wz-next]');
  // 3) Tiere
  ok('Dann Tiere', /Tiere/.test(await p.locator('.q').innerText())); await click('[data-act=wz-add-pet][data-v=Hund]'); await p.fill('[data-path="petList.0.name"]', 'Bello'); await click('[data-act=wz-next]');
  ok('Dann Notfallkontakte', /anrufen/.test(await p.locator('.q').innerText()));
  await p.fill('[data-path="contacts.0.name"]', 'Tante Ute'); await click('[data-act=wz-next]'); await p.waitForTimeout(100);
  ok('Kontakt ohne Telefonnummer: Hinweis statt Weiter', /Telefonnummer fehlt/.test(await p.locator('#toasts').innerText()) && /anrufen/.test(await p.locator('.q').innerText()));
  await p.fill('[data-path="contacts.0.name"]', ''); await click('[data-act=wz-next]');
  ok('Dann Treffpunkte (nah und außerhalb)', /Wo trefft ihr euch/.test(await p.locator('.q').innerText()) && (await p.locator('[data-path^="meet."]').count()) === 2);
  await p.fill('[data-path="meet.0.name"]', 'Spielplatz Lindenstraße'); await click('[data-act=wz-next]');
  ok('Dann Notfallpass: nur eingetragene Angaben zum Anhaken, nichts vorausgewählt', /Notfallpass/.test(await p.locator('.q').innerText()) && (await p.locator('[data-path="people.1.share.allergies"]').count()) === 1 && (await p.locator('[data-path="people.0.share.allergies"]').count()) === 0 && (await p.locator('[data-change=wz-check]:checked').count()) === 0);
  await click('[data-act=wz-next]');
  ok('Anlegen abgeschlossen: Übersicht mit Personen und Tier', /Haushalt angelegt/.test(await p.locator('.q').innerText()) && /Anna/.test(await body()) && /Bello/.test(await body()));
  await click('[data-act=setup-done][data-then=bags]'); await p.waitForFunction(() => /Wofür/.test(document.querySelector('.q').textContent));
  ok('Danach direkt: Rucksäcke & Taschen', await hash() === '#/wizard' && await p.evaluate(() => HH().profileDone && HH().people.length === 2 && HH().pets[0].name === 'Bello'));
  await click('[data-act=wz-pick][data-v=evac]'); ok('Antwortkarte springt direkt zur nächsten Frage', /wie lange/i.test(await p.locator('.q').innerText()));
  await click('[data-act=wz-pick][data-v="72"]'); await click('[data-act=wz-pick][data-v=shelter]');
  // 4) Rucksäcke je Person
  const annaId = await p.evaluate(() => HH().setup.draft.people[0].id), miaId = await p.evaluate(() => HH().setup.draft.people[1].id);
  ok('Zum Schluss: Rucksack je Person – Anna vorausgewählt, Mia (4) keinen', /Wer trägt/.test(await p.locator('.q').innerText()) && await p.locator(`[data-act=wz-carry][data-id="${annaId}"][data-v="type:trekking"][aria-pressed=true]`).count() === 1 && await p.locator(`[data-act=wz-carry][data-id="${miaId}"][data-v=none][aria-pressed=true]`).count() === 1);
  await click(`[data-act=wz-carry][data-id="${annaId}"][data-v="type:tactical"]`); await shot('03-taschen');
  await click('[data-act=wz-finish]'); await p.waitForFunction(() => location.hash.startsWith('#/review'));
  ok('Haushalt, Person und Tier gespeichert', await p.evaluate(() => { const H = HH(); const a = H.people[0]; return H.name === 'Familie Test' && H.cfg.housing.place === 'Köln' && H.cfg.housing.type === 'flat' && a.needs.blood === 'A+' && a.weightKg === 65 && a.fitness === 'mid' && H.pets[0].name === 'Bello' && H.bags.length === 1 && H.bags[0].type === 'tactical' && H.bags[0].owner === a.id; }));
  await p.evaluate(() => { const b = HH().bags[0]; b.name = 'Mein Tactical'; b.location = 'Flur'; persist(); });
  const s1 = await p.evaluate(() => { const H = HH(); return { items: H.items.length, bags: H.bags.length, home: H.items.filter(i => i.container === 'home' && i.source === 'plan').length, med: H.items.some(i => /Ramipril/.test(i.name) && i.lastMinute), pet: H.items.some(i => i.petId), bagOwner: H.bags[0].owner === H.people[0].id }; });
  ok('Packliste erzeugt (ohne Hausvorrat), Medikament „erst bei Abreise“, Tier berücksichtigt, eigene Tasche zugeordnet', s1.items > 40 && s1.home === 0 && s1.med && s1.pet && s1.bagOwner && s1.bags === 1, JSON.stringify(s1)); await shot('04-packliste'); await noMarkup('Packliste');
  { const t0 = await body(); ok('Packliste: ein Rucksack → direkt „Das brauchst du“ mit Kategorien', /Das brauchst du/.test(t0) && /^#\/review\/b\//.test(await hash()) && ['Allgemein', 'Medikamente', 'Kleidung', 'Werkzeug', 'Feuer', 'Wasser', 'Nahrung', 'Technik'].every(w => t0.includes(w))); }
  const cats = await p.locator('a.cat').evaluateAll(as => as.map(a => a.getAttribute('href')));
  const o0 = await p.evaluate(() => HH().items.filter(i => i.status === 'owned').length); let ticked = 0;
  for (const c of cats) { if (ticked >= 10) break; await p.goto('http://localhost:8123/' + c); await p.waitForSelector('.page-inner');
    while (ticked < 10 && await p.locator('[data-change=rv-tick]:not(:checked)').count()) { await p.locator('[data-change=rv-tick]:not(:checked)').first().click(); ticked++; await p.waitForTimeout(30); } }
  ok('In den Kategorien abhaken markiert als vorhanden', ticked === 10 && await p.evaluate(n => HH().items.filter(i => i.status === 'owned').length === n + 10, o0));
  await p.locator('[data-change=rv-tick]:checked').first().click(); await p.waitForTimeout(50);
  ok('Haken entfernen macht es wieder offen', await p.evaluate(n => HH().items.filter(i => i.status === 'owned').length === n + 9, o0));
  ok('Abgehakte Sachen: Foto-Knopf', (await p.locator('[data-act=pick-photo]').count()) > 0);
  await p.goto('http://localhost:8123/#/review/c/tools'); await p.waitForSelector('[data-act=pick-add]'); ok('Kategorie zeigt den Rucksack, in den es kommt', /Mein Tactical/.test(await body())); const k0 = await p.locator('[data-act=pick-add]').first().getAttribute('data-key');
  await click('[data-act=pick-add]'); await p.waitForTimeout(100);
  ok('Werkzeug antippen fügt es der Tasche hinzu (vorhanden, Fach zugeteilt)', await p.evaluate(k => { const i = HH().items.find(x => x.key === k && x.source === 'pick'); return !!i && i.status === 'owned' && !!i.bagId && !!i.compId; }, k0));
  await click('.topbar [data-act=pick-search]'); await p.waitForSelector('#pickq'); await p.keyboard.type('Feuerstahl'); await p.waitForSelector('#pickres [data-act=pick-add]');
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
  await p.goto('http://localhost:8123/#/home'); await p.waitForSelector('.stats'); await shot('05-start'); await noMarkup('Start');
  const t = await body(); ok('Start ist Übersicht: vorhanden/gepackt/fehlt, Termine, Haushalt mit Tagesbedarf, Notrufnummern – keine Taschen-Kacheln', /vorhanden/.test(t) && /gepackt/.test(t) && /Termine/.test(t) && /Rucksackkontrolle|Kontrolle/.test(t) && /Bedarf pro Tag/.test(t) && /Notrufnummern/.test(t) && !/Neue Tasche anlegen/.test(t) && (await p.locator('.page a.tile[href^="#/bags/"]').count()) === 0, JSON.stringify({ v: /vorhanden/.test(t), g: /gepackt/.test(t), te: /Termine/.test(t), k: /Rucksackkontrolle|Kontrolle/.test(t), b: /Bedarf pro Tag/.test(t), n: /Notrufnummern/.test(t), nt: !/Neue Tasche anlegen/.test(t) }));
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
  ok('Notfallmodus aufgeräumt: jeder Kontakt nur einmal, Lagen als Raster, 112 groß', (sos.match(/Oma Erna/g) || []).length === 1 && (await p.locator('.scengrid .scen').count()) >= 8 && (await p.locator('.callbtn.big').count()) === 1, (sos.match(/Oma Erna/g) || []).length);
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
