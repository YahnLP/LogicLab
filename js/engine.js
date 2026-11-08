/* engine.js — simulation logique à 3 états (0, 1, ? = indéterminé), horloges, bascules D, historique pour le chronogramme.
   Niveaux : 0 = niveau bas, 1 = niveau haut, 2 = indéterminé (entrée non reliée, conflit de sorties, boucle instable). */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { PARTS } = NS;
const X = 2;

/* ---- fonctions de portes à 3 états ---- */
NS.gate3 = function (fn, a) {
  const has0 = a.includes(0), has1 = a.includes(1), hasX = a.includes(X);
  switch (fn) {
    case 'BUF': return a[0];
    case 'NOT': return a[0] === X ? X : 1 - a[0];
    case 'AND': return has0 ? 0 : hasX ? X : 1;
    case 'NAND': return has0 ? 1 : hasX ? X : 0;
    case 'OR': return has1 ? 1 : hasX ? X : 0;
    case 'NOR': return has1 ? 0 : hasX ? X : 1;
    case 'XOR': return hasX ? X : a[0] ^ a[1];
    case 'XNOR': return hasX ? X : 1 - (a[0] ^ a[1]);
  }
  return X;
};
const SOURCES = ['switch', 'button', 'const1', 'const0', 'clock', 'seq', 'cnt'];
const SINKS = ['led', 'probe', 'seg7', 'actuator'];
NS.SOURCES = SOURCES; NS.SINKS = SINKS;

class Sim {
  constructor(circuit) {
    this.c = circuit || new NS.Circuit(); this.t = 0; this.dirty = true; this.warn = null; this.events = []; this.onEvent = null; this.forced = null;
    this.sigs = []; this.sigByKey = new Map(); this.hist = new Map(); this.fmax = 0; this.nv = []; this.out = new Map(); this.steps = 0;
  }
  invalidate() { this.dirty = true; }
  emit(e) { this.events.push(Object.assign({ t: this.t }, e)); if (this.onEvent) this.onEvent(e); }
  /* ---------- compilation : réseaux de fils, pilotes, signaux enregistrés ---------- */
  rebuild() {
    const c = this.c, nets = c.nets(), idOf = new Map(); let n = 0;
    const netOf = k => { const r = nets.find(k); if (!idOf.has(r)) idOf.set(r, n++); return idOf.get(r); };
    this.parts = c.parts.filter(p => p.type !== 'label'); this.pinNet = new Map(); this.drivers = []; this.fmax = 0; this.seen = this.seen || new Set();
    const dr = [];
    for (const p of this.parts) {
      const pins = NS.pinsOf(p), nn = pins.map((_, i) => netOf('c' + p.id + ':' + i)); this.pinNet.set(p.id, nn);
      pins.forEach((pin, i) => { if (pin.dir === 'out') (dr[nn[i]] = dr[nn[i]] || []).push([p, i]); });
      if (p.type === 'clock') this.fmax = Math.max(this.fmax, +p.p.f || 0); if (p.type === 'seq') this.fmax = Math.max(this.fmax, +p.p.rate || 0); if (p.type === 'cnt') this.fmax = Math.max(this.fmax, +p.p.f || 0);
      if (!this.out.has(p.id)) this.out.set(p.id, []);
    }
    for (const w of c.wires) netOf(nets.key(w.a)); this.nNets = n; this.drivers = dr; this.nv = new Array(n).fill(X);
    this.wireNet = new Map(); for (const w of c.wires) this.wireNet.set(w.id, netOf(nets.key(w.a)));
    this.junctionNet = new Map(); for (const j of c.junctions) this.junctionNet.set(j.id, netOf('j' + j.id));
    /* signaux à enregistrer : sorties de tous les composants + entrées des composants de sortie */
    const old = new Map(this.sigs.map(s => [s.key, s])); this.sigs = []; this.sigByKey = new Map();
    for (const p of this.parts) {
      const pins = NS.pinsOf(p), nn = this.pinNet.get(p.id), outs = pins.filter(q => q.dir === 'out').length;
      pins.forEach((pin, i) => {
        const isOut = pin.dir === 'out', sink = SINKS.includes(p.type);
        if (!isOut && !sink) return; const key = p.id + ':' + i;
        const name = p.type === 'seg7' ? 'S' + pin.n : (outs > 1 || p.type === 'cnt') && isOut ? (p.type === 'cnt' ? pin.n : p.ref + '.' + pin.n) : p.ref;
        const prev = old.get(key); const s = { key, part: p, pin: i, net: nn[i], name, kind: p.type, tr: prev ? prev.tr : [], last: prev ? prev.last : null };
        this.sigs.push(s); this.sigByKey.set(key, s);
      });
    }
    this.dirty = false; this.conflicts = new Set(); this.settle(true);
  }
  /* ---------- valeur d'une source à l'instant t ---------- */
  srcVal(p, pinIdx) {
    if (this.forced) { const f = this.forced[p.id + ':' + pinIdx]; if (f !== undefined) return f; }
    const t = this.t, q = p.p;
    switch (p.type) {
      case 'const1': return 1; case 'const0': return 0;
      case 'switch': return q.on ? 1 : 0;
      case 'button': return (p.rt.pressed ? 1 : 0) ^ (q.nc ? 1 : 0);
      case 'clock': { const x = ((t * (+q.f || 1) + (+q.phase || 0) / 100) % 1 + 1) % 1; return x < (+q.duty || 50) / 100 ? 1 : 0; }
      case 'seq': { const s = String(q.pattern || '0').replace(/[^01]/g, '') || '0'; return s[Math.floor(t * (+q.rate || 1) + 1e-9) % s.length] === '1' ? 1 : 0; }
      case 'cnt': { const bits = +q.bits || 3, k = Math.floor(t * (+q.f || 1) + 1e-9) % (1 << bits); return (k >> (bits - 1 - pinIdx)) & 1; }
    }
    return X;
  }
  inVals(p) { const nn = this.pinNet.get(p.id), pins = NS.pinsOf(p), a = []; pins.forEach((pin, i) => { if (pin.dir === 'in') a.push(this.nv[nn[i]]); }); return a; }
  /* sorties d'un composant (tableau indexé par broche) */
  evalPart(p) {
    const pins = NS.pinsOf(p), res = [];
    if (SOURCES.includes(p.type)) { pins.forEach((pin, i) => { res[i] = this.srcVal(p, i); }); return res; }
    if (p.type === 'dff') {
      const nn = this.pinNet.get(p.id); if (p.rt.q === undefined) p.rt.q = 0;
      const ri = pins.findIndex(q => q.n === 'R'); if (ri >= 0 && this.nv[nn[ri]] === 1) p.rt.q = 0;
      pins.forEach((pin, i) => { res[i] = pin.n === 'Q' ? p.rt.q : pin.n === 'NQ' ? (p.rt.q === X ? X : 1 - p.rt.q) : undefined; }); return res;
    }
    const G = NS.GATE_OF[p.type];
    if (G) { const o = NS.gate3(G, this.inVals(p)); pins.forEach((pin, i) => { if (pin.dir === 'out') res[i] = o; }); return res; }
    if (p.type === 'blackbox') { const o = NS.blackboxOut(p.p, this.inVals(p)); pins.forEach((pin, i) => { if (pin.dir === 'out') res[i] = o; }); return res; }
    return res;
  }
  netValue(k) {
    const d = this.drivers[k]; if (!d || !d.length) return X;
    let v = this.out.get(d[0][0].id)[d[0][1]]; if (v === undefined) v = X;
    for (let i = 1; i < d.length; i++) { let w = this.out.get(d[i][0].id)[d[i][1]]; if (w === undefined) w = X; if (w !== v) { if (v !== X && w !== X) { this.conflicts.add(k); } v = X; } }
    return v;
  }
  /* propagation jusqu'à stabilité (Gauss-Seidel) */
  settle(first) {
    let stable = false;
    for (let pass = 0; pass < 80 && !stable; pass++) {
      stable = true;
      for (const p of this.parts) {
        const r = this.evalPart(p), old = this.out.get(p.id), nn = this.pinNet.get(p.id);
        for (let i = 0; i < r.length; i++) if (r[i] !== undefined && old[i] !== r[i]) { old[i] = r[i]; const k = nn[i], v = this.netValue(k); if (this.nv[k] !== v) { this.nv[k] = v; stable = false; } }
      }
    }
    /* réseaux sans pilote ou recalculés : mise à jour finale */
    for (let k = 0; k < this.nNets; k++) this.nv[k] = this.netValue(k);
    if (!stable) { if (this.warn !== 'Boucle instable') { this.warn = 'Boucle instable'; this.emit({ type: 'warn', msg: 'Le circuit ne se stabilise pas (boucle de portes qui oscille).' }); } }
    else if (this.warn === 'Boucle instable') this.warn = null;
    if (this.conflicts.size) { if (!this.conflictWarned) { this.conflictWarned = true; this.emit({ type: 'warn', msg: 'Deux sorties sont reliées ensemble et ne donnent pas le même niveau : court-circuit logique (niveau indéterminé).' }); } } else this.conflictWarned = false;
  }
  /* fronts montants d'horloge → bascules D */
  edges() {
    for (let guard = 0; guard < 12; guard++) {
      const fire = [];
      for (const p of this.parts) if (p.type === 'dff') {
        const pins = NS.pinsOf(p), nn = this.pinNet.get(p.id), ck = this.nv[nn[pins.findIndex(q => q.n === 'CLK')]];
        const last = p.rt.clk; if (last === 0 && ck === 1) fire.push(p); if (ck !== X || last === undefined) p.rt.clk = ck;
      }
      if (!fire.length) return;
      const ds = fire.map(p => { const pins = NS.pinsOf(p), nn = this.pinNet.get(p.id); return this.nv[nn[pins.findIndex(q => q.n === 'D')]]; });
      fire.forEach((p, i) => { const pins = NS.pinsOf(p), nn = this.pinNet.get(p.id), ri = pins.findIndex(q => q.n === 'R'); if (!(ri >= 0 && this.nv[nn[ri]] === 1)) p.rt.q = ds[i]; });
      this.settle();
    }
  }
  record() {
    for (const s of this.sigs) { const v = this.nv[s.net]; if (v !== s.last) { s.tr.push(this.t, v); s.last = v; if (s.tr.length > 12000) s.tr.splice(0, 2000); } }
  }
  step() { this.settle(); this.edges(); this.record(); }
  /* avance de T secondes simulées (au plus maxSub pas de calcul) ; renvoie la durée réellement simulée */
  advance(T, maxSub) {
    if (this.dirty) this.rebuild(); maxSub = maxSub || 400;
    const dtMax = this.fmax > 0 ? Math.min(0.02, 1 / (this.fmax * 40)) : 0.02;
    const n = Math.min(maxSub, Math.max(1, Math.ceil(T / dtMax))), dt = Math.min(T / n, dtMax);
    for (let i = 0; i < n; i++) { this.t += dt; this.step(); }
    return n * dt;
  }
  /* un seul calcul, sans faire avancer le temps (état courant des interrupteurs) */
  refresh() { if (this.dirty) this.rebuild(); this.settle(); this.edges(); this.record(); }
  reset() { this.t = 0; for (const p of this.c.parts) p.rt = {}; this.out = new Map(); this.sigs.forEach(s => { s.tr = []; s.last = null; }); this.dirty = true; this.events = []; this.warn = null; }
  /* ---------- accès ---------- */
  pinVal(part, i) { if (this.dirty) this.rebuild(); const nn = this.pinNet.get(part.id); return nn ? this.nv[nn[i]] : X; }
  refVal(ref, pin) { const p = this.c.byRef(ref); if (!p) return X; const i = pin ? this.c.pinIndex(p, pin) : (NS.pinsOf(p).findIndex(q => q.dir === 'out') >= 0 ? NS.pinsOf(p).findIndex(q => q.dir === 'out') : 0); return this.pinVal(p, i); }
  wireVal(w) { return this.wireNet.has(w.id) ? this.nv[this.wireNet.get(w.id)] : X; }
  junctionVal(j) { return this.junctionNet.has(j.id) ? this.nv[this.junctionNet.get(j.id)] : X; }
  /* entrées de composants sans aucun pilote sur leur réseau */
  floating() {
    if (this.dirty) this.rebuild(); const r = [];
    for (const p of this.parts) NS.pinsOf(p).forEach((pin, i) => { if (pin.dir === 'in' && !(this.drivers[this.pinNet.get(p.id)[i]] || []).length) r.push({ part: p, pin: pin.n, i }); });
    return r;
  }
}
NS.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
