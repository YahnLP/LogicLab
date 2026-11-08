/* circuit.js — modèle du schéma (composants, fils, jonctions), sérialisation. Même principe qu'ElectroLab. */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { PARTS } = NS;

function rotPt(x, y, rot) { switch (((rot % 360) + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; } }
NS.rotPt = rotPt;
const IN_NAMES = 'ABCDEFG';

class Circuit {
  constructor() { this.parts = []; this.wires = []; this.junctions = []; this.seq = 1; }
  uid(p) { return p + (this.seq++); }
  part(id) { return this.parts.find(p => p.id === id); }
  byRef(ref) { return this.parts.find(p => p.ref === ref); }
  pins(inst) { return NS.pinsOf(inst); }
  pinPos(inst, i) { const pin = NS.pinsOf(inst)[i]; const [x, y] = rotPt(pin.x, pin.y, inst.rot); return [inst.x + x, inst.y + y]; }
  pinIndex(inst, name) { return NS.pinsOf(inst).findIndex(p => p.n === name); }
  endPos(e) { if (e.j) { const j = this.junctions.find(k => k.id === e.j); return j ? [j.x, j.y] : [0, 0]; } const c = this.part(e.c); return c ? this.pinPos(c, e.p) : [0, 0]; }
  usedRef(r) { return this.parts.some(p => p.ref === r); }
  /* nom automatique : A, B, C… pour les entrées ; S1, S2… pour les sorties ; G1, G2… pour les portes */
  autoRef(type) {
    const d = PARTS[type]; if (d.noLabel) return '';
    if (d.pool === 'in') { for (const ch of IN_NAMES) if (!this.usedRef(ch)) return ch; for (let k = 1; ; k++) if (!this.usedRef('A' + k)) return 'A' + k; }
    for (let k = 1; ; k++) { const r = d.ref + k; if (!this.usedRef(r)) return r; }
  }
  add(type, x, y, params, ref) {
    const inst = NS.newInst(type, x, y, this.uid('c')); Object.assign(inst.p, params || {});
    inst.ref = ref !== undefined ? ref : this.autoRef(type); this.parts.push(inst); return inst;
  }
  junction(x, y) { const j = { id: this.uid('j'), x, y }; this.junctions.push(j); return j; }
  /* fil entre deux extrémités : {c:id,p:pinIdx} ou {j:id} ; mid = points intermédiaires */
  wire(a, b, mid, color) { const w = { id: this.uid('w'), a, b, mid: mid || [], color: color || null }; this.wires.push(w); return w; }
  link(ra, pa, rb, pb, mid, color) {
    const A = typeof ra === 'string' ? this.byRef(ra) : ra, B = typeof rb === 'string' ? this.byRef(rb) : rb;
    if (!A || !B) throw new Error('composant inconnu ' + (typeof ra === 'string' ? ra : '') + ' / ' + (typeof rb === 'string' ? rb : ''));
    const ia = this.pinIndex(A, pa), ib = this.pinIndex(B, pb); if (ia < 0 || ib < 0) throw new Error('broche inconnue ' + A.ref + ':' + pa + ' / ' + B.ref + ':' + pb);
    return this.wire({ c: A.id, p: ia }, { c: B.id, p: ib }, mid, color);
  }
  remove(inst) { this.parts = this.parts.filter(p => p !== inst); this.wires = this.wires.filter(w => !(w.a.c === inst.id || w.b.c === inst.id)); }
  /* regroupe les extrémités reliées par des fils (union-find) */
  nets() {
    const par = new Map(); const key = e => e.j ? 'j' + e.j : 'c' + e.c + ':' + e.p;
    const find = k => { let r = k; while (par.get(r) !== r) r = par.get(r); let c = k; while (par.get(c) !== r) { const n = par.get(c); par.set(c, r); c = n; } return r; };
    const add = k => { if (!par.has(k)) par.set(k, k); };
    for (const p of this.parts) NS.pinsOf(p).forEach((_, i) => add('c' + p.id + ':' + i));
    for (const j of this.junctions) add('j' + j.id);
    for (const w of this.wires) { const a = key(w.a), b = key(w.b); add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); }
    return { find, key };
  }
}
NS.Circuit = Circuit;

NS.serialize = function (c) {
  return { v: 1, seq: c.seq, parts: c.parts.map(p => ({ id: p.id, type: p.type, x: p.x, y: p.y, rot: p.rot, p: p.p, fault: p.fault, ref: p.ref })), wires: c.wires, junctions: c.junctions };
};
NS.deserialize = function (o) {
  const c = new Circuit(); c.seq = o.seq || 1;
  for (const q of o.parts || []) { if (!PARTS[q.type]) continue; const inst = NS.newInst(q.type, q.x, q.y, q.id); Object.assign(inst, { rot: q.rot || 0, fault: q.fault || null, ref: q.ref }); inst.p = Object.assign({}, inst.p, JSON.parse(JSON.stringify(q.p || {}))); c.parts.push(inst); }
  c.wires = (o.wires || []).map(w => ({ id: w.id, a: w.a, b: w.b, mid: w.mid || [], color: w.color || null }));
  c.junctions = (o.junctions || []).map(j => Object.assign({}, j));
  return c;
};
})(typeof window !== 'undefined' ? window : globalThis);
