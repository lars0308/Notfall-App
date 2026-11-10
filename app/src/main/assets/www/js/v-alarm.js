'use strict';
/* ===== Notfall! – Probealarm (zeitgesteuert, auch bei geschlossener App) ===== */
const ALARM_REPEAT = [[0, 'Einmalig'], [90, 'Vierteljährlich'], [180, 'Halbjährlich'], [365, 'Jährlich']];
const repeatLabel = n => (ALARM_REPEAT.find(r => r[0] === +n) || [0, n + ' Tage'])[1];

/* Naechster Termin (ms). Einmalige Alarme in der Vergangenheit: null */
function alarmNext(a, now = Date.now()) {
  const d = new Date(a.at); if (isNaN(d)) return null;
  if (d.getTime() > now) return d.getTime();
  if (!(+a.repeat > 0)) return null;
  let guard = 0; while (d.getTime() <= now && guard++ < 2000) d.setDate(d.getDate() + (+a.repeat));
  return d.getTime();
}
/* Vergangene Termine (fuer die Auswertung), neueste zuerst */
function alarmPast(a, now = Date.now(), max = 6) {
  const out = []; const d = new Date(a.at); if (isNaN(d)) return out;
  if (!(+a.repeat > 0)) return d.getTime() <= now ? [d.getTime()] : [];
  let guard = 0; while (d.getTime() <= now && guard++ < 2000) { out.push(d.getTime()); d.setDate(d.getDate() + (+a.repeat)); }
  return out.reverse().slice(0, max);
}
function alarmResult(H, id, occ, mutate) {
  H.alarmResults = H.alarmResults || [];
  let r = H.alarmResults.find(x => x.alarmId === id && x.occ === occ);
  if (!r && mutate) { r = { alarmId: id, occ, opened: null, heard: null, checks: {} }; H.alarmResults.push(r); if (H.alarmResults.length > 60) H.alarmResults.shift(); }
  if (r && mutate) mutate(r);
  return r || null;
}
function alarmFired(id, occ) {
  if (!NATIVE || !NATIVE.alarmLog) return null;
  try { return JSON.parse(NATIVE.alarmLog()).find(e => String(e.key).startsWith(`a:${id}:${occ}@`)) || null; } catch { return null; }
}
function alarmEvents(H) {
  const out = [];
  for (const a of (H.alarms || [])) {
    if (!a.enabled) continue; const at = alarmNext(a); if (!at) continue;
    out.push({ id: `a:${a.id}:${at}`, at, title: 'TESTALARM – KEINE ECHTE GEFAHR', text: `Probealarm: ${(SCEN[a.scen] || {}).label || 'Übung'}. Antippen zum Üben.`, kind: 'test', route: `#/sos?test=${a.id}&t=${at}&s=${a.scen}`, exact: true });
  }
  return out;
}

const CHECKS = [['bags', 'Taschen am Lagerort gefunden'], ['contacts', 'Notfallkontakte aktuell'], ['gear', 'Wichtiges vollständig (Medikamente, Kinderbedarf)']];
function alarmEvalCard(H, a, occ, r) {
  r = r || {};
  return h`<div class="card"><h2>Auswertung</h2><div class="stack-s" style="margin-top:8px">
    <div class="row spread"><span>Ton / Vibration gehört?</span><span class="btns"><button class="btn sm ${r.heard === 'yes' ? 'ok' : ''}" data-act="al-heard" data-id="${a.id}" data-t="${occ}" data-v="yes">Ja</button><button class="btn sm ${r.heard === 'no' ? 'danger' : ''}" data-act="al-heard" data-id="${a.id}" data-t="${occ}" data-v="no">Nein</button></span></div>
    ${CHECKS.map(([k, l]) => h`<label class="check"><input type="checkbox" data-change="al-check" data-id="${a.id}" data-t="${occ}" data-k="${k}" ${r.checks && r.checks[k] ? raw('checked') : ''}><span class="t">${l}</span></label>`)}
  </div><div class="actionbar"><button class="btn primary lg" data-act="al-finish">${icon('check')} Test abschließen</button></div></div>`;
}
ACT['al-heard'] = d => { alarmResult(HH(), d.id, +d.t, r => { r.heard = d.v; }); persist(); rerender(true); };
INPUT['al-check'] = el => { alarmResult(HH(), el.dataset.id, +el.dataset.t, r => { r.checks[el.dataset.k] = el.checked; }); persist(); };
ACT['al-finish'] = () => { SOSUI.done.clear(); go('#/alarm'); };

function evalRows(H, a, occ) {
  const r = alarmResult(H, a.id, occ) || {}; const f = alarmFired(a.id, occ);
  const st = (ok, label) => ok === true ? h`<span class="badge ok">${label || 'ja'}</span>` : ok === false ? h`<span class="badge must">${label || 'nein'}</span>` : h`<span class="badge">nicht geprüft</span>`;
  return h`<table class="tbl"><tbody>
    <tr><th>Ausgelöst</th><td>${f ? st(true, 'ja, ' + new Date(f.firedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) : st(null)}${f && f.shown === false ? h` <span class="badge must">Benachrichtigungen blockiert</span>` : ''}</td></tr>
    <tr><th>Geöffnet</th><td>${r.opened ? st(true, 'ja') : st(null)}</td></tr>
    <tr><th>Ton/Vibration</th><td>${r.heard === 'yes' ? st(true) : r.heard === 'no' ? st(false) : st(null)}</td></tr>
    ${CHECKS.map(([k, l]) => h`<tr><th>${l}</th><td>${r.checks && r.checks[k] ? st(true) : st(null)}</td></tr>`)}</tbody></table>`;
}

route('/alarm', H => {
  H.alarms = H.alarms || [];
  const ex = NATIVE && NATIVE.exactAlarmStatus ? NATIVE.exactAlarmStatus() : 'na';
  const notif = NATIVE && NATIVE.notifStatus ? NATIVE.notifStatus() : 'browser';
  return {
    title: 'Probealarm', back: '#/more',
    html: h`${notif === 'denied' ? noticeBox('must', 'Benachrichtigungen blockiert', 'Ohne Erlaubnis erscheint kein Probealarm.', h`<button class="btn sm" data-act="open-settings" data-k="notif">Erlauben</button>`) : ''}
    ${ex === 'denied' ? noticeBox('rec', 'Uhrzeit ungefähr', 'Ohne „Alarme & Erinnerungen“ kann Android den Test um einige Minuten verschieben.', h`<button class="btn sm" data-act="open-settings" data-k="exact">Genaue Uhrzeit erlauben</button>`) : ''}
    ${!IS_NATIVE ? noticeBox('info', 'Nur in der Android-App', 'Im Browser wird kein Alarm ausgelöst.') : ''}
    ${H.alarms.length ? H.alarms.slice().sort((x, y) => (alarmNext(x) || 9e15) - (alarmNext(y) || 9e15)).map(a => { const nx = alarmNext(a); const past = alarmPast(a); return h`<div class="card"><div class="row spread"><div><h3>${(SCEN[a.scen] || {}).label || 'Übung'}</h3><p class="muted small">${repeatLabel(a.repeat)} · ${nx ? 'nächster Test ' + new Date(nx).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'kein weiterer Termin'}${a.enabled ? '' : ' · aus'}</p></div>
        <span class="btns"><a class="btn sm" href="${sosHash({ s: a.scen, test: a.id, t: past[0] || nx || '' })}">Ansehen</a><button class="btn icon sm danger" data-act="al-del" data-id="${a.id}" aria-label="Löschen">${icon('trash')}</button></span></div>
        ${past.length ? h`<details style="margin-top:8px"><summary style="min-height:40px;display:flex;align-items:center;cursor:pointer">Auswertung (${past.length})</summary>${past.map(o => h`<p class="bold small" style="margin-top:8px">${new Date(o).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</p>${evalRows(H, a, o)}`)}</details>` : ''}</div>`; }) : empty('Kein Probealarm geplant.')}
    <div class="actionbar"><button class="btn lg" data-act="al-soon">In 1 Minute</button><button class="btn primary lg" data-act="al-new">${icon('plus')} Planen</button></div>`,
  };
});

async function alarmPermission() {
  if (!IS_NATIVE) return true;
  const r = await nativeAsync('requestNotifications'); if (!r.ok) { toast('Benachrichtigungen sind nicht erlaubt.'); return false; } return true;
}
function addAlarm(o) { const H = HH(); H.alarms = H.alarms || []; const a = Object.assign({ id: uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 12), enabled: true, created: new Date().toISOString() }, o); H.alarms.push(a); persist(); flushDB(); syncNotifications(); return a; }
const localDT = d => `${isoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
ACT['al-new'] = () => {
  const d = new Date(Date.now() + 86400000); d.setHours(18, 0, 0, 0);
  formDlg({ title: 'Probealarm planen', ok: 'Planen', body: h`${F.select('scen', 'Übung', Object.entries(SCEN).map(([k, v]) => [k, v.label]), 'storm_warn')}
      <div class="form-grid">${F.date('date', 'Datum', isoDate(d), { req: true })}${F.text('time', 'Uhrzeit', '18:00', { type: 'time', req: true })}</div>${F.select('repeat', 'Wiederholen', ALARM_REPEAT, 0)}`,
    onSubmit: async fd => {
      const at = `${fd.get('date')}T${fd.get('time')}`; if (isNaN(new Date(at)) || new Date(at).getTime() < Date.now() + 30000) throw new Error('Zeitpunkt liegt in der Vergangenheit.');
      if (!(await alarmPermission())) return false;
      addAlarm({ scen: fd.get('scen'), at, repeat: +fd.get('repeat') }); rerender(true); toast('Probealarm geplant');
    } });
};
ACT['al-soon'] = async () => { if (!(await alarmPermission())) return; addAlarm({ scen: 'storm_warn', at: localDT(new Date(Date.now() + 65000)), repeat: 0 }); rerender(true); toast(IS_NATIVE ? 'Testalarm in etwa einer Minute' : 'Im Browser wird kein Alarm ausgelöst'); };
ACT['al-del'] = async d => { const ok = await confirmDlg('Probealarm löschen?', '', { ok: 'Löschen', danger: true }); if (!ok) return; const H = HH(); H.alarms = H.alarms.filter(a => a.id !== d.id); persist(); syncNotifications(); rerender(true); };
