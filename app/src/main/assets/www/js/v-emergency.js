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
    html: h`${alarm ? h`<div class="testbanner" role="alert"><div>TESTALARM – KEINE ECHTE GEFAHR</div></div>` : ''}
    ${(() => { const [n0, t0] = c.numbers[0]; return h`<button class="callbtn big" data-act="call" data-n="${n0}">${icon('phone')}<span><span style="display:block">${n0} anrufen</span><small>${alarm ? 'Im Test nicht anrufen' : t0 + ' · Behörden-Anweisungen gehen vor'}</small></span></button>`; })()}
    ${!alarm && c.numbers.length > 1 ? h`<div class="callrow">${c.numbers.slice(1, 5).map(([n, t]) => h`<button class="callbtn alt sm" data-act="call" data-n="${n}">${icon('phone')}<span><b>${n}</b><small>${t}</small></span></button>`)}</div>` : ''}
    <div><h2 class="sec">Was ist los?</h2><div class="scengrid" role="group" aria-label="Lage">${Object.entries(SCEN).map(([k, v]) => h`<a class="scen" aria-pressed="${k === sk ? 'true' : 'false'}" href="${sosHash({ s: k === sk ? '' : k, test: testId, t: occ || '' })}">${v.label}</a>`)}</div></div>
    ${sc ? h`<div class="card own"><div class="row spread"><h2>${sc.label}</h2><span class="badge">Eigene Checkliste</span></div>
      <p class="small muted">Keine amtliche Anweisung. Amtliche Warnungen und Anweisungen gehen vor.</p>
      <div class="stack-s" style="margin-top:8px">${sc.steps.map((t, i) => h`<label class="check"><input type="checkbox" data-change="sos-step" data-k="${sk + i}" ${SOSUI.done.has(sk + i) ? raw('checked') : ''}><span class="t">${i + 1}. ${t}</span></label>`)}</div>
      ${!limited ? h`<div class="btns" style="margin-top:8px">${OFFICIAL.map(([t, u]) => h`<button class="btn sm" data-act="open-url" data-url="${u}">${icon('eye')} ${t}</button>`)}</div>` : h`<p class="small muted" style="margin-top:8px">${OFFICIAL.map(o => o[1]).join(' · ')}</p>`}</div>` : ''}
    ${sosContacts(H)}
    ${sosPeople(H, { link: !limited && !alarm })}
    ${H.bags.length ? sosBags(H, S, sc, advice) : ''}
    ${H.meeting.length ? h`<div class="card"><h2>Treffpunkte</h2><div class="stack-s" style="margin-top:8px">${H.meeting.map(p => h`<div class="row nowrap"><div class="grow"><b>${p.name}</b>${p.far ? h` <span class="badge">weiter entfernt</span>` : ''}${p.address || p.note ? h`<br><span class="muted small">${[p.address, p.note].filter(Boolean).join(' · ')}</span>` : ''}</div>${!limited && placeCoord(p) ? h`<button class="btn sm" data-act="map-goto-sos" data-id="${p.id}">${icon('map')} Karte</button>` : ''}</div>`)}</div></div>` : ''}
    ${alarm ? alarmEvalCard(H, alarm, occ, res) : ''}
    <p class="muted small">${c.warnHint}</p>`,
    after: () => { const own = $('.own'); if (own && !alarm) own.scrollIntoView({ block: 'start' }); },
  };
});
/* Kontakte nur einmal, auch wenn sie bei mehreren Personen eingetragen sind */
function sosContacts(H) {
  const seen = new Map();
  for (const p of H.people) for (const c of passContacts(H, p)) if (!seen.has(c.id)) seen.set(c.id, { c, who: [] });
  for (const p of H.people) for (const c of passContacts(H, p)) seen.get(c.id).who.push(p.name);
  const list = [...seen.values()]; if (!list.length) return '';
  const all = H.people.length;
  return h`<div class="card"><h2>Anrufen</h2><div class="stack-s" style="margin-top:8px">${list.map(({ c, who }) => h`<div class="contact"><div><b>${c.name}</b>${c.relation ? h` <span class="muted">· ${c.relation}</span>` : ''}${who.length < all ? h`<br><span class="muted small">für ${who.join(', ')}</span>` : ''}</div>
    ${c.phone ? h`<button class="callbtn alt sm" data-act="call" data-n="${c.phone}">${icon('phone')}<span><b>${c.phone}</b></span></button>` : ''}</div>`)}</div></div>`;
}
/* Personen kompakt: nur freigegebene Angaben, ohne die Kontakte zu wiederholen */
function sosPeople(H, opts) {
  if (!H.people.length) return '';
  return h`<div class="card"><h2>Personen</h2><div class="stack-s" style="margin-top:8px">${H.people.map(p => { const rows = passShared(H, p);
    return h`<div class="row nowrap person-row">${avatar(p.share.photo ? p.photo : null, p.name)}<div class="grow"><b>${p.name}</b>${rows.length ? rows.map(([k, v]) => h`<br><span class="small"><span class="muted">${k}:</span> <b>${v}</b></span>`) : h`<br><span class="muted small">Keine freigegebenen Angaben</span>`}</div>
      ${opts.link ? h`<a class="btn icon sm" href="#/ice/${p.id}" aria-label="Notfallkarte von ${p.name}">${icon('scan')}</a>` : ''}</div>`; })}</div></div>`;
}
/* Taschen: eine Zeile je Tasche, „Bei Abreise mitnehmen“ einmal für alle */
function sosBags(H, S, sc, advice) {
  const later = []; const seen = new Set();
  for (const b of H.bags) for (const l of laterLabels(bagItems(H, b).filter(i => i.lastMinute && i.status !== 'missing'))) { const k = l.replace(/ \(\d+\)$/, ''); if (!seen.has(k)) { seen.add(k); later.push(l); } }
  const health = H.bags.reduce((n, b) => n + bagItems(H, b).filter(i => i.lastMinute && i.status !== 'missing' && (HEALTH_RE.test(i.name) || (i.tags || []).some(t => ['meds', 'device', 'aid', 'care'].includes(t)))).length, 0);
  const laterTxt = later.map(l => /^Medikamente & Hilfsmittel/.test(l) ? `Medikamente & Hilfsmittel (${health})` : l);
  return h`<div class="card"><div class="row spread"><h2>Taschen</h2>${advice ? h`<span class="badge ${advice[1]}">${advice[0]}</span>` : ''}</div><div class="stack-s" style="margin-top:8px">${H.bags.map(b => { const st = bagStats(H, S, b);
    return h`<div class="row spread nowrap"><div class="grow"><b>${b.name}</b><br><span class="small ${b.location ? '' : 'muted'}">${b.location ? 'Ort: ' + b.location : 'Lagerort nicht eingetragen'}</span></div><span class="mono small">${st.packed}/${st.total}</span></div>`; })}</div>
    ${laterTxt.length && (!sc || sc.bags === 'evac' || sc.bags === 'ready') ? h`<p class="small" style="margin-top:10px"><b>Bei Abreise mitnehmen:</b> ${laterTxt.join(', ')}</p>` : ''}</div>`;
}
INPUT['sos-step'] = el => { if (el.checked) SOSUI.done.add(el.dataset.k); else SOSUI.done.delete(el.dataset.k); };
ACT['map-goto-sos'] = d => { const p = byId(HH().meeting, d.id); if (p && placeCoord(p)) { MAPUI.lat = p.lat; MAPUI.lon = p.lon; MAPUI.z = 15; } go('#/map'); };
ACT['sos-exit'] = () => { UI.sosLimited = false; UI.locked = true; go('#/home'); render(); };
