'use strict';
/* ===== Notfall! – „Haushalt anlegen“: Willkommen, Haushalt, Personen, Tiere, Notfallkontakte, Treffpunkte, Notfallpass ===== */
const BLOOD_TYPES = ['', '0+', '0−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'];
const FITNESS = [['low', 'Wenig aktiv'], ['mid', 'Normal'], ['high', 'Sportlich']];
const WZ_SHARE = [['photo', 'Foto'], ['allergies', 'Allergien'], ['conditions', 'Vorerkrankungen'], ['meds', 'Medikamente'], ['blood', 'Blutgruppe'], ['aids', 'Hilfsmittel']];
const WZ_MAX_PEOPLE = 30;
const AGE_GROUPS = [['baby', 'Baby', '0–2', 1], ['child', 'Kind', '3–12', 8], ['teen', 'Jugendlich', '13–17', 15], ['adult', 'Erwachsen', '18–64', 35], ['senior', 'Senior', '65+', 70]];
const ageGroupOf = a => a === '' || a === null || a === undefined ? 'adult' : +a < 3 ? 'baby' : +a < 13 ? 'child' : +a < 18 ? 'teen' : +a < 65 ? 'adult' : 'senior';
const MARITAL = [['', '– keine Angabe –'], ['single', 'ledig'], ['married', 'verheiratet'], ['partner', 'eingetragene Partnerschaft'], ['divorced', 'geschieden'], ['widowed', 'verwitwet']];
function ageFromBirth(b) { const d = new Date(b); if (isNaN(d)) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a >= 0 && a <= 110 ? a : null; }
const ageInvalid = p => p.age === '' || p.age === null || p.age === undefined || isNaN(+p.age) || +p.age < 0 || +p.age > 110;
const coordLine = o => typeof o.lat === 'number' ? `${o.lat.toFixed(5)}, ${o.lon.toFixed(5)}` : '';

WZ_STEP.welcome = {
  view: () => ({
    q: 'Hallo und willkommen!',
    body: h`<p class="lead">Schön, dass du da bist. Mit Notfall! packst du in Ruhe die Rucksäcke für dich und deine Familie – damit im Ernstfall alles griffbereit ist und niemand lange suchen muss.</p>
      <div class="card"><ol class="steps"><li><b>Euch anlegen</b><span>Wer wohnt bei euch, wer ist im Notfall zu erreichen, wo trefft ihr euch?</span></li><li><b>Rucksäcke wählen</b><span>Wer trägt was – die App schlägt den passenden vor.</span></li><li><b>Packen</b><span>Abhaken, was da ist. Was fehlt, landet auf der Einkaufsliste.</span></li></ol></div>
      <p class="muted small">Dauert etwa 10 Minuten. Alles bleibt auf deinem Handy – kein Konto, keine Cloud. Du kannst jederzeit aufhören und später weitermachen.</p>
      <button class="btn ghost block" data-act="load-sample">Erst mal mit Beispieldaten umschauen</button>`,
    foot: h`<button class="btn primary lg" data-act="wz-next">Los geht's ${icon('chev')}</button>`,
  }),
};

/* Berechtigungen gleich am Anfang – jede mit kurzem Grund, alles freiwillig */
const PERMS = [
  ['notif', 'bell', 'Benachrichtigungen', 'Damit wir dich an Rucksack-Kontrollen, Ablaufdaten und den Probealarm erinnern.'],
  ['exact', 'clock', 'Pünktliche Alarme', 'Damit der Probealarm genau zur eingestellten Zeit kommt.'],
  ['location', 'map', 'Standort', 'Für deine Adresse, Treffpunkte in der Nähe und die Entfernung dorthin.'],
  ['camera', 'camera', 'Kamera', 'Für Fotos von Personen, Rucksäcken und Sachen.'],
];
function permState(k) {
  if (!NATIVE) return 'na';
  try {
    if (k === 'notif') return NATIVE.notifStatus ? NATIVE.notifStatus() : 'na';
    if (k === 'exact') return NATIVE.exactAlarmStatus ? NATIVE.exactAlarmStatus() : 'na';
    return NATIVE.permStatus ? NATIVE.permStatus(k) : 'na';
  } catch { return 'na'; }
}
WZ_STEP.perms = {
  view: () => ({
    q: 'Ein paar Erlaubnisse',
    body: h`<p class="muted">Die App fragt nur, was sie wirklich braucht. Du kannst alles auch später in den Handy-Einstellungen ändern.</p>
      <div class="stack-s">${PERMS.map(([k, ic, t, why]) => { const st = permState(k); if (st === 'na') return ''; return h`<div class="person-card perm"><div class="row nowrap"><span class="ti">${icon(ic)}</span><div class="grow"><b>${t}</b><br><span class="muted small">${why}</span></div></div>
        ${st === 'granted' ? h`<p class="tok small bold" style="margin-top:8px">${icon('check')} Erlaubt</p>` : h`<button class="btn block" style="margin-top:8px" data-act="perm-ask" data-k="${k}">Erlauben</button>`}</div>`; })}
        <div class="person-card perm"><div class="row nowrap"><span class="ti">${icon('users')}</span><div class="grow"><b>Telefonbuch und Karten</b><br><span class="muted small">Keine Erlaubnis nötig: Kontakte wählst du einzeln aus, Internet wird nur für Karten und die Ortssuche benutzt.</span></div></div></div></div>`,
  }),
};
ACT['perm-ask'] = async d => {
  if (d.k === 'notif') { const r = await nativeAsync('requestNotifications'); if (!r.ok) toast('Benachrichtigungen sind aus – im Probealarm erscheint dann nichts.'); }
  else if (d.k === 'exact') { if (NATIVE.openSettings) NATIVE.openSettings('exact'); toast('„Alarme & Erinnerungen“ für Notfall! einschalten und zurückkommen.'); }
  else if (d.k === 'location') {
    const r = await nativeAsync('requestPerm', 'location');
    if (r.ok && navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => { const w = wzDraft(HH()); w.lat = +pos.coords.latitude.toFixed(6); w.lon = +pos.coords.longitude.toFixed(6); w.acc = Math.round(pos.coords.accuracy || 0); persist(); }, () => {}, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  }
  else { await nativeAsync('requestPerm', d.k); }
  rerender(true);
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && UI.route === '/setup') rerender(true); });

WZ_STEP.household = {
  view: (H, d) => ({
    q: 'Dein Haushalt',
    body: h`${wzField('Name', 'name', d.name, { ph: 'z. B. Familie Müller', max: 40 })}
      ${wzField('Adresse oder Ort', 'place', d.place, { ph: 'z. B. Lindenstraße 4, Köln', max: 80 })}
      <div class="card"><div class="row spread"><div><h3>Standort</h3><p class="muted small">${d.lat !== null ? `${coordLine(d)}${d.acc ? ' · ± ' + fmt0(d.acc) + ' m' : ''}` : 'Für Karte und Entfernung zu Treffpunkten. Freiwillig.'}</p></div>
        ${d.lat !== null ? h`<button class="btn sm ghost" data-act="wz-gps-del">Entfernen</button>` : ''}</div>
        <button class="btn block" style="margin-top:10px" data-act="wz-gps">${icon('map')} ${d.lat !== null ? 'Neu bestimmen' : 'Standort bestimmen'}</button>${IS_NATIVE ? h`<p class="muted small" style="margin-top:6px">Danach kann die App Adresse und Wohnlage übernehmen.</p>` : ''}</div>
      <div class="label">Wohnsituation</div>
      <div class="chips">${[['flat', 'Wohnung in der Stadt'], ['house', 'Haus in der Stadt'], ['rural', 'Auf dem Land']].map(([v, l]) => chip('wz-set', { f: 'home', v }, l, d.home === v))}</div>
      ${d.settlement && d.home !== 'rural' ? h`<p class="muted small">Aus dem Standort: ${d.settlement}. Wohnung oder Haus?</p>` : ''}
      ${d.home === 'rural' ? h`<p class="muted small">Auf dem Land: Wasserfilter wird Pflicht, Solar-Ladegerät wird vorgeschlagen.</p>` : ''}`,
  }),
};

WZ_STEP.people = {
  view: (H, d) => ({
    q: 'Wie viele Personen?',
    body: h`<div class="card"><div class="row spread"><label for="wzcount" class="bold">Personen im Haushalt</label>
          <span class="qty"><button class="btn icon sm" data-act="wz-count-step" data-d="-1" aria-label="Eine Person weniger">${icon('minus')}</button><span class="bignum" id="wzcountv">${d.people.length}</span><button class="btn icon sm" data-act="wz-count-step" data-d="1" aria-label="Eine Person mehr">${icon('plus')}</button></span></div>
        <input id="wzcount" class="slider" type="range" min="1" max="${WZ_MAX_PEOPLE}" step="1" value="${d.people.length}" data-input="wz-count-live" data-change="wz-count" aria-label="Anzahl Personen"></div>
      <div class="stack-s">${d.people.map((p, k) => { const g = p.birth && ageFromBirth(p.birth) !== null ? ageGroupOf(ageFromBirth(p.birth)) : (p.group || ageGroupOf(p.age)); return h`<div class="person-card"><div class="row nowrap">${wzAvatar(p, k)}<strong class="grow">${wzPersonLabel(p, k)}</strong></div>
        <div class="chips" style="margin-top:8px">${AGE_GROUPS.map(([id, l, r]) => chip('wz-group', { i: k, v: id }, h`${l} <small class="muted">${r}</small>`, g === id))}</div></div>`; })}</div>
      <p class="muted small">Danach kommt jede Person einzeln dran – mit Geburtsdatum, Gesundheit und mehr.</p>`,
  }),
};
WZ_STEP.person = {
  view: (H, d, k) => {
    const p = d.people[k]; const P = `people.${k}`;
    return {
      q: wzPersonLabel(p, k),
      body: h`<div class="row nowrap" style="gap:16px"><button class="avatar xl" data-act="wz-photo" data-i="${k}" aria-label="Foto" style="cursor:pointer">${p.photo ? h`<img data-ph="${p.photo}" alt="">` : icon('camera')}</button>
          <div class="grow">${wzField('Name', P + '.name', p.name, { ph: +p.age < 18 ? 'Kind' : 'Vorname', max: 40 })}</div></div>
        ${wzField('Geburtsdatum', P + '.birth', p.birth, { type: 'date' })}
        ${p.birth && ageFromBirth(p.birth) !== null ? h`<p class="muted small" id="wzage">Alter: <b>${ageFromBirth(p.birth)} Jahre</b></p>` : wzField('Alter (ungefähr, wenn kein Datum)', P + '.age', p.age, { num: true, type: 'number', max: 3 })}
        ${+p.age >= 16 ? h`<div class="field"><label for="wf-mar">Personenstand</label><select id="wf-mar" data-change="wz-sel" data-path="${P}.marital">${MARITAL.map(([v, l]) => h`<option value="${v}" ${(p.marital || '') === v ? raw('selected') : ''}>${l}</option>`)}</select></div>` : ''}
        <div class="label">Geschlecht</div><div class="chips">${[['f', 'weiblich'], ['m', 'männlich'], ['d', 'divers']].map(([v, l]) => chip('wz-pset', { i: k, f: 'sex', v }, l, p.sex === v))}</div>
        <div class="form-grid">${wzField('Gewicht (kg)', P + '.weightKg', p.weightKg, { num: true, type: 'number', max: 3 })}${wzField('Größe (cm)', P + '.heightCm', p.heightCm, { num: true, type: 'number', max: 3 })}</div>
        <div class="label">Fitness</div><div class="chips">${FITNESS.map(([v, l]) => chip('wz-pset', { i: k, f: 'fitness', v }, l, p.fitness === v))}</div>
        <div class="notice info" id="wzcalc"><div><p class="nt">Bedarf</p><p>${wzCalcLine(p)}</p></div></div>
        <div class="field"><label for="wf-blood">Blutgruppe</label><select id="wf-blood" data-change="wz-sel" data-path="${P}.needs.blood">${BLOOD_TYPES.map(b => h`<option value="${b}" ${(p.needs.blood || '') === b ? raw('selected') : ''}>${b || 'unbekannt'}</option>`)}</select></div>
        ${wzField('Allergien', P + '.needs.allergies', p.needs.allergies, { ph: 'z. B. Erdnüsse (Atemnot)' })}
        ${wzField('Vorerkrankungen', P + '.needs.conditions', p.needs.conditions, { ph: 'z. B. Asthma, Diabetes' })}
        ${wzField('Medikamente', P + '._meds', p._meds ?? (p.needs.meds || []).map(m => m.name).join(', '), { ph: 'mit Komma trennen', max: 300 })}
        ${wzField('Hilfsmittel', P + '.needs.aids', p.needs.aids, { ph: 'z. B. Brille, Hörgerät' })}
        ${wzField('Eingeschränkt beim Gehen/Tragen', P + '.needs.mobility', p.needs.mobility, { ph: 'leer lassen, wenn nicht' })}
        <p class="muted small">Bleibt auf diesem Gerät. Was im Notfallpass sichtbar ist, legst du gleich fest.</p>`,
    };
  },
  check: (H, d, k) => ageInvalid(d.people[k]) ? 'Alter fehlt (0–110).' : '',
};
WZ_ON_INPUT.push(el => {
  const m = /^people\.(\d+)\.(age|weightKg|heightCm|needs\.mobility|birth)$/.exec(el.dataset.path || ''); if (!m) return;
  const p = wzDraft(HH()).people[+m[1]];
  if (m[2] === 'birth') { const a = p.birth ? ageFromBirth(p.birth) : null; const had = !!$('#wzage'); if (a !== null) { p.age = a; p.group = ageGroupOf(a); } persist(); if ((a !== null) !== had) { rerender(true); return; } const t = $('#wzage b'); if (t && a !== null) t.textContent = a + ' Jahre'; }
  const box = $('#wzcalc p:last-child'); if (box) box.textContent = wzCalcLine(p);
});

WZ_STEP.pover = {
  view: (H, d) => ({
    q: 'Alle Personen',
    body: h`<div class="stack-s">${d.people.map((p, k) => { const notes = [p.needs.allergies && 'Allergien', p.needs.conditions && 'Vorerkrankungen', ((p._meds ?? (p.needs.meds || []).map(m => m.name).join(',')) || '').trim() && 'Medikamente', p.needs.blood && 'Blutgruppe ' + p.needs.blood].filter(Boolean);
      return h`<div class="person-card"><div class="row nowrap">${wzAvatar(p, k)}<span class="grow"><strong>${wzPersonLabel(p, k)}</strong><br><span class="muted small">${p.age !== '' ? p.age + ' Jahre' : ''}${(MARITAL.find(m => m[0] === p.marital && m[0]) || [])[1] ? ' · ' + MARITAL.find(m => m[0] === p.marital)[1] : ''}</span></span>
        <button class="btn sm" data-act="wz-goto" data-key="p${k}" data-ret="pover">${icon('edit')} Bearbeiten</button></div>
        <p class="small" style="margin-top:8px">${wzCalcLine(p)}</p>${notes.length ? h`<p class="muted small">${notes.join(' · ')}</p>` : ''}</div>`; })}</div>
      <button class="btn block" data-act="wz-goto" data-key="people">${icon('users')} Personen hinzufügen oder entfernen</button>`,
  }),
  ret: false,
};

WZ_STEP.pets = {
  view: (H, d) => ({
    q: 'Tiere',
    body: h`${d.petList.length ? h`<div class="stack-s">${d.petList.map((t, k) => h`<div class="person-card"><div class="row spread"><strong>${t.species}</strong><button class="btn icon sm danger" data-act="wz-del-pet" data-i="${k}" aria-label="${t.species} entfernen">${icon('trash')}</button></div>
        <div class="form-grid">${wzField('Name', `petList.${k}.name`, t.name, { max: 40 })}${wzField('Anzahl', `petList.${k}.count`, t.count, { num: true, type: 'number', max: 2 })}${t.species === 'Hund' ? wzField('Gewicht (kg)', `petList.${k}.weightKg`, t.weightKg, { num: true, type: 'number', max: 3 }) : ''}</div></div>`)}</div>` : h`<p class="muted">Keine Tiere. Einfach weiter.</p>`}
      <div class="btns">${WZ_PETS.map(s => h`<button class="btn" data-act="wz-add-pet" data-v="${s}">${icon('plus')} ${s}</button>`)}</div>`,
  }),
};

WZ_STEP.contacts = {
  view: (H, d) => ({
    q: 'Wen sollen Helfer anrufen?',
    body: h`<p class="muted">Notfallkontakte stehen im Notfallpass und auf der Karte. Am besten jemand, der nicht bei euch wohnt.</p>
      <div class="stack-s">${d.contacts.map((c, k) => h`<div class="person-card"><div class="row spread"><strong>${k + 1}. Kontakt</strong>${d.contacts.length > 1 ? h`<button class="btn icon sm danger" data-act="wz-del-contact" data-i="${k}" aria-label="Kontakt entfernen">${icon('trash')}</button>` : ''}</div>
        <div class="form-grid">${wzField('Name', `contacts.${k}.name`, c.name, { ph: 'z. B. Oma Erna', max: 60 })}${wzField('Beziehung', `contacts.${k}.relation`, c.relation, { ph: 'z. B. Oma, Nachbar', max: 40 })}</div>
        ${wzField('Telefon', `contacts.${k}.phone`, c.phone, { type: 'tel', ph: 'z. B. 0170 1234567', max: 30 })}
        ${NATIVE && NATIVE.pickContact ? h`<button class="btn block" style="margin-top:8px" data-act="wz-pick-contact" data-i="${k}">${icon('users')} Aus Telefonbuch wählen</button>` : ''}</div>`)}</div>
      ${d.contacts.length < 5 ? h`<button class="btn block" data-act="wz-add-contact">${icon('plus')} Weiteren Kontakt</button>` : ''}`,
  }),
  check: (H, d) => d.contacts.some(c => (c.name || '').trim() && !(c.phone || '').trim()) ? 'Telefonnummer fehlt.' : '',
};

WZ_STEP.meet = {
  view: (H, d) => ({
    q: 'Wo trefft ihr euch?',
    body: h`<p class="muted">Falls ihr getrennt werdet oder das Handy nicht geht.</p>
      <div class="stack-s">${d.meet.map((m, k) => h`<div class="person-card"><div class="row spread"><strong>${m.far ? 'Außerhalb des Viertels' : 'In der Nähe'}</strong>${d.meet.length > 2 ? h`<button class="btn icon sm danger" data-act="wz-del-meet" data-i="${k}" aria-label="Treffpunkt entfernen">${icon('trash')}</button>` : ''}</div>
        ${wzField('Treffpunkt', `meet.${k}.name`, m.name, { ph: m.far ? 'z. B. Kirche am Markt, Bahnhof' : 'z. B. Spielplatz Lindenstraße', max: 80 })}
        <div class="row spread" style="margin-top:8px"><span class="muted small">${coordLine(m) || 'Ohne Position'}</span>
          <span class="btns">${typeof m.lat === 'number' ? h`<button class="btn sm ghost" data-act="wz-gps-del" data-target="meet.${k}">Entfernen</button>` : ''}<button class="btn sm" data-act="wz-gps" data-target="meet.${k}">${icon('map')} Ich bin hier</button></span></div>
        ${canPlaceSearch() ? h`<button class="btn block" style="margin-top:8px" data-act="wz-meet-search" data-i="${k}">${icon('search')} In der Nähe suchen</button>` : ''}</div>`)}</div>
      <button class="btn block" data-act="wz-add-meet">${icon('plus')} Weiterer Treffpunkt</button>
      <p class="muted small">„Ich bin hier“ speichert deine aktuelle Position.${canPlaceSearch() ? ' „In der Nähe suchen“ findet z. B. den nächsten Sportplatz.' : ''} Auf der Karte kannst du alles später ändern.</p>`,
  }),
};

WZ_STEP.share = {
  view: (H, d) => ({
    q: 'Was steht im Notfallpass?',
    body: h`<p class="muted">Immer sichtbar: Name und Notfallkontakte. Alles andere nur, wenn du es anhakst – auch auf Karte und QR-Code.</p>
      <div class="stack-s">${d.people.map((p, k) => {
        const has = { photo: !!p.photo, allergies: !!(p.needs.allergies || '').trim(), conditions: !!(p.needs.conditions || '').trim(), meds: !!((p._meds ?? (p.needs.meds || []).map(m => m.name).join(',')) || '').trim(), blood: !!p.needs.blood, aids: !!(p.needs.aids || '').trim() };
        const keys = WZ_SHARE.filter(([key]) => has[key]);
        return h`<div class="person-card"><div class="row nowrap">${wzAvatar(p, k)}<strong class="grow">${wzPersonLabel(p, k)}</strong></div>
          ${keys.length ? h`<div class="choice-grid" style="margin-top:10px">${keys.map(([key, l]) => h`<label class="check"><input type="checkbox" data-change="wz-check" data-path="people.${k}.share.${key}" ${p.share && p.share[key] ? raw('checked') : ''}><span class="t">${l}</span></label>`)}</div>`
            : h`<p class="muted small" style="margin-top:8px">Nichts Privates eingetragen.</p>`}</div>`; })}</div>`,
  }),
};

WZ_STEP.pdone = {
  view: (H, d) => {
    const ice = d.contacts.filter(c => (c.name || '').trim() && (c.phone || '').trim()); const meet = d.meet.filter(m => (m.name || '').trim());
    return {
      q: H.setup.done ? 'Haushalt speichern' : 'Haushalt angelegt',
      body: h`<div class="card"><h3>${(d.name || '').trim() || 'Mein Haushalt'}</h3>${d.place ? h`<p class="muted">${d.place}</p>` : ''}
        <ul class="plain">${d.people.map((p, k) => h`<li class="row nowrap">${wzAvatar(p, k, 'sm')}<span class="grow"><b>${wzPersonLabel(p, k)}</b>${p.age !== '' ? ', ' + p.age : ''}<br><span class="muted small">${wzCalcLine(p).split(' · ')[0]}</span></span></li>`)}
        ${d.petList.map(t => h`<li>${icon('paw')} ${t.name || t.species}${+t.count > 1 ? ' ×' + t.count : ''}</li>`)}</ul></div>
        <div class="card"><ul class="plain" style="margin-top:0"><li>${icon('phone')} ${ice.length ? ice.map(c => c.name).join(', ') : h`<span class="tmust">Kein Notfallkontakt</span>`}</li><li>${icon('map')} ${meet.length ? meet.map(m => m.name).join(' · ') : h`<span class="muted">Kein Treffpunkt</span>`}</li></ul></div>
        <p class="muted small">${H.setup.done ? 'Die Packlisten werden an die neuen Angaben angepasst.' : 'Als Nächstes: Rucksäcke und Taschen.'}</p>`,
      foot: H.setup.done ? h`<button class="btn primary lg" data-act="setup-done" data-then="home">${icon('check')} Speichern</button>`
        : h`<button class="btn lg" data-act="setup-done" data-then="home">Später</button><button class="btn primary lg" data-act="setup-done" data-then="bags">Weiter ${icon('chev')}</button>`,
    };
  },
};

/* ---- Aktionen ---- */
ACT['wz-pset'] = d => { const p = wzDraft(HH()).people[+d.i]; p[d.f] = p[d.f] === d.v ? '' : d.v; persist(); rerender(true); };
ACT['wz-photo'] = async d => { const pid = await addPhotoTo(null); if (!pid) return; wzDraft(HH()).people[+d.i].photo = pid; persist(); rerender(true); };
INPUT['wz-count-live'] = el => { const v = $('#wzcountv'); if (v) v.textContent = el.value; };
INPUT['wz-count'] = el => wzSetCount(+el.value);
ACT['wz-count-step'] = d => wzSetCount(wzDraft(HH()).people.length + (+d.d));
function wzSetCount(v) {
  const H = HH(); const w = wzDraft(H); const n = clamp(v || 1, 1, WZ_MAX_PEOPLE);
  while (w.people.length < n) { const p = personShape({ id: uid(), name: '', age: 35 }); p.group = 'adult'; w.people.push(p); w.carry[p.id] = wzCarryDefault(H, p); }
  while (w.people.length > n) { const p = w.people.pop(); delete w.carry[p.id]; }
  persist(); rerender(true);
}
ACT['wz-group'] = d => { const w = wzDraft(HH()); const p = w.people[+d.i]; const g = AGE_GROUPS.find(x => x[0] === d.v); if (!p || !g) return; p.group = g[0]; if (!p.birth) p.age = g[3]; persist(); rerender(true); };
ACT['wz-pick-contact'] = async d => {
  const r = await nativeAsync('pickContact'); if (!r.ok) { if (r.error !== 'abgebrochen') toast(r.error); return; }
  const c = wzDraft(HH()).contacts[+d.i]; if (!c) return; c.name = r.name || c.name; c.phone = r.phone || c.phone; persist(); rerender(true);
};
ACT['wz-add-pet'] = d => { wzDraft(HH()).petList.push({ id: uid(), species: d.v, name: '', count: 1, age: '', weightKg: '', needs: '' }); persist(); rerender(true); };
ACT['wz-del-pet'] = d => { wzDraft(HH()).petList.splice(+d.i, 1); persist(); rerender(true); };
ACT['wz-add-person'] = d => { const w = wzDraft(HH()); const p = personShape({ id: uid(), name: '', age: d.kind === 'child' ? 6 : 35 }); w.people.push(p); w.carry[p.id] = wzCarryDefault(HH(), p); persist(); rerender(true); };
ACT['wz-del-person'] = d => { const w = wzDraft(HH()); if (w.people.length > 1) { const [p] = w.people.splice(+d.i, 1); delete w.carry[p.id]; } persist(); rerender(true); };
ACT['wz-add-contact'] = () => { const w = wzDraft(HH()); w.contacts.push({ id: uid(), type: 'ice', name: '', relation: '', phone: '', priority: w.contacts.length + 1 }); persist(); rerender(true); };
ACT['wz-del-contact'] = d => { wzDraft(HH()).contacts.splice(+d.i, 1); persist(); rerender(true); };
ACT['wz-add-meet'] = () => { wzDraft(HH()).meet.push({ id: uid(), name: '', far: true }); persist(); rerender(true); };
ACT['wz-meet-search'] = d => {
  const w = wzDraft(HH()); const m = w.meet[+d.i]; if (!m) return;
  const center = typeof w.lat === 'number' ? { lat: w.lat, lon: w.lon } : typeof m.lat === 'number' ? { lat: m.lat, lon: m.lon } : homeCoord(HH());
  openPlaceSearch({ center, title: m.far ? 'Treffpunkt außerhalb suchen' : 'Treffpunkt in der Nähe suchen', onPick: p => { m.name = p.name; m.lat = p.lat; m.lon = p.lon; persist(); rerender(true); toast(p.name + ' übernommen'); } });
};
ACT['wz-del-meet'] = d => { wzDraft(HH()).meet.splice(+d.i, 1); persist(); rerender(true); };
ACT['setup-done'] = d => {
  const H = HH(); const w = wzDraft(H); const wasDone = H.setup.done;
  finishProfile(H, w); H.profileDone = true; H.setup.pstep = 0;
  if (wasDone && H.cfg) applyPlan(H, DB.settings);
  H.setup.draft = null; H.setup.step = 0; persist(); flushDB();
  if (d.then === 'bags') go('#/wizard'); else { if (!wasDone) H.setup.skipped = true; persist(); go('#/home'); toast('Haushalt gespeichert'); }
};

/* Angaben aus „Haushalt anlegen“ übernehmen (auch beim späteren Bearbeiten) */
function finishProfile(H, d) {
  H.people = d.people.map((p, i) => {
    const kid = +p.age < 18; const n = d.people.slice(0, i).filter(x => (+x.age < 18) === kid).length + 1;
    const q = personShape(Object.assign({}, p, { id: p.id || uid(), name: (p.name || '').trim() || (kid ? 'Kind ' + n : 'Erwachsene/r ' + n), age: +p.age }));
    if (typeof p._meds === 'string') { const names = splitList(p._meds); q.needs.meds = names.map(nm => (q.needs.meds || []).find(m => m.name === nm) || { id: uid(), name: nm, dose: '', expiry: '' }); }
    delete q._meds; q.needs.meds = (q.needs.meds || []).filter(m => m.name && m.name.trim());
    return q;
  });
  const ids = new Set(H.people.map(p => p.id));
  H.items.forEach(i => { if (i.personId && !ids.has(i.personId)) i.personId = null; });
  H.bags.forEach(b => { if (b.owner && !ids.has(b.owner)) b.owner = null; });
  if (Array.isArray(d.petList)) H.pets = d.petList.map(t => Object.assign({ id: uid(), name: '', count: 1, age: '', weightKg: '', needs: '' }, t, { count: Math.max(1, +t.count || 1) }));
  if (Array.isArray(d.contacts)) {
    const ice = d.contacts.filter(c => (c.name || '').trim() && (c.phone || '').trim()).map((c, k) => Object.assign({ address: '', email: '' }, byId(H.contacts, c.id) || {}, c, { type: 'ice', name: c.name.trim(), phone: c.phone.trim(), priority: k + 1 }));
    H.contacts = H.contacts.filter(c => c.type !== 'ice').concat(ice);
    const iceIds = ice.map(c => c.id);
    for (const p of H.people) { p.passContacts = (p.passContacts || []).filter(id => byId(H.contacts, id)); if (!p.passContacts.length) p.passContacts = iceIds.slice(0, 3); }
  }
  if (Array.isArray(d.meet)) H.meeting = d.meet.filter(m => (m.name || '').trim()).map(m => Object.assign({}, m, { name: m.name.trim() }));
  if ((d.name || '').trim()) H.name = d.name.trim();
  H.home = { type: d.home || '', place: (d.place || '').trim(), lat: d.lat ?? null, lon: d.lon ?? null, acc: d.acc || null };
  if (H.cfg) H.cfg.housing = Object.assign({}, H.cfg.housing || {}, H.home);
}
