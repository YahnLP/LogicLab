/* scenarios.js — cadre des TP : outils de construction, contexte de vérification, correction des réponses */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const SC = NS.SCENARIOS = [];
NS.regScenario = function (sc) { SC.push(sc); return sc; };

/* ---------- construction d'un circuit de départ ---------- */
NS.mk = function (c) {
  return {
    c,
    p(type, ref, x, y, params, rot) { const i = c.add(type, x, y, params, ref); i.rot = rot || 0; return i; },
    w(a, pa, b, pb, pts) { return c.link(a, pa, b, pb, pts || []); },
  };
};

/* ---------- contexte de vérification : travaille sur une COPIE du circuit ---------- */
NS.makeCtx = function (circuit) {
  const c = circuit, sim = new NS.Sim(c);
  const refresh = () => { sim.invalidate(); sim.refresh(); };
  const ctx = {
    c, sim, tp: null,
    part: r => c.byRef(r), has: r => !!c.byRef(r),
    /* fixe un interrupteur puis lit un niveau */
    set(ref, v) { const p = c.byRef(ref); if (p) p.p.on = !!v; },
    val(ref, pin) { refresh(); return sim.refVal(ref, pin); },
    table: () => NS.circuitTable(c),
    outFn: name => NS.outputFn(c, name),
    /* la sortie « name » est-elle équivalente à l'expression ? */
    eq: (name, expr) => NS.outputMatches(c, name, expr),
    expr: name => NS.exprOfOutput(c, name),
    gates: () => NS.gateCount(c),
    nGates: () => NS.gateCount(c).total,
    onlyGates: types => Object.keys(NS.gateCount(c).by).every(k => types.includes(k)),
    count: type => c.parts.filter(p => p.type === type).length,
    floating: () => new NS.Sim(c).floating().filter(f => f.part.type !== 'label'),
    /* la sortie « name » vaut exactement le tableau « vals » (ordre des lignes de la table) */
    tt(name) { const f = NS.outputFn(c, name); return f ? f.values : null; },
    /* mesure d'un signal pendant T secondes : fréquence et rapport cyclique */
    measure(ref, pin, T) {
      const p = c.byRef(ref); if (!p) return null; const s2 = new NS.Sim(c); s2.forced = null; s2.advance(T, 1e6); const key = p.id + ':' + Math.max(0, pin ? c.pinIndex(p, pin) : NS.pinsOf(p).findIndex(q => q.dir === 'out'));
      const sg = s2.sigByKey.get(key); if (!sg) return null; const tr = sg.tr, ups = []; let hi = 0, tot = 0;
      for (let i = 0; i < tr.length; i += 2) { if (tr[i + 1] === 1 && (i === 0 || tr[i - 1] !== 1)) ups.push(tr[i]); const t2 = i + 2 < tr.length ? tr[i + 2] : T; if (tr[i + 1] === 1) hi += t2 - tr[i]; if (tr[i] > 0 || i > 0) tot += t2 - tr[i]; }
      const f = ups.length >= 3 ? (ups.length - 1) / (ups[ups.length - 1] - ups[0]) : 0; return { f, duty: tot ? hi / tot : 0, edges: ups.length };
    }
  };
  return ctx;
};
/* exécute les critères d'un TP sur une copie du circuit (n'altère pas la simulation en cours) */
NS.evalChecks = function (sc, circuit, tp) {
  const c2 = NS.deserialize(NS.serialize(circuit)); circuit.parts.forEach(p => { const q = c2.part(p.id); if (q) q.rt = JSON.parse(JSON.stringify(p.rt || {})); });
  const ctx = NS.makeCtx(c2); ctx.tp = tp || { variant: 0 };
  return sc.checks.map(k => { let ok = false; try { ok = !!k.run(ctx); } catch (e) { ok = false; if (typeof console !== 'undefined') console.warn('check', k.label, e.message); } return { label: k.label, ok }; });
};


/* ---------- construction d'un schéma de portes à partir d'une expression (la structure suit l'équation) ---------- */
/* spec = { vars:[noms], outputs:[{name, ast}] } ; opt = { x, y, fuse (NON-ET, NON-OU, NON-OU-EX), desc:{A:'texte'} }. Renvoie { gates, byKey } */
NS.buildAst = function (c, spec, opt) {
  opt = opt || {}; const fuse = opt.fuse !== false, x0 = opt.x === undefined ? 60 : opt.x, y0 = opt.y === undefined ? 40 : opt.y, STEP = 230, w0 = c.wires.length;
  const src = {}; spec.vars.forEach((nm, i) => { src[nm] = c.byRef(nm) || c.add('switch', x0, y0 + 20 + i * 70, { desc: (opt.desc && opt.desc[nm]) || '' }, nm); });
  const memo = new Map(), cols = {}, gates = []; let maxLvl = 0;
  const fold = (n) => { if (n.t === 'xor' && n.a.length > 2) { let acc = n.a[0]; for (let i = 1; i < n.a.length; i++) acc = { t: 'xor', a: [acc, n.a[i]] }; return acc; } return n; };
  const free = (lvl, y, h) => { const L = cols[lvl] = cols[lvl] || []; let yy = y; while (L.some(o => Math.abs(o.y - yy) < (o.h + h) / 2 + 20)) yy += 20; L.push({ y: yy, h }); return yy; };
  function build(n) {
    n = fold(NS.norm(n)); const key = NS.toText(n); if (memo.has(key)) return memo.get(key);
    let r;
    if (n.t === 'var') r = { part: src[n.n], lvl: 0 };
    else if (n.t === 'const') { const k = c.add(n.v ? 'const1' : 'const0', x0 + 40, y0 + 20 + spec.vars.length * 70 + 20, {}); r = { part: k, lvl: 0 }; }
    else {
      let type, kids;
      if (n.t === 'not' && fuse && ['and', 'or', 'xor'].includes(n.a.t)) { const m = fold(n.a); type = { and: 'nand', or: 'nor', xor: 'xnor' }[m.t]; kids = m.a; }
      else if (n.t === 'not') { type = 'not'; kids = [n.a]; } else { type = n.t; kids = n.a; }
      const ins = kids.map(build), lvl = 1 + Math.max(...ins.map(i => i.lvl)); maxLvl = Math.max(maxLvl, lvl);
      const y = Math.round(ins.reduce((s, i) => s + (i.part.y + (i.dy || 0)), 0) / ins.length / 10) * 10, h = Math.max(kids.length, 2) * 20, yy = free(lvl, y, h);
      const g1 = c.add(type, x0 + 60 + lvl * STEP, yy, { n: Math.max(2, kids.length) }); gates.push(g1);
      ins.forEach((i, k) => { c.link(i.part, 'S', g1, kids.length === 1 ? 'E' : 'E' + (k + 1)); }); r = { part: g1, lvl };
    }
    memo.set(key, r); return r;
  }
  spec.outputs.forEach((o, k) => {
    const r = build(o.ast); let led = c.byRef(o.name);
    if (!led) led = c.add(o.kind || 'led', x0 + 140 + (maxLvl + 1) * STEP, r.part.y, o.params || {}, o.name);
    c.link(r.part, 'S', led, 'E');
  });
  NS.autoRoute(c, w0);
  return { gates, src };
};
/* entrées (interrupteurs) à gauche et sorties (LED) à droite, sans portes */
NS.layoutIO = function (c, vars, outs, o) {
  o = o || {}; const x0 = o.x === undefined ? 60 : o.x, xo = o.xo === undefined ? 620 : o.xo, y0 = o.y === undefined ? 60 : o.y;
  vars.forEach((nm, i) => { const d = o.desc && o.desc[nm]; if (!c.byRef(nm)) c.add('switch', x0, y0 + i * 80, { desc: d || '' }, nm); });
  outs.forEach((nm, k) => { if (!c.byRef(nm)) { const od = o.odesc && o.odesc[nm]; c.add(o.kind || 'led', xo, y0 + k * (o.dy || 80), Object.assign({ desc: od || '' }, o.params || {}), nm); } });
};
/* nombre de portes de la réalisation à deux niveaux (ET/OU/NON) de la fonction : référence pour « pas plus de portes » */
NS.minGates = function (vars, outputs) {
  let best = 1e9; ['andor', 'orand'].forEach(st => { const c = new NS.Circuit(); NS.synthesize(c, { vars, outputs }, { style: st, replace: true }); best = Math.min(best, NS.gateCount(c).total); }); return best;
};
/* avec une table (0/1/2) : la sortie du circuit la respecte-t-elle (lignes à 2 = indifférentes) ? */
NS.matchesValues = function (c, outName, vars, values) {
  const t = NS.circuitTable(c); if (t.tooMany || t.empty) return false; const k = t.outs.findIndex(o => o.name === outName); if (k < 0) return false;
  const names = t.vars.map(v => v.name); if (names.join() !== vars.join()) return false;
  return t.rows.every((r, i) => values[i] === 2 || r.outs[k] === values[i]);
};
/* évalue la sortie d'un composant pour des entrées imposées (sans modifier l'état des interrupteurs) */
NS.evalAt = function (c, assign, ref, pin) {
  const s = new NS.Sim(c); s.rebuild(); const f = {}; NS.sourceVars(c).forEach(v => { if (assign[v.name] !== undefined) f[v.part.id + ':' + v.pin] = assign[v.name] ? 1 : 0; }); s.forced = f; s.settle(); return s.refVal(ref, pin);
};

/* ---------- correction d'une réponse (utilisée par l'appli et par les tests) ---------- */
NS.optimalLits = function (ast) { const vars = NS.vars(ast), v = NS.tt(ast, vars), m = NS.minimize(vars, v); return Math.min(NS.cost(m.sop).literals, NS.cost(m.pos).literals); };
NS.checkAnswer = function (q, a, ctx) {
  if (a === undefined || a === null || a === '') return { ok: false, msg: 'Pas de réponse' };
  try {
    if (q.type === 'choice') { const ok = a === (typeof q.correct === 'function' ? q.correct(ctx) : q.correct); return { ok }; }
    if (q.type === 'part') { const ok = [].concat(typeof q.correct === 'function' ? q.correct(ctx) : q.correct).map(String).includes(String(a)); return { ok }; }
    if (q.type === 'text') return { ok: true };
    if (q.type === 'table') { const exp = typeof q.answer === 'function' ? q.answer(ctx) : q.answer; const ok = Array.isArray(a) && a.length === exp.length && exp.every((v, i) => String(a[i]) === String(v)); return { ok, msg: ok ? '' : 'Une ou plusieurs lignes sont fausses ou vides.' }; }
    if (q.type === 'expr') {
      const r = NS.tryParse(String(a)); if (r.err) return { ok: false, msg: 'Expression illisible : ' + r.err };
      const tgt = q.values ? '0' : typeof q.target === 'function' ? q.target(ctx) : q.target, T = typeof tgt === 'string' ? NS.parse(tgt) : tgt;
      if (q.vars && NS.vars(r.ast).some(v => !q.vars.includes(v))) return { ok: false, msg: 'Variable inconnue (utilisez ' + q.vars.join(', ') + ').' };
      if (q.values) { const vals = typeof q.values === 'function' ? q.values(ctx) : q.values, vs = q.vars, ok = vals.every((v, i) => v === 2 || NS.evalAst(r.ast, NS.envOf(vs, i)) === v); if (!ok) return { ok: false, msg: 'Cette expression ne respecte pas la table (les lignes X sont libres).' };
        if (q.minimal) { const m = NS.minimize(vs, vals), best = Math.min(NS.cost(m.sop).literals, NS.cost(m.pos).literals), lits = NS.cost(NS.norm(r.ast)).literals; if (lits > best) return { ok: false, msg: 'Correcte, mais pas assez simplifiée (' + lits + ' variables écrites, ' + best + ' suffisent en utilisant les X).' }; } return { ok: true }; }
      if (!NS.equiv(r.ast, T)) return { ok: false, msg: 'Cette expression ne donne pas la même table de vérité.' };
      if (q.minimal) { const lits = NS.cost(NS.norm(r.ast)).literals, best = NS.optimalLits(T); if (lits > best) return { ok: false, msg: 'Équivalente, mais pas assez simplifiée (' + lits + ' variables écrites, ' + best + ' suffisent).' }; }
      return { ok: true };
    }
    const v = NS.parseVal(String(a)), exp = typeof q.answer === 'function' ? q.answer(ctx) : q.answer, tol = q.tol === undefined ? 0.05 : q.tol;
    return { ok: !isNaN(v) && Math.abs(v - exp) <= Math.max(Math.abs(exp) * tol, q.abs || 0) };
  } catch (e) { return { ok: false, msg: 'Erreur : ' + e.message }; }
};
})(typeof window !== 'undefined' ? window : globalThis);
