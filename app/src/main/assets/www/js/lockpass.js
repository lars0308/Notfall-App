'use strict';
/* ===== Notfall! – Notfallpass für Rettungskräfte auf dem Sperrbildschirm =====
   Rettungskräfte schauen bei bewusstlosen Menschen zuerst auf das gesperrte Handy.
   Drei Wege: Hinweis auf dem Sperrbildschirm (mit Ansicht ohne Entsperren), Sperrbildschirm-Bild,
   Android-eigene Notfallinformationen. Verwendet nur, was im Notfallpass freigegeben ist. */

function lockPassData(H) {
  return {
    updated: fmtDate(todayISO()),
    people: H.people.map(p => ({
      name: p.name, age: p.share && p.share.birth && p.birth ? String(personAge(p)) : '',
      rows: passShared(H, p).map(([k, v]) => [String(k), String(v)]),
      contacts: passContacts(H, p).map(c => ({ name: c.name, relation: c.relation || '', phone: c.phone || '' })),
    })),
  };
}
/* Text für die Android-Notfallinformationen bzw. die Sperrbildschirm-Nachricht */
function lockPassText(H, short) {
  const d = lockPassData(H); const lines = [];
  for (const p of d.people) {
    const parts = [p.name + (p.age ? ' (' + p.age + ')' : '')].concat(p.rows.map(([k, v]) => k + ': ' + v));
    if (p.contacts[0]) parts.push('Notfall: ' + p.contacts[0].name + ' ' + p.contacts[0].phone);
    lines.push(parts.join(short ? ', ' : '\n'));
  }
  return lines.join(short ? ' | ' : '\n\n');
}
function lockPassOn(H) { return !!(H.lockPass && H.lockPass.on); }
/* Hinweis aktuell halten, wenn sich der Notfallpass ändert */
let _lockLast = '';
function lockPassSync() {
  const H = HH(); if (!NATIVE || !NATIVE.setLockPass) return;
  const on = lockPassOn(H); const json = JSON.stringify(lockPassData(H)); const key = on + json;
  if (key === _lockLast) return; _lockLast = key;
  NATIVE.setLockPass(json, on);
}

/* Sperrbildschirm-Bild: dunkel, oben Platz für Uhrzeit, Angaben in der unteren Hälfte */
function lockWallpaper(H) {
  const W = 1080, Hh = 2400; const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.fillStyle = '#0b0f14'; g.fillRect(0, 0, W, Hh);
  const d = lockPassData(H); let y = Math.round(Hh * 0.42); const x = 80, maxW = W - 160;
  g.fillStyle = '#ff5a5f'; g.font = '800 64px system-ui, sans-serif'; g.fillText('NOTFALLPASS', x, y); y += 30;
  g.fillStyle = '#9aa7b4'; g.font = '500 34px system-ui, sans-serif'; y += 44; g.fillText('Für Rettungskräfte', x, y); y += 40;
  const wrap = (text, font, color, lh) => { g.font = font; g.fillStyle = color; let line = ''; for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { y += lh; g.fillText(line, x, y); line = w; } else line = t; } if (line) { y += lh; g.fillText(line, x, y); } };
  const scale = d.people.length > 3 ? .8 : 1;
  for (const p of d.people) {
    if (y > Hh - 160) break;
    y += 30 * scale; wrap(p.name + (p.age ? ', ' + p.age + ' J.' : ''), `800 ${Math.round(52 * scale)}px system-ui, sans-serif`, '#ffffff', 62 * scale);
    for (const [k, v] of p.rows) wrap(k + ': ' + v, `600 ${Math.round(38 * scale)}px system-ui, sans-serif`, '#e7edf3', 48 * scale);
    for (const ct of p.contacts.slice(0, 2)) wrap('☎ ' + ct.name + (ct.relation ? ' (' + ct.relation + ')' : '') + ': ' + ct.phone, `700 ${Math.round(40 * scale)}px system-ui, sans-serif`, '#ffb4b6', 50 * scale);
  }
  return c.toDataURL('image/png');
}

route('/lockpass', H => {
  const d = lockPassData(H); const ice = d.people.some(p => p.contacts.length); const shared = d.people.some(p => p.rows.length);
  const on = lockPassOn(H);
  return {
    title: 'Für Rettungskräfte', back: '#/pass',
    html: h`<p class="lead">Ist jemand bewusstlos, schauen Rettungskräfte zuerst aufs Handy – ohne PIN. Hier legst du fest, was sie dort finden.</p>
    <div class="card"><h3>Das sehen Rettungskräfte</h3>
      ${d.people.map(p => h`<div style="margin-top:10px"><b>${p.name}${p.age ? ', ' + p.age : ''}</b>${p.rows.map(([k, v]) => h`<br><span class="small"><span class="muted">${k}:</span> ${v}</span>`)}${p.contacts.map(c => h`<br><span class="small">☎ ${c.name}${c.relation ? ' (' + c.relation + ')' : ''} ${c.phone}</span>`)}</div>`)}
      ${!ice ? h`<p class="tmust small" style="margin-top:10px">Noch kein Notfallkontakt im Pass.</p>` : ''}${!shared ? h`<p class="muted small" style="margin-top:6px">Keine Gesundheitsangaben freigegeben – nur Name und Kontakte.</p>` : ''}
      <a class="btn block ghost" style="margin-top:10px" href="#/pass">${icon('edit')} Notfallpass bearbeiten</a></div>
    ${IS_NATIVE ? h`<div class="card"><h3>1. Hinweis auf dem Sperrbildschirm</h3><p class="muted small">Immer sichtbar. Antippen öffnet den Notfallpass mit Anruf-Knöpfen – ohne Entsperren, ohne Zugang zur App.</p>
        <button class="btn block ${on ? 'ok' : 'primary'}" style="margin-top:8px" data-act="lp-toggle">${on ? h`${icon('check')} An – zum Ausschalten antippen` : 'Einschalten'}</button>
        ${on ? h`<button class="btn block ghost" style="margin-top:8px" data-act="lp-test">${icon('eye')} So sieht es aus</button>` : ''}</div>
      <div class="card"><h3>2. Sperrbildschirm-Bild</h3><p class="muted small">Funktioniert auf jedem Handy. Ersetzt dein Sperrbildschirm-Bild.</p>
        <button class="btn block" style="margin-top:8px" data-act="lp-wall">${icon('image')} Als Sperrbildschirm-Bild setzen</button></div>
      <div class="card"><h3>3. Android-Notfallinformationen</h3><p class="muted small">Rettungskräfte kennen diesen Weg: Sperrbildschirm → „Notruf“ → „Notfallinformationen“. Die App kopiert deine Angaben, du fügst sie dort ein.</p>
        <button class="btn block" style="margin-top:8px" data-act="lp-android">${icon('copy')} Kopieren und Einstellungen öffnen</button></div>`
    : h`<div class="notice info">${icon('info')}<div><p class="nt">Nur in der Android-App</p><p>Im Browser lässt sich der Sperrbildschirm nicht einrichten.</p></div></div>`}
    <p class="muted small">Zusätzlich hilft die gedruckte Notfallkarte im Portemonnaie – unter Notfallpass → „Karte & QR“.</p>`,
  };
});
ACT['lp-toggle'] = async () => {
  const H = HH(); const on = !lockPassOn(H);
  if (on && NATIVE && NATIVE.notifStatus && NATIVE.notifStatus() !== 'granted') { const r = await nativeAsync('requestNotifications'); if (!r.ok) { toast('Ohne Benachrichtigungen geht der Hinweis nicht.'); return; } }
  H.lockPass = Object.assign({}, H.lockPass || {}, { on }); persist(); _lockLast = ''; lockPassSync(); rerender(true);
  toast(on ? 'Notfallpass ist jetzt auf dem Sperrbildschirm' : 'Hinweis ausgeschaltet');
};
ACT['lp-test'] = () => { lockPassSync(); EXT.until = Date.now() + 120000; if (NATIVE && NATIVE.openLockPass) NATIVE.openLockPass(); };
ACT['lp-wall'] = async () => {
  const ok = await confirmDlg('Sperrbildschirm-Bild ersetzen?', h`<img src="${lockWallpaper(HH())}" alt="Vorschau" style="width:100%;border-radius:12px;border:1px solid var(--line)">`, { ok: 'Setzen' });
  if (!ok) return;
  const r = await nativeAsync('setLockWallpaper', lockWallpaper(HH()).split(',')[1]);
  toast(r.ok ? 'Sperrbildschirm-Bild gesetzt' : (r.error || 'Hat nicht geklappt'));
};
ACT['lp-android'] = () => {
  const t = lockPassText(HH(), false);
  if (NATIVE && NATIVE.copyText) NATIVE.copyText('Notfallinformationen', t);
  toast('Angaben kopiert – in den Notfallinformationen einfügen');
  EXT.until = Date.now() + 300000; if (NATIVE && NATIVE.openEmergencyInfo) setTimeout(() => NATIVE.openEmergencyInfo(), 400);
};
