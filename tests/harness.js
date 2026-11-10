'use strict';
// Laedt die reinen Logik-Module der App in eine Node-VM (ohne DOM) fuer Unit-Tests.
const vm = require('vm'), fs = require('fs'), path = require('path');
const WWW = path.join(__dirname, '..', 'app/src/main/assets/www/js');
function load(files) {
  const ctx = { console, setTimeout, clearTimeout, structuredClone, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, atob, btoa, Intl, URL };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.document = { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
  ctx.localStorage = { getItem() { return null; } };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(WWW, f), 'utf8') + '\n;', ctx, { filename: f });
  ctx.__eval = code => vm.runInContext(code, ctx);
  return ctx;
}
module.exports = { load };
