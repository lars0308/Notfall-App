'use strict';
/* ===== Notfall! – Hilfsfunktionen ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* --- sicheres HTML: Interpolationen werden automatisch escaped --- */
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Safe(String(s ?? ''));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) out += hv(vals[i]);
  });
  return new Safe(out);
}
function hv(v) {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(hv).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
}

/* --- Zeit --- */
const pad2 = n => String(n).padStart(2, '0');
function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
const todayISO = () => isoDate(new Date());
function parseISO(s) { if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
function addDays(iso, n) { const d = parseISO(iso) || new Date(); d.setDate(d.getDate() + n); return isoDate(d); }
function daysUntil(iso) { const d = parseISO(iso); if (!d) return null; const t = parseISO(todayISO()); return Math.round((d - t) / 86400000); }
function fmtDate(iso) { const d = parseISO(iso); return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'; }
function relDays(iso) {
  const n = daysUntil(iso); if (n === null) return '';
  if (n === 0) return 'heute'; if (n === 1) return 'morgen'; if (n === -1) return 'gestern';
  return n > 0 ? 'in ' + n + ' Tagen' : 'seit ' + (-n) + ' Tagen überfällig';
}

/* --- Zahlen --- */
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const fmt = n => nf1.format(Number(n) || 0);
const fmt0 = n => nf0.format(Number(n) || 0);
const fmtKg = g => { g = Number(g) || 0; return g >= 1000 ? nf2.format(g / 1000) + ' kg' : nf0.format(g) + ' g'; };
const fmtEUR = n => (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const pct = (a, b) => b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0;
const num = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const plural = (n, one, many) => n === 1 ? one : many;

/* --- IDs / Objekte --- */
const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)));
const clone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const byId = (arr, id) => (arr || []).find(x => x.id === id);
function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.flush = () => { clearTimeout(t); fn(); }; return f; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* --- Texte --- */
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = t => (t.length > 4 ? t.replace(/(en|e|n|s)$/, '') : t);
function tokens(s) { return norm(s).split(' ').filter(t => t.length > 2).map(stem); }
function similar(a, b) {
  const A = tokens(a), B = tokens(b); if (!A.length || !B.length) return 0;
  const sb = new Set(B); let hit = 0;
  for (const t of A) { if (sb.has(t) || B.some(x => x.length > 4 && t.length > 4 && (x.startsWith(t.slice(0, 5)) || t.startsWith(x.slice(0, 5))))) hit++; }
  return hit / Math.max(A.length, B.length);
}
const splitList = s => String(s || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);

/* --- Binaer --- */
function b64(bytes) { let s = ''; const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const enc = s => new TextEncoder().encode(s);
const dec = b => new TextDecoder().decode(b);

/* --- Icons (24x24, Linien) --- */
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  bag: 'M8 7V5a4 4 0 018 0v2M5 7h14l1 13H4zM9 12h6',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  cart: 'M3 4h3l2 11h10l2-8H7M9 20a1 1 0 100-2 1 1 0 000 2M17 20a1 1 0 100-2 1 1 0 000 2',
  more: 'M4 6h16M4 12h16M4 18h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  check: 'M4 12l5 5L20 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  camera: 'M4 8h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 100-8 4 4 0 000 8',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 100-.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  chev: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
  unlock: 'M6 11h12v10H6zM8 11V8a4 4 0 017.5-2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M17 11a2.5 2.5 0 100-5M17 14c2.5.3 4 2.3 4 5',
  building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6M19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7l-2 4 2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1z',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  food: 'M7 3v8a2 2 0 002 2v8M11 3v8M7 7h4M17 21V3c-2 1-3 4-3 8h3',
  pill: 'M8 4l12 12a4 4 0 01-6 6L2 10a4 4 0 016-6zM8 11l5-5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3',
  paw: 'M7 11a2 2 0 100-4 2 2 0 000 4M17 11a2 2 0 100-4 2 2 0 000 4M10 7a1.8 1.8 0 100-3.600M14 7a1.8 1.8 0 100-3.6M12 12c-3 0-5 3-5 5 0 2 2 2.500 5 1.500 3 1 5 .5 5-1.500 0-2-2-5-5-5',
  car: 'M4 15l2-6h12l2 6v4h-3v-2H7v2H4zM6 15h12M8 12h8',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
  print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  archive: 'M3 5h18v4H3zM5 9v11h14V9M10 13h4',
  star: 'M12 3l2.8 5.7 6.2.9-4.500 4.400 1 6.200L12 17.200 6.500 20.200l1-6.200L3 9.600l6.200-.9z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18M12 7v5l3 2',
  cube: 'M12 3l8 4.500v9L12 21l-8-4.500v-9zM12 12l8-4.500M12 12v9M12 12L4 7.500',
  map: 'M9 4l6 2 5-2v14l-5 2-6-2-5 2V6zM9 4v14M15 6v14',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18M12 11v6M12 7.500v.5',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14M20 20l-4-4',
  move: 'M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M2 12h20M12 2v20',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 100-6 3 3 0 000 6',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
};
function icon(name, cls = '') {
  const d = ICONS[name] || ICONS.info;
  return raw(`<svg class="ic ${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`);
}

/* --- Toast --- */
function toast(msg, ms = 3200) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  box.appendChild(t); setTimeout(() => t.remove(), ms);
}

/* --- Native-Bruecke --- */
const NATIVE = (typeof window !== 'undefined' && window.NotfallAndroid) || null;
const IS_NATIVE = !!NATIVE;
const EXT = { until: 0 }; // gesetzt, solange ein externer Vorgang (Kamera, Dateiauswahl) die App kurz in den Hintergrund schickt
const _cbs = {}; let _cbId = 1;
window.__nativeResult = (id, json) => { const f = _cbs[id]; delete _cbs[id]; if (f) { let o; try { o = JSON.parse(json); } catch { o = { ok: false, error: 'Ungültige Antwort' }; } f(o); } };
function nativeAsync(method, ...args) {
  return new Promise(resolve => {
    if (!NATIVE || !NATIVE[method]) return resolve({ ok: false, error: 'Nur in der Android-App verfügbar' });
    const id = _cbId++; const ext = method === 'takePhoto' || method === 'pickContact'; if (ext) EXT.until = Date.now() + 600000;
    _cbs[id] = r => { if (ext) EXT.until = 0; resolve(r); };
    try { NATIVE[method](id, ...args); } catch (e) { delete _cbs[id]; if (ext) EXT.until = 0; resolve({ ok: false, error: String(e) }); }
  });
}
function openExternal(url) { if (NATIVE && NATIVE.openUrl) NATIVE.openUrl(url); else window.open(url, '_blank', 'noopener'); }
function dial(number) { if (NATIVE && NATIVE.dial) NATIVE.dial(number); else location.href = 'tel:' + number.replace(/ /g, ''); }

/* --- Dateien --- */
async function saveFile(name, mime, bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (NATIVE && NATIVE.saveDownload) return NATIVE.saveDownload(name, mime, b64(u8));
  const blob = new Blob([u8], { type: mime || 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true;
}
function pickFiles({ accept = '*/*', multiple = false } = {}) {
  return new Promise(resolve => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.style.display = 'none';
    EXT.until = Date.now() + 600000;
    i.addEventListener('change', () => { EXT.until = 0; resolve(Array.from(i.files || [])); i.remove(); });
    i.addEventListener('cancel', () => { EXT.until = 0; resolve([]); i.remove(); });
    document.body.appendChild(i); i.click();
  });
}
async function imageToDataUrl(file, maxSide = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * sc)); c.height = Math.max(1, Math.round(bmp.height * sc));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
  return c.toDataURL('image/jpeg', quality);
}
const readBuf = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(new Uint8Array(r.result)); r.onerror = () => rej(r.error); r.readAsArrayBuffer(f); });
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(f); });

/* --- Gzip (optional) --- */
async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(cs).arrayBuffer());
}
async function gunzip(bytes) {
  const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}

/* --- Kryptografie (PBKDF2 + AES-GCM) --- */
async function deriveKey(pass, salt, iter = 310000, usages = ['encrypt', 'decrypt']) {
  const base = await crypto.subtle.importKey('raw', enc(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usages);
}
async function aesEnc(key, bytes, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const p = { name: 'AES-GCM', iv }; if (aad) p.additionalData = enc(aad);
  const ct = new Uint8Array(await crypto.subtle.encrypt(p, key, bytes));
  return { iv: b64(iv), ct: b64(ct) };
}
async function aesDec(key, o, aad) {
  const p = { name: 'AES-GCM', iv: unb64(o.iv) }; if (aad) p.additionalData = enc(aad);
  return new Uint8Array(await crypto.subtle.decrypt(p, key, unb64(o.ct)));
}
async function sha256hex(s) { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc(s))); return Array.from(d).map(x => x.toString(16).padStart(2, '0')).join(''); }
