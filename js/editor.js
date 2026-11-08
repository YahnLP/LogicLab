/* editor.js — éditeur de schéma SVG : placement, câblage orthogonal, jonctions, rotation, annulation.
   Adapté d'ElectroLab ; ajoute l'affichage des niveaux logiques (0 / 1 / ?) sur les fils et les broches. */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, $, $$, clear, PARTS, rotPt } = NS;
const SVGNS = 'http://www.w3.org/2000/svg';
const snap = v => Math.round(v / 10) * 10;
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const LV = ['0', '1', '?'];

function bbox(inst) {
  const d = PARTS[inst.type]; let [x1, y1, x2, y2] = NS.extOf(inst) || [-24, -18, 24, 18];
  NS.pinsOf(inst).forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); });
  return [x1, y1, x2, y2];
}
NS.bbox = bbox;

class Editor {
  constructor(app) {
    this.app = app; this.svg = $('#canvas'); this.world = $('#world'); this.gParts = $('#parts'); this.gWires = $('#wires'); this.gJ = $('#juncs'); this.gRub = $('#rubber');
    this.view = { x: 120, y: 120, k: 1 }; this.tool = 'select'; this.sel = null; this.selWire = null; this.selJ = null; this.armed = null; this.wiring = null; this.drag = null; this.undoStack = [];
    this.partEls = new Map(); this.wireEls = new Map(); this.dynKey = new Map(); this.mouse = [0, 0]; this.bind(); this.applyView();
  }
  get c() { return this.app.circuit; }
  applyView() { const v = this.view; this.world.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`); }
  toWorld(e) { const r = this.svg.getBoundingClientRect(); return [(e.clientX - r.left - this.view.x) / this.view.k, (e.clientY - r.top - this.view.y) / this.view.k]; }
  fit() {
    const c = this.c; const r = this.svg.getBoundingClientRect(); if (!c.parts.length) { this.view = { x: 120, y: 120, k: 1 }; return this.applyView(); }
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    c.parts.forEach(p => { const b = bbox(p); [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].forEach(([x, y]) => { const [rx, ry] = rotPt(x, y, p.rot); x1 = Math.min(x1, p.x + rx); x2 = Math.max(x2, p.x + rx); y1 = Math.min(y1, p.y + ry); y2 = Math.max(y2, p.y + ry); }); });
    const k = Math.min(1.5, Math.max(0.3, Math.min((r.width - 60) / (x2 - x1 + 40), (r.height - 60) / (y2 - y1 + 60))));
    this.view = { k, x: r.width / 2 - k * (x1 + x2) / 2, y: r.height / 2 - k * (y1 + y2) / 2 }; this.applyView();
  }
  setTool(t) { this.tool = t; this.cancelWiring(); this.svg.dataset.tool = t; $$('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); this.hint(); }
  arm(type) { this.armed = type; this.setTool('select'); this.cancelWiring(); $$('.pal-item').forEach(b => b.classList.toggle('armed', b.dataset.type === type)); this.hint(); this.ghost(); }
  disarm() { this.armed = null; $$('.pal-item').forEach(b => b.classList.remove('armed')); this.ghost(); this.hint(); }
  hint() {
    const t = $('#toolhint'); let s = '';
    if (this.armed) s = 'Cliquez pour placer « ' + PARTS[this.armed].label + ' » · R : pivoter · Échap : terminer';
    else if (this.wiring) s = 'Cliquez une broche pour terminer · clic dans le vide = point de passage · Échap : annuler';
    else if (this.tool === 'wire') s = 'Fil : cliquez une broche (ou un fil) de départ';
    else if (this.tool === 'delete') s = 'Cliquez un composant ou un fil pour le supprimer';
    else s = 'Cliquez un interrupteur pour le basculer (0 / 1) · tirez d\'une broche vers une autre pour câbler · une sortie peut alimenter plusieurs entrées';
    t.textContent = s;
  }
  /* ---------------- historique ---------------- */
  snapshot() { return JSON.stringify(NS.serialize(this.c)); }
  pushUndo() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 60) this.undoStack.shift(); }
  undo() { const s = this.undoStack.pop(); if (!s) return; this.app.loadCircuit(JSON.parse(s), true); }
  /* ---------------- rendu ---------------- */
  render() {
    clear(this.gParts); clear(this.gWires); clear(this.gJ); this.partEls.clear(); this.wireEls.clear(); this.dynKey.clear();
    for (const w of this.c.wires) { const e = this.wireEl(w); this.wireEls.set(w.id, e); this.gWires.appendChild(e); }
    for (const p of this.c.parts) { const e = this.partEl(p); this.partEls.set(p.id, e); this.gParts.appendChild(e); }
    this.renderJunctions(); this.dyn(true);
  }
  expand(w) {
    const c = this.c; const A = c.endPos(w.a), B = c.endPos(w.b); const pts = [A].concat(w.mid || [], [B]);
    const dir = e => { if (e.j) return 'h'; const p = c.part(e.c); if (!p) return 'h'; const pin = NS.pinsOf(p)[e.p]; const [rx, ry] = rotPt(pin.x, pin.y, p.rot); const bb = bbox(p);
      const [cx, cy] = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; const [qx, qy] = rotPt(cx, cy, p.rot); const dx = rx - qx, dy = ry - qy; return Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'; };
    const dA = dir(w.a), dB = dir(w.b); const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = out[out.length - 1], q = pts[i];
      if (p[0] !== q[0] && p[1] !== q[1]) {
        const first = i === 1, last = i === pts.length - 1;
        if (first && last) {
          if (dA === dB) { if (dA === 'v') { const my = snap((p[1] + q[1]) / 2); out.push([p[0], my], [q[0], my]); } else { const mx = snap((p[0] + q[0]) / 2); out.push([mx, p[1]], [mx, q[1]]); } }
          else out.push(dA === 'v' ? [p[0], q[1]] : [q[0], p[1]]);
        } else if (first) out.push(dA === 'v' ? [p[0], q[1]] : [q[0], p[1]]);
        else if (last) out.push(dB === 'v' ? [q[0], p[1]] : [p[0], q[1]]);
        else out.push([q[0], p[1]]);
      }
      out.push(q);
    }
    return out;
  }
  wireEl(w) {
    const pts = this.expand(w); const d = 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
    const gr = svgEl('g', { 'data-wid': w.id }); const path = svgEl('path', { d, class: 'wire' + (this.selWire === w.id ? ' sel' : '') }); const hit = svgEl('path', { d, class: 'wirehit', 'data-wid': w.id });
    gr.appendChild(path); gr.appendChild(hit);
    if (this.selWire === w.id) for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); if (L >= 20) gr.appendChild(svgEl('rect', { x: (a[0] + b[0]) / 2 - 4, y: (a[1] + b[1]) / 2 - 4, width: 8, height: 8, rx: 2, class: 'seghandle' })); }
    return gr;
  }
  renderJunctions() {
    clear(this.gJ); const cnt = new Map();
    for (const w of this.c.wires) for (const e of [w.a, w.b]) if (e.j) cnt.set(e.j, (cnt.get(e.j) || 0) + 1);
    const pc = new Map(); for (const w of this.c.wires) for (const e of [w.a, w.b]) if (e.c) { const k = e.c + ':' + e.p; pc.set(k, (pc.get(k) || 0) + 1); }
    for (const [k, n] of pc) if (n >= 2) { const [id, pi] = k.split(':'); const q = this.c.endPos({ c: id, p: +pi }); if (q) this.gJ.appendChild(svgEl('circle', { cx: q[0], cy: q[1], r: 4.2, class: 'junc pinjunc' })); }
    for (const j of this.c.junctions) { const n = cnt.get(j.id) || 0; const dot = svgEl('circle', { cx: j.x, cy: j.y, r: n >= 3 ? 4.5 : 3.2, class: 'junc', 'data-jid': j.id }); if (this.selJ === j.id) dot.setAttribute('style', 'fill:#f59e0b'); this.gJ.appendChild(dot); }
  }
  /* position et alignement de l'étiquette de niveau d'une broche (vers l'extérieur du composant) */
  badgePos(inst, bb, pin) {
    const [rx, ry] = rotPt(pin.x, pin.y, inst.rot); const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2; let dx = pin.x - cx, dy = pin.y - cy;
    let u = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1]; u = rotPt(u[0], u[1], inst.rot);
    if (u[0] !== 0) return { x: rx + u[0] * 7, y: ry - 5, a: u[0] > 0 ? 'start' : 'end' };
    return { x: rx + 8, y: ry + u[1] * 11 + (u[1] > 0 ? 0 : 3), a: 'start' };
  }
  partEl(inst) {
    const d = PARTS[inst.type]; const gp = svgEl('g', { class: 'part t-' + inst.type + (this.sel === inst.id ? ' sel' : ''), 'data-id': inst.id, transform: `translate(${inst.x},${inst.y})` });
    const bb = bbox(inst); gp.appendChild(svgEl('rect', { class: 'hl', x: bb[0] - 4, y: bb[1] - 4, width: bb[2] - bb[0] + 8, height: bb[3] - bb[1] + 8, transform: `rotate(${inst.rot})`, rx: 4 }));
    const body = svgEl('g', { transform: `rotate(${inst.rot})`, class: 'body' }); body.innerHTML = d.symbol(inst);
    const hitr = svgEl('rect', { x: bb[0], y: bb[1], width: bb[2] - bb[0], height: bb[3] - bb[1], transform: `rotate(${inst.rot})`, fill: 'transparent', stroke: 'none', class: 'bodyhit' }); gp.appendChild(hitr); gp.appendChild(body);
    const pins = NS.pinsOf(inst);
    pins.forEach((pin, i) => {
      const [x, y] = rotPt(pin.x, pin.y, inst.rot); const c = svgEl('circle', { cx: x, cy: y, r: 5, class: 'pin ' + pin.dir, 'data-pin': i }); const t = svgEl('title'); t.textContent = (inst.ref ? inst.ref + ' · ' : '') + pin.n + (pin.dir === 'out' ? ' (sortie)' : ' (entrée)'); c.appendChild(t); gp.appendChild(c);
      if (inst.type !== 'label' && !(inst.type === 'seg7' && false)) { const b = this.badgePos(inst, bb, pin); const tx = svgEl('text', { x: b.x, y: b.y, 'text-anchor': b.a, class: 'pv lvx', 'data-bp': i }); tx.textContent = '?'; gp.appendChild(tx); }
    });
    if (!d.noLabel) {
      const pts = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]].map(([x, y]) => rotPt(x, y, inst.rot)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, top = Math.min(...ys), bot = Math.max(...ys);
      const lab = svgEl('text', { x: cx, y: top - 6, class: 'lab', 'text-anchor': 'middle' }); lab.textContent = inst.ref; gp.appendChild(lab);
      const vt = this.valueText(inst); if (vt) { const v = svgEl('text', { x: cx, y: bot + 13, class: 'val', 'text-anchor': 'middle' }); v.textContent = vt; gp.appendChild(v); }
    }
    return gp;
  }
  valueText(inst) {
    const d = PARTS[inst.type]; if (inst.p.hidden && !this.app.teacher) return d.value && inst.type !== 'blackbox' ? d.value(inst) : '';
    return d.value ? d.value(inst) : '';
  }
  visKey(p) { return [p.rot, p.x, p.y, p.ref, JSON.stringify(p.p), p.rt && p.rt.pressed, this.sel === p.id, this.app.teacher].join('|'); }
  /* à chaque image : couleurs des fils, niveaux des broches, LED, afficheurs */
  dyn(force) {
    const sim = this.app.sim; const ok = sim && !sim.dirty; const lv = this.app.opts.levels;
    for (const p of this.c.parts) {
      let e = this.partEls.get(p.id); if (!e) continue; const k = this.visKey(p);
      if (this.dynKey.get(p.id) !== k) { const n = this.partEl(p); e.replaceWith(n); this.partEls.set(p.id, n); this.dynKey.set(p.id, k); e = n; }
      const val = i => ok ? sim.pinVal(p, i) : 2;
      e.querySelectorAll('[data-bp]').forEach(n => { const i = +n.dataset.bp, v = val(i); n.setAttribute('class', 'pv lv' + (v === 2 ? 'x' : v)); n.style.display = lv ? '' : 'none'; n.textContent = LV[v]; });
      e.querySelectorAll('circle.pin').forEach(n => { const v = val(+n.dataset.pin); n.setAttribute('class', 'pin ' + NS.pinsOf(p)[+n.dataset.pin].dir + ' lv' + (v === 2 ? 'x' : v)); });
      e.querySelectorAll('[data-pv]').forEach(n => { const v = val(+n.dataset.pv); n.textContent = LV[v]; n.classList.remove('lv0', 'lv1', 'lvx'); n.classList.add('lv' + (v === 2 ? 'x' : v)); });
      e.querySelectorAll('[data-pfill]').forEach(n => { const v = val(+n.dataset.pfill); n.classList.remove('lv0', 'lv1', 'lvx'); n.classList.add('lv' + (v === 2 ? 'x' : v)); });
    }
    for (const w of this.c.wires) { const e = this.wireEls.get(w.id); if (!e) continue; const v = ok ? sim.wireVal(w) : 2; const pa = e.firstChild; const cls = 'wire lv' + (v === 2 ? 'x' : v) + (this.selWire === w.id ? ' sel' : '') + (pa.classList.contains('netlit') ? ' netlit' : ''); if (pa.getAttribute('class') !== cls) pa.setAttribute('class', cls); }
    if (ok) this.gJ.querySelectorAll('[data-jid]').forEach(n => { const j = this.c.junctions.find(x => x.id === n.dataset.jid); if (j && this.selJ !== j.id) { const v = sim.junctionVal(j); n.setAttribute('class', 'junc lv' + (v === 2 ? 'x' : v)); } });
  }
  /* surbrillance du réseau électrique survolé */
  netLight(t) {
    let net = null; const sim = this.app.sim; if (sim.dirty) return;
    if (t && t.closest) { const pin = t.closest('.pin'); const wh = t.closest('[data-wid]'); if (pin) { const part = this.c.part(pin.closest('.part').dataset.id); const nn = sim.pinNet.get(part.id); net = nn ? nn[+pin.dataset.pin] : null; } else if (wh) net = sim.wireNet.get(wh.dataset.wid); }
    if (net === this._net) return; this._net = net;
    this.wireEls.forEach((e, id) => e.firstChild.classList.toggle('netlit', net !== null && sim.wireNet.get(id) === net));
  }
  /* ---------------- sélection ---------------- */
  select(id) { this.sel = id; this.selWire = null; this.selJ = null; this.render(); this.app.onSelect(id ? this.c.part(id) : null); }
  selectWire(id) { this.sel = null; this.selWire = id; this.selJ = null; this.render(); this.app.onSelect(null); }
  /* ---------------- fils ---------------- */
  nearestOnWire(w, pt) {
    const pts = this.expand(w); let best = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; let px, py;
      if (x1 === x2) { px = x1; py = Math.max(Math.min(y1, y2), Math.min(Math.max(y1, y2), snap(pt[1]))); } else { py = y1; px = Math.max(Math.min(x1, x2), Math.min(Math.max(x1, x2), snap(pt[0]))); }
      const d = Math.hypot(px - pt[0], py - pt[1]); if (!best || d < best.d) best = { d, i, p: [px, py], pts };
    }
    return best;
  }
  splitWire(w, pt) {
    const b = this.nearestOnWire(w, pt); if (!b) return null; const P = b.p; const pts = b.pts;
    const same = (a, c) => a[0] === c[0] && a[1] === c[1];
    for (const e of [w.a, w.b]) { const q = this.c.endPos(e); if (same(q, P)) return e; }
    const j = this.c.junction(P[0], P[1]);
    const before = pts.slice(1, b.i + 1).filter(q => !same(q, P)), after = pts.slice(b.i + 1, pts.length - 1).filter(q => !same(q, P));
    const idx = this.c.wires.indexOf(w); this.c.wires.splice(idx, 1, { id: this.c.uid('w'), a: w.a, b: { j: j.id }, mid: before, color: w.color }, { id: this.c.uid('w'), a: { j: j.id }, b: w.b, mid: after, color: w.color });
    return { j: j.id };
  }
  startWiring(from, mode) { this.wiring = { from, mid: [], mode, moved: false, start: this.mouse.slice() }; this.hint(); this.rubber(); }
  cancelWiring() { this.wiring = null; clear(this.gRub); this.hint(); }
  endpointAt(t, wp) {
    if (!t) return null;
    const pin = t.closest && t.closest('.pin'); if (pin) { const part = pin.closest('.part'); return { c: part.dataset.id, p: +pin.dataset.pin }; }
    if (t.dataset && t.dataset.jid) return { j: t.dataset.jid };
    const wh = t.closest && t.closest('[data-wid]'); if (wh && wp) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); if (w) return { wire: w, pt: wp }; }
    return null;
  }
  sameEnd(a, b) { return (a.j && a.j === b.j) || (a.c && a.c === b.c && a.p === b.p); }
  /* deux entrées ne peuvent pas être reliées entre elles sans pilote : on avertit simplement */
  checkLink(a, b) {
    const dirOf = e => { if (!e.c) return null; const p = this.c.part(e.c); return p ? NS.pinsOf(p)[e.p].dir : null; };
    const da = dirOf(a), db = dirOf(b); if (da === 'out' && db === 'out') this.app.toast('Attention : deux sorties reliées ensemble provoquent un conflit si elles ne sont pas au même niveau.', 'warn');
  }
  finishWiring(to) {
    const wr = this.wiring; if (!wr) return; let end = to;
    if (end.wire) { this.pushUndo(); const r = this.splitWire(end.wire, end.pt); if (!r) return; end = r; this.c.wire(wr.from, end, wr.mid); this.cancelWiring(); this.app.changed('wire'); return; }
    if (this.sameEnd(wr.from, end) && !wr.mid.length) return;
    this.pushUndo(); this.checkLink(wr.from, end); this.c.wire(wr.from, end, wr.mid); this.cancelWiring(); this.app.changed('wire');
  }
  rubber() {
    clear(this.gRub); const wr = this.wiring; if (!wr) return;
    const fake = { id: 'tmp', a: wr.from, b: { j: '__m' }, mid: wr.mid }; const jt = { id: '__m', x: snap(this.mouse[0]), y: snap(this.mouse[1]) };
    this.c.junctions.push(jt); const pts = this.expand(fake); this.c.junctions.pop();
    this.gRub.appendChild(svgEl('path', { d: 'M' + pts.map(p => p.join(' ')).join(' L'), class: 'rubber' }));
  }
  ghost() {
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; } if (!this.armed) return;
    const inst = NS.newInst(this.armed, snap(this.mouse[0]), snap(this.mouse[1]), 'ghost'); inst.rot = this.armedRot || 0; inst.ref = '';
    const e = this.partEl(inst); e.setAttribute('opacity', '.55'); e.style.pointerEvents = 'none'; this.ghostEl = e; this.gRub.appendChild(e);
  }
  /* ---------------- suppression ---------------- */
  removePart(p) { this.pushUndo(); this.c.remove(p); this.cleanJunctions(); if (this.sel === p.id) this.sel = null; this.app.changed('structure'); this.app.onSelect(null); }
  removeWire(id) { this.pushUndo(); this.c.wires = this.c.wires.filter(w => w.id !== id); this.cleanJunctions(); this.selWire = null; this.app.changed('structure'); }
  cleanJunctions() {
    const used = new Set(); this.c.wires.forEach(w => [w.a, w.b].forEach(e => e.j && used.add(e.j)));
    this.c.junctions = this.c.junctions.filter(j => used.has(j.id));
    for (const j of this.c.junctions.slice()) {
      const ws = this.c.wires.filter(w => w.a.j === j.id || w.b.j === j.id);
      if (ws.length === 2 && !(ws[0].a.j === j.id && ws[0].b.j === j.id)) {
        const [w1, w2] = ws; const e1 = w1.a.j === j.id ? w1.b : w1.a, e2 = w2.a.j === j.id ? w2.b : w2.a;
        const m1 = w1.a.j === j.id ? (w1.mid || []).slice().reverse() : (w1.mid || []), m2 = w2.a.j === j.id ? (w2.mid || []) : (w2.mid || []).slice().reverse();
        this.c.wires = this.c.wires.filter(w => w !== w1 && w !== w2); this.c.wires.push({ id: this.c.uid('w'), a: e1, b: e2, mid: m1.concat([[j.x, j.y]], m2), color: w1.color });
        this.c.junctions = this.c.junctions.filter(x => x !== j);
      }
    }
  }
  /* ---------------- événements ---------------- */
  bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', e => this.down(e)); svg.addEventListener('pointermove', e => this.move(e)); svg.addEventListener('pointerup', e => this.up(e));
    svg.addEventListener('contextmenu', e => { e.preventDefault(); if (this.wiring) this.cancelWiring(); else if (this.armed) this.disarm(); });
    svg.addEventListener('wheel', e => {
      e.preventDefault(); const r = svg.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const k0 = this.view.k; const k = Math.min(3, Math.max(0.25, k0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      this.view.x = mx - (mx - this.view.x) * k / k0; this.view.y = my - (my - this.view.y) * k / k0; this.view.k = k; this.applyView();
    }, { passive: false });
    window.addEventListener('keydown', e => this.key(e));
  }
  key(e) {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
    const k = e.key;
    if (k === 'Escape') { this.cancelWiring(); this.disarm(); }
    else if (k === 'Delete' || k === 'Backspace') { if (this.sel) { const p = this.c.part(this.sel); if (p) this.removePart(p); } else if (this.selWire) this.removeWire(this.selWire); e.preventDefault(); }
    else if (k === 'r' || k === 'R') this.rotate();
    else if (k === 'v' || k === 'V') this.setTool('select'); else if (k === 'c' || k === 'C') this.setTool('wire'); else if (k === 'x' || k === 'X') this.setTool('delete');
    else if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { this.undo(); e.preventDefault(); }
    else if (k === ' ') { this.app.toggleRun(); e.preventDefault(); }
  }
  rotate() {
    if (this.armed) { this.armedRot = ((this.armedRot || 0) + 90) % 360; this.ghost(); return; }
    const p = this.sel && this.c.part(this.sel); if (!p) return; this.pushUndo(); p.rot = (p.rot + 90) % 360; this.render(); this.app.changed('geometry');
  }
  down(e) {
    if (e.button === 2) return;
    { const now = performance.now(), ld = this.lastDown; if (ld && now - ld.t < 380 && Math.hypot(e.clientX - ld.x, e.clientY - ld.y) < 6 && e.button === 0 && !this.armed) { this.lastDown = null; this.drag = null; this.dbl(e); return; } this.lastDown = { t: now, x: e.clientX, y: e.clientY }; }
    this.svg.setPointerCapture(e.pointerId); const wp = this.toWorld(e); this.mouse = wp; const t = e.target;
    const end = this.endpointAt(t, wp);
    if (e.button === 1 || e.shiftKey && !end) { this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y }; this.svg.classList.add('panning'); return; }
    if (this.wiring) { if (end) return this.finishWiring(end); this.wiring.mid.push([snap(wp[0]), snap(wp[1])]); this.rubber(); return; }
    if (this.armed) { this.pushUndo(); const p = this.c.add(this.armed, snap(wp[0]), snap(wp[1])); p.rot = this.armedRot || 0; this.app.changed('structure'); this.select(p.id); this.ghost(); return; }
    const part = t.closest && t.closest('.part');
    if (this.tool === 'delete') {
      if (part) { const p = this.c.part(part.dataset.id); if (p) this.removePart(p); } else { const wh = t.closest && t.closest('[data-wid]'); if (wh) this.removeWire(wh.dataset.wid); }
      return;
    }
    if (end && (this.tool === 'wire' || (end.c !== undefined && t.closest('.pin')) || end.j)) {
      if (end.wire) { this.pushUndo(); const r = this.splitWire(end.wire, wp); this.app.changed('wire'); this.render(); if (r) this.startWiring(r, 'click'); return; }
      this.startWiring(end, 'drag'); return;
    }
    if (this.tool === 'wire') { const wh = t.closest && t.closest('[data-wid]'); if (wh) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); this.pushUndo(); const r = this.splitWire(w, wp); this.render(); if (r) this.startWiring(r, 'click'); } return; }
    if (part) {
      const p = this.c.part(part.dataset.id); this.select(p.id);
      if (PARTS[p.type].momentary) { p.rt.pressed = true; this.app.poke(); this.pressed = p; }
      this.drag = { kind: 'part', p, ox: wp[0] - p.x, oy: wp[1] - p.y, moved: false, undo: this.snapshot(), toggle: !!PARTS[p.type].clickable && !t.closest('.pin') };
      return;
    }
    const wh = t.closest && t.closest('[data-wid]'); if (wh) { const wid = wh.dataset.wid; this.selectWire(wid); const w = this.c.wires.find(x => x.id === wid); if (w) this.drag = { kind: 'seg', w, start: wp.slice(), active: false, undo: this.snapshot(), moved: false }; return; }
    if (t.dataset && t.dataset.jid) { this.drag = { kind: 'junc', j: this.c.junctions.find(j => j.id === t.dataset.jid), undo: this.snapshot() }; return; }
    if (this.sel || this.selWire) { this.sel = null; this.selWire = null; this.render(); this.app.onSelect(null); }
    this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y }; this.svg.classList.add('panning');
  }
  move(e) {
    const wp = this.toWorld(e); this.mouse = wp; const d = this.drag;
    if (d) {
      if (d.kind === 'pan') { this.view.x = d.vx + e.clientX - d.sx; this.view.y = d.vy + e.clientY - d.sy; this.applyView(); }
      else if (d.kind === 'part') { const nx = snap(wp[0] - d.ox), ny = snap(wp[1] - d.oy); if (nx !== d.p.x || ny !== d.p.y) { if (!d.moved) { this.undoStack.push(d.undo); d.moved = true; } d.p.x = nx; d.p.y = ny; const el = this.partEls.get(d.p.id); if (el) el.setAttribute('transform', `translate(${nx},${ny})`); this.redrawWires(); } }
      else if (d.kind === 'seg') this.segDrag(d, wp);
      else if (d.kind === 'junc') { const nx = snap(wp[0]), ny = snap(wp[1]); if (nx !== d.j.x || ny !== d.j.y) { if (!d.moved) { this.undoStack.push(d.undo); d.moved = true; } d.j.x = nx; d.j.y = ny; this.redrawWires(); this.renderJunctions(); } }
    }
    if (this.wiring) { if (Math.hypot(wp[0] - this.wiring.start[0], wp[1] - this.wiring.start[1]) > 6) this.wiring.moved = true; this.rubber(); }
    if (this.armed) this.ghost();
    if (!this.drag && !this.wiring) this.netLight(e.target);
  }
  segDrag(d, wp) {
    const w = d.w;
    if (!d.active) {
      if (Math.hypot(wp[0] - d.start[0], wp[1] - d.start[1]) < 5) return;
      const P = this.expand(w).map(p => p.slice()); let bi = -1, bd = 1e9;
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if (a[0] === b[0] && a[1] === b[1]) continue; const dx = b[0] - a[0], dy = b[1] - a[1]; const u = Math.max(0, Math.min(1, ((d.start[0] - a[0]) * dx + (d.start[1] - a[1]) * dy) / (dx * dx + dy * dy))); const dist = Math.hypot(d.start[0] - a[0] - u * dx, d.start[1] - a[1] - u * dy); if (dist < bd) { bd = dist; bi = i; } }
      if (bi < 0) { this.drag = null; return; }
      const Q = P; let i = bi; if (i === 0) { Q.unshift(Q[0].slice()); i = 1; } if (i + 1 === Q.length - 1) Q.push(Q[Q.length - 1].slice());
      d.Q = Q; d.i = i; d.horiz = Q[i][1] === Q[i + 1][1]; d.active = true; this.undoStack.push(d.undo); d.moved = true;
    }
    const Q = d.Q, i = d.i; if (d.horiz) { const y = snap(wp[1]); Q[i][1] = y; Q[i + 1][1] = y; } else { const x = snap(wp[0]); Q[i][0] = x; Q[i + 1][0] = x; }
    w.mid = Q.slice(1, -1).map(p => p.slice()); this.redrawWires();
  }
  tidyWire(w) {
    const c = this.c; const pts = [c.endPos(w.a)].concat((w.mid || []).map(p => p.slice()), [c.endPos(w.b)]); const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) { const p = out[out.length - 1], q = pts[i], n = pts[i + 1]; if (p[0] === q[0] && p[1] === q[1]) continue; if ((p[0] === q[0] && q[0] === n[0]) || (p[1] === q[1] && q[1] === n[1])) continue; out.push(q); }
    w.mid = out.slice(1);
  }
  redrawWires() { clear(this.gWires); this.wireEls.clear(); for (const w of this.c.wires) { const e = this.wireEl(w); this.wireEls.set(w.id, e); this.gWires.appendChild(e); } this.renderJunctions(); }
  up(e) {
    this.svg.classList.remove('panning'); const d = this.drag; this.drag = null;
    if (this.pressed) { this.pressed.rt.pressed = false; this.app.poke(); this.pressed = null; }
    if (d && d.kind === 'part' && d.moved) this.app.changed('geometry');
    else if (d && d.kind === 'part' && d.toggle) { d.p.p.on = !d.p.p.on; this.app.changed('param'); this.app.refreshInspector(); }
    if (d && d.kind === 'junc' && d.j) this.app.changed('geometry');
    if (d && d.kind === 'seg' && d.moved) { this.tidyWire(d.w); this.redrawWires(); this.app.changed('geometry'); }
    const wr = this.wiring;
    if (wr && wr.mode === 'drag') {
      const wp = this.toWorld(e); const el = document.elementFromPoint(e.clientX, e.clientY); const end = this.endpointAt(el, wp);
      if (wr.moved && end && !(this.sameEnd(wr.from, end) && !wr.mid.length)) this.finishWiring(end);
      else if (wr.moved) { this.cancelWiring(); } else wr.mode = 'click';
    }
  }
  dbl(e) {
    const tg = (e.target.closest && e.target.closest('.part')) ? e.target : (document.elementFromPoint(e.clientX, e.clientY) || e.target);
    { const wh = tg.closest && tg.closest('[data-wid]'); if (wh && !this.wiring) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); if (w && (w.mid || []).length) { this.pushUndo(); w.mid = []; this.redrawWires(); this.app.changed('geometry'); } return; } }
    if (this.wiring) { const wp = this.toWorld(e); const j = this.c.junction(snap(wp[0]), snap(wp[1])); this.finishWiring({ j: j.id }); }
  }
}
NS.Editor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);
