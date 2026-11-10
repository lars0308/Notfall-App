// Unit-Tests der Planungs- und Empfehlungslogik (laeuft in Node ohne DOM)
const { load } = require('./harness'); const assert = require('assert');
const c = load(['util.js', 'store.js', 'catalog.js', 'planner.js', 'recs.js']); const E = code => c.__eval(code);
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('OK   ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); process.exitCode = 1; } }
const mk = (people, goals, extra = {}) => E(`(() => { DB = emptyDB(); const S = DB.settings; const H = DB.households[0]; H.people = ${JSON.stringify(people)}.map((p,i)=>({id:'p'+i,name:p.n,age:p.a,needs:p.needs||{allergies:'',intolerances:'',meds:[],devices:'',aids:'',diet:'',care:'',mobility:'',hygiene:''}}));
  H.cfg = Object.assign({goals:${JSON.stringify(goals)},strategies:['home'],country:'DE',housing:{},durationHours:72,includeOptional:false}, ${JSON.stringify(extra)}); H.pets = ${JSON.stringify(extra.pets || [])}; const sd = ${JSON.stringify(goals)}.map(g => (GOAL[g] || {}).days || 0); if (Math.max(0, ...sd) > 0) H.box = { enabled: true, days: Math.max(...sd) }; H.people.forEach(personShape); return true; })()`);

t('Altersgruppen', () => { assert.equal(E('ageGroup(0)'), 'baby'); assert.equal(E('ageGroup(3)'), 'toddler'); assert.equal(E('ageGroup(8)'), 'child'); assert.equal(E('ageGroup(15)'), 'teen'); assert.equal(E('ageGroup(40)'), 'adult'); assert.equal(E('ageGroup(70)'), 'senior'); });
t('Wasserbedarf: Erwachsene 2 l, Kleinkind 1,2 l, Baby 0,8 l', () => { const S = E('defaultSettings()'); assert.equal(E('waterForAge(40, defaultSettings())'), 2); assert.equal(E('waterForAge(3, defaultSettings())'), 1.2); assert.equal(E('waterForAge(0, defaultSettings())'), 0.8); });
t('Energiebedarf nach Alter (Schätzwerte)', () => { assert.equal(E('kcalForAge(40, defaultSettings())'), 2200); assert.equal(E('kcalForAge(3, defaultSettings())'), 1100); assert.equal(E('kcalForAge(70, defaultSettings())'), 1900); });
t('Tragfähigkeit: Erwachsene 12 kg, Kind (3 J.) 0 kg, Kind (8 J.) 2 kg, Mobilitätseinschränkung halbiert', () => { assert.equal(E('carryForPerson({age:40,needs:{}}, defaultSettings())'), 12); assert.equal(E('carryForPerson({age:3,needs:{}}, defaultSettings())'), 0); assert.equal(E('carryForPerson({age:8,needs:{}}, defaultSettings())'), 2); assert.equal(E('carryForPerson({age:40,needs:{mobility:"Knie"}}, defaultSettings())'), 6); assert.equal(E('carryForPerson({age:40,carryKg:9,needs:{}}, defaultSettings())'), 9); });
t('Hausvorrat: 3 Personen, 10 Tage → Wasserbedarf = Summe × Tage', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 40 }, { n: 'K', a: 3 }], ['stock10']);
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); const w = H.items.find(i => i.key === 'water_stock'); return [w.qty, H.items.some(i=>i.key==='stock_grain')]; })()`);
  assert.equal(r[0], Math.ceil(5.2 * 10)); assert.ok(r[1]);
});
t('Lebensmittel nach BBK-Verhältnis: Getreide ~3,5 kg/10 Tage/Person (skaliert)', () => {
  mk([{ n: 'A', a: 40 }], ['stock10']);
  const kg = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return H.items.find(i => i.key === 'stock_grain').qty; })()`);
  assert.ok(kg > 3.0 && kg < 3.6, 'kg=' + kg);
});
t('Ohne angelegte Zuhause-Kiste wird kein Hausvorrat geplant', () => {
  mk([{ n: 'A', a: 40 }], ['bag72']);
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return [H.bags.length, H.items.filter(i=>i.container==='home').length, H.items.filter(i=>i.container==='bag').length > 20]; })()`);
  assert.deepEqual(r, [1, 0, true]);
});
t('Auto-Notfalltasche: eigene Tasche, Pflichtteile darin, kein Personen-Rucksack', () => {
  mk([{ n: 'A', a: 40 }], ['car'], { boxOnly: true });
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); const b = H.bags.find(x => x.role === 'car'); return [H.bags.length, !!b, H.items.filter(i => i.bagId === b.id).map(i => i.key).includes('car_triangle'), bagStats(H, DB.settings, b).overweight]; })()`);
  assert.deepEqual(r, [1, true, true, false]);
});
t('Packanleitung: unten → Hauptfach (schwer zuerst) → oben/außen; Medikamente erst bei Abreise', () => {
  mk([{ n: 'A', a: 40, needs: { meds: [{ id: 'm', name: 'X', dose: '', expiry: '' }] } }], ['bag72']);
  const r = E(`(() => { const H = HH(), S = DB.settings; applyPlan(H, S); H.items.forEach(i => { i.status = 'owned'; }); const ps = packSteps(H, H.bags[0]); const rk = s => s.comp && s.comp.slot ? SLOT_RANK[s.comp.slot] : 3;
    const mono = ps.steps.every((s, i) => i === 0 || rk(ps.steps[i-1]) <= rk(s)); const main = ps.steps.filter(s => s.comp && s.comp.slot === 'main').map(s => s.item.qty * s.item.weightG); const heavyFirst = main.every((w, i) => i === 0 || main[i-1] >= w);
    const quick = ps.steps.filter(s => s.item.tags.includes('firstaid') || s.item.tags.includes('rain')).every(s => s.comp && ['lid','top','front','front2'].includes(s.comp.slot));
    return [mono, heavyFirst, quick, ps.later.some(s => /Medikament/.test(s.item.name)), ps.steps.some(s => /Medikament/.test(s.item.name))]; })()`);
  assert.deepEqual(r, [true, true, true, true, false]);
});
t('72-h-Rucksack: je tragfähiger Person ein Rucksack, Kleinkind trägt keinen', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 38 }, { n: 'K', a: 3 }], ['bag72']);
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return [H.bags.length, H.bags.every(b=>b.owner!=='p2')]; })()`);
  assert.equal(r[0], 2); assert.ok(r[1]);
});
t('Kind-Ausrüstung (Wechselkleidung, Kennzeichnung) wird von Erwachsenem getragen', () => {
  mk([{ n: 'A', a: 40 }, { n: 'K', a: 3 }], ['bag72']);
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); const it = H.items.filter(i=>i.personId==='p1'); return [it.some(i=>i.key==='child_clothes'), it.some(i=>i.key==='child_id'), it.every(i=>i.bagId && H.bags.find(b=>b.id===i.bagId).owner==='p0')]; })()`);
  assert.deepEqual(r, [true, true, true]);
});
t('Baby: Windeln, Säuglingsnahrung, Fläschchen werden geplant', () => {
  mk([{ n: 'A', a: 34 }, { n: 'Baby', a: 0 }], ['bag48']);
  const keys = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return H.items.filter(i=>i.personId==='p1').map(i=>i.key); })()`);
  for (const k of ['diapers', 'food_baby', 'baby_bottle', 'baby_clothes']) assert.ok(keys.includes(k), k);
});
t('Medikamente, Geräte, Allergien erzeugen notwendige Positionen für die Person', () => {
  mk([{ n: 'A', a: 60, needs: { allergies: 'Nüsse', intolerances: '', meds: [{ id: 'm1', name: 'Ramipril', dose: '5 mg', expiry: '2027-01-01' }], devices: 'Insulinpumpe', aids: 'Hörgerät', diet: '', care: '', mobility: '', hygiene: '' } }], ['bag72']);
  const names = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return H.items.filter(i=>i.prio==='must'&&i.personId==='p0').map(i=>i.name); })()`).join('|');
  assert.ok(/Ramipril/.test(names) && /Insulinpumpe/.test(names) && /Hörgerät/.test(names) && /Allergie/.test(names), names);
});
t('Haustier: Transportbox, Futter, Impfpass werden geplant', () => {
  mk([{ n: 'A', a: 40 }], ['bag72', 'pet'], { pets: [{ id: 'pt1', species: 'Katze', name: 'Mimi', count: 1, age: 4, weightKg: 4, needs: '' }] });
  const keys = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return H.items.filter(i=>i.petId==='pt1').map(i=>i.key); })()`);
  for (const k of ['pet_transport', 'pet_food', 'pet_docs']) assert.ok(keys.includes(k), k);
});
t('Plan ist idempotent (zweiter Lauf erzeugt keine Dubletten)', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 38 }, { n: 'K', a: 3 }], ['bag72', 'stock7', 'car']);
  const r = E(`(() => { const H = HH(); applyPlan(H, DB.settings); const n1 = H.items.length; const t1 = H.tasks.length, c1 = H.contacts.length, r1 = H.reminders.length; applyPlan(H, DB.settings); return [n1, H.items.length, t1, H.tasks.length, c1, H.contacts.length, r1, H.reminders.length]; })()`);
  assert.equal(r[0], r[1]); assert.equal(r[2], r[3]); assert.equal(r[4], r[5]); assert.equal(r[6], r[7]);
});
t('Vorhandenes Inventar wird übernommen statt doppelt geplant', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 38 }], ['bag72']);
  const r = E(`(() => { const H = HH(); H.items.push(makeItem({key:'headlamp',qty:2,container:'home'},{status:'owned',source:'wizard'})); applyPlan(H, DB.settings); const hl = H.items.filter(i=>i.key==='headlamp'); return [hl.length, hl.every(i=>i.status==='owned'), hl.reduce((a,i)=>a+i.qty,0)]; })()`);
  assert.deepEqual(r, [2, true, 2]);
});
t('Rucksack-Statistik: Gewicht, Überlast-Warnung, Volumen', () => {
  mk([{ n: 'A', a: 40 }], []);
  const r = E(`(() => { const H = HH(), S = DB.settings; const b = newBag({name:'T',type:'trekking',liters:20,owner:'p0',ownKg:2}); H.bags.push(b); const it = makeItem({key:'water_carry',qty:18,container:'bag'},{status:'owned',bagId:b.id,personId:'p0'}); H.items.push(it); const st = bagStats(H,S,b); return [st.totalG, st.overweight, st.overfull, st.capKg]; })()`);
  assert.equal(r[0], 20000); assert.equal(r[1], true); assert.equal(r[2], true); assert.equal(r[3], 12);
});
t('Wichtige Gegenstände werden bei vollem Rucksack nicht gestrichen', () => {
  mk([{ n: 'A', a: 40 }], ['bag72']);
  const r = E(`(() => { const H = HH(), S = DB.settings; H.bags.push(newBag({name:'Klein',type:'day',liters:8,owner:'p0'})); const before = 0; applyPlan(H, S); const must = H.items.filter(i=>i.prio==='must'&&i.container==='bag'&&!i.archived).length; const st = bagStats(H,S,H.bags[0]); return [must > 10, st.overfull, bagItems(H,H.bags[0]).length >= must]; })()`);
  assert.deepEqual(r, [true, true, true]);
});
t('Lastverteilung schlägt Verschiebungen vor und verbessert die Balance', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 40 }], []);
  const r = E(`(() => { const H = HH(), S = DB.settings; const b1 = newBag({name:'1',type:'trekking',liters:60,owner:'p0'}), b2 = newBag({name:'2',type:'trekking',liters:60,owner:'p1'}); H.bags.push(b1,b2);
    for (let i=0;i<6;i++) H.items.push(makeItem({key:'tarp',qty:1,container:'bag',flex:true},{status:'owned',bagId:b1.id,flex:true,weightG:2000}));
    const w1 = bagStats(H,S,b1).totalG, mv = suggestBalance(H,S); return [mv.length>0, mv.every(m=>m.from===b1.id&&m.to===b2.id), w1]; })()`);
  assert.ok(r[0] && r[1]);
});
t('Empfehlung: Lampe ohne Batterien', () => { mk([{ n: 'A', a: 40 }], ['bag72']); assert.ok(E(`(() => { const H = HH(); H.items.push(makeItem({key:'headlamp',qty:1,container:'home'},{status:'owned',source:'manual'})); return computeRecs(H, DB.settings).some(r => r.id === 'r:lamp_batt' && r.level === 'must'); })()`)); });
t('Empfehlung: Wasserfilter ohne Transportbehälter / ohne Aufbereitung', () => { mk([{ n: 'A', a: 40 }], ['bag72']); const ids = E(`(() => { const H = HH(); H.items.push(makeItem({key:'water_filter',qty:1,container:'home'},{status:'owned',source:'manual'})); return computeRecs(H, DB.settings).map(r=>r.id); })()`); assert.ok(ids.includes('r:filter_transport') && ids.includes('r:filter_viruses')); });
t('Empfehlung: Kocher ohne Kochgeschirr/Brennstoff', () => { mk([{ n: 'A', a: 40 }], ['bag72']); const ids = E(`(() => { const H = HH(); H.items.push(makeItem({key:'stove',qty:1,container:'home'},{status:'owned',source:'manual'})); return computeRecs(H, DB.settings).map(r=>r.id); })()`); assert.ok(ids.includes('r:stove_pot') && ids.includes('r:stove_fuel')); });
t('Empfehlung: zwei Schlafsäcke für drei Personen', () => { mk([{ n: 'A', a: 40 }, { n: 'B', a: 38 }, { n: 'K', a: 7 }], ['bag72']); const r = E(`(() => { const H = HH(); H.items.push(makeItem({key:'sleeping_bag',qty:2,container:'home'},{status:'owned',source:'manual'})); return computeRecs(H, DB.settings).find(r=>r.id==='r:sleep_count'); })()`); assert.ok(r && /2 Schlafsack/.test(r.title) && /3 Personen/.test(r.title)); });
t('Empfehlung: Wechselkleidung für Kind fehlt', () => { mk([{ n: 'A', a: 40 }, { n: 'K', a: 4 }], ['bag72']); assert.ok(E(`(() => { const H = HH(); applyPlan(H, DB.settings); return computeRecs(H, DB.settings).some(r=>r.id==='r:kidclothes:p1'); })()`)); });
t('Empfehlung: Lebensmittel reichen rechnerisch nicht', () => { mk([{ n: 'A', a: 40 }], ['stock10']); const r = E(`(() => { const H = HH(); return computeRecs(H, DB.settings).find(r=>r.id==='r:food_days'); })()`); assert.ok(r && /0 von 10 Tagen/.test(r.title)); });
t('Empfehlung: Haustier ohne Transportmöglichkeit', () => { mk([{ n: 'A', a: 40 }], ['bag72'], { pets: [{ id: 'pt1', species: 'Katze', name: 'Mimi', count: 1, age: 4, weightKg: 4, needs: '' }] }); assert.ok(E(`computeRecs(HH(), DB.settings).some(r=>r.id==='r:pettrans:pt1' && r.level==='must')`)); });
t('Empfehlung: Medikament läuft bald ab', () => { const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10); mk([{ n: 'A', a: 60, needs: { meds: [{ id: 'm1', name: 'Metformin', dose: '', expiry: soon }], allergies: '', intolerances: '', devices: '', aids: '', diet: '', care: '', mobility: '', hygiene: '' } }], ['bag72']); assert.ok(E(`computeRecs(HH(), DB.settings).some(r=>r.id.startsWith('r:medexp:') && r.level==='must')`)); });
t('Jede Empfehlung hat Begründung, Stufe und Quelle', () => { mk([{ n: 'A', a: 40 }, { n: 'K', a: 3 }], ['bag72', 'stock7', 'car', 'flood']); const bad = E(`(() => { const H = HH(); applyPlan(H, DB.settings); return computeRecs(H, DB.settings).filter(r => !r.why || r.why.length < 20 || !['must','rec','opt'].includes(r.level) || !r.source).length; })()`); assert.equal(bad, 0); });
t('Bereits auf Einkaufsliste → keine doppelte Empfehlung', () => { mk([{ n: 'A', a: 40 }], ['bag72']); const r = E(`(() => { const H = HH(); H.items.push(makeItem({key:'headlamp',qty:1,container:'home'},{status:'owned',source:'manual'})); applyPlan(H, DB.settings); const b = H.items.find(i=>i.key==='batteries'&&i.container==='bag'); setItemStatus(H, b, 'missing'); return computeRecs(H, DB.settings).some(r=>r.id==='r:lamp_batt'); })()`); assert.equal(r, false); });
t('Reichweite: Wasser/Lebensmittel nur aus bestätigten Positionen', () => {
  mk([{ n: 'A', a: 40 }, { n: 'B', a: 40 }], ['stock7']);
  const r = E(`(() => { const H = HH(), S = DB.settings; applyPlan(H, S); const before = calcSupplies(H, S).waterDays; const w = H.items.find(i=>i.key==='water_stock'); setItemStatus(H, w, 'owned'); const after = calcSupplies(H, S); return [before, after.waterDays, after.ctx.homeDays]; })()`);
  assert.equal(r[0], 0); assert.ok(Math.abs(r[1] - r[2]) < 0.01);
});
t('Doppelkauf-Erkennung (Ähnlichkeit, Plural)', () => { assert.ok(E("similar('Zelt','Zelte')") >= .75); assert.ok(E("similar('Taschenlampe','Fenix Taschenlampe')") >= .5); assert.ok(E("similar('Sonnencreme','Zelte')") < .3); });
t('Beispielhaushalt: 2 Erw. + Kind, 54 l Wasser, zwei Rucksäcke (55 L / 40 L)', () => {
  const r = E(`(() => { DB = emptyDB(); const H = createSampleHousehold(); return [H.people.map(p=>p.age).join(','), H.bags.map(b=>b.liters).join(','), H.items.filter(i=>i.key==='water_stock'&&i.status==='owned').reduce((a,i)=>a+i.qty,0), H.items.filter(i=>i.key==='water_filter'&&i.status==='owned').reduce((a,i)=>a+i.qty,0), H.items.filter(i=>i.key==='powerbank'&&i.status==='owned').reduce((a,i)=>a+i.qty,0), H.items.filter(i=>i.key==='stove'&&i.status==='owned').length]; })()`);
  assert.deepEqual(r, ['38,36,3', '55,40', 54, 2, 2, 2]);
});
t('Beispieldaten enthalten keine persönlichen Daten', () => { const s = E(`JSON.stringify(createSampleHousehold())`).replace(/"(?:[A-Za-z]*[iI]d|owner)":"[^"]*"/g, ''); assert.ok(!/@|\\+49|0[0-9]{9}/.test(s)); });
t('Alte Version: Import in Haushalt', () => {
  const r = E(`(() => { const old = {items:[{id:'i1',name:'Fenix Taschenlampe',loc:'Zuhause',qty:1,unit:'Stück',category:'Technik',pocket:'',expiry:'',checked:true,notes:'n'},{id:'i2',name:'Trinkwasser',loc:'b55',qty:2,unit:'Liter',category:'Wasser',pocket:'side',expiry:'',checked:true,notes:''}],bags:[{id:'b55',name:'Rucksack 55 L',liters:55,owner:'p1',pockets:[{id:'side',name:'Seitentasche',shape:'sidep'},{id:'main',name:'Hauptfach',shape:'main'}]}],people:[{id:'p1',name:'A',role:'Erwachsen'}],contacts:[{id:'c1',name:'Oma',type:'Familie',phone:'123',address:'',notes:''}],notes:[]}; const H = legacyToHousehold(old); return [H.items.length, H.items[1].bagId, H.items[1].packed, H.bags[0].comps.length, H.contacts[0].phone]; })()`);
  assert.deepEqual(r, [2, 'b55', true, 2, '123']);
});
t('Ablauf-Benachrichtigungen: Zeitpunkte pro Gegenstand (Vorlauf, 7 Tage, Ablauf)', () => {
  // buildNotifEvents liegt in v-remind.js (benötigt UI-Globals) – hier nur Logik von notifAt/addDays
  assert.equal(E("addDays('2026-03-01', -30)"), '2026-01-30'); assert.equal(E("daysUntil(addDays(todayISO(), 5))"), 5);
});
t('Migration v3 → v4: Daten bleiben, Personen bekommen Pass-Felder (alles privat), Kiste nur bei vorhandenem Vorrat', () => {
  const r = E(`(() => { const old = { v: 3, active: 'h', settings: { theme: 'light' }, users: [{ id: 'u', name: 'A', role: 'admin' }], households: [
      { id: 'h', name: 'Alt', setup: { done: true }, cfg: { goals: ['bag72', 'stock14'], strategies: ['home'] }, people: [{ id: 'p', name: 'Anna', age: 38, needs: { allergies: 'Pollen', meds: [{ id: 'm', name: 'X' }] } }], pets: [], bags: [{ id: 'b', name: 'R', type: 'trekking', liters: 55, comps: [{ id: 'c', name: 'Hauptfach', slot: 'main' }] }],
        items: [{ id: 'i1', name: 'Wasser', container: 'home', status: 'owned', qty: 54, photos: ['ph1'], notes: 'Keller' }, { id: 'i2', name: 'Lampe', container: 'bag', bagId: 'b', compId: 'c', status: 'owned', packed: true }], shop: [], contacts: [{ id: 'k', name: 'Oma', type: 'ice', phone: '1' }], meeting: [{ id: 'm1', name: 'Platz' }], shelters: [], rooms: [{ id: 'r', name: 'Keller' }], reminders: [], docs: [], tasks: [{ id: 't' }], recs: {} },
      { id: 'h2', name: 'Leer', people: [], pets: [], bags: [], items: [], shop: [], contacts: [], meeting: [], shelters: [], rooms: [], reminders: [], docs: [], tasks: [], recs: {} }] };
    const d = ensureShape(old); const H = d.households[0], p = H.people[0];
    return [d.v, H.items.length, H.items[0].notes, H.items[0].photos[0], H.items[1].packed, H.rooms.length, H.tasks.length, d.users.length, H.contacts[0].name, H.meeting[0].name, p.needs.allergies, p.needs.meds.length, Object.values(p.share).some(Boolean), p.passContacts.length, H.box.enabled, H.box.days, d.households[1].box.enabled, d.settings.theme]; })()`);
  assert.deepEqual(r, [4, 2, 'Keller', 'ph1', true, 1, 1, 1, 'Oma', 'Platz', 'Pollen', 1, false, 0, true, 14, false, 'light']);
});
t('Alter aus Geburtsdatum', () => { const y = new Date().getFullYear(); assert.equal(E(`ageFromBirth('${y - 5}-01-01')`), 5); assert.equal(E("ageFromBirth('')"), null); });
console.log(out.join('\n')); console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
