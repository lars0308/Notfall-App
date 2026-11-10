'use strict';
/* ===== Notfall! – Speicher, Datenmodell, Fotos, Backup ===== */

/* --- Schluessel-Wert-Speicher: Android (Keystore-verschluesselt) oder IndexedDB (nur Browser-Test) --- */
const KV = (() => {
  let idb = null;
  const open = () => new Promise((res, rej) => {
    if (idb) return res(idb);
    const r = indexedDB.open('notfall_kv', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => { idb = r.result; res(idb); };
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('kv', mode); const out = fn(t.objectStore('kv')); t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return {
    native: IS_NATIVE,
    async get(k) { if (IS_NATIVE) { const v = NATIVE.storeGet(k); return v === undefined ? null : v; } return tx('readonly', s => s.get(k)).then(v => v ?? null); },
    async put(k, v) { if (IS_NATIVE) { if (!NATIVE.storePut(k, v)) throw new Error('Speichern fehlgeschlagen: ' + k); return; } await tx('readwrite', s => s.put(v, k)); },
    async del(k) { if (IS_NATIVE) { NATIVE.storeDel(k); return; } await tx('readwrite', s => s.delete(k)); },
    async list(prefix = '') { if (IS_NATIVE) return JSON.parse(NATIVE.storeList(prefix) || '[]'); const d = await open(); return new Promise((res, rej) => { const r = d.transaction('kv').objectStore('kv').getAllKeys(); r.onsuccess = () => res(r.result.filter(k => k.startsWith(prefix))); r.onerror = () => rej(r.error); }); },
    async wipe() { if (IS_NATIVE) { NATIVE.storeWipe(); return; } await tx('readwrite', s => s.clear()); },
  };
})();

/* --- Standardwerte --- */
const DB_VERSION = 4;
function defaultSettings() {
  return {
    theme: 'dark', scale: 'm', contrast: 'normal',
    lockMin: 1, secure: false, lockContacts: true, lockMedical: false,
    notif: { on: false, hour: 9, leadDays: 30 },
    plan: { waterPerDay: 2, adultKcal: 2200, reserve: 1, carryKg: 12, budget: 0 },
    backupLastAt: null, backupRemindDays: 30, lastUserId: null, mapUrl: '', mapAttr: '', mapOnline: false,
  };
}
const emptyNeeds = () => ({ allergies: '', intolerances: '', meds: [], devices: '', aids: '', diet: '', care: '', mobility: '', hygiene: '', conditions: '', blood: '', notes: '' });
const SHARE_KEYS = ['photo', 'birth', 'allergies', 'conditions', 'meds', 'aids', 'blood', 'notes', 'organ', 'pickup', 'doctor'];
const CARD_MODS = [['photo', 'Foto der Person', 'f'], ['callnote', 'Hinweis „Im Notfall anrufen“', 'f'], ['contacts', 'Kontakte mit Nummer', 'f'], ['cphotos', 'Fotos der Kontakte', 'f'], ['info', 'Freigegebene Angaben', 'b'], ['qr', 'QR-Code', 'b']];
/* Personenprofil inkl. Notfallpass: alles ist privat, bis es ausdruecklich freigegeben wird */
function personShape(p) {
  p.needs = Object.assign(emptyNeeds(), p.needs || {});
  if (p.birth === undefined) p.birth = '';
  if (p.role === undefined) p.role = '';
  if (p.photo === undefined) p.photo = null;
  p.organ = Object.assign({ status: '', place: '' }, p.organ || {});
  p.share = Object.assign(Object.fromEntries(SHARE_KEYS.map(k => [k, false])), p.share || {});
  p.passContacts = Array.isArray(p.passContacts) ? p.passContacts.slice(0, 3) : [];
  for (const k of ['pickup', 'doctor', 'confirmedBy']) if (p[k] === undefined) p[k] = '';
  for (const k of ['sex', 'weightKg', 'heightCm', 'fitness']) if (p[k] === undefined) p[k] = '';
  if (p.noBag === undefined) p.noBag = false;
  p.custom = Array.isArray(p.custom) ? p.custom : [];
  p.hide = Object.assign({}, p.hide || {});
  p.card = Object.assign({ size: 'card', lang: 'de', twoSided: true }, p.card || {});
  if (!Array.isArray(p.card.mods)) p.card.mods = CARD_MODS.map(([k, , side]) => ({ k, on: true, side }));
  for (const [k, , side] of CARD_MODS) if (!p.card.mods.some(m => m.k === k)) p.card.mods.push({ k, on: true, side });
  return p;
}
function ageFromBirth(iso) { const d = parseISO(iso); if (!d) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return Math.max(0, a); }
function newHousehold(name = 'Mein Haushalt') {
  return {
    id: uid(), name, createdAt: new Date().toISOString(),
    setup: { done: false, skipped: false, step: 0, draft: null },
    cfg: null,
    people: [], pets: [], bags: [], items: [], shop: [], contacts: [], meeting: [], shelters: [], rooms: [],
    reminders: [], docs: [], tasks: [], recs: {}, box: { enabled: false, days: 3 }, alarms: [], alarmResults: [], plan: { strategyNote: '', summary: null, lastBuilt: null }, usage: [], sample: false, budget: 0,
  };
}
function emptyDB() {
  const hh = newHousehold();
  return { v: DB_VERSION, createdAt: new Date().toISOString(), active: hh.id, households: [hh], settings: defaultSettings(), users: [], vaultHint: null };
}
function ensureShape(d) {
  d.v = d.v || 1;
  d.settings = Object.assign(defaultSettings(), d.settings || {});
  d.settings.notif = Object.assign(defaultSettings().notif, d.settings.notif || {});
  d.settings.plan = Object.assign(defaultSettings().plan, d.settings.plan || {});
  d.users = d.users || [];
  d.maps = Array.isArray(d.maps) ? d.maps : [];
  if (!Array.isArray(d.households) || !d.households.length) d.households = [newHousehold()];
  for (const H of d.households) {
    if (H.box === undefined) { const sd = ((H.cfg && H.cfg.goals) || []).map(g => (GOAL[g] || {}).days || 0); H.box = { enabled: (H.items || []).some(i => i.container === 'home' && !i.archived), days: Math.max(3, ...sd) }; }
    const base = newHousehold();
    for (const k of Object.keys(base)) if (H[k] === undefined) H[k] = base[k];
    H.setup = Object.assign({ done: false, skipped: false, step: 0, draft: null }, H.setup || {});
    H.plan = Object.assign({ strategyNote: '', summary: null, lastBuilt: null }, H.plan || {});
    for (const it of H.items) { it.photos = it.photos || []; it.tags = it.tags || []; it.status = it.status || 'owned'; }
    for (const b of H.bags) { b.photos = b.photos || []; b.comps = b.comps || []; }
    for (const p of H.people) personShape(p);
    for (const it of H.items) if (it.lastMinute === undefined) it.lastMinute = false;
  }
  if (!d.households.find(x => x.id === d.active)) d.active = d.households[0].id;
  d.v = DB_VERSION;
  return d;
}

/* --- Datenbank im Speicher --- */
let DB = null;
let _dirty = false, _saving = Promise.resolve(), _saveError = null;
const HH = () => DB.households.find(h => h.id === DB.active) || DB.households[0];

async function loadDB() {
  await KV.get('__probe').catch(() => null);
  let txt = await KV.get('db');
  let d = null;
  if (txt) {
    try { d = JSON.parse(txt); } catch { d = null; }
    if (!d && !KV.native) d = null;
  }
  if (d) {
    // Vor einer Datenmodell-Umstellung den alten Stand unveraendert sichern
    if ((d.v || 1) < DB_VERSION) { try { await KV.put('db_vor_v' + DB_VERSION, txt); } catch { /* Sicherung optional */ } }
    DB = ensureShape(d); return { fresh: false };
  }
  DB = emptyDB();
  return { fresh: true, corrupt: !!txt };
}
function persist() {
  _dirty = true;
  _persistSoon();
  if (typeof onDataChanged === 'function') onDataChanged();
}
const _persistSoon = debounce(() => flushDB(), 350);
function flushDB() {
  if (!DB || !_dirty) return _saving;
  _dirty = false;
  const snapshot = JSON.stringify(DB);
  _saving = _saving.then(() => KV.put('db', snapshot)).then(() => { _saveError = null; }).catch(e => { _saveError = e; _dirty = true; console.error('Speichern fehlgeschlagen', e); toast('Speichern fehlgeschlagen – bitte Speicherplatz prüfen'); });
  return _saving;
}
window.__flush = () => { flushDB(); return true; };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDB(); });
window.addEventListener('pagehide', () => flushDB());

/* --- Fotos (Originale bis 1600 px und Vorschaubilder) --- */
const Photos = {
  cache: new Map(),
  recent: new Map(),
  async add(dataUrl) {
    const id = uid(); this.recent.set(id, Date.now());
    await KV.put('photo_' + id, dataUrl);
    try { await KV.put('thumb_' + id, await this.makeThumb(dataUrl)); } catch { /* Vorschau optional */ }
    this.cache.set('photo_' + id, dataUrl);
    return id;
  },
  makeThumb(dataUrl, side = 256) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, side / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => rej(new Error('Bild defekt')); img.src = dataUrl;
    });
  },
  async get(id, thumb = false) {
    const key = (thumb ? 'thumb_' : 'photo_') + id;
    if (this.cache.has(key)) return this.cache.get(key);
    let v = await KV.get(key);
    if (!v && thumb) v = await KV.get('photo_' + id);
    if (v) { this.cache.set(key, v); if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value); }
    return v;
  },
  async del(id) { this.cache.delete('photo_' + id); this.cache.delete('thumb_' + id); await KV.del('photo_' + id); await KV.del('thumb_' + id); },
};
async function hydratePhotos(root = document) {
  const imgs = $$('img[data-ph]', root);
  await Promise.all(imgs.map(async img => {
    const id = img.dataset.ph; if (!id) return;
    const v = await Photos.get(id, img.dataset.full !== '1');
    if (v && img.isConnected) img.src = v;
  }));
}
/* Nach dem Speichern verwaiste Fotos entfernen */
function referencedPhotoIds() {
  const s = new Set();
  for (const H of DB.households) {
    for (const it of H.items) { (it.photos || []).forEach(p => s.add(p)); (it.receipts || []).forEach(p => s.add(p)); (it.manuals || []).forEach(p => s.add(p)); }
    for (const b of H.bags) (b.photos || []).forEach(p => s.add(p));
    for (const r of H.rooms) (r.photos || []).forEach(p => s.add(p));
    for (const p of H.pets) (p.photos || []).forEach(x => s.add(x));
    for (const p of H.people) if (p.photo) s.add(p.photo);
    for (const c of H.contacts) if (c.photo) s.add(c.photo);
  }
  return s;
}
async function sweepPhotos() {
  const keep = referencedPhotoIds(); const now = Date.now();
  const keys = await KV.list('photo_');
  for (const k of keys) { const id = k.slice(6); if (!keep.has(id) && !(Photos.recent.has(id) && now - Photos.recent.get(id) < 600000)) await Photos.del(id); }
}

/* --- PIN / Nutzer --- */
async function hashPin(pin, salt, iter = 150000) {
  const base = await crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: iter, hash: 'SHA-256' }, base, 256));
  return b64(bits);
}
async function makePin(pin) { const salt = b64(crypto.getRandomValues(new Uint8Array(16))); return { salt, iter: 150000, hash: await hashPin(pin, salt, 150000) }; }
async function checkPin(user, pin) { if (!user || !user.pin) return false; const h = await hashPin(pin, user.pin.salt, user.pin.iter); let diff = h.length ^ user.pin.hash.length; for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ (user.pin.hash.charCodeAt(i) || 0); return diff === 0; }

/* --- Verschluesselte Backups --- */
async function buildBackup(password) {
  await flushDB();
  const keys = await KV.list('');
  const entries = {};
  for (const k of keys) { const v = await KV.get(k); if (v !== null) entries[k] = v; }
  let payload = enc(JSON.stringify({ entries }));
  let gz = false;
  try { const z = await gzip(payload); if (z) { payload = z; gz = true; } } catch { /* ohne Kompression */ }
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iter = 310000;
  const key = await deriveKey(password, salt, iter);
  const e = await aesEnc(key, payload, 'notfall-backup-v1');
  return enc(JSON.stringify({ app: 'notfall', kind: 'backup', v: 1, created: new Date().toISOString(), gz, kdf: { salt: b64(salt), iter }, iv: e.iv, ct: e.ct }));
}
async function readBackup(bytes, password) {
  let o; try { o = JSON.parse(dec(bytes)); } catch { throw new Error('Datei ist kein Notfall!-Backup.'); }
  if (o.app !== 'notfall' || o.kind !== 'backup' || !o.ct) throw new Error('Datei ist kein Notfall!-Backup.');
  const key = await deriveKey(password, unb64(o.kdf.salt), o.kdf.iter);
  let plain; try { plain = await aesDec(key, o, 'notfall-backup-v1'); } catch { throw new Error('Falsches Passwort oder beschädigte Datei.'); }
  if (o.gz) plain = await gunzip(plain);
  const parsed = JSON.parse(dec(plain));
  if (!parsed.entries || typeof parsed.entries.db !== 'string') throw new Error('Backup enthält keine Haushaltsdaten.');
  const d = JSON.parse(parsed.entries.db); if (!d || !Array.isArray(d.households)) throw new Error('Backup-Daten sind unvollständig.');
  return parsed.entries;
}
async function restoreEntries(entries) {
  const oldKeys = await KV.list('');
  const undo = {}; // Rueckgaengig-Information fuer bereits ueberschriebene Schluessel
  try {
    for (const [k, v] of Object.entries(entries)) {
      if (k === 'db') continue;
      undo[k] = await KV.get(k); await KV.put(k, v);
    }
    undo.db = await KV.get('db'); await KV.put('db', entries.db);
  } catch (e) {
    for (const [k, v] of Object.entries(undo)) { try { if (v === null) await KV.del(k); else await KV.put(k, v); } catch { /* best effort */ } }
    throw new Error('Wiederherstellung fehlgeschlagen – bisherige Daten wurden beibehalten. (' + e.message + ')');
  }
  for (const k of oldKeys) if (!(k in entries) && k !== 'db' && !k.startsWith('__')) await KV.del(k);
  Photos.cache.clear();
}

/* --- Import der alten Version (WebView-localStorage) --- */
function readLegacy() {
  try {
    const d = JSON.parse(localStorage.getItem('notfall_data'));
    if (d && Array.isArray(d.items) && Array.isArray(d.bags)) return d;
  } catch { /* nichts */ }
  return null;
}
function legacyToHousehold(old) {
  const H = newHousehold('Importierter Haushalt');
  const slotOf = { front: 'front', main: 'main', lower: 'bottom', sidep: 'sideL' };
  H.people = (old.people || []).map(p => ({ id: p.id || uid(), name: p.name || 'Person', age: /kind/i.test(p.role || '') ? 3 : 35, needs: emptyNeeds() })).map(personShape);
  H.bags = (old.bags || []).map(b => ({
    id: b.id || uid(), name: b.name || 'Rucksack', type: 'trekking', liters: +b.liters || 40, ownKg: 1.5, maxLoadKg: 0, owner: b.owner || null, photos: [], color: 'olive',
    comps: (b.pockets || []).map(p => ({ id: p.id || uid(), name: p.name, slot: slotOf[p.shape] || null, capL: 0 })),
  }));
  const bagIds = new Set(H.bags.map(b => b.id));
  H.items = (old.items || []).map(i => {
    const inBag = bagIds.has(i.loc);
    const bag = inBag ? H.bags.find(b => b.id === i.loc) : null;
    return { id: i.id || uid(), name: i.name, category: i.category || 'Sonstiges', qty: +i.qty || 1, unit: i.unit || 'Stück', status: 'owned', packed: !!(inBag && i.checked), container: inBag ? 'bag' : 'home', bagId: inBag ? i.loc : null, compId: bag && i.pocket ? (bag.comps.find(c => c.id === i.pocket) || {}).id || null : null, place: inBag ? '' : (i.loc || ''), expiry: i.expiry || '', notes: i.notes || '', photos: [], tags: inferTags(i.name), weightG: 0, volL: 0, prio: 'rec', kind: inBag ? 'pack' : 'gear' };
  });
  H.contacts = (old.contacts || []).map(c => ({ id: c.id || uid(), name: c.name, type: c.type === 'ICE' ? 'ice' : 'person', phone: c.phone || '', address: c.address || '', notes: c.notes || '', priority: 3, relation: c.type || '' }));
  H.plan.strategyNote = (old.notes || []).map(n => n.title + ': ' + n.text).join('\n\n');
  H.setup.done = true; H.setup.skipped = true;
  return H;
}
