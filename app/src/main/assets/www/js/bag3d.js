'use strict';
/* ===== Notfall! – interaktive 3D-Rucksackansicht (Canvas, eigene Projektion, ohne Bibliothek) ===== */

const Bag3DModels = {
  trek: {
    r: 4.6,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [3.6, 5.6, 2.2], b: .5 },
      { id: 'lid', slot: 'lid', c: [0, 3.35, .1], s: [3.5, 1.05, 2.4], b: .38, col: 'dark' },
      { id: 'bottom', slot: 'bottom', c: [0, -2.7, 0], s: [3.7, 1.5, 2.3], b: .38, col: 'dark' },
      { id: 'front', slot: 'front', c: [0, -.3, 1.45], s: [3.0, 3.2, .8], b: .3 },
      { id: 'sideL', slot: 'sideL', c: [-2.15, -1.4, .15], s: [.7, 2.6, 1.5], b: .25, col: 'dark' },
      { id: 'sideR', slot: 'sideR', c: [2.15, -1.4, .15], s: [.7, 2.6, 1.5], b: .25, col: 'dark' },
      { id: 'sL', c: [-1.05, .4, -1.2], s: [.55, 4.8, .3], b: .1, col: 'strap' }, { id: 'sR', c: [1.05, .4, -1.2], s: [.55, 4.8, .3], b: .1, col: 'strap' },
      { id: 'hip', c: [0, -2.35, -1.3], s: [4.3, .75, .35], b: .15, col: 'strap' },
      { id: 'cs', c: [0, 2.5, 1.35], s: [.4, .22, .9], b: .05, col: 'strap' }, { id: 'vs', c: [0, 0, 1.9], s: [.35, 3.3, .1], b: .04, col: 'strap' },
      { id: 'cL', c: [-1.9, .6, 1.2], s: [.1, .3, .3], b: .03, col: 'metal' }, { id: 'cR', c: [1.9, .6, 1.2], s: [.1, .3, .3], b: .03, col: 'metal' },
    ],
  },
  tac: {
    r: 4.0,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [3.4, 5.0, 2.0], b: .42 },
      { id: 'top', slot: 'top', c: [0, 2.75, .65], s: [3.0, .9, 1.0], b: .22, col: 'dark' },
      { id: 'front', slot: 'front', c: [0, -.95, 1.35], s: [3.0, 2.2, .7], b: .22 },
      { id: 'front2', slot: 'front2', c: [0, 1.0, 1.3], s: [2.8, 1.6, .6], b: .2, col: 'dark' },
      { id: 'sideL', slot: 'sideL', c: [-2.0, -.8, .2], s: [.7, 2.2, 1.4], b: .22, col: 'dark' },
      { id: 'sideR', slot: 'sideR', c: [2.0, -.8, .2], s: [.7, 2.2, 1.4], b: .22, col: 'dark' },
      { id: 'sL', c: [-1.0, .3, -1.1], s: [.55, 4.2, .3], b: .1, col: 'strap' }, { id: 'sR', c: [1.0, .3, -1.1], s: [.55, 4.2, .3], b: .1, col: 'strap' },
      { id: 'hip', c: [0, -2.1, -1.2], s: [3.9, .7, .35], b: .15, col: 'strap' },
      ...[0, 1, 2, 3].flatMap(r => [-1.1, -.37, .37, 1.1].map((x, k) => ({ id: 'm' + r + k, c: [x, -1.55 + r * .5, 1.74], s: [.55, .09, .05], b: .02, col: 'strap' }))),
    ],
  },
  day: {
    r: 3.4,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [2.8, 4.2, 1.5], b: .4 },
      { id: 'front', slot: 'front', c: [0, -.9, 1.0], s: [2.4, 1.8, .6], b: .25, col: 'dark' },
      { id: 'sideL', slot: 'sideL', c: [-1.65, -1.2, .1], s: [.55, 1.8, 1.0], b: .2, col: 'dark' },
      { id: 'sideR', slot: 'sideR', c: [1.65, -1.2, .1], s: [.55, 1.8, 1.0], b: .2, col: 'dark' },
      { id: 'sL', c: [-.8, .3, -.85], s: [.5, 3.6, .25], b: .1, col: 'strap' }, { id: 'sR', c: [.8, .3, -.85], s: [.5, 3.6, .25], b: .1, col: 'strap' },
      { id: 'h', c: [0, 2.2, 0], s: [.9, .15, .2], b: .05, col: 'strap' },
    ],
  },
  kid: {
    r: 2.8,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [2.2, 3.1, 1.2], b: .4 },
      { id: 'front', slot: 'front', c: [0, -.7, .85], s: [1.9, 1.3, .5], b: .22, col: 'dark' },
      { id: 'sideL', slot: 'sideL', c: [-1.3, -.9, .05], s: [.45, 1.3, .8], b: .18, col: 'dark' },
      { id: 'sL', c: [-.6, .2, -.7], s: [.4, 2.6, .22], b: .08, col: 'strap' }, { id: 'sR', c: [.6, .2, -.7], s: [.4, 2.6, .22], b: .08, col: 'strap' },
      { id: 'h', c: [0, 1.65, 0], s: [.7, .12, .18], b: .04, col: 'strap' },
    ],
  },
  school: {
    r: 3.6,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [3.0, 4.4, 1.4], b: .3 },
      { id: 'front', slot: 'front', c: [0, -.9, .95], s: [2.8, 2.2, .5], b: .2, col: 'dark' },
      { id: 'sideL', slot: 'sideL', c: [-1.75, -1.3, .05], s: [.45, 1.8, .9], b: .15, col: 'dark' },
      { id: 'sideR', slot: 'sideR', c: [1.75, -1.3, .05], s: [.45, 1.8, .9], b: .15, col: 'dark' },
      { id: 'sL', c: [-.8, .3, -.85], s: [.5, 3.8, .25], b: .1, col: 'strap' }, { id: 'sR', c: [.8, .3, -.85], s: [.5, 3.8, .25], b: .1, col: 'strap' },
      { id: 'h', c: [0, 2.3, 0], s: [1.0, .15, .2], b: .05, col: 'strap' },
    ],
  },
  duffel: {
    r: 4.2,
    parts: [
      { id: 'body', slot: 'main', c: [0, 0, 0], s: [6.0, 2.6, 2.6], b: .7 },
      { id: 'top', slot: 'top', c: [0, 1.4, 0], s: [4.6, .4, 1.5], b: .15, col: 'dark' },
      { id: 'endL', slot: 'endL', c: [-3.25, -.25, 0], s: [.7, 1.7, 1.9], b: .25, col: 'dark' },
      { id: 'endR', slot: 'endR', c: [3.25, -.25, 0], s: [.7, 1.7, 1.9], b: .25, col: 'dark' },
      { id: 'hL', c: [-1.2, 1.7, 0], s: [.35, .2, 2.4], b: .06, col: 'strap' }, { id: 'hR', c: [1.2, 1.7, 0], s: [.35, .2, 2.4], b: .06, col: 'strap' },
      { id: 'sp', c: [0, 1.0, 1.35], s: [5.0, .5, .08], b: .02, col: 'strap' },
    ],
  },
  case: {
    r: 4.2,
    parts: [
      { id: 'body', slot: 'main', c: [0, -1.2, 0], s: [3.5, 3.4, 2.1], b: .35 },
      { id: 'lid', slot: 'lid', c: [0, 1.5, 0], s: [3.5, 2.6, 2.1], b: .35, col: 'dark' },
      { id: 'front', slot: 'front', c: [0, 1.0, 1.25], s: [2.8, 1.6, .4], b: .15 },
      { id: 'handle', c: [0, 3.0, 0], s: [1.3, .35, .35], b: .08, col: 'strap' },
      { id: 'w1', c: [-1.45, -3.1, .75], s: [.5, .5, .5], b: .15, col: 'strap' }, { id: 'w2', c: [1.45, -3.1, .75], s: [.5, .5, .5], b: .15, col: 'strap' },
      { id: 'w3', c: [-1.45, -3.1, -.75], s: [.5, .5, .5], b: .15, col: 'strap' }, { id: 'w4', c: [1.45, -3.1, -.75], s: [.5, .5, .5], b: .15, col: 'strap' },
      { id: 'zip', c: [0, .15, 1.06], s: [3.5, .1, .06], b: .02, col: 'metal' },
    ],
  },
};

/* ---- Geometrie ---- */
function bevelBox(c, s, b) {
  const h = s.map(v => v / 2); b = Math.min(b, Math.min(h[0], h[1], h[2]) * .9); const e = h.map(v => v - b);
  const faces = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const d = [dx, dy, dz], nz = [0, 1, 2].filter(i => d[i] !== 0); if (!nz.length) continue;
    let v;
    if (nz.length === 1) {
      const a = nz[0], o = [0, 1, 2].filter(i => i !== a);
      v = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => { const p = [0, 0, 0]; p[a] = d[a] * h[a]; p[o[0]] = u * e[o[0]]; p[o[1]] = w * e[o[1]]; return p; });
    } else if (nz.length === 2) {
      const z = [0, 1, 2].find(i => d[i] === 0), [a, bb] = nz;
      const A = t => { const p = [0, 0, 0]; p[a] = d[a] * h[a]; p[bb] = d[bb] * e[bb]; p[z] = t * e[z]; return p; };
      const B = t => { const p = [0, 0, 0]; p[a] = d[a] * e[a]; p[bb] = d[bb] * h[bb]; p[z] = t * e[z]; return p; };
      v = [A(-1), A(1), B(1), B(-1)];
    } else {
      v = [[h[0] * dx, e[1] * dy, e[2] * dz], [e[0] * dx, h[1] * dy, e[2] * dz], [e[0] * dx, e[1] * dy, h[2] * dz]];
    }
    // Normale aus Geometrie, nach aussen ausrichten
    const u1 = v[1].map((x, i) => x - v[0][i]), u2 = v[2].map((x, i) => x - v[0][i]);
    let n = [u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]];
    const len = Math.hypot(...n) || 1; n = n.map(x => x / len);
    if (n[0] * dx + n[1] * dy + n[2] * dz < 0) { v.reverse(); n = n.map(x => -x); }
    faces.push({ v: v.map(p => [p[0] + c[0], p[1] + c[1], p[2] + c[2]]), n });
  }
  return faces;
}
const hex2rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const STATUS_RGB = { packed: [61, 214, 140], partial: [245, 165, 36], over: [255, 90, 95], open: [150, 170, 190], empty: null };

class Bag3D {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.opts = opts;
    this.yaw = -.55; this.pitch = .22; this.zoom = 1; this.sel = null; this.comps = []; this.static = !!opts.static;
    this.hits = []; this.anim = null; this.model = 'trek'; this.color = BAG_COLORS.olive[1]; this.meshes = {}; this.raf = 0;
    if (!this.static) this._bind();
    this.setModel('trek', 'olive');
  }
  setModel(model, colorKey) {
    this.model = Bag3DModels[model] ? model : 'trek';
    this.color = (BAG_COLORS[colorKey] || BAG_COLORS.olive)[1];
    this.meshes = Bag3DModels[this.model].parts.map(p => Object.assign({}, p, { faces: bevelBox(p.c, p.s, p.b || .2) }));
    this.invalidate();
  }
  setComps(comps, selId) { this.comps = comps || []; this.sel = selId || null; this.invalidate(); }
  setView(name) {
    const t = { front: [0, .12], back: [Math.PI, .12], left: [Math.PI / 2, .12], right: [-Math.PI / 2, .12], top: [0, 1.3], iso: [-.55, .22] }[name] || [-.55, .22];
    const from = [this.yaw, this.pitch]; let dy = t[0] - from[0]; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const t0 = performance.now(); const dur = 260;
    this.anim = { from, dy, dp: t[1] - from[1], t0, dur };
    this.zoom = name === 'iso' ? 1 : this.zoom;
    this.invalidate();
  }
  invalidate() { if (this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); }
  resize() {
    const r = this.cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.dpr = dpr; this.invalidate();
  }
  _bind() {
    const cv = this.cv; const pts = new Map(); let down = null, pinch = 0;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.zoom = clamp(this.zoom * d / pinch, .5, 3.5); pinch = d; if (down) down.moved += 20; }
      else if (pts.size === 1) { this.yaw += dx * .011; this.pitch = clamp(this.pitch + dy * .008, -.35, 1.4); if (down) down.moved += Math.abs(dx) + Math.abs(dy); this.anim = null; }
      this.invalidate();
    });
    const up = e => {
      pts.delete(e.pointerId); pinch = 0;
      if (down && e.type === 'pointerup' && down.moved < 8 && performance.now() - down.t < 600 && pts.size === 0) {
        const r = cv.getBoundingClientRect(); this._pick((e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr);
      }
      if (!pts.size) down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom = clamp(this.zoom * (e.deltaY < 0 ? 1.1 : .9), .5, 3.5); this.invalidate(); }, { passive: false });
    cv.addEventListener('dblclick', () => { this.zoom = 1; this.setView('iso'); });
    cv.addEventListener('keydown', e => { const k = e.key; if (k === 'ArrowLeft') this.yaw -= .15; else if (k === 'ArrowRight') this.yaw += .15; else if (k === 'ArrowUp') this.pitch = clamp(this.pitch - .1, -.35, 1.4); else if (k === 'ArrowDown') this.pitch = clamp(this.pitch + .1, -.35, 1.4); else if (k === '+') this.zoom = clamp(this.zoom * 1.1, .5, 3.5); else if (k === '-') this.zoom = clamp(this.zoom * .9, .5, 3.5); else return; e.preventDefault(); this.invalidate(); });
    if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(cv); }
  }
  _pick(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; if (!h.slot) continue;
      if (inPoly(x, y, h.pts)) { const comp = this.comps.find(c => c.slot === h.slot); if (comp && this.opts.onPick) { this.opts.onPick(comp.id); return; } }
    }
    if (this.opts.onPick) this.opts.onPick(null);
  }
  destroy() { if (this.ro) this.ro.disconnect(); cancelAnimationFrame(this.raf); this.anim = null; }
  draw() {
    const cv = this.cv, g = this.ctx; if (!cv.width) this.resize();
    const W = cv.width, H = cv.height;
    if (this.anim) {
      const k = clamp((performance.now() - this.anim.t0) / this.anim.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.yaw = this.anim.from[0] + this.anim.dy * e; this.pitch = this.anim.from[1] + this.anim.dp * e;
      if (k >= 1) this.anim = null; else this.invalidate();
    }
    g.clearRect(0, 0, W, H);
    const model = Bag3DModels[this.model]; const D = model.r * 3.2; const f = Math.min(W, H) * 0.44 * 3.2 * this.zoom;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const rot = p => { const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy, y1 = p[1]; return [x1, y1 * cp - z1 * sp, y1 * sp + z1 * cp]; };
    const proj = q => { const s = f / (D - q[2]); return [W / 2 + q[0] * s, H / 2 - q[1] * s]; };
    const base = hex2rgb(this.color); const dark = mixc(base, [0, 0, 0], .28), strapC = [34, 38, 42], metal = [190, 196, 202];
    const light = [.34, .66, .67]; const ln = Math.hypot(...light); const L = light.map(v => v / ln);
    const rotated = this.meshes.map(m => { const cc = rot(m.c); return { m, depth: D - cc[2] }; }).sort((a, b) => b.depth - a.depth);
    this.hits = []; const labels = [];
    for (const { m } of rotated) {
      const comp = m.slot ? this.comps.find(c => c.slot === m.slot) : null;
      let col = m.col === 'dark' ? dark : m.col === 'strap' ? strapC : m.col === 'metal' ? metal : base;
      const sel = comp && comp.id === this.sel;
      if (comp && STATUS_RGB[comp.status]) col = mixc(col, STATUS_RGB[comp.status], comp.status === 'open' ? .12 : .3);
      if (m.slot && !comp) col = mixc(col, [120, 120, 120], .55);
      const drawn = [];
      for (const fc of m.faces) {
        const n = rot(fc.n); const vs = fc.v.map(rot);
        const ctr = vs.reduce((a, v) => [a[0] + v[0] / vs.length, a[1] + v[1] / vs.length, a[2] + v[2] / vs.length], [0, 0, 0]);
        if (n[0] * (0 - ctr[0]) + n[1] * (0 - ctr[1]) + n[2] * (D - ctr[2]) <= 0) continue;
        const lam = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]); const sh = .5 + .62 * lam;
        const c2 = col.map(v => clamp(Math.round(v * sh + (sel ? 28 : 0)), 0, 255));
        drawn.push({ pts: vs.map(proj), c2, depth: D - ctr[2] });
      }
      drawn.sort((a, b) => b.depth - a.depth);
      for (const d of drawn) {
        g.beginPath(); d.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
        g.fillStyle = rgb(d.c2); g.fill(); g.lineWidth = Math.max(1, this.dpr * .8); g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
        if (m.slot) this.hits.push({ slot: m.slot, pts: d.pts });
      }
      if (sel && drawn.length) { // Auswahlrahmen um sichtbare Flaechen
        g.lineWidth = Math.max(3, this.dpr * 2.6); g.strokeStyle = '#ffd24a'; g.lineJoin = 'round';
        for (const d of drawn) { g.beginPath(); d.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); }
      }
      if (comp && drawn.length && !this.static) {
        let bx = 0, by = 0, n = 0; for (const d of drawn.slice(-6)) for (const p of d.pts) { bx += p[0]; by += p[1]; n++; }
        labels.push({ comp, x: bx / n, y: by / n, sel });
      }
    }
    if (!this.static) this._labels(g, labels);
  }
  _labels(g, labels) {
    const fs = Math.round(11 * this.dpr); g.font = `700 ${fs}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    labels.sort((a, b) => (b.sel ? 1 : 0) - (a.sel ? 1 : 0));
    const placed = [];
    for (const l of labels) {
      const kg = l.comp.weightG >= 100 ? (l.comp.weightG / 1000).toFixed(1).replace('.', ',') + ' kg' : '–';
      const txt = l.sel ? `${l.comp.name} · ${kg}` : kg; const w = g.measureText(txt).width + 12 * this.dpr, h = fs + 8 * this.dpr;
      const r = { x: l.x - w / 2, y: l.y - h / 2, w, h };
      if (!l.sel && placed.some(q => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y)) continue;
      placed.push(r);
      const sc = STATUS_RGB[l.comp.status];
      g.beginPath(); roundRect(g, r.x, r.y, w, h, h / 2); g.fillStyle = l.sel ? '#ffd24a' : 'rgba(10,14,18,.86)'; g.fill();
      g.lineWidth = Math.max(2, this.dpr * 1.6); g.strokeStyle = sc ? rgb(sc) : 'rgba(255,255,255,.35)'; g.stroke();
      g.fillStyle = l.sel ? '#111' : '#fff'; g.fillText(txt, l.x, l.y + 1);
    }
  }
}
function inPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
function roundRect(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
