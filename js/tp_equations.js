/* tp_equations.js — partie 2 : tables de vérité et équations */
(function (g) {
'use strict';
const NS = g.NS, { mk, regScenario } = NS, { noFloat } = NS.CHK;
const CAT = '2 · Tables et équations', LV = 'Bac Pro CIEL (seconde / première)';
const ones = a => a.filter(v => v === 1).length;

/* ---- lire la table et l'équation d'un schéma existant */
const LIRE = ['A·!B + B·C', '(A+B)·!C', '!A·B + A·C'];
regScenario({
  id: 'lire', cat: CAT, diff: 2, title: 'Lire un schéma : table de vérité et équation', level: LV, duration: '45 min', variants: 3,
  refs: 'Lecture d\'un schéma logique ; table de vérité à 3 entrées ; équation', cours: ['table', 'equation'],
  desc: 'Un montage de portes est déjà câblé : S1 dépend de trois interrupteurs A, B, C. Vous devez <b>retrouver sa table de vérité et son équation</b>.',
  objectives: ['Suivre un signal de porte en porte', 'Remplir une table à 3 entrées (8 lignes)', 'Écrire l\'équation d\'une sortie'],
  steps: ['Observez le schéma : repérez les portes (ET, OU, NON…) et à quoi chaque sortie est reliée.', 'Essayez les 8 combinaisons avec les interrupteurs (A est le poids fort).', 'Placez les interrupteurs sur une combinaison qui <b>allume S1</b> et laissez-les ainsi.', 'Répondez aux questions.'],
  questions: [
    { q: 'Table de vérité de S1.', type: 'table', vars: ['A', 'B', 'C'], out: 'S1', answer: c => c.tt('S1') },
    { q: 'Combien de combinaisons des entrées allument S1 ?', answer: c => ones(c.tt('S1')), tol: 0, unit: '' },
    { q: 'Écrivez l\'équation de S1 en fonction de A, B et C.', type: 'expr', vars: ['A', 'B', 'C'], label: 'S1', target: c => c.expr('S1') }],
  build(c, o) { NS.buildAst(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(LIRE[o.variant]) }] }, { fuse: false }); },
  solve(c) { const t = NS.circuitTable(c), r = t.rows.find(r => r.outs[0] === 1); ['A', 'B', 'C'].forEach((n, k) => { c.byRef(n).p.on = !!r.ins[k]; }); },
  checks: [noFloat, { label: 'Le schéma n\'a pas été modifié', run: c => c.eq('S1', LIRE[c.tp.variant]) }, { label: 'Les interrupteurs sont sur une combinaison qui allume S1', run: c => c.val('S1', 'E') === 1 }],
  correction: v => '<p>S1 = <b>' + NS.toHTML(NS.parse(LIRE[v])) + '</b>. Chaque terme produit (ET) donne les combinaisons qui allument S1 ; le OU les rassemble.</p>'
});

/* ---- dessiner un schéma à partir d'une équation */
const EQ = ['A·B + !C', '(A+B)·!C', 'A⊕B + C·B'];
regScenario({
  id: 'equ_schema', cat: CAT, diff: 2, title: 'Dessiner le schéma d\'une équation', level: LV, duration: '45 min', variants: 3,
  refs: 'Passage équation → schéma ; association de portes', cours: ['equation', 'portes'],
  desc: v => 'Trois interrupteurs A, B, C et une LED S1 sont posés. Réalisez avec des portes le circuit d\'équation <b>S1 = ' + NS.toHTML(NS.parse(EQ[v])) + '</b>.',
  objectives: ['Associer une porte à chaque opérateur', 'Câbler un montage à plusieurs niveaux', 'Vérifier par la table de vérité'],
  steps: v => ['Repérez les opérateurs de ' + EQ[v] + ' : une porte par opérateur (une entrée de porte peut recevoir la sortie d\'une autre porte).', 'Placez les portes dans la palette, câblez des entrées vers la sortie.', 'Contrôlez avec l\'onglet <b>Équations</b> : l\'équation lue doit être équivalente.'],
  questions: [{ q: 'Combien de portes (NON compris) votre schéma comporte-t-il au minimum ?', answer: c => { const cc = new NS.Circuit(); NS.buildAst(cc, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(EQ[c.tp ? c.tp.variant : 0]) }] }); return NS.gateCount(cc).total; }, tol: 0.5, abs: 1 }],
  build(c) { NS.layoutIO(c, ['A', 'B', 'C'], ['S1'], { xo: 640 }); },
  solve(c, x) { c.parts = c.parts.filter(p => p.type === 'switch'); c.wires = []; c.junctions = []; NS.buildAst(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(EQ[x.tp.variant]) }] }); },
  checks: [noFloat, { label: 'S1 est équivalent à l\'équation demandée', run: c => c.eq('S1', EQ[c.tp.variant]) }, { label: 'Aucune porte inutile (réalisation directe)', run: c => { const cc = new NS.Circuit(); NS.buildAst(cc, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(EQ[c.tp.variant]) }] }); return c.nGates() <= NS.gateCount(cc).total + 1; } }],
  correction: v => '<p>S1 = ' + NS.toHTML(NS.parse(EQ[v])) + '. On dessine de gauche à droite en suivant les parenthèses : les termes ET d\'abord, le OU ensuite.</p>'
});

/* ---- suivre les valeurs derrière chaque porte */
const COMBOS = [[1, 0, 0], [1, 1, 1], [0, 1, 1]];
const sv = (c, k, ref, pin) => NS.evalAt(c.c, { A: COMBOS[c.tp.variant][0], B: COMBOS[c.tp.variant][1], C: COMBOS[c.tp.variant][2] }, ref, pin || 'S');
regScenario({
  id: 'suivre', cat: CAT, diff: 1, title: 'Que se passe-t-il derrière chaque porte ?', level: LV, duration: '30 min', variants: 3,
  refs: 'Propagation des niveaux logiques ; lecture des états internes', cours: ['niveaux', 'equation'],
  desc: v => 'Le montage est câblé. Placez les interrupteurs sur <b>A = ' + COMBOS[v][0] + ', B = ' + COMBOS[v][1] + ', C = ' + COMBOS[v][2] + '</b> et relevez le niveau à la sortie de chaque porte (pastilles 0/1 sur les fils).',
  objectives: ['Lire un niveau sur un fil', 'Calculer à la main la sortie d\'une porte et la vérifier'],
  steps: ['Cliquez sur les interrupteurs pour obtenir la combinaison demandée.', 'Pour chaque porte, comparez ses entrées, son type et sa sortie.', 'Répondez.'],
  questions: [
    { q: 'Niveau en sortie de G1 (OU exclusif A ⊕ B)', answer: c => sv(c, 0, 'G1'), tol: 0, abs: 0 },
    { q: 'Niveau en sortie de G2 (NON C)', answer: c => sv(c, 0, 'G2'), tol: 0, abs: 0 },
    { q: 'Niveau en sortie de G3 (ET de G1 et G2)', answer: c => sv(c, 0, 'G3'), tol: 0, abs: 0 },
    { q: 'Niveau en sortie de G4 (ET de A et B)', answer: c => sv(c, 0, 'G4'), tol: 0, abs: 0 },
    { q: 'Niveau de S1 (OU de G3 et G4)', answer: c => sv(c, 0, 'S1', 'E'), tol: 0, abs: 0 }],
  build(c) { const L = mk(c); L.p('switch', 'A', 60, 60); L.p('switch', 'B', 60, 150); L.p('switch', 'C', 60, 240);
    L.p('xor', 'G1', 260, 100, { n: 2 }); L.p('not', 'G2', 260, 240); L.p('and', 'G3', 420, 160, { n: 2 }); L.p('and', 'G4', 420, 290, { n: 2 }); L.p('or', 'G5', 580, 220, { n: 2 }); L.p('led', 'S1', 740, 220, { color: 'verte' });
    L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('C', 'S', 'G2', 'E'); L.w('G1', 'S', 'G3', 'E1'); L.w('G2', 'S', 'G3', 'E2'); L.w('A', 'S', 'G4', 'E1'); L.w('B', 'S', 'G4', 'E2'); L.w('G3', 'S', 'G5', 'E1'); L.w('G4', 'S', 'G5', 'E2'); L.w('G5', 'S', 'S1', 'E'); },
  solve(c, x) { ['A', 'B', 'C'].forEach((n, k) => { c.byRef(n).p.on = !!COMBOS[x.tp.variant][k]; }); },
  checks: [{ label: 'Les interrupteurs sont sur la combinaison demandée', run: c => ['A', 'B', 'C'].every((n, k) => !!c.part(n).p.on === !!COMBOS[c.tp.variant][k]) }],
  correction: '<p>Pour chaque porte : lire les entrées sur les fils, appliquer la règle de la porte (le OU exclusif donne 1 si ses entrées sont différentes, le ET si elles valent toutes 1). La LED S1 vaut 1 si G3 <b>ou</b> G4 vaut 1.</p>'
});

/* ---- dépannage logique */
const DEP = [['G1', 'and', 'or'], ['G2', 'or', 'and'], ['G1', 'and', 'xor']];
regScenario({
  id: 'depannage', cat: CAT, diff: 2, title: 'Dépannage : trouver la porte défectueuse', level: LV, duration: '40 min', variants: 3,
  refs: 'Diagnostic d\'un montage logique ; comparaison attendu / observé', cours: ['portes', 'equation'],
  desc: 'Le montage doit réaliser <b>S1 = A·B + C</b> (G1 : ET de A et B, G2 : OU de G1 et C). Une porte a été remplacée par une mauvaise référence. Trouvez-la et remplacez-la.',
  objectives: ['Comparer comportement attendu et observé', 'Localiser un défaut par les niveaux internes', 'Corriger le montage'],
  steps: ['Testez les 8 combinaisons. Dès que S1 diffère de A·B + C, notez la combinaison.', 'Observez les niveaux à la sortie de G1 puis G2 pour la combinaison fautive.', 'Supprimez la porte fautive, posez la bonne, recâblez.'],
  questions: [{ q: 'Quelle porte est défectueuse ?', type: 'part', correct: c => DEP[c.tp ? c.tp.variant : 0][0] }],
  build(c, o) { const L = mk(c), d = DEP[o.variant]; L.p('switch', 'A', 60, 80); L.p('switch', 'B', 60, 170); L.p('switch', 'C', 60, 260);
    L.p(d[0] === 'G1' ? d[2] : 'and', 'G1', 280, 120, { n: 2 }); L.p(d[0] === 'G2' ? d[2] : 'or', 'G2', 460, 190, { n: 2 }); L.p('led', 'S1', 640, 190, { color: 'verte' });
    L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('G1', 'S', 'G2', 'E1'); L.w('C', 'S', 'G2', 'E2'); L.w('G2', 'S', 'S1', 'E'); },
  solve(c, x) { const d = DEP[x.tp.variant]; c.byRef(d[0]).type = d[1]; },
  checks: [noFloat, { label: 'S1 = A·B + C', run: c => c.eq('S1', 'A·B + C') }, { label: 'Deux portes seulement (pas de rustine)', run: c => c.nGates() === 2 }],
  correction: v => '<p>La porte <b>' + DEP[v][0] + '</b> était un ' + DEP[v][2].toUpperCase() + ' au lieu d\'un ' + DEP[v][1].toUpperCase() + '. La première combinaison où S1 est faux, avec les niveaux internes, désigne la porte dont la sortie est fausse alors que ses entrées sont justes.</p>'
});
})(typeof window !== 'undefined' ? window : globalThis);
