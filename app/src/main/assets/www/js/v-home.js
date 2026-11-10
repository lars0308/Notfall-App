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
route('/home', H => {
  const S = DB.settings; const nc = nextCheck(H);
  const unchecked = H.items.filter(i => !i.archived && i.status === 'planned').length;
  const shopN = H.shop.filter(s => !s.bought).length;
  return {
    title: 'Notfall!',
    html: h`
    ${H.bags.map(b => { const st = bagStats(H, S, b); return h`<a class="tile" href="#/bags/${b.id}">${b.photos[0] ? thumb(b.photos[0]) : h`<span class="ti">${icon(b.role === 'car' ? 'car' : 'bag')}</span>`}<span class="grow"><span class="tt">${b.name}</span><br><span class="ts">${bagLine(st)}</span><span style="display:block;margin-top:6px">${bar(st.packedPct, 'ok')}</span></span>${icon('chev', 'chev')}</a>`; })}
    ${unchecked ? tile('#/review', 'check', 'orange', 'Packliste prüfen', unchecked + ' offen', h`<span class="count">${unchecked}</span>`) : ''}
    <button class="tile blue" data-act="bag-new"><span class="ti">${icon('plus')}</span><span class="grow"><span class="tt">Neue Tasche anlegen</span></span></button>
    ${tile('#/wizard', 'list', 'orange', H.setup.draft ? 'Packassistent fortsetzen' : 'Packliste erstellen', '')}
    ${tile('#/pass', 'shield', 'red', 'Notfallpass & Kontakte', H.people.length ? H.people.map(p => p.name).join(', ') : '')}
    ${nc.r ? h`<div class="tile green"><span class="ti">${icon('bell')}</span><a class="grow" href="#/remind" style="color:inherit;text-decoration:none"><span class="tt">${nc.r.title}</span><br><span class="ts">Nächste Kontrolle · ${fmtDate(nc.r.next)}${nc.exp ? ' · ' + nc.exp + ' Ablaufdaten' : ''}</span></a>${daysUntil(nc.r.next) <= 0 ? h`<button class="btn sm ok" data-act="rem-done" data-id="${nc.r.id}">${icon('check')} Erledigt</button>` : ''}</div>` : tile('#/remind', 'bell', 'green', 'Nächste Kontrolle', 'Keine geplant')}
    ${shopN ? tile('#/shop', 'cart', '', 'Einkaufsliste', shopN + ' zu besorgen', h`<span class="count">${shopN}</span>`) : ''}`,
  };
});

route('/more', H => {
  const shopN = H.shop.filter(s => !s.bought).length;
  return {
    title: 'Mehr',
    html: h`${tile('#/shop', 'cart', '', 'Einkaufsliste', shopN ? shopN + ' zu besorgen' : '')}
    ${tile('#/recs', 'alert', '', 'Was fehlt?', '')}
    ${tile('#/remind', 'bell', '', 'Erinnerungen', '')}
    ${tile('#/places', 'map', '', 'Treffpunkte', H.meeting.length ? H.meeting.length + ' gespeichert' : '')}
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
