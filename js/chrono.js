/* chrono.js — chronogramme : analyseur logique intégré (entrées, sorties, sorties de portes), curseurs, fenêtre de temps */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, clear } = NS;
const WINS = [0.2, 0.5, 1, 2, 5, 10, 20, 50];
const LAB = 96, ROW = 30, PAD = 6;

class Chrono {
  constructor(app, root) {
    this.app = app; this.root = root; this.win = 'auto'; this.frozen = null; this.cur = [null, null]; this.hidden = new Set(); this.showGates = false; this.w = 600;
    this.sel = h('select', { onchange: e => { this.win = e.target.value; } }, h('option', { value: 'auto' }, 'Fenêtre : auto'), WINS.map(t => h('option', { value: t }, t + ' s')));
    this.bFreeze = h('button.small', { onclick: () => this.toggleFreeze() }, '❄ Figer');
    this.info = h('span.lginfo.mono', 'Cliquez sur le chronogramme pour placer les curseurs A puis B.');
    this.cv = h('canvas', { height: 120, style: { width: '100%', display: 'block', background: '#0b1410', borderRadius: '4px', cursor: 'crosshair' } });
    this.chkGates = h('input', { type: 'checkbox', onchange: e => { this.showGates = e.target.checked; this.draw(true); } });
    root.appendChild(h('div.chbar', this.sel, ' ', this.bFreeze, h('button.small', { onclick: () => { this.cur = [null, null]; this.info.textContent = 'Curseurs effacés.'; } }, 'Effacer les curseurs'), h('button.small', { title: 'Efface l\'historique et remet le temps à zéro', onclick: () => app.resetSim() }, '↺ Effacer le chronogramme'),
      h('label.small', this.chkGates, ' montrer les sorties de portes'), this.info));
    root.appendChild(this.cv);
    root.appendChild(h('div.small.muted', { style: { marginTop: '3px' } }, 'Astuce : cliquez sur le nom d\'un signal pour le masquer / l\'afficher. Les générateurs (horloge, séquence, compteur) font défiler le temps ; mettez la simulation en pause pour lire tranquillement.'));
    this.names = [];
  }
  signals() {
    const sim = this.app.sim; if (sim.dirty) return []; const r = [];
    const order = { switch: 0, button: 0, clock: 0, seq: 0, cnt: 0, dff: 2, led: 3, probe: 3, actuator: 3, seg7: 3 };
    for (const s of sim.sigs) {
      const k = s.kind, isGate = !!NS.GATE_OF[k] || k === 'blackbox'; if (k === 'const1' || k === 'const0') continue;
      const out = NS.pinsOf(s.part)[s.pin].dir === 'out';
      if (isGate && !this.showGates) continue; if (k === 'dff' && (!out || NS.pinsOf(s.part)[s.pin].n === 'NQ')) continue;
      r.push({ s, o: isGate ? 1 : (order[k] === undefined ? 1 : order[k]), cls: isGate ? 'gate' : (order[k] === 0 ? 'in' : order[k] === 2 ? 'ff' : 'out') });
    }
    return r.sort((a, b) => a.o - b.o);
  }
  autoWin() {
    const sim = this.app.sim; let fmin = 0; for (const p of sim.c.parts) { let f = 0; if (p.type === 'clock') f = +p.p.f; else if (p.type === 'seq') f = +p.p.rate / Math.max(2, String(p.p.pattern).length); else if (p.type === 'cnt') f = +p.p.f / (1 << (+p.p.bits || 3)); if (f > 0) fmin = fmin ? Math.min(fmin, f) : f; }
    if (!fmin) return 10; const want = 2.2 / fmin; return WINS.find(t => t >= want) || 50;
  }
  tw() { return this.win === 'auto' ? this.autoWin() : +this.win; }
  toggleFreeze() { this.frozen = this.frozen === null ? this.app.sim.t : null; this.bFreeze.textContent = this.frozen === null ? '❄ Figer' : '▶ Reprendre'; }
  tEnd() { return this.frozen === null ? this.app.sim.t : this.frozen; }
  click(e) {
    const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) * (this.cv.width / r.width); if (x < LAB) return;
    const t = this.tEnd() - this.tw() + (x - LAB) / (this.cv.width - LAB - PAD) * this.tw();
    if (this.cur[0] === null || this.cur[1] !== null) this.cur = [t, null]; else this.cur[1] = t;
    if (this.cur[1] !== null) { const d = Math.abs(this.cur[1] - this.cur[0]); this.info.textContent = 'Δt = ' + NS.fmt(d, 's', 4) + ' → f = 1/Δt = ' + NS.fmt(1 / d, 'Hz', 4); } else this.info.textContent = 'Curseur A placé à t = ' + this.cur[0].toFixed(3) + ' s : cliquez pour placer B.';
  }
  valueAt(tr, t) { let v = null; for (let i = tr.length - 2; i >= 0; i -= 2) if (tr[i] <= t) { v = tr[i + 1]; break; } return v; }
  draw(force) {
    const dock = this.root; if (!force && dock.offsetParent === null) return;
    const list = this.signals().filter(x => true), sim = this.app.sim; const W = Math.max(300, Math.floor(this.cv.clientWidth * (g.devicePixelRatio || 1) / (g.devicePixelRatio || 1)));
    const H = PAD + 22 + Math.max(1, list.length) * ROW; if (this.cv.width !== W) this.cv.width = W; if (this.cv.height !== H) this.cv.height = H;
    const ctx = this.cv.getContext('2d'); ctx.fillStyle = '#0b1410'; ctx.fillRect(0, 0, W, H); ctx.font = '12px ui-monospace,Consolas,monospace';
    const tw = this.tw(), t1 = this.tEnd(), t0 = t1 - tw, X = t => LAB + (t - t0) / tw * (W - LAB - PAD);
    /* quadrillage vertical */
    const raw = tw / 8, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
    ctx.strokeStyle = '#1d2f27'; ctx.fillStyle = '#6b8f7c'; ctx.lineWidth = 1;
    for (let t = Math.ceil(t0 / step) * step; t <= t1 + 1e-9; t += step) { const x = Math.round(X(t)) + .5; ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - 16); ctx.stroke(); ctx.fillText((+t.toFixed(6)) + ' s', x + 2, H - 4); }
    this.names = [];
    list.forEach((it, k) => {
      const s = it.s, y0 = PAD + k * ROW, yh = y0 + 6, yl = y0 + ROW - 8, hid = this.hidden.has(s.key);
      const col = it.cls === 'in' ? '#60a5fa' : it.cls === 'out' ? '#4ade80' : it.cls === 'ff' ? '#f472b6' : '#fbbf24';
      ctx.fillStyle = hid ? '#4b5563' : col; ctx.textAlign = 'left'; ctx.fillText(s.name, 6, y0 + 19); this.names.push({ y0, key: s.key });
      const cur = sim.nv[s.net]; ctx.textAlign = 'right'; ctx.fillStyle = cur === 2 ? '#a3a3a3' : cur ? '#86efac' : '#94a3b8'; ctx.fillText(cur === 2 ? '?' : String(cur), LAB - 8, y0 + 19); ctx.textAlign = 'left';
      ctx.strokeStyle = '#1d2f27'; ctx.beginPath(); ctx.moveTo(LAB, y0 + ROW - .5); ctx.lineTo(W - PAD, y0 + ROW - .5); ctx.stroke();
      if (hid) return;
      /* tracé */
      const tr = s.tr; let v = this.valueAt(tr, t0), x = LAB; const Y = vv => vv === 1 ? yh : vv === 0 ? yl : (yh + yl) / 2;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); let started = false;
      const seg = (xa, xb, vv) => { if (vv === null) return; const yy = Y(vv); if (vv === 2) { ctx.stroke(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); started = false; return; } if (!started) { ctx.moveTo(xa, yy); started = true; } else ctx.lineTo(xa, yy); ctx.lineTo(xb, yy); };
      let i = tr.length - 2; while (i >= 0 && tr[i] > t0) i -= 2; i += 2;
      for (; i < tr.length; i += 2) { const tx = tr[i]; if (tx > t1) break; const xx = X(tx); seg(x, xx, v); v = tr[i + 1]; x = Math.max(xx, LAB); }
      seg(x, X(t1), v); ctx.stroke(); ctx.lineWidth = 1;
    });
    /* curseurs */
    ctx.setLineDash([5, 3]); [['A', '#facc15', this.cur[0]], ['B', '#22d3ee', this.cur[1]]].forEach(([n, c, t]) => { if (t === null || t < t0 || t > t1) return; const x = Math.round(X(t)) + .5; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - 16); ctx.stroke(); ctx.fillStyle = c; ctx.fillText(n, x + 3, PAD + 10); });
    ctx.setLineDash([]);
    if (!list.length) { ctx.fillStyle = '#6b8f7c'; ctx.fillText('Aucun signal à afficher : placez des entrées et des sorties.', LAB, PAD + 20); }
    if (sim.warn) { ctx.fillStyle = '#fca5a5'; ctx.fillText('⚠ ' + sim.warn, LAB, H - 4); }
    this.cv.onmousedown = null; this.cv.onclick = e => { const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) * (this.cv.width / r.width), y = (e.clientY - r.top) * (this.cv.height / r.height); if (x < LAB) { const n = this.names.find(n => y >= n.y0 && y < n.y0 + ROW); if (n) { if (this.hidden.has(n.key)) this.hidden.delete(n.key); else this.hidden.add(n.key); this.draw(true); } } else this.click(e); };
  }
}
NS.Chrono = Chrono;
})(typeof window !== 'undefined' ? window : globalThis);
