'use strict';
/* ===== Notfall! – Erinnerungen und lokale Benachrichtigungen ===== */
const INTERVALS = [[0, 'Einmalig'], [30, 'Monatlich'], [90, 'Vierteljährlich'], [180, 'Halbjährlich'], [365, 'Jährlich']];
const intervalLabel = n => (INTERVALS.find(x => x[0] === +n) || [0, n + ' Tage'])[1];
route('/remind', H => {
  const S = DB.settings; const list = H.reminders.slice().sort((a, b) => (a.next || '9').localeCompare(b.next || '9'));
  const exp = H.items.filter(i => !i.archived && i.status === 'owned' && i.expiry).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 15);
  const st = NATIVE && NATIVE.notifStatus ? NATIVE.notifStatus() : 'browser';
  return {
    title: 'Erinnerungen', back: '#/more', actions: h`<button class="btn primary sm" data-act="rem-edit" data-id="">${icon('plus')}<span>Neu</span></button>`,
    html: h`${!S.notif.on ? h`<button class="tile orange" data-act="notif-enable"><span class="ti">${icon('bell')}</span><span class="grow"><span class="tt">Benachrichtigungen einschalten</span><br><span class="ts">Erinnert auch bei geschlossener App</span></span></button>`
        : st === 'denied' ? noticeBox('must', 'Android blockiert Benachrichtigungen', '', h`<button class="btn sm" data-act="open-settings" data-k="notif">System-Einstellungen</button>`)
        : h`<div class="btns"><button class="btn sm" data-act="notif-test">Testmeldung in 1 Minute</button><button class="btn sm" data-act="open-settings" data-k="battery">Akku-Optimierung</button></div>`}
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Kontrollen</h2></div><div class="list">${list.length ? list.map(r => { const d = daysUntil(r.next); return h`<div class="li ${r.enabled && d !== null && d <= 0 ? 'rec' : ''}" style="flex-wrap:wrap"><button style="background:none;border:0;text-align:left;cursor:pointer;color:inherit;padding:0" class="grow" data-act="rem-edit" data-id="${r.id}"><span class="t">${r.title}</span> ${r.enabled ? '' : h`<span class="badge">Aus</span>`}<br><span class="s">${r.interval ? intervalLabel(r.interval) + ' · ' : ''}nächste: ${r.next ? fmtDate(r.next) + ' (' + relDays(r.next) + ')' : '–'}</span></button>${r.enabled ? h`<button class="btn sm ok" data-act="rem-done" data-id="${r.id}">${icon('check')} Erledigt</button>` : ''}</div>`; }) : empty('Keine Erinnerungen.')}</div></div>
    ${itemChecks(H).length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Kontrollen einzelner Gegenstände</h2></div><div class="list">${itemChecks(H).map(x => h`<div class="li ${daysUntil(x.next) <= 0 ? 'rec' : ''}" style="flex-wrap:wrap"><a class="grow" href="#/item/${x.i.id}" style="color:inherit;text-decoration:none"><span class="t">${x.i.name}</span><br><span class="s">alle ${x.i.remindDays} Tage · nächste: ${fmtDate(x.next)} (${relDays(x.next)})</span></a><button class="btn sm ok" data-act="item-checked" data-id="${x.i.id}">${icon('check')} Geprüft</button></div>`)}</div></div>` : ''}
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Ablaufdaten aus dem Inventar</h2></div><div class="list">${exp.length ? exp.map(i => h`<a class="li ${daysUntil(i.expiry) < 0 ? 'must' : daysUntil(i.expiry) <= S.notif.leadDays ? 'rec' : ''}" href="#/item/${i.id}"><span class="grow"><span class="t">${i.name}</span><br><span class="s">${fmtDate(i.expiry)} · ${relDays(i.expiry)}</span></span>${icon('chev', 'chev')}</a>`) : empty('Keine Gegenstände mit Ablaufdatum.')}</div></div>`,
  };
});
ACT['rem-done'] = d => { const r = byId(HH().reminders, d.id); if (!r) return; r.lastDone = todayISO(); if (r.interval > 0) r.next = addDays(todayISO(), r.interval); else r.enabled = false; persist(); rerender(true); toast(r.interval > 0 ? 'Nächste Kontrolle ' + fmtDate(r.next) : 'Erledigt'); };
ACT['rem-edit'] = d => {
  const H = HH(); const r = d.id ? byId(H.reminders, d.id) : { title: '', text: '', interval: 90, next: addDays(todayISO(), 30), enabled: true };
  const ivOpts = INTERVALS.some(x => x[0] === +r.interval) ? INTERVALS : [...INTERVALS, [r.interval, r.interval + ' Tage']];
  formDlg({ title: d.id ? 'Erinnerung bearbeiten' : 'Neue Erinnerung', body: h`${F.text('title', 'Titel', r.title, { req: true })}${F.area('text', 'Beschreibung', r.text || '', { rows: 2 })}<div class="form-grid">${F.select('interval', 'Wiederholung', ivOpts, r.interval)}${F.date('next', 'Nächster Termin', r.next, { req: true })}</div>${F.check('enabled', 'Aktiv', r.enabled)}`,
    extraFoot: d.id ? [{ label: 'Löschen', cls: 'danger', act: 'rem-del', data: { id: d.id } }] : [],
    onSubmit: fd => { const o = { title: fd.get('title').trim(), text: fd.get('text'), interval: +fd.get('interval'), next: fd.get('next'), enabled: fdBool(fd, 'enabled') }; if (!o.title || !o.next) throw new Error('Titel und Termin sind nötig.'); if (d.id) Object.assign(r, o); else H.reminders.push(Object.assign({ id: uid(), key: 'u' + uid(), auto: false, lastDone: null }, o)); persist(); rerender(true); } });
};
ACT['rem-del'] = async d => { const ok = await confirmDlg('Erinnerung löschen?', 'Die Erinnerung wird entfernt.', { ok: 'Löschen', danger: true }); if (!ok) return; const H = HH(); H.reminders = H.reminders.filter(r => r.id !== d.id); closeAllModals(); persist(); rerender(true); };

/* ---- Benachrichtigungsereignisse ---- */
function notifAt(iso, hour) { const d = parseISO(iso); if (!d) return 0; d.setHours(hour, 0, 0, 0); return d.getTime(); }
function buildNotifEvents() {
  const S = DB.settings; const evs = []; const alarms = DB.households.flatMap(H => alarmEvents(H));
  if (!S.notif.on) return alarms;
  const now = Date.now(); const hr = S.notif.hour; const lead = S.notif.leadDays || 30;
  const push = (id, at, title, text) => { if (at && at > now - 30 * 86400000 && at < now + 130 * 86400000) evs.push({ id, at, title, text }); };
  for (const H of DB.households) {
    for (const r of H.reminders) {
      if (!r.enabled || !r.next) continue; const t = notifAt(r.next, hr);
      push('r:' + r.id, t, 'Notfall!: ' + r.title, r.text || 'Kontrolle fällig');
      if (t <= now) for (let k = 1; k <= 6; k++) { const d = new Date(); d.setDate(d.getDate() + k); d.setHours(hr, 0, 0, 0); push('r:' + r.id + ':f' + k + ':' + r.next, d.getTime(), 'Notfall!: ' + r.title, 'Noch offen seit ' + fmtDate(r.next)); }
    }
    for (const i of H.items) {
      const cn = itemRemindNext(i); if (!i.archived && i.status === 'owned' && cn) push('c:' + i.id + ':' + cn, notifAt(cn, hr), 'Notfall!: Kontrolle fällig', 'Ein Gegenstand soll geprüft werden. Details in der App.');
      if (i.archived || i.status !== 'owned' || !i.expiry) continue;
      push('e:' + i.id + ':l:' + i.expiry, notifAt(addDays(i.expiry, -lead), hr), 'Notfall!: Ablaufdatum naht', 'Ein Gegenstand läuft in ' + lead + ' Tagen ab. Details in der App.');
      push('e:' + i.id + ':w:' + i.expiry, notifAt(addDays(i.expiry, -7), hr), 'Notfall!: Läuft in 7 Tagen ab', 'Bitte Vorrat prüfen und ersetzen.');
      push('e:' + i.id + ':x:' + i.expiry, notifAt(i.expiry, hr), 'Notfall!: Abgelaufen', 'Ein Gegenstand ist heute abgelaufen.');
    }
    for (const p of H.people) for (const m of ((p.needs && p.needs.meds) || [])) if (m.expiry) push('m:' + m.id + ':' + m.expiry, notifAt(addDays(m.expiry, -lead), hr), 'Notfall!: Medikamente prüfen', 'Ein Medikament läuft bald ab.');
  }
  if (UI.testNotifAt) evs.push({ id: 'test', at: UI.testNotifAt, title: 'Notfall!: Test', text: 'Benachrichtigungen funktionieren.' });
  evs.sort((a, b) => a.at - b.at);
  return alarms.concat(evs.slice(0, 140 - alarms.length));
}
function syncNotifications() {
  if (!IS_NATIVE || !NATIVE.scheduleReminders) return 0;
  try { return NATIVE.scheduleReminders(JSON.stringify(buildNotifEvents())); } catch (e) { console.error(e); return -1; }
}
const onDataChanged = debounce(() => { try { syncNotifications(); } catch (e) { /* ignorieren */ } try { if (typeof lockPassSync === 'function') lockPassSync(); } catch (e) { /* ignorieren */ } }, 2500);
ACT['notif-enable'] = async () => {
  if (IS_NATIVE) { const r = await nativeAsync('requestNotifications'); if (!r.ok) { toast('Android hat Benachrichtigungen nicht erlaubt.'); DB.settings.notif.on = false; persist(); NATIVE.openSettings && confirmDlg('Benachrichtigungen erlauben', 'Öffne die Systemeinstellungen und aktiviere Benachrichtigungen für Notfall!.', { ok: 'Einstellungen öffnen' }).then(ok => ok && NATIVE.openSettings('notif')); rerender(true); return; } }
  DB.settings.notif.on = true; persist(); syncNotifications(); rerender(true); toast(IS_NATIVE ? 'Benachrichtigungen eingeschaltet' : 'Im Browser-Test werden keine System-Benachrichtigungen gesendet.');
};
ACT['notif-test'] = () => { UI.testNotifAt = Date.now() + 65000; const n = syncNotifications(); toast(n >= 0 ? 'Testmeldung in etwa einer Minute' : 'Planung fehlgeschlagen'); };
ACT['open-settings'] = d => { if (NATIVE && NATIVE.openSettings) NATIVE.openSettings(d.k); };

function itemChecks(H) { return H.items.filter(i => !i.archived && i.status === 'owned' && +i.remindDays > 0).map(i => ({ i, next: itemRemindNext(i) })).sort((a, b) => a.next.localeCompare(b.next)); }
ACT['item-checked'] = d => { const it = byId(HH().items, d.id); if (!it) return; it.lastCheck = todayISO(); persist(); rerender(true); toast('Kontrolle vermerkt – nächste: ' + fmtDate(itemRemindNext(it))); };
