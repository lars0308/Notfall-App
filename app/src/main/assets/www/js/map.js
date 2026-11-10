'use strict';
/* ===== Notfall! – Offline-Karten: Kachel-Mathematik, Speicher, Download, Kartenansicht ===== */

/* ---- Web-Mercator (XYZ-Kacheln, 256 px) ---- */
const TILE = 256;
const lon2x = (lon, z) => (lon + 180) / 360 * Math.pow(2, z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z); };
const x2lon = (x, z) => x / Math.pow(2, z) * 360 - 180;
const y2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
const MAX_LAT = 85.0511;
function tileRange(b, z) {
  const n = Math.pow(2, z) - 1;
  return {
    x0: clamp(Math.floor(lon2x(b.w, z)), 0, n), x1: clamp(Math.floor(lon2x(b.e, z) - 1e-9), 0, n),
    y0: clamp(Math.floor(lat2y(Math.min(b.n, MAX_LAT), z)), 0, n), y1: clamp(Math.floor(lat2y(Math.max(b.s, -MAX_LAT), z) - 1e-9), 0, n),
  };
}
function countTiles(b, minz, maxz) { let c = 0; for (let z = minz; z <= maxz; z++) { const r = tileRange(b, z); c += (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1); } return c; }
function* eachTile(b, minz, maxz) { for (let z = minz; z <= maxz; z++) { const r = tileRange(b, z); for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) yield [z, x, y]; } }
function bboxAround(lat, lon, km) {
  const dLat = km / 111.32, dLon = km / (111.32 * Math.max(0.05, Math.cos(lat * Math.PI / 180)));
  return { w: clamp(lon - dLon, -180, 180), e: clamp(lon + dLon, -180, 180), s: clamp(lat - dLat, -MAX_LAT, MAX_LAT), n: clamp(lat + dLat, -MAX_LAT, MAX_LAT) };
}
const bboxHit = (b, lat, lon) => lon >= b.w && lon <= b.e && lat >= b.s && lat <= b.n;
const bboxMeet = (a, b) => a.w <= b.e && a.e >= b.w && a.s <= b.n && a.n >= b.s;
function parseCoord(text) {
  const m = /(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)/.exec(String(text || ''));
  if (!m) return null;
  const lat = +m[1].replace(',', '.'), lon = +m[2].replace(',', '.');
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
function tileUrl(tpl, z, x, y) { const subs = ['a', 'b', 'c']; return tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{s}', subs[(x + y) % 3]); }
function checkTileTemplate(tpl) {
  tpl = String(tpl || '').trim();
  if (!/^https:\/\/[^\s]+$/.test(tpl)) return 'Die Adresse muss mit https:// beginnen.';
  if (!tpl.includes('{z}') || !tpl.includes('{x}') || !tpl.includes('{y}')) return 'Die Adresse braucht {z}, {x} und {y}.';
  return null;
}

/* ---- Kachelspeicher: Android-Dateiablage oder IndexedDB (nur Browser-Test) ---- */
const MapTiles = (() => {
  let idb = null;
  const open = () => new Promise((res, rej) => { if (idb) return res(idb); const r = indexedDB.open('notfall_maps', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => { idb = r.result; res(idb); }; r.onerror = () => rej(r.error); });
  const native = () => !!(NATIVE && NATIVE.mapGet);
  return {
    async get(pack, z, x, y) {
      if (native()) return NATIVE.mapGet(pack, z, x, y) || null;
      const d = await open(); return new Promise(res => { const r = d.transaction('t').objectStore('t').get(`${pack}/${z}/${x}/${y}`); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
    },
    async put(pack, z, x, y, b64, type) {
      if (native()) { if (!NATIVE.mapPut(pack, z, x, y, b64)) throw new Error('Speicher voll?'); return; }
      const d = await open(); await new Promise((res, rej) => { const t = d.transaction('t', 'readwrite'); t.objectStore('t').put(`data:${type || 'image/png'};base64,${b64}`, `${pack}/${z}/${x}/${y}`); t.oncomplete = res; t.onerror = () => rej(t.error); });
    },
    async del(pack) {
      if (native()) { NATIVE.mapDelete(pack); return; }
      const d = await open(); await new Promise(res => { const t = d.transaction('t', 'readwrite'); t.objectStore('t').delete(IDBKeyRange.bound(pack + '/', pack + '/￿')); t.oncomplete = res; t.onerror = res; });
    },
    bytes(pack) { return native() && NATIVE.mapBytes ? NATIVE.mapBytes(pack) : 0; },
  };
})();

/* ---- Download eines Gebiets (nur auf ausdruecklichen Start) ---- */
const MAP_LIMIT = { tiles: 15000, maxZoom: 17 };
const MapDownload = { running: null };
async function downloadRegion(o, onProgress) {
  const err = checkTileTemplate(o.url); if (err) throw new Error(err);
  const total = countTiles(o.bbox, o.minz, o.maxz);
  if (total > MAP_LIMIT.tiles) throw new Error(`Zu groß: ${fmt0(total)} Kacheln (max. ${fmt0(MAP_LIMIT.tiles)}). Kleineres Gebiet oder weniger Zoom wählen.`);
  if (!IS_NATIVE) throw new Error('Kartendownload nur in der Android-App.');
  const id = 'd' + uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const job = { id, cancel: false, done: 0, fail: 0, total, bytes: 0 }; MapDownload.running = job;
  const queue = Array.from(eachTile(o.bbox, o.minz, o.maxz)); let streak = 0, abortMsg = null;
  const worker = async () => {
    while (queue.length && !job.cancel && !abortMsg) {
      const [z, x, y] = queue.shift();
      const r = await nativeAsync('httpGet', tileUrl(o.url, z, x, y));
      if (r.ok && /^image\//.test(r.type || '')) { await MapTiles.put(id, z, x, y, r.b64, r.type); job.done++; job.bytes += r.b64.length * 0.75; streak = 0; }
      else { job.fail++; streak++; if (r.status === 403 || r.status === 401 || r.status === 429) abortMsg = `Der Kartenserver verweigert den Download (HTTP ${r.status}).`; else if (streak >= 25) abortMsg = 'Viele Fehler hintereinander – Adresse oder Internetverbindung prüfen.'; }
      if (onProgress) onProgress(job);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  MapDownload.running = null;
  if (job.cancel || abortMsg || job.done === 0) { await MapTiles.del(id); throw new Error(job.cancel ? 'Abgebrochen.' : abortMsg || 'Keine Kachel geladen.'); }
  return { id, name: o.name, bbox: o.bbox, minz: o.minz, maxz: o.maxz, tiles: job.done, failed: job.fail, bytes: MapTiles.bytes(id) || Math.round(job.bytes), attribution: o.attribution || '', source: new URL(o.url.replace(/\{[a-z]\}/g, '0')).host, created: new Date().toISOString() };
}

/* ---- Kartenansicht (Canvas, ohne Fremdbibliothek) ---- */
class MapView {
  constructor(cv, opts) {
    this.cv = cv; this.g = cv.getContext('2d'); this.o = opts; this.lat = 51.2; this.lon = 10.4; this.z = 5; this.cache = new Map(); this.raf = 0; this.dpr = window.devicePixelRatio || 1;
    this._bind(); if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(cv); } this.resize();
  }
  packs() { return (this.o.packs && this.o.packs()) || []; }
  maxZoomAt() { const v = this.bbox(); let m = -1; for (const p of this.packs()) if (bboxMeet(p.bbox, v)) m = Math.max(m, p.maxz); if (this.o.online && this.o.online()) m = Math.max(m, 18); return m; }
  resize() { const r = this.cv.getBoundingClientRect(); const w = Math.max(10, Math.round(r.width * this.dpr)), h = Math.max(10, Math.round(r.height * this.dpr)); if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; } this.invalidate(); }
  invalidate() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); }
  setView(lat, lon, z) { this.lat = clamp(lat, -MAX_LAT, MAX_LAT); this.lon = ((lon + 540) % 360) - 180; if (z !== undefined) this.z = clamp(z, 2, 19); this.invalidate(); }
  fit(b, pad = 0.1) {
    const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr; const dx = (b.e - b.w) * (1 + pad), dy = (b.n - b.s) * (1 + pad);
    let z = 18; while (z > 2 && ((lon2x(b.w + dx, z) - lon2x(b.w, z)) * TILE > W || (lat2y(b.s, z) - lat2y(b.s + dy, z)) * TILE > H)) z--;
    this.setView((b.n + b.s) / 2, (b.e + b.w) / 2, z);
  }
  bbox() { const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr; const s = Math.pow(2, this.z); const cx = lon2x(this.lon, this.z) * TILE, cy = lat2y(this.lat, this.z) * TILE; return { w: x2lon((cx - W / 2) / TILE, this.z), e: x2lon((cx + W / 2) / TILE, this.z), n: y2lat((cy - H / 2) / TILE, this.z), s: y2lat((cy + H / 2) / TILE, this.z), _s: s }; }
  toLatLon(sx, sy) { const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr; const cx = lon2x(this.lon, this.z) * TILE + (sx - W / 2), cy = lat2y(this.lat, this.z) * TILE + (sy - H / 2); return { lat: y2lat(cy / TILE, this.z), lon: x2lon(cx / TILE, this.z) }; }
  toScreen(lat, lon) { const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr; return { x: W / 2 + (lon2x(lon, this.z) - lon2x(this.lon, this.z)) * TILE, y: H / 2 + (lat2y(lat, this.z) - lat2y(this.lat, this.z)) * TILE }; }
  _tile(z, x, y) {
    const k = z + '/' + x + '/' + y; let e = this.cache.get(k);
    if (e) { this.cache.delete(k); this.cache.set(k, e); return e; }
    e = { st: 'load', img: null }; this.cache.set(k, e); if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
    (async () => {
      const lat = y2lat(y + 0.5, z), lon = x2lon(x + 0.5, z); let url = null;
      for (const p of this.packs()) { if (z < p.minz || z > p.maxz || !bboxHit(p.bbox, lat, lon)) continue; url = await MapTiles.get(p.id, z, x, y); if (url) break; }
      if (!url && this.o.online && this.o.online()) { const r = await nativeAsync('httpGet', tileUrl(this.o.online(), z, x, y)); if (r.ok && /^image\//.test(r.type || '')) url = `data:${r.type};base64,${r.b64}`; }
      if (!url) { e.st = 'none'; return; }
      const img = new Image(); img.onload = () => { e.img = img; e.st = 'ok'; this.invalidate(); }; img.onerror = () => { e.st = 'none'; }; img.src = url;
    })();
    return e;
  }
  draw() {
    const g = this.g, d = this.dpr, W = this.cv.width / d, H = this.cv.height / d; g.setTransform(d, 0, 0, d, 0, 0);
    const dark = document.documentElement.dataset.theme !== 'light'; g.fillStyle = dark ? '#1a2129' : '#e9edf1'; g.fillRect(0, 0, W, H);
    const avail = this.maxZoomAt(); const tz = clamp(Math.floor(this.z + 0.25), 0, avail >= 0 ? avail : Math.floor(this.z)); const sc = Math.pow(2, this.z - tz);
    const cx = lon2x(this.lon, tz) * TILE, cy = lat2y(this.lat, tz) * TILE; const n = Math.pow(2, tz); const ts = TILE * sc;
    const x0 = Math.floor((cx - W / 2 / sc) / TILE), x1 = Math.floor((cx + W / 2 / sc) / TILE), y0 = Math.max(0, Math.floor((cy - H / 2 / sc) / TILE)), y1 = Math.min(n - 1, Math.floor((cy + H / 2 / sc) / TILE));
    let shown = 0;
    if (avail >= 0) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const wx = ((x % n) + n) % n; const sx = W / 2 + (x * TILE - cx) * sc, sy = H / 2 + (y * TILE - cy) * sc;
      const e = this._tile(tz, wx, y); if (e.st === 'ok') { g.drawImage(e.img, sx, sy, ts + .5, ts + .5); shown++; continue; }
      for (let k = 1; k <= 6 && tz - k >= 0; k++) { const p = this.cache.get((tz - k) + '/' + (wx >> k) + '/' + (y >> k)); if (p && p.st === 'ok') { const part = TILE >> k; g.drawImage(p.img, (wx & ((1 << k) - 1)) * part, (y & ((1 << k) - 1)) * part, part, part, sx, sy, ts + .5, ts + .5); break; } }
    }
    this.shown = shown;
    // Raster als Orientierung, wenn keine Karte vorhanden ist
    if (!shown) { g.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; g.lineWidth = 1; const step = this.z > 9 ? 0.1 : this.z > 6 ? 1 : 5; const b = this.bbox(); for (let lo = Math.ceil(b.w / step) * step; lo <= b.e; lo += step) { const p = this.toScreen(0, lo); g.beginPath(); g.moveTo(p.x, 0); g.lineTo(p.x, H); g.stroke(); } for (let la = Math.ceil(b.s / step) * step; la <= b.n; la += step) { const p = this.toScreen(la, this.lon); g.beginPath(); g.moveTo(0, p.y); g.lineTo(W, p.y); g.stroke(); } }
    // Paketgrenzen
    g.setLineDash([6, 5]); g.strokeStyle = 'rgba(59,130,246,.8)'; g.lineWidth = 1.5;
    for (const p of this.packs()) { const a = this.toScreen(p.bbox.n, p.bbox.w), c = this.toScreen(p.bbox.s, p.bbox.e); if (c.x - a.x > 6) g.strokeRect(a.x, a.y, c.x - a.x, c.y - a.y); }
    g.setLineDash([]);
    if (this.o.selection && this.o.selection()) { const b = this.o.selection(); const a = this.toScreen(b.n, b.w), c = this.toScreen(b.s, b.e); g.fillStyle = 'rgba(255,122,26,.12)'; g.fillRect(a.x, a.y, c.x - a.x, c.y - a.y); g.strokeStyle = '#ff7a1a'; g.lineWidth = 2; g.strokeRect(a.x, a.y, c.x - a.x, c.y - a.y); }
    // Markierungen
    this.hits = [];
    for (const m of (this.o.markers ? this.o.markers() : [])) {
      const p = this.toScreen(m.lat, m.lon); if (p.x < -40 || p.y < -40 || p.x > W + 40 || p.y > H + 40) continue;
      g.fillStyle = m.color || '#ff5a5f'; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y - 14, 9, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(p.x - 6, p.y - 8); g.lineTo(p.x, p.y); g.lineTo(p.x + 6, p.y - 8); g.fill();
      g.font = '700 12px system-ui,sans-serif'; g.textAlign = 'center'; const tw = g.measureText(m.label).width + 10;
      g.fillStyle = 'rgba(10,14,18,.85)'; g.beginPath(); roundRect(g, p.x - tw / 2, p.y + 4, tw, 18, 9); g.fill(); g.fillStyle = '#fff'; g.fillText(m.label, p.x, p.y + 17);
      this.hits.push({ id: m.id, x: p.x, y: p.y - 10 });
    }
    // Massstab
    const mpp = 156543.03392 * Math.cos(this.lat * Math.PI / 180) / Math.pow(2, this.z); const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000]; const len = nice.find(v => v / mpp > 70) || 1000000; const px = len / mpp;
    g.fillStyle = dark ? '#fff' : '#111'; g.fillRect(12, H - 26, px, 3); g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText(len >= 1000 ? len / 1000 + ' km' : len + ' m', 12, H - 32);
  }
  _bind() {
    const cv = this.cv; const pts = new Map(); let down = null, pinch = 0;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const dd = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.z = clamp(this.z + Math.log2(dd / pinch), 2, 19); pinch = dd; if (down) down.moved += 20; }
      else { const c = this.toLatLon(this.cv.width / this.dpr / 2 - dx, this.cv.height / this.dpr / 2 - dy); this.lat = clamp(c.lat, -MAX_LAT, MAX_LAT); this.lon = c.lon; if (down) down.moved += Math.abs(dx) + Math.abs(dy); }
      this.invalidate(); if (this.o.onMove) this.o.onMove();
    });
    const up = e => {
      pts.delete(e.pointerId); pinch = 0;
      if (down && e.type === 'pointerup' && down.moved < 8 && performance.now() - down.t < 600 && !pts.size) {
        const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top;
        const hit = (this.hits || []).find(h => Math.hypot(h.x - sx, h.y - sy) < 22);
        if (this.o.onTap) { const ll = this.toLatLon(sx, sy); this.o.onTap(ll.lat, ll.lon, hit ? hit.id : null); }
      }
      if (!pts.size) down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this.z = clamp(this.z + (e.deltaY < 0 ? 0.5 : -0.5), 2, 19); this.invalidate(); if (this.o.onMove) this.o.onMove(); }, { passive: false });
  }
  zoomBy(d) { this.z = clamp(Math.round(this.z + d), 2, 19); this.invalidate(); if (this.o.onMove) this.o.onMove(); }
  destroy() { if (this.ro) this.ro.disconnect(); cancelAnimationFrame(this.raf); }
}

/* Kartenpakete ohne Kacheln auf diesem Geraet (z. B. nach Wiederherstellung auf neuem Handy) entfernen */
async function pruneMaps() {
  const keep = [];
  for (const p of (DB.maps || [])) {
    const z = p.minz, c = { lat: (p.bbox.n + p.bbox.s) / 2, lon: (p.bbox.w + p.bbox.e) / 2 };
    let found = false;
    for (let zz = z; zz <= Math.min(p.maxz, z + 3) && !found; zz++) found = !!(await MapTiles.get(p.id, zz, Math.floor(lon2x(c.lon, zz)), Math.floor(lat2y(c.lat, zz))));
    if (found || !IS_NATIVE) keep.push(p);
  }
  if (keep.length !== (DB.maps || []).length) { DB.maps = keep; persist(); }
}
