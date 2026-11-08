const assert = require('assert'); const NS = require('./load')(['util.js', 'logic.js', 'parts.js', 'circuit.js', 'engine.js', 'analysis.js', 'synth.js']);
let n = 0; const ok = s => { n++; console.log('ok  ' + s); };
const rng = NS.rng(11); let nf = 0;
for (const style of Object.keys(NS.STYLES)) for (let k = 0; k < 60; k++) {
  const nv = 2 + (k % 3), vars = ['A', 'B', 'C', 'D'].slice(0, nv), vals = []; for (let i = 0; i < (1 << nv); i++) vals.push(rng() < .5 ? 1 : 0);
  const vals2 = vals.map(v => rng() < .3 ? 1 - v : v);
  const c = new NS.Circuit(); NS.synthesize(c, { vars, outputs: [{ name: 'S1', values: vals }, { name: 'S2', values: vals2 }] }, { style });
  const t = NS.circuitTable(c); assert.strictEqual(t.vars.map(v => v.name).join(), vars.join()); assert.strictEqual(t.outs.length, 2);
  assert.strictEqual(t.rows.map(r => r.outs[0]).join(''), vals.join(''), style + ' S1 ' + vals.join('')); assert.strictEqual(t.rows.map(r => r.outs[1]).join(''), vals2.join(''), style + ' S2');
  if (style === 'nand') assert.ok(Object.keys(NS.gateCount(c).by).every(k => k === 'nand'), 'NAND seul : ' + JSON.stringify(NS.gateCount(c).by));
  if (style === 'nor') assert.ok(Object.keys(NS.gateCount(c).by).every(k => k === 'nor'), 'NOR seul');
  if (style === 'nand' || style === 'nor') { /* pas de NON à part : tout est NON-ET / NON-OU */ }
  assert.strictEqual(c.parts.filter(p => p.type === 'led').length, 2); assert.strictEqual(new NS.Sim(c).floating().length, 0, 'aucune entrée en l\'air'); nf++;
}
ok(nf + ' fonctions synthétisées dans 4 styles : tables identiques, pas d\'entrée en l\'air, NAND/NOR purs');
/* équation lue sur le schéma */
const c = new NS.Circuit(); NS.synthesize(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S', values: [0, 0, 0, 1, 0, 1, 1, 1] }] });
const e = NS.exprOfOutput(c, 'S'); assert.ok(e && NS.equiv(e, NS.parse('A·B + A·C + B·C'))); ok('équation lue sur le schéma = majorité'); 
assert.ok(NS.outputMatches(c, 'S', 'AB+AC+BC')); assert.ok(!NS.outputMatches(c, 'S', 'A+B+C')); ok('outputMatches');
/* constante */
const c3 = new NS.Circuit(); NS.synthesize(c3, { vars: ['A', 'B'], outputs: [{ name: 'S', values: [1, 1, 1, 1] }] }); assert.strictEqual(NS.circuitTable(c3).rows.every(r => r.outs[0] === 1), true); ok('sortie constante');
/* parité 4 variables (8 termes) */
const par = []; for (let i = 0; i < 16; i++) par.push(NS.pop(i) & 1); const c4 = new NS.Circuit(); NS.synthesize(c4, { vars: ['A', 'B', 'C', 'D'], outputs: [{ name: 'S', values: par }] }); assert.strictEqual(NS.circuitTable(c4).rows.map(r => r.outs[0]).join(''), par.join('')); ok('parité 4 variables (8 termes)');
console.log('\n' + n + ' vérifications OK');
