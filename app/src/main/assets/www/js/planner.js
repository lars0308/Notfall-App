'use strict';
/* ===== Notfall! – Planer: Bedarf, Packlisten, Verteilung, Statistik ===== */

/* ---------- Bedarf ---------- */
const BBK10 = { stock_grain: 3.5, stock_veg: 4.0, stock_fruit: 2.5, stock_dairy: 2.6, stock_protein: 1.5, stock_fat: 0.357 }; // kg je Person fuer 10 Tage (Referenz 2.357 kcal/Tag, Schaetzwert)
const BBK_REF_KCAL = 10 * 0 + 2357;
const PET_TABLE = { Hund: { water: 1.0, food: 450 }, Katze: { water: .25, food: 90 }, Kleintier: { water: .1, food: 40 }, Vogel: { water: .05, food: 30 }, Sonstiges: { water: .3, food: 100 } };

function kcalForAge(age, S) {
  const adult = (S && S.plan && S.plan.adultKcal) || 2200;
  if (age === null || age === undefined || age === '') return adult;
  age = +age;
  if (age < 1) return 700; if (age < 4) return 1100; if (age < 7) return 1400; if (age < 10) return 1700; if (age < 13) return 2000; if (age < 18) return 2300; if (age >= 65) return Math.min(adult, 1900);
  return adult;
}
function waterForAge(age, S) {
  const adult = (S && S.plan && S.plan.waterPerDay) || 2;
  if (age === null || age === undefined || age === '') return adult;
  age = +age;
  if (age < 1) return 0.8; if (age < 4) return 1.2; if (age < 13) return 1.5; return adult;
}
function carryForPerson(p, S) {
  if (p.carryKg !== undefined && p.carryKg !== null && p.carryKg !== '') return +p.carryKg;
  const age = p.age === '' || p.age === undefined ? 35 : +p.age;
  let kg = age < 6 ? 0 : age < 10 ? 2 : age < 13 ? 4 : age < 18 ? 8 : age >= 65 ? 8 : (S.plan.carryKg || 12);
  // Erwachsene mit Gewichtsangabe: 15–25 % des Koerpergewichts je nach Fitness, hoechstens 20 kg
  if (age >= 18 && +p.weightKg > 30) kg = Math.min(20, Math.max(5, Math.round(+p.weightKg * ({ low: .15, mid: .2, high: .25 }[p.fitness] || .18)))) - (age >= 65 ? 3 : 0);
  if (p.needs && p.needs.mobility && p.needs.mobility.trim()) kg = Math.round(kg / 2);
  return kg;
}
function bagLitersForPerson(p) {
  const age = p.age === '' || p.age === undefined ? 35 : +p.age;
  return age < 6 ? 0 : age < 10 ? 8 : age < 13 ? 15 : age < 18 ? 30 : age >= 65 ? 30 : 45;
}
/* Grundumsatz (Mifflin-St Jeor) mal Aktivitaet – nur mit Gewicht, Groesse und Geschlecht, sonst Richtwert nach Alter */
const FIT_FACTOR = { low: 1.4, mid: 1.6, high: 1.8 };
function kcalForPerson(p, age, S) {
  const w = +p.weightKg, hcm = +p.heightCm;
  if (age < 18 || !(w > 20 && w < 300) || !(hcm > 100 && hcm < 250) || !['f', 'm', 'd'].includes(p.sex)) return kcalForAge(age, S);
  const bmr = 10 * w + 6.25 * hcm - 5 * age + (p.sex === 'm' ? 5 : p.sex === 'f' ? -161 : -78);
  return Math.round(bmr * (FIT_FACTOR[p.fitness] || 1.5) / 50) * 50;
}
function personCalc(p, S) {
  const age = p.age === '' || p.age === undefined || p.age === null ? 35 : +p.age;
  return { group: ageGroup(age), age, kcal: kcalForPerson(p, age, S), waterL: waterForAge(age, S), carryKg: carryForPerson(p, S), bagL: bagLitersForPerson(p), carrier: age >= 6 };
}
function petCalc(pet) {
  const t = PET_TABLE[pet.species] || PET_TABLE.Sonstiges; const n = +pet.count || 1;
  let w = t.water; if (pet.species === 'Hund' && +pet.weightKg) w = Math.max(.3, +pet.weightKg * .06);
  return { waterL: w * n, foodG: t.food * n, n };
}
function householdCalc(H, S) {
  const people = H.people.map(p => ({ p, c: personCalc(p, S) }));
  const kcalDay = people.reduce((a, x) => a + x.c.kcal, 0);
  const waterDay = people.reduce((a, x) => a + x.c.waterL, 0);
  const petWater = H.pets.reduce((a, p) => a + petCalc(p).waterL, 0);
  return { people, n: people.length, kcalDay, waterDay, petWaterDay: petWater, avgKcal: people.length ? kcalDay / people.length : 0 };
}

/* ---------- Kontext aus den Antworten ---------- */
function planContext(H, S) {
  const cfg = H.cfg || { goals: [] };
  const goals = new Set(cfg.goals || []);
  const strategies = new Set(cfg.strategies && cfg.strategies.length ? cfg.strategies : ['shelter']);
  const durHours = +(cfg.durationHours) || 72;
  const bagGoalHours = GOALS.filter(g => g.group === 'Rucksack' && g.hours && goals.has(g.id)).map(g => g.hours);
  // Rucksack/Tasche ist der Kern: sobald ein Packplan existiert, wird fuer hoechstens 72 h gepackt
  let bagHours = 0;
  if (H.cfg && !cfg.boxOnly) bagHours = bagGoalHours.length ? Math.min(72, Math.max(...bagGoalHours)) : Math.min(72, Math.max(24, durHours));
  // Zuhause-Kiste ist optional: Vorrat wird nur geplant, wenn sie angelegt wurde
  const homeDays = H.box && H.box.enabled ? Math.max(1, +H.box.days || 3) : 0;
  const hs = cfg.housing || {};
  return { cfg, goals, strategies, durHours, bagHours, bagDays: Math.max(1, Math.ceil(bagHours / 24)), homeDays, hs, mobile: strategies.has('mobile'), shelterStrategy: strategies.has('shelter'), kids: H.people.some(p => (+p.age) < 13), car: goals.has('car'), pets: H.pets.length > 0 || goals.has('pet'), optional: !!cfg.includeOptional, rural: hs.type === 'rural' };
}

/* ---------- Gewuenschte Gegenstaende erzeugen ---------- */
function generateDesired(H, S) {
  const ctx = planContext(H, S);
  const calc = householdCalc(H, S);
  const out = [];
  const add = (key, o) => out.push(Object.assign({ key, qty: 1, scope: 'house', container: 'bag', prio: 'rec' }, o || {}));
  const nP = calc.n;
  const adults = calc.people.filter(x => x.c.carrier && x.c.age >= 13);
  const carriers = calc.people.filter(x => x.c.carrier);
  const biggest = adults.length ? adults : carriers;

  /* --- Rucksaecke: Personenbezogenes --- */
  if (ctx.bagHours > 0) {
    const days = ctx.bagDays;
    for (const { p, c } of calc.people) {
      const own = c.carrier && !p.noBag ? { personId: p.id, scope: 'person' } : { personId: p.id, scope: 'person', flex: true };
      const waterNeed = Math.ceil(c.waterL * days * 10) / 10;
      const carryCap = c.group === 'adult' || c.group === 'senior' ? 2 : c.group === 'teen' ? 1.5 : c.group === 'child' ? 1 : 0.5;
      const carryL = Math.min(waterNeed, carryCap);
      add('water_carry', Object.assign({ qty: carryL, prio: 'must', why: waterNeed > carryL ? `Für ${days} Tag${days > 1 ? 'e' : ''} werden rechnerisch ${fmt(waterNeed)} l benötigt. Im Rucksack trägst du ${fmt(carryL)} l; der Rest kommt aus Filter/Aufbereitung oder Wasserstellen.` : `Rechnerischer Bedarf für ${days} Tag${days > 1 ? 'e' : ''}: ${fmt(waterNeed)} l.` }, own));
      if (c.carrier) add('water_bottle', Object.assign({ prio: 'must' }, own));
      const grp = c.group;
      if (grp === 'baby') {
        add('food_baby', Object.assign({ qty: days, prio: 'must', why: 'Säuglinge brauchen passende Nahrung (Pre-Milch/Fertignahrung). Individuelle Absprache mit Kinderarzt/Hebamme.' }, own));
        add('baby_bottle', Object.assign({ prio: 'must' }, own));
        add('diapers', Object.assign({ qty: 7 * days, prio: 'must', why: 'Etwa 6–8 Windeln pro Tag.' }, own));
        add('baby_wipes', Object.assign({ prio: 'must' }, own));
        add('baby_clothes', Object.assign({ qty: Math.max(2, Math.min(4, days + 1)), prio: 'must' }, own));
        add('baby_carrier', Object.assign({ prio: 'rec' }, own));
        add('thermometer', Object.assign({ prio: 'rec' }, own));
      } else {
        const kcal = c.kcal;
        const w = Math.round(kcal / 4.2);
        if (grp === 'toddler' || grp === 'child') {
          add('food_child', Object.assign({ qty: days, prio: 'must', weightG: Math.round(kcal / 4.5), volL: Math.round(kcal / 4.5) / 1000 * 1.8, kcal, why: `Rechnerischer Energiebedarf ca. ${fmt0(kcal)} kcal pro Tag.` }, own));
        } else {
          add('food_ration', Object.assign({ qty: days, prio: 'must', weightG: w, volL: Math.round(w / 1000 * 1.8 * 10) / 10, kcal, why: `Rechnerischer Energiebedarf ca. ${fmt0(kcal)} kcal pro Tag; als leichte Trockennahrung ca. ${fmtKg(w)} pro Tag.` }, own));
        }
        add('food_snack', Object.assign({ prio: 'rec' }, own));
        add('underwear', Object.assign({ qty: Math.min(3, days + 1), prio: 'must' }, own));
        if (grp === 'toddler' || grp === 'child') add('child_clothes', Object.assign({ qty: grp === 'toddler' ? 2 : 1, prio: 'must' }, own));
        else add('fleece', Object.assign({ prio: ctx.bagHours >= 48 || ctx.mobile ? 'must' : 'rec' }, own));
        add('rain', Object.assign({ prio: 'must' }, own));
        add('hat_gloves', Object.assign({ prio: 'rec' }, own));
        if (grp === 'toddler' && c.age < 3) add('diapers', Object.assign({ qty: 6 * days, prio: 'must' }, own));
        if (grp === 'toddler' || grp === 'child') {
          add('child_id', Object.assign({ prio: 'must' }, own));
          add('toy', Object.assign({ prio: 'rec' }, own));
        }
      }
      // Schlafen
      const sleepNeeded = ctx.bagHours >= 48 || ctx.shelterStrategy || ctx.mobile;
      if (grp !== 'baby') add(grp === 'toddler' || grp === 'child' ? 'sleeping_bag_child' : 'sleeping_bag', Object.assign({ prio: sleepNeeded ? 'must' : 'rec', why: sleepNeeded ? 'Du brauchst eine eigene Schlafmöglichkeit, wenn du auswärts oder unterwegs übernachtest.' : undefined }, own));
      add('space_blanket', Object.assign({ prio: 'must' }, own));
      if (grp !== 'baby' && grp !== 'toddler') add('sleeping_mat', Object.assign({ prio: ctx.mobile ? 'must' : 'opt' }, own));
      // Technik
      if (c.carrier && c.age >= 10) add('headlamp', Object.assign({ prio: 'must' }, own));
      if (c.carrier && c.age >= 13) { add('powerbank', Object.assign({ prio: 'must' }, own)); add('cable_set', Object.assign({ prio: 'rec' }, own)); add('whistle', Object.assign({ prio: 'rec' }, own)); }
      // Hygiene
      add('hygiene_kit', Object.assign({ prio: 'must' }, own));
      add('wet_wipes', Object.assign({ prio: 'rec' }, own));
      if (ctx.bagHours >= 72 || ctx.shelterStrategy) add('ear_plugs', Object.assign({ prio: 'opt' }, own));
      // Gesundheit
      const n = p.needs || {};
      for (const m of (n.meds || [])) {
        if (!m.name) continue;
        add('meds', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', name: 'Medikament: ' + m.name + (m.dose ? ' (' + m.dose + ')' : ''), qty: 1, unit: 'Vorrat', expiry: m.expiry || '', why: 'Regelmäßig benötigtes Medikament: Vorrat für den Zeitraum plus Reserve (mind. 7 Tage) mitführen. Menge mit Arzt/Apotheke abstimmen.', uniq: 'med:' + m.name });
      }
      for (const d of splitList(n.devices)) add('firstaid', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', key2: 'device', name: 'Medizinisches Gerät: ' + d + ' (inkl. Ladegerät/Batterien)', category: 'Medizin', unit: 'Stück', weightG: 0, volL: 0, qty: 1, why: 'Geräte brauchen Energie – ohne Strom müssen Batterien/Powerbank/Alternative bereitstehen. Gewicht bitte eintragen.', uniq: 'dev:' + d, tags: ['device'] });
      for (const a of splitList(n.aids)) add('firstaid', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', key2: 'aid', name: 'Hilfsmittel: ' + a, category: 'Medizin', unit: 'Stück', weightG: 0, volL: 0, qty: 1, why: 'Persönliches Hilfsmittel (z. B. Brille, Hörgerät, Gehhilfe) mit Ersatz/Batterien.', uniq: 'aid:' + a, tags: ['aid'] });
      if (n.allergies && n.allergies.trim()) add('firstaid', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', key2: 'allergy', name: 'Allergie-Notfallmedikation laut ärztlichem Plan (' + n.allergies.trim().slice(0, 40) + ')', category: 'Medizin', unit: 'Set', weightG: 100, volL: .2, qty: 1, why: 'Allergien können in Notsituationen gefährlich sein. Welche Medikamente nötig sind, legt deine Ärztin / dein Arzt fest.', uniq: 'allergy', tags: ['meds'] });
      if (n.care && n.care.trim()) add('firstaid', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', key2: 'care', name: 'Pflegebedarf: ' + n.care.trim().slice(0, 50), category: 'Medizin', unit: 'Set', weightG: 0, volL: 0, qty: 1, why: 'Pflegehilfsmittel für den Zeitraum vorhalten; Pflegedienst/Arzt zum Notfallplan befragen.', uniq: 'care', tags: ['care'] });
      if (n.hygiene && n.hygiene.trim()) add('hygiene_special', { scope: 'person', personId: p.id, flex: !c.carrier, prio: 'must', name: 'Besondere Hygieneprodukte: ' + n.hygiene.trim().slice(0, 50), uniq: 'hyg' });
    }
    // Gemeinsame Ausruestung (verteilbar)
    const nAdultBags = Math.max(1, biggest.length);
    add('firstaid', { qty: nAdultBags, prio: 'must', flex: true, why: 'Pro Erwachsenem-Rucksack ein Erste-Hilfe-Set, damit jeder Rucksack allein einsatzfähig ist.', uniq: 'fa-main' });
    add('disinfect', { prio: 'rec', flex: true });
    add('gloves_nitrile', { prio: 'rec', flex: true });
    add('mask_ffp2', { qty: Math.min(nP, 4), prio: 'rec', flex: true });
    if (H.people.some(p => (+p.age) < 13)) add('thermometer', { prio: 'rec', flex: true });
    add('radio', { prio: 'must', flex: true, why: 'Bei Ausfall von Mobilfunk/Internet kommen offizielle Hinweise über das Radio.' });
    add('flashlight', { prio: 'rec', flex: true });
    add('batteries', { qty: 2, prio: 'must', flex: true, why: 'Reserve für Lampen und Radio.' });
    add('water_collapsible', { prio: 'rec', flex: true });
    add('water_filter', { qty: ctx.mobile || ctx.bagHours >= 72 ? Math.max(1, Math.min(2, adults.length || 1)) : 1, prio: ctx.mobile || ctx.rural || ctx.bagHours >= 48 ? 'must' : 'rec', flex: true });
    add('water_treat', { prio: ctx.mobile || ctx.rural || ctx.bagHours >= 48 ? 'must' : 'rec', flex: true });
    add('doc_pouch', { prio: 'must', flex: true, qty: Math.max(1, biggest.length) });
    add('docs_copies', { prio: 'must', flex: true, why: 'Kopien von Ausweisen, Versicherungen, Impfpass, Medikationsplan. Verschlüsselt oder in wasserdichter Hülle.' });
    add('contacts_paper', { prio: 'must', flex: true, qty: Math.max(1, biggest.length) });
    add('cash', { qty: 100 * Math.max(1, adults.length), prio: 'rec', flex: true, why: 'Bei Ausfall von Strom oder Kartenzahlung wird Bargeld gebraucht; kleine Scheine sind praktisch.' });
    add('trash_bags', { prio: 'rec', flex: true, qty: Math.max(1, biggest.length) });
    add('notepad', { prio: 'opt', flex: true });
    add('multitool', { prio: ctx.mobile ? 'must' : 'rec', flex: true });
    add('cordage', { prio: ctx.mobile ? 'rec' : 'opt', flex: true });
    add('lighter', { prio: 'rec', flex: true });
    if (ctx.goals.has('flood')) { add('dry_bag', { qty: Math.max(2, nAdultBags), prio: 'must', flex: true, why: 'Beim Szenario Hochwasser müssen Dokumente und Elektronik vor Nässe geschützt sein.' }); }
    else add('dry_bag', { prio: 'rec', flex: true });
    if (ctx.goals.has('flood') || ctx.goals.has('storm')) add('work_gloves', { qty: Math.max(1, adults.length), prio: 'rec', flex: true });
    if (ctx.bagHours >= 48 || ctx.mobile) {
      add('stove', { prio: ctx.mobile ? 'must' : 'rec', flex: true });
      add('fuel', { prio: ctx.mobile ? 'must' : 'rec', flex: true, why: 'Brennstoff für ' + ctx.bagDays + ' Tage Kochen und Wasser abkochen.' });
      add('cookware', { prio: ctx.mobile ? 'must' : 'rec', flex: true });
    }
    if (ctx.mobile) {
      add('tarp', { qty: Math.max(1, Math.ceil(nP / 3)), prio: 'must', flex: true, why: 'Wetterschutz bei Selbstversorgung unterwegs.' });
      add('tent', { qty: Math.max(1, Math.ceil(nP / 3)), prio: 'rec', flex: true, why: 'Unterkunft unterwegs – nur sinnvoll, wenn die Strategie „Selbstversorgung“ gewählt ist.' });
    }
    if (ctx.optional || ctx.rural) add('solar_charger', { prio: ctx.rural ? 'rec' : 'opt', flex: true, why: ctx.rural ? 'Auf dem Land kann der Strom länger ausfallen.' : '' });
  }

  /* --- Hausvorrat --- */
  if (ctx.homeDays > 0) {
    const d = ctx.homeDays;
    const reserve = (S.plan.reserve || 1);
    const waterL = Math.ceil((calc.waterDay + calc.petWaterDay) * d * reserve);
    add('water_stock', { qty: waterL, container: 'home', prio: 'must', why: `${d} Tage × ${fmt(calc.waterDay)} l (alle Personen)${calc.petWaterDay ? ' + ' + fmt(calc.petWaterDay) + ' l/Tag für Tiere' : ''}. Richtwert BBK: ca. 2 l pro Person und Tag.`, tags: ['water_supply'] });
    add('water_canister', { qty: Math.max(1, Math.min(4, Math.ceil(waterL / 40))), container: 'home', prio: 'rec' });
    if (d >= 3) add('water_service', { qty: Math.ceil(calc.n * d * 1), container: 'home', prio: 'rec', why: 'Zusätzliches Brauchwasser für Hygiene und WC-Spülung (Richtwert 1 l pro Person und Tag; kann deutlich höher liegen).' });
    // Lebensmittel nach Gruppen (BBK-Verhaeltnisse)
    const eatKcal = calc.people.filter(x => x.c.group !== 'baby').reduce((a, x) => a + x.c.kcal, 0);
    const f = eatKcal / BBK_REF_KCAL;
    for (const k of Object.keys(BBK10)) {
      const kg = Math.round(BBK10[k] / 10 * f * d * reserve * 10) / 10;
      if (kg > 0) add(k, { qty: kg, container: 'home', prio: 'must', why: `Richtwert in Anlehnung an die BBK-Vorratsempfehlung, umgerechnet auf ${calc.n} Person${calc.n === 1 ? '' : 'en'} und ${d} Tage (Schätzwert).`, kcalUnit: T[k].kcal });
    }
    if (calc.people.some(x => x.c.group === 'baby')) add('food_baby', { qty: d, container: 'home', scope: 'house', prio: 'must', uniq: 'home-baby' });
    add('stock_extras', { qty: 1, container: 'home', prio: 'rec' });
    add('can_opener', { container: 'home', prio: 'rec' });
    add('toilet_paper', { qty: Math.max(2, Math.ceil(calc.n * d / 5)), container: 'home', prio: 'rec' });
    add('trash_bags', { container: 'home', prio: 'rec', uniq: 'home-trash' });
    add('emergency_toilet', { container: 'home', prio: d >= 3 ? 'must' : 'rec', why: 'Fällt die Wasserversorgung aus, funktioniert die Toilettenspülung nicht mehr.' });
    add('firstaid_home', { container: 'home', prio: 'must' });
    add('stove_home', { container: 'home', prio: ctx.hs.cookNoPower ? 'rec' : 'must', why: 'Ohne Strom funktioniert der Herd nicht. Ein stromunabhängiger Kocher ermöglicht warme Mahlzeiten.' });
    add('fuel_home', { qty: Math.max(2, Math.ceil(d / 3)), container: 'home', prio: 'must' });
    add('lantern', { qty: Math.max(2, Math.ceil(calc.n / 2)), container: 'home', prio: 'must', why: 'LED-Licht ist bei Stromausfall sicherer als offene Flammen.' });
    add('flashlight', { qty: Math.max(2, adults.length), container: 'home', prio: 'must', uniq: 'home-flash' });
    add('batteries', { qty: 3, container: 'home', prio: 'must', uniq: 'home-batt' });
    add('radio', { container: 'home', prio: 'must', uniq: 'home-radio', why: 'Offizielle Informationen und Warnungen bei Ausfall von Strom/Internet.' });
    add('powerbank', { qty: 2, container: 'home', prio: 'rec', uniq: 'home-pb' });
    add('blanket_wool', { qty: calc.n, container: 'home', prio: ctx.hs.fireplace ? 'opt' : 'rec', why: 'Ohne Heizung kühlt eine Wohnung aus.' });
    add('smoke_detector', { qty: 2, container: 'home', prio: 'must' });
    add('co_detector', { container: 'home', prio: ctx.hs.fireplace || ctx.goals.has('blackout') ? 'must' : 'rec', why: ctx.hs.fireplace ? 'Du hast einen Kamin/Ofen – Kohlenmonoxid-Melder sind wichtig.' : 'Beim Heizen/Kochen mit Gas, Holz oder Aggregaten kann Kohlenmonoxid entstehen.' });
    add('extinguisher', { container: 'home', prio: ctx.goals.has('fire') ? 'must' : 'rec' });
    if (ctx.optional) add('candles', { qty: 10, container: 'home', prio: 'opt' });
    if (ctx.goals.has('flood')) add('rain_boots', { qty: Math.max(1, adults.length), container: 'home', prio: 'rec' });
    if (ctx.goals.has('storm') || ctx.goals.has('flood')) add('work_gloves', { qty: Math.max(1, adults.length), container: 'home', prio: 'rec', uniq: 'home-wg' });
    add('sturdy_shoes', { qty: calc.n, container: 'home', prio: 'rec', scope: 'house' });
  }

  /* --- Auto --- */
  if (ctx.car) {
    add('car_triangle', { role: 'car', prio: 'must' });
    add('car_vest', { qty: Math.max(2, Math.min(5, nP)), role: 'car', prio: 'must' });
    add('car_firstaid', { role: 'car', prio: 'must' });
    add('car_blanket', { role: 'car', prio: 'rec' });
    add('car_flash', { role: 'car', prio: 'rec' });
    add('car_water', { role: 'car', prio: 'rec' });
    add('car_charger', { role: 'car', prio: 'rec' });
    add('car_jumper', { role: 'car', prio: 'rec' });
    add('car_scraper', { role: 'car', prio: 'opt' });
    add('car_towrope', { role: 'car', prio: 'opt' });
    add('car_map', { role: 'car', prio: 'opt' });
  }

  /* --- Haustiere --- */
  for (const pet of H.pets) {
    const pc = petCalc(pet); const label = `${pet.species}${pet.name ? ' ' + pet.name : ''}`;
    const base = { scope: 'pet', petId: pet.id, label };
    if (ctx.bagHours > 0) {
      const days = ctx.bagDays;
      add('pet_food', Object.assign({ qty: days * pc.n, prio: 'must', weightG: pc.foodG / pc.n, flex: true, why: `Futter für ${label} für ${days} Tag${days > 1 ? 'e' : ''}.` }, base));
      add('pet_water', Object.assign({ qty: Math.round(pc.waterL * days * 10) / 10, prio: 'must', flex: true }, base));
      add('pet_bowl', Object.assign({ prio: 'rec', flex: true }, base));
      add('pet_leash', Object.assign({ prio: pet.species === 'Hund' ? 'must' : 'rec', flex: true }, base));
      add('pet_docs', Object.assign({ prio: 'must', flex: true }, base));
      add('pet_hygiene', Object.assign({ prio: 'rec', flex: true }, base));
      add('pet_comfort', Object.assign({ prio: 'opt', flex: true }, base));
    }
    if (pet.needs && pet.needs.trim()) add('pet_meds', Object.assign({ prio: 'must', flex: true, container: ctx.bagHours > 0 ? 'bag' : 'home', name: 'Tiermedikamente: ' + pet.needs.trim().slice(0, 40) }, base));
    add('pet_transport', Object.assign({ weightG: 0, volL: 0, lastMinute: true, flex: true, prio: pet.species === 'Hund' && +pet.weightKg > 25 ? 'rec' : 'must', why: 'Notunterkünfte nehmen Tiere meist nur gesichert im Transportbehälter auf.' }, base));
    if (ctx.homeDays > 0) add('pet_food', Object.assign({ qty: ctx.homeDays * pc.n, container: 'home', prio: 'must', weightG: pc.foodG / pc.n, uniq: 'home-pf', why: `Futtervorrat für ${label} für ${ctx.homeDays} Tage.` }, base));
  }
  return out;
}

/* ---------- Einen Gegenstand aus Vorlage erzeugen ---------- */
function makeItem(d, extra) {
  const t = T[d.key] || {};
  const unit = d.unit || t.u || 'Stück';
  const it = {
    id: uid(), key: d.key2 ? d.key + ':' + d.key2 : d.key, name: d.name || t.n || d.key, desc: '', category: d.category || t.c || 'Sonstiges',
    qty: d.qty ?? 1, unit, weightG: d.weightG ?? t.g ?? 0, volL: d.volL ?? t.l ?? 0, kcal: d.kcal ?? (d.kcalUnit ? d.kcalUnit : 0), liters: 0,
    status: 'planned', packed: false, container: d.container || 'bag', bagId: null, compId: null, place: '',
    personId: d.personId || null, petId: d.petId || null, prio: d.prio || 'rec', why: d.why || t.w || '', source: 'plan',
    tags: Array.from(new Set([...(t.t || []), ...(d.tags || [])])), zone: t.z || 'main', expiry: d.expiry || '', photos: [], notes: '', price: null, purchaseDate: '', condition: '',
    barcode: '', minQty: 0, remindDays: 0, kind: (d.container || 'bag') === 'bag' ? 'pack' : (t.t || []).includes('stock_food') || (t.t || []).includes('water_supply') ? 'stock' : 'gear', archived: false, created: new Date().toISOString(), uniq: d.uniq || '', flex: !!d.flex,
  };
  it.role = d.role || '';
  if (it.zone === 'car') it.zone = 'main';
  // Dinge, die taeglich gebraucht werden, kommen erst bei Abreise in die Tasche
  it.lastMinute = d.lastMinute !== undefined ? !!d.lastMinute : (d.key === 'meds' || d.key2 === 'device' || d.key2 === 'aid' || d.key2 === 'allergy' || d.key2 === 'care');
  if (it.container === 'home' && it.unit === 'kg') it.weightG = 1000;
  if (T[d.key] && T[d.key].nopack) it.container = 'home';
  return Object.assign(it, extra || {});
}

/* ---------- Plan anwenden (erstellen oder ergaenzen) ---------- */
const TAGKEY = { headlamp: 'headlamp', radio: 'radio', powerbank: 'powerbank', water_filter: 'water_filter', stove: 'stove', sleeping: 'sleeping_bag', mat: 'sleeping_mat', tarp: 'tarp', tent: 'tent', firstaid: 'firstaid', space_blanket: 'space_blanket', whistle: 'whistle', fire_starter: 'lighter', cookware: 'cookware', tool: 'multitool', can_opener: 'can_opener', smoke_detector: 'smoke_detector', co_detector: 'co_detector', extinguisher: 'extinguisher' };
function guessKey(item) {
  if (item.key) return item.key;
  let best = null, bs = 0;
  for (const k of Object.keys(T)) { const sc = similar(item.name, T[k].n); if (sc > bs) { bs = sc; best = k; } }
  if (bs >= 0.5) return best;
  for (const t of (item.tags && item.tags.length ? item.tags : inferTags(item.name))) if (TAGKEY[t]) return TAGKEY[t];
  return '';
}
function ownedPool(H) {
  // Vom Nutzer erfasste Gegenstaende ohne Zuordnung (Einrichtung, Beispiel, manuell)
  const out = [];
  for (const i of H.items) {
    if (i.archived || i.status !== 'owned' || i.source === 'plan' || i.source === 'declared' || i.personId || i.bagId || !(i.container === 'home' || !i.container)) continue;
    if (!i.key) { const k = guessKey(i); if (!k) continue; i.key = k; i.keyGuessed = true; }
    out.push(i);
  }
  return out;
}
function sameScope(i, d) { return (i.personId || null) === (d.personId || null) && (i.petId || null) === (d.petId || null); }

function applyPlan(H, S) {
  const desired = generateDesired(H, S);
  const ctx = planContext(H, S);
  const calc = householdCalc(H, S);
  const report = { added: 0, matched: 0, ownedFromInventory: 0, bags: 0, updated: 0 };

  /* 1) Rucksaecke fuer Traeger sicherstellen */
  if (ctx.bagHours > 0 || ctx.car) report.bags += ensureBags(H, S, calc);

  /* 2) Gegenstaende abgleichen */
  const pool = ownedPool(H);
  pool.forEach(p => { p._orig = p.qty; });
  const poolSet = new Set(pool);
  const fresh = [];
  for (const d of desired) {
    const key = d.key2 ? d.key + ':' + d.key2 : d.key;
    const existing = H.items.filter(i => !poolSet.has(i) && !i.archived && i.key === key && i.container === (T[d.key] && T[d.key].nopack ? 'home' : d.container) && sameScope(i, d) && (i.role || '') === (d.role || '') && (i.uniq || '') === (d.uniq || '') && i.source !== 'sample-extra');
    const have = existing.reduce((a, i) => a + (+i.qty || 0), 0);
    let need = d.qty;
    if (d.uniq && existing.length && (d.key === 'meds' || key.indexOf(':') > 0)) { report.matched++; continue; }
    if (existing.length) {
      report.matched++;
      // Mehrbedarf -> noch nicht bestaetigte Eintraege hochsetzen
      const planned = existing.find(i => i.status === 'planned' && i.source === 'plan');
      if (have < need - 1e-9) {
        if (planned) { planned.qty = +(planned.qty + (need - have)).toFixed(2); report.updated++; }
        else need = need - have; // Rest als neuer Eintrag
      } else continue;
      if (planned) continue;
    }
    const it = makeItem(d, { qty: need });
    if (d.label) it.notes = d.label;
    // Vorhandenes aus dem Inventar (Einrichtungsschritt "Vorhandene Ausruestung") zuordnen
    const poolItem = pool.find(p => p.key === d.key && (p.qty > 0));
    let remaining = it.qty;
    if (poolItem && T[d.key] && !T[d.key].nopack) {
      const take = Math.min(poolItem.qty, remaining);
      if (take > 0) {
        const owned = Object.assign(clone(it), { id: uid(), qty: take, status: 'owned', source: 'plan', photos: poolItem.photos || [], notes: [it.notes, poolItem.notes].filter(Boolean).join(' · '), name: pickName(poolItem, it, take), condition: poolItem.condition || '' });
        if (poolItem.weightG) owned.weightG = poolItem.weightG; if (poolItem.volL) owned.volL = poolItem.volL; if (poolItem.kcal) owned.kcal = poolItem.kcal;
        fresh.push(owned); poolItem.qty = +(poolItem.qty - take).toFixed(2); remaining = +(remaining - take).toFixed(2); report.ownedFromInventory++;
      }
    } else if (poolItem && d.container === 'home') {
      const take = Math.min(poolItem.qty, remaining); poolItem.qty = +(poolItem.qty - take).toFixed(2); remaining = +(remaining - take).toFixed(2);
      fresh.push(Object.assign(clone(it), { id: uid(), qty: take, status: 'owned' }));
    }
    if (remaining > 1e-9) { it.qty = remaining; fresh.push(it); }
  }
  // Pool-Eintraege mit Menge 0 entfernen
  for (const p of pool) if (p.qty <= 1e-9) H.items.splice(H.items.indexOf(p), 1);
  // Angaben aus Schritt 3 (vorhandene Wasser-/Lebensmittelvorraete) verrechnen
  applyDeclaredStocks(H, S, fresh, ctx, calc);
  report.added = fresh.length;
  H.items.push(...fresh);

  /* 3) Verteilung auf Rucksaecke und Faecher */
  assignToBags(H, S);
  for (const b of H.bags) autoPack(H, b, { onlyUnassigned: true });

  /* 4) Aufgaben, Erinnerungen, Kontakte, Dokumente */
  buildTasks(H, S, ctx, calc);
  buildReminders(H, S, ctx, calc);
  buildContacts(H, S, ctx);
  buildDocList(H, ctx);
  H.plan.lastBuilt = new Date().toISOString();
  H.plan.summary = { people: calc.n, bagHours: ctx.bagHours, homeDays: ctx.homeDays, waterDay: calc.waterDay, kcalDay: calc.kcalDay };
  return report;
}

/* Eigenen Namen behalten, wenn er klar vom Vorlagennamen abweicht (z. B. Markenname) */
function pickName(poolItem, it, take) {
  if (!poolItem.name) return it.name;
  const orig = poolItem._orig || poolItem.qty;
  if (orig === 1) return poolItem.name;
  return similar(poolItem.name, it.name) < 0.34 && take === orig ? poolItem.name : it.name;
}
function applyDeclaredStocks(H, S, fresh, ctx, calc) {
  const hs = ctx.hs || {};
  if (+hs.waterL > 0 && !H.items.some(i => i.key === 'water_stock' && i.source === 'declared')) {
    const w = fresh.find(i => i.key === 'water_stock' && i.container === 'home');
    const have = +hs.waterL;
    fresh.push(Object.assign(makeItem({ key: 'water_stock', qty: have, container: 'home', prio: 'must' }), { status: 'owned', source: 'declared', notes: 'Aus deiner Angabe in der Einrichtung. Bitte Menge prüfen.' }));
    if (w) { w.qty = Math.max(0, +(w.qty - have).toFixed(1)); if (w.qty <= 0) fresh.splice(fresh.indexOf(w), 1); }
  }
  if (+hs.foodDays > 0 && !H.items.some(i => i.key === 'food_declared')) {
    const pd = Math.round(+hs.foodDays * calc.n);
    fresh.push(Object.assign(makeItem({ key: 'stock_extras', qty: pd, container: 'home', prio: 'must', name: 'Lebensmittelvorrat (Angabe aus Einrichtung)', unit: 'Personentage' }), { key: 'food_declared', status: 'owned', source: 'declared', kcal: Math.round(calc.avgKcal), tags: ['food', 'stock_food'], kind: 'stock', notes: `Du hast angegeben, ca. ${hs.foodDays} Tage Vorrat zu haben. Bitte durch einzelne Positionen ersetzen.` }));
    const share = Math.min(1, +hs.foodDays / Math.max(1, ctx.homeDays));
    for (const i of fresh) if (i.tags.includes('stock_food') && i.source === 'plan' && i.status === 'planned') { i.qty = Math.max(0, +(i.qty * (1 - share)).toFixed(1)); }
    for (let k = fresh.length - 1; k >= 0; k--) if (fresh[k].source === 'plan' && fresh[k].tags.includes('stock_food') && fresh[k].qty <= 0) fresh.splice(k, 1);
  }
  if (hs.cookNoPower) {
    const st = fresh.find(i => i.key === 'stove_home'); if (st) { st.status = 'owned'; st.notes = 'Aus deiner Angabe übernommen: stromunabhängige Kochmöglichkeit vorhanden.'; }
  }
}

/* ---------- Rucksaecke ---------- */
function ensureBags(H, S, calc) {
  let created = 0;
  const carriers = calc.people.filter(x => x.c.carrier);
  const unassigned = H.bags.filter(b => !b.owner && b.role !== 'car' && b.type !== 'box');
  // Reihenfolge: groesste Taeger zuerst, groesste unzugewiesene Rucksaecke zuerst
  const order = carriers.slice().sort((a, b) => b.c.carryKg - a.c.carryKg);
  const bagsSorted = unassigned.slice().sort((a, b) => b.liters - a.liters);
  for (const x of (planContext(H, S).bagHours > 0 ? order : [])) {
    if (x.p.noBag || H.bags.some(b => b.owner === x.p.id && b.role !== 'car')) continue;
    const free = bagsSorted.find(b => !b.owner);
    if (free) { free.owner = x.p.id; continue; }
    const type = x.c.age < 13 ? 'kids' : 'trekking';
    const bt = BAG_TYPE[type];
    const liters = x.c.bagL || bt.liters;
    H.bags.push(newBag({ name: 'Notfallrucksack ' + (x.p.name || 'Person'), type, liters, owner: x.p.id, suggested: true, ownKg: x.c.age < 13 ? .4 : 1.6 }));
    created++;
  }
  if (planContext(H, S).car && !H.bags.some(b => b.role === 'car')) { H.bags.push(newBag({ name: 'Auto-Notfalltasche', type: 'travel', liters: 40, role: 'car', location: 'Auto', use: 'Auto', suggested: true, color: 'black' })); created++; }
  return created;
}
function newBag(o) {
  const bt = BAG_TYPE[o.type || 'trekking'] || BAG_TYPE.trekking;
  const b = Object.assign({ id: uid(), name: 'Rucksack', type: 'trekking', maker: '', model: '', liters: bt.liters, ownKg: bt.ownKg, maxLoadKg: 0, owner: null, use: '', location: '', photos: [], hip: bt.hip, chest: bt.chest, hydration: false, ext: false, color: 'olive', notes: '', suggested: false, checkedAt: '', comps: [] }, o);
  if (!b.comps.length) b.comps = defaultComps(b, o.compCount);
  return b;
}
function defaultComps(bag, count) {
  const bt = BAG_TYPE[bag.type] || BAG_TYPE.trekking;
  const slots = (MODEL_SLOTS[bt.model] || MODEL_SLOTS.trek).slice();
  const n = count && count > 0 ? count : slots.length;
  const comps = [];
  for (let i = 0; i < n; i++) {
    if (i < slots.length) comps.push({ id: uid(), name: slots[i][1], slot: slots[i][0], capL: Math.round(bag.liters * slots[i][2] * 10) / 10 });
    else comps.push({ id: uid(), name: 'Innenfach ' + (i - slots.length + 1), slot: null, capL: Math.round(bag.liters * 0.03 * 10) / 10 });
  }
  return comps;
}
function bagCapacityKg(H, S, bag) {
  if (bag.role === 'car') return +bag.maxLoadKg || 0; // wird nicht getragen
  const p = bag.owner ? byId(H.people, bag.owner) : null;
  let cap = p ? carryForPerson(p, S) : (S.plan.carryKg || 12);
  if (bag.maxLoadKg > 0) cap = cap > 0 ? Math.min(cap, bag.maxLoadKg) : bag.maxLoadKg;
  return cap;
}
function bagItems(H, bag, opts = {}) {
  return H.items.filter(i => !i.archived && i.container === 'bag' && i.bagId === bag.id && (opts.all || i.status !== 'missing' || opts.includeMissing !== false));
}
/* Fehlende Teile mitrechnen: Plangewicht = alles, was in den Rucksack soll */
function assignToBags(H, S) {
  const calc = householdCalc(H, S);
  const carBag = H.bags.find(b => b.role === 'car');
  if (carBag) for (const i of H.items) if (!i.archived && i.container === 'bag' && !i.bagId && i.role === 'car') i.bagId = carBag.id;
  const bags = H.bags.filter(b => b.owner && b.role !== 'car' && byId(H.people, b.owner) && personCalc(byId(H.people, b.owner), S).carrier);
  if (!bags.length) return;
  const load = new Map(bags.map(b => [b.id, (b.ownKg || 0) * 1000 + bagItems(H, b).reduce((a, i) => a + i.qty * (i.weightG || 0), 0)]));
  const cap = new Map(bags.map(b => [b.id, Math.max(1, bagCapacityKg(H, S, b))]));
  const todo = H.items.filter(i => !i.archived && i.container === 'bag' && !i.bagId && i.role !== 'car');
  // 1) feste Zuordnung
  for (const i of todo.filter(i => i.personId && !i.flex)) {
    const b = bags.find(b => b.owner === i.personId);
    if (b) { i.bagId = b.id; load.set(b.id, load.get(b.id) + i.qty * (i.weightG || 0)); }
  }
  // 2) flexible Zuordnung (schwerste zuerst, auf geringste relative Last)
  const flex = H.items.filter(i => !i.archived && i.container === 'bag' && !i.bagId && i.role !== 'car').sort((a, b) => (b.qty * (b.weightG || 0)) - (a.qty * (a.weightG || 0)));
  for (const i of flex) {
    // Erwachsene/Jugendliche zuerst; Kinder nur wenn es sonst keinen Traeger gibt
    const cands = bags.filter(b => { const p = byId(H.people, b.owner); return p && (+p.age >= 13 || p.age === '' || p.age === undefined); });
    const list = cands.length ? cands : bags;
    let best = list[0], bestR = Infinity;
    for (const b of list) { const r = load.get(b.id) / (cap.get(b.id) * 1000); if (r < bestR) { bestR = r; best = b; } }
    // Mehrfach-Mengen (z. B. Erste-Hilfe-Sets) auf mehrere Rucksaecke aufteilen
    if (i.qty > 1 && Math.abs(i.qty - Math.round(i.qty)) < 1e-9 && list.length > 1 && i.unit !== 'Liter' && i.unit !== 'Euro' && i.unit !== 'Tagesration') {
      const parts = Math.min(list.length, i.qty);
      const per = Math.floor(i.qty / parts); let rest = i.qty - per * parts;
      const sorted = list.slice().sort((a, b) => load.get(a.id) / cap.get(a.id) - load.get(b.id) / cap.get(b.id));
      i.qty = per + (rest-- > 0 ? 1 : 0); i.bagId = sorted[0].id; load.set(sorted[0].id, load.get(sorted[0].id) + i.qty * (i.weightG || 0));
      for (let k = 1; k < parts; k++) {
        const q = per + (rest-- > 0 ? 1 : 0); if (q <= 0) continue;
        const cp = Object.assign(clone(i), { id: uid(), qty: q, bagId: sorted[k].id, compId: null });
        H.items.push(cp); load.set(sorted[k].id, load.get(sorted[k].id) + q * (i.weightG || 0));
      }
    } else { i.bagId = best.id; load.set(best.id, load.get(best.id) + i.qty * (i.weightG || 0)); }
  }
}

function slotFor(bag, zone, volL, usedMap) {
  const prefs = ZONE_SLOTS[zone] || ZONE_SLOTS.main;
  const comps = bag.comps;
  const cands = [];
  for (const s of prefs) for (const c of comps) if (c.slot === s) cands.push(c);
  const inner = comps.filter(c => !c.slot);
  const all = cands.concat(inner, comps.filter(c => !cands.includes(c) && !inner.includes(c)));
  for (const c of all) { const free = (c.capL || 0) - (usedMap.get(c.id) || 0); if (!c.capL || free >= volL - 1e-6) return c; }
  const main = comps.find(c => c.slot === 'main') || comps[0];
  return main || null;
}
function autoPack(H, bag, opts = {}) {
  const used = new Map(bag.comps.map(c => [c.id, 0]));
  const items = bagItems(H, bag);
  if (!opts.onlyUnassigned) for (const i of items) i.compId = null;
  for (const i of items) if (i.compId && used.has(i.compId)) used.set(i.compId, used.get(i.compId) + i.qty * (i.volL || 0));
  const todo = items.filter(i => !i.compId || !used.has(i.compId)).sort((a, b) => (b.qty * (b.volL || 0)) - (a.qty * (a.volL || 0)));
  let n = 0;
  for (const i of todo) {
    const c = slotFor(bag, i.zone || 'main', i.qty * (i.volL || 0), used);
    if (c) { i.compId = c.id; used.set(c.id, (used.get(c.id) || 0) + i.qty * (i.volL || 0)); n++; }
  }
  return n;
}

/* ---------- Statistik ---------- */
function bagStats(H, S, bag) {
  const items = bagItems(H, bag);
  const own = (+bag.ownKg || 0) * 1000;
  let w = 0, vol = 0, packed = 0, total = 0, missing = 0, noWeight = 0;
  const comps = bag.comps.map(c => ({ id: c.id, name: c.name, slot: c.slot, capL: c.capL || 0, weightG: 0, volL: 0, total: 0, packed: 0, missing: 0 }));
  const cm = new Map(comps.map(c => [c.id, c]));
  for (const i of items) {
    const iw = i.qty * (i.weightG || 0), iv = i.qty * (i.volL || 0);
    w += iw; vol += iv; total++; if (i.status === 'missing' || i.status === 'planned') missing++;
    if (i.packed && i.status === 'owned') packed++;
    if (!i.weightG && !['nopack'].includes(i.zone)) noWeight++;
    const c = cm.get(i.compId); if (c) { c.weightG += iw; c.volL += iv; c.total++; if (i.packed && i.status === 'owned') c.packed++; if (i.status !== 'owned') c.missing++; }
  }
  const capKg = bagCapacityKg(H, S, bag);
  const usable = bag.liters * 0.85;
  for (const c of comps) {
    c.fillPct = c.capL > 0 ? Math.round(c.volL / c.capL * 100) : 0;
    c.status = c.total === 0 ? 'empty' : c.capL > 0 && c.volL > c.capL * 1.0001 ? 'over' : c.packed === c.total ? 'packed' : c.packed > 0 ? 'partial' : 'open';
  }
  const totalG = w + own;
  return {
    itemsG: w, ownG: own, totalG, volL: vol, usableL: usable, fillPct: usable > 0 ? Math.round(vol / usable * 100) : 0,
    capKg, overweight: capKg > 0 && totalG > capKg * 1000, overFactor: capKg > 0 ? totalG / (capKg * 1000) : 0, overfull: vol > usable,
    total, packed, missing, have: total - missing, havePct: pct(total - missing, total), noWeight, comps, packedPct: pct(packed, total),
  };
}
function suggestBalance(H, S) {
  const bags = H.bags.filter(b => b.owner);
  if (bags.length < 2) return [];
  const st = new Map(bags.map(b => [b.id, bagStats(H, S, b)]));
  const w = new Map(bags.map(b => [b.id, st.get(b.id).totalG]));
  const cap = new Map(bags.map(b => [b.id, Math.max(1, bagCapacityKg(H, S, b)) * 1000]));
  const moves = [];
  const movable = i => i.flex && i.status !== 'archived' && !i.packed;
  for (let n = 0; n < 25; n++) {
    const sorted = bags.slice().sort((a, b) => w.get(b.id) / cap.get(b.id) - w.get(a.id) / cap.get(a.id));
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    const rHi = w.get(hi.id) / cap.get(hi.id), rLo = w.get(lo.id) / cap.get(lo.id);
    if (rHi - rLo < 0.12) break;
    const cand = bagItems(H, hi).filter(i => movable(i) && i.qty * (i.weightG || 0) > 0 && !moves.some(m => m.itemId === i.id))
      .filter(i => { const iw = i.qty * (i.weightG || 0); return (w.get(hi.id) - iw) / cap.get(hi.id) >= (w.get(lo.id) + iw) / cap.get(lo.id) - 0.1 && iw < (w.get(hi.id) - w.get(lo.id)); })
      .sort((a, b) => b.qty * b.weightG - a.qty * a.weightG);
    const pick = cand[0]; if (!pick) break;
    const iw = pick.qty * pick.weightG;
    moves.push({ itemId: pick.id, from: hi.id, to: lo.id, name: pick.name, qty: pick.qty, weightG: iw });
    w.set(hi.id, w.get(hi.id) - iw); w.set(lo.id, w.get(lo.id) + iw);
  }
  return moves;
}

/* ---------- Vorraete / Reichweite ---------- */
function calcSupplies(H, S) {
  const calc = householdCalc(H, S);
  const ctx = planContext(H, S);
  const owned = H.items.filter(i => !i.archived && i.status === 'owned');
  const waterItems = owned.filter(i => i.tags.includes('water_supply') && i.container !== 'bag');
  const waterL = waterItems.reduce((a, i) => a + i.qty * (i.liters || (i.unit === 'Liter' ? 1 : 0)), 0);
  const waterBagL = owned.filter(i => i.tags.includes('water_supply') && i.container === 'bag').reduce((a, i) => a + i.qty * (i.liters || (i.unit === 'Liter' ? 1 : 0)), 0);
  const foodItems = owned.filter(i => i.tags.includes('food') && i.container !== 'bag');
  const kcal = foodItems.reduce((a, i) => a + i.qty * (+i.kcal || 0), 0);
  const noKcal = foodItems.filter(i => !(+i.kcal)).length;
  const perDayWater = calc.waterDay + calc.petWaterDay;
  const waterDays = perDayWater > 0 ? waterL / perDayWater : 0;
  const foodDays = calc.kcalDay > 0 ? kcal / calc.kcalDay : 0;
  const target = ctx.homeDays;
  return { calc, ctx, waterL, waterBagL, waterDays, foodDays, kcal, noKcal, perDayWater, targetDays: target, waterTargetL: perDayWater * target, kcalTarget: calc.kcalDay * target };
}

/* ---------- Aufgaben ---------- */
function setTask(H, key, title, why, cat, extra) {
  let t = H.tasks.find(x => x.key === key);
  if (!t) { t = { id: uid(), key, title, why, cat: cat || 'Allgemein', done: false, created: new Date().toISOString(), auto: true }; H.tasks.push(t); }
  else if (t.auto) { t.title = title; t.why = why; t.cat = cat || t.cat; }
  if (extra) Object.assign(t, extra);
  return t;
}
function buildTasks(H, S, ctx, calc) {
  const g = ctx.goals;
  setTask(H, 'warnapp', 'Warn-App einrichten und Handy-Notfallbenachrichtigungen aktiv lassen', 'Offizielle Warnungen haben Vorrang. Warn-Apps (z. B. NINA/WarnWetter bzw. Alertswiss) und Cell Broadcast informieren dich schnell.', 'Information');
  setTask(H, 'talk', 'Notfallplan mit allen Personen im Haushalt besprechen', 'Wer macht was? Wo ist der Treffpunkt? Wohin geht ihr bei Evakuierung?', 'Information');
  setTask(H, 'ice', 'Mindestens zwei Notfallkontakte (ICE) eintragen', 'Vertrauenspersonen außerhalb des Gefahrenbereichs. Bereich „Kontakte“.', 'Kontakte');
  if (ctx.bagHours > 0) {
    setTask(H, 'confirm', 'Geplante Ausrüstung prüfen: „Habe ich“ oder „Fehlt“', 'Bestätige, was bereits vorhanden ist. Fehlendes landet automatisch in der Einkaufsliste.', 'Ausrüstung');
    setTask(H, 'bagtest', 'Rucksack einmal komplett packen und probetragen', 'Gewicht, Sitz und Zugriff testen. Anpassungen sind jetzt leichter als im Ernstfall.', 'Rucksack');
    setTask(H, 'shoes', 'Feste Schuhe und wetterfeste Kleidung griffbereit halten', 'Bei Evakuierung bleibt wenig Zeit.', 'Rucksack');
    setTask(H, 'meeting', 'Treffpunkte festlegen (nah und weiter entfernt)', 'Falls ihr getrennt seid oder das Haus nicht erreichbar ist. Bereich „Kontakte“ → Treffpunkte.', 'Kontakte');
  }
  if (ctx.shelterStrategy) setTask(H, 'fallback', 'Ausweichunterkunft klären (Verwandte, Freunde, Hotel)', 'Vorher absprechen: Adresse, Platz, Haustiere, Anfahrt.', 'Kontakte');
  if (g.has('flood')) {
    setTask(H, 'floodrisk', 'Hochwassergefährdung deiner Adresse bei Gemeinde/Behörde erfragen', 'Hochwassergefahrenkarten gibt es bei Ländern und Kommunen. Verhalten richtet sich nach den Anweisungen der Behörden.', 'Szenario Hochwasser');
    setTask(H, 'floodvalue', 'Wertvolle Gegenstände und Dokumente hoch lagern bzw. wasserdicht sichern', 'Keller und Erdgeschoss sind zuerst betroffen.', 'Szenario Hochwasser');
    setTask(H, 'floodpower', 'Wissen, wo Strom, Wasser und Gas abgestellt werden – nur gefahrlos und nach Anweisung', 'Bei Wasser im Keller niemals bei Nässe an Elektrik arbeiten; Fachbetrieb/Feuerwehr fragen.', 'Szenario Hochwasser');
  }
  if (g.has('storm')) {
    setTask(H, 'stormyard', 'Lose Gegenstände draußen sichern (Möbel, Mülltonnen, Schirme)', 'Sturm macht daraus Wurfgeschosse.', 'Szenario Sturm');
    setTask(H, 'stormcar', 'Fahrzeug nicht unter Bäumen parken, wenn Sturm angekündigt ist', 'Vorsorge nach Wetterwarnung.', 'Szenario Sturm');
  }
  if (g.has('blackout')) {
    setTask(H, 'blackfridge', 'Plan für Kühlschrank/Gefriergut bei Stromausfall überlegen', 'Kühlschrank möglichst geschlossen halten; verderbliche Lebensmittel zuerst verbrauchen.', 'Szenario Stromausfall');
    setTask(H, 'blackfuel', 'Bei Stromausfall: Tank des Autos nicht leer fahren, Handy aufgeladen halten', 'Tankstellen und Ladepunkte können ausfallen.', 'Szenario Stromausfall');
  }
  if (g.has('fire')) {
    setTask(H, 'firesmoke', 'Rauchmelder monatlich testen', 'Rauchmelder retten Leben, aber nur wenn sie funktionieren.', 'Szenario Brand');
    setTask(H, 'fireplan', 'Fluchtweg und Treffpunkt vor dem Haus üben', 'Aufzüge bei Brand nicht benutzen. Nach dem Verlassen nicht zurückgehen.', 'Szenario Brand');
  }
  if (g.has('shelter')) setTask(H, 'room', 'Schutzraum im Bereich „Schutzräume“ dokumentieren und Risiken markieren', 'Die App stuft Räume nie als sicher oder zertifiziert ein – das ist nur nach fachlicher Prüfung möglich.', 'Szenario Schutzraum');
  if (ctx.car) setTask(H, 'cartank', 'Tank nach Möglichkeit nicht unter einem Viertel lassen', 'Bei Evakuierung oder Stromausfall können Tankstellen nicht erreichbar sein.', 'Szenario Auto');
  if (ctx.pets) setTask(H, 'vet', 'Tier-Chip registrieren und Impfpass-Kopie bereithalten', 'Hilft bei Verlust und bei Unterbringung.', 'Haustiere');
  if (H.people.some(p => p.needs && p.needs.meds && p.needs.meds.some(m => m.name))) setTask(H, 'medplan', 'Medikationsplan aktuell halten und Reservemenge mit Arzt/Apotheke klären', 'Reserve für den Zeitraum plus ein Puffer.', 'Gesundheit');
  if (H.people.some(p => (+p.age) < 13)) setTask(H, 'kidsize', 'Kleidergrößen der Kinder halbjährlich prüfen', 'Kinder wachsen schnell.', 'Kinder');
  if (ctx.homeDays > 0) setTask(H, 'waterplace', 'Lagerorte für Wasser und Lebensmittel festlegen (kühl, dunkel, trocken)', 'Bessere Haltbarkeit und schneller Zugriff.', 'Vorrat');
}

/* ---------- Erinnerungen ---------- */
function setReminder(H, key, title, text, interval, firstInDays, extra) {
  let r = H.reminders.find(x => x.key === key);
  if (!r) { r = { id: uid(), key, title, text, interval, next: addDays(todayISO(), firstInDays), enabled: true, auto: true, lastDone: null }; H.reminders.push(r); }
  if (extra) Object.assign(r, extra);
  return r;
}
function buildReminders(H, S, ctx, calc) {
  if (ctx.bagHours > 0) {
    setReminder(H, 'bagcheck', 'Rucksackkontrolle', 'Inhalt, Gewicht, Kleidergrößen, Batterien und Ablaufdaten prüfen.', 90, 90);
    setReminder(H, 'powerbank', 'Powerbanks laden', 'Powerbanks einmal nachladen – sie entladen sich im Lager.', 30, 30);
    setReminder(H, 'batteries', 'Batterien prüfen', 'Lampen, Radio und Ersatzbatterien testen.', 180, 90);
  }
  if (ctx.homeDays > 0) {
    setReminder(H, 'water', 'Wasservorrat kontrollieren', 'Wasser auf Zustand und Menge prüfen, ggf. austauschen.', 180, 180);
    setReminder(H, 'stockexpiry', 'Vorrat und Ablaufdaten prüfen', 'Verbrauchen, was bald abläuft, und nachkaufen.', 90, 90);
  }
  if (H.people.some(p => (+p.age) < 13)) setReminder(H, 'kids', 'Kinderkleidung aktualisieren', 'Passt die Wechselkleidung noch? Größen und Jahreszeit anpassen.', 180, 120);
  if (H.people.some(p => p.needs && p.needs.meds && p.needs.meds.some(m => m.name))) setReminder(H, 'meds', 'Medikamente prüfen', 'Haltbarkeit, Menge und Medikationsplan prüfen.', 90, 60);
  setReminder(H, 'backup', 'Verschlüsseltes Backup erstellen', 'Einstellungen → Backup erstellen und sicher speichern.', 30, 30);
}

/* ---------- Kontakte / Dokumente ---------- */
function buildContacts(H, S, ctx) {
  const c = COUNTRIES[(ctx.cfg.country) || 'DE'] || COUNTRIES.DE;
  if (!H.contacts.some(x => x.type === 'official')) {
    for (const [num, name, note] of c.numbers) H.contacts.push({ id: uid(), name, type: 'official', phone: num, address: '', email: '', relation: '', notes: note, priority: 1, alt: '' });
  }
}
const DOC_TEMPLATES = [
  ['id', 'Personalausweis / Reisepass', 'person'], ['birth', 'Geburtsurkunde', 'person'], ['insurance', 'Krankenversicherungskarte', 'person'], ['vaccine', 'Impfpass', 'person'],
  ['medplan', 'Medikationsplan / ärztliche Atteste', 'med'], ['living', 'Patientenverfügung / Vorsorgevollmacht', 'adult'], ['policy', 'Versicherungspolicen (Haus, Hausrat, Haftpflicht)', 'house'], ['bank', 'Bankdaten / Kontonummern (ohne PIN)', 'house'],
  ['contract', 'Mietvertrag / Grundbuchauszug', 'house'], ['carpapers', 'Fahrzeugschein / Führerschein', 'car'], ['petdocs', 'Heimtierausweis / Impfpass Tier / Chipnummer', 'pet'], ['photos', 'Aktuelle Fotos der Familie (zur Identifikation)', 'house'],
];
function buildDocList(H, ctx) {
  for (const [key, title, scope] of DOC_TEMPLATES) {
    if (scope === 'car' && !ctx.car) continue; if (scope === 'pet' && !H.pets.length) continue;
    if (scope === 'med' && !H.people.some(p => p.needs && ((p.needs.meds || []).some(m => m.name) || p.needs.devices))) continue;
    if (!H.docs.some(d => d.key === key)) H.docs.push({ id: uid(), key, title, orig: false, copy: false, vault: false, na: false, note: '' });
  }
}

/* ---------- Bedarf nach Bestaetigung: Einkaufsliste ---------- */
function ensureShopEntry(H, item, opts = {}) {
  let s = H.shop.find(x => x.itemId === item.id && !x.bought);
  if (s) return s;
  s = { id: uid(), itemId: item.id, key: item.key, name: item.name, category: item.category, priority: item.prio || 'rec', qty: item.qty, unit: item.unit, estPrice: null, actualPrice: null, store: '', url: '', bought: false, notes: '', reason: item.why || '', created: new Date().toISOString() };
  H.shop.push(s);
  return s;
}
function setItemStatus(H, item, status) {
  item.status = status;
  if (status === 'missing') ensureShopEntry(H, item);
  if (status === 'owned') { const s = H.shop.find(x => x.itemId === item.id && !x.bought); if (s) H.shop.splice(H.shop.indexOf(s), 1); }
  if (status !== 'owned') item.packed = false;
}
function findOwnedDuplicates(H, name, key) {
  return H.items.filter(i => !i.archived && i.status === 'owned' && ((key && i.key === key) || similar(i.name, name) >= 0.75));
}

/* ---------- Beispielhaushalt ---------- */
function createSampleHousehold() {
  const H = newHousehold('Beispielhaushalt (Test)');
  H.sample = true;
  const a1 = { id: uid(), name: 'Erwachsene/r 1', age: 38, needs: emptyNeeds() }, a2 = { id: uid(), name: 'Erwachsene/r 2', age: 36, needs: emptyNeeds() }, k = { id: uid(), name: 'Kind', age: 3, needs: emptyNeeds() };
  H.people = [a1, a2, k].map(personShape);
  H.box = { enabled: true, days: 10 };
  H.cfg = { purpose: 'evac', goals: ['bag72'], strategies: ['shelter'], customScenario: '', hhType: 'family', country: 'DE', region: '', zip: '', housing: { type: 'house', cellar: true, shelterPossible: false, fireplace: false, cookNoPower: true, waterL: 0, foodDays: 0, car: true, fallback: false }, durationHours: 336, includeOptional: false };
  const bag55 = newBag({ name: 'Trekkingrucksack 55 L', type: 'trekking', liters: 55, maker: '', model: '', owner: a1.id, color: 'olive', ownKg: 2.2 });
  const bag40 = newBag({ name: 'Tactical-Rucksack 40 L', type: 'tactical', liters: 40, owner: a2.id, color: 'coyote', ownKg: 1.6 });
  H.bags = [bag55, bag40];
  const own = (key, qty, extra) => { const t = T[key]; H.items.push(makeItem({ key, qty, container: 'home' }, Object.assign({ status: 'owned', source: 'sample', place: 'Keller' }, extra || {}))); void t; };
  H.items.push(Object.assign(makeItem({ key: 'water_stock', qty: 54, container: 'home' }), { status: 'owned', source: 'sample', place: 'Keller', notes: 'Beispiel: 54 Liter Trinkwasser' }));
  own('water_filter', 2, { name: 'Wasserfilter' });
  own('powerbank', 1, { name: 'Powerbank 20.000 mAh' });
  H.items.push(Object.assign(makeItem({ key: 'powerbank', qty: 1, container: 'home' }), { name: 'Powerbank mit Solarladefunktion', status: 'owned', source: 'sample', place: 'Wohnzimmer', tags: ['powerbank', 'solar'] }));
  own('radio', 1, { name: 'Batterieradio' });
  own('flashlight', 1, { name: 'Fenix Taschenlampe' });
  own('headlamp', 2);
  own('stove', 1, { name: 'Esbit-Kocher' });
  own('stove', 1, { name: 'Campingkocher', key: 'stove' });
  own('multitool', 1, { name: 'Bushcraft-Ausrüstung (Messer, Beil, Feuerstahl)', weightG: 900 });
  own('firstaid', 1, { name: 'Erste-Hilfe-Ausrüstung' });
  own('sleeping_bag', 2, { name: 'Schlafsäcke' });
  own('sleeping_mat', 2, { name: 'Isomatten' });
  own('tarp', 2, { name: 'Tarps' });
  own('tent', 2, { name: 'Zelte' });
  H.items.forEach(i => { i.claimed = false; });
  applyPlan(H, defaultSettingsRef());
  H.setup.done = true;
  return H;
}
function defaultSettingsRef() { return (typeof DB !== 'undefined' && DB && DB.settings) ? DB.settings : defaultSettings(); }

/* Einzelne Gegenstaende mit eigenem Kontrollintervall */
function itemRemindNext(i) {
  if (!i || !(+i.remindDays > 0)) return null;
  const base = i.lastCheck || i.purchaseDate || (i.created || '').slice(0, 10) || todayISO();
  return addDays(base, +i.remindDays);
}

/* ---------- Packanleitung: Reihenfolge und Begruendung ---------- */
const QUICK_TAGS = ['firstaid', 'meds', 'rain', 'water_supply', 'water_container', 'docs', 'doc_pouch', 'space_blanket', 'warm_layer'];
const SLOT_RANK = { bottom: 1, main: 2, lid: 5, top: 5, front: 6, front2: 6, sideL: 7, sideR: 7, endL: 7, endR: 7, belt: 8 };
function packReason(it, comp) {
  const slot = comp ? comp.slot : null; const w = it.qty * (it.weightG || 0);
  const quick = (it.tags || []).some(t => QUICK_TAGS.includes(t));
  if (it.lastMinute) return 'Erst bei Abreise';
  if (slot === 'bottom') return 'Leicht, selten gebraucht – nach unten';
  if (slot === 'main' || !slot) return w >= 800 ? 'Schwer – nah an den Rücken, mittlere Höhe' : 'Hauptfach';
  if (slot === 'sideL' || slot === 'sideR' || slot === 'endL' || slot === 'endR') return 'Seitlich – Gewicht links/rechts ausgleichen';
  return quick ? 'Schnellzugriff' : 'Gut erreichbar';
}
function packSteps(H, bag) {
  const items = bagItems(H, bag).filter(i => i.status === 'owned');
  const rank = i => { const c = byId(bag.comps, i.compId); const r = c ? (c.slot ? SLOT_RANK[c.slot] || 4 : 3) : 9; return r; };
  const now = items.filter(i => !i.lastMinute).sort((a, b) => rank(a) - rank(b) || (b.qty * (b.weightG || 0)) - (a.qty * (a.weightG || 0)) || a.name.localeCompare(b.name, 'de'));
  const later = items.filter(i => i.lastMinute).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const mk = i => { const c = byId(bag.comps, i.compId); return { item: i, comp: c || null, reason: packReason(i, c) }; };
  return { steps: now.map(mk), later: later.map(mk), missing: bagItems(H, bag).filter(i => i.status !== 'owned') };
}
function sideBalance(H, S, bag) {
  const st = bagStats(H, S, bag); const l = st.comps.find(c => c.slot === 'sideL' || c.slot === 'endL'), r = st.comps.find(c => c.slot === 'sideR' || c.slot === 'endR');
  if (!l || !r) return null; const d = l.weightG - r.weightG; return Math.abs(d) >= 400 ? { heavier: d > 0 ? l.name : r.name, diffG: Math.abs(d) } : null;
}
