/* route.js — tracé automatique des fils d'un schéma généré (synthèse, TP) : chaque signal a sa propre piste verticale,
   les fils ne passent pas à travers les portes et deux signaux différents ne se superposent jamais. */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const MARGIN = 12;
NS.autoRoute = function (c, from) {
  const ws = c.wires.slice(from || 0).filter(w => w.a.c && w.b.c && !(w.mid && w.mid.length));
  const items = [];
  ws.forEach(w => {
    let a = w.a, b = w.b, swapped = false; const pa = NS.pinsOf(c.part(a.c))[a.p], pb = NS.pinsOf(c.part(b.c))[b.p];
    if (pa.dir !== 'out') { [a, b] = [b, a]; swapped = true; }
    const pA = NS.pinsOf(c.part(a.c))[a.p], pB = NS.pinsOf(c.part(b.c))[b.p]; if (pA.dir !== 'out' || pB.dir !== 'in') return;
    const P = c.endPos(a), Q = c.endPos(b); if (Q[0] - P[0] < 40) return;
    items.push({ w, swapped, P, Q, net: a.c + ':' + a.p });
  });
  if (!items.length) return;
  const boxes = c.parts.map(p => { const e = NS.extOf(p) || NS.PARTS[p.type].ext || [0, 0, 0, 0]; return [p.x + e[0] - 4, p.y + e[1] - MARGIN, p.x + e[2] + 4, p.y + e[3] + 6]; });
  const hits = (x1, x2, y) => { const lo = Math.min(x1, x2), hi = Math.max(x1, x2); return boxes.some(b => y > b[1] && y < b[3] && hi > b[0] && lo < b[2]); };
  const LANE = 12;
  const bySrc = {}, byDst = {};
  items.forEach(it => { (bySrc[it.P[0]] = bySrc[it.P[0]] || new Map()).set(it.net, it.P[1]); (byDst[it.Q[0]] = byDst[it.Q[0]] || new Map()).set(it.net, it.P[1]); });
  /* essaie plusieurs ordres de pistes et garde celui qui crée le moins de croisements */
  function run(dstDir, srcDir) {
    const srcRank = new Map(), dstRank = new Map();
    Object.keys(bySrc).forEach(x => { [...bySrc[x].entries()].sort((a, b) => srcDir * (a[1] - b[1])).forEach(([n], i) => srcRank.set(x + '|' + n, i)); });
    Object.keys(byDst).forEach(x => { [...byDst[x].entries()].sort((a, b) => dstDir * (a[1] - b[1])).forEach(([n], i) => dstRank.set(x + '|' + n, i)); });
    const segs = [], res = [];
    const clash = (isH, k, a, b, net) => { const lo = Math.min(a, b), hi = Math.max(a, b); return segs.some(s => s.h === isH && s.k === k && s.net !== net && hi > s.a && lo < s.b); };
    const add = (isH, k, a, b, net) => { segs.push({ h: isH, k, a: Math.min(a, b), b: Math.max(a, b), net }); };
    items.slice().sort((u, v) => u.Q[0] - v.Q[0] || u.P[1] - v.P[1]).forEach(it => {
      const { P, Q, net } = it, xs = P[0] + 16 + LANE * srcRank.get(P[0] + '|' + net), xd = Q[0] - 16 - LANE * dstRank.get(Q[0] + '|' + net);
      if (xd <= xs) return;
      const cand = [P[1], Q[1]]; for (let k = 1; k <= 40; k++) { cand.push(P[1] - 10 * k, P[1] + 10 * k); }
      for (const yc of cand) {
        if (hits(xs, xd, yc) || clash(true, yc, xs, xd, net) || clash(true, Q[1], xd, Q[0], net) || clash(false, xs, P[1], yc, net) || clash(false, xd, yc, Q[1], net)) continue;
        const pts = [[xs, P[1]], [xs, yc], [xd, yc], [xd, Q[1]]], clean = [];
        pts.forEach(p => { const l = clean[clean.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) clean.push(p); });
        res.push({ it, mid: it.swapped ? clean.slice().reverse() : clean });
        add(true, P[1], P[0], xs, net); add(false, xs, P[1], yc, net); add(true, yc, xs, xd, net); add(false, xd, yc, Q[1], net); add(true, Q[1], xd, Q[0], net);
        return;
      }
    });
    let cross = 0; const H = segs.filter(s => s.h), V = segs.filter(s => !s.h);
    H.forEach(h => V.forEach(v => { if (h.net !== v.net && v.k > h.a && v.k < h.b && h.k > v.a && h.k < v.b) cross++; }));
    return { res, cross, missed: items.length - res.length };
  }
  let best = null;
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([d, s]) => { const r = run(d, s); if (!best || r.missed < best.missed || (r.missed === best.missed && r.cross < best.cross)) best = r; });
  best.res.forEach(r => { r.it.w.mid = r.mid; });
};
})(typeof window !== 'undefined' ? window : globalThis);
