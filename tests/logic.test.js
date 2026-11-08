const assert0 = require('assert'); const assert = Object.assign((v,m)=>assert0(v,m), assert0, { deepStrictEqual: (a,b,m)=>assert0.strictEqual(JSON.stringify(a),JSON.stringify(b),m) }); const NS = require('./load')(['util.js', 'logic.js']);
let n = 0; const ok = s => { n++; console.log('ok  ' + s); };
const T = (s) => NS.parse(s);
/* analyse */
assert.strictEqual(NS.toText(T("A·!B + C")), 'A·!B + C'); ok('analyse A·!B + C');
assert.ok(NS.equiv(T("AB+A'C"), T("A·B + !A·C"))); ok('adjacence = ET, apostrophe = NON');
assert.ok(NS.equiv(T("!(A+B)"), T("!A·!B"))); ok('De Morgan 1');
assert.ok(NS.equiv(T("!(A·B)"), T("!A+!B"))); ok('De Morgan 2');
assert.ok(NS.equiv(T("A⊕B"), T("A·!B + !A·B"))); ok('OU exclusif');
assert.ok(NS.equiv(T("a+b"), T("B+A"))); ok('minuscules acceptées');
assert.ok(!NS.equiv(T("A+B"), T("A·B"))); ok('non équivalents');
['A+', '(A+B', 'A+B)', '·A', 'A%B', ''].forEach(s => assert.ok(NS.tryParse(s).err, s)); ok('erreurs de syntaxe');
assert.strictEqual(NS.vars(T("Q1 + A·B0")).join(), 'A,B0,Q1'); ok('variables triées');
/* priorités : ET avant XOR avant OU */
assert.deepStrictEqual(NS.tt(T("A+B⊕C"), ['A', 'B', 'C']), [0,1,1,0,1,1,1,1].map((x,i)=>{const[a,b,c]=NS.bits(i,3);return a|(b^c);})); ok('priorités');
/* table : A poids fort */
assert.deepStrictEqual(NS.tt(T("A·!B"), ['A', 'B']), [0, 0, 1, 0]); ok('ordre des lignes');
/* Quine-McCluskey : fonction connue Σ(0,1,2,5,6,7) sur 3 variables, 2 solutions de 3 termes */
let m = NS.minimize(['A', 'B', 'C'], [1,1,1,0,0,1,1,1]);
assert.strictEqual(m.cover.length, 3); ok('Σ(0,1,2,5,6,7) -> 3 groupements');
/* toutes les formes minimales sont équivalentes à la fonction */
function checkFn(values, vars) {
  const m = NS.minimize(vars, values);
  const t1 = NS.tt(m.sop, vars), t2 = NS.tt(m.pos, vars);
  values.forEach((v, i) => { if (v !== 2) { assert.strictEqual(t1[i], v, 'SOP ligne ' + i + ' ' + values.join('')); assert.strictEqual(t2[i], v, 'POS ligne ' + i + ' ' + values.join('')); } });
  return m;
}
let rng = NS.rng(7), cnt = 0;
for (let n = 2; n <= 4; n++) for (let k = 0; k < 150; k++) { const vals = []; for (let i = 0; i < (1 << n); i++) { const r = rng(); vals.push(r < .4 ? 1 : r < .8 ? 0 : (k % 3 === 0 ? 2 : 0)); } checkFn(vals, ['A','B','C','D'].slice(0, n)); cnt++; }
ok(cnt + ' fonctions aléatoires (2 à 4 variables, avec indifférents) : SOP et POS justes');
/* cas particuliers */
assert.strictEqual(NS.toText(checkFn([0,0,0,0], ['A','B']).sop), '0'); assert.strictEqual(NS.toText(checkFn([1,1,1,1], ['A','B']).sop), '1');
assert.strictEqual(NS.toText(checkFn([0,1,1,0], ['A','B']).sop), '!A·B + A·!B'); ok('constantes et XOR');
/* parité sur 4 variables : 8 groupements (damier) */
const par = []; for (let i = 0; i < 16; i++) par.push(NS.pop(i) & 1); assert.strictEqual(NS.minimize(['A','B','C','D'], par).cover.length, 8); ok('damier 4 variables : 8 groupements');
/* Karnaugh : disposition */
const k = NS.kmap(4); assert.deepStrictEqual(k.rows, [0,1,3,2]); assert.strictEqual(k.cell(2, 3), (3 << 2) | 2); assert.deepStrictEqual(k.pos(0b1110), { r: 2, c: 3 }); ok('Karnaugh 4 variables : code de Gray');
const k3 = NS.kmap(3); assert.strictEqual(k3.nr, 2); assert.strictEqual(k3.nc, 4); assert.strictEqual(k3.cell(1, 2), 0b111); ok('Karnaugh 3 variables');
/* groupements */
assert.ok(NS.cubeOf([0, 2, 8, 10], 4)); assert.strictEqual(NS.cubeOf([0, 1, 3], 4), null); assert.ok(NS.cubeOf([0, 4, 12, 8], 4)); assert.strictEqual(NS.cubeOf([1, 2], 4), null); ok('groupements aux coins valides, L invalides');
const vals = [1,1,0,0, 1,1,0,0, 0,0,0,0, 0,0,0,0]; const c = NS.cubeOf([0,1,4,5], 4); assert.ok(NS.isPrime(c, 4, vals)); assert.ok(!NS.isPrime(NS.cubeOf([0,1], 4), 4, vals)); ok('groupement premier / agrandissable');
/* formes canoniques */
const cs = NS.canonSop(['A','B','C'], [0,0,0,1,0,1,1,1]); assert.ok(NS.equiv(cs, T('A·B + A·C + B·C'))); ok('1ère forme canonique (majorité)');
const cp = NS.canonPos(['A','B','C'], [0,0,0,1,0,1,1,1]); assert.ok(NS.equiv(cp, T('A·B + A·C + B·C'))); ok('2e forme canonique');
assert.strictEqual(NS.toHTML(T('!(A+B)·C')), '<span class="ov">A + B</span>·C'); ok('écriture HTML avec barre');
console.log('\n' + n + ' vérifications OK');
