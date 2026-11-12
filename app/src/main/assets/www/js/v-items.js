'use strict';
/* ===== Notfall! – Ausrüstung prüfen, Inventar, Gegenstandsdetails, Hausvorrat ===== */
const UNITS = ['Stück', 'Set', 'Paar', 'Packung', 'Liter', 'kg', 'g', 'Tagesration', 'Rolle', 'Flasche', 'Dose', 'Euro', 'Personentage', 'Vorrat', 'Blatt'];

function groupInfo(H, it) {
  if (it.petId) { const pet = byId(H.pets, it.petId); return ['pet:' + it.petId, 'Haustier' + (pet ? ': ' + pet.species + (pet.name ? ' ' + pet.name : '') : '')]; }
  if (it.container === 'bag') return it.personId ? ['bag:' + it.personId, 'Rucksack – ' + personName(H, it.personId)] : ['bag:shared', 'Gemeinsame Ausrüstung im Rucksack'];
  if (it.container === 'car') return ['car', 'Auto'];
  return ['home', 'Hausvorrat & Zuhause'];
}
const REV = { tab: 'check', prio: 'all' };
const PRIO_ORDER = { must: 0, rec: 1, opt: 2 };
/* Packen Rucksack für Rucksack: Rucksack wählen → Kategorien → abhaken oder antippen; Lupe zum Suchen */
const PICK = { cat: null, bag: null, q: '' };
const NOBAG = '_none';
const packItems = H => H.items.filter(i => !i.archived && i.container !== 'home');
const bagItemsOf = (H, bid) => packItems(H).filter(i => bid === NOBAG ? !i.bagId || !byId(H.bags, i.bagId) : i.bagId === bid);
function packBags(H) { const out = H.bags.slice(); if (bagItemsOf(H, NOBAG).length) out.push({ id: NOBAG, name: 'Ohne Tasche', comps: [], noBag: true }); return out; }
function bagHref(bid, cat) { return '#/review/b/' + bid + (cat ? '/c/' + cat : ''); }
function pickVisible(H, bag) {
  const mine = bagItemsOf(H, bag.id); const owner = bag.owner ? byId(H.people, bag.owner) : null; const hidden = new Set(bag.hiddenCats || []);
  const kids = owner ? +owner.age < 13 : H.people.some(p => +p.age < 13);
  const cats = PICK_CATS.filter(c => !hidden.has(c.id) && (mine.some(i => itemCat(i) === c.id) || (c.id === 'kids' ? kids : c.id === 'pets' ? H.pets.length > 0 && (!owner || +owner.age >= 13) : c.id === 'car' ? bag.role === 'car' : true)));
  const sorted = bag.role === 'car' ? cats.sort((x, y) => (y.id === 'car') - (x.id === 'car')) : cats;
  return sorted.concat(customCats(H).filter(c => !hidden.has(c.id)));
}
function pickable(t, cat) { return !t.nopack && t.z !== 'home' && (t.z !== 'car' || cat === 'car') && !/^stock_/.test(t.k) && t.k !== 'meds'; }
function pickTemplates(H, bid, catId, q, keep) {
  const have = new Set(bagItemsOf(H, bid).map(i => String(i.key || '').split(':')[0]));
  const nq = q ? norm(q) : ''; const car = (byId(H.bags, bid) || {}).role === 'car';
  return Object.values(T).filter(t => (!have.has(t.k) || (keep && keep.has(t.k))) && (catId ? !!PICK_CAT[catId] && PICK_CAT[catId].cats.includes(t.c) && pickable(t, catId) : pickable(t, car ? 'car' : '')) && (!nq || norm(t.n + ' ' + t.c).includes(nq))).sort((x, y) => x.n.localeCompare(y.n, 'de'));
}
const sortPrio = (a, b) => (a.source === 'pick') - (b.source === 'pick') || PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || a.name.localeCompare(b.name, 'de');
function addRow(t) {
  return h`<div class="li"><span class="grow"><span class="t">${t.n}</span>${t.w ? h`<br><span class="s">${t.w}</span>` : ''}</span><button class="btn icon primary" data-act="pick-add" data-key="${t.k}" aria-label="${t.n} hinzufügen">${icon('plus')}</button></div>`;
}
const searchBtn = bid => h`<button class="btn icon sm" data-act="add-open" data-bag="${bid}" aria-label="Suchen und hinzufügen">${icon('search')}</button>`;
/* Ein Fenster zum Hinzufügen: suchen oder Kategorie antippen, Plus drücken – bleibt offen für mehr */
const ADD = { bag: null, cat: null, q: '', added: new Set(), last: null };
function addSheetBody(H) {
  const bags = H.bags; const bag = byId(H.bags, ADD.bag) || bags[0]; if (!bag) return h`<p class="muted">Erst einen Rucksack anlegen.</p>`;
  ADD.bag = bag.id; PICK.bag = bag.id; PICK.cat = ADD.cat;
  const q = ADD.q.trim();
  let res = q ? pickTemplates(H, bag.id, null, q, ADD.added).slice(0, 25) : ADD.cat ? pickTemplates(H, bag.id, ADD.cat, '', ADD.added).filter(t => BASE_KEYS.has(t.k)) : [];
  /* „Passt dazu“: zur zuletzt hinzugefügten Sache und zu den ersten Suchtreffern */
  const haveK = new Set(bagItemsOf(H, bag.id).map(i => String(i.key || '').split(':')[0]));
  const compK = [...new Set([...(ADD.last ? COMPANIONS[ADD.last] || [] : []), ...res.slice(0, 2).flatMap(t => COMPANIONS[t.k] || [])])].filter(k => T[k] && (!haveK.has(k) || ADD.added.has(k)));
  const comp = compK.map(k => T[k]).slice(0, 4); res = res.filter(t => !comp.includes(t));
  const row = t => h`<div class="li addrow"><span class="grow"><span class="t">${t.n}</span>${t.w ? h`<br><span class="s">${t.w}</span>` : ''}</span>${ADD.added.has(t.k) ? h`<span class="addok">${icon('check')}</span>` : h`<button class="btn icon primary" data-act="add-one" data-key="${t.k}" aria-label="${t.n} hinzufügen">${icon('plus')}</button>`}</div>`;
  return h`${bags.length > 1 ? h`<div class="chips">${bags.map(b => h`<button class="chip" aria-pressed="${b.id === bag.id ? 'true' : 'false'}" data-act="add-bag" data-id="${b.id}">${b.name}</button>`)}</div>` : ''}
    <div class="chips">${pickVisible(H, bag).map(c => h`<button class="chip" aria-pressed="${!q && ADD.cat === c.id ? 'true' : 'false'}" data-act="add-cat" data-id="${c.id}">${c.short || c.label}</button>`)}</div>
    ${comp.length ? h`<div class="card flush passt"><div class="card-head" style="padding:10px 14px 0"><h3>Passt dazu</h3></div><div class="list">${comp.map(row)}</div></div>` : ''}
    <div id="addres">${res.length ? h`<div class="list">${res.map(row)}</div>` : !q && !ADD.cat ? h`<p class="muted">Tippe oben, was du suchst – oder wähle eine Kategorie.</p>` : !q && !PICK_CAT[ADD.cat] ? h`<p class="muted">Eigene Kategorie: oben eintippen, was hinein soll, dann „… hinzufügen“.</p>` : h`<p class="muted">Keine Vorschläge${q ? ' für „' + q + '“' : ''}.</p>`}
    ${q ? h`<button class="btn block" style="margin-top:8px" data-act="add-custom">${icon('plus')} „${q}“ hinzufügen</button>` : ''}</div>`;
}
function openAddSheet(bid, cat) {
  const H = HH(); ADD.bag = bid && bid !== NOBAG ? bid : (H.bags[0] || {}).id; ADD.cat = cat || null; ADD.q = ''; ADD.added = new Set(); ADD.last = null;
  const bag = byId(H.bags, ADD.bag);
  const m = openModal({ title: 'Hinzufügen', body: h`<input id="addq" type="search" placeholder="Suchen, z. B. Batterien" autocomplete="off" enterkeyhint="search" maxlength="60"><div id="addbody" class="stack-s" style="margin-top:10px">${addSheetBody(H)}</div>`, onClose: () => refreshView() });
  const refresh = () => { const b = $('#addbody', m.el); if (b) { b.innerHTML = addSheetBody(HH()).s; } const t = $('h2', m.el); const bg = byId(HH().bags, ADD.bag); if (t && bg) t.textContent = 'Zu „' + bg.name + '“ hinzufügen'; };
  $('#addq', m.el).addEventListener('input', e => { ADD.q = e.target.value; refresh(); });
  m.el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return; const d = a.dataset; const H2 = HH();
    if (d.act === 'add-bag') { ADD.bag = d.id; ADD.added = new Set(); refresh(); }
    else if (d.act === 'add-cat') { ADD.cat = d.id; ADD.q = ''; $('#addq', m.el).value = ''; refresh(); }
    else if (d.act === 'add-one' && T[d.key]) { PICK.bag = ADD.bag; pickPut(H2, makeItem({ key: d.key, qty: 1 }, { status: 'owned', source: 'pick', prio: 'opt' })); ADD.added.add(d.key); ADD.last = d.key; refresh(); }
    else if (d.act === 'add-custom') { const name = ADD.q.trim().slice(0, 80); if (!name) return; PICK.bag = ADD.bag; PICK.cat = ADD.cat; pickPut(H2, makeItem({ key: '', name, category: ADD.cat && PICK_CAT[ADD.cat] ? PICK_CAT[ADD.cat].cats[0] : 'Sonstiges', tags: inferTags(name) }, { status: 'owned', source: 'pick', prio: 'opt', key: '', pcat: ADD.cat && !PICK_CAT[ADD.cat] ? ADD.cat : undefined })); ADD.q = ''; $('#addq', m.el).value = ''; refresh(); }
    else return;
    e.stopPropagation();
  }, true);
  refresh();
  if (!cat) setTimeout(() => { const i = $('#addq', m.el); if (i) i.focus(); }, 60);
  return m;
}
ACT['add-open'] = d => openAddSheet(d.bag || PICK.bag, d.cat);
function progressCard(title, its, extra) {
  const have = its.filter(i => i.status === 'owned').length, miss = its.filter(i => i.status === 'missing').length;
  return h`<div class="card"><h2>${title}</h2>
    ${its.length ? h`<div style="margin-top:10px">${bar(Math.round(have / its.length * 100), 'ok')}</div>` : ''}
    <div class="row spread" style="margin-top:8px"><span class="bold">${its.length ? `${have} von ${its.length} vorhanden` : 'Noch leer'}</span>${miss ? h`<a class="badge must" href="#/shop" style="text-decoration:none">${miss} ${miss === 1 ? 'fehlt' : 'fehlen'}</a>` : ''}</div>${extra || ''}</div>`;
}
function bagMetaShort(H, b) { if (b.id === NOBAG) return 'Gemeinsame Sachen ohne festen Rucksack'; const o = b.owner && byId(H.people, b.owner); return [o ? o.name : 'gemeinsam', fmt0(b.liters) + ' l'].join(' · '); }

/* 1) Welcher Rucksack? */
route('/review', H => {
  const bags = packBags(H);
  if (!bags.length) return { title: 'Packliste', html: h`${empty('Noch kein Rucksack.')}<div class="actionbar"><a class="btn primary lg" href="#/wizard">${icon('list')} Notfallplan erstellen</a></div>` };
  if (bags.length === 1) { history.replaceState(null, '', bagHref(bags[0].id)); return ROUTES.find(r => r.re.test('/review/b/x')).fn(bags[0].id, H); }
  const all = packItems(H);
  return {
    title: 'Packliste',
    html: h`${progressCard('Welchen Rucksack packst du?', all)}
    <div class="stack-s">${bags.map(b => { const its = bagItemsOf(H, b.id); const n = its.filter(i => i.status === 'owned').length;
      return h`<a class="tile" href="${bagHref(b.id)}"><span class="ti">${icon(b.role === 'car' ? 'car' : 'bag')}</span><span class="grow"><span class="tt">${b.name}</span><br><span class="ts">${bagMetaShort(H, b)} · ${its.length ? `${n} von ${its.length}` : 'leer'}</span><span style="display:block;margin-top:6px">${bar(its.length ? Math.round(n / its.length * 100) : 0, 'ok')}</span></span>${icon('chev', 'chev')}</a>`; })}</div>`,
  };
});

/* Kurze Zeile mit Gewicht – statt großer Karte */
function miniLoad(H, bag) {
  if (!bag || bag.id === NOBAG) return '';
  const st = bagStats(H, DB.settings, bag); const cap = st.capKg ? st.capKg * 1000 : 0;
  const cls = st.overweight ? (st.overFactor > 1.25 ? 'must' : 'rec') : 'ok';
  return h`<div class="miniload"><span class="small ${st.overweight ? 't' + cls : 'muted'}">${fmt(st.totalG / 1000)}${cap ? ' / ' + fmt(st.capKg) : ''} kg${st.overweight ? ' – zu schwer' : ''}</span>${cap ? bar(Math.round(st.totalG / cap * 100), cls) : ''}</div>`;
}
/* Erste Kategorie, in der noch etwas offen ist (für „Weiter packen“) */
function nextOpenCat(H, bag) { const its = bagItemsOf(H, bag.id); const c = pickVisible(H, bag).find(c => its.some(i => itemCat(i) === c.id && i.status !== 'owned')); return c || null; }

/* 2) Kategorien eines Rucksacks */
route('/review/b/:bid', (bid, H) => {
  const bag = bid === NOBAG ? packBags(H).find(b => b.id === NOBAG) : byId(H.bags, bid);
  if (!bag) return { title: 'Packliste', back: '#/review', html: empty('Rucksack nicht gefunden.') };
  PICK.bag = bid; const its = bagItemsOf(H, bid); const have = its.filter(i => i.status === 'owned').length; const open = its.filter(i => i.status === 'planned').length;
  const bags = packBags(H); const k = bags.findIndex(b => b.id === bid); const nxt = bags[k + 1]; const nc = nextOpenCat(H, bag);
  return {
    title: bag.name, back: bags.length > 1 ? '#/review' : null, actions: searchBtn(bid),
    html: h`<div class="card tight"><div class="row spread"><b>${its.length ? `${have} von ${its.length} da` : 'Noch leer'}</b>${open ? h`<button class="btn sm ghost" data-act="ask-start" data-bag="${bid}">Einzeln abfragen</button>` : ''}</div>${its.length ? bar(Math.round(have / its.length * 100), 'ok') : ''}${miniLoad(H, bag)}</div>
    <div class="catlist">${pickVisible(H, bag).map(c => { const ci = its.filter(i => itemCat(i) === c.id); const n = ci.filter(i => i.status === 'owned').length; const mustOpen = ci.some(i => i.status !== 'owned' && i.prio === 'must'); const done = ci.length && n === ci.length;
      return h`<a class="cat ${done ? 'done' : ''}" href="${bagHref(bid, c.id)}">${icon(done ? 'check' : c.icon)}<span class="cl">${c.short || c.label}</span><span class="cs">${ci.length ? `${n}/${ci.length}` : '+'}</span>${mustOpen ? h`<span class="sdot must" aria-label="Wichtiges offen"></span>` : ''}</a>`; })}</div>
    <div class="actionbar">${nc ? h`<a class="btn primary lg" href="${bagHref(bid, nc.id)}">${have ? 'Weiter packen' : 'Los geht’s'}: ${nc.label} ${icon('chev')}</a>` : nxt ? h`<a class="btn primary lg" href="${bagHref(nxt.id)}">Nächster: ${nxt.name} ${icon('chev')}</a>` : h`<button class="btn primary lg" data-act="rv-done">${icon('check')} Fertig</button>`}</div>`,
  };
});

/* Gleiche Sachen im selben Rucksack als eine Zeile */
function groupRows(items) {
  const m = new Map();
  for (const i of items) { const k = (String(i.key || '').split(':')[0] || '') + '|' + norm(i.name) + '|' + (i.unit || ''); if (!m.has(k)) m.set(k, []); m.get(k).push(i); }
  return [...m.values()];
}
/* 3) Eine Kategorie in einem Rucksack */
const MORE = new Set();
route('/review/b/:bid/c/:cat', (bid, cat, H) => {
  const C = catDef(cat, H); const bag = bid === NOBAG ? packBags(H).find(b => b.id === NOBAG) : byId(H.bags, bid);
  if (!C || !bag) return { title: 'Packliste', back: '#/review', html: empty('Nicht gefunden.') };
  PICK.bag = bid; PICK.cat = cat;
  const rows = groupRows(bagItemsOf(H, bid).filter(i => itemCat(i) === cat).sort(sortPrio));
  const more = pickTemplates(H, bid, cat, ''); const showMore = !rows.length || MORE.has(bid + cat);
  const vis = pickVisible(H, bag); const k = vis.findIndex(c => c.id === cat); const nxt = vis[k + 1];
  const bags = packBags(H); const nb = bags[bags.findIndex(b => b.id === bid) + 1];
  const haveN = rows.filter(r => r.every(i => i.status === 'owned')).length;
  return {
    title: C.label, back: bagHref(bid), actions: searchBtn(bid),
    html: h`<div class="stepline"><span class="muted small">${bag.name} · ${k + 1} von ${vis.length}</span>${miniLoad(H, bag)}</div>
    ${rows.length ? h`<p class="hint">Hake ab, was du hast.${rows.some(r => r[0].prio === 'must') ? h` <span class="dotlegend"></span> = wichtig` : ''}</p>
      <div class="card flush"><div class="list">${rows.map(r => tickRow(r, H))}</div></div>
      <p class="muted small" style="text-align:right">${haveN} von ${rows.length} da</p>` : ''}
    ${!rows.length && more.length ? h`<div class="card flush"><div class="card-head" style="padding:14px 16px 0"><h3>Was kommt rein?</h3></div><div class="list">${more.map(addRow)}</div></div>` : ''}
    <button class="btn block" data-act="add-open" data-bag="${bid}" data-cat="${cat}">${icon('plus')} ${rows.length ? 'Noch etwas dazu' : 'Etwas anderes hinzufügen'}</button>
    <div class="actionbar">${nxt ? h`<a class="btn primary lg" href="${bagHref(bid, nxt.id)}">Weiter: ${nxt.label} ${icon('chev')}</a>` : nb ? h`<a class="btn primary lg" href="${bagHref(nb.id)}">Nächster: ${nb.name} ${icon('chev')}</a>` : h`<button class="btn primary lg" data-act="rv-done">${icon('check')} Fertig</button>`}</div>`,
  };
});
ACT['pick-more'] = d => { MORE.add(d.k); rerender(true); };
route('/review/c/:cat', (cat, H) => { const b = packBags(H)[0]; if (!b) return { title: 'Packliste', html: empty('Noch kein Rucksack.') }; history.replaceState(null, '', bagHref(b.id, cat)); return ROUTES.find(r => r.re.test('/review/b/x/c/y')).fn(b.id, cat, H); });

function pickResults(H) {
  const q = PICK.q.trim(); if (!q) return h`<p class="muted">Tippe z. B. „Batterien“, „Feuer“ oder „Pflaster“.</p>`;
  const nq = norm(q); const bid = PICK.bag || (packBags(H)[0] || {}).id;
  const mine = bagItemsOf(H, bid).filter(i => norm(i.name + ' ' + i.category).includes(nq)).sort(sortPrio).slice(0, 30);
  const more = pickTemplates(H, bid, null, q).slice(0, 30);
  return h`${mine.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>Schon im Rucksack</h3></div><div class="list">${mine.map(it => tickRow(it, H))}</div></div>` : ''}
    ${more.length ? h`<div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h3>Hinzufügen</h3></div><div class="list">${more.map(addRow)}</div></div>` : ''}
    <button class="btn block" data-act="pick-custom" data-name="${q}">${icon('plus')} „${q}“ hinzufügen</button>`;
}
route('/review/search', H => {
  const bags = packBags(H); if (!bags.some(b => b.id === PICK.bag)) PICK.bag = bags[0] ? bags[0].id : null;
  const bag = bags.find(b => b.id === PICK.bag);
  return {
    title: 'Suchen', back: PICK.bag ? bagHref(PICK.bag, PICK.cat) : '#/review',
    html: h`<div class="field"><label for="pickq">Gegenstand suchen</label><input id="pickq" type="search" value="${PICK.q}" data-input="pick-q" placeholder="z. B. Batterien" autocomplete="off" enterkeyhint="search"></div>
    ${bags.length > 1 ? h`<div class="chips">${bags.map(b => h`<button class="chip" aria-pressed="${b.id === PICK.bag ? 'true' : 'false'}" data-act="pick-bag" data-id="${b.id}">${b.name}</button>`)}</div>` : bag ? h`<p class="muted small">${icon('bag')} ${bag.name}</p>` : ''}
    <div id="pickres" class="stack">${pickResults(H)}</div>`,
    after: () => { const el = $('#pickq'); if (el && !PICK.q) el.focus(); },
  };
});
INPUT['pick-q'] = el => { PICK.q = el.value; const box = $('#pickres'); if (box) { box.innerHTML = pickResults(HH()).s; hydratePhotos(box); } };
ACT['pick-bag'] = d => { PICK.bag = d.id; rerender(true); };
ACT['pick-search'] = d => { PICK.bag = d.bag; go('#/review/search'); };
function pickPut(H, it) {
  const bag = PICK.bag && PICK.bag !== NOBAG ? byId(H.bags, PICK.bag) : null;
  if (bag) { it.bagId = bag.id; it.container = bag.role === 'car' ? 'car' : 'bag'; it.personId = bag.owner || null; }
  H.items.push(it); if (bag) autoPack(H, bag, { onlyUnassigned: true });
  persist(); toast(`${it.name} hinzugefügt${bag ? ' · ' + bag.name : ''}`);
}
ACT['pick-add'] = d => { const H = HH(); if (!T[d.key]) return; const it = makeItem({ key: d.key, qty: 1 }, { status: 'owned', source: 'pick', prio: 'opt' }); pickPut(H, it); rerender(true); askExpiry(it); };
ACT['pick-custom'] = d => {
  const H = HH(); const name = String(d.name || '').trim().slice(0, 80); if (!name) return;
  const cat = PICK.cat && PICK_CAT[PICK.cat] ? PICK_CAT[PICK.cat].cats[0] : 'Sonstiges';
  pickPut(H, makeItem({ key: '', name, category: cat, tags: inferTags(name) }, { status: 'owned', source: 'pick', prio: 'opt', key: '', pcat: PICK.cat && !PICK_CAT[PICK.cat] ? PICK.cat : undefined })); PICK.q = ''; rerender(true);
};
ACT['pick-custom-open'] = () => {
  formDlg({ title: 'Eigener Gegenstand', ok: 'Hinzufügen', body: h`${F.text('name', 'Name', '', { req: true, max: 80, ph: 'z. B. Ersatzakku Kamera' })}`,
    onSubmit: fd => { ACT['pick-custom']({ name: fd.get('name') }); } });
};
ACT['pick-photo'] = async d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; const pid = await addPhotoTo(null); if (!pid) return; it.photos = it.photos || []; it.photos.push(pid); persist(); refreshView(); };
const QTY_STEP = { Euro: 10, g: 50, kg: .5, Liter: .5 };
/* Eine Zeile: Haken, Name, Menge – mehr gibt es hinter dem Pfeil */
function tickRow(r, H) {
  const rows = Array.isArray(r) ? r : [r]; const it = rows[0]; const own = rows.every(i => i.status === 'owned');
  const qty = rows.reduce((a, i) => a + (+i.qty || 0), 0); const g = rows.reduce((a, i) => a + (+i.weightG || 0) * (+i.qty || 0), 0);
  const ids = rows.map(i => i.id).join(',');
  return h`<div class="li tick ${own ? 'done' : ''}"><label class="tickl grow"><input type="checkbox" data-change="rv-tick" data-id="${it.id}" data-ids="${ids}" ${own ? raw('checked') : ''} aria-label="${it.name} vorhanden"><span class="grow"><span class="t">${it.name}</span><br><span class="s">${fmt(qty)} ${it.unit || ''}${g ? ' · ' + fmtKg(g) : ''}${rows.some(i => i.status === 'missing') ? ' · auf der Einkaufsliste' : ''}</span></span></label>
    ${it.photos && it.photos[0] ? h`<span class="thumb"><img data-ph="${it.photos[0]}" data-act="ph-view" data-id="${it.photos[0]}" alt="Foto"></span>` : ''}
    ${!own && it.prio === 'must' && it.source !== 'pick' ? h`<span class="sdot must" title="wichtig" aria-label="wichtig"></span>` : ''}<button class="catmore" data-act="it-sheet" data-ids="${ids}" aria-label="Mehr zu ${it.name}">${icon('dots')}</button></div>`;
}
/* Unterseite eines Gegenstands: Menge, anderer Rucksack, Foto, Details */
ACT['it-sheet'] = d => {
  const H = HH(); const S = DB.settings; const rows = String(d.ids).split(',').map(id => byId(H.items, id)).filter(Boolean); const it = rows[0]; if (!it) return;
  const others = H.bags.filter(b => b.id !== it.bagId);
  const m = openModal({ title: it.name, body: h`<div class="stack">
      <div class="row spread"><b>Menge</b><span class="qty"><button class="btn icon" data-act="qty" data-id="${it.id}" data-d="-1" aria-label="weniger">${icon('minus')}</button><span class="qv" id="sheetqv">${itemQtyLabel(it)}</span><button class="btn icon" data-act="qty" data-id="${it.id}" data-d="1" aria-label="mehr">${icon('plus')}</button></span></div>
      ${it.why ? h`<p class="muted small">${it.why}</p>` : ''}
      <div class="btns"><button class="btn" data-act="pick-photo" data-id="${it.id}">${icon('camera')} Foto</button><a class="btn" href="#/item/${it.id}">${icon('edit')} Alle Angaben</a></div>
      ${others.length ? h`<div><div class="label">In anderen Rucksack</div><div class="stack-s" style="margin-top:6px">${others.map(b => { const st = bagStats(H, S, b); return h`<button class="tile slim" data-act="mv-to" data-ids="${String(d.ids)}" data-bag="${b.id}"><span class="grow"><span class="tt">${b.name}</span><br><span class="ts ${st.overweight ? 'tmust' : ''}">${fmt(st.totalG / 1000)}${st.capKg ? ' / ' + fmt(st.capKg) : ''} kg</span></span>${icon('chev', 'chev')}</button>`; })}</div></div>` : ''}</div>`,
    onClose: () => refreshView() });
  const del = document.createElement('div'); del.innerHTML = h`<button class="btn block ghost danger" style="margin-top:12px" data-act="it-del" data-ids="${String(d.ids)}">${icon('trash')} Aus der Tasche entfernen</button>`.s; $('.modal-body', m.el).appendChild(del.firstElementChild);
  m.el.addEventListener('click', e => { if (e.target.closest('a[href]')) { m.onClose = null; closeModal(m); } else if (e.target.closest('[data-act=mv-to],[data-act=pick-photo]')) { closeModal(m); } });
};
ACT['it-del'] = async d => {
  const H = HH(); const ids = String(d.ids).split(','); const it = byId(H.items, ids[0]); if (!it) return;
  const ok = await confirmDlg(`„${it.name}“ entfernen?`, 'Die Sache wird aus der Tasche gelöscht.', { ok: 'Entfernen', danger: true }); if (!ok) return;
  H.items = H.items.filter(i => !ids.includes(i.id)); H.shop = H.shop.filter(s => !ids.includes(s.itemId) || s.bought);
  persist(); const top = UI.modals[UI.modals.length - 1]; if (top && !top.refresh) closeModal(top); else refreshView(); toast('Entfernt');
};
ACT['qty'] = d => {
  const H = HH(); const it = byId(H.items, d.id); if (!it) return; const st = QTY_STEP[it.unit] || 1;
  it.qty = Math.max(st, Math.round(((+it.qty || 0) + st * (+d.d)) * 100) / 100); persist();
  const qv = $('#sheetqv'); if (qv) qv.textContent = itemQtyLabel(it); else rerender(true);
};
ACT['mv-bag'] = d => ACT['it-sheet']({ ids: d.id });
ACT['mv-to'] = d => {
  const H = HH(); const b = byId(H.bags, d.bag); const its = String(d.ids || d.id).split(',').map(id => byId(H.items, id)).filter(Boolean); if (!its.length || !b) return;
  for (const it of its) { it.bagId = b.id; it.compId = null; it.packed = false; it.container = b.role === 'car' ? 'car' : 'bag'; it.personId = b.owner || null; }
  autoPack(H, b, { onlyUnassigned: true }); persist(); refreshView(); toast(`${its[0].name} → ${b.name}`);
};
/* Gewicht und Volumen des Rucksacks, damit man beim Auswählen sieht, wie schwer er wird */
function bagLoad(H, bag) {
  if (!bag || bag.id === NOBAG) return '';
  const st = bagStats(H, DB.settings, bag); const cap = st.capKg ? st.capKg * 1000 : 0;
  const pct = cap ? Math.round(st.totalG / cap * 100) : 0; const cls = st.overweight ? (st.overFactor > 1.25 ? 'must' : 'rec') : 'ok';
  return h`<div class="load"><div class="row spread"><span class="small bold ${st.overweight ? 't' + cls : ''}">${icon('bag')} ${fmt(st.totalG / 1000)}${cap ? ' von ' + fmt(st.capKg) : ''} kg${st.overweight ? ' – zu schwer' : ''}</span><span class="small muted ${st.overfull ? 'tmust' : ''}">${fmt0(st.fillPct)} % voll</span></div>${cap ? bar(pct, cls) : ''}</div>`;
}
/* Beim Abhaken einmal nach dem Haltbarkeitsdatum fragen – nur bei Sachen, die ablaufen */
/* Was abläuft, steht fest in dieser Liste (Vorlagen-Schlüssel). Alles andere – Brille, Thermometer, Akkus, Werkzeug – nie fragen. */
const EXPIRY_KEYS = ['water_carry', 'water_stock', 'food_baby', 'food_child', 'food_snack', 'food_ration', 'nuts', 'car_water', 'pet_food', 'pet_water',
  'batteries', 'coin_cells', 'hearing_batt', 'firstaid', 'firstaid_home', 'car_firstaid', 'painkiller', 'diarrhea', 'disinfect', 'sunscreen', 'insect_repellent', 'electrolyte',
  'water_treat', 'fuel', 'fuel_home', 'pet_meds', 'meds', 'mask_ffp2', 'tinder', 'stock_grain', 'stock_protein', 'stock_veg', 'stock_fruit', 'stock_dairy', 'stock_fat', 'stock_extras'];
function needsExpiry(it) {
  if (!it || it.expiry || it.noExpiry || it.status !== 'owned') return false;
  const [k, k2] = String(it.key || '').split(':');
  if (['aid', 'device', 'care'].includes(k2)) return false;   // Brille, Hörgerät, Pflege: läuft nicht ab
  return EXPIRY_KEYS.includes(k) || (!k && it.category === 'Lebensmittel');
}
function askExpiry(it) {
  if (!needsExpiry(it)) return;
  const med = it.category === 'Medizin' || /^meds/.test(String(it.key || ''));
  formDlg({ title: 'Haltbar bis?', ok: 'Speichern', extraFoot: [{ label: 'Kein Datum', act: 'exp-skip', data: { id: it.id } }],
    body: h`<p><b>${privateName(it)}</b></p>${F.date('expiry', med ? 'Verfallsdatum' : 'Datum auf der Packung', '', { req: true })}<p class="muted small">Die App erinnert dich rechtzeitig, bevor es abläuft.</p>`,
    onSubmit: fd => { const H = HH(); const x = byId(H.items, it.id); if (!x) return; x.expiry = fd.get('expiry'); x.expiryType = med ? 'use' : x.expiryType || 'mhd'; persist(); syncNotifications(); setTimeout(refreshView, 0); toast('Datum gespeichert'); } });
}
ACT['exp-skip'] = d => { const H = HH(); const x = byId(H.items, d.id); if (x) { x.noExpiry = true; persist(); } closeAllModals(); };
INPUT['rv-tick'] = el => {
  const H = HH(); const its = String(el.dataset.ids || el.dataset.id).split(',').map(id => byId(H.items, id)).filter(Boolean); if (!its.length) return;
  for (const it of its) { if (el.checked) setItemStatus(H, it, 'owned'); else { setItemStatus(H, it, 'planned'); H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); } }
  persist(); refreshView(); if (el.checked) askExpiry(its[0]);
};
ACT['rv-done'] = async () => {
  const H = HH(); const open = packItems(H).filter(i => i.status === 'planned');
  if (open.length) {
    const ok = await confirmDlg(`${open.length} nicht abgehakt`, 'Diese Sachen als „fehlt“ auf die Einkaufsliste setzen?', { ok: 'Auf die Einkaufsliste' });
    if (!ok) return; open.forEach(i => setItemStatus(H, i, 'missing')); persist();
  }
  go('#/shop');
};

/* Einzeln abfragen: eine Frage pro Gegenstand, wichtigste zuerst */
const ASK = { skip: new Set(), yes: 0, no: 0, bag: null };
route('/review/ask', H => {
  const open = (ASK.bag ? bagItemsOf(H, ASK.bag) : packItems(H)).filter(i => i.status === 'planned' && !ASK.skip.has(i.id)).sort((a, b) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || groupInfo(H, a)[1].localeCompare(groupInfo(H, b)[1], 'de') || a.name.localeCompare(b.name, 'de'));
  if (!open.length) {
    const miss = H.items.filter(i => !i.archived && i.status === 'missing').length;
    return { title: 'Abfragen', back: ASK.bag ? bagHref(ASK.bag) : '#/review', html: h`<div class="card"><h2>Fertig</h2><p style="margin-top:8px">${ASK.yes} vorhanden · ${ASK.no} ${ASK.no === 1 ? "fehlt" : "fehlen"}${ASK.skip.size ? ` · ${ASK.skip.size} übersprungen` : ''}</p></div>
      <div class="actionbar"><a class="btn lg" href="${ASK.bag ? bagHref(ASK.bag) : '#/review'}">Zur Liste</a>${miss ? h`<a class="btn primary lg" href="#/shop">${icon('cart')} Einkaufsliste</a>` : h`<a class="btn primary lg" href="#/bags">${icon('bag')} Taschen packen</a>`}</div>` };
  }
  const it = open[0];
  return {
    title: 'Abfragen', back: ASK.bag ? bagHref(ASK.bag) : '#/review',
    html: h`<div class="row spread"><span class="muted small">${groupInfo(H, it)[1]}</span><span class="muted small mono">noch ${open.length}</span></div>
      <div class="card"><p class="muted">Hast du das?</p><h1 class="q" style="margin:6px 0">${it.name}</h1><p class="bold">${itemQtyLabel(it)} · ${levelBadge(it.prio)}</p>${it.why ? h`<p class="muted small" style="margin-top:8px">${it.why}</p>` : ''}</div>
      <button class="btn ghost block" data-act="ask-skip" data-id="${it.id}">Später</button>
      <div class="actionbar"><button class="btn danger lg" data-act="ask-no" data-id="${it.id}">${icon('cart')} Fehlt</button><button class="btn primary lg" data-act="ask-yes" data-id="${it.id}">${icon('check')} Habe ich</button></div>`,
  };
});
ACT['ask-start'] = d => { ASK.skip.clear(); ASK.yes = 0; ASK.no = 0; ASK.bag = (d && d.bag) || null; go('#/review/ask'); };
ACT['ask-yes'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'owned'); ASK.yes++; persist(); rerender(); askExpiry(it); };
ACT['ask-no'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'missing'); ASK.no++; persist(); rerender(); };
ACT['ask-skip'] = d => { ASK.skip.add(d.id); rerender(); };

function reviewRow(H, it) {
  const mark = it.prio === 'must' ? 'must' : it.prio === 'rec' ? 'rec' : '';
  return h`<div class="li ${mark}" style="flex-wrap:wrap;align-items:flex-start"><div class="grow" style="min-width:12rem"><a class="t" href="#/item/${it.id}" style="color:inherit;text-decoration:none">${it.name}</a>
    <div class="s">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) : ''} · ${levelBadge(it.prio)}</div>
    ${it.why ? h`<details class="small muted" style="margin-top:4px"><summary style="cursor:pointer;min-height:32px;display:flex;align-items:center">Warum?</summary><p>${it.why}</p></details>` : ''}</div>
    <div class="btns">${it.status !== 'owned' ? h`<button class="btn sm ok" data-act="rv-have" data-id="${it.id}">${icon('check')} Habe ich</button>` : ''}${it.status !== 'missing' ? h`<button class="btn sm danger" data-act="rv-miss" data-id="${it.id}">${icon('cart')} Fehlt</button>` : ''}${it.status !== 'planned' ? h`<button class="btn sm ghost" data-act="rv-undo" data-id="${it.id}">Zurück zu „Zu prüfen“</button>` : ''}</div></div>`;
}
ACT['rv-tab'] = d => { REV.tab = d.tab; rerender(); };
ACT['rv-prio'] = d => { REV.prio = d.prio; rerender(); };
ACT['rv-have'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'owned'); persist(); rerender(); };
ACT['rv-miss'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'missing'); persist(); rerender(); };
ACT['rv-undo'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; setItemStatus(H, it, 'planned'); H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); persist(); rerender(); };
ACT['rv-group-have'] = async d => {
  const H = HH(); const items = H.items.filter(i => !i.archived && i.status !== 'owned' && groupInfo(H, i)[0] === d.group);
  if (!items.length) return;
  const ok = await confirmDlg(`Alle ${items.length} abhaken?`, 'Du hast alles aus dieser Gruppe.', { ok: 'Ja, alle abhaken' });
  if (!ok) return; items.forEach(i => setItemStatus(H, i, 'owned')); persist(); rerender();
};

/* ---------- Inventar ---------- */
const INV = { q: '', cat: '', status: '', loc: '', archived: false };
function inventoryList(H) {
  const q = norm(INV.q);
  return H.items.filter(i => (INV.archived ? i.archived : !i.archived) && (!INV.cat || i.category === INV.cat) && (!INV.status || i.status === INV.status) && (!INV.loc || i.container === INV.loc) && (!q || norm(i.name + ' ' + i.notes + ' ' + i.desc + ' ' + i.place).includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
function invRows(H, list) {
  if (!list.length) return [empty('Keine Gegenstände gefunden.')];
  return list.slice(0, 300).map(it => h`<a class="li" href="#/item/${it.id}">${thumb(it.photos[0])}<span class="grow"><span class="t">${it.name}</span><br><span class="s">${itemQtyLabel(it)} · ${whereOf(H, it)}${it.expiry ? ' · bis ' + fmtDate(it.expiry) : ''}</span></span>${statusBadge(it)}${icon('chev', 'chev')}</a>`).concat(list.length > 300 ? [h`<div class="empty small">Es werden die ersten 300 von ${list.length} angezeigt. Nutze die Suche.</div>`] : []);
}
route('/items', H => {
  const list = inventoryList(H);
  return {
    title: 'Alle Gegenstände', back: '#/more', actions: h`<button class="btn primary sm" data-act="item-new">${icon('plus')}<span>Neu</span></button>`,
    html: h`<div class="row nowrap" style="gap:8px"><input id="invq" class="grow" type="search" value="${INV.q}" data-input="inv-q" placeholder="Suchen: Name, Notiz, Ort …" aria-label="Suchen"><button class="btn icon ${INV.cat || INV.status || INV.loc || INV.archived ? 'primary' : ''}" data-act="inv-filter" aria-label="Filter" aria-expanded="${INV.showF ? 'true' : 'false'}">${icon('sliders')}</button></div>
      ${INV.showF ? h`<div class="card"><div class="stack"><div class="form-grid">${F.select('cat', 'Kategorie', [['', 'Alle Kategorien'], ...CATEGORIES], INV.cat, { attrs: { 'data-change': 'inv-f' } })}
      ${F.select('status', 'Status', [['', 'Alle'], ['owned', 'Vorhanden'], ['planned', 'Zu prüfen'], ['missing', 'Fehlt']], INV.status, { attrs: { 'data-change': 'inv-f' } })}
      ${F.select('loc', 'Ort', [['', 'Überall'], ['bag', 'Im Rucksack'], ['home', 'Zuhause'], ['car', 'Auto']], INV.loc, { attrs: { 'data-change': 'inv-f' } })}</div>
      ${F.check('archived', 'Archivierte anzeigen', INV.archived, { attrs: { 'data-change': 'inv-f' } })}</div></div>` : ''}
    <div class="card flush"><div class="list" id="invlist">${invRows(H, list)}</div></div>`,
  };
});
ACT['inv-filter'] = () => { INV.showF = !INV.showF; rerender(true); };
INPUT['inv-q'] = el => { INV.q = el.value; const H = HH(); $('#invlist').innerHTML = invRows(H, inventoryList(H)).map(x => x.s !== undefined ? x.s : x).join(''); hydratePhotos($('#invlist')); };
INPUT['inv-f'] = el => { if (el.name === 'archived') INV.archived = el.checked; else INV[el.name === 'cat' ? 'cat' : el.name] = el.value; rerender(); };

/* ---------- Neuer Gegenstand: Vorlagenauswahl ---------- */
ACT['item-new'] = (d) => {
  const ctxInfo = d || {};
  const m = openModal({
    title: 'Gegenstand hinzufügen', wide: true,
    body: h`<div class="field"><label for="tq">Vorlage suchen</label><input id="tq" type="search" data-input="tpl-q" placeholder="z. B. Taschenlampe, Schlafsack …" data-nofocus></div><div class="list card flush" id="tpllist" style="max-height:50vh;overflow:auto"></div>`,
    foot: dlgButtons([{ label: 'Leerer Gegenstand', act: 'tpl-blank' }]),
  });
  UI.tplCtx = ctxInfo; UI.tplModal = m; renderTplList('');
  m.el.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'tpl-pick') { closeModal(m); openItemForm(null, { key: a.dataset.key, ...ctxInfo }); } else if (a.dataset.act === 'tpl-blank') { closeModal(m); openItemForm(null, { ...ctxInfo }); } });
};
function renderTplList(q) {
  const s = norm(q); const keys = Object.keys(T).filter(k => !s || norm(T[k].n + ' ' + T[k].c).includes(s)).slice(0, 40);
  const box = $('#tpllist'); if (!box) return;
  box.innerHTML = keys.length ? keys.map(k => `<button class="li" data-act="tpl-pick" data-key="${esc(k)}" type="button"><span class="grow"><span class="t">${esc(T[k].n)}</span><br><span class="s">${esc(T[k].c)}</span></span></button>`).join('') : '<div class="empty small">Keine Vorlage – nutze „Leerer Gegenstand“.</div>';
}
INPUT['tpl-q'] = el => renderTplList(el.value);

/* ---------- Gegenstandsformular (Dialog fuer neu, Seite fuer Details) ---------- */
function itemFields(H, it) {
  const bagOpts = [['', '– keine Tasche –'], ...H.bags.map(b => [b.id, b.name])];
  const bag = byId(H.bags, it.bagId);
  const compOpts = [['', '– automatisch –'], ...((bag && bag.comps) || []).map(c => [c.id, c.name])];
  const people = [['', '– gemeinsam –'], ...H.people.map(p => [p.id, p.name]), ...H.pets.map(p => ['pet:' + p.id, 'Tier: ' + p.species + (p.name ? ' ' + p.name : '')])];
  const unitOpts = UNITS.includes(it.unit) ? UNITS : [...UNITS, it.unit];
  return h`<div class="stack">
    ${F.text('name', 'Name', it.name, { req: true, max: 120 })}
    <div class="form-grid">${F.num('qty', 'Menge', it.qty, { req: true })}${F.select('unit', 'Einheit', unitOpts, it.unit)}${F.select('status', 'Status', [['owned', 'Vorhanden'], ['planned', 'Offen'], ['missing', 'Fehlt']], it.status)}</div>
    <div class="form-grid">${F.select('bagId', 'Tasche', bagOpts, it.bagId || '')}${F.select('compId', 'Fach', compOpts, it.compId || '')}</div>
    ${F.check('lastMinute', 'Erst bei Abreise einpacken', it.lastMinute, { desc: 'Für Dinge im täglichen Gebrauch, z. B. Medikamente' })}
    <div class="form-grid">${F.num('weightG', 'Gewicht je Stück (g)', it.weightG || '')}${F.date('expiry', 'Datum', it.expiry)}${F.select('expiryType', 'Art des Datums', EXP_TYPES, it.expiryType || '')}</div>
    ${F.area('notes', 'Notiz', it.notes, { rows: 3 })}
    <details><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer">Weitere Angaben</summary><div class="stack" style="margin-top:8px">
      ${F.area('desc', 'Beschreibung', it.desc, { rows: 2 })}
      <div class="form-grid">${F.select('category', 'Kategorie', CATEGORIES, it.category)}${F.select('who', 'Für', people, it.petId ? 'pet:' + it.petId : it.personId || '')}${F.select('prio', 'Wichtigkeit', [['must', 'Notwendig'], ['rec', 'Empfohlen'], ['opt', 'Optional']], it.prio)}${F.select('container', 'Ort', [['bag', 'In einer Tasche'], ['home', 'Zuhause / Kiste'], ['car', 'Auto']], it.container)}${F.text('place', 'Lagerort', it.place, { max: 80 })}</div>
      <div class="form-grid">${F.num('volL', 'Packvolumen je Stück (Liter)', it.volL || '')}${F.num('liters', 'Wasser je Stück (Liter)', it.liters || '')}${F.num('kcal', 'Energie je Stück (kcal)', it.kcal || '')}${F.num('remindDays', 'Kontrolle alle … Tage', it.remindDays || '')}${F.num('minQty', 'Mindestmenge', it.minQty || '')}</div>
      <div class="form-grid">${F.date('purchaseDate', 'Kaufdatum', it.purchaseDate)}${F.select('condition', 'Zustand', [['', '–'], ...CONDITIONS], it.condition)}${F.num('price', 'Preis (€)', it.price ?? '')}${F.text('barcode', 'Barcode', it.barcode, { mode: 'numeric', max: 20 })}</div>
      ${F.text('manualUrl', 'Anleitung (Link/Hinweis)', it.manualUrl || '')}</div></details>
    ${it.why ? h`<details class="small muted"><summary style="min-height:36px;display:flex;align-items:center;cursor:pointer">Warum vorgeschlagen?</summary><p>${it.why}</p></details>` : ''}
  </div>`;
}
function applyItemForm(H, it, fd) {
  const name = (fd.get('name') || '').trim(); if (!name) throw new Error('Bitte einen Namen eintragen.');
  const qty = num(fd.get('qty'), 1); if (qty < 0) throw new Error('Die Anzahl darf nicht negativ sein.');
  const oldStatus = it.status;
  Object.assign(it, { name, desc: fd.get('desc') || '', category: fd.get('category'), qty, unit: fd.get('unit'), weightG: num(fd.get('weightG')), volL: num(fd.get('volL')), liters: num(fd.get('liters')), kcal: num(fd.get('kcal')), container: fd.get('container'), place: (fd.get('place') || '').trim(), purchaseDate: fd.get('purchaseDate') || '', expiry: fd.get('expiry') || '', condition: fd.get('condition') || '', price: fd.get('price') === '' || fd.get('price') === null ? null : num(fd.get('price')), minQty: num(fd.get('minQty')), remindDays: num(fd.get('remindDays')), barcode: (fd.get('barcode') || '').trim(), prio: fd.get('prio'), manualUrl: (fd.get('manualUrl') || '').trim(), notes: fd.get('notes') || '' });
  const who = fd.get('who') || ''; it.personId = who && !who.startsWith('pet:') ? who : null; it.petId = who.startsWith('pet:') ? who.slice(4) : null;
  it.lastMinute = fdBool(fd, 'lastMinute'); it.expiryType = fd.get('expiryType') || '';
  if (fd.get('bagId')) { it.container = 'bag'; it.bagId = fd.get('bagId'); it.compId = fd.get('compId') || null; }
  else { if (it.container === 'bag') it.container = 'home'; it.bagId = null; it.compId = null; }
  if (it.expiry) it.tags = Array.from(new Set([...(it.tags || []), 'expiring']));
  if (it.category === 'Wasser' && it.liters > 0) it.tags = Array.from(new Set([...(it.tags || []), 'water_supply']));
  if (it.category === 'Lebensmittel' && it.kcal > 0) it.tags = Array.from(new Set([...(it.tags || []), 'food']));
  if (!it.tags || !it.tags.length || it.source === 'manual') it.tags = Array.from(new Set([...(it.tags || []), ...inferTags(name)]));
  if (fd.get('status') !== oldStatus) setItemStatus(H, it, fd.get('status')); else if (it.status === 'missing') { const s = H.shop.find(x => x.itemId === it.id && !x.bought); if (s) { s.name = it.name; s.qty = it.qty; s.unit = it.unit; } }
  it.edited = true;
  if (it.container === 'bag' && it.bagId && !it.compId) { const b = byId(H.bags, it.bagId); if (b) autoPack(H, b, { onlyUnassigned: true }); }
}
function openItemForm(id, preset) {
  const H = HH(); const isNew = !id;
  let it;
  if (isNew) {
    const t = preset && preset.key ? T[preset.key] : null;
    it = newItemDefaults(t ? makeItem({ key: preset.key, qty: preset.qty || 1, container: preset.container || (t.z === 'home' ? 'home' : 'home') }, { status: 'owned', source: 'manual' }) : { source: 'manual' });
    if (preset && !preset.bagId && HH().bags.length === 1 && preset.container !== 'home') { it.container = 'bag'; it.bagId = HH().bags[0].id; }
    if (preset) { if (preset.container) it.container = preset.container; if (preset.bagId) { it.container = 'bag'; it.bagId = preset.bagId; } if (preset.compId) it.compId = preset.compId; if (preset.barcode) it.barcode = preset.barcode; if (preset.name) it.name = preset.name; if (preset.personId) it.personId = preset.personId; if (preset.petId) it.petId = preset.petId; if (preset.status) it.status = preset.status; }
    if (!it.id) it.id = uid(); it.why = ''; it.prio = it.prio || 'rec';
  } else it = byId(H.items, id);
  formDlg({ title: isNew ? 'Neuer Gegenstand' : 'Gegenstand bearbeiten', wide: true, body: itemFields(H, it), ok: 'Speichern',
    onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { applyItemForm(H, it, fd); if (isNew) { if (it.status === 'owned' && it.key) { /* ok */ } H.items.push(it); if (it.status === 'missing') ensureShopEntry(H, it); if (it.container === 'bag' && it.bagId && !it.compId) { const b = byId(H.bags, it.bagId); if (b) autoPack(H, b, { onlyUnassigned: true }); } } persist(); rerender(true); } });
}
function bindItemBag(root) {
  const H = HH(); const bagSel = $('[name=bagId]', root), compSel = $('[name=compId]', root);
  if (!bagSel || !compSel) return;
  bagSel.addEventListener('change', () => { const b = byId(H.bags, bagSel.value); compSel.innerHTML = '<option value="">– kein Fach –</option>' + ((b && b.comps) || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''); if (bagSel.value) { const cont = $('[name=container]', root); if (cont) cont.value = 'bag'; } });
}

/* ---------- Detailseite ---------- */
route('/item/:id', (id, H) => {
  const it = byId(H.items, id);
  if (!it) return { title: 'Gegenstand', back: '#/items', html: empty('Gegenstand nicht gefunden.') };
  const dl = it.expiry ? daysUntil(it.expiry) : null;
  return {
    title: it.name, back: it.container === 'bag' && it.bagId ? '#/bags/' + it.bagId : '#/items',
    html: h`<div class="card"><div class="row spread">${statusBadge(it)}${levelBadge(it.prio)}${it.archived ? h`<span class="badge">Archiviert</span>` : ''}${dl !== null && dl <= (DB.settings.notif.leadDays || 30) ? h`<span class="badge ${dl < 0 ? 'must' : 'rec'}">${dl < 0 ? 'Abgelaufen' : 'Läuft ' + relDays(it.expiry) + ' ab'}</span>` : ''}</div>
      <p class="muted" style="margin-top:8px">${itemQtyLabel(it)}${it.weightG ? ' · ' + fmtKg(it.weightG * it.qty) + ' gesamt' : ''} · ${whereOf(H, it)}</p>
      <div class="btns" style="margin-top:8px">${it.status === 'owned' && it.container === 'bag' ? h`<button class="btn ${it.packed ? 'ok' : ''}" data-act="item-pack" data-id="${it.id}">${icon('check')} ${it.packed ? 'Gepackt' : 'Als gepackt markieren'}</button>` : ''}
        ${it.status !== 'owned' ? h`<button class="btn ok" data-act="rv-have" data-id="${it.id}">${icon('check')} Habe ich</button>` : ''}${it.status !== 'missing' ? h`<button class="btn danger" data-act="rv-miss" data-id="${it.id}">${icon('cart')} Fehlt</button>` : ''}${it.remindDays > 0 && it.status === 'owned' ? h`<button class="btn" data-act="item-checked" data-id="${it.id}">${icon('clock')} Kontrolle erledigt (nächste ${fmtDate(itemRemindNext(it))})</button>` : ''}</div></div>
    <div class="card"><h3>Fotos</h3>${photoStrip(it.photos, 'item-ph-del', { id: it.id })}<div class="btns" style="margin-top:8px"><button class="btn" data-act="item-ph-add" data-id="${it.id}" data-kind="photos">${icon('camera')} Foto hinzufügen</button></div></div>
    <form class="card" id="itemform" data-form="item-save" data-id="${it.id}">${itemFields(H, it)}
      <div class="btns" style="margin-top:16px"><button class="btn primary" type="submit">${icon('check')} Speichern</button></div></form>
    ${(it.receipts || []).length || (it.manuals || []).length ? h`    <div class="card"><h3>Kaufbeleg und Anleitung</h3><div class="stack-s"><div class="label">Kaufbelege</div>${photoStrip(it.receipts, 'item-ph-del', { id: it.id, kind: 'receipts' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="receipts">${icon('camera')} Beleg fotografieren</button>
      <div class="label" style="margin-top:8px">Anleitung (Fotos/Scans)</div>${photoStrip(it.manuals, 'item-ph-del', { id: it.id, kind: 'manuals' })}<button class="btn sm" data-act="item-ph-add" data-id="${it.id}" data-kind="manuals">${icon('camera')} Seite fotografieren</button></div></div>` : ''}
    <div class="btns"><button class="btn" data-act="item-dup" data-id="${it.id}">${icon('copy')} Duplizieren</button><button class="btn" data-act="item-move" data-id="${it.id}">${icon('move')} Verschieben</button><button class="btn" data-act="item-arch" data-id="${it.id}">${icon('archive')} ${it.archived ? 'Wiederherstellen' : 'Archivieren'}</button><button class="btn danger" data-act="item-del" data-id="${it.id}">${icon('trash')} Löschen</button></div>`,
    after: () => bindItemBag($('#itemform')),
  };
});
FORM['item-save'] = (fd, f) => { const H = HH(); const it = byId(H.items, f.dataset.id); applyItemForm(H, it, fd); persist(); rerender(); toast('Gespeichert'); };
function saveFormSilently() { const f = $('#itemform'); if (!f) return; const H = HH(); const it = byId(H.items, f.dataset.id); try { applyItemForm(H, it, new FormData(f)); persist(); } catch (e) { /* unvollstaendig: ignorieren */ } }
ACT['item-pack'] = d => { const H = HH(); const it = byId(H.items, d.id); if (!it) return; it.packed = !it.packed; persist(); rerender(); };
ACT['item-ph-add'] = async d => { saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const pid = await addPhotoTo(null); if (!pid) return; const k = d.kind || 'photos'; it[k] = it[k] || []; it[k].push(pid); persist(); rerender(true); };
ACT['item-ph-del'] = async d => { const ok = await confirmDlg('Foto entfernen?', 'Das Foto wird gelöscht.', { ok: 'Entfernen', danger: true }); if (!ok) return; saveFormSilently(); const H = HH(); const it = byId(H.items, d.id); const k = d.kind || 'photos'; it[k] = (it[k] || []).filter(x => x !== d.pid); persist(); setTimeout(sweepPhotos, 300); rerender(true); };
ACT['item-dup'] = d => { const H = HH(); const it = byId(H.items, d.id); const c = clone(it); c.id = uid(); c.name = it.name + ' (Kopie)'; c.packed = false; c.source = 'manual'; H.items.push(c); if (c.status === 'missing') ensureShopEntry(H, c); persist(); go('#/item/' + c.id); };
ACT['item-arch'] = d => { const H = HH(); const it = byId(H.items, d.id); it.archived = !it.archived; if (it.archived) H.shop = H.shop.filter(s => s.itemId !== it.id || s.bought); persist(); rerender(); };
ACT['item-del'] = async d => { const ok = await confirmDlg('Gegenstand löschen?', 'Fotos werden mit gelöscht.', { ok: 'Löschen', danger: true }); if (!ok) return; removeItem(HH(), d.id); persist(); history.length > 1 ? history.back() : go('#/home'); };
ACT['item-move'] = d => {
  const H = HH(); const it = byId(H.items, d.id);
  formDlg({ title: 'Verschieben', body: h`${F.select('container', 'Ziel', [['home', 'Zuhause'], ['bag', 'In einen Rucksack'], ['car', 'Auto']], it.container)}${F.select('bagId', 'Rucksack', [['', '–'], ...H.bags.map(b => [b.id, b.name])], it.bagId || '')}${F.select('compId', 'Fach', [['', '– automatisch –'], ...(((byId(H.bags, it.bagId) || {}).comps) || []).map(c => [c.id, c.name])], it.compId || '')}${F.text('place', 'Lagerort (Zuhause)', it.place)}`, ok: 'Verschieben', onOpen: (m, f) => bindItemBag(f),
    onSubmit: fd => { it.container = fd.get('container'); if (it.container === 'bag') { it.bagId = fd.get('bagId') || null; if (!it.bagId) throw new Error('Bitte einen Rucksack wählen.'); it.compId = fd.get('compId') || null; if (!it.compId) autoPack(H, byId(H.bags, it.bagId), { onlyUnassigned: true }); } else { it.bagId = null; it.compId = null; it.place = fd.get('place') || it.place; } it.packed = false; persist(); rerender(); } });
};

/* ---------- Optionale Notfallkiste zu Hause ---------- */
route('/stock', H => {
  const S = DB.settings;
  if (!H.box.enabled) return { title: 'Notfallkiste zu Hause', back: '#/more', html: h`${empty('Optional: eine Kiste mit Wasser, Essen, Batterien und Hygiene für zu Hause.')}<div class="actionbar"><button class="btn primary lg" data-act="box-on">${icon('plus')} Kiste anlegen</button></div>` };
  const sup = calcSupplies(H, S);
  const home = H.items.filter(i => !i.archived && i.container === 'home');
  const owned = home.filter(i => i.status === 'owned').sort((a, b) => norm(a.name).localeCompare(norm(b.name)) || (a.expiry || '9').localeCompare(b.expiry || '9'));
  const firsts = fifoFirsts(owned); const todo = home.filter(i => i.status !== 'owned').sort((a, b) => ({ must: 0, rec: 1, opt: 2 }[a.prio] - { must: 0, rec: 1, opt: 2 }[b.prio]));
  return {
    title: 'Notfallkiste zu Hause', back: '#/more',
    html: h`<div class="card"><div class="row spread"><span class="bold">${icon('drop')} ${fmt(sup.waterL)} l Wasser</span><span class="muted">ca. ${fmt(sup.waterDays)} Tage</span></div><div class="row spread" style="margin-top:6px"><span class="bold">${icon('food')} Essen</span><span class="muted">ca. ${fmt(sup.foodDays)} Tage</span></div><p class="muted small" style="margin-top:6px">Schätzung für ${sup.calc.n} ${plural(sup.calc.n, 'Person', 'Personen')}, Ziel ${H.box.days} Tage.</p></div>
    ${owned.length ? h`<div class="card flush"><div class="list">${owned.map(i => stockRow(i, firsts.has(i.id)))}</div></div>` : ''}
    ${todo.length ? h`<h2>Offen</h2><div class="card flush"><div class="list">${todo.map(i => reviewRow(H, i))}</div></div>` : ''}
    <div class="btns"><button class="btn" data-act="box-days">${icon('edit')} Ziel: ${H.box.days} Tage</button><button class="btn danger" data-act="box-off">Kiste auflösen</button></div>
    <div class="actionbar"><button class="btn primary lg" data-act="stock-new">${icon('plus')} Gegenstand</button></div>`,
  };
});
const EXP_TYPES = [['', 'Haltbar bis'], ['mhd', 'Mindesthaltbarkeit (MHD)'], ['use', 'Verbrauchsdatum']];
/* Ablaufstatus: MHD ist kein Verfallsdatum – abgelaufene Ware nicht pauschal als verdorben werten */
function expiryState(i) {
  const dl = i.expiry ? daysUntil(i.expiry) : null; if (dl === null) return null;
  if (dl < 0) return i.expiryType === 'mhd' ? { cls: 'rec', label: 'MHD überschritten – prüfen' } : i.expiryType === 'use' ? { cls: 'must', label: 'Verbrauchsdatum überschritten' } : { cls: 'must', label: 'Abgelaufen' };
  if (dl <= 30) return { cls: 'rec', label: relDays(i.expiry) };
  return null;
}
/* Pro gleichem Namen: aelteste Charge zuerst verbrauchen */
function fifoFirsts(list) { const seen = new Map(); for (const i of list) { const k = norm(i.name); if (!seen.has(k)) seen.set(k, []); seen.get(k).push(i); } const out = new Set(); for (const g of seen.values()) if (g.length > 1) { const s = g.filter(i => i.expiry).sort((a, b) => a.expiry.localeCompare(b.expiry)); if (s[0]) out.add(s[0].id); } return out; }
function stockRow(i, first) {
  const ex = expiryState(i);
  return h`<div class="li ${ex ? ex.cls : ''}"><a class="grow" href="#/item/${i.id}" style="color:inherit;text-decoration:none"><span class="t">${i.name}</span><br><span class="s">${[i.unit, i.expiry ? (i.expiryType === 'mhd' ? 'MHD ' : i.expiryType === 'use' ? 'verbrauchen bis ' : 'bis ') + fmtDate(i.expiry) : ''].filter(Boolean).join(' · ')}</span>
    ${ex || first ? h`<span class="row" style="margin-top:4px">${first ? h`<span class="badge info">Zuerst verbrauchen</span>` : ''}${ex ? h`<span class="badge ${ex.cls}">${ex.label}</span>` : ''}</span>` : ''}</a>
    <div class="stepper"><button type="button" data-act="st-adj" data-id="${i.id}" data-d="-1" aria-label="weniger">−</button><span>${fmt(i.qty)}</span><button type="button" data-act="st-adj" data-id="${i.id}" data-d="1" aria-label="mehr">+</button></div></div>`;
}
ACT['stock-new'] = () => ACT['item-new']({ container: 'home' });
ACT['st-adj'] = d => { const it = byId(HH().items, d.id); if (!it) return; it.qty = Math.max(0, +(it.qty + (+d.d)).toFixed(2)); persist(); rerender(true); };
ACT['box-on'] = async () => {
  const H = HH(); const v = await promptDlg('Kiste anlegen', 'Für wie viele Tage?', '3', { type: 'number', ok: 'Anlegen' }); if (v === null) return;
  H.box = { enabled: true, days: clamp(Math.round(num(v, 3)), 1, 30) }; if (!H.cfg) H.cfg = { goals: [], strategies: ['shelter'], boxOnly: true, country: 'DE', housing: {}, durationHours: 72 };
  if (H.people.length) applyPlan(H, DB.settings); persist(); rerender();
};
ACT['box-days'] = async () => { const H = HH(); const v = await promptDlg('Ziel ändern', 'Tage', String(H.box.days), { type: 'number' }); if (v === null) return; H.box.days = clamp(Math.round(num(v, 3)), 1, 30); if (H.people.length) applyPlan(H, DB.settings); persist(); rerender(true); };
ACT['box-off'] = async () => { const ok = await confirmDlg('Kiste auflösen?', 'Die Gegenstände bleiben unter „Alle Gegenstände“ erhalten.', { ok: 'Auflösen' }); if (!ok) return; HH().box.enabled = false; persist(); rerender(); };
