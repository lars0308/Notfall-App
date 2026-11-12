'use strict';
/* ===== Notfall! – Teilen (Packliste, Einkaufsliste) und Geschäfte für die Einkaufsliste ===== */

/* Wo kauft man was? Reihenfolge = Reihenfolge auf der Einkaufsliste */
const STORES = [
  ['super', 'Supermarkt', 'cart'], ['drug', 'Drogerie / Apotheke', 'pill'], ['outdoor', 'Outdoor- / Sportgeschäft', 'map'],
  ['hardware', 'Baumarkt', 'gear'], ['electro', 'Elektronik', 'bulb'], ['clothes', 'Kleidung / Schuhe', 'bag'],
  ['pet', 'Tierbedarf', 'paw'], ['car', 'Autozubehör', 'car'], ['other', 'Sonstiges', 'box'],
];
const STORE = Object.fromEntries(STORES.map(s => [s[0], s]));
const STORE_BY_CAT = {
  'Lebensmittel': 'super', 'Hygiene': 'drug', 'Medizin': 'drug', 'Kind & Baby': 'drug', 'Kleidung': 'clothes', 'Schlafen': 'outdoor', 'Outdoor': 'outdoor',
  'Kochen & Brennstoff': 'outdoor', 'Werkzeug': 'hardware', 'Licht & Strom': 'hardware', 'Kommunikation': 'electro', 'Schutz & Sicherheit': 'hardware',
  'Dokumente & Geld': 'other', 'Haustier': 'pet', 'Auto': 'car', 'Wasser': 'outdoor', 'Sonstiges': 'other',
};
const STORE_BY_KEY = {
  water_carry: 'super', water_stock: 'super', water_canister: 'hardware', food_snack: 'super', food_ration: 'outdoor', nuts: 'super', electrolyte: 'drug',
  batteries: 'super', akku_aa: 'electro', akku_charger: 'electro', usb_charger: 'electro', powerbank: 'electro', cable_set: 'electro', solar_charger: 'outdoor',
  radio: 'electro', spare_phone: 'electro', pmr_radio: 'electro', coin_cells: 'drug', trash_bags: 'super', zip_bags: 'super', lighter: 'super', candles: 'super',
  candles_home: 'super', toilet_paper: 'super', wet_wipes: 'drug', sunscreen: 'drug', insect_repellent: 'drug', hat_gloves: 'clothes', rain: 'outdoor',
  fleece: 'outdoor', long_underwear: 'outdoor', wool_socks: 'outdoor', neck_gaiter: 'outdoor', sturdy_shoes: 'clothes', compass: 'outdoor', map_paper: 'other',
  whistle: 'outdoor', dry_bag: 'outdoor', space_blanket: 'outdoor', cash: 'other', docs_copies: 'other', doc_pouch: 'outdoor', notepad: 'super',
};
function storeOf(H, s) {
  if (s.store) return { id: 'own:' + s.store, label: s.store, icon: 'cart' };
  const it = s.itemId ? byId(H.items, s.itemId) : null; const key = it ? String(it.key || '').split(':')[0] : '';
  const id = STORE_BY_KEY[key] || STORE_BY_CAT[(it && it.category) || s.category] || 'other';
  return { id, label: STORE[id][1], icon: STORE[id][2] };
}
function groupByStore(H, list) {
  const g = new Map();
  for (const s of list) { const st = storeOf(H, s); if (!g.has(st.id)) g.set(st.id, Object.assign(st, { list: [] })); g.get(st.id).list.push(s); }
  const order = id => { const i = STORES.findIndex(x => x[0] === id); return i < 0 ? -1 : i; };
  return [...g.values()].sort((a, b) => order(a.id) - order(b.id));
}

/* Teilen: Android-Teilen-Menü, sonst Teilen des Browsers, sonst in die Zwischenablage */
async function shareText(title, text) {
  if (NATIVE && NATIVE.shareText) { EXT.until = Date.now() + 120000; NATIVE.shareText(title, text); return; }
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Text kopiert – jetzt z. B. in WhatsApp einfügen'); } catch { toast('Teilen ist hier nicht möglich.'); }
}
/* Medikamente und Hilfsmittel nur allgemein nennen – die Namen sind privat */
const privateName = i => HEALTH_RE.test(i.name) || (i.tags || []).some(t => ['meds', 'device', 'aid', 'care'].includes(t)) ? 'Persönliche Medikamente/Hilfsmittel' : i.name;
function bagShareText(H, bag) {
  const its = bagItems(H, bag); const have = its.filter(i => i.status === 'owned');
  const owner = bag.owner && byId(H.people, bag.owner);
  const lines = [`Packliste: ${bag.name}${owner ? ' (' + owner.name + ')' : ''}`, `${have.length} von ${its.length} vorhanden · Stand ${fmtDate(todayISO())}`, '✅ = da   ⬜ = fehlt', ''];
  for (const c of PICK_CATS.concat(customCats(H))) {
    const ci = its.filter(i => itemCat(i) === c.id); if (!ci.length) continue;
    lines.push(c.label.toUpperCase());
    for (const i of ci.sort((a, b) => (a.status === 'owned') - (b.status === 'owned') || a.name.localeCompare(b.name, 'de'))) lines.push(`${i.status === 'owned' ? '✅' : '⬜'} ${privateName(i)} – ${itemQtyLabel(i)}`);
    lines.push('');
  }
  lines.push('Erstellt mit Notfall!');
  return lines.join('\n');
}
function shopShareText(H) {
  const open = H.shop.filter(s => !s.bought); const lines = ['Einkaufsliste Notfallvorsorge', ''];
  for (const g of groupByStore(H, open)) { lines.push(g.label.toUpperCase()); for (const s of g.list) lines.push(`⬜ ${s.name} – ${fmt(s.qty)} ${s.unit || ''}`.trim()); lines.push(''); }
  lines.push('Erstellt mit Notfall!');
  return lines.join('\n');
}
ACT['bag-share'] = d => { const H = HH(); const b = byId(H.bags, d.id); if (b) shareText('Packliste ' + b.name, bagShareText(H, b)); };
ACT['shop-share'] = () => { const H = HH(); if (!H.shop.some(s => !s.bought)) { toast('Die Einkaufsliste ist leer.'); return; } shareText('Einkaufsliste', shopShareText(H)); };
