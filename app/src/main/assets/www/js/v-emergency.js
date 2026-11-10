'use strict';
/* ===== Notfall! – zentrale Notfall-Schnellübersicht (manuell und aus dem Probealarm) ===== */
ACT['call'] = d => dial(d.n);

/* Lagen mit eigenen, kurzen Checklisten – ausdruecklich KEINE amtlichen Anweisungen */
const SCEN = {
  storm_warn: { label: 'Sturm angekündigt', steps: ['Lose Gegenstände draußen sichern – nur solange es draußen sicher ist', 'Fenster und Türen schließen', 'Handy und Powerbanks laden'], bags: 'ready' },
  storm_now: { label: 'Sturm läuft', steps: ['Geschützten Innenraum aufsuchen', 'Fenster meiden', 'Nicht nach draußen gehen, um etwas zu sichern'], bags: 'none' },
  fire_near: { label: 'Brand / Rauch in der Umgebung', steps: ['Amtliche Anweisung befolgen', 'Falls angewiesen: Fenster und Türen schließen, Lüftung aus'], bags: 'ready' },
  fire_house: { label: 'Brand im eigenen Gebäude', steps: ['Sofort sicher hinaus', '112 anrufen', 'Nicht nach Rucksäcken suchen, nicht zurückgehen'], bags: 'dontsearch' },
  flood: { label: 'Hochwasser', steps: ['Keller meiden', 'Nicht durch Wasser gehen oder fahren', 'Evakuierungsanordnung folgen'], bags: 'evac' },
  blackout: { label: 'Stromausfall', steps: ['Batterieradio und Lampen nutzen', 'Kühlgeräte geschlossen halten', 'Keine Kocher, Grills oder Brennstoffe drinnen'], bags: 'none' },
  hazmat: { label: 'Gefahrstoffe', steps: ['Genaue amtliche Anweisung beachten', 'Nicht automatisch in den Keller gehen'], bags: 'ready' },
  evac: { label: 'Evakuierung', steps: ['Anordnung folgen', 'Rucksäcke mitnehmen, wenn sicher und ohne Verzögerung', 'Medikamente und Kinderbedarf mitnehmen'], bags: 'evac' },
  civil: { label: 'Zivilschutz', steps: ['Nur konkrete amtliche Hinweise befolgen', 'Radio und Warn-App verfolgen'], bags: 'ready' },
};
const BAG_ADVICE = { none: ['Nicht nötig', ''], ready: ['Bereithalten', 'rec'], evac: ['Bei sicherer Evakuierung mitnehmen', 'ok'], dontsearch: ['Nicht danach suchen', 'must'] };
const OFFICIAL = [['Aktuelle Warnungen (warnung.bund.de)', 'https://warnung.bund.de/'], ['BBK – Hilfe im Notfall', 'https://www.bbk.bund.de/']];
const SOSUI = { done: new Set() };
/* Gesundheitsbezogene Teile nur allgemein benennen – Namen von Medikamenten sind privat */
const HEALTH_RE = /^(Medikament:|Allergie|Pflegebedarf|Medizinisches Gerät|Hilfsmittel:)/;
function laterLabels(list) { const health = list.filter(i => HEALTH_RE.test(i.name) || (i.tags || []).some(t => ['meds', 'device', 'aid', 'care'].includes(t))); const rest = list.filter(i => !health.includes(i)).map(i => i.name); if (health.length) rest.unshift('Medikamente & Hilfsmittel (' + health.length + ')'); return rest; }

function sosHash(q) { const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v) p.set(k, v); const s = p.toString(); return '#/sos' + (s ? '?' + s : ''); }

route('/sos', H => {
  const limited = UI.sosLimited || (DB.users.length && !UI.userId);
  const S = DB.settings; const c = COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE;
  const q = UI.q || new URLSearchParams(); const sk = SCEN[q.get('s')] ? q.get('s') : ''; const sc = SCEN[sk];
  const testId = q.get('test'); const occ = +q.get('t') || 0; const alarm = testId ? byId(H.alarms || [], testId) : null;
  if (alarm) alarmResult(H, alarm.id, occ, r => { if (!r.opened) { r.opened = Date.now(); persist(); } });
  const res = alarm ? alarmResult(H, alarm.id, occ) : null;
  const advice = sc ? BAG_ADVICE[sc.bags] : null;
  return {
    title: alarm ? 'TESTALARM' : 'NOTFALL', back: limited ? null : '#/home', actions: limited ? h`<button class="btn sm" data-act="sos-exit">${icon('lock')}<span>Sperren</span></button>` : '',
    html: h`${alarm ? h`<div class="testbanner" role="alert"><div>TESTALARM – KEINE ECHTE GEFAHR</div></div>` : h`<div class="notice must" role="alert">${icon('alert')}<div><p class="nt">Akute Gefahr: 112</p><p>Anweisungen der Behörden haben Vorrang.</p></div></div>`}
    <div class="stack-s">${c.numbers.slice(0, alarm ? 1 : 9).map(([n, t, s]) => h`<button class="callbtn ${n === '112' ? '' : 'alt'}" data-act="call" data-n="${n}">${icon('phone')}<span><span style="display:block">${n} – ${t}</span>${alarm ? h`<small>Im Test nicht anrufen</small>` : s ? h`<small>${s}</small>` : ''}</span></button>`)}</div>
    <div class="chips" role="group" aria-label="Lage">${Object.entries(SCEN).map(([k, v]) => h`<a class="chip" aria-pressed="${k === sk ? 'true' : 'false'}" href="${sosHash({ s: k === sk ? '' : k, test: testId, t: occ || '' })}">${v.label}</a>`)}</div>
    ${sc ? h`<div class="card own"><div class="row spread"><h2>${sc.label}</h2><span class="badge">Eigene Checkliste</span></div>
      <p class="small muted">Keine amtliche Anweisung. Amtliche Warnungen und Anweisungen gehen vor.</p>
      <div class="stack-s" style="margin-top:8px">${sc.steps.map((t, i) => h`<label class="check"><input type="checkbox" data-change="sos-step" data-k="${sk + i}" ${SOSUI.done.has(sk + i) ? raw('checked') : ''}><span class="t">${i + 1}. ${t}</span></label>`)}</div>
      ${!limited ? h`<div class="btns" style="margin-top:8px">${OFFICIAL.map(([t, u]) => h`<button class="btn sm" data-act="open-url" data-url="${u}">${icon('eye')} ${t}</button>`)}</div>` : h`<p class="small muted" style="margin-top:8px">${OFFICIAL.map(o => o[1]).join(' · ')}</p>`}</div>` : ''}
    ${H.bags.length ? h`<div class="card"><h2>Taschen</h2><div class="stack" style="margin-top:8px">${H.bags.map(b => { const st = bagStats(H, S, b); const later = bagItems(H, b).filter(i => i.lastMinute && i.status !== 'missing'); return h`<div><div class="row spread"><b>${b.name}</b>${advice ? h`<span class="badge ${advice[1]}">${advice[0]}</span>` : h`<span class="mono">${st.packed}/${st.total}</span>`}</div>
      <div class="muted small">${b.location ? 'Ort: ' + b.location : 'Lagerort nicht eingetragen'}${advice ? ' · ' + st.packed + '/' + st.total + ' gepackt' : ''}</div>${bar(st.packedPct, 'ok')}
      ${later.length && (!sc || sc.bags === 'evac' || sc.bags === 'ready') ? h`<div class="small" style="margin-top:6px"><b>Bei Abreise mitnehmen:</b> ${laterLabels(later).join(', ')}</div>` : ''}</div>`; })}</div></div>` : ''}
    ${H.people.map(p => iceCard(H, p, { link: !limited && !alarm }))}
    ${H.meeting.length ? h`<div class="card"><h2>Treffpunkte</h2><div class="stack-s" style="margin-top:8px">${H.meeting.map(p => h`<div class="row nowrap"><div class="grow"><b>${p.name}</b>${p.far ? h` <span class="badge">weiter entfernt</span>` : ''}<br><span class="muted">${[p.address, p.note].filter(Boolean).join(' · ')}</span></div>${!limited && placeCoord(p) ? h`<button class="btn sm" data-act="map-goto-sos" data-id="${p.id}">${icon('map')} Karte</button>` : ''}</div>`)}</div></div>` : ''}
    ${alarm ? alarmEvalCard(H, alarm, occ, res) : ''}
    <p class="muted small">${c.warnHint}</p>`,
    after: () => { const own = $('.own'); if (own && !alarm) own.scrollIntoView({ block: 'start' }); },
  };
});
INPUT['sos-step'] = el => { if (el.checked) SOSUI.done.add(el.dataset.k); else SOSUI.done.delete(el.dataset.k); };
ACT['map-goto-sos'] = d => { const p = byId(HH().meeting, d.id); if (p && placeCoord(p)) { MAPUI.lat = p.lat; MAPUI.lon = p.lon; MAPUI.z = 15; } go('#/map'); };
ACT['sos-exit'] = () => { UI.sosLimited = false; UI.locked = true; go('#/home'); render(); };
