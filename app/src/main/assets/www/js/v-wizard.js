'use strict';
/* ===== Notfall! – Einrichtungsassistent ===== */
const WZ_STEPS = ['Vorsorge', 'Haushalt', 'Wohnsituation', 'Gesundheit', 'Ausrüstung', 'Zeitraum', 'Plan'];
const WZ_EQUIP = [
  ['water_filter', 'Wasserfilter'], ['water_bottle', 'Wasserbehälter / Trinkflaschen'], ['flashlight', 'Taschenlampen'], ['headlamp', 'Stirnlampen'], ['radio', 'Radio (Batterie/Kurbel)'],
  ['powerbank', 'Powerbanks'], ['firstaid', 'Erste-Hilfe-Ausrüstung'], ['stove', 'Kocher'], ['fuel', 'Brennstoffe (Gas, Esbit, Spiritus)'], ['cookware', 'Kochgeschirr'],
  ['sleeping_bag', 'Schlafsäcke'], ['sleeping_mat', 'Isomatten'], ['tent', 'Zelte'], ['tarp', 'Tarps'], ['multitool', 'Messer und Werkzeuge'], ['hygiene_kit', 'Hygieneartikel (Sets)'],
];
const WZ_DURATIONS = [['24', '24 Stunden'], ['48', '48 Stunden'], ['72', '72 Stunden'], ['168', '7 Tage'], ['240', '10 Tage'], ['336', '14 Tage'], ['720', '30 Tage'], ['custom', 'Individueller Zeitraum']];

function wzInitial(H) {
  const c = H.cfg;
  const people = H.people.length ? clone(H.people) : [{ id: uid(), name: '', age: 35, needs: {} }];
  const d = {
    goals: c ? c.goals.slice() : [], customScenario: c ? c.customScenario || '' : '', strategies: c ? c.strategies.slice() : ['home'], hhType: c ? c.hhType || '' : '',
    people, pets: clone(H.pets), hasSpecial: c ? !!c.hasSpecial : false,
    country: c ? c.country || 'DE' : 'DE', region: c ? c.region || '' : '', zip: c ? c.zip || '' : '',
    housing: Object.assign({ type: '', cellar: null, shelterPossible: null, fireplace: null, cookNoPower: null, waterL: '', foodDays: '', car: null, fallback: null }, c ? c.housing : {}),
    equipment: {}, bags: [], durationPreset: c ? (WZ_DURATIONS.some(x => x[0] === String(c.durationHours)) ? String(c.durationHours) : 'custom') : '72', durationCustom: c && !WZ_DURATIONS.some(x => x[0] === String(c.durationHours)) ? Math.round(c.durationHours / 24) : '', includeOptional: c ? !!c.includeOptional : false,
  };
  return d;
}
function wzDraft(H) { if (!H.setup.draft) { H.setup.draft = wzInitial(H); persist(); } return H.setup.draft; }
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj); }

route('/wizard', H => {
  const d = wzDraft(H); const step = clamp(H.setup.step || 0, 0, WZ_STEPS.length - 1);
  const body = [wz1, wz2, wz3, wz4, wz5, wz6, wz7][step](H, d);
  const first = !H.setup.done && !H.setup.skipped;
  return {
    full: true, title: 'Einrichtung',
    html: h`<div class="topbar"><h1>Einrichtung ${step + 1} / ${WZ_STEPS.length}</h1>
        <button class="btn sm" data-act="wz-later">${icon('clock')}<span>Später</span></button><button class="btn sm ghost" data-act="wz-skip">Überspringen</button></div>
      <main class="page"><div class="page-inner">
        <div class="wiz-top"><div class="wiz-steps" aria-hidden="true">${WZ_STEPS.map((s, i) => h`<i class="${i < step ? 'done' : i === step ? 'cur' : ''}"></i>`)}</div>
        <div class="row"><span class="badge info">Schritt ${step + 1}: ${WZ_STEPS[step]}</span></div><p class="muted small">Alle Angaben sind freiwillig außer der Personenzahl. Du kannst alles später ändern. Deine Daten bleiben auf diesem Gerät.</p></div>
        ${body}
        ${step < 6 ? h`<div class="wiz-foot">${step > 0 ? h`<button class="btn" data-act="wz-prev">${icon('back')} Zurück</button>` : ''}<div class="grow"></div><button class="btn primary" data-act="wz-next">Weiter ${icon('chev')}</button></div>` : ''}
      </div></main>`,
  };
});

function wzCheckGroup(d, group) {
  return h`<div class="choice-grid">${GOALS.filter(g => g.group === group).map(g => F.check('goal_' + g.id, g.label, d.goals.includes(g.id), { desc: g.desc, attrs: { 'data-change': 'wz-goal', 'data-id': g.id } }))}</div>`;
}
function wz1(H, d) {
  return h`<div class="stack">
    <div class="card"><h2>Welche Vorsorge möchtest du treffen?</h2><p class="muted">Mehrfachauswahl möglich. Wähle, was zu dir passt – die App rechnet den Rest.</p>
      <h3 style="margin-top:16px">Notfallrucksack</h3>${wzCheckGroup(d, 'Rucksack')}
      <h3 style="margin-top:16px">Hausvorrat</h3>${wzCheckGroup(d, 'Vorrat')}
      <h3 style="margin-top:16px">Szenarien</h3>${wzCheckGroup(d, 'Szenario')}
      ${d.goals.includes('custom') ? h`<div class="field" style="margin-top:12px"><label for="cs">Dein individuelles Szenario</label><input id="cs" type="text" value="${d.customScenario}" data-input="wz-text" data-path="customScenario" placeholder="z. B. Waldbrandgebiet, Berghütte, Pflegefall …"></div>` : ''}</div>
    <div class="card"><h2>Welche Strategie verfolgst du?</h2><p class="muted">Die App unterscheidet drei grundsätzliche Wege. Du kannst mehrere wählen; sie bestimmen, was geplant wird.</p>
      <div class="stack-s">${STRATEGIES.map(s => F.check('str_' + s.id, s.label, d.strategies.includes(s.id), { desc: s.desc, attrs: { 'data-change': 'wz-strategy', 'data-id': s.id } }))}</div>
      ${noticeBox('info', 'Wichtig', 'Bei akuter Gefahr gelten immer die Warnungen und Anweisungen der Behörden. Diese App ersetzt keine amtliche Beratung.')}</div>
    <div class="card"><h3>Nur ausprobieren?</h3><p class="muted">Lade einen Beispielhaushalt (2 Erwachsene, 1 Kind, zwei Rucksäcke, Ausrüstung). Er lässt sich jederzeit löschen.</p><button class="btn" data-act="load-sample">${icon('cube')} Beispielhaushalt laden</button></div>
  </div>`;
}
function wzPersonRow(p, i) {
  const g = AGE_LABEL[ageGroup(p.age)];
  return h`<div class="person-card"><div class="row nowrap"><strong class="grow">${p.name || ('Person ' + (i + 1))} <span class="badge">${g}</span></strong><button class="btn sm danger" data-act="wz-del-person" data-i="${i}" aria-label="Person entfernen">${icon('trash')}</button></div>
    <div class="form-grid"><div class="field"><label>Name (optional)</label><input type="text" value="${p.name || ''}" data-input="wz-text" data-path="people.${i}.name" placeholder="z. B. Anna"></div>
    <div class="field"><label>Alter in Jahren</label><input type="number" min="0" max="110" inputmode="numeric" value="${p.age ?? ''}" data-input="wz-num" data-path="people.${i}.age"></div></div></div>`;
}
function wz2(H, d) {
  const ad = d.people.filter(p => +p.age >= 18).length, kids = d.people.length - ad;
  return h`<div class="stack">
    <div class="card"><h2>Wer gehört zum Haushalt?</h2>
      <div class="field"><label for="hht">Haushaltstyp</label><select id="hht" data-change="wz-sel" data-path="hhType">${[['', 'Keine Angabe'], ['single', 'Einzelperson'], ['couple', 'Paar'], ['family', 'Familie'], ['wg', 'Wohngemeinschaft']].map(([v, l]) => h`<option value="${v}" ${d.hhType === v ? raw('selected') : ''}>${l}</option>`)}</select></div>
      <div class="row" style="margin:16px 0"><div class="stat"><span class="v">${ad}</span><span class="l">Erwachsene</span></div><div class="stat" style="margin-left:24px"><span class="v">${kids}</span><span class="l">Kinder</span></div></div>
      <div class="btns"><button class="btn" data-act="wz-add-person" data-kind="adult">${icon('plus')} Erwachsene/n</button><button class="btn" data-act="wz-add-person" data-kind="child">${icon('plus')} Kind</button></div>
      <div class="stack-s" style="margin-top:16px">${d.people.map((p, i) => wzPersonRow(p, i))}</div>
      <div style="margin-top:16px">${F.check('hasSpecial', 'Es gibt Personen mit besonderem Unterstützungsbedarf (Pflege, Mobilität, Sinne)', d.hasSpecial, { desc: 'Du kannst Details im Schritt „Gesundheit“ eintragen.', attrs: { 'data-change': 'wz-bool', 'data-path': 'hasSpecial' } })}</div></div>
    <div class="card"><h2>Haustiere</h2><p class="muted">Tierart, Anzahl, Alter und besondere Bedürfnisse.</p>
      <div class="stack-s">${d.pets.map((p, i) => h`<div class="person-card"><div class="row nowrap"><strong class="grow">${p.species} ${p.name || ''}</strong><button class="btn sm danger" data-act="wz-del-pet" data-i="${i}" aria-label="Tier entfernen">${icon('trash')}</button></div>
        <div class="form-grid"><div class="field"><label>Tierart</label><select data-change="wz-sel" data-path="pets.${i}.species">${['Hund', 'Katze', 'Kleintier', 'Vogel', 'Sonstiges'].map(s => h`<option ${p.species === s ? raw('selected') : ''}>${s}</option>`)}</select></div>
        <div class="field"><label>Name (optional)</label><input type="text" value="${p.name || ''}" data-input="wz-text" data-path="pets.${i}.name"></div>
        <div class="field"><label>Anzahl</label><input type="number" min="1" max="20" value="${p.count ?? 1}" data-input="wz-num" data-path="pets.${i}.count"></div>
        <div class="field"><label>Alter (Jahre)</label><input type="number" min="0" max="40" step="any" value="${p.age ?? ''}" data-input="wz-num" data-path="pets.${i}.age"></div>
        <div class="field"><label>Gewicht (kg, optional)</label><input type="number" min="0" step="any" value="${p.weightKg ?? ''}" data-input="wz-num" data-path="pets.${i}.weightKg"></div></div>
        <div class="field"><label>Besondere Bedürfnisse (Medikamente, Diät …)</label><input type="text" value="${p.needs || ''}" data-input="wz-text" data-path="pets.${i}.needs"></div></div>`)}</div>
      <button class="btn" style="margin-top:12px" data-act="wz-add-pet">${icon('plus')} Haustier hinzufügen</button></div>
  </div>`;
}
function wzYN(label, path, v, extra) {
  return h`<div class="field"><label>${label}</label><select data-change="wz-yn" data-path="${path}">${[['', 'Keine Angabe'], ['1', 'Ja'], ['0', 'Nein']].map(([val, l]) => h`<option value="${val}" ${(v === true && val === '1') || (v === false && val === '0') || (v === null && val === '') ? raw('selected') : ''}>${l}</option>`)}</select>${extra || ''}</div>`;
}
function wz3(H, d) {
  const hs = d.housing; const c = COUNTRIES[d.country] || COUNTRIES.DE;
  return h`<div class="stack"><div class="card"><h2>Wo wohnst du?</h2><p class="muted">Eine genaue Adresse ist nicht nötig. Land und Region bestimmen Notrufnummern und Hinweise.</p>
    <div class="form-grid"><div class="field"><label>Land</label><select data-change="wz-country">${Object.entries(COUNTRIES).map(([k, v]) => h`<option value="${k}" ${d.country === k ? raw('selected') : ''}>${v.name}</option>`)}</select></div>
    <div class="field"><label>${d.country === 'CH' ? 'Kanton' : d.country === 'DE' ? 'Bundesland' : 'Region'}</label>${c.regions.length ? h`<select data-change="wz-sel" data-path="region"><option value="">Keine Angabe</option>${c.regions.map(r => h`<option ${d.region === r ? raw('selected') : ''}>${r}</option>`)}</select>` : h`<input type="text" value="${d.region}" data-input="wz-text" data-path="region">`}</div>
    <div class="field"><label>Postleitzahl oder Ort (freiwillig)</label><input type="text" value="${d.zip}" data-input="wz-text" data-path="zip" autocomplete="off"><div class="hint">Wird nur lokal gespeichert.</div></div></div></div>
    <div class="card"><h2>Wohnsituation</h2><div class="form-grid">
      <div class="field"><label>Wohnform</label><select data-change="wz-sel" data-path="housing.type">${[['', 'Keine Angabe'], ['house', 'Haus'], ['flat', 'Wohnung']].map(([v, l]) => h`<option value="${v}" ${hs.type === v ? raw('selected') : ''}>${l}</option>`)}</select></div>
      ${wzYN('Keller vorhanden?', 'housing.cellar', hs.cellar)}${wzYN('Möglicher Schutzraum vorhanden?', 'housing.shelterPossible', hs.shelterPossible)}${wzYN('Kamin oder alternative Heizung?', 'housing.fireplace', hs.fireplace)}
      ${wzYN('Stromunabhängige Kochmöglichkeit?', 'housing.cookNoPower', hs.cookNoPower)}${wzYN('Auto vorhanden?', 'housing.car', hs.car)}${wzYN('Ausweichunterkunft vorhanden?', 'housing.fallback', hs.fallback)}
      ${wzYN('Trinkwasservorräte vorhanden?', 'housing.hasWater', hs.hasWater)}
      <div class="field"><label>… ungefähr wie viele Liter?</label><input type="number" min="0" step="any" value="${hs.waterL}" data-input="wz-num" data-path="housing.waterL" ${hs.hasWater ? '' : raw('disabled')}></div>
      ${wzYN('Lebensmittelvorräte vorhanden?', 'housing.hasFood', hs.hasFood)}
      <div class="field"><label>… für ungefähr wie viele Tage (alle Personen)?</label><input type="number" min="0" step="any" value="${hs.foodDays}" data-input="wz-num" data-path="housing.foodDays" ${hs.hasFood ? '' : raw('disabled')}></div></div>
      <p class="hint" style="margin-top:8px">Mengenangaben sind Schätzungen. Du kannst sie später im Bereich „Hausvorrat“ genau erfassen.</p></div></div>`;
}
function medRows(p, i) {
  const ms = (p.needs && p.needs.meds) || [];
  return h`<div class="stack-s">${ms.map((m, k) => h`<div class="person-card"><div class="form-grid"><div class="field"><label>Medikament</label><input type="text" value="${m.name || ''}" data-input="wz-text" data-path="people.${i}.needs.meds.${k}.name"></div>
    <div class="field"><label>Dosierung</label><input type="text" value="${m.dose || ''}" data-input="wz-text" data-path="people.${i}.needs.meds.${k}.dose"></div>
    <div class="field"><label>Haltbar bis</label><input type="date" value="${m.expiry || ''}" data-input="wz-text" data-path="people.${i}.needs.meds.${k}.expiry"></div></div>
    <button class="btn sm danger" data-act="wz-del-med" data-i="${i}" data-k="${k}">${icon('trash')} Entfernen</button></div>`)}
    <button class="btn sm" data-act="wz-add-med" data-i="${i}">${icon('plus')} Medikament hinzufügen</button></div>`;
}
function wz4(H, d) {
  const need = (i, key, label, ph) => h`<div class="field"><label>${label}</label><input type="text" value="${(d.people[i].needs || {})[key] || ''}" data-input="wz-text" data-path="people.${i}.needs.${key}" placeholder="${ph || ''}"></div>`;
  return h`<div class="stack"><div class="card"><h2>Gesundheit und persönliche Bedürfnisse</h2><p class="muted">Alle Angaben sind freiwillig und werden verschlüsselt auf diesem Gerät gespeichert. Sie dienen nur dazu, passende Gegenstände zu planen – keine medizinische Beratung.</p></div>
    ${d.people.map((p, i) => h`<details class="card" ${i === 0 || d.hasSpecial ? raw('open') : ''}><summary class="bold" style="cursor:pointer;min-height:44px;display:flex;align-items:center">${p.name || 'Person ' + (i + 1)} (${AGE_LABEL[ageGroup(p.age)]}, ${p.age ?? '?'} J.)</summary>
      <div class="stack" style="margin-top:12px"><div class="form-grid">${need(i, 'allergies', 'Allergien')}${need(i, 'intolerances', 'Unverträglichkeiten')}${need(i, 'diet', 'Ernährungseinschränkungen', 'z. B. vegetarisch, glutenfrei')}
      ${need(i, 'devices', 'Notwendige medizinische Geräte', 'mehrere mit Komma trennen')}${need(i, 'aids', 'Hilfsmittel', 'z. B. Brille, Hörgerät')}${need(i, 'care', 'Pflegebedarf / Unterstützung')}${need(i, 'mobility', 'Körperliche Einschränkungen')}${need(i, 'hygiene', 'Besondere Hygieneprodukte')}</div>
      <div><div class="label" style="margin-bottom:8px">Regelmäßig benötigte Medikamente</div>${medRows(p, i)}</div></div></details>`)}</div>`;
}
function wz5(H, d) {
  return h`<div class="stack"><div class="card"><h2>Welche Ausrüstung ist schon vorhanden?</h2><p class="muted">Trage die Anzahl ein. Vorhandenes wandert direkt ins Inventar und wird der passenden Person bzw. dem passenden Rucksack zugeordnet.</p>
    <div class="grid c2">${WZ_EQUIP.map(([k, label]) => h`<div class="person-card"><div class="row nowrap"><span class="grow bold">${label}</span><div class="stepper"><button type="button" data-act="wz-eq" data-key="${k}" data-d="-1" aria-label="weniger">−</button><span>${d.equipment[k] || 0}</span><button type="button" data-act="wz-eq" data-key="${k}" data-d="1" aria-label="mehr">+</button></div></div></div>`)}</div>
    <p class="hint" style="margin-top:8px">Lebensmittel und Wasser hast du bereits im Schritt „Wohnsituation“ angegeben.</p></div>
    <div class="card"><h2>Rucksäcke, Taschen und Koffer</h2><p class="muted">Nur eintragen, was du wirklich hast. Fehlende Rucksäcke schlägt die App vor.</p>
      <div class="stack-s">${d.bags.map((b, i) => h`<div class="person-card"><div class="row nowrap"><strong class="grow">${b.name || BAG_TYPE[b.type].label}</strong><button class="btn sm danger" data-act="wz-del-bag" data-i="${i}" aria-label="Entfernen">${icon('trash')}</button></div>
        <div class="form-grid"><div class="field"><label>Typ</label><select data-change="wz-bagtype" data-i="${i}">${BAG_TYPES.map(t => h`<option value="${t.id}" ${b.type === t.id ? raw('selected') : ''}>${t.label}</option>`)}</select></div>
        <div class="field"><label>Name (optional)</label><input type="text" value="${b.name || ''}" data-input="wz-text" data-path="bags.${i}.name"></div>
        <div class="field"><label>Volumen (Liter)</label><input type="number" min="1" max="200" value="${b.liters}" data-input="wz-num" data-path="bags.${i}.liters"></div></div></div>`)}</div>
      <button class="btn" style="margin-top:12px" data-act="wz-add-bag">${icon('plus')} Rucksack / Tasche hinzufügen</button>
      ${H.bags.length ? h`<p class="hint" style="margin-top:8px">Bereits angelegt: ${H.bags.map(b => b.name).join(', ')}.</p>` : ''}</div></div>`;
}
function wz6(H, d) {
  return h`<div class="stack"><div class="card"><h2>Für welchen Zeitraum möchtest du vorsorgen?</h2><p class="muted">Der Rucksack wird für höchstens 72 Stunden gepackt; längere Zeiträume deckt der Hausvorrat ab.</p>
    <div class="choice-grid">${WZ_DURATIONS.map(([v, l]) => h`<label class="check"><input type="radio" name="dur" value="${v}" ${d.durationPreset === v ? raw('checked') : ''} data-change="wz-dur"><span class="t">${l}</span></label>`)}</div>
    ${d.durationPreset === 'custom' ? h`<div style="margin-top:12px" class="field"><label>Individueller Zeitraum in Tagen</label><input type="number" min="1" max="365" value="${d.durationCustom}" data-input="wz-num" data-path="durationCustom"></div>` : ''}</div>
    <div class="card">${F.check('opt', 'Optionale Komfortausrüstung einbeziehen', d.includeOptional, { desc: 'Z. B. Solarlader, Kerzen, Ohrstöpsel. Notwendiges und Empfohlenes wird immer geplant.', attrs: { 'data-change': 'wz-bool', 'data-path': 'includeOptional' } })}</div></div>`;
}
function wzDurationHours(d) { return d.durationPreset === 'custom' ? Math.max(1, Math.round((+d.durationCustom || 3) * 24)) : +d.durationPreset; }
function wz7(H, d) {
  const hours = wzDurationHours(d);
  const done = H.setup.done && H.setup.lastReport;
  const sumPeople = d.people.length;
  return h`<div class="stack"><div class="card"><h2>Zusammenfassung</h2>
    <table class="tbl"><tbody>
      <tr><th>Vorsorge</th><td>${d.goals.length ? d.goals.map(g => GOAL[g].label).join(', ') : 'Nichts gewählt – es wird eine Basisplanung erstellt'}</td></tr>
      <tr><th>Strategie</th><td>${d.strategies.map(s => STRATEGIES.find(x => x.id === s).label).join('; ') || 'Zu Hause bleiben'}</td></tr>
      <tr><th>Personen</th><td>${sumPeople}${d.pets.length ? ' + ' + d.pets.length + ' Tierhalter-Eintrag/Einträge' : ''}</td></tr>
      <tr><th>Zeitraum</th><td>${hours >= 48 ? Math.round(hours / 24) + ' Tage' : hours + ' Stunden'}</td></tr>
      <tr><th>Rucksäcke angegeben</th><td>${d.bags.length}</td></tr><tr><th>Ausrüstung angegeben</th><td>${Object.values(d.equipment).reduce((a, b) => a + b, 0)} Teile</td></tr></tbody></table>
    ${noticeBox('info', 'So geht es weiter', 'Die App erstellt jetzt Packlisten, Vorräte, Aufgaben und Erinnerungen. Danach bestätigst du bei jeder Position „Habe ich“ oder „Fehlt“. Alles bleibt jederzeit änderbar.')}</div>
    <div class="wiz-foot"><button class="btn" data-act="wz-prev">${icon('back')} Zurück</button><div class="grow"></div><button class="btn primary" data-act="wz-finish">${icon('check')} Plan erstellen</button></div></div>`;
}

/* ---- Wizard-Aktionen ---- */
function wzSave() { persist(); }
INPUT['wz-text'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); wzSave(); };
INPUT['wz-num'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value === '' ? '' : +el.value); wzSave(); };
INPUT['wz-sel'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.value); wzSave(); };
INPUT['wz-bool'] = el => { setPath(wzDraft(HH()), el.dataset.path, el.checked); wzSave(); };
INPUT['wz-yn'] = el => { const d = wzDraft(HH()); setPath(d, el.dataset.path, el.value === '1' ? true : el.value === '0' ? false : null); wzSave(); if (/hasWater|hasFood/.test(el.dataset.path)) rerender(); };
INPUT['wz-goal'] = el => { const d = wzDraft(HH()); const id = el.dataset.id; d.goals = d.goals.filter(x => x !== id); if (el.checked) d.goals.push(id); wzSave(); if (id === 'custom') rerender(); };
INPUT['wz-strategy'] = el => { const d = wzDraft(HH()); const id = el.dataset.id; d.strategies = d.strategies.filter(x => x !== id); if (el.checked) d.strategies.push(id); wzSave(); };
INPUT['wz-dur'] = el => { wzDraft(HH()).durationPreset = el.value; wzSave(); rerender(); };
INPUT['wz-country'] = el => { const d = wzDraft(HH()); d.country = el.value; d.region = ''; wzSave(); rerender(); };
INPUT['wz-bagtype'] = el => { const d = wzDraft(HH()); const b = d.bags[+el.dataset.i]; b.type = el.value; b.liters = BAG_TYPE[el.value].liters; wzSave(); rerender(); };
ACT['wz-add-person'] = d => { const w = wzDraft(HH()); w.people.push({ id: uid(), name: '', age: d.kind === 'child' ? 6 : 35, needs: {} }); wzSave(); rerender(); };
ACT['wz-del-person'] = async d => { const w = wzDraft(HH()); if (w.people.length <= 1) { toast('Mindestens eine Person ist nötig.'); return; } w.people.splice(+d.i, 1); wzSave(); rerender(); };
ACT['wz-add-pet'] = () => { wzDraft(HH()).pets.push({ id: uid(), species: 'Hund', name: '', count: 1, age: '', weightKg: '', needs: '' }); wzSave(); rerender(); };
ACT['wz-del-pet'] = d => { wzDraft(HH()).pets.splice(+d.i, 1); wzSave(); rerender(); };
ACT['wz-add-med'] = d => { const p = wzDraft(HH()).people[+d.i]; p.needs = p.needs || {}; p.needs.meds = p.needs.meds || []; p.needs.meds.push({ id: uid(), name: '', dose: '', expiry: '' }); wzSave(); rerender(); };
ACT['wz-del-med'] = d => { wzDraft(HH()).people[+d.i].needs.meds.splice(+d.k, 1); wzSave(); rerender(); };
ACT['wz-eq'] = d => { const w = wzDraft(HH()); w.equipment[d.key] = clamp((w.equipment[d.key] || 0) + (+d.d), 0, 30); wzSave(); const pg = $('.page'); const top = pg ? pg.scrollTop : 0; rerender(); if ($('.page')) $('.page').scrollTop = top; };
ACT['wz-add-bag'] = () => { wzDraft(HH()).bags.push({ id: uid(), type: 'trekking', liters: 55, name: '' }); wzSave(); rerender(); };
ACT['wz-del-bag'] = d => { wzDraft(HH()).bags.splice(+d.i, 1); wzSave(); rerender(); };
ACT['wz-prev'] = () => { const H = HH(); H.setup.step = Math.max(0, (H.setup.step || 0) - 1); persist(); rerender(); };
ACT['wz-next'] = () => {
  const H = HH(); const d = wzDraft(H); const step = H.setup.step || 0;
  if (step === 1) { for (const p of d.people) { if (p.age === '' || p.age === null || isNaN(+p.age) || +p.age < 0 || +p.age > 110) { toast('Bitte bei allen Personen ein Alter zwischen 0 und 110 eintragen.'); return; } } }
  if (step === 5 && d.durationPreset === 'custom' && !(+d.durationCustom > 0)) { toast('Bitte die Tage für den individuellen Zeitraum eintragen.'); return; }
  H.setup.step = Math.min(6, step + 1); persist(); rerender();
};
ACT['wz-later'] = () => { HH().setup.skipped = true; persist(); flushDB(); toast('Gespeichert. Du kannst die Einrichtung jederzeit fortsetzen.'); go('#/home'); };
ACT['wz-skip'] = async () => {
  const ok = await confirmDlg('Einrichtung überspringen?', 'Du kannst alles auch von Hand anlegen. Den Assistenten findest du später unter Einstellungen → Einrichtungsassistent erneut starten.', { ok: 'Überspringen' });
  if (!ok) return; const H = HH(); H.setup.skipped = true; persist(); go('#/home');
};
ACT['load-sample'] = async () => {
  const ok = await confirmDlg('Beispielhaushalt laden?', 'Es wird ein Testhaushalt mit erfundenen Beispieldaten angelegt. Du kannst ihn unter Einstellungen → Haushalte wieder löschen.', { ok: 'Beispiel laden' });
  if (!ok) return; loadSampleHousehold(); go('#/home'); toast('Beispielhaushalt geladen.');
};
function loadSampleHousehold() {
  const cur = HH();
  const pristine = !cur.items.length && !cur.people.length && !cur.setup.done;
  const sample = createSampleHousehold();
  if (pristine) DB.households = DB.households.filter(h => h.id !== cur.id);
  DB.households.push(sample); DB.active = sample.id; persist();
}
ACT['wz-finish'] = async () => {
  const H = HH(); const d = wzDraft(H);
  const report = finishWizard(H, d);
  H.setup.lastReport = report; H.setup.step = 0; H.setup.draft = null; persist(); flushDB();
  go('#/home'); setTimeout(() => showPlanResult(H, report), 120);
};
function finishWizard(H, d) {
  const S = DB.settings;
  const hours = wzDurationHours(d);
  const prevDone = (H.cfg && H.cfg.equipDone) || {};
  H.people = d.people.map((p, i) => {
    const isKid = +p.age < 18; const nAd = d.people.slice(0, i).filter(x => +x.age >= 18).length + 1, nKid = d.people.slice(0, i).filter(x => +x.age < 18).length + 1;
    return { id: p.id || uid(), name: (p.name || '').trim() || (isKid ? 'Kind ' + nKid : 'Erwachsene/r ' + nAd), age: +p.age, needs: Object.assign(emptyNeeds(), p.needs || {}) };
  });
  H.people.forEach(p => { p.needs.meds = (p.needs.meds || []).filter(m => m.name && m.name.trim()); });
  H.pets = d.pets.map(p => ({ id: p.id || uid(), species: p.species, name: p.name || '', count: +p.count || 1, age: p.age === '' ? '' : +p.age, weightKg: p.weightKg === '' ? '' : +p.weightKg, needs: p.needs || '' }));
  const hs = Object.assign({}, d.housing); hs.waterL = hs.hasWater ? +hs.waterL || 0 : 0; hs.foodDays = hs.hasFood ? +hs.foodDays || 0 : 0;
  H.cfg = { goals: d.goals.slice(), customScenario: d.customScenario, strategies: d.strategies.length ? d.strategies.slice() : ['home'], hhType: d.hhType, country: d.country, region: d.region, zip: d.zip, housing: hs, durationHours: hours, includeOptional: d.includeOptional, hasSpecial: d.hasSpecial, equipDone: Object.assign({}, prevDone) };
  for (const b of d.bags) { if (H.bags.some(x => x.id === b.id)) continue; const bt = BAG_TYPE[b.type] || BAG_TYPE.trekking; H.bags.push(newBag({ id: b.id, name: (b.name || '').trim() || bt.label + ' ' + b.liters + ' L', type: b.type, liters: +b.liters || bt.liters, ownKg: bt.ownKg })); }
  for (const [key, qty] of Object.entries(d.equipment)) {
    const add = qty - (prevDone[key] || 0); if (add <= 0) continue;
    H.items.push(makeItem({ key, qty: add, container: 'home' }, { status: 'owned', source: 'wizard', place: 'Zuhause', prio: 'rec' }));
    H.cfg.equipDone[key] = qty;
  }
  if (!H.name || H.name === 'Mein Haushalt') H.name = d.hhType === 'single' ? 'Mein Haushalt' : d.hhType === 'family' ? 'Familie' : H.name;
  const ids = new Set(H.people.map(p => p.id));
  H.items.forEach(i => { if (i.personId && !ids.has(i.personId)) i.personId = null; });
  H.bags.forEach(b => { if (b.owner && !ids.has(b.owner)) b.owner = null; });
  const report = applyPlan(H, S);
  H.setup.done = true; H.setup.skipped = false;
  return report;
}
function planFacts(H) {
  const S = DB.settings; const calc = householdCalc(H, S); const ctx = planContext(H, S);
  const items = H.items.filter(i => !i.archived);
  const perPersonLists = H.people.map(p => items.filter(i => i.container === 'bag' && (i.personId === p.id)).length);
  return {
    calc, ctx, bags: H.bags.length, lists: perPersonLists.reduce((a, b) => a + b, 0), shared: items.filter(i => i.container === 'bag' && !i.personId).length,
    stock: items.filter(i => i.container === 'home' && i.status !== 'owned').length, unchecked: items.filter(i => i.status === 'planned').length, tasks: H.tasks.filter(t => !t.done).length,
    reminders: H.reminders.length, contacts: H.contacts.length, docs: H.docs.length, water: calc.waterDay * ctx.homeDays, kcal: calc.kcalDay * ctx.homeDays,
  };
}
function showPlanResult(H, report) {
  const f = planFacts(H);
  const rows = [
    ['Persönliche Notfallrucksäcke', `${f.bags} Rucksack/Rucksäcke (${report.bags ? report.bags + ' neu vorgeschlagen' : 'vorhandene zugeordnet'})`, '#/bags'],
    ['Packlisten pro Person', `${f.lists} Positionen`, '#/bags'], ['Gemeinsame Familienausrüstung', `${f.shared} Positionen`, '#/bags'],
    ['Hausvorratsliste', f.ctx.homeDays ? `${f.stock} offene Positionen für ${f.ctx.homeDays} Tage` : 'Kein Hausvorrat gewählt', '#/stock'],
    ['Einkaufsliste', `${f.unchecked} Positionen warten auf deine Prüfung („Habe ich“ / „Fehlt“)`, '#/review'], ['Gewichtsübersicht pro Rucksack', 'Im Rucksack-Bereich mit 3D-Ansicht', '#/bags'],
    ['Wasserbedarf', f.ctx.homeDays ? `ca. ${fmt(f.calc.waterDay)} l pro Tag, ${fmt0(f.water)} l für ${f.ctx.homeDays} Tage (Schätzwert)` : `ca. ${fmt(f.calc.waterDay)} l pro Tag (Schätzwert)`, '#/stock'],
    ['Lebensmittelbedarf', `ca. ${fmt0(f.calc.kcalDay)} kcal pro Tag${f.ctx.homeDays ? ', ' + fmt0(f.kcal / 1000) + ' Mio. kcal gesamt' : ''} (Schätzwert)`.replace('Mio. kcal gesamt', 'Tsd. kcal gesamt'), '#/stock'],
    ['Erinnerungen und Kontrollen', `${f.reminders} Erinnerungen`, '#/remind'], ['Individuelle Hinweise', `${recCounts(H, DB.settings).must + recCounts(H, DB.settings).rec} Empfehlungen`, '#/recs'],
    ['Vorbereitete Notfallkontakte', `${f.contacts} Einträge (Notrufnummern, Platzhalter zum Ausfüllen)`, '#/contacts'], ['Dokumenten-Checkliste', `${f.docs} Dokumente`, '#/docs'], ['Offene Aufgaben', `${f.tasks} Aufgaben`, '#/home'],
  ];
  const m = openModal({ title: 'Dein persönlicher Plan ist fertig', wide: true, body: h`<p class="muted">Alles ist editierbar. Als Nächstes bestätigst du, was du schon hast.</p><div class="list card flush">${rows.map(([t, s, href]) => h`<a class="li" href="${href}"><span class="grow"><span class="t">${t}</span><br><span class="s">${s}</span></span>${icon('chev', 'chev')}</a>`)}</div>`, foot: dlgButtons([{ label: 'Zum Start', act: 'dlg-no' }, { label: 'Ausrüstung prüfen', cls: 'primary', act: 'plan-review' }]) });
  m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'plan-review') { closeModal(m); go('#/review'); } else if (a.dataset.act === 'dlg-no') { closeModal(m); } });
}
ACT['wz-restart'] = async () => {
  const H = HH(); const ok = await confirmDlg('Assistenten erneut starten?', 'Deine Antworten bleiben vorausgefüllt. Beim Abschluss werden nur neue Vorschläge ergänzt – bestehende Gegenstände, Fotos und Notizen bleiben erhalten.', { ok: 'Starten' });
  if (!ok) return; H.setup.draft = wzInitial(H); H.setup.step = 0; H.setup.skipped = false; persist(); go('#/wizard');
};
