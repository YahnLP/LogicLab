/* analysis.js — lecture « logique » d'un schéma : variables d'entrée, sorties, table de vérité, équation lue sur le schéma, comptage des portes */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { PARTS } = NS; const E = NS.E;

/* entrées libres du schéma (interrupteurs, boutons, générateurs) : une variable par broche de sortie */
NS.sourceVars = function (c) {
  const r = [];
  for (const p of c.parts) {
    if (!['switch', 'button', 'clock', 'seq', 'cnt'].includes(p.type)) continue;
    NS.pinsOf(p).forEach((pin, i) => { if (pin.dir === 'out') r.push({ name: p.type === 'cnt' ? pin.n : p.ref, part: p, pin: i, type: p.type }); });
  }
  const order = NS.sortVars(r.map(v => v.name)); return r.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
};
NS.sinkOuts = function (c) {
  const r = [];
  for (const p of c.parts) {
    if (['led', 'probe', 'actuator'].includes(p.type)) r.push({ name: p.ref, part: p, pin: 0 });
    else if (p.type === 'seg7') NS.pinsOf(p).forEach((pin, i) => r.push({ name: 'S' + pin.n, part: p, pin: i }));
  }
  return r;
};
NS.gateParts = c => c.parts.filter(p => NS.GATE_OF[p.type] || p.type === 'blackbox');
NS.gateCount = function (c) { const m = {}; let n = 0; c.parts.forEach(p => { if (NS.GATE_OF[p.type]) { m[p.type] = (m[p.type] || 0) + 1; n++; } }); return { total: n, by: m }; };
NS.isSequential = c => c.parts.some(p => p.type === 'dff');
NS.MAXVARS = 6;

/* table de vérité du circuit : toutes les entrées sont forcées tour à tour (l'état des interrupteurs n'est pas modifié) */
NS.circuitTable = function (c, opt) {
  opt = opt || {}; const vars = NS.sourceVars(c), outs = NS.sinkOuts(c);
  const mids = NS.gateParts(c).map(p => ({ name: p.ref, part: p, pin: NS.pinsOf(p).findIndex(q => q.dir === 'out') }));
  const res = { vars, outs, mids, rows: [], sequential: NS.isSequential(c), tooMany: vars.length > NS.MAXVARS, empty: !vars.length || !outs.length };
  if (res.tooMany || res.empty) return res;
  const sim = new NS.Sim(c), n = vars.length; sim.rebuild();
  for (let i = 0; i < (1 << n); i++) {
    const bits = NS.bits(i, n), f = {}; vars.forEach((v, k) => { f[v.part.id + ':' + v.pin] = bits[k]; }); sim.forced = f; sim.settle();
    res.rows.push({ idx: i, ins: bits, outs: outs.map(o => sim.pinVal(o.part, o.pin)), mids: mids.map(m => sim.pinVal(m.part, m.pin)) });
  }
  res.conflict = sim.conflicts.size > 0; return res;
};
/* fonction d'une sortie : { vars:[noms], values:[0/1/2…] } */
NS.outputFn = function (c, outName) {
  const t = NS.circuitTable(c); if (t.tooMany || t.empty) return null; const k = t.outs.findIndex(o => o.name === outName); if (k < 0) return null;
  return { vars: t.vars.map(v => v.name), values: t.rows.map(r => r.outs[k]) };
};

/* équation lue sur le schéma (nulle si le schéma est incomplet, contient une boîte noire, une bascule ou une boucle) */
NS.exprOfPin = function (c, part, pinIdx) {
  const nets = c.nets(), drv = new Map();
  for (const p of c.parts) NS.pinsOf(p).forEach((pin, i) => { if (pin.dir === 'out') { const r = nets.find('c' + p.id + ':' + i); (drv.get(r) || drv.set(r, []).get(r)).push([p, i]); } });
  const stack = new Set();
  function outExpr(p, i) {
    const pin = NS.pinsOf(p)[i];
    switch (p.type) {
      case 'switch': case 'button': case 'clock': case 'seq': return E.V(p.ref);
      case 'cnt': return E.V(pin.n);
      case 'const1': return E.C(1); case 'const0': return E.C(0);
    }
    const G = NS.GATE_OF[p.type]; if (!G) return null; if (stack.has(p.id)) return null; stack.add(p.id);
    const pins = NS.pinsOf(p), args = []; let bad = false;
    pins.forEach((q, k) => { if (q.dir === 'in') { const a = inExpr(p, k); if (!a) bad = true; args.push(a); } });
    stack.delete(p.id); if (bad) return null;
    switch (G) {
      case 'BUF': return args[0]; case 'NOT': return E.N(args[0]);
      case 'AND': return { t: 'and', a: args }; case 'OR': return { t: 'or', a: args };
      case 'NAND': return E.N({ t: 'and', a: args }); case 'NOR': return E.N({ t: 'or', a: args });
      case 'XOR': return { t: 'xor', a: args }; case 'XNOR': return E.N({ t: 'xor', a: args });
    }
    return null;
  }
  function inExpr(p, i) { const d = drv.get(nets.find('c' + p.id + ':' + i)); if (!d || d.length !== 1) return null; return outExpr(d[0][0], d[0][1]); }
  const e = inExpr(part, pinIdx); return e ? NS.norm(e) : null;
};
NS.exprOfOutput = function (c, name) { const o = NS.sinkOuts(c).find(x => x.name === name); return o ? NS.exprOfPin(c, o.part, o.pin) : null; };

/* ce que contient le schéma est-il équivalent à une expression ? (pour la correction automatique) */
NS.outputMatches = function (c, outName, target) {
  const t = typeof target === 'string' ? NS.parse(target) : target; const vars = NS.vars(t);
  const tb = NS.circuitTable(c); if (tb.tooMany || tb.empty) return false; const k = tb.outs.findIndex(o => o.name === outName); if (k < 0) return false;
  const names = tb.vars.map(v => v.name); if (vars.some(v => !names.includes(v))) return false;
  return tb.rows.every(r => { const env = {}; names.forEach((nm, i) => { env[nm] = r.ins[i]; }); return r.outs[k] === NS.evalAst(t, env); });
};
})(typeof window !== 'undefined' ? window : globalThis);
