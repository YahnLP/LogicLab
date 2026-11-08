const assert = require('assert'); const NS = require('./load')(['util.js', 'logic.js', 'parts.js', 'circuit.js', 'route.js', 'engine.js']);
let n = 0; const ok = s => { n++; console.log('ok  ' + s); };
function mk(cb) { const c = new NS.Circuit(); cb(c); return c; }
/* portes 2 entrées : toutes les tables */
const EXP = { and: [0,0,0,1], or: [0,1,1,1], nand: [1,1,1,0], nor: [1,0,0,0], xor: [0,1,1,0], xnor: [1,0,0,1] };
for (const t in EXP) {
  const out = []; for (let i = 0; i < 4; i++) {
    const c = mk(c => { c.add('switch', 0, 0, { on: !!(i & 2) }, 'A'); c.add('switch', 0, 40, { on: !!(i & 1) }, 'B'); c.add(t, 200, 0, {}, 'G1'); c.add('led', 400, 0, {}, 'S'); c.link('A', 'S', 'G1', 'E1'); c.link('B', 'S', 'G1', 'E2'); c.link('G1', 'S', 'S', 'E'); });
    const s = new NS.Sim(c); s.rebuild(); out.push(s.refVal('S')); }
  assert.strictEqual(JSON.stringify(out), JSON.stringify(EXP[t]), t);
}
ok('6 portes à 2 entrées : tables de vérité');
/* NON et entrée en l'air */
let c = mk(c => { c.add('switch', 0, 0, { on: true }, 'A'); c.add('not', 100, 0, {}, 'G1'); c.add('led', 200, 0, {}, 'S'); c.add('and', 100, 100, {}, 'G2'); c.add('led', 200, 100, {}, 'S2'); c.link('A', 'S', 'G1', 'E'); c.link('G1', 'S', 'S', 'E'); c.link('A', 'S', 'G2', 'E1'); c.link('G2', 'S', 'S2', 'E'); });
let s = new NS.Sim(c); s.rebuild(); assert.strictEqual(s.refVal('S'), 0); assert.strictEqual(s.refVal('S2'), 2); assert.strictEqual(s.floating().length, 1); ok('NON ; ET avec entrée non reliée = indéterminé');
/* ET avec une entrée à 0 et une en l'air = 0 (logique à 3 états) */
c.byRef('A').p.on = false; s.invalidate(); s.rebuild(); assert.strictEqual(s.refVal('S2'), 0); ok('0 domine dans un ET même avec une entrée en l\'air');
/* conflit de sorties */
c = mk(c => { c.add('switch', 0, 0, { on: true }, 'A'); c.add('switch', 0, 40, { on: false }, 'B'); c.add('led', 200, 0, {}, 'S'); c.link('A', 'S', 'S', 'E'); c.link('B', 'S', 'S', 'E'); });
s = new NS.Sim(c); s.rebuild(); assert.strictEqual(s.refVal('S'), 2); assert.ok(s.events.length >= 1); ok('conflit de deux sorties détecté');
/* horloge : fréquence et rapport cyclique */
c = mk(c => { c.add('clock', 0, 0, { f: 5, duty: 25, phase: 0 }, 'H1'); c.add('probe', 100, 0, {}, 'S'); c.link('H1', 'S', 'S', 'E'); });
s = new NS.Sim(c); s.advance(2, 100000); const sig = s.sigByKey.get(c.byRef('H1').id + ':0'); const tr = sig.tr; const ups = []; for (let i = 0; i < tr.length; i += 2) if (tr[i + 1] === 1) ups.push(tr[i]);
assert.ok(Math.abs((ups[ups.length - 1] - ups[1]) / (ups.length - 2) - 0.2) < 0.01, 'période 200 ms'); ok('horloge 5 Hz : période mesurée 0,2 s');
let hi = 0, lo = 0; for (let i = 2; i + 2 < tr.length - 2; i += 2) { const d = tr[i + 2] - tr[i]; if (tr[i + 1] === 1) hi += d; else lo += d; } assert.ok(Math.abs(hi / (hi + lo) - 0.25) < 0.03); ok('rapport cyclique 25 %');
/* bascule D en diviseur par 2 */
c = mk(c => { c.add('clock', 0, 0, { f: 4, duty: 50 }, 'H1'); c.add('dff', 100, 0, {}, 'FF1'); c.add('probe', 300, 0, {}, 'S'); c.link('H1', 'S', 'FF1', 'CLK'); c.link('FF1', 'NQ', 'FF1', 'D'); c.link('FF1', 'Q', 'S', 'E'); });
s = new NS.Sim(c); s.advance(2, 100000); const q = s.sigByKey.get(c.byRef('FF1').id + ':2'); const qu = []; for (let i = 0; i < q.tr.length; i += 2) if (q.tr[i + 1] === 1) qu.push(q.tr[i]);
assert.ok(Math.abs(qu[2] - qu[1] - 0.5) < 0.03, 'Q = 2 Hz'); ok('bascule D câblée en diviseur par 2 : 4 Hz → 2 Hz');
/* compteur asynchrone 2 bits (ripple) : 4 Hz -> 1 Hz */
c = mk(c => { c.add('clock', 0, 0, { f: 8, duty: 50 }, 'H1'); c.add('dff', 100, 0, {}, 'FF1'); c.add('dff', 300, 0, {}, 'FF2'); c.link('H1', 'S', 'FF1', 'CLK'); c.link('FF1', 'NQ', 'FF1', 'D'); c.link('FF1', 'Q', 'FF2', 'CLK'); c.link('FF2', 'NQ', 'FF2', 'D'); });
s = new NS.Sim(c); s.advance(4, 100000); const q2 = s.sigByKey.get(c.byRef('FF2').id + ':2'); const q2u = []; for (let i = 0; i < q2.tr.length; i += 2) if (q2.tr[i + 1] === 1) q2u.push(q2.tr[i]);
assert.ok(Math.abs(q2u[2] - q2u[1] - 0.5) < 0.04, 'Q2 = 2 Hz (8/4)'); ok('2 bascules en cascade : ÷4');
/* RAZ asynchrone */
c = mk(c => { c.add('switch', 0, 0, { on: true }, 'A'); c.add('switch', 0, 40, { on: true }, 'B'); c.add('button', 0, 80, {}, 'R'); c.add('dff', 100, 0, { reset: true }, 'FF1'); c.add('led', 300, 0, {}, 'S'); c.link('A', 'S', 'FF1', 'D'); c.link('B', 'S', 'FF1', 'CLK'); c.link('R', 'S', 'FF1', 'R'); c.link('FF1', 'Q', 'S', 'E'); });
s = new NS.Sim(c); s.rebuild(); assert.strictEqual(s.refVal('S'), 0); ok('mise sous tension : Q = 0');
/* boucle instable : NON bouclé sur lui-même */
c = mk(c => { c.add('not', 0, 0, {}, 'G1'); c.link('G1', 'S', 'G1', 'E'); });
s = new NS.Sim(c); s.rebuild(); assert.strictEqual(s.refVal('G1'), 2); ok('boucle NON → NON : niveau indéterminé (pas de valeur de départ)');
/* mémoire RS à deux NON-OU */
c = mk(c => { c.add('button', 0, 0, {}, 'R'); c.add('button', 0, 100, {}, 'SET'); c.add('nor', 100, 0, {}, 'G1'); c.add('nor', 100, 100, {}, 'G2'); c.link('R', 'S', 'G1', 'E1'); c.link('SET', 'S', 'G2', 'E2'); c.link('G1', 'S', 'G2', 'E1'); c.link('G2', 'S', 'G1', 'E2'); });
s = new NS.Sim(c); s.rebuild(); assert.notStrictEqual(s.warn, 'Boucle instable'); const q0 = s.refVal('G1'); c.byRef('SET').rt.pressed = true; s.refresh(); const qa = s.refVal('G2'); c.byRef('SET').rt.pressed = false; s.refresh(); assert.strictEqual(s.refVal('G2'), qa); ok('verrou RS (2 NON-OU) : mémorise après relâchement');
/* générateur de combinaisons */
c = mk(c => { c.add('cnt', 0, 0, { bits: 3, f: 8 }, 'N1'); c.add('probe', 100, 0, {}, 'S'); c.link('N1', 'A', 'S', 'E'); });
s = new NS.Sim(c); s.advance(1, 100000); const sa = s.sigByKey.get(c.byRef('N1').id + ':0'); assert.ok(sa.tr.length >= 2); ok('compteur 3 bits : poids fort A');
/* séquence */
c = mk(c => { c.add('seq', 0, 0, { pattern: '10', rate: 10 }, 'A'); c.add('probe', 100, 0, {}, 'S'); c.link('A', 'S', 'S', 'E'); }); s = new NS.Sim(c); s.advance(1, 100000); assert.ok(s.sigByKey.get(c.byRef('A').id + ':0').tr.length > 15); ok('séquence 10 à 10 bit/s');
/* sérialisation */
const c2 = NS.deserialize(JSON.parse(JSON.stringify(NS.serialize(mk(c => { c.add('and', 0, 0, { n: 3 }, 'G1'); }))))); assert.strictEqual(c2.parts[0].p.n, 3); ok('sérialisation aller-retour');
console.log('\n' + n + ' vérifications OK');
