'use strict';
/* ===== Notfall! – Start und „Mehr“ ===== */
function tile(href, ic, color, title, sub, right) {
  return h`<a class="tile ${color}" href="${href}"><span class="ti">${icon(ic)}</span><span class="grow"><span class="tt">${title}</span>${sub ? h`<br><span class="ts">${sub}</span>` : ''}</span>${right || icon('chev', 'chev')}</a>`;
}
function bagLine(st) { return `${st.packed} von ${st.total} gepackt${st.missing ? ' · ' + st.missing + ' offen' : ''}`; }
function nextCheck(H) {
  const r = H.reminders.filter(x => x.enabled && x.next).sort((a, b) => a.next.localeCompare(b.next))[0];
  const exp = H.items.filter(i => !i.archived && i.status === 'owned' && i.expiry && daysUntil(i.expiry) <= (DB.settings.notif.leadDays || 30)).length;
  return { r, exp };
}
/* Luftlinie in Metern */
function distM(a, b) { const R = 6371000, r = x => x * Math.PI / 180; const dl = r(b.lat - a.lat), dn = r(b.lon - a.lon); const q = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); }
const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${fmt(Math.round(m / 100) / 10)} km`;
const inDays = n => n === 0 ? 'heute' : n === 1 ? 'morgen' : n < 0 ? `seit ${-n} ${-n === 1 ? 'Tag' : 'Tagen'}` : `in ${n} Tagen`;
const stat = (val, label, cls = '') => h`<div class="stat ${cls}"><span class="sv">${val}</span><span class="sl">${label}</span></div>`;

/* Startseite = Übersicht mit Informationen; Bedienung über die Reiter unten */
route('/home', H => {
  const S = DB.settings;
  if (!H.setup.done && !H.items.length) return {
    title: H.name && H.name !== 'Mein Haushalt' ? H.name : 'Notfall!',
    html: H.profileDone ? h`<div class="card"><h2>Haushalt angelegt</h2><p class="muted" style="margin-top:6px">${H.people.map(p => p.name).join(', ')}${H.pets.length ? ' · ' + H.pets.map(t => t.name || t.species).join(', ') : ''}</p>
      <a class="btn primary lg block" style="margin-top:16px" href="#/wizard">${icon('bag')} Rucksäcke & Taschen anlegen</a></div>`
      : h`<div class="card"><h2>Willkommen</h2><p class="muted" style="margin-top:6px">Leg zuerst deinen Haushalt an: Personen und Tiere. Danach die Rucksäcke.</p>
      <a class="btn primary lg block" style="margin-top:16px" href="#/setup">${icon('users')} ${H.setup.pstep ? 'Haushalt weiter anlegen' : 'Haushalt anlegen'}</a></div>`,
  };
  const live = H.items.filter(i => !i.archived && i.container !== 'home');
  const have = live.filter(i => i.status === 'owned'); const packed = have.filter(i => i.packed && i.bagId);
  const miss = live.filter(i => i.status !== 'owned');
  const must = miss.filter(i => i.prio === 'must').slice(0, 4);
  const lead = (S.notif && S.notif.leadDays) || 30;
  const exp = H.items.filter(i => !i.archived && i.status === 'owned' && i.expiry && daysUntil(i.expiry) <= lead).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 4);
  const remAll = H.reminders.filter(x => x.enabled && x.next).sort((a, b) => a.next.localeCompare(b.next));
  const rem = remAll.filter(x => x.key === 'bagcheck').concat(remAll.filter(x => x.key !== 'bagcheck')).slice(0, 3);
  const al = (H.alarms || []).filter(a => a.enabled).map(a => alarmNext(a)).filter(Boolean).sort((a, b) => a - b)[0];
  const heavy = H.bags.map(b => ({ b, st: bagStats(H, S, b) })).filter(x => x.st.overweight || x.st.overfull);
  const calc = H.people.map(p => personCalc(p, S)); const kcal = calc.reduce((a, c) => a + c.kcal, 0); const water = calc.reduce((a, c) => a + c.waterL, 0) + H.pets.reduce((a, t) => a + petCalc(t).waterL, 0);
  const hours = planContext(H, S).bagHours || Math.min(72, (H.cfg && H.cfg.durationHours) || 72);
  const hs = Object.assign({}, (H.cfg && H.cfg.housing) || {}, H.home || {}); const home = typeof hs.lat === 'number' ? { lat: hs.lat, lon: hs.lon } : null;
  const meet = H.meeting.slice(0, 3);
  const country = COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE;
  const ice = H.contacts.filter(c => c.type === 'ice').length;
  return {
    title: H.name && H.name !== 'Mein Haushalt' ? H.name : 'Notfall!',
    html: h`<div class="stats">${stat(`${have.length}/${live.length}`, 'vorhanden', have.length === live.length && live.length ? 'ok' : '')}${stat(`${packed.length}/${live.length}`, 'gepackt')}${stat(miss.length, miss.length === 1 ? 'fehlt' : 'fehlen', miss.length ? 'must' : 'ok')}</div>
    ${must.length ? h`<div class="card"><h3>Wichtig, aber noch nicht da</h3><ul class="plain">${must.map(i => h`<li>${i.name}<span class="muted small">${i.bagId && byId(H.bags, i.bagId) ? ' · ' + byId(H.bags, i.bagId).name : ''}</span></li>`)}</ul>${miss.filter(i => i.prio === 'must').length > must.length ? h`<p class="muted small">und ${miss.filter(i => i.prio === 'must').length - must.length} weitere</p>` : ''}</div>` : ''}
    ${heavy.length ? h`<div class="card"><h3>Gewicht</h3><ul class="plain">${heavy.map(x => h`<li><span class="${x.st.overFactor > 1.25 ? 'tmust' : 'trec'}">${x.b.name}: ${x.st.overweight ? `${fmt(x.st.totalG / 1000)} von ${fmt(x.st.capKg)} kg` : `zu voll (${fmt(x.st.volL)} von ${fmt(x.st.usableL)} l)`}</span></li>`)}</ul></div>` : ''}
    <div class="card"><h3>Termine</h3><ul class="plain">
      ${rem.length ? rem.map(r => h`<li>${r.title}: <b>${fmtDate(r.next)}</b> <span class="muted small">(${inDays(daysUntil(r.next))})</span></li>`) : h`<li class="muted">Keine Kontrolle geplant</li>`}
      ${al ? h`<li>Probealarm: <b>${new Date(al).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</b></li>` : ''}
      ${exp.map(i => h`<li><span class="${daysUntil(i.expiry) < 0 ? 'tmust' : 'trec'}">${i.name}</span> läuft ab: ${fmtDate(i.expiry)} <span class="muted small">(${inDays(daysUntil(i.expiry))})</span></li>`)}</ul></div>
    <div class="card"><h3>Haushalt</h3>
      ${hs.place ? h`<p class="muted" style="margin-top:4px">${icon('map')} ${hs.place}</p>` : ''}
      <div class="chips" style="margin-top:10px">${H.people.map(p => h`<span class="chip static">${avatar(p.photo, p.name, 'sm')} ${p.name}</span>`)}${H.pets.map(t => h`<span class="chip static">${icon('paw')} ${t.name || t.species}</span>`)}</div>
      ${H.people.length ? h`<p style="margin-top:10px">Bedarf pro Tag: <b>${fmt0(kcal)} kcal</b> · <b>${fmt(water)} l Wasser</b></p><p class="muted small">Für ${hours} Stunden: ${fmt(water * hours / 24)} l Trinkwasser</p>` : ''}
      ${!ice ? h`<p class="tmust" style="margin-top:8px">Noch kein Notfallkontakt eingetragen.</p>` : h`<p class="muted small" style="margin-top:8px">${ice} ${ice === 1 ? 'Notfallkontakt' : 'Notfallkontakte'}</p>`}</div>
    ${meet.length ? h`<div class="card"><h3>Treffpunkte</h3><ul class="plain">${meet.map((m, k) => { const c = placeCoord(m); return h`<li>${k + 1}. ${m.name}${home && c ? h` <span class="muted small">· ${fmtDist(distM(home, c))} Luftlinie</span>` : ''}</li>`; })}</ul></div>` : ''}
    <div class="card"><h3>Notrufnummern</h3><div class="numgrid">${country.numbers.slice(0, 4).map(([n, t]) => h`<button class="numbtn" data-act="call" data-n="${n}"><b>${n}</b><span>${t}</span></button>`)}</div></div>`,
  };
});

route('/more', H => {
  const shopN = H.shop.filter(s => !s.bought).length;
  return {
    title: 'Mehr',
    html: h`${tile('#/setup', 'users', '', 'Haushalt, Personen & Tiere', [H.people.length + ' ' + (H.people.length === 1 ? 'Person' : 'Personen'), H.pets.length ? H.pets.length + ' Tiere' : ''].filter(Boolean).join(' · '))}
    ${tile('#/wizard', 'bag', '', 'Rucksäcke & Taschen neu planen', '')}
    ${tile('#/shop', 'cart', '', 'Einkaufsliste', shopN ? shopN + ' zu besorgen' : '')}
    ${tile('#/recs', 'alert', '', 'Was fehlt?', '')}
    ${tile('#/remind', 'bell', '', 'Erinnerungen', '')}
    ${tile('#/map', 'map', '', 'Karte & Treffpunkte', [H.meeting.length ? H.meeting.length + ' Treffpunkte' : '', (DB.maps || []).length ? DB.maps.length + ' Karten' : ''].filter(Boolean).join(' · '))}
    ${tile('#/alarm', 'bell', '', 'Probealarm', (H.alarms || []).filter(a => a.enabled && alarmNext(a)).length ? 'geplant' : '')}
    ${tile('#/items', 'search', '', 'Alle Gegenstände', '')}
    ${tile('#/stock', 'box', '', 'Notfallkiste zu Hause', H.box.enabled ? H.items.filter(i => !i.archived && i.container === 'home').length + ' Positionen' : 'Optional')}
    ${DB.vaultHint ? tile('#/safe', 'lock', '', 'Dokumenten-Safe', '') : ''}
    ${tile('#/settings', 'gear', '', 'Einstellungen', '')}
    ${tile('#/sources', 'info', '', 'Hinweise & Quellen', '')}`,
  };
});
route('/sources', H => ({
  title: 'Hinweise & Quellen', back: '#/more',
  html: h`${noticeBox('rec', 'Kein amtliches Warnsystem', 'Bei Gefahr: 112 und Anweisungen der Behörden.')}
  <div class="card"><ul class="stack-s" style="padding-left:20px;margin:0"><li>Mengen, Gewichte und Tragfähigkeit sind Schätzwerte.</li><li>Wasser: ca. 2 l pro Person und Tag (Richtwert BBK).</li><li>Tragfähigkeit: grob 12 kg für Erwachsene, je Person änderbar.</li><li>Medizinische Angaben sind Erinnerungshilfen, keine Beratung.</li></ul></div>
  <div class="card flush"><div class="list">${SOURCES.concat((COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE).warn).map(([t, u]) => h`<button class="li" data-act="open-url" data-url="${u}"><span class="grow"><span class="t">${t}</span><br><span class="s">${u}</span></span>${icon('chev', 'chev')}</button>`)}</div></div>`,
}));
ACT['open-url'] = d => openExternal(d.url);
