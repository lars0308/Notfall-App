// Sperre, Benutzerrechte und eingeschraenkter Notfallmodus
const { chromium } = require('playwright');
const { start } = require('./serve');

const results = [];
const ok = (n, c, x) => { results.push([c ? 'OK  ' : 'FAIL', n, x === undefined ? '' : String(x)]); if (!c) process.exitCode = 1; };

(async () => {
  const srv = await start(8123);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 420, height: 860 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(e.message));
  const click = s => p.locator(s).first().click();
  const pin = async digits => { for (const k of digits) await p.locator('[data-act=pin-key][data-k="' + k + '"]').click(); await click('[data-act=pin-ok]'); };

  await p.goto('http://localhost:8123/');
  await p.waitForSelector('[data-act=load-sample]');
  await click('[data-act=load-sample]');
  await click('[data-act=dlg-yes]');
  await p.waitForTimeout(400);
  // Medikament eintragen, damit es Gesundheitsdaten gibt
  await p.evaluate(() => { HH().people[0].needs.meds.push({ id: 'm1', name: 'Ramipril', dose: '5 mg', expiry: '' }); HH().people[0].needs.allergies = 'Pollen'; persist(); });
  // Zwei Benutzer: Administrator + eingeschraenktes Mitglied
  await p.evaluate(async () => {
    DB.users.push({ id: 'ua', name: 'Anna', role: 'admin', pin: await makePin('2468'), perms: {}, bio: false, fails: 0, lockUntil: 0 });
    DB.users.push({ id: 'um', name: 'Max', role: 'member', pin: await makePin('1357'), perms: { edit: true, health: false, vault: false, sos: false, settings: false }, bio: false, fails: 0, lockUntil: 0 });
    persist(); await flushDB();
  });
  await p.reload();
  await p.waitForSelector('.lock');
  ok('Mit zwei Benutzern erscheint die Benutzerauswahl', /Wer bist du/.test(await p.locator('.lock').innerText()));
  await click('[data-act=pin-user][data-id="um"]');
  await pin('2468');
  await p.waitForTimeout(400);
  ok('PIN eines anderen Benutzers wird abgewiesen', await p.locator('.lock').isVisible());
  await pin('1357');
  await p.waitForSelector('.topbar', { timeout: 5000 });
  ok('Mitglied meldet sich mit eigener PIN an', await p.evaluate(() => UI.userId === 'um'));

  const pid = await p.evaluate(() => HH().people[0].id);
  await p.goto('http://localhost:8123/#/people/' + pid);
  await p.waitForTimeout(300);
  let txt = await p.locator('body').innerText();
  ok('Mitglied ohne Berechtigung sieht keine Gesundheitsdaten', /Gesundheitsdaten geschützt/.test(txt) && !/Ramipril|Pollen/.test(txt));
  await p.goto('http://localhost:8123/#/safe');
  await p.waitForTimeout(300);
  ok('Mitglied ohne Berechtigung hat keinen Safe-Zugriff', /Kein Zugriff/.test(await p.locator('body').innerText()));
  await p.goto('http://localhost:8123/#/sos');
  await p.waitForTimeout(300);
  txt = await p.locator('body').innerText();
  ok('Notfallmodus zeigt Mitglied ohne Freigabe keine medizinischen Hinweise', !/Ramipril|Pollen/.test(txt) && /112/.test(txt));

  // Sperren, dann eingeschraenkten Notfallmodus vom Sperrbildschirm aus nutzen
  await p.evaluate(() => lockNow());
  await p.waitForSelector('.lock');
  await click('[data-act=pin-user][data-id="ua"]');
  await click('[data-act=lock-sos]');
  await p.waitForTimeout(400);
  txt = await p.locator('body').innerText();
  ok('Eingeschränkter Notfallmodus ohne Entsperren: Notruf sichtbar, keine Gesundheitsdaten', /112/.test(txt) && !/Ramipril|Pollen/.test(txt));
  ok('Eingeschränkter Notfallmodus zeigt keine Navigation zu anderen Bereichen', (await p.locator('.bottomnav:visible').count()) === 0 && (await p.locator('.rail:visible').count()) === 0);
  await p.goto('http://localhost:8123/#/settings');
  await p.waitForTimeout(400);
  ok('Direktaufruf anderer Seiten führt zurück zur Sperre', await p.locator('.lock').isVisible());

  // Administrator sieht alles
  if (await p.locator('[data-act=pin-user][data-id="ua"]').count()) await click('[data-act=pin-user][data-id="ua"]');
  await pin('2468');
  await p.waitForSelector('.topbar');
  await p.goto('http://localhost:8123/#/people/' + pid);
  await p.waitForTimeout(300);
  ok('Administrator sieht Gesundheitsdaten', /Ramipril/.test(await p.locator('body').innerText()));

  // Brute-Force-Schutz
  await p.evaluate(() => lockNow());
  await p.waitForSelector('.lock');
  if (await p.locator('[data-act=pin-user][data-id="ua"]').count()) await click('[data-act=pin-user][data-id="ua"]');
  for (let i = 0; i < 5; i++) { await pin('0000'); await p.waitForTimeout(150); }
  await pin('2468');
  await p.waitForTimeout(500);
  ok('Nach 5 Fehlversuchen wird kurz gesperrt (auch die richtige PIN wird dann abgewiesen)', await p.locator('.lock').isVisible() && /Gesperrt|Zu viele|Falsche/.test(await p.locator('#lockmsg').innerText()));

  console.log(results.map(r => r.join(' ')).join('\n'));
  console.log('Konsolenfehler:', errs.length ? errs : 'keine');
  if (errs.length) process.exitCode = 1;
  await b.close();
  srv.close();
})().catch(e => { console.error('FAIL', e); console.log(results.map(r => r.join(' ')).join('\n')); process.exit(1); });
