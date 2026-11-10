'use strict';
/* ===== Notfall! – verschluesselter Dokumenten-Safe (eigenes Passwort, AES-256-GCM, PBKDF2) =====
   Dateien UND Metadaten (Namen, Ordner, Notizen) liegen nur verschluesselt im Speicher. */
const VAULT_ITER = 310000;
const VAULT_CATS = ['Personalausweis', 'Reisepass', 'Geburtsurkunde', 'Versicherung', 'Medizinische Unterlagen', 'Vertrag', 'Notfallinformation', 'Sonstiges'];
const Vault = {
  key: null, index: null, pass: null,
  get unlocked() { return !!(this.key && this.index); },
  async exists() { return !!(await KV.get('vault_meta')); },
  async create(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt, VAULT_ITER);
    const verifier = await aesEnc(key, enc('notfall-vault-ok'), 'verifier');
    await KV.put('vault_meta', JSON.stringify({ v: 1, salt: b64(salt), iter: VAULT_ITER, verifier }));
    this.key = key; this.pass = password;
    this.index = { v: 1, folders: [{ id: 'f_default', name: 'Allgemein' }], docs: [] };
    await this.saveIndex();
  },
  async unlock(password) {
    const meta = JSON.parse(await KV.get('vault_meta'));
    const key = await deriveKey(password, unb64(meta.salt), meta.iter);
    try { const v = await aesDec(key, meta.verifier, 'verifier'); if (dec(v) !== 'notfall-vault-ok') throw new Error('x'); } catch { throw new Error('Falsches Passwort.'); }
    const raw = await KV.get('vault_index');
    this.key = key; this.pass = password;
    if (raw) { const o = JSON.parse(raw); this.index = JSON.parse(dec(await aesDec(key, o, 'index'))); }
    else this.index = { v: 1, folders: [{ id: 'f_default', name: 'Allgemein' }], docs: [] };
    if (!this.index.folders.length) this.index.folders.push({ id: 'f_default', name: 'Allgemein' });
  },
  lock() { this.key = null; this.index = null; this.pass = null; },
  async saveIndex() { const e = await aesEnc(this.key, enc(JSON.stringify(this.index)), 'index'); await KV.put('vault_index', JSON.stringify(e)); },
  async addFile({ name, mime, bytes, folderId, category, notes, person }) {
    if (bytes.length > 15 * 1024 * 1024) throw new Error('Datei ist größer als 15 MB.');
    const id = uid();
    const e = await aesEnc(this.key, bytes, 'f:' + id);
    await KV.put('vault_f_' + id, JSON.stringify(e));
    this.index.docs.push({ id, name, mime: mime || 'application/octet-stream', size: bytes.length, folderId: folderId || this.index.folders[0].id, category: category || 'Sonstiges', notes: notes || '', person: person || '', added: new Date().toISOString() });
    try { await this.saveIndex(); } catch (err) { this.index.docs.pop(); await KV.del('vault_f_' + id); throw err; }
    return id;
  },
  async getFile(id) { const raw = await KV.get('vault_f_' + id); if (!raw) throw new Error('Datei fehlt im Speicher.'); return aesDec(this.key, JSON.parse(raw), 'f:' + id); },
  async deleteFile(id) { this.index.docs = this.index.docs.filter(d => d.id !== id); await this.saveIndex(); await KV.del('vault_f_' + id); },
  async updateDoc(id, patch) { const d = this.index.docs.find(x => x.id === id); if (d) Object.assign(d, patch); await this.saveIndex(); },
  async addFolder(name) { const f = { id: uid(), name }; this.index.folders.push(f); await this.saveIndex(); return f; },
  async renameFolder(id, name) { const f = this.index.folders.find(x => x.id === id); if (f) f.name = name; await this.saveIndex(); },
  async deleteFolder(id) { const docs = this.index.docs.filter(d => d.folderId === id); if (docs.length) throw new Error('Ordner ist nicht leer.'); this.index.folders = this.index.folders.filter(f => f.id !== id); await this.saveIndex(); },
  search(q, folderId) {
    const s = norm(q);
    return this.index.docs.filter(d => (!folderId || d.folderId === folderId) && (!s || norm(d.name + ' ' + d.notes + ' ' + d.category + ' ' + d.person).includes(s)));
  },
  async changePassword(newPass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)); const nk = await deriveKey(newPass, salt, VAULT_ITER);
    const staged = {};
    for (const d of this.index.docs) { const bytes = await this.getFile(d.id); staged[d.id] = JSON.stringify(await aesEnc(nk, bytes, 'f:' + d.id)); }
    const oldFiles = {}; for (const id of Object.keys(staged)) oldFiles[id] = await KV.get('vault_f_' + id);
    const oldMeta = await KV.get('vault_meta'), oldIndex = await KV.get('vault_index'), oldKey = this.key, oldPass = this.pass;
    try {
      for (const [id, v] of Object.entries(staged)) await KV.put('vault_f_' + id, v);
      this.key = nk; this.pass = newPass;
      await KV.put('vault_meta', JSON.stringify({ v: 1, salt: b64(salt), iter: VAULT_ITER, verifier: await aesEnc(nk, enc('notfall-vault-ok'), 'verifier') }));
      await this.saveIndex();
    } catch (e) {
      for (const [id, v] of Object.entries(oldFiles)) await KV.put('vault_f_' + id, v);
      await KV.put('vault_meta', oldMeta); if (oldIndex) await KV.put('vault_index', oldIndex); this.key = oldKey; this.pass = oldPass;
      throw new Error('Passwortwechsel fehlgeschlagen – alles blieb unverändert.');
    }
  },
  async wipe() { for (const k of await KV.list('vault_')) await KV.del(k); this.lock(); },
};
