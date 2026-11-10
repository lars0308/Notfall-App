'use strict';
/* ===== Notfall! – Empfehlungen / Fehlteilanalyse (regelbasiert, nachvollziehbar) ===== */

const ALTS = {
  stove: ['Esbit-Kocher mit Tabletten', 'Gaskocher mit Schraubkartusche', 'Spirituskocher', 'Hobo-/Holzkocher'],
  stove_home: ['Campingkocher mit Gaskartusche', 'Spirituskocher', 'Gasgrill (nur im Freien)'],
  water_filter: ['Hohlfaser-Flaschenfilter', 'Pumpfilter', 'Schwerkraftfilter', 'Keramikfilter'],
  water_bottle: ['Edelstahlflasche 1 L', 'Kunststoffflasche 1 L (BPA-frei)', 'Trinkblase 2 L'],
  headlamp: ['Stirnlampe mit AAA-Batterien', 'Stirnlampe mit Akku (USB)'],
  radio: ['Kurbelradio mit Solar', 'Batterieradio (UKW/DAB+)'],
  powerbank: ['Powerbank 10.000 mAh', 'Powerbank 20.000 mAh', 'Solar-Powerbank'],
  sleeping_bag: ['Kunstfaser-Schlafsack', 'Daunenschlafsack', 'Deckenschlafsack'],
  firstaid: ['Reise-Erste-Hilfe-Set', 'DIN-13157-Verbandkasten', 'Outdoor-Set'],
  tent: ['2-Personen-Zelt', '3-Personen-Zelt', 'Biwaksack'],
  pet_transport: ['Faltbare Transportbox', 'Harte Transportbox', 'Tragetasche'],
  batteries: ['AA-Alkaline 8er-Pack', 'AAA-Alkaline 8er-Pack', 'Lithium-Batterien (kältefest)'],
};

function computeRecs(H, S) {
  const recs = [];
  const R = (id, level, cat, title, why, o) => recs.push(Object.assign({ id, level, cat, title, why, source: 'Regel der App', action: { type: 'none' } }, o || {}));
  const ctx = planContext(H, S), calc = householdCalc(H, S), sup = calcSupplies(H, S);
  const live = H.items.filter(i => !i.archived);
  const owned = live.filter(i => i.status === 'owned');
  const sumTag = (tag, list) => (list || owned).filter(i => i.tags && i.tags.includes(tag)).reduce((a, i) => a + (+i.qty || 0), 0);
  const names = (tag, n = 2) => owned.filter(i => i.tags.includes(tag)).slice(0, n).map(i => i.name).join(', ');
  const listed = tag => live.find(i => (i.status === 'planned' || i.status === 'missing') && i.tags.includes(tag));
  const tmpl = (key, extra) => Object.assign({ type: 'template', key }, extra || {});
  const persons = calc.n;
  const nonBaby = calc.people.filter(x => x.c.group !== 'baby').length;
  const country = (H.cfg && H.cfg.country) || 'DE';

  /* ---- Technik / Licht ---- */
  if (sumTag('needs_battery') > 0 && sumTag('battery') === 0) {
    const l = listed('battery');
    R('r:lamp_batt', 'must', 'Licht & Strom', 'Batterien für Lampen und Radio fehlen', `Du hast ${names('needs_battery') || 'Geräte mit Batteriebetrieb'} eingetragen, aber keine Ersatzbatterien. Ohne Batterien fällt die Lichtquelle genau dann aus, wenn du sie brauchst.`, { action: tmpl('batteries', { qty: 2, itemId: l && l.id }), source: 'BBK-Checkliste (Notfallgepäck)' });
  }
  if (calc.n > 0 && sumTag('powerbank') === 0 && (ctx.bagHours > 0 || ctx.homeDays > 0)) {
    const l = listed('powerbank');
    R('r:powerbank', 'must', 'Licht & Strom', 'Keine Powerbank eingetragen', 'Das Handy ist bei Stromausfall Kommunikationsmittel, Lichtquelle und Zugang zu Warn-Apps. Eine Powerbank hält es länger am Laufen.', { action: tmpl('powerbank', { itemId: l && l.id }), source: 'BBK-Ratgeber' });
  } else if (sumTag('powerbank') > 0 && sumTag('cable') === 0) {
    R('r:cable', 'rec', 'Licht & Strom', 'Passendes Ladekabel zur Powerbank fehlt', 'Die Powerbank ist nur nützlich, wenn Kabel/Adapter für dein Handy dabei sind.', { action: tmpl('cable_set') });
  }
  if ((ctx.bagHours > 0 || ctx.goals.has('blackout') || ctx.goals.has('storm')) && sumTag('radio') === 0) {
    const l = listed('radio');
    R('r:radio', 'must', 'Kommunikation', 'Batterie- oder Kurbelradio fehlt', 'Bei Ausfall von Strom, Mobilfunk und Internet laufen amtliche Durchsagen über das Radio. Batterien bereithalten.', { action: tmpl('radio', { itemId: l && l.id }), source: 'BBK-Ratgeber' });
  }
  if (sumTag('light') === 0 && ctx.bagHours + ctx.homeDays > 0) {
    R('r:light', 'must', 'Licht & Strom', 'Keine Taschen- oder Stirnlampe eingetragen', 'Ohne Licht sind Orientierung und Erste Hilfe im Dunkeln kaum möglich.', { action: tmpl('headlamp') });
  }

  /* ---- Wasser ---- */
  if (sumTag('water_filter') > 0 && sumTag('water_transport') === 0) {
    R('r:filter_transport', 'must', 'Wasser', 'Wasserfilter ohne sichere Transportmöglichkeit', `Du besitzt einen Wasserfilter (${names('water_filter', 1)}), aber keine Flasche oder keinen Behälter, um gefiltertes Wasser sicher zu tragen.`, { action: tmpl('water_bottle'), source: 'Regel der App' });
  }
  if (sumTag('water_filter') > 0 && sumTag('water_treat') === 0 && sumTag('stove') === 0) {
    R('r:filter_viruses', 'rec', 'Wasser', 'Zusätzliche Aufbereitung zum Wasserfilter', 'Viele Filter entfernen Bakterien und Parasiten, aber nicht zuverlässig Viren. Tabletten oder Abkochen ergänzen den Schutz. Herstellerangaben prüfen.', { action: tmpl('water_treat'), source: 'Herstellerangaben beachten' });
  }
  if (ctx.homeDays > 0) {
    if (sup.waterDays + 1e-6 < ctx.homeDays) {
      const missL = Math.max(1, Math.ceil(sup.waterTargetL - sup.waterL));
      R('r:water_days', 'must', 'Wasser', `Trinkwasser reicht rechnerisch ${fmt(sup.waterDays)} von ${ctx.homeDays} Tagen`, `Bedarf: ${fmt(sup.perDayWater)} l pro Tag für den Haushalt (Schätzwert). Vorhanden: ${fmt(sup.waterL)} l. Es fehlen etwa ${fmt0(missL)} l. Richtwert BBK: ca. 2 l pro Person und Tag.`, { action: tmpl('water_stock', { qty: missL, container: 'home' }), source: 'BBK-Vorratsempfehlung' });
    }
    if (sup.foodDays + 1e-6 < ctx.homeDays) {
      R('r:food_days', 'must', 'Lebensmittel', `Lebensmittel reichen rechnerisch ${fmt(sup.foodDays)} von ${ctx.homeDays} Tagen`, `Energiebedarf des Haushalts ca. ${fmt0(sup.calc.kcalDay)} kcal pro Tag (Schätzwert). Vorhanden: ca. ${fmt0(sup.kcal)} kcal${sup.noKcal ? '; bei ' + sup.noKcal + ' Position(en) fehlt die kcal-Angabe und sie zählen nicht mit' : ''}. Wähle haltbare Lebensmittel, die ihr auch ohne Kochen essen könnt.`, { action: { type: 'goto', route: '#/stock' }, source: 'BBK-Vorratsempfehlung' });
    }
  }

  /* ---- Kochen ---- */
  const stoves = sumTag('stove');
  if (stoves > 0 && sumTag('cookware') === 0) R('r:stove_pot', 'must', 'Kochen & Brennstoff', 'Kocher ohne passendes Kochgeschirr', `Du hast einen Kocher eingetragen (${names('stove', 1)}), aber kein Kochgeschirr.`, { action: tmpl('cookware', { itemId: (listed('cookware') || {}).id }) });
  if (stoves > 0 && sumTag('fuel') === 0) R('r:stove_fuel', 'must', 'Kochen & Brennstoff', 'Kocher ohne Brennstoff', 'Ohne Gaskartusche, Esbit oder Spiritus bleibt der Kocher kalt. Brennstoffe sicher und nach Vorschrift lagern.', { action: tmpl('fuel', { itemId: (listed('fuel') || {}).id }) });
  if (stoves === 0 && sumTag('fuel') > 0) R('r:fuel_stove', 'rec', 'Kochen & Brennstoff', 'Brennstoff ohne Kocher', 'Du hast Brennstoff eingetragen, aber keinen passenden Kocher.', { action: tmpl('stove') });
  if (stoves > 0 && sumTag('fire_starter') === 0) R('r:stove_fire', 'rec', 'Kochen & Brennstoff', 'Feuerzeug oder Streichhölzer fehlen', 'Zum Zünden des Kochers brauchst du ein zuverlässiges Zündmittel.', { action: tmpl('lighter') });

  /* ---- Schlafen / Unterkunft ---- */
  if (nonBaby > 0) {
    const sb = sumTag('sleeping');
    if (sb > 0 && sb < nonBaby) R('r:sleep_count', ctx.shelterStrategy || ctx.mobile ? 'must' : 'rec', 'Schlafen', `${sb} Schlafsack/-säcke für ${nonBaby} Personen`, `Du hast ${sb} Schlafmöglichkeit(en) hinterlegt, aber ${nonBaby} Personen im Haushalt. Es fehlen ${nonBaby - sb}.`, { action: tmpl('sleeping_bag', { qty: nonBaby - sb }) });
    const mats = sumTag('mat');
    if (mats > 0 && mats < nonBaby && ctx.mobile) R('r:mat_count', 'rec', 'Schlafen', `${mats} Isomatte(n) für ${nonBaby} Personen`, 'Bodenkälte ist ein unterschätztes Risiko beim Übernachten im Freien.', { action: tmpl('sleeping_mat', { qty: nonBaby - mats }) });
  }
  if (ctx.mobile) {
    const cap = owned.filter(i => i.tags.includes('tent')).reduce((a, i) => { const m = /(\d)\s*-?\s*pers/i.exec(i.name); return a + i.qty * (m ? +m[1] : 2); }, 0);
    if (cap > 0 && cap < persons) R('r:tent_cap', 'rec', 'Outdoor', `Zeltplätze (${cap}) reichen nicht für ${persons} Personen`, 'Bei Selbstversorgung unterwegs sollte ein Schlafplatz für alle eingeplant sein.', { action: tmpl('tent') });
    if (sumTag('shelter_gear') === 0) R('r:shelter_gear', 'must', 'Outdoor', 'Strategie „Selbstversorgung unterwegs“ ohne Wetterschutz', 'Du planst, unterwegs zu bleiben, hast aber weder Zelt noch Tarp eingetragen.', { action: tmpl('tarp') });
  }

  /* ---- Medizin / Gesundheit ---- */
  if (sumTag('firstaid') === 0 && persons > 0) R('r:firstaid', 'must', 'Medizin', 'Kein Erste-Hilfe-Set eingetragen', 'Grundversorgung von Verletzungen gehört in jeden Rucksack und in jeden Haushalt.', { action: tmpl('firstaid', { itemId: (listed('firstaid') || {}).id }), source: 'BBK-Checkliste' });
  for (const p of H.people) {
    for (const m of ((p.needs && p.needs.meds) || [])) {
      if (!m.name) continue;
      const has = owned.some(i => i.tags.includes('meds') && norm(i.name).includes(norm(m.name).slice(0, 6)) && i.personId === p.id);
      if (!has) R('r:med:' + p.id + ':' + norm(m.name), 'must', 'Medizin', `Medikament „${m.name}“ für ${p.name || 'Person'} nicht bestätigt`, 'Regelmäßig benötigte Medikamente sollten in Rucksack und Vorrat für den Zeitraum plus Reserve vorhanden sein. Menge mit Arzt/Apotheke abstimmen.', { action: { type: 'confirmMed', personId: p.id, med: m.name } });
      const dl = daysUntil(m.expiry);
      if (dl !== null && dl <= 30) R('r:medexp:' + p.id + ':' + norm(m.name), 'must', 'Medizin', `Medikament „${m.name}“ ${dl < 0 ? 'ist abgelaufen' : 'läuft bald ab'}`, `Ablaufdatum ${fmtDate(m.expiry)} (${relDays(m.expiry)}). Rezept/Austausch rechtzeitig klären.`, { action: { type: 'goto', route: '#/pass/' + p.id } });
    }
  }

  /* ---- Kinder / Babys ---- */
  for (const x of calc.people) {
    const p = x.p;
    if (['child', 'toddler'].includes(x.c.group) && ctx.bagHours > 0 && !owned.some(i => i.personId === p.id && i.tags.includes('child_clothes')))
      R('r:kidclothes:' + p.id, 'must', 'Kind & Baby', `Wechselkleidung für ${p.name || 'das Kind'} fehlt`, 'Kinder werden schneller nass, schmutzig und kalt. Passende Größe und Jahreszeit beachten.', { action: tmpl('child_clothes', { personId: p.id, itemId: (live.find(i => i.personId === p.id && i.tags.includes('child_clothes') && i.status !== 'owned') || {}).id }) });
    if ((x.c.group === 'baby' || (x.c.group === 'toddler' && x.c.age < 3)) && !owned.some(i => i.tags.includes('diapers') && (i.personId === p.id || !i.personId)))
      R('r:diapers:' + p.id, 'must', 'Kind & Baby', `Windeln für ${p.name || 'das Kind'} fehlen`, 'Etwa 6–8 Windeln pro Tag einplanen.', { action: tmpl('diapers', { qty: 6 * ctx.bagDays, personId: p.id }) });
    if (x.c.group === 'baby' && !owned.some(i => i.tags.includes('baby_food')))
      R('r:babyfood:' + p.id, 'must', 'Kind & Baby', `Säuglingsnahrung für ${p.name || 'das Baby'} nicht bestätigt`, 'Nahrung und Möglichkeit zur sicheren Zubereitung (Wasser, Kocher, Fläschchen) einplanen.', { action: tmpl('food_baby', { qty: ctx.bagDays, personId: p.id }) });
  }

  /* ---- Rucksaecke: Gewicht, Volumen ---- */
  const moves = suggestBalance(H, S);
  for (const b of H.bags) {
    const st = bagStats(H, S, b);
    const owner = byId(H.people, b.owner);
    if (st.overweight) {
      const sev = st.overFactor > 1.25 ? 'must' : 'rec';
      R('r:weight:' + b.id, sev, 'Rucksack', `${b.name} wiegt ${fmt(st.totalG / 1000)} kg`, `Das liegt über der angesetzten Tragfähigkeit von ${fmt(st.capKg)} kg${owner ? ' für ' + owner.name : ''}. Prüfe, ob du die Ausrüstung anders verteilen oder Gewicht sparen kannst. Wichtige Gegenstände sollten nicht einfach gestrichen werden.`, { action: moves.some(m => m.from === b.id) ? { type: 'balance' } : { type: 'goto', route: '#/bags/' + b.id }, bagId: b.id, source: 'Orientierung: Tragfähigkeit ca. 10–20 % des Körpergewichts' });
    }
    if (st.overfull) R('r:full:' + b.id, 'must', 'Rucksack', `${b.name} ist rechnerisch überfüllt`, `Belegt ca. ${fmt(st.volL)} l bei nutzbaren ${fmt(st.usableL)} l (85 % von ${fmt0(b.liters)} l). Alle Gegenstände bleiben auf der Liste. Lösung: größerer Rucksack, Verteilen auf andere Rucksäcke oder leichter/kleiner packen.`, { action: { type: 'goto', route: '#/bags/' + b.id }, bagId: b.id });
    if (st.noWeight > 0) R('r:noweight:' + b.id, 'opt', 'Rucksack', `${st.noWeight} Gegenstände in „${b.name}“ ohne Gewichtsangabe`, 'Die Gewichtsberechnung ist dadurch ungenau. Wiege die Gegenstände einmal und trage das Gewicht ein.', { action: { type: 'goto', route: '#/bags/' + b.id } });
  }

  /* ---- Sicherheit zu Hause ---- */
  if (ctx.homeDays > 0) {
    if (sumTag('smoke_detector') === 0) R('r:smoke', 'must', 'Schutz & Sicherheit', 'Rauchmelder fehlt', 'Rauchmelder warnen im Schlaf vor Brand. In Deutschland sind sie in Wohnungen gesetzlich vorgeschrieben.', { action: tmpl('smoke_detector', { qty: 2, container: 'home' }), source: 'Bauordnungen der Länder (DE)' });
    const burns = ctx.hs.fireplace || stoves > 0 || ctx.goals.has('blackout');
    if (sumTag('co_detector') === 0 && burns) R('r:co', ctx.hs.fireplace ? 'must' : 'rec', 'Schutz & Sicherheit', 'CO-Melder fehlt', 'Beim Heizen oder Kochen mit Gas, Holz, Holzkohle oder Aggregaten kann Kohlenmonoxid entstehen. Das Gas ist geruchlos. Nie Grill/Aggregat in geschlossenen Räumen betreiben.', { action: tmpl('co_detector', { container: 'home' }), source: 'Brandschutz-/Feuerwehr-Empfehlungen' });
    if (sumTag('toilet_paper') === 0 && sumTag('hygiene') === 0) R('r:hygiene', 'rec', 'Hygiene', 'Hygienevorrat fehlt', 'Toilettenpapier, Müllbeutel, Seife und Desinfektion werden bei längeren Ausfällen schnell knapp.', { action: tmpl('toilet_paper', { container: 'home', qty: 6 }) });
    if (ctx.hs.fireplace && !owned.some(i => /holz|brikett|kohle/i.test(i.name))) R('r:wood', 'opt', 'Kochen & Brennstoff', 'Brennstoff für Kamin/Ofen nicht eingetragen', 'Trockenes Holz oder Briketts zum Heizen bereitstellen. Auf Abzug und CO-Melder achten.', { action: { type: 'template', key: 'fuel_home', name: 'Brennholz / Briketts', container: 'home' } });
  }
  if (ctx.goals.has('flood') && sumTag('dry_bag') === 0 && sumTag('doc_pouch') === 0) R('r:flood_dry', 'must', 'Schutz & Sicherheit', 'Wasserdichter Schutz für Dokumente und Elektronik fehlt', 'Im Szenario Hochwasser sind Ausweise, Medikamente und Handy besonders gefährdet.', { action: tmpl('dry_bag') });

  /* ---- Haustiere ---- */
  for (const pet of H.pets) {
    const label = `${pet.species}${pet.name ? ' ' + pet.name : ''}`;
    if (!owned.some(i => i.tags.includes('pet_transport') && (!i.petId || i.petId === pet.id))) R('r:pettrans:' + pet.id, pet.species === 'Hund' && +pet.weightKg > 25 ? 'rec' : 'must', 'Haustier', `Für ${label} fehlt möglicherweise eine Transportmöglichkeit`, 'Notunterkünfte und viele Ausweichunterkünfte nehmen Tiere nur gesichert im Transportbehälter auf. Auch Leine/Geschirr bereithalten.', { action: tmpl('pet_transport', { petId: pet.id }) });
    const pf = owned.filter(i => i.tags.includes('pet_food') && (!i.petId || i.petId === pet.id)).reduce((a, i) => a + i.qty, 0);
    const need = ctx.bagHours > 0 ? ctx.bagDays : ctx.homeDays;
    if (need > 0 && pf < need * (+pet.count || 1)) R('r:petfood:' + pet.id, 'rec', 'Haustier', `Futter für ${label} reicht nicht für ${need} Tage`, `Vorhanden: ${fmt(pf)} Tagesrationen. Einplanen: Futter, Wasser und ggf. Medikamente.`, { action: tmpl('pet_food', { qty: Math.max(1, need * (+pet.count || 1) - pf), petId: pet.id, container: ctx.bagHours > 0 ? 'bag' : 'home' }) });
    if (!owned.some(i => i.tags.includes('pet_docs') && (!i.petId || i.petId === pet.id))) R('r:petdocs:' + pet.id, 'rec', 'Haustier', `Impfpass/Heimtierausweis von ${label} nicht eingetragen`, 'Wird bei Unterbringung oft verlangt.', { action: tmpl('pet_docs', { petId: pet.id }) });
  }

  /* ---- Auto ---- */
  if (ctx.car && country === 'DE') {
    for (const [tag, key, title] of [['car_triangle', 'car_triangle', 'Warndreieck'], ['car_vest', 'car_vest', 'Warnweste'], ['car_firstaid', 'car_firstaid', 'Verbandkasten']])
      if (sumTag(tag) === 0) R('r:' + tag, 'must', 'Auto', `${title} im Auto fehlt`, 'Pflichtausrüstung in Deutschland (Warnweste, Warndreieck, Verbandkasten).', { action: tmpl(key, { container: 'car' }), source: 'StVZO/StVO' });
  }

  /* ---- Kontakte, Plan, Dokumente ---- */
  const noContacts = H.people.filter(p => !(p.passContacts || []).some(id => { const c = byId(H.contacts, id); return c && c.phone; }));
  if (noContacts.length) R('r:ice', 'must', 'Notfallpass', `Notfallkontakt fehlt: ${noContacts.map(p => p.name).join(', ')}`, 'Im Notfallpass ist niemand mit Telefonnummer hinterlegt.', { action: { type: 'goto', route: '#/pass/' + noContacts[0].id } });
  if (ctx.bagHours > 0 && !H.meeting.length) R('r:meeting', 'rec', 'Treffpunkt', 'Kein Treffpunkt festgelegt', 'Wo trefft ihr euch, wenn ihr getrennt seid?', { action: { type: 'goto', route: '#/places' } });
  const cashHave = sumTag('cash') ? owned.filter(i => i.tags.includes('cash')).reduce((a, i) => a + i.qty, 0) : 0;
  if (ctx.bagHours > 0 && cashHave < 50) R('r:cash', 'opt', 'Dokumente & Geld', 'Wenig Bargeld hinterlegt', 'Bei Ausfall von Strom oder Zahlungssystemen hilft Bargeld in kleinen Scheinen.', { action: tmpl('cash', { qty: 100 }) });

  /* ---- Ablaufdaten / Bestand ---- */
  const lead = S.notif.leadDays || 30;
  for (const i of owned) {
    if (i.expiry) {
      const dl = daysUntil(i.expiry);
      if (dl !== null && dl < 0) {
        if (i.expiryType === 'mhd') R('r:exp:' + i.id, 'rec', i.category, `MHD überschritten: ${i.name}`, `MHD ${fmtDate(i.expiry)}. Das MHD ist kein Verfallsdatum – prüfen und zuerst verbrauchen.`, { action: { type: 'goto', route: '#/item/' + i.id }, itemId: i.id });
        else R('r:exp:' + i.id, 'must', i.category, `${i.name} ist abgelaufen`, `${i.expiryType === 'use' ? 'Verbrauchsdatum' : 'Ablaufdatum'} ${fmtDate(i.expiry)}. ${i.expiryType === 'use' ? 'Nicht mehr verwenden, ersetzen.' : 'Ersetzen oder prüfen.'}`, { action: { type: 'goto', route: '#/item/' + i.id }, itemId: i.id });
      }
      else if (dl !== null && dl <= lead) R('r:exp:' + i.id, 'rec', i.category, `${i.name} läuft bald ab`, `Ablaufdatum ${fmtDate(i.expiry)} (${relDays(i.expiry)}).`, { action: { type: 'goto', route: '#/item/' + i.id }, itemId: i.id });
    }
    if (i.minQty > 0 && i.qty < i.minQty) R('r:min:' + i.id, 'must', i.category, `Mindestbestand unterschritten: ${i.name}`, `Vorhanden ${fmt(i.qty)} ${i.unit}, Mindestbestand ${fmt(i.minQty)}.`, { action: { type: 'restock', itemId: i.id }, itemId: i.id });
  }

  /* ---- Kontrollen ---- */
  for (const r of H.reminders) {
    const dl = daysUntil(r.next);
    if (r.enabled && dl !== null && dl < 0) R('r:rem:' + r.id, 'rec', 'Erinnerung', `Überfällig: ${r.title}`, `Fällig seit ${fmtDate(r.next)}. ${r.text || ''}`, { action: { type: 'goto', route: '#/reminders' } });
  }

  /* ---- Bereits auf der Einkaufsliste -> keine doppelte Empfehlung ---- */
  for (let k = recs.length - 1; k >= 0; k--) {
    const a = recs[k].action;
    if (a && a.type === 'template' && live.some(i => i.status === 'missing' && i.key === a.key && (!a.personId || i.personId === a.personId) && (!a.petId || i.petId === a.petId) && (a.container ? i.container === a.container : true))) recs.splice(k, 1);
  }
  /* ---- Zustand anwenden ---- */
  const order = { must: 0, rec: 1, opt: 2 };
  for (const r of recs) { const st = H.recs[r.id]; r.state = st ? st.state : null; r.note = st ? st.note : ''; r.alts = r.action && r.action.key ? ALTS[r.action.key] || null : null; }
  recs.sort((a, b) => order[a.level] - order[b.level]);
  return recs;
}
function openRecs(H, S) { return computeRecs(H, S).filter(r => r.state !== 'hidden' && r.state !== 'have'); }
function recCounts(H, S) {
  const c = { must: 0, rec: 0, opt: 0 };
  for (const r of openRecs(H, S)) c[r.level]++;
  return c;
}
