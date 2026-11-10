'use strict';
/* ===== Notfall! – Orte in der Nähe suchen (Treffpunkte) =====
   Sucht bei OpenStreetMap (Nominatim) im Umkreis von etwa 5 km. Nur auf Knopfdruck und nur in der Android-App
   (die Oberfläche selbst lädt keine fremden Adressen). Dabei werden Suchwort und Umgebung übertragen. */
const PLACE_SUGGEST = ['Sportplatz', 'Spielplatz', 'Schule', 'Kirche', 'Park', 'Rathaus', 'Feuerwehr', 'Bahnhof', 'Supermarkt'];
const canPlaceSearch = () => !!(NATIVE && NATIVE.httpGet);
function homeCoord(H) { const hs = Object.assign({}, (H.cfg && H.cfg.housing) || {}, H.home || {}); return typeof hs.lat === 'number' ? { lat: hs.lat, lon: hs.lon } : null; }
function decodeB64Json(b64) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)))); }
/* Ergebnis von Nominatim in eine kurze Liste mit Entfernung umwandeln */
function placeResults(list, c) {
  return (Array.isArray(list) ? list : []).map(r => {
    const a = r.address || {}; const lat = +r.lat, lon = +r.lon; if (!isFinite(lat) || !isFinite(lon)) return null;
    const name = r.name || (r.display_name || '').split(',')[0] || 'Ort';
    const sub = [[a.road, a.house_number].filter(Boolean).join(' '), a.suburb || a.city_district || a.village || a.town || a.city].filter(Boolean).join(', ');
    return { name: name.slice(0, 80), sub, lat: +lat.toFixed(6), lon: +lon.toFixed(6), dist: c ? distM(c, { lat, lon }) : null };
  }).filter(Boolean).sort((x, y) => (x.dist ?? 0) - (y.dist ?? 0)).slice(0, 10);
}
async function placeSearch(q, c) {
  const dLat = .045, dLon = .07;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=15&accept-language=de&bounded=1&viewbox=${(c.lon - dLon).toFixed(4)},${(c.lat + dLat).toFixed(4)},${(c.lon + dLon).toFixed(4)},${(c.lat - dLat).toFixed(4)}&q=${encodeURIComponent(q)}`;
  const r = await nativeAsync('httpGet', url);
  if (!r.ok) throw new Error(r.error || 'Keine Verbindung');
  return placeResults(decodeB64Json(r.b64), c);
}
/* Dialog: Stichwort antippen oder eingeben → Liste → Ort wählen */
function openPlaceSearch({ center, title = 'Treffpunkt suchen', onPick }) {
  if (!center) { toast('Erst den Standort bestimmen – dann wird in der Nähe gesucht.'); return; }
  const m = openModal({ title, body: h`<div class="stack-s"><form class="row nowrap" id="psform" style="gap:8px"><input id="psq" type="search" placeholder="z. B. Sportplatz" class="grow" enterkeyhint="search" autocomplete="off" maxlength="60"><button class="btn primary icon" type="submit" aria-label="Suchen">${icon('search')}</button></form>
    <div class="chips">${PLACE_SUGGEST.map(w => h`<button type="button" class="chip" data-ps="${w}">${w}</button>`)}</div>
    <p class="muted small">Sucht im Umkreis von etwa 5 km bei OpenStreetMap. Dabei werden Suchwort und Umgebung übertragen.</p>
    <div id="psres" class="stack-s"></div></div>` });
  const res = $('#psres', m.el); let found = [];
  const run = async q => {
    q = (q || '').trim(); if (!q) return; $('#psq', m.el).value = q;
    res.innerHTML = h`<p class="muted">Suche „${q}“ …</p>`.s;
    try { found = await placeSearch(q, center); } catch (e) { res.innerHTML = h`<p class="tmust">${e.message || 'Suche fehlgeschlagen'} – Internet nötig.</p>`.s; return; }
    res.innerHTML = (found.length ? h`${found.map((p, k) => h`<button type="button" class="tile" data-pk="${k}"><span class="ti">${icon('map')}</span><span class="grow"><span class="tt">${p.name}</span><br><span class="ts">${[p.sub, p.dist !== null ? fmtDist(p.dist) + ' Luftlinie' : ''].filter(Boolean).join(' · ')}</span></span></button>`)}` : h`<p class="muted">Nichts gefunden. Anderes Wort versuchen.</p>`).s;
  };
  $('#psform', m.el).addEventListener('submit', e => { e.preventDefault(); run($('#psq', m.el).value); });
  m.el.addEventListener('click', e => {
    const c = e.target.closest('[data-ps]'); if (c) { run(c.dataset.ps); return; }
    const t = e.target.closest('[data-pk]'); if (t) { const p = found[+t.dataset.pk]; closeModal(m); if (p) onPick(p); }
  });
  setTimeout(() => { const i = $('#psq', m.el); if (i) i.focus(); }, 50);
  return m;
}
