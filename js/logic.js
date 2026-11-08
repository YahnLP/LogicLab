/* logic.js — cœur « mathématique » : portes, expressions booléennes, tables de vérité,
   formes canoniques, Quine-McCluskey, tableaux de Karnaugh. Aucune dépendance au DOM.
   © Yahn LE PRETTRE, Enseignant à la MFR de Pontonx — Licence CC BY-NC-SA 4.0 */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};

/* ================= PORTES ================= */
/* sym = symbole CEI 60617-12 écrit dans le rectangle ; neg = petit cercle de négation en sortie */
NS.GATES = {
  NOT:  { name: 'NON',        sym: '1',  neg: true,  min: 1, max: 1, f: a => a[0] ? 0 : 1, rule: 'La sortie est l\'<b>inverse</b> de l\'entrée.', op: 'NON' },
  BUF:  { name: 'OUI',        sym: '1',  neg: false, min: 1, max: 1, f: a => a[0] ? 1 : 0, rule: 'La sortie <b>recopie</b> l\'entrée (porte « tampon »).', op: 'OUI' },
  AND:  { name: 'ET',         sym: '&',  neg: false, min: 2, max: 8, f: a => a.every(x => x) ? 1 : 0, rule: 'La sortie vaut 1 <b>seulement si toutes</b> les entrées valent 1.', op: 'ET' },
  OR:   { name: 'OU',         sym: '≥1', neg: false, min: 2, max: 8, f: a => a.some(x => x) ? 1 : 0, rule: 'La sortie vaut 1 <b>dès qu\'une</b> entrée au moins vaut 1.', op: 'OU' },
  NAND: { name: 'NON-ET',     sym: '&',  neg: true,  min: 2, max: 8, f: a => a.every(x => x) ? 0 : 1, rule: 'La sortie vaut 0 <b>seulement si toutes</b> les entrées valent 1 (c\'est un ET suivi d\'un NON).', op: 'NON-ET' },
  NOR:  { name: 'NON-OU',     sym: '≥1', neg: true,  min: 2, max: 8, f: a => a.some(x => x) ? 0 : 1, rule: 'La sortie vaut 1 <b>seulement si toutes</b> les entrées valent 0 (c\'est un OU suivi d\'un NON).', op: 'NON-OU' },
  XOR:  { name: 'OU exclusif', sym: '=1', neg: false, min: 2, max: 2, f: a => (a[0] ^ a[1]) ? 1 : 0, rule: 'La sortie vaut 1 quand les deux entrées sont <b>différentes</b>.', op: 'OU-EX' },
  XNOR: { name: 'NON-OU exclusif', sym: '=', neg: false, min: 2, max: 2, f: a => (a[0] ^ a[1]) ? 0 : 1, rule: 'La sortie vaut 1 quand les deux entrées sont <b>identiques</b> (équivalence).', op: 'NON-OU-EX' }
};
NS.GATE_ORDER = ['NOT', 'BUF', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];

/* ================= EXPRESSIONS (AST) ================= */
const V = n => ({ t: 'var', n }), C = v => ({ t: 'const', v: v ? 1 : 0 }), N = a => ({ t: 'not', a });
const A = (...a) => ({ t: 'and', a }), O = (...a) => ({ t: 'or', a }), X = (...a) => ({ t: 'xor', a });
NS.E = { V, C, N, A, O, X };

/* ---- analyse d'une expression saisie ---- */
function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z]/.test(c)) { let j = i + 1; while (j < s.length && /[0-9]/.test(s[j])) j++; out.push({ k: 'var', v: s.slice(i, j).toUpperCase() }); i = j; continue; }
    if (c === '0' || c === '1') { out.push({ k: 'const', v: +c }); i++; continue; }
    if ('+|∨'.includes(c)) { out.push({ k: 'or' }); i++; continue; }
    if ('·.*&∧×'.includes(c)) { out.push({ k: 'and' }); i++; continue; }
    if ('⊕^'.includes(c)) { out.push({ k: 'xor' }); i++; continue; }
    if ('!/~¬'.includes(c)) { out.push({ k: 'not' }); i++; continue; }
    if (c === "'" || c === '’' || c === '̅' || c === '‾') { out.push({ k: 'post' }); i++; continue; }
    if (c === '(') { out.push({ k: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ k: 'rp' }); i++; continue; }
    throw new Error('Caractère inattendu : « ' + c + ' »');
  }
  return out;
}
NS.parse = function (str) {
  const t = tokenize(String(str)), st = { i: 0 };
  if (!t.length) throw new Error('Expression vide');
  const peek = () => t[st.i], next = () => t[st.i++];
  const startsFactor = k => k && (k.k === 'var' || k.k === 'const' || k.k === 'lp' || k.k === 'not');
  function prim() {
    const k = next(); if (!k) throw new Error('Il manque quelque chose à la fin');
    if (k.k === 'var') return V(k.v);
    if (k.k === 'const') return C(k.v);
    if (k.k === 'lp') { const e = pOr(); const r = next(); if (!r || r.k !== 'rp') throw new Error('Parenthèse fermante manquante'); return e; }
    throw new Error('Opérateur mal placé');
  }
  function un() { const k = peek(); if (k && k.k === 'not') { next(); return N(un()); } let p = prim(); while (peek() && peek().k === 'post') { next(); p = N(p); } return p; }
  function pAnd() { const xs = [un()]; for (;;) { const k = peek(); if (k && k.k === 'and') { next(); xs.push(un()); } else if (startsFactor(k)) xs.push(un()); else break; } return xs.length === 1 ? xs[0] : { t: 'and', a: xs }; }
  function pXor() { const xs = [pAnd()]; while (peek() && peek().k === 'xor') { next(); xs.push(pAnd()); } return xs.length === 1 ? xs[0] : { t: 'xor', a: xs }; }
  function pOr() { const xs = [pXor()]; while (peek() && peek().k === 'or') { next(); xs.push(pXor()); } return xs.length === 1 ? xs[0] : { t: 'or', a: xs }; }
  const e = pOr(); if (st.i < t.length) throw new Error(t[st.i].k === 'rp' ? 'Parenthèse fermante en trop' : 'Expression incomplète ou mal écrite');
  return e;
};
NS.tryParse = function (str) { try { return { ast: NS.parse(str) }; } catch (e) { return { err: e.message }; } };

/* ---- variables, évaluation ---- */
const vkey = n => { const m = /^([A-Z])(\d*)$/.exec(n); return m ? m[1].charCodeAt(0) * 1000 + (m[2] ? +m[2] + 1 : 0) : 1e6; };
NS.sortVars = a => a.slice().sort((x, y) => vkey(x) - vkey(y) || (x < y ? -1 : 1));
NS.vars = function (ast) { const s = new Set(); (function w(n) { if (n.t === 'var') s.add(n.n); else if (n.a) (Array.isArray(n.a) ? n.a : [n.a]).forEach(w); })(ast); return NS.sortVars([...s]); };
NS.evalAst = function (n, env) {
  switch (n.t) {
    case 'var': return env[n.n] ? 1 : 0;
    case 'const': return n.v;
    case 'not': return NS.evalAst(n.a, env) ? 0 : 1;
    case 'and': return n.a.every(x => NS.evalAst(x, env)) ? 1 : 0;
    case 'or': return n.a.some(x => NS.evalAst(x, env)) ? 1 : 0;
    case 'xor': return n.a.reduce((s, x) => s ^ NS.evalAst(x, env), 0);
  }
  throw new Error('nœud inconnu');
};
/* n variables : numéro de ligne -> bits, le premier symbole est le poids fort (comme dans une table de vérité) */
NS.bits = (idx, n) => { const b = []; for (let i = 0; i < n; i++) b.push((idx >> (n - 1 - i)) & 1); return b; };
NS.envOf = (vars, idx) => { const e = {}, b = NS.bits(idx, vars.length); vars.forEach((v, i) => { e[v] = b[i]; }); return e; };
NS.tt = function (ast, vars) { vars = vars || NS.vars(ast); const out = []; for (let i = 0; i < (1 << vars.length); i++) out.push(NS.evalAst(ast, NS.envOf(vars, i))); return out; };
NS.equiv = function (a, b) {
  const vars = NS.sortVars([...new Set(NS.vars(a).concat(NS.vars(b)))]);
  for (let i = 0; i < (1 << vars.length); i++) { const e = NS.envOf(vars, i); if (NS.evalAst(a, e) !== NS.evalAst(b, e)) return false; }
  return true;
};
/* compte les opérateurs d'une expression : utile pour comparer deux écritures */
NS.cost = function (ast) { let g = 0, lit = 0; (function w(n) { if (n.t === 'var') lit++; else if (n.t === 'not') { w(n.a); if (n.a.t !== 'var') g++; } else if (n.a) { g += n.a.length > 1 ? 1 : 0; n.a.forEach(w); } })(ast); return { gates: g, literals: lit }; };

/* ---- normalisation légère (aplatit les ET/OU imbriqués, supprime les double négations) ---- */
NS.norm = function (n) {
  switch (n.t) {
    case 'not': { const a = NS.norm(n.a); return a.t === 'not' ? a.a : N(a); }
    case 'and': case 'or': case 'xor': {
      let xs = []; n.a.forEach(c => { const m = NS.norm(c); if (m.t === n.t && n.t !== 'xor') xs = xs.concat(m.a); else xs.push(m); });
      return xs.length === 1 ? xs[0] : { t: n.t, a: xs };
    }
    default: return n;
  }
};

/* ---- écriture : texte et HTML (barre de négation au-dessus) ---- */
const prec = n => n.t === 'or' ? 1 : n.t === 'xor' ? 2 : n.t === 'and' ? 3 : 5;
NS.toText = function toText(n, p) {
  p = p || 0; let s;
  switch (n.t) {
    case 'var': return n.n;
    case 'const': return String(n.v);
    case 'not': return n.a.t === 'var' || n.a.t === 'const' ? '!' + toText(n.a) : '!(' + toText(n.a) + ')';
    case 'and': s = n.a.map(c => toText(c, 3)).join('·'); break;
    case 'or': s = n.a.map(c => toText(c, 1)).join(' + '); break;
    case 'xor': s = n.a.map(c => toText(c, 2)).join(' ⊕ '); break;
  }
  return prec(n) < p ? '(' + s + ')' : s;
};
NS.toHTML = function toHTML(n, p) {
  p = p || 0; let s;
  switch (n.t) {
    case 'var': return n.n.replace(/(\d+)$/, '<sub>$1</sub>');
    case 'const': return String(n.v);
    case 'not': return '<span class="ov">' + toHTML(n.a, 0) + '</span>';
    case 'and': s = n.a.map(c => toHTML(c, 3)).join('·'); break;
    case 'or': s = n.a.map(c => toHTML(c, 1)).join(' + '); break;
    case 'xor': s = n.a.map(c => toHTML(c, 2)).join(' ⊕ '); break;
  }
  return prec(n) < p ? '(' + s + ')' : s;
};

/* ================= CUBES, QUINE-McCLUSKEY, KARNAUGH ================= */
/* valeurs d'une fonction : 0, 1 ou 2 (= indifférent, noté X / φ) */
NS.X_ = 2;
const pop = x => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
NS.pop = pop;
/* cube = produit de littéraux : care = variables présentes (bit 1), bits = leur valeur */
NS.covers = (c, m) => (m & c.care) === c.bits;
NS.cubeCells = function (c, n) { const r = []; for (let m = 0; m < (1 << n); m++) if (NS.covers(c, m)) r.push(m); return r; };
NS.cubeLits = c => pop(c.care);
NS.cubeAst = function (c, vars) {
  const n = vars.length, lits = [];
  for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (c.care & bit) lits.push(c.bits & bit ? V(vars[i]) : N(V(vars[i]))); }
  return lits.length === 0 ? C(1) : lits.length === 1 ? lits[0] : { t: 'and', a: lits };
};
/* termes premiers (Quine-McCluskey) */
NS.primes = function (n, ones, dcs) {
  const full = (1 << n) - 1; let cur = ones.concat(dcs || []).map(m => ({ care: full, bits: m })); const primes = [], seen = new Set();
  while (cur.length) {
    const nxt = new Map(), used = new Set();
    for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
      const a = cur[i], b = cur[j]; if (a.care !== b.care) continue; const d = a.bits ^ b.bits;
      if (d && (d & (d - 1)) === 0) { used.add(i); used.add(j); const c = { care: a.care & ~d, bits: a.bits & ~d }; nxt.set(c.care + ':' + c.bits, c); }
    }
    cur.forEach((c, i) => { if (!used.has(i)) { const k = c.care + ':' + c.bits; if (!seen.has(k)) { seen.add(k); primes.push(c); } } });
    cur = [...nxt.values()];
  }
  return primes;
};
/* couverture minimale (exacte) : moins de groupements, puis moins de littéraux */
NS.minCover = function (n, ones, primes) {
  if (!ones.length) return { cover: [], essential: [] };
  const cov = ones.map(m => primes.map((p, i) => NS.covers(p, m) ? i : -1).filter(i => i >= 0));
  const essential = new Set(); cov.forEach(l => { if (l.length === 1) essential.add(l[0]); });
  const chosen = new Set(essential); const left = ones.filter((m, k) => !cov[k].some(i => chosen.has(i)));
  let best = null;
  (function dfs(sel, rest) {
    if (best && sel.length > best.sel.length) return;
    if (!rest.length) {
      const lit = sel.reduce((s, i) => s + pop(primes[i].care), 0);
      if (!best || sel.length < best.sel.length || (sel.length === best.sel.length && lit < best.lit)) best = { sel: sel.slice(), lit };
      return;
    }
    let pm = null, pl = null;
    rest.forEach(m => { const l = primes.map((p, i) => NS.covers(p, m) ? i : -1).filter(i => i >= 0); if (!pl || l.length < pl.length) { pl = l; pm = m; } });
    pl.forEach(i => { sel.push(i); dfs(sel, rest.filter(m => !NS.covers(primes[i], m))); sel.pop(); });
  })([], left);
  const idx = [...essential].concat(best ? best.sel : []);
  return { cover: idx.map(i => primes[i]), essential: [...essential].map(i => primes[i]) };
};
NS.sopAst = function (cubes, vars) {
  if (!cubes.length) return C(0);
  if (cubes.some(c => c.care === 0)) return C(1);
  const ts = cubes.map(c => NS.cubeAst(c, vars)); return ts.length === 1 ? ts[0] : { t: 'or', a: ts };
};
/* values : tableau de 2^n valeurs 0 / 1 / 2 (indifférent) */
NS.minimize = function (vars, values) {
  const n = vars.length, ones = [], zeros = [], dcs = [];
  values.forEach((v, m) => { if (v === 1) ones.push(m); else if (v === 2) dcs.push(m); else zeros.push(m); });
  const primes = NS.primes(n, ones, dcs), mc = NS.minCover(n, ones, primes), sop = NS.sopAst(mc.cover, vars);
  /* produit de sommes : on simplifie le complément puis on applique De Morgan */
  const pz = NS.primes(n, zeros, dcs), mz = NS.minCover(n, zeros, pz);
  let pos;
  if (!ones.length && !dcs.length) pos = C(0);
  else if (!zeros.length) pos = C(1);
  else {
    const sums = mz.cover.map(c => { const lits = []; for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (c.care & bit) lits.push(c.bits & bit ? N(V(vars[i])) : V(vars[i])); } return lits.length === 1 ? lits[0] : { t: 'or', a: lits }; });
    pos = sums.length === 1 ? sums[0] : { t: 'and', a: sums };
  }
  if (!ones.length) pos = C(0);
  return { ones, zeros, dcs, primes, essential: mc.essential, cover: mc.cover, sop, pos, zeroCover: mz.cover };
};
/* formes canoniques */
NS.canonSop = function (vars, values) {
  const n = vars.length, ts = []; values.forEach((v, m) => { if (v === 1) ts.push({ t: 'and', a: NS.bits(m, n).map((b, i) => b ? V(vars[i]) : N(V(vars[i]))) }); });
  const f = ts.map(t => t.a.length === 1 ? t.a[0] : t); return !f.length ? C(0) : f.length === 1 ? f[0] : { t: 'or', a: f };
};
NS.canonPos = function (vars, values) {
  const n = vars.length, ts = []; values.forEach((v, m) => { if (v === 0) ts.push({ t: 'or', a: NS.bits(m, n).map((b, i) => b ? N(V(vars[i])) : V(vars[i])) }); });
  const f = ts.map(t => t.a.length === 1 ? t.a[0] : t); return !f.length ? C(1) : f.length === 1 ? f[0] : { t: 'and', a: f };
};
NS.listTerms = (values, want) => values.map((v, m) => v === want ? m : -1).filter(m => m >= 0);

/* ---- tableau de Karnaugh : disposition (code de Gray) ---- */
NS.GRAY = { 1: [0, 1], 2: [0, 1, 3, 2] };
NS.kmap = function (n) {
  if (n < 2 || n > 4) throw new Error('Karnaugh : 2 à 4 variables');
  const rv = n === 2 ? 1 : n === 3 ? 1 : 2, cv = n - rv;   /* nombre de variables en lignes / colonnes */
  const rows = NS.GRAY[rv], cols = NS.GRAY[cv];
  const rowBits = rows.map(r => NS.bits(r, rv)), colBits = cols.map(c => NS.bits(c, cv));
  const cell = (r, c) => (rows[r] << cv) | cols[c];            /* numéro de ligne de la table de vérité */
  return { n, rv, cv, rows, cols, rowBits, colBits, nr: rows.length, nc: cols.length, cell,
    pos: m => { for (let r = 0; r < rows.length; r++) for (let c = 0; c < cols.length; c++) if (cell(r, c) === m) return { r, c }; return null; } };
};
/* un ensemble de cases forme-t-il un groupement valide (cube) ? renvoie le cube ou null */
NS.cubeOf = function (cells, n) {
  if (!cells.length) return null; let care = (1 << n) - 1; const m0 = cells[0];
  cells.forEach(m => { care &= ~(m ^ m0); });
  const c = { care, bits: m0 & care };
  return NS.cubeCells(c, n).length === cells.length && NS.cubeCells(c, n).every(m => cells.includes(m)) ? c : null;
};
/* ce groupement peut-il être agrandi (est-il un terme premier) ? */
NS.isPrime = function (c, n, values) {
  for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (!(c.care & bit)) continue; const big = { care: c.care & ~bit, bits: c.bits & ~bit }; if (NS.cubeCells(big, n).every(m => values[m] !== 0)) return false; }
  return true;
};
})(typeof window !== 'undefined' ? window : globalThis);
