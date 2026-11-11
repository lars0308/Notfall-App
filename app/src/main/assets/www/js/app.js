'use strict';
/* ===== Notfall! – Start ===== */
async function boot() {
  try {
    const r = await loadDB();
    applyTheme();
    if (DB.users.length) UI.locked = true;
    if (DB.settings.secure && NATIVE && NATIVE.setSecure) NATIVE.setSecure(true);
    if (r.corrupt && KV.native) toast('Die Datenbank war beschädigt – die letzte Sicherung wurde geladen oder neu begonnen.', 6000);
    render();
    if (r.fresh && !location.hash) location.hash = '#/home';
    const legacy = r.fresh ? readLegacy() : null;
    if (legacy && !UI.locked) offerLegacy(legacy);
    setTimeout(() => { try { syncNotifications(); } catch (e) { /* ignorieren */ } try { lockPassSync(); } catch (e) { /* ignorieren */ } }, 1500);
    setTimeout(() => sweepPhotos().catch(() => { }), 8000);
    setTimeout(() => pruneMaps().catch(() => { }), 3000);
    if (UI.pendingRoute) { const r = UI.pendingRoute; UI.pendingRoute = null; window.__openRoute(r); }
  } catch (e) {
    console.error(e);
    $('#boot') && ($('#boot').innerHTML = '<div class="boot-logo">Notfall<span>!</span></div><p style="max-width:28rem;padding:16px;text-align:center">Die App konnte nicht gestartet werden: ' + esc(e.message || e) + '</p>');
  }
}
function offerLegacy(old) {
  confirmDlg('Daten der alten Version gefunden', `Auf diesem Gerät liegen Daten der früheren Notfall!-Version (${old.items.length} Gegenstände, ${old.bags.length} Rucksäcke). Jetzt in die neue Version übernehmen?`, { ok: 'Übernehmen', cancel: 'Später (in den Einstellungen)' }).then(ok => {
    if (!ok) return; const H = legacyToHousehold(old); DB.households = DB.households.filter(h => h.items.length || h.people.length || h.setup.done); DB.households.push(H); DB.active = H.id; persist(); go('#/home'); toast('Alte Daten importiert');
  });
}
/* Aus einer Benachrichtigung geoeffnet (z. B. Probealarm) */
window.__openRoute = r => {
  if (!DB) { UI.pendingRoute = r; return; }
  if (UI.locked) { if (/^#\/sos/.test(r) && DB.settings.lockContacts) { UI.sosLimited = true; UI.locked = false; location.hash = r; render(); } else UI.pendingRoute = r; return; }
  if (location.hash === r) render(); else location.hash = r;
};
/* Safe beim Verlassen der App immer sperren */
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Vault.unlocked && !(EXT.until > Date.now())) { Vault.lock(); SAFE.sel.clear(); } });
window.addEventListener('error', e => console.error('Fehler:', e.message));
window.addEventListener('unhandledrejection', e => console.error('Unbehandelt:', e.reason));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
