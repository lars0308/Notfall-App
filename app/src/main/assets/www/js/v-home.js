'use strict';
/* ===== Notfall! – Startseite und „Mehr“ ===== */
function dashStats(H, S) {
  const live = H.items.filter(i => !i.archived);
  const must = live.filter(i => i.prio === 'must' && !i.nopack);
  const mustOwned = must.filter(i => i.status === 'owned').length;
  const allOwned = live.filter(i => i.status === 'owned').length;
  const bagItems_ = live.filter(i => i.container === 'bag');
  const packed = bagItems_.filter(i => i.packed && i.status === 'owned').length;
  const sup = calcSupplies(H, S);
  const lead = S.notif.leadDays || 30;
  const expiring = live.filter(i => i.status === 'owned' && i.expiry && daysUntil(i.expiry) !== null && daysUntil(i.expiry) <= lead).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const medExp = [];
  for (const p of H.people) for (const m of ((p.needs && p.needs.meds) || [])) { const dl = daysUntil(m.expiry); if (m.name && dl !== null && dl <= lead) medExp.push({ p, m, dl }); }
  const due = H.reminders.filter(r => r.enabled).slice().sort((a, b) => (a.next || '').localeCompare(b.next || '')).filter(r => { const d = daysUntil(r.next); return d !== null && d <= 30; });
  return { live, must, mustOwned, mustPct: pct(mustOwned, must.length), allOwned, allPct: pct(allOwned, live.length), bagTotal: bagItems_.length, packed, packedPct: pct(packed, bagItems_.length), sup, expiring, medExp, due, unchecked: live.filter(i => i.status === 'planned').length, missing: live.filter(i => i.status === 'missing').length };
}
function nextRow(href, ic, title, sub, count, level) {
  return h`<a class="li ${level || ''}" href="${href}">${icon(ic)}<span class="grow"><span class="t">${title}</span><br><span class="s">${sub}</span></span>${count !== undefined && count !== null ? h`<span class="count ${count ? '' : 'zero'}">${count}</span>` : ''}${icon('chev', 'chev')}</a>`;
}
route('/home', H => {
  const S = DB.settings; const st = dashStats(H, S); const rc = recCounts(H, S); const ctx = planContext(H, S); const calc = st.sup.calc;
  const setupOpen = !H.setup.done;
  const rows = [];
  if (setupOpen) rows.push(nextRow('#/wizard', 'list', H.setup.draft ? 'Einrichtung fortsetzen' : 'Einrichtung starten', 'Ein paar Fragen – dann entsteht dein persönlicher Plan.', null, 'must'));
  if (st.unchecked) rows.push(nextRow('#/review', 'check', 'Geplante Ausrüstung prüfen', `${st.unchecked} Positionen: „Habe ich“ oder „Fehlt“?`, st.unchecked, 'rec'));
  if (rc.must) rows.push(nextRow('#/recs', 'bulb', 'Notwendige Empfehlungen', 'Wichtige Lücken in deiner Vorsorge.', rc.must, 'must'));
  if (st.missing) rows.push(nextRow('#/shop', 'cart', 'Einkaufsliste', `${H.shop.filter(s => !s.bought).length} Positionen zu besorgen.`, H.shop.filter(s => !s.bought).length));
  const unpackedBags = H.bags.filter(b => bagStats(H, S, b).packedPct < 100 && bagItems(H, b).some(i => i.status === 'owned' && !i.packed));
  if (unpackedBags.length) rows.push(nextRow('#/bags', 'bag', 'Rucksäcke packen', `${unpackedBags.length} Rucksack/Rucksäcke nicht fertig gepackt.`, unpackedBags.length));
  const overdue = H.reminders.filter(r => r.enabled && daysUntil(r.next) !== null && daysUntil(r.next) <= 0).concat(itemChecks(H).filter(x => daysUntil(x.next) <= 0).map(x => ({ title: 'Kontrolle: ' + x.i.name })));
  if (overdue.length) rows.push(nextRow('#/remind', 'bell', 'Fällige Kontrollen', overdue.map(r => r.title).slice(0, 2).join(', '), overdue.length, 'rec'));
  const openTasks = H.tasks.filter(t => !t.done);
  const lockHint = !DB.users.length && H.people.some(p => p.needs && (p.needs.meds || []).length);
  return {
    title: 'Start',
    html: h`
    <div class="card"><div class="card-head"><div><h2>${H.name}</h2><p class="muted">${calc.n} ${plural(calc.n, 'Person', 'Personen')}${H.pets.length ? ' · ' + H.pets.length + ' ' + plural(H.pets.length, 'Haustier', 'Haustiere') : ''}${H.cfg ? ' · ' + (H.cfg.strategies || []).map(s => ({ home: 'Zuhause bleiben', shelter: 'Notunterkunft', mobile: 'Unterwegs' }[s])).join(', ') : ''}</p></div>
      ${H.sample ? h`<span class="badge rec">Testdaten</span>` : ''}</div>
      <div class="chips">${H.people.map(p => h`<a class="chip" href="#/people/${p.id}">${p.name} · ${p.age} J.</a>`)}</div></div>
    ${setupOpen ? noticeBox('rec', 'Dein Plan fehlt noch', 'Beantworte ein paar Fragen und die App erstellt Packlisten, Vorräte und Aufgaben für dich.', h`<div class="btns" style="margin-top:8px"><a class="btn primary" href="#/wizard">${H.setup.draft ? 'Einrichtung fortsetzen' : 'Einrichtung starten'}</a></div>`) : ''}
    <div class="card"><h2>Vorbereitungsstand</h2>
      <div class="grid c3" style="margin:12px 0">
        <div class="stat"><span class="v">${st.mustPct} %</span><span class="l">Notwendige Ausrüstung bestätigt (${st.mustOwned} von ${st.must.length})</span></div>
        <div class="stat"><span class="v">${st.packedPct} %</span><span class="l">Rucksack-Inhalt gepackt (${st.packed} von ${st.bagTotal})</span></div>
        <div class="stat"><span class="v">${H.bags.length}</span><span class="l">${plural(H.bags.length, 'Rucksack/Tasche', 'Rucksäcke/Taschen')}</span></div></div>
      ${bar(st.mustPct, st.mustPct >= 80 ? 'ok' : st.mustPct >= 40 ? 'rec' : 'must')}
      <p class="small muted" style="margin-top:8px">Das ist ein Planungsstand, kein Sicherheitsmaß: Er zeigt nur, wie viel der geplanten Liste du bestätigt hast. Er garantiert keine Sicherheit im Ernstfall.</p></div>
    ${rows.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Als Nächstes</h2></div><div class="list">${rows}</div></div>` : (H.setup.done ? noticeBox('ok', 'Alles erledigt', 'Aktuell gibt es nichts Dringendes. Prüfe regelmäßig Ablaufdaten und Rucksäcke.') : '')}
    ${ctx.homeDays > 0 ? h`<div class="card"><div class="card-head"><h2>Reichweite Hausvorrat</h2><a class="btn sm" href="#/stock">Details</a></div>
      <div class="stack"><div><div class="row spread"><span class="bold">${icon('drop')} Wasser</span><span class="mono">${fmt(st.sup.waterDays)} von ${ctx.homeDays} Tagen</span></div>${bar(pct(st.sup.waterDays, ctx.homeDays), st.sup.waterDays >= ctx.homeDays ? 'ok' : 'must')}<div class="small muted">${fmt(st.sup.waterL)} l vorhanden · Bedarf ca. ${fmt(st.sup.perDayWater)} l/Tag</div></div>
      <div><div class="row spread"><span class="bold">${icon('food')} Lebensmittel</span><span class="mono">${fmt(st.sup.foodDays)} von ${ctx.homeDays} Tagen</span></div>${bar(pct(st.sup.foodDays, ctx.homeDays), st.sup.foodDays >= ctx.homeDays ? 'ok' : 'must')}<div class="small muted">Rechnerisch (Schätzwert) · Bedarf ca. ${fmt0(calc.kcalDay)} kcal/Tag</div></div></div></div>` : ''}
    ${H.bags.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Rucksäcke</h2><a class="btn sm" href="#/bags">Alle</a></div><div class="list">${H.bags.map(b => { const s = bagStats(H, S, b); const o = byId(H.people, b.owner); return h`<a class="li ${s.overweight || s.overfull ? 'must' : ''}" href="#/bags/${b.id}"><span class="grow"><span class="t">${b.name}</span><br><span class="s">${o ? o.name + ' · ' : ''}${fmt(s.totalG / 1000)} kg${s.capKg ? ' / ' + fmt(s.capKg) + ' kg' : ''} · ${fmt0(s.fillPct)} % Volumen · ${s.packed}/${s.total} gepackt</span>${bar(s.packedPct, 'ok')}</span>${s.overweight || s.overfull ? h`<span class="badge must">${s.overfull ? 'Voll' : 'Schwer'}</span>` : ''}${icon('chev', 'chev')}</a>`; })}</div></div>` : ''}
    ${(st.expiring.length || st.medExp.length) ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Ablaufwarnungen</h2></div><div class="list">${st.medExp.map(x => h`<a class="li must" href="#/people/${x.p.id}"><span class="grow"><span class="t">Medikament: ${x.m.name} (${x.p.name})</span><br><span class="s">${fmtDate(x.m.expiry)} · ${relDays(x.m.expiry)}</span></span></a>`)}${st.expiring.slice(0, 8).map(i => h`<a class="li ${daysUntil(i.expiry) < 0 ? 'must' : 'rec'}" href="#/item/${i.id}"><span class="grow"><span class="t">${i.name}</span><br><span class="s">${fmtDate(i.expiry)} · ${relDays(i.expiry)}</span></span></a>`)}</div></div>` : ''}
    ${st.due.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Anstehende Kontrollen</h2><a class="btn sm" href="#/remind">Alle</a></div><div class="list">${st.due.slice(0, 5).map(r => h`<div class="li ${daysUntil(r.next) <= 0 ? 'rec' : ''}"><span class="grow"><span class="t">${r.title}</span><br><span class="s">${fmtDate(r.next)} · ${relDays(r.next)}</span></span><button class="btn sm ok" data-act="rem-done" data-id="${r.id}">${icon('check')} Erledigt</button></div>`)}</div></div>` : ''}
    ${openTasks.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Persönliche Aufgaben</h2><span class="badge">${openTasks.length} offen</span></div><div class="list">${openTasks.slice(0, 8).map(t => h`<label class="li" style="cursor:pointer"><input type="checkbox" style="width:1.5rem;height:1.5rem;accent-color:var(--primary)" data-change="task-toggle" data-id="${t.id}"><span class="grow"><span class="t">${t.title}</span><br><span class="s">${t.cat}${t.why ? ' · ' + t.why : ''}</span></span></label>`)}</div>${openTasks.length > 8 ? h`<div style="padding:12px 16px"><a class="btn sm" href="#/tasks">Alle ${openTasks.length} Aufgaben</a></div>` : ''}</div>` : ''}
    ${lockHint ? noticeBox('rec', 'Gesundheitsdaten schützen', 'Du hast Medikamente eingetragen. Aktiviere eine App-Sperre (PIN), damit nur du sie sehen kannst.', h`<div class="btns" style="margin-top:8px"><a class="btn" href="#/settings">Zu den Einstellungen</a></div>`) : ''}
    ${!(IS_NATIVE) ? noticeBox('info', 'Browser-Testmodus', 'Du verwendest die Web-Version. In der Android-App werden Daten mit dem Android-Keystore verschlüsselt, Benachrichtigungen und Biometrie sind aktiv.') : ''}`,
  };
});
INPUT['task-toggle'] = el => { const t = byId(HH().tasks, el.dataset.id); if (t) { t.done = el.checked; t.doneAt = new Date().toISOString(); persist(); setTimeout(rerender, 200); } };
route('/tasks', H => ({ title: 'Aufgaben', back: '#/home', html: h`<div class="card flush"><div class="list">${H.tasks.length ? H.tasks.slice().sort((a, b) => a.done - b.done).map(t => h`<label class="li ${t.done ? 'done' : ''}" style="cursor:pointer"><input type="checkbox" style="width:1.5rem;height:1.5rem;accent-color:var(--primary)" data-change="task-toggle" data-id="${t.id}" ${t.done ? raw('checked') : ''}><span class="grow"><span class="t">${t.title}</span><br><span class="s">${t.cat} · ${t.why || ''}</span></span>${t.auto ? '' : h`<button class="btn sm danger" data-act="task-del" data-id="${t.id}">${icon('trash')}</button>`}</label>`) : empty('Keine Aufgaben.')}</div></div>
  <button class="btn" data-act="task-add">${icon('plus')} Eigene Aufgabe</button>` }));
ACT['task-add'] = async () => { const t = await promptDlg('Neue Aufgabe', 'Was ist zu tun?', ''); if (!t || !t.trim()) return; HH().tasks.push({ id: uid(), key: 'u' + uid(), title: t.trim(), why: '', cat: 'Eigene', done: false, created: new Date().toISOString(), auto: false }); persist(); rerender(); };
ACT['task-del'] = d => { const H = HH(); H.tasks = H.tasks.filter(t => t.id !== d.id); persist(); rerender(); };

const MORE_CARDS = [
  ['#/review', 'check', 'Ausrüstung prüfen', 'Vorschläge bestätigen: Habe ich / Fehlt'], ['#/items', 'list', 'Inventar', 'Alle Gegenstände suchen und bearbeiten'], ['#/recs', 'bulb', 'Empfehlungen', 'Fehlteilanalyse und Hinweise'],
  ['#/safe', 'lock', 'Safe & Dokumente', 'Verschlüsselte Dokumente, Checkliste'], ['#/contacts', 'phone', 'Kontakte & Treffpunkte', 'ICE, Treffpunkte, Unterkünfte, Karten'], ['#/rooms', 'building', 'Schutzräume', 'Räume dokumentieren, Risiken markieren'],
  ['#/remind', 'bell', 'Erinnerungen', 'Kontrollen, Ablaufdaten, Benachrichtigungen'], ['#/people', 'users', 'Haushalt & Personen', 'Profile, Gesundheit, Haustiere'], ['#/tasks', 'list', 'Aufgaben', 'Persönliche To-do-Liste'],
  ['#/settings', 'gear', 'Einstellungen', 'Darstellung, Sicherheit, Backup, Daten'], ['#/sources', 'info', 'Quellen & Hinweise', 'Woher die Regeln stammen, Grenzen der App'],
];
route('/more', H => {
  const counts = navCounts();
  return { title: 'Mehr', html: h`<div class="grid c2">${MORE_CARDS.map(([href, ic, t, s]) => h`<a class="card" href="${href}" style="text-decoration:none;color:inherit;display:flex;gap:16px;align-items:flex-start;min-height:5rem">${icon(ic)}<span class="grow"><span class="bold" style="display:block">${t}</span><span class="muted small">${s}</span></span>${counts[href] ? h`<span class="count">${counts[href]}</span>` : ''}</a>`)}</div>
    <a class="btn sos block" href="#/sos" style="min-height:64px;font-size:1.125rem">${icon('alert')} Notfallmodus öffnen</a>` };
});
route('/sources', H => ({
  title: 'Quellen & Hinweise', back: '#/more',
  html: h`${noticeBox('rec', 'Wichtig', 'Notfall! ist ein Planungshelfer – kein amtliches Warnsystem, keine Rechts-, Sicherheits- oder medizinische Beratung. Bei akuter Gefahr haben Warnungen und Anweisungen der Behörden und Einsatzkräfte immer Vorrang. Notruf: 112.')}
  <div class="card"><h2>Woher kommen die Zahlen?</h2><ul class="stack-s" style="padding-left:20px;margin:0"><li>Wasser: Richtwert ca. 2 l pro Person und Tag für Trinken und Zubereiten (BBK). Kinder und Babys sind niedriger angesetzt.</li><li>Lebensmittel: Verhältnisse orientieren sich an der BBK-Vorratsempfehlung für 10 Tage; Energiebedarf nach Altersgruppe als grobe Schätzung (Erwachsene 2.200 kcal, anpassbar).</li><li>Rucksack: Tragfähigkeit grob 12 kg für Erwachsene, weniger für Kinder und Senioren. Das ist eine Orientierung, kein medizinischer Grenzwert. Du kannst sie je Person ändern.</li><li>Alle Berechnungen sind Schätzwerte und als solche gekennzeichnet.</li></ul></div>
  <div class="card"><h2>Offizielle Quellen</h2><div class="list">${SOURCES.concat((COUNTRIES[(H.cfg && H.cfg.country) || 'DE'] || COUNTRIES.DE).warn).map(([t, u]) => h`<button class="li" data-act="open-url" data-url="${u}"><span class="grow"><span class="t">${t}</span><br><span class="s">${u}</span></span>${icon('chev', 'chev')}</button>`)}</div><p class="small muted" style="margin-top:8px">Die Links öffnen im Browser (Internet nötig). Die App selbst arbeitet vollständig offline.</p></div>
  <div class="card"><h2>Grenzen</h2><ul class="stack-s" style="padding-left:20px;margin:0"><li>Die App stuft Räume nie als sicher oder zertifiziert ein.</li><li>Bereitschaftsangaben zeigen nur den Stand deiner Planung.</li><li>Medizinische Angaben sind nur Erinnerungshilfen; Medikamente und Mengen klärst du mit deiner Ärztin / deinem Arzt.</li><li>Prüfe die Regeln regelmäßig gegen aktuelle amtliche Hinweise (Stand der eingebauten Regeln: 2026).</li></ul></div>`,
}));
ACT['open-url'] = d => openExternal(d.url);
