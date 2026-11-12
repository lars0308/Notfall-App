'use strict';
/* ===== Notfall! – Start und „Mehr“ ===== */
function tile(href, ic, color, title, sub, right) {
  return h`<a class="tile ${color}" href="${href}"><span class="ti">${icon(ic)}</span><span class="grow"><span class="tt">${title}</span>${sub ? h`<br><span class="ts">${sub}</span>` : ''}</span>${right || icon('chev', 'chev')}</a>`;
}
function bagLine(st) { return `${st.have} von ${st.total} da`; }
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

/* Genau ein nächster Schritt – damit klar ist, was zu tun ist */
function nextStep(H) {
  for (const b of packBags(H)) { const c = nextOpenCat(H, b); if (c) { const its = bagItemsOf(H, b.id); const n = its.filter(i => i.status === 'owned').length;
    return h`<a class="nextstep" href="#/bags?open=${b.id}"><span class="ns-k">Als Nächstes</span><span class="ns-t">${n ? 'Weiter packen' : 'Packen'}: ${b.name}</span><span class="ns-s">${n} von ${its.length} da · noch offen: ${c.short || c.label}</span>${icon('chev', 'chev')}</a>`; } }
  const miss = needList(H).filter(g => g.prio === 'must');
  if (miss.length) return h`<a class="nextstep" href="#/needs"><span class="ns-k">Als Nächstes</span><span class="ns-t">Einkaufen: ${miss.length} wichtige Sachen</span><span class="ns-s">Liste nach Geschäften sortiert</span>${icon('chev', 'chev')}</a>`;
  if (IS_NATIVE && !lockPassOn(H) && H.people.length) return h`<a class="nextstep" href="#/lockpass"><span class="ns-k">Als Nächstes</span><span class="ns-t">Notfallpass auf den Sperrbildschirm</span><span class="ns-s">Damit Rettungskräfte ihn ohne PIN finden</span>${icon('chev', 'chev')}</a>`;
  return h`<div class="nextstep ok"><span class="ns-k">Alles bereit</span><span class="ns-t">Eure Rucksäcke sind gepackt</span><span class="ns-s">Nächste Kontrolle steht unten unter „Termine“.</span></div>`;
}
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
  const needAll = needList(H); const mustN = needAll.filter(g => g.prio === 'must').length; const needs = mustN ? needAll.filter(g => g.prio === 'must') : needAll.filter(g => g.prio === 'rec');
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
    html: h`${nextStep(H)}
    <div class="stats two">${stat(`${have.length}/${live.length}`, 'da', have.length === live.length && live.length ? 'ok' : '')}${stat(miss.length, miss.length === 1 ? 'fehlt' : 'fehlen', miss.length ? 'must' : 'ok')}</div>
    ${needs.length ? h`<div class="card"><div class="row spread"><h3>${mustN ? 'Das fehlt noch' : 'Noch sinnvoll'}</h3>${mustN ? h`<span class="badge must">${mustN} wichtig</span>` : ''}</div><ul class="plain">${needs.slice(0, 3).map(g => h`<li><b>${g.name}</b><span class="muted small"> · ${fmt(g.qty)} ${g.unit}</span></li>`)}</ul>
      <a class="btn primary block" style="margin-top:12px" href="#/needs">${icon('cart')} ${needs.length > 3 ? `Alle ${needs.length} ansehen` : 'Ansehen'}</a></div>` : ''}
    <div class="card"><h3>Termine</h3><ul class="plain">
      ${rem.length ? rem.map(r => h`<li>${r.title}: <b>${fmtDate(r.next)}</b> <span class="muted small">(${inDays(daysUntil(r.next))})</span></li>`) : h`<li class="muted">Keine Kontrolle geplant</li>`}
      ${al ? h`<li>Probealarm: <b>${new Date(al).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</b></li>` : ''}
      ${exp.map(i => h`<li><span class="${daysUntil(i.expiry) < 0 ? 'tmust' : 'trec'}">${i.name}</span> läuft ab: ${fmtDate(i.expiry)} <span class="muted small">(${inDays(daysUntil(i.expiry))})</span></li>`)}</ul></div>
    <div class="card"><h3>Haushalt</h3>
      ${hs.place ? h`<p class="muted" style="margin-top:4px">${icon('map')} ${hs.place}</p>` : ''}
      <div class="chips" style="margin-top:10px">${H.people.map(p => h`<span class="chip static">${avatar(p.photo, p.name, 'sm')} ${p.name}</span>`)}${H.pets.map(t => h`<span class="chip static">${icon('paw')} ${t.name || t.species}</span>`)}</div>
      ${H.people.length ? h`<p style="margin-top:10px">Bedarf pro Tag: <b>${fmt0(kcal)} kcal</b> · <b>${fmt(water)} l Wasser</b></p><p class="muted small">Für ${hours} Stunden: ${fmt(water * hours / 24)} l Trinkwasser</p>` : ''}
      ${!ice ? h`<p class="tmust" style="margin-top:8px">Noch kein Notfallkontakt eingetragen.</p>` : h`<p class="muted small" style="margin-top:8px">${ice} ${ice === 1 ? 'Notfallkontakt' : 'Notfallkontakte'}</p>`}</div>
    ${meet.length ? h`<div class="card"><h3>Treffpunkte</h3><ul class="plain">${meet.map((m, k) => { const c = placeCoord(m); return h`<li>${k + 1}. ${m.name}${home && c ? h` <span class="muted small">· ${fmtDist(distM(home, c))} Luftlinie</span>` : ''}</li>`; })}</ul></div>` : ''}`,
  };
});

route('/more', H => {
  const shopN = H.shop.filter(s => !s.bought).length;
  const row = (href, ic, t, sub) => h`<a class="li morerow" href="${href}"><span class="mi">${icon(ic)}</span><span class="grow"><span class="t">${t}</span>${sub ? h`<br><span class="s">${sub}</span>` : ''}</span>${icon('chev', 'chev')}</a>`;
  const sec = (title, rows) => h`<div><h2 class="sec">${title}</h2><div class="card flush"><div class="list">${rows}</div></div></div>`;
  return {
    title: 'Mehr',
    html: h`${sec('Haushalt & Planung', h`${row('#/setup', 'users', 'Haushalt, Personen & Tiere', [H.people.length + ' ' + (H.people.length === 1 ? 'Person' : 'Personen'), H.pets.length ? H.pets.length + ' Tiere' : ''].filter(Boolean).join(' · '))}
      ${row('#/wizard', 'bag', 'Rucksäcke & Taschen neu planen', '')}
      ${row('#/map', 'map', 'Karte & Treffpunkte', [H.meeting.length ? H.meeting.length + ' Treffpunkte' : '', (DB.maps || []).length ? DB.maps.length + ' Karten' : ''].filter(Boolean).join(' · '))}`)}
    ${sec('Einkaufen & Vorrat', h`${row('#/needs', 'alert', 'Was fehlt?', '')}
      ${row('#/shop', 'cart', 'Einkaufsliste', shopN ? shopN + ' zu besorgen' : '')}
      ${row('#/stock', 'box', 'Notfallkiste zu Hause', H.box.enabled ? H.items.filter(i => !i.archived && i.container === 'home').length + ' Positionen' : 'Optional')}
      ${row('#/items', 'search', 'Alle Gegenstände', '')}`)}
    ${sec('Üben & Erinnern', h`${row('#/remind', 'bell', 'Erinnerungen', '')}
      ${row('#/alarm', 'clock', 'Probealarm', (H.alarms || []).filter(a => a.enabled && alarmNext(a)).length ? 'geplant' : '')}`)}
    ${sec('App', h`${row('#/settings', 'gear', 'Einstellungen', '')}${DB.vaultHint ? row('#/safe', 'lock', 'Dokumenten-Safe', '') : ''}
      ${row('#/sources', 'info', 'Hinweise & Quellen', '')}`)}`,
  };
});
route('/sources', H => ({
  title: 'Hinweise & Quellen', back: '#/more',
  html: h`${noticeBox('rec', 'Kein amtliches Warnsystem', 'Bei Gefahr: 112 und Anweisungen der Behörden.')}
  <div class="card"><ul class="stack-s" style="padding-left:20px;margin:0"><li>Mengen, Gewichte und Tragfähigkeit sind Schätzwerte.</li><li>Wasser: ca. 2 l pro Person und Tag (Richtwert BBK).</li><li>Tragfähigkeit: grob 12 kg für Erwachsene, je Person änderbar.</li><li>Medizinische Angaben sind Erinnerungshilfen, keine Beratung.</li></ul></div>
  <div class="card flush"><div class="list">${SOURCES.concat((COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE).warn).filter((x, i, all) => all.findIndex(y => y[1].replace(/\/$/, '') === x[1].replace(/\/$/, '')) === i).map(([t, u]) => h`<button class="li" data-act="open-url" data-url="${u}"><span class="grow"><span class="t">${t}</span><br><span class="s">${u}</span></span>${icon('chev', 'chev')}</button>`)}</div></div>`,
}));
ACT['open-url'] = d => openExternal(d.url);
