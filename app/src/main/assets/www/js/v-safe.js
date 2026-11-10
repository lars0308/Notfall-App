'use strict';
/* ===== Notfall! – Dokumenten-Safe (UI) ===== */
const SAFE = { q: '', folder: '', sel: new Set(), busy: false };
route('/safe', H => {
  if (!can('vault')) return { title: 'Safe', back: '#/more', html: noticeBox('info', 'Kein Zugriff', 'Für dein Benutzerprofil ist der Dokumenten-Safe nicht freigegeben.') };
  const head = '';
  const noticeAll = noticeBox('rec', 'Wichtig', 'Dateien werden mit deinem Safe-Passwort verschlüsselt (AES-256, PBKDF2) auf diesem Gerät gespeichert. Das Passwort lässt sich nicht zurücksetzen. Originale nie ausschließlich in der App aufbewahren.');
  if (!Vault.unlocked) return { title: 'Safe & Dokumente', back: '#/more', html: h`${head}<div id="safebox">${h`<div class="card"><p class="muted">Safe wird geprüft …</p></div>`}</div>`, after: async () => { const ex = await Vault.exists(); const box = $('#safebox'); if (!box) return; box.innerHTML = (ex ? safeUnlockHtml() : safeCreateHtml(noticeAll)).s; } };
  const docs = Vault.search(SAFE.q, SAFE.folder);
  return {
    title: 'Safe & Dokumente', back: '#/more', actions: h`<button class="btn sm" data-act="safe-lock">${icon('lock')}<span>Sperren</span></button>`,
    html: h`${head}
    <div class="card"><div class="btns"><button class="btn primary" data-act="safe-import">${icon('upload')} PDF / Foto importieren</button><button class="btn" data-act="safe-scan">${icon('scan')} Dokument scannen</button><button class="btn" data-act="safe-folder">${icon('plus')} Ordner</button></div>
      <div class="field" style="margin-top:12px"><label for="sq">Suchen</label><input id="sq" type="search" value="${SAFE.q}" data-input="safe-q" placeholder="Name, Notiz, Kategorie …"></div>
      <div class="chips" style="margin-top:12px"><button class="chip" aria-pressed="${!SAFE.folder}" data-act="safe-fol" data-id="">Alle</button>${Vault.index.folders.map(f => h`<button class="chip" aria-pressed="${SAFE.folder === f.id}" data-act="safe-fol" data-id="${f.id}">${f.name}</button>`)}</div>
      ${SAFE.folder ? h`<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="safe-fol-rename">Ordner umbenennen</button><button class="btn sm danger" data-act="safe-fol-del">Ordner löschen</button></div>` : ''}</div>
    <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Dokumente</h2><button class="btn sm" data-act="safe-export-sel" ${SAFE.sel.size ? '' : raw('disabled')}>${icon('download')} Auswahl exportieren (${SAFE.sel.size})</button></div>
      <div class="list" id="safelist">${safeRows(docs)}</div></div>
    <div class="card"><h3>Sicherheit</h3><div class="btns"><button class="btn" data-act="safe-pass">${icon('lock')} Passwort ändern</button>${NATIVE && NATIVE.bioAvailable && NATIVE.bioAvailable() ? (NATIVE.bioHas('vault') ? h`<button class="btn" data-act="safe-bio-off">Biometrie ausschalten</button>` : h`<button class="btn" data-act="safe-bio-on">${icon('eye')} Biometrisch entsperren aktivieren</button>`) : ''}<button class="btn danger" data-act="safe-reset">${icon('trash')} Safe löschen</button></div>
      <p class="small muted" style="margin-top:8px">Der Safe sperrt sich automatisch, sobald du die App verlässt. Exportierte Dateien sind nicht mehr verschlüsselt.</p></div>`,
  };
});
function safeCreateHtml(notice) {
  return h`${notice}<form class="card" data-form="safe-create"><h2>Safe einrichten</h2><div class="stack">${F.text('p1', 'Safe-Passwort (mindestens 10 Zeichen)', '', { type: 'password', req: true, max: 100 })}${F.text('p2', 'Passwort wiederholen', '', { type: 'password', req: true, max: 100 })}<p class="small muted">Es gibt keine Passwort-Wiederherstellung. Notiere dir das Passwort an einem sicheren Ort.</p><div class="btns"><button class="btn primary" type="submit">${icon('lock')} Safe anlegen</button></div></div></form>`;
}
function safeUnlockHtml() {
  const bio = NATIVE && NATIVE.bioHas && NATIVE.bioHas('vault') && NATIVE.bioAvailable();
  return h`<form class="card" data-form="safe-unlock"><h2>Safe entsperren</h2><div class="stack">${F.text('p1', 'Safe-Passwort', '', { type: 'password', req: true })}<div class="btns"><button class="btn primary" type="submit">${icon('unlock')} Entsperren</button>${bio ? h`<button type="button" class="btn" data-act="safe-bio">${icon('eye')} Mit Biometrie</button>` : ''}</div></div></form>`;
}
function safeRows(docs) {
  if (!docs.length) return empty('Keine Dokumente. Importiere ein PDF oder Foto, oder scanne ein Dokument.');
  return raw(docs.sort((a, b) => b.added.localeCompare(a.added)).map(d => h`<div class="li" style="flex-wrap:wrap"><input type="checkbox" style="width:1.5rem;height:1.5rem;accent-color:var(--primary)" data-change="safe-sel" data-id="${d.id}" ${SAFE.sel.has(d.id) ? raw('checked') : ''} aria-label="${d.name} auswählen"><button class="grow" style="background:none;border:0;text-align:left;cursor:pointer;color:inherit;padding:0;min-width:10rem" data-act="safe-open" data-id="${d.id}"><span class="t">${d.name}</span><br><span class="s">${d.category} · ${(Vault.index.folders.find(f => f.id === d.folderId) || {}).name || ''} · ${fmtKb(d.size)}${d.person ? ' · ' + d.person : ''}</span></button><button class="btn sm" data-act="safe-edit" data-id="${d.id}" aria-label="Eigenschaften">${icon('edit')}</button></div>`).map(x => x.s).join(''));
}
const fmtKb = b => b > 1048576 ? fmt(b / 1048576) + ' MB' : fmt0(b / 1024) + ' KB';
INPUT['safe-q'] = el => { SAFE.q = el.value; $('#safelist').innerHTML = safeRows(Vault.search(SAFE.q, SAFE.folder)).s; };
INPUT['safe-sel'] = el => { if (el.checked) SAFE.sel.add(el.dataset.id); else SAFE.sel.delete(el.dataset.id); rerender(true); };
ACT['safe-fol'] = d => { SAFE.folder = d.id; rerender(true); };
FORM['safe-create'] = async fd => {
  const a = fd.get('p1'), b = fd.get('p2'); if (a.length < 10) throw new Error('Das Passwort braucht mindestens 10 Zeichen.'); if (a !== b) throw new Error('Die Passwörter stimmen nicht überein.');
  toast('Safe wird eingerichtet …'); await Vault.create(a); DB.vaultHint = true; persist(); rerender(); toast('Safe angelegt');
};
FORM['safe-unlock'] = async fd => { try { await Vault.unlock(fd.get('p1')); rerender(); } catch (e) { toast(e.message || 'Entsperren fehlgeschlagen'); } };
ACT['safe-bio'] = async () => { const r = await nativeAsync('bioUnlock', 'vault', 'Safe entsperren'); if (!r.ok) { if (r.error && r.error !== 'abgebrochen') toast(r.error); return; } try { await Vault.unlock(r.data); rerender(); } catch { toast('Gespeichertes Passwort passt nicht mehr – bitte manuell eingeben.'); NATIVE.bioClear('vault'); rerender(); } };
ACT['safe-bio-on'] = async () => { const r = await nativeAsync('bioEnroll', 'vault', Vault.pass, 'Safe-Biometrie aktivieren'); if (r.ok) { toast('Biometrische Entsperrung aktiv'); rerender(true); } else if (r.error && r.error !== 'abgebrochen') toast(r.error); };
ACT['safe-bio-off'] = () => { NATIVE.bioClear('vault'); rerender(true); toast('Biometrie ausgeschaltet'); };
ACT['safe-lock'] = () => { Vault.lock(); SAFE.sel.clear(); rerender(); };
function docMetaFields(d) {
  const H = HH();
  return h`${F.text('name', 'Name', d.name || '', { req: true, max: 120 })}<div class="form-grid">${F.select('category', 'Kategorie', VAULT_CATS, d.category || 'Sonstiges')}${F.select('folderId', 'Ordner', Vault.index.folders.map(f => [f.id, f.name]), d.folderId || SAFE.folder || Vault.index.folders[0].id)}${F.select('person', 'Person', [['', '–'], ...H.people.map(p => [p.name, p.name])], d.person || '')}</div>${F.area('notes', 'Notizen', d.notes || '', { rows: 3 })}`;
}
ACT['safe-import'] = async () => {
  const files = await pickFiles({ accept: 'application/pdf,image/*', multiple: true }); if (!files.length) return;
  const f0 = files[0];
  formDlg({ title: files.length > 1 ? files.length + ' Dateien importieren' : 'Datei importieren', body: docMetaFields({ name: files.length > 1 ? '' : f0.name, category: /ausweis|personal/i.test(f0.name) ? 'Personalausweis' : 'Sonstiges' }), ok: 'Verschlüsselt speichern',
    onSubmit: async fd => {
      for (const f of files) {
        if (f.size > 15 * 1024 * 1024) { toast(f.name + ' ist größer als 15 MB und wurde übersprungen.'); continue; }
        let bytes = await readBuf(f); let mime = f.type || 'application/octet-stream'; let name = files.length > 1 ? f.name : (fd.get('name').trim() || f.name);
        await Vault.addFile({ name, mime, bytes, folderId: fd.get('folderId'), category: fd.get('category'), notes: fd.get('notes'), person: fd.get('person') });
      }
      rerender(true); toast('Verschlüsselt gespeichert');
    } });
};
ACT['safe-scan'] = async () => {
  let url = null;
  if (IS_NATIVE) { const r = await nativeAsync('takePhoto'); if (!r.ok) { if (r.error !== 'abgebrochen') toast(r.error); return; } url = r.dataUrl; }
  else { const f = (await pickFiles({ accept: 'image/*' }))[0]; if (!f) return; url = await imageToDataUrl(f, 2200, 0.88); }
  formDlg({ title: 'Gescanntes Dokument speichern', body: h`<img src="${url}" alt="Vorschau" style="width:100%;max-height:40vh;object-fit:contain;border-radius:8px">${F.check('enh', 'Kontrast verbessern (Dokumentenmodus)', true)}${docMetaFields({ name: 'Scan ' + fmtDate(todayISO()) })}`, ok: 'Verschlüsselt speichern',
    onSubmit: async fd => {
      let out = url; if (fdBool(fd, 'enh')) out = await enhanceScan(url);
      const bytes = unb64(out.split(',')[1]);
      await Vault.addFile({ name: (fd.get('name').trim() || 'Scan') + '.jpg', mime: 'image/jpeg', bytes, folderId: fd.get('folderId'), category: fd.get('category'), notes: fd.get('notes'), person: fd.get('person') });
      rerender(true); toast('Verschlüsselt gespeichert');
    } });
};
function enhanceScan(url) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const id = g.getImageData(0, 0, c.width, c.height); const d = id.data; let lo = 255, hi = 0; for (let i = 0; i < d.length; i += 4) { const y = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = y; if (y < lo) lo = y; if (y > hi) hi = y; } const sc = 255 / Math.max(40, hi - lo); for (let i = 0; i < d.length; i += 4) { const v = clamp((d[i] - lo) * sc * 1.1, 0, 255); d[i] = d[i + 1] = d[i + 2] = v; } g.putImageData(id, 0, 0); res(c.toDataURL('image/jpeg', 0.85)); }; img.onerror = () => rej(new Error('Bild defekt')); img.src = url; });
}
ACT['safe-open'] = async d => {
  const doc = Vault.index.docs.find(x => x.id === d.id); if (!doc) return;
  const isImg = /^image\//.test(doc.mime);
  let body;
  if (isImg) { const bytes = await Vault.getFile(doc.id); const url = URL.createObjectURL(new Blob([bytes], { type: doc.mime })); body = h`<img src="${url}" alt="${doc.name}" style="width:100%;border-radius:8px">`; setTimeout(() => URL.revokeObjectURL(url), 600000); }
  else body = noticeBox('info', 'Keine Vorschau', 'PDF-Dateien werden hier nicht angezeigt. Exportiere die Datei, um sie mit einer PDF-App zu öffnen.');
  openModal({ title: doc.name, wide: true, body: h`${body}<p class="muted small">${doc.category} · ${fmtKb(doc.size)} · hinzugefügt ${fmtDate(doc.added)}</p>${doc.notes ? h`<p>${doc.notes}</p>` : ''}`, foot: dlgButtons([{ label: 'Eigenschaften', act: 'safe-edit', data: { id: doc.id } }, { label: 'Exportieren', cls: 'primary', act: 'safe-export', data: { id: doc.id } }]) });
};
ACT['safe-edit'] = d => {
  const doc = Vault.index.docs.find(x => x.id === d.id);
  closeAllModals();
  formDlg({ title: 'Dokument-Eigenschaften', body: docMetaFields(doc), extraFoot: [{ label: 'Löschen', cls: 'danger', act: 'safe-del', data: { id: doc.id } }], onSubmit: async fd => { await Vault.updateDoc(doc.id, { name: fd.get('name').trim() || doc.name, category: fd.get('category'), folderId: fd.get('folderId'), person: fd.get('person'), notes: fd.get('notes') }); rerender(true); } });
};
ACT['safe-del'] = async d => { const ok = await confirmDlg('Dokument löschen?', 'Das verschlüsselte Dokument wird endgültig gelöscht.', { ok: 'Löschen', danger: true }); if (!ok) return; await Vault.deleteFile(d.id); SAFE.sel.delete(d.id); closeAllModals(); rerender(true); };
async function exportDocs(ids) {
  const ok = await confirmDlg('Entschlüsselt exportieren?', 'Die Datei(en) werden unverschlüsselt in „Downloads/Notfall“ gespeichert. Lösche sie nach der Nutzung und teile sie nur bewusst.', { ok: 'Exportieren' }); if (!ok) return;
  for (const id of ids) { const doc = Vault.index.docs.find(x => x.id === id); if (!doc) continue; const bytes = await Vault.getFile(id); await saveFile(doc.name, doc.mime, bytes); }
}
ACT['safe-export'] = async d => { await exportDocs([d.id]); };
ACT['safe-export-sel'] = async () => { await exportDocs([...SAFE.sel]); SAFE.sel.clear(); rerender(true); };
ACT['safe-folder'] = async () => { const n = await promptDlg('Neuer Ordner', 'Name', ''); if (!n || !n.trim()) return; await Vault.addFolder(n.trim()); rerender(true); };
ACT['safe-fol-rename'] = async () => { const f = Vault.index.folders.find(x => x.id === SAFE.folder); const n = await promptDlg('Ordner umbenennen', 'Name', f.name); if (!n || !n.trim()) return; await Vault.renameFolder(f.id, n.trim()); rerender(true); };
ACT['safe-fol-del'] = async () => { try { await Vault.deleteFolder(SAFE.folder); SAFE.folder = ''; rerender(true); } catch (e) { toast(e.message); } };
ACT['safe-pass'] = () => {
  formDlg({ title: 'Safe-Passwort ändern', body: h`${F.text('old', 'Aktuelles Passwort', '', { type: 'password', req: true })}${F.text('p1', 'Neues Passwort (mind. 10 Zeichen)', '', { type: 'password', req: true })}${F.text('p2', 'Neues Passwort wiederholen', '', { type: 'password', req: true })}`, ok: 'Ändern',
    onSubmit: async fd => { if (fd.get('old') !== Vault.pass) throw new Error('Das aktuelle Passwort ist falsch.'); const a = fd.get('p1'); if (a.length < 10) throw new Error('Das neue Passwort braucht mindestens 10 Zeichen.'); if (a !== fd.get('p2')) throw new Error('Die neuen Passwörter stimmen nicht überein.'); toast('Dokumente werden neu verschlüsselt …'); await Vault.changePassword(a); if (NATIVE && NATIVE.bioHas && NATIVE.bioHas('vault')) { NATIVE.bioClear('vault'); toast('Passwort geändert. Biometrie bitte neu aktivieren.'); } else toast('Passwort geändert'); rerender(true); } });
};
ACT['safe-reset'] = async () => { const t = await promptDlg('Safe löschen', 'Alle verschlüsselten Dokumente werden unwiderruflich gelöscht. Zum Bestätigen LÖSCHEN eintippen.', ''); if (t === null) return; if (t.trim() !== 'LÖSCHEN') { toast('Nichts gelöscht.'); return; } await Vault.wipe(); if (NATIVE && NATIVE.bioClear) NATIVE.bioClear('vault'); DB.vaultHint = null; persist(); rerender(); };
