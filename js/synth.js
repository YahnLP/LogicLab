/* synth.js — construit un schéma de portes à partir d'une fonction (table de vérité / équation).
   Quatre styles : 'andor' (ET puis OU), 'nand' (NON-ET seulement), 'orand' (OU puis ET), 'nor' (NON-OU seulement). */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};

NS.STYLES = { andor: 'ET / OU / NON (somme de produits)', nand: 'NON-ET seulement', orand: 'OU / ET / NON (produit de sommes)', nor: 'NON-OU seulement' };
/* termes à deux niveaux d'une fonction : tableaux de littéraux {v:index, neg:bool} */
NS.twoLevel = function (vars, values, style) {
  const m = NS.minimize(vars, values), n = vars.length, pos = style === 'orand' || style === 'nor';
  if (!m.ones.length) return { konst: 0 };
  if (!m.zeros.length) return { konst: 1 };
  const cubes = pos ? m.zeroCover : m.cover, terms = cubes.map(cu => { const l = []; for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (cu.care & bit) l.push({ v: i, neg: pos ? !!(cu.bits & bit) : !(cu.bits & bit) }); } return l; });
  return { terms, pos };
};

/* spec = { vars:[noms], outputs:[{name, values}] } ; opt = { style, replace, x, y } */
NS.synthesize = function (c, spec, opt) {
  opt = opt || {}; const style = opt.style || 'andor', vars = spec.vars, nV = vars.length;
  if (opt.replace) { c.parts = []; c.wires = []; c.junctions = []; }
  let y0 = opt.y; if (y0 === undefined) { y0 = 40; c.parts.forEach(p => { const e = NS.extOf(p) || NS.PARTS[p.type].ext || [0, 0, 0, 0]; y0 = Math.max(y0, p.y + e[3] + 60); }); if (!c.parts.length) y0 = 40; }
  const x0 = opt.x === undefined ? 60 : opt.x, XN = x0 + 170, X1 = x0 + 360, X2 = x0 + 540, XO = x0 + 700;
  const gateOf = { andor: ['and', 'or'], nand: ['nand', 'nand'], orand: ['or', 'and'], nor: ['nor', 'nor'] }[style];
  /* sources */
  const src = vars.map((nm, i) => { let p = c.byRef(nm); if (!p) p = c.add('switch', x0, y0 + 20 + i * 70, {}, nm); return p; });
  const invOnly = style === 'nand' || style === 'nor';
  /* inverseur : une porte NON, ou (styles NON-ET / NON-OU seuls) la porte du style avec ses deux entrées reliées */
  const mkInv = (p, pin, x, y) => { if (!invOnly) { const k = c.add('not', x, y, {}); c.link(p, pin, k, 'E'); return k; } const k = c.add(gateOf[0], x, y, { n: 2 }); c.link(p, pin, k, 'E1'); c.link(p, pin, k, 'E2'); return k; };
  const notG = {}; const litPin = (l, neg) => { /* neg = vrai : complément de la variable */
    if (!neg) return [src[l.v], 'S'];
    if (!notG[l.v]) notG[l.v] = mkInv(src[l.v], 'S', XN, src[l.v].y); return [notG[l.v], 'S']; };
  const shared = {}; let rowY = y0 + 20; const created = [];
  const gate = (type, ins, x, y) => { const k = c.add(type, x, y, { n: Math.max(2, ins.length) }); ins.forEach((pp, i) => { const pin = ins.length === 1 ? 'E' : 'E' + (i + 1); c.link(pp[0], pp[1], k, pin); }); created.push(k); return k; };
  const hOf = n => Math.max(n, 2) * 20;
  spec.outputs.forEach(o => {
    const tl = NS.twoLevel(vars, o.values, style); let led = c.byRef(o.name);
    if (tl.konst !== undefined) { const k = c.add(tl.konst ? 'const1' : 'const0', XO - 160, rowY, {}); if (!led) led = c.add('led', XO, rowY, {}, o.name); c.link(k, 'S', led, 'E'); rowY += 60; return; }
    const isPos = tl.pos, inv = style === 'nand' || style === 'nor', ys = []; const sig = [];
    tl.terms.forEach(t => {
      const key = style + ':' + t.map(l => (l.neg ? '!' : '') + l.v).join(',');
      if (t.length === 1) { sig.push(litPin(t[0], inv ? !t[0].neg : t[0].neg)); return; }
      if (!shared[key]) { const ins = t.map(l => litPin(l, l.neg)), k = gate(gateOf[0], ins, X1, rowY + hOf(t.length) / 2); shared[key] = [k, 'S']; rowY += hOf(t.length) + 20; }
      sig.push(shared[key]);
    });
    let outPin;
    if (sig.length === 1) {
      if (inv && tl.terms[0].length > 1) { const k = mkInv(sig[0][0], 'S', X2, sig[0][0].y); outPin = [k, 'S']; } else if (inv) outPin = litPin(tl.terms[0][0], tl.terms[0][0].neg); else outPin = sig[0];
    } else {
      /* regroupement par 8 au plus */
      let level = sig, stage = 0;
      while (level.length > 1) { const nxt = []; for (let i = 0; i < level.length; i += 8) { const grp = level.slice(i, i + 8); if (grp.length === 1) { nxt.push(grp[0]); continue; } const yy = Math.round(grp.reduce((s, q) => s + q[0].y, 0) / grp.length / 10) * 10; const k = gate(gateOf[1], grp, X2 + stage * 120, yy); nxt.push([k, 'S']); } level = nxt; stage++; if (stage > 3) break; }
      outPin = level[0];
    }
    const yy = outPin[0].y; if (!led) led = c.add('led', XO + 60, yy, {}, o.name); c.link(outPin[0], outPin[1], led, 'E'); rowY = Math.max(rowY, yy + 50);
  });
  return created;
};
})(typeof window !== 'undefined' ? window : globalThis);
