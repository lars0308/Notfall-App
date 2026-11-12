'use strict';
/* ===== Notfall! – Katalog: Szenarien, Rucksacktypen, Vorlagen ===== */

const GOALS = [
  { id: 'bag24', label: '24-Stunden-Notfallrucksack', group: 'Rucksack', hours: 24, desc: 'Kurze Evakuierung oder ein Tag außer Haus' },
  { id: 'bag48', label: '48-Stunden-Notfallrucksack', group: 'Rucksack', hours: 48 },
  { id: 'bag72', label: '72-Stunden-Notfallrucksack', group: 'Rucksack', hours: 72, desc: 'Üblicher Richtwert für Notfallgepäck' },
  { id: 'evac', label: 'Evakuierungsrucksack', group: 'Rucksack', hours: 72, desc: 'Griffbereit an der Tür, mit Dokumenten und Medikamenten' },
  { id: 'family', label: 'Familien-Notfallausrüstung', group: 'Rucksack', desc: 'Gemeinsame Ausrüstung für alle Personen' },
  { id: 'stock3', label: 'Hausvorrat für 3 Tage', group: 'Vorrat', days: 3 },
  { id: 'stock7', label: 'Hausvorrat für 7 Tage', group: 'Vorrat', days: 7 },
  { id: 'stock10', label: 'Hausvorrat für 10 Tage', group: 'Vorrat', days: 10, desc: 'Empfehlung des BBK für Privathaushalte' },
  { id: 'stock14', label: 'Hausvorrat für 14 Tage', group: 'Vorrat', days: 14 },
  { id: 'stock30', label: 'Hausvorrat für 30 Tage', group: 'Vorrat', days: 30 },
  { id: 'blackout', label: 'Stromausfall', group: 'Szenario' },
  { id: 'flood', label: 'Hochwasser', group: 'Szenario' },
  { id: 'storm', label: 'Sturm und Unwetter', group: 'Szenario' },
  { id: 'fire', label: 'Brand oder Evakuierung', group: 'Szenario' },
  { id: 'shelter', label: 'Schutzraum zu Hause', group: 'Szenario' },
  { id: 'car', label: 'Notfallausrüstung fürs Auto', group: 'Szenario' },
  { id: 'pet', label: 'Haustier-Notfallvorsorge', group: 'Szenario' },
  { id: 'custom', label: 'Individuelles Szenario', group: 'Szenario' },
];
const GOAL = Object.fromEntries(GOALS.map(g => [g.id, g]));

const STRATEGIES = [
  { id: 'home', label: 'So lange wie möglich zu Hause bleiben', desc: 'Hausvorrat, Wasser, Wärme, Licht und Kommunikation ohne Strom. Verlassen nur bei Anweisung oder unmittelbarer Gefahr.' },
  { id: 'shelter', label: 'Vorübergehend in eine Notunterkunft oder Ausweichunterkunft', desc: 'Packen für Aufenthalt bei Verwandten, Hotel oder behördlicher Notunterkunft. Dokumente, Medikamente, Schlafzeug.' },
  { id: 'mobile', label: 'Eigenständige Versorgung unterwegs (soweit realistisch und sicher)', desc: 'Selbstversorgung zu Fuß oder mit dem Auto für begrenzte Zeit. Mehr Gewicht, Wasseraufbereitung, Wetterschutz.' },
];

const BAG_TYPES = [
  { id: 'trekking', label: 'Trekkingrucksack', model: 'trek', liters: 55, ownKg: 2.2, hip: true, chest: true },
  { id: 'tactical', label: 'Tactical-/MOLLE-Rucksack', model: 'tac', liters: 40, ownKg: 1.6, hip: true, chest: true },
  { id: 'hiking', label: 'Wanderrucksack', model: 'trek', liters: 35, ownKg: 1.3, hip: true, chest: true },
  { id: 'day', label: 'Tagesrucksack', model: 'day', liters: 20, ownKg: .6, hip: false, chest: false },
  { id: 'kids', label: 'Kinderrucksack', model: 'kid', liters: 10, ownKg: .4, hip: false, chest: false },
  { id: 'school', label: 'Schulrucksack', model: 'school', liters: 20, ownKg: .8, hip: false, chest: false },
  { id: 'travel', label: 'Reisetasche', model: 'duffel', liters: 60, ownKg: 1.5, hip: false, chest: false },
  { id: 'suitcase', label: 'Koffer', model: 'case', liters: 70, ownKg: 3.5, hip: false, chest: false },
  { id: 'custom', label: 'Individueller Typ', model: 'trek', liters: 30, ownKg: 1, hip: false, chest: false },
];
const BAG_TYPE = Object.fromEntries(BAG_TYPES.map(b => [b.id, b]));
const BAG_COLORS = { olive: ['Oliv', '#5b6b3c'], black: ['Schwarz', '#2b2f33'], coyote: ['Coyote', '#a58a62'], navy: ['Marine', '#2c4a73'], red: ['Rot', '#b8332f'], grey: ['Grau', '#6b7782'], orange: ['Orange', '#d9741a'] };

/* Standard-Faecher je Modell (Slot = Position am 3D-Modell) */
const MODEL_SLOTS = {
  trek:   [['main', 'Hauptfach', .56], ['lid', 'Deckelfach', .08], ['bottom', 'Bodenfach', .10], ['front', 'Vordertasche', .10], ['sideL', 'Seitentasche links', .08], ['sideR', 'Seitentasche rechts', .08]],
  tac:    [['main', 'Hauptfach', .50], ['front', 'Frontfach unten', .14], ['front2', 'Frontfach oben', .10], ['top', 'Admin-Fach oben', .06], ['sideL', 'Seitentasche links', .10], ['sideR', 'Seitentasche rechts', .10]],
  day:    [['main', 'Hauptfach', .62], ['front', 'Vordertasche', .22], ['sideL', 'Seitentasche links', .08], ['sideR', 'Seitentasche rechts', .08]],
  kid:    [['main', 'Hauptfach', .66], ['front', 'Vordertasche', .24], ['sideL', 'Seitentasche', .10]],
  school: [['main', 'Hauptfach', .62], ['front', 'Vordertasche', .26], ['sideL', 'Seitentasche links', .06], ['sideR', 'Seitentasche rechts', .06]],
  duffel: [['main', 'Hauptfach', .70], ['endL', 'Stirnfach links', .10], ['endR', 'Stirnfach rechts', .10], ['top', 'Deckelfach', .10]],
  case:   [['main', 'Kofferunterteil', .52], ['lid', 'Kofferdeckel', .38], ['front', 'Außentasche', .10]],
};
const SLOT_NAMES = { main: 'Hauptfach', lid: 'Deckel/oben', bottom: 'Unten', front: 'Vorne', front2: 'Vorne oben', top: 'Oben', sideL: 'Links', sideR: 'Rechts', endL: 'Stirn links', endR: 'Stirn rechts', belt: 'Hüftgurt' };
/* Welche Gegenstands-Zone gehoert in welchen Slot (Reihenfolge = Vorrang) */
const ZONE_SLOTS = {
  bottom: ['bottom', 'main', 'lid'], back: ['main', 'bottom'], main: ['main', 'bottom', 'lid'], top: ['lid', 'top', 'front', 'main'],
  front: ['front', 'front2', 'lid', 'top', 'main'], side: ['sideL', 'sideR', 'endL', 'endR', 'main'], belt: ['belt', 'front2', 'front', 'top', 'main'],
  outer: ['front2', 'front', 'main'], home: [],
};

const CATEGORIES = ['Wasser', 'Lebensmittel', 'Medizin', 'Hygiene', 'Kleidung', 'Schlafen', 'Licht & Strom', 'Kommunikation', 'Kochen & Brennstoff', 'Werkzeug', 'Schutz & Sicherheit', 'Dokumente & Geld', 'Kind & Baby', 'Haustier', 'Auto', 'Outdoor', 'Sonstiges'];
const CAT_ICON = { 'Wasser': 'drop', 'Lebensmittel': 'food', 'Medizin': 'pill', 'Hygiene': 'shield', 'Kleidung': 'bag', 'Schlafen': 'home', 'Licht & Strom': 'bulb', 'Kommunikation': 'phone', 'Kochen & Brennstoff': 'flame', 'Werkzeug': 'gear', 'Schutz & Sicherheit': 'shield', 'Dokumente & Geld': 'doc', 'Kind & Baby': 'users', 'Haustier': 'paw', 'Auto': 'car', 'Outdoor': 'map', 'Sonstiges': 'box' };
const CONDITIONS = ['Neu', 'Gut', 'Gebraucht', 'Reparaturbedürftig', 'Ersetzen'];
const PRIO_LABEL = { must: 'Notwendig', rec: 'Empfohlen', opt: 'Optional' };

const COUNTRIES = {
  DE: {
    name: 'Deutschland',
    regions: ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'],
    numbers: [['112', 'Feuerwehr & Rettungsdienst', 'Notruf – bei Lebensgefahr, Brand, medizinischem Notfall'], ['110', 'Polizei', 'Notruf Polizei'], ['116 117', 'Ärztlicher Bereitschaftsdienst', 'Wenn die Praxis geschlossen ist und es kein Notfall ist']],
    warn: [['NINA – Warn-App des Bundes (BBK)', 'https://warnung.bund.de'], ['WarnWetter – Deutscher Wetterdienst', 'https://www.dwd.de'], ['BBK – Hilfe in Notlagen', 'https://www.bbk.bund.de']],
    warnHint: 'Warnungen erreichen dich in Deutschland u. a. per Cell Broadcast (Warnmeldung direkt aufs Handy), Warn-Apps wie NINA, Radio, Fernsehen und Sirenen. Notfall-Benachrichtigungen in den Handy-Einstellungen aktiviert lassen.',
    tox: 'Giftinformationszentrum deiner Region (Nummer hier als Kontakt eintragen)',
  },
  AT: {
    name: 'Österreich',
    regions: ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'],
    numbers: [['112', 'Euro-Notruf', 'Notruf – Feuerwehr, Rettung, Polizei'], ['122', 'Feuerwehr', ''], ['133', 'Polizei', ''], ['144', 'Rettung', ''], ['141', 'Ärztefunkdienst', 'Ärztlicher Bereitschaftsdienst']],
    warn: [['Zivilschutz / Innenministerium', 'https://www.bmi.gv.at']],
    warnHint: 'Behördliche Warnungen erfolgen u. a. per Sirenen, Radio, Fernsehen und Mobilfunk. Notfall-Benachrichtigungen am Handy aktiviert lassen.',
    tox: 'Vergiftungsinformationszentrale (Wien): 01 406 43 43',
  },
  CH: {
    name: 'Schweiz',
    regions: ['Aargau', 'Appenzell A. Rh.', 'Appenzell I. Rh.', 'Basel-Landschaft', 'Basel-Stadt', 'Bern', 'Freiburg', 'Genf', 'Glarus', 'Graubünden', 'Jura', 'Luzern', 'Neuenburg', 'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Tessin', 'Thurgau', 'Uri', 'Waadt', 'Wallis', 'Zug', 'Zürich'],
    numbers: [['112', 'Euro-Notruf', 'Notruf'], ['117', 'Polizei', ''], ['118', 'Feuerwehr', ''], ['144', 'Sanität', 'Rettungsdienst'], ['145', 'Tox Info Suisse', 'Vergiftungen']],
    warn: [['Alertswiss – Bundesamt für Bevölkerungsschutz', 'https://www.alertswiss.ch']],
    warnHint: 'Warnungen und Verhaltensanweisungen kommen u. a. über die Alertswiss-App, Sirenen, Radio und Fernsehen.',
    tox: 'Tox Info Suisse: 145',
  },
  OTHER: {
    name: 'Anderes Land', regions: [],
    numbers: [['112', 'Europäische Notrufnummer', 'In allen EU-Staaten gültig; außerhalb der EU gelten andere Nummern']],
    warn: [], warnHint: 'Informiere dich bei den Behörden deines Landes über Warnsysteme und lokale Notrufnummern.', tox: '',
  },
};

/* ===== Vorlagen ===== */
const T = {};
function def(k, n, c, u, g, l, z, t, w, o) { T[k] = Object.assign({ k, n, c, u, g, l, z, t: t || [], w: w || '' }, o || {}); }
// Wasser
def('water_bottle', 'Trinkflasche 1 L (stabil, lebensmittelecht)', 'Wasser', 'Stück', 150, 1.1, 'side', ['water_container', 'water_transport'], 'Wasser muss sicher getragen werden können.');
def('water_collapsible', 'Faltbarer Wasserbehälter 2–5 L', 'Wasser', 'Stück', 90, .25, 'main', ['water_container', 'water_transport'], 'Leicht, um unterwegs gefiltertes Wasser zu sammeln und zu transportieren.');
def('water_carry', 'Trinkwasser (abgefüllt)', 'Wasser', 'Liter', 1000, 1, 'side', ['water_supply'], 'Wasser ist das Wichtigste. Im Rucksack wird nur eine Grundmenge getragen, der Rest über Aufbereitung.');
def('water_filter', 'Wasserfilter (Hohlfaser, 0,1 µm oder feiner)', 'Wasser', 'Stück', 120, .3, 'front', ['water_filter'], 'Macht Wasser aus Bächen/Regenwasser trinkbarer. Viren entfernen nicht alle Filter – siehe Hinweis zur Aufbereitung.');
def('water_treat', 'Wasseraufbereitungstabletten', 'Wasser', 'Packung', 30, .05, 'belt', ['water_treat'], 'Ergänzt den Filter (z. B. gegen Viren) und dient als Reserve.');
def('water_canister', 'Wasserkanister 10–20 L (lebensmittelecht)', 'Wasser', 'Stück', 900, 0, 'home', ['water_container', 'water_transport'], 'Zum Lagern und Transportieren größerer Wassermengen.');
def('water_stock', 'Trinkwasser (Flaschen/Kanister)', 'Wasser', 'Liter', 1000, 0, 'home', ['water_supply'], 'BBK-Richtwert: ca. 2 Liter pro Person und Tag (Trinken und Zubereiten).');
def('water_service', 'Brauchwasser (WC, Reinigung)', 'Wasser', 'Liter', 1000, 0, 'home', ['service_water'], 'Wenn die Wasserversorgung ausfällt, wird zusätzlich Wasser für Hygiene und WC benötigt.');
// Lebensmittel
def('food_ration', 'Haltbare Verpflegung (Riegel, Trekkingnahrung)', 'Lebensmittel', 'Tagesration', 520, .8, 'main', ['food'], 'Leichte, ohne Kochen essbare Nahrung für den Zeitraum.');
def('food_child', 'Kindgerechte Verpflegung und Snacks', 'Kind & Baby', 'Tagesration', 400, .7, 'main', ['food', 'child_food'], 'Kinder essen anders – vertraute Lebensmittel erleichtern die Situation.');
def('food_baby', 'Säuglingsnahrung (Pre-Milch/Fertignahrung)', 'Kind & Baby', 'Tagesration', 350, .6, 'main', ['food', 'baby_food'], 'Säuglinge sind auf passende Nahrung angewiesen. Bei Stillen: Ersatzplan für Notfälle bedenken.');
def('food_snack', 'Traubenzucker und Müsliriegel', 'Lebensmittel', 'Packung', 150, .3, 'belt', ['food'], 'Schnelle Energie, jederzeit erreichbar.');
def('stock_grain', 'Getreide, Nudeln, Reis, Haferflocken, Knäckebrot', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Energieträger, lange haltbar.', { kcal: 3400, group: 'Getreide' });
def('stock_veg', 'Gemüse- und Hülsenfrüchte-Konserven, Trockenhülsen', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Vitamine und Eiweiß.', { kcal: 500, group: 'Gemüse' });
def('stock_fruit', 'Obst-Konserven, Trockenobst, Nüsse', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Energie und Mikronährstoffe.', { kcal: 1200, group: 'Obst' });
def('stock_dairy', 'H-Milch, Milchpulver, Hartkäse', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Eiweiß und Kalzium.', { kcal: 600, group: 'Milch' });
def('stock_protein', 'Fisch-/Fleischkonserven, Eipulver', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Eiweiß und Fett.', { kcal: 1500, group: 'Fleisch/Fisch' });
def('stock_fat', 'Speiseöl, Fett, Nussmus', 'Lebensmittel', 'kg', 0, 0, 'home', ['food', 'stock_food'], 'Energiedicht.', { kcal: 8000, group: 'Fett' });
def('stock_extras', 'Salz, Zucker, Instantbrühe, Kaffee/Tee, Gewürze', 'Lebensmittel', 'Set', 0, 0, 'home', ['stock_extras'], 'Macht Vorräte schmackhaft und hilft gegen Appetitlosigkeit.');
def('can_opener', 'Dosenöffner (manuell)', 'Kochen & Brennstoff', 'Stück', 80, .1, 'home', ['can_opener'], 'Konserven ohne Strom öffnen.');
// Medizin
def('firstaid', 'Erste-Hilfe-Set (DIN 13167 oder vergleichbar)', 'Medizin', 'Set', 450, 1.2, 'top', ['firstaid'], 'Grundversorgung von Verletzungen.');
def('firstaid_home', 'Hausapotheke mit Verbandmaterial', 'Medizin', 'Set', 1500, 0, 'home', ['firstaid'], 'Vollständige Erst-Versorgung zu Hause.');
def('meds', 'Persönliche Medikamente', 'Medizin', 'Set', 100, .2, 'top', ['meds'], 'Regelmäßig benötigte Medikamente nicht dem Zufall überlassen.');
def('disinfect', 'Wunddesinfektion und Handdesinfektion', 'Medizin', 'Set', 120, .2, 'front', ['disinfect'], 'Infektionen vermeiden, wenn Wasser knapp ist.');
def('gloves_nitrile', 'Einmalhandschuhe (2 Paar)', 'Medizin', 'Set', 20, .05, 'front', ['gloves_med'], 'Eigenschutz bei Erster Hilfe.');
def('mask_ffp2', 'FFP2-Masken (3 Stück)', 'Medizin', 'Set', 30, .1, 'front', ['mask'], 'Schutz vor Staub und Partikeln, z. B. bei Aufräumarbeiten.');
def('thermometer', 'Fieberthermometer', 'Medizin', 'Stück', 30, .05, 'top', ['thermometer'], 'Fieber bei Kindern und Kranken erkennen.');
def('hearing_batt', 'Ersatzbatterien für Hörgerät/Hilfsmittel', 'Medizin', 'Set', 20, .05, 'top', ['battery', 'aid'], 'Hilfsmittel funktionieren nur mit Energie.');
// Hygiene
def('hygiene_kit', 'Hygiene-Set (Zahnbürste, Seife, Tücher)', 'Hygiene', 'Set', 250, 1, 'main', ['hygiene'], 'Hygiene verhindert Krankheiten.');
def('wet_wipes', 'Feuchttücher', 'Hygiene', 'Packung', 150, .4, 'front', ['hygiene'], 'Waschen ohne Wasser.');
def('toilet_paper', 'Toilettenpapier', 'Hygiene', 'Rolle', 120, 1, 'home', ['hygiene', 'toilet_paper'], 'Wird schnell knapp.');
def('trash_bags', 'Müllbeutel (stabil)', 'Hygiene', 'Packung', 60, .3, 'main', ['trash_bags'], 'Abfall und Notdurft hygienisch entsorgen, auch als Regenschutz nutzbar.');
def('emergency_toilet', 'Notfalltoilette (Eimer, Beutel, Streu/Bindemittel)', 'Hygiene', 'Set', 1500, 0, 'home', ['emergency_toilet'], 'Wenn die Spülung nicht funktioniert.');
def('hygiene_special', 'Besondere Hygieneprodukte', 'Hygiene', 'Set', 200, .5, 'main', ['hygiene'], 'Persönlicher Bedarf.');
def('diapers', 'Windeln', 'Kind & Baby', 'Stück', 40, .15, 'main', ['diapers'], 'Pro Tag etwa 6–8 Windeln bei Babys.');
def('baby_wipes', 'Feuchttücher für Babys', 'Kind & Baby', 'Packung', 200, .5, 'front', ['hygiene'], 'Hautschonende Reinigung.');
// Kleidung
def('underwear', 'Wechselunterwäsche und Socken', 'Kleidung', 'Set', 180, .7, 'main', ['clothes'], 'Trockene Wäsche schützt vor Auskühlung und Hautproblemen.');
def('fleece', 'Warme Zwischenschicht (Fleece)', 'Kleidung', 'Stück', 400, 2.5, 'main', ['clothes', 'warm_layer'], 'Wärme bei Kälte.');
def('rain', 'Regenjacke oder Poncho', 'Kleidung', 'Stück', 300, 1.5, 'top', ['clothes', 'rain'], 'Nässe kühlt schnell aus.');
def('hat_gloves', 'Mütze und Handschuhe', 'Kleidung', 'Set', 120, .6, 'front', ['clothes'], 'Wärmeverlust über Kopf und Hände.');
def('child_clothes', 'Wechselkleidung Kind (komplett)', 'Kind & Baby', 'Set', 500, 3, 'main', ['clothes', 'child_clothes'], 'Kinder wachsen schnell und werden schnell nass oder schmutzig. Größe regelmäßig prüfen.');
def('baby_clothes', 'Wechselkleidung Baby (mehrere Sets)', 'Kind & Baby', 'Set', 400, 2.5, 'main', ['clothes', 'child_clothes'], 'Babys brauchen häufiger frische Kleidung.');
def('sturdy_shoes', 'Feste Schuhe (zum Mitnehmen bereitstellen)', 'Kleidung', 'Paar', 0, 0, 'home', ['shoes'], 'Bei Evakuierung muss man gut zu Fuß sein.', { nopack: true });
// Schlafen
def('sleeping_bag', 'Schlafsack (Komfort bis ca. 0 °C)', 'Schlafen', 'Stück', 1300, 8, 'bottom', ['sleeping'], 'Schlafen und Wärme in Notunterkunft oder bei Heizungsausfall.');
def('sleeping_bag_child', 'Kinderschlafsack', 'Schlafen', 'Stück', 800, 5, 'bottom', ['sleeping'], 'Passende Größe hält Kinder warm.');
def('space_blanket', 'Rettungsdecke', 'Schutz & Sicherheit', 'Stück', 60, .2, 'top', ['space_blanket'], 'Sehr leicht und schützt vor Auskühlung.');
def('sleeping_mat', 'Isomatte', 'Schlafen', 'Stück', 500, 4, 'outer', ['mat'], 'Dämmung vom Boden.');
def('blanket_wool', 'Wolldecke', 'Schlafen', 'Stück', 1200, 6, 'home', ['sleeping'], 'Wärme zu Hause bei Heizungsausfall.');
def('tent', 'Zelt', 'Outdoor', 'Stück', 2200, 6, 'outer', ['shelter_gear', 'tent'], 'Nur sinnvoll, wenn Selbstversorgung unterwegs Teil der Strategie ist.');
def('tarp', 'Tarp oder Plane', 'Outdoor', 'Stück', 550, 1.2, 'outer', ['shelter_gear', 'tarp'], 'Leichter Wetterschutz.');
// Licht & Strom
def('headlamp', 'Stirnlampe', 'Licht & Strom', 'Stück', 90, .2, 'top', ['light', 'needs_battery'], 'Hände frei, auch im Dunkeln.');
def('flashlight', 'Taschenlampe', 'Licht & Strom', 'Stück', 150, .2, 'top', ['light', 'needs_battery'], 'Zentrale Lichtquelle.');
def('batteries', 'Ersatzbatterien (AA/AAA)', 'Licht & Strom', 'Set', 100, .1, 'front', ['battery'], 'Lampen und Radios sind ohne Batterien nutzlos.');
def('powerbank', 'Powerbank (≥ 10.000 mAh) mit Kabel', 'Licht & Strom', 'Stück', 250, .3, 'front', ['powerbank'], 'Handy bleibt Kommunikationsmittel und Lichtquelle.');
def('cable_set', 'Ladekabel und Adapter', 'Licht & Strom', 'Set', 100, .2, 'front', ['cable'], 'Ohne passendes Kabel hilft die Powerbank nicht.');
def('lantern', 'LED-Laterne', 'Licht & Strom', 'Stück', 200, .5, 'home', ['light', 'lantern'], 'Raumlicht bei Stromausfall ohne Brandgefahr durch offene Flamme.');
def('candles', 'Kerzen mit sicherem Halter', 'Licht & Strom', 'Stück', 50, .1, 'home', ['candles'], 'Zusätzliches Licht – nur beaufsichtigt und feuersicher verwenden.');
def('solar_charger', 'Solar-Ladegerät', 'Licht & Strom', 'Stück', 300, .6, 'outer', ['solar'], 'Energie ohne Netz, wetterabhängig.');
// Kommunikation
def('radio', 'Batterie-/Kurbelradio (UKW/DAB+)', 'Kommunikation', 'Stück', 300, .8, 'top', ['radio', 'needs_battery'], 'Bei Ausfall von Mobilfunk und Internet kommen Behördeninfos über das Radio.');
def('whistle', 'Signalpfeife', 'Kommunikation', 'Stück', 15, .02, 'belt', ['whistle'], 'Auf sich aufmerksam machen.');
def('contacts_paper', 'Notfallkontakte auf Papier', 'Dokumente & Geld', 'Blatt', 10, .02, 'front', ['contacts_paper'], 'Handy kann leer oder defekt sein.');
// Kochen
def('stove', 'Kocher (Gas, Esbit oder Spiritus)', 'Kochen & Brennstoff', 'Stück', 300, 1, 'main', ['stove'], 'Warme Mahlzeiten und Wasser abkochen. Nur im Freien oder gut belüfteten Bereich nutzen.');
def('fuel', 'Brennstoff passend zum Kocher', 'Kochen & Brennstoff', 'Set', 300, .6, 'main', ['fuel'], 'Kocher ohne Brennstoff ist nutzlos. Sicher und nach Vorschrift lagern.');
def('cookware', 'Kochgeschirr (Topf, Becher, Löffel)', 'Kochen & Brennstoff', 'Set', 350, 1.2, 'main', ['cookware'], 'Zum Kochen und Essen.');
def('lighter', 'Feuerzeug und wasserdichte Streichhölzer', 'Kochen & Brennstoff', 'Set', 40, .05, 'front', ['fire_starter'], 'Zum Zünden des Kochers.');
def('stove_home', 'Stromunabhängiger Kocher (Camping-Gaskocher)', 'Kochen & Brennstoff', 'Stück', 1500, 0, 'home', ['stove'], 'Kochen bei Stromausfall. Nur in gut belüfteten Räumen oder im Freien.');
def('fuel_home', 'Gaskartuschen/Brennstoff für den Kocher', 'Kochen & Brennstoff', 'Stück', 400, 0, 'home', ['fuel'], 'Brennstoffe sicher und vorschriftsgemäß lagern.');
// Werkzeug
def('multitool', 'Multitool oder Messer mit Scheide', 'Werkzeug', 'Stück', 200, .2, 'top', ['tool'], 'Vielseitiges Werkzeug.');
def('work_gloves', 'Arbeitshandschuhe', 'Werkzeug', 'Paar', 150, .5, 'front', ['gloves_work'], 'Schutz bei Aufräumarbeiten.');
def('cordage', 'Paracord (15 m) und Klebeband', 'Werkzeug', 'Set', 200, .4, 'main', ['cord'], 'Reparaturen, Aufhängen von Planen.');
def('notepad', 'Notizblock und Stift', 'Werkzeug', 'Set', 60, .1, 'front', ['notes'], 'Informationen aufschreiben, wenn der Akku leer ist.');
def('ear_plugs', 'Ohrstöpsel und Schlafmaske', 'Schlafen', 'Set', 30, .1, 'belt', ['comfort'], 'Erholsamer Schlaf in lauten Notunterkünften.');
// Schutz
def('smoke_detector', 'Rauchmelder (geprüft)', 'Schutz & Sicherheit', 'Stück', 150, 0, 'home', ['smoke_detector'], 'Frühwarnung bei Brand. In Deutschland in Wohnungen gesetzlich vorgeschrieben.');
def('co_detector', 'CO-Melder', 'Schutz & Sicherheit', 'Stück', 150, 0, 'home', ['co_detector'], 'Kohlenmonoxid ist geruchlos. Wichtig bei Kamin, Gasgeräten oder Notstromaggregat.');
def('extinguisher', 'Feuerlöscher oder Löschdecke', 'Schutz & Sicherheit', 'Stück', 1500, 0, 'home', ['extinguisher'], 'Entstehungsbrände bekämpfen.');
def('dry_bag', 'Wasserdichter Packsack', 'Schutz & Sicherheit', 'Stück', 100, .2, 'main', ['dry_bag'], 'Schutz von Kleidung und Elektronik bei Nässe/Hochwasser.');
def('rain_boots', 'Gummistiefel', 'Kleidung', 'Paar', 0, 0, 'home', ['boots'], 'Bei Hochwasser oder Aufräumarbeiten.', { nopack: true });
// Dokumente
def('doc_pouch', 'Wasserdichte Dokumentenhülle', 'Dokumente & Geld', 'Stück', 80, .3, 'front', ['doc_pouch'], 'Schützt Ausweise und Unterlagen.');
def('docs_copies', 'Kopien wichtiger Dokumente / verschlüsselter USB-Stick', 'Dokumente & Geld', 'Set', 30, .05, 'front', ['docs'], 'Ersatz bei Verlust der Originale.');
def('cash', 'Bargeld (kleine Scheine und Münzen)', 'Dokumente & Geld', 'Euro', .1, 0, 'front', ['cash'], 'Bei Ausfall von Strom und Zahlungssystemen wird Bargeld gebraucht.');
// Kind
def('child_id', 'Kontaktkärtchen/Armband für das Kind (Name, Telefon)', 'Kind & Baby', 'Stück', 10, .01, 'front', ['child_id'], 'Kinder können im Chaos verloren gehen.');
def('toy', 'Kuscheltier oder Beschäftigung (Malblock, Spiel)', 'Kind & Baby', 'Set', 300, 1, 'main', ['toy'], 'Beruhigt und lenkt ab.');
def('baby_bottle', 'Babyfläschchen mit Sauger', 'Kind & Baby', 'Stück', 150, .4, 'main', ['baby_bottle'], 'Zum Füttern.');
def('baby_carrier', 'Tragehilfe oder Tragetuch', 'Kind & Baby', 'Stück', 400, 1.5, 'outer', ['carrier'], 'Kleine Kinder müssen unter Umständen lange getragen werden.');
// Haustier
def('pet_food', 'Tierfutter', 'Haustier', 'Tagesration', 400, .6, 'main', ['pet_food'], 'Mindestens für den Zeitraum plus Reserve.');
def('pet_water', 'Wasser für das Tier', 'Haustier', 'Liter', 1000, 1, 'back', ['pet_water'], 'Tiere brauchen ebenfalls Wasser.');
def('pet_transport', 'Transportbox oder Tragetasche', 'Haustier', 'Stück', 1500, 0, 'home', ['pet_transport'], 'Viele Notunterkünfte nehmen Tiere nur gesichert im Transportbehälter auf.');
def('pet_leash', 'Leine, Geschirr/Halsband mit Kontaktdaten', 'Haustier', 'Set', 200, .4, 'front', ['pet_leash'], 'Tier sicher führen und im Verlustfall identifizieren.');
def('pet_bowl', 'Faltbarer Napf', 'Haustier', 'Stück', 60, .2, 'front', ['pet_bowl'], 'Fressen und Trinken unterwegs.');
def('pet_docs', 'Impfpass/Heimtierausweis (Kopie), Chipnummer', 'Haustier', 'Set', 30, .05, 'front', ['pet_docs'], 'Wird bei Unterbringung oft verlangt.');
def('pet_meds', 'Tiermedikamente', 'Haustier', 'Set', 100, .2, 'top', ['pet_meds'], 'Für den Zeitraum plus Reserve.');
def('pet_hygiene', 'Kotbeutel bzw. Katzenstreu', 'Haustier', 'Set', 300, 1, 'main', ['pet_hygiene'], 'Hygiene in Unterkünften.');
def('pet_comfort', 'Decke oder vertrautes Spielzeug', 'Haustier', 'Set', 200, 1, 'main', ['pet_comfort'], 'Stressabbau.');
// Auto
def('car_triangle', 'Warndreieck', 'Auto', 'Stück', 600, 0, 'car', ['car_triangle'], 'In Deutschland Pflichtausrüstung.');
def('car_vest', 'Warnweste (je Insasse)', 'Auto', 'Stück', 100, 0, 'car', ['car_vest'], 'In Deutschland Pflicht (mind. eine im Fahrzeug).');
def('car_firstaid', 'Verbandkasten (DIN 13164)', 'Auto', 'Stück', 600, 0, 'car', ['car_firstaid', 'firstaid'], 'Pflichtausrüstung.');
def('car_blanket', 'Decke und Rettungsdecke', 'Auto', 'Set', 800, 0, 'car', ['car_blanket'], 'Falls das Fahrzeug festsitzt.');
def('car_jumper', 'Starthilfekabel', 'Auto', 'Stück', 700, 0, 'car', ['car_jumper'], 'Batterie leer.');
def('car_flash', 'Taschenlampe im Auto', 'Auto', 'Stück', 150, 0, 'car', ['light', 'needs_battery'], 'Pannenhilfe im Dunkeln.');
def('car_water', 'Wasser und Snacks im Auto', 'Auto', 'Set', 1500, 0, 'car', ['car_water'], 'Wenn ein Stau oder eine Sperrung länger dauert. Hitzeempfindlich – regelmäßig tauschen.');
def('car_scraper', 'Eiskratzer und Handfeger', 'Auto', 'Set', 200, 0, 'car', ['car_scraper'], 'Winter.');
def('car_charger', 'Kfz-Ladekabel für das Handy', 'Auto', 'Stück', 80, 0, 'car', ['car_charger'], 'Handy unterwegs laden.');
def('car_towrope', 'Abschleppseil', 'Auto', 'Stück', 600, 0, 'car', ['car_towrope'], 'Hilfe bei Panne.');
def('car_map', 'Straßenkarte (Papier)', 'Auto', 'Stück', 150, 0, 'car', ['car_map'], 'Navigation ohne Netz.');

/* Schluesselwoerter -> Tags, damit auch selbst angelegte Gegenstaende in Regeln erkannt werden */
/* Standard-Sachen: alles bis hier. Die Extras darunter erscheinen nur bei der Suche. */
const BASE_KEYS = new Set(Object.keys(T));
// Weitere Auswahl fuer die Kategorien (werden nicht automatisch geplant, nur angeboten)
def('akku_aa', 'Wiederaufladbare Akkus (AA/AAA)', 'Licht & Strom', 'Set', 100, .1, 'front', ['battery'], 'Lassen sich mit Powerbank oder Solarpanel wieder laden.');
def('akku_charger', 'Akku-Ladegerät (USB)', 'Licht & Strom', 'Stück', 120, .2, 'main', ['charger'], 'Lädt AA/AAA-Akkus über USB, auch an der Powerbank.');
def('usb_charger', 'USB-Netzteil (Steckerladegerät)', 'Licht & Strom', 'Stück', 80, .1, 'front', ['charger'], 'Zum Laden, wo es Strom gibt (Notunterkunft, Verwandte).');
def('crank_light', 'Kurbel- oder Dynamo-Taschenlampe', 'Licht & Strom', 'Stück', 200, .3, 'top', ['light'], 'Funktioniert ganz ohne Batterien.');
def('coin_cells', 'Knopfzellen (z. B. CR2032)', 'Licht & Strom', 'Set', 10, .01, 'front', ['battery'], 'Für Fieberthermometer, Autoschlüssel und kleine Geräte.');
def('power_strip', 'Mehrfachsteckdose (klein)', 'Licht & Strom', 'Stück', 200, .3, 'main', [], 'In Notunterkünften gibt es meist wenige Steckdosen.');
def('spare_phone', 'Ersatzhandy mit Ladekabel', 'Kommunikation', 'Stück', 180, .2, 'top', ['phone'], 'Falls das eigene Handy verloren geht oder kaputt ist.');
def('pmr_radio', 'PMR-Funkgeräte (Paar)', 'Kommunikation', 'Set', 400, .6, 'top', [], 'Verständigung in der Gruppe ohne Mobilfunk, auf kurze Entfernung.');
def('duct_tape', 'Panzertape (Gewebeband)', 'Werkzeug', 'Rolle', 150, .3, 'main', [], 'Repariert fast alles provisorisch.');
def('zip_ties', 'Kabelbinder', 'Werkzeug', 'Packung', 40, .05, 'front', [], 'Befestigen und reparieren.');
def('folding_saw', 'Klappsäge', 'Werkzeug', 'Stück', 250, .4, 'outer', [], 'Holz für Feuer oder Unterstand zuschneiden.');
def('shovel', 'Klappspaten', 'Werkzeug', 'Stück', 700, 1, 'outer', [], 'Graben, Schnee räumen.');
def('sewing_kit', 'Nähset', 'Werkzeug', 'Set', 40, .05, 'front', [], 'Kleidung und Ausrüstung flicken.');
def('carabiner', 'Karabiner (2 Stück)', 'Werkzeug', 'Set', 60, .05, 'belt', [], 'Ausrüstung außen am Rucksack befestigen.');
def('screwdriver', 'Kleines Schraubendreher-Set', 'Werkzeug', 'Set', 120, .1, 'main', ['tool'], 'Batteriefächer und Geräte öffnen.');
def('ferro_rod', 'Feuerstahl (Feuerstarter)', 'Kochen & Brennstoff', 'Stück', 60, .05, 'front', ['fire_starter'], 'Zündet auch nass – Reserve zum Feuerzeug.');
def('storm_matches', 'Sturmstreichhölzer', 'Kochen & Brennstoff', 'Packung', 50, .1, 'front', ['fire_starter'], 'Brennen auch bei Wind und Regen.');
def('tinder', 'Anzündwürfel / Zunder', 'Kochen & Brennstoff', 'Packung', 100, .2, 'main', ['fire_starter'], 'Feuer schnell in Gang bringen.');
def('cutlery', 'Besteck / Göffel', 'Kochen & Brennstoff', 'Stück', 30, .05, 'main', [], 'Zum Essen unterwegs.');
def('long_underwear', 'Lange Funktionsunterwäsche', 'Kleidung', 'Set', 250, .8, 'main', ['clothes'], 'Hält warm, wenn die Heizung oder Unterkunft kalt ist.');
def('spare_pants', 'Ersatzhose (schnell trocknend)', 'Kleidung', 'Stück', 400, 1.2, 'main', ['clothes'], 'Für nasse oder verschmutzte Kleidung.');
def('wool_socks', 'Warme Wollsocken', 'Kleidung', 'Paar', 100, .3, 'main', ['clothes'], 'Warme, trockene Füße.');
def('neck_gaiter', 'Schlauchschal / Halstuch', 'Kleidung', 'Stück', 50, .1, 'front', ['clothes'], 'Gegen Kälte, Staub und Sonne.');
def('sun_hat', 'Sonnenhut oder Kappe', 'Kleidung', 'Stück', 80, .3, 'top', ['clothes'], 'Schutz vor Sonne und Regen.');
def('painkiller', 'Schmerz- und Fiebermittel', 'Medizin', 'Packung', 30, .05, 'top', [], 'Gegen Schmerzen und Fieber.');
def('plasters', 'Pflaster und Blasenpflaster', 'Medizin', 'Set', 40, .1, 'front', [], 'Kleine Wunden und Blasen beim Laufen.');
def('diarrhea', 'Mittel gegen Durchfall und Elektrolyte', 'Medizin', 'Set', 40, .1, 'top', [], 'Bei verdorbenem Essen oder Wasser.');
def('tick_tweezers', 'Zeckenzange und Pinzette', 'Medizin', 'Set', 20, .02, 'front', [], 'Zecken und Splitter entfernen.');
def('sunscreen', 'Sonnencreme', 'Medizin', 'Stück', 120, .15, 'front', [], 'Sonnenbrand vermeiden.');
def('insect_repellent', 'Insektenschutz', 'Medizin', 'Stück', 100, .15, 'front', [], 'Gegen Mücken und Zecken.');
def('spare_glasses', 'Ersatzbrille / Kontaktlinsen', 'Medizin', 'Stück', 60, .15, 'top', [], 'Ohne Sehhilfe wird alles schwer.');
def('nuts', 'Nüsse und Trockenobst', 'Lebensmittel', 'Packung', 300, .5, 'main', ['food'], 'Viel Energie bei wenig Gewicht.');
def('electrolyte', 'Elektrolyt-Pulver / Brausetabletten', 'Wasser', 'Packung', 50, .05, 'front', [], 'Gleicht Salze aus, wenn man viel schwitzt.');
def('towel', 'Mikrofaser-Handtuch', 'Hygiene', 'Stück', 150, .5, 'main', [], 'Leicht und trocknet schnell.');
def('zip_bags', 'Gefrierbeutel (wasserdicht verpacken)', 'Hygiene', 'Packung', 50, .1, 'main', [], 'Dokumente, Handy und Kleinteile trocken halten.');
def('compass', 'Kompass', 'Outdoor', 'Stück', 50, .05, 'belt', [], 'Orientierung ohne Handy.');
def('map_paper', 'Landkarte der Region (Papier)', 'Outdoor', 'Stück', 100, .1, 'top', [], 'Wege und Treffpunkte finden, auch ohne Handy.');
def('spare_keys', 'Ersatzschlüssel (Wohnung, Auto)', 'Dokumente & Geld', 'Set', 50, .02, 'front', [], 'Falls die Schlüssel in der Eile liegen bleiben.');

/* „Passt dazu“: was man zu einer Sache meistens auch braucht */
const COMPANIONS = {
  flashlight: ['batteries'], headlamp: ['batteries'], radio: ['batteries'], crank_light: [], lantern: ['batteries'], car_flash: ['batteries'],
  powerbank: ['cable_set'], usb_charger: ['cable_set'], solar_charger: ['cable_set', 'powerbank'], akku_aa: ['akku_charger'], akku_charger: ['akku_aa'], spare_phone: ['cable_set'],
  stove: ['fuel', 'lighter', 'cookware'], cookware: ['cutlery'], lighter: ['tinder'], ferro_rod: ['tinder'], fuel: ['stove'],
  water_filter: ['water_collapsible', 'water_treat'], water_bottle: ['water_treat'], water_collapsible: ['water_filter'],
  sleeping_bag: ['sleeping_mat'], sleeping_mat: ['sleeping_bag'], tent: ['sleeping_mat'], tarp: ['cordage'],
  firstaid: ['disinfect', 'plasters'], painkiller: ['firstaid'], meds: ['firstaid'],
  hygiene_kit: ['towel', 'wet_wipes'], cash: ['doc_pouch'], docs_copies: ['doc_pouch', 'zip_bags'],
  multitool: ['duct_tape'], cordage: ['carabiner'], rain: ['dry_bag'], diapers: ['baby_wipes'], pet_food: ['pet_bowl', 'pet_water'],
};

/* Kategorien beim Packen – in dieser Reihenfolge */
const PICK_CATS = [
  { id: 'general', label: 'Allgemein', icon: 'box', cats: ['Sonstiges', 'Outdoor', 'Schutz & Sicherheit'] },
  { id: 'meds', label: 'Medikamente & Erste Hilfe', short: 'Medizin', icon: 'pill', cats: ['Medizin'] },
  { id: 'clothes', label: 'Kleidung', icon: 'bag', cats: ['Kleidung'] },
  { id: 'tools', label: 'Werkzeug', icon: 'gear', cats: ['Werkzeug'] },
  { id: 'fire', label: 'Feuer & Kochen', icon: 'flame', cats: ['Kochen & Brennstoff'] },
  { id: 'water', label: 'Wasser', icon: 'drop', cats: ['Wasser'] },
  { id: 'food', label: 'Nahrung', icon: 'food', cats: ['Lebensmittel'] },
  { id: 'tech', label: 'Technik, Akkus & Licht', short: 'Technik & Licht', icon: 'bulb', cats: ['Licht & Strom', 'Kommunikation'] },
  { id: 'hygiene', label: 'Hygiene', icon: 'shield', cats: ['Hygiene'] },
  { id: 'sleep', label: 'Schlafen', icon: 'home', cats: ['Schlafen'] },
  { id: 'docs', label: 'Dokumente & Geld', short: 'Papiere & Geld', icon: 'doc', cats: ['Dokumente & Geld'] },
  { id: 'kids', label: 'Kind & Baby', icon: 'users', cats: ['Kind & Baby'] },
  { id: 'pets', label: 'Haustier', icon: 'paw', cats: ['Haustier'] },
  { id: 'car', label: 'Auto', icon: 'car', cats: ['Auto'] },
];
const PICK_CAT = Object.fromEntries(PICK_CATS.map(c => [c.id, c]));
function pickCatOf(category) { return (PICK_CATS.find(c => c.cats.includes(category)) || PICK_CATS[0]).id; }

const TAG_RULES = [
  [/stirnlampe|kopflampe|headlamp/i, ['light', 'needs_battery', 'headlamp']], [/taschenlampe|fenix|maglite|lampe|leuchte|laterne/i, ['light', 'needs_battery']],
  [/batterie|akku(?!.*power)|knopfzelle/i, ['battery']], [/power ?bank|powerbank|solar.*lade|zusatzakku/i, ['powerbank']], [/ladekabel|usb[- ]?kabel|kabel/i, ['cable']],
  [/radio/i, ['radio', 'needs_battery']], [/filter/i, ['water_filter']], [/tabletten.*wasser|wasser.*tabletten|micropur|aquatabs/i, ['water_treat']],
  [/flasche|trinkblase|kanister|wasserbeh|wassersack|feldflasche/i, ['water_container', 'water_transport']], [/trinkwasser|mineralwasser|wasser\b/i, ['water_supply']],
  [/kocher|esbit|trangia|gaskocher|spirituskocher/i, ['stove']], [/gaskartusche|brennpaste|esbit-tab|spiritus|brennstoff|brennholz/i, ['fuel']],
  [/topf|kochgeschirr|becher|pfanne|kochset/i, ['cookware']], [/feuerzeug|streichh/i, ['fire_starter']],
  [/schlafsack/i, ['sleeping']], [/isomatte|isomat|luftmatratze/i, ['mat']], [/zelt/i, ['shelter_gear', 'tent']], [/tarp|plane\b/i, ['shelter_gear', 'tarp']],
  [/erste.?hilfe|verbandkasten|apotheke/i, ['firstaid']], [/medikament|tablette|insulin/i, ['meds']],
  [/rauchmelder/i, ['smoke_detector']], [/co[- ]?melder|kohlenmonoxid/i, ['co_detector']], [/feuerl.scher|l.schdecke/i, ['extinguisher']],
  [/konserve|reis\b|nudel|haferflocken|trekking.*nahrung|riegel|lebensmittel|verpflegung|mehl|zwieback|knäckebrot/i, ['food']],
  [/rettungsdecke/i, ['space_blanket']], [/messer|multitool|leatherman/i, ['tool']], [/pfeife/i, ['whistle']], [/dosen.?öffner|dosenoeffner/i, ['can_opener']],
  [/bargeld|geld/i, ['cash']], [/dokument|ausweis|kopie/i, ['docs']], [/windel/i, ['diapers']], [/kleidung|unterw.sche|socken|jacke|poncho/i, ['clothes']],
  [/transportbox|tragetasche/i, ['pet_transport']], [/tierfutter|hundefutter|katzenfutter/i, ['pet_food']],
];
function inferTags(name) {
  const s = new Set();
  for (const [re, tags] of TAG_RULES) if (re.test(name || '')) tags.forEach(t => s.add(t));
  return Array.from(s);
}

/* Ernaehrungs-/Wasserbedarf nach Alter */
function ageGroup(age) {
  if (age === null || age === undefined || age === '') return 'adult';
  age = +age;
  if (age < 1) return 'baby'; if (age < 4) return 'toddler'; if (age < 13) return 'child'; if (age < 18) return 'teen'; if (age >= 65) return 'senior'; return 'adult';
}
const AGE_LABEL = { baby: 'Baby', toddler: 'Kleinkind', child: 'Kind', teen: 'Jugendliche/r', adult: 'Erwachsene/r', senior: 'Senior/in' };

/* Quellenhinweise */
const SOURCES = [
  ['BBK – Bundesamt für Bevölkerungsschutz und Katastrophenhilfe: Ratgeber für Notfallvorsorge und richtiges Handeln in Notsituationen', 'https://www.bbk.bund.de'],
  ['BBK – Checkliste Notfallgepäck und Vorratsempfehlung (10 Tage, ca. 2 l Flüssigkeit pro Person und Tag)', 'https://www.bbk.bund.de'],
  ['NINA – Warn-App des Bundes', 'https://warnung.bund.de'],
  ['Deutscher Wetterdienst – Unwetterwarnungen', 'https://www.dwd.de'],
];
