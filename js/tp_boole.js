/* tp_boole.js — partie 3 : algèbre de Boole, De Morgan, simplification et tableaux de Karnaugh */
(function (g) {
'use strict';
const NS = g.NS, { mk, regScenario } = NS, { noFloat } = NS.CHK;
const CAT = '3 · Boole et Karnaugh', LV = 'Bac Pro CIEL (première)';

/* ---- De Morgan */
const DM = [
  { src: 'nor', f: '!(A+B)', alt: '!A·!B', only: ['not', 'and'], txt: 'NON-OU' },
  { src: 'nand', f: '!(A·B)', alt: '!A+!B', only: ['not', 'or'], txt: 'NON-ET' }];
regScenario({
  id: 'demorgan', cat: CAT, diff: 2, title: 'Lois de De Morgan', level: LV, duration: '45 min', variants: 2,
  refs: 'Algèbre de Boole ; lois de De Morgan ; équivalence de schémas', cours: ['boole', 'table'],
  desc: v => 'La porte G1 (<b>' + DM[v].txt + '</b>) allume S1. Réalisez S2 avec des portes <b>' + DM[v].only.map(t => t === 'not' ? 'NON' : t === 'and' ? 'ET' : 'OU').join(' et ') + ' uniquement</b> de façon à ce que S2 soit toujours identique à S1.',
  objectives: ['Appliquer les lois de De Morgan', 'Prouver une équivalence en comparant deux tables'],
  steps: v => ['Écrivez l\'équation de S1 : ' + NS.toText(NS.parse(DM[v].f)) + '.', 'Transformez-la avec De Morgan pour ne garder que les opérateurs imposés.', 'Câblez S2, puis comparez S1 et S2 dans la table de vérité.'],
  questions: [
    { q: 'Équation de S2 avec uniquement des NON et ' + 'des ET ou des OU (selon l\'énoncé), équivalente à S1.', type: 'expr', vars: ['A', 'B'], label: 'S2', target: c => DM[c.tp ? c.tp.variant : 0].f },
    { q: 'Complétez : le contraire d\'un ET est…', type: 'choice', options: ['un OU des contraires', 'un ET des contraires', 'un OU exclusif', 'toujours 1'], correct: 0 }],
  build(c, o) { const L = mk(c), d = DM[o.variant]; L.p('switch', 'A', 60, 90); L.p('switch', 'B', 60, 210); L.p(d.src, 'G1', 300, 90, { n: 2 }); L.p('led', 'S1', 480, 90, { color: 'verte' }); L.p('led', 'S2', 600, 280, { color: 'jaune' });
    L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('G1', 'S', 'S1', 'E'); },
  solve(c, x) { const d = DM[x.tp.variant], L = mk(c), main = d.only.find(t => t !== 'not'); L.p('not', 'G2', 260, 280); L.p('not', 'G3', 260, 340); L.p(main, 'G4', 440, 310, { n: 2 });
    L.w('A', 'S', 'G2', 'E'); L.w('B', 'S', 'G3', 'E'); L.w('G2', 'S', 'G4', 'E1'); L.w('G3', 'S', 'G4', 'E2'); L.w('G4', 'S', 'S2', 'E'); },
  checks: [noFloat, { label: 'S2 donne le même résultat que S1 (4 combinaisons)', run: c => { const a = c.outFn('S1'), b = c.outFn('S2'); return !!a && !!b && a.values.join() === b.values.join(); } },
    { label: 'S2 n\'utilise que les portes imposées (NON + ET ou OU), la porte G1 mise à part', run: c => { const g = NS.gateCount(c.c).by, d = DM[c.tp.variant]; return Object.keys(g).every(k => d.only.includes(k) || k === d.src) && !!c.c.byRef('G1') && c.nGates() >= 4 && !(g[d.src] > 1); } }],
  correction: v => '<p>S1 = ' + NS.toHTML(NS.parse(DM[v].f)) + ' = <b>' + NS.toHTML(NS.parse(DM[v].alt)) + '</b>. On a deux NON sur les entrées puis ' + (v ? 'un OU' : 'un ET') + '.</p>'
});

/* ---- tout en NON-ET */
const NAND_JOBS = [
  { t: 'OU exclusif A ⊕ B', f: 'A⊕B', max: 4 }, { t: 'OU : A + B', f: 'A+B', max: 3 }, { t: 'NON-OU', f: '!(A+B)', max: 4 }];
regScenario({
  id: 'tout_nand', cat: CAT, diff: 3, title: 'Tout avec des NON-ET', level: LV, duration: '1 h', variants: 3,
  refs: 'Portes universelles ; NON-ET ; synthèse avec un seul type de porte', cours: ['boole', 'portes'],
  desc: v => 'Votre atelier n\'a que des portes <b>NON-ET</b>. Réalisez la fonction « <b>' + NAND_JOBS[v].t + '</b> » (S1) avec au plus <b>' + NAND_JOBS[v].max + '</b> portes NON-ET.',
  objectives: ['Utiliser le NON-ET comme porte universelle', 'Fabriquer un inverseur en reliant les deux entrées', 'Minimiser le nombre de portes'],
  steps: ['Un NON-ET dont les deux entrées sont reliées se comporte comme un NON.', 'Écrivez la fonction avec ET/OU/NON, puis remplacez chaque opérateur avec De Morgan.', 'Câblez, vérifiez avec la table, comptez les portes.'],
  questions: [{ q: 'Un NON-ET dont les deux entrées sont reliées réalise la fonction…', type: 'choice', options: ['ET', 'OU', 'NON', 'OU exclusif'], correct: 2 },
    { q: 'Équation de la fonction réalisée.', type: 'expr', vars: ['A', 'B'], label: 'S1', target: c => NAND_JOBS[c.tp ? c.tp.variant : 0].f }],
  build(c) { NS.layoutIO(c, ['A', 'B'], ['S1'], { xo: 640 }); },
  solve(c, x) { const L = mk(c), v = x.tp.variant; const n = (r, y) => L.p('nand', r, 200 + (r.length > 1 ? 0 : 0), y, { n: 2 });
    if (v === 0) { L.p('nand', 'G1', 200, 130, { n: 2 }); L.p('nand', 'G2', 360, 70, { n: 2 }); L.p('nand', 'G3', 360, 190, { n: 2 }); L.p('nand', 'G4', 520, 130, { n: 2 });
      L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('A', 'S', 'G2', 'E1'); L.w('G1', 'S', 'G2', 'E2'); L.w('B', 'S', 'G3', 'E2'); L.w('G1', 'S', 'G3', 'E1'); L.w('G2', 'S', 'G4', 'E1'); L.w('G3', 'S', 'G4', 'E2'); L.w('G4', 'S', 'S1', 'E'); }
    else { L.p('nand', 'G1', 240, 60, { n: 2 }); L.p('nand', 'G2', 240, 200, { n: 2 }); L.p('nand', 'G3', 420, 130, { n: 2 });
      L.w('A', 'S', 'G1', 'E1'); L.w('A', 'S', 'G1', 'E2'); L.w('B', 'S', 'G2', 'E1'); L.w('B', 'S', 'G2', 'E2'); L.w('G1', 'S', 'G3', 'E1'); L.w('G2', 'S', 'G3', 'E2');
      if (v === 1) L.w('G3', 'S', 'S1', 'E'); else { L.p('nand', 'G4', 580, 130, { n: 2 }); L.w('G3', 'S', 'G4', 'E1'); L.w('G3', 'S', 'G4', 'E2'); L.w('G4', 'S', 'S1', 'E'); } } },
  checks: [noFloat, { label: 'S1 réalise la fonction demandée', run: c => c.eq('S1', NAND_JOBS[c.tp.variant].f) }, { label: 'Uniquement des portes NON-ET', run: c => c.nGates() > 0 && c.onlyGates(['nand']) }, { label: 'Nombre de portes ≤ limite', run: c => c.nGates() <= NAND_JOBS[c.tp.variant].max }],
  correction: '<p>XOR en 4 NON-ET : G1 = A·B inversé ; G2 = NON-ET(A, G1) ; G3 = NON-ET(B, G1) ; S = NON-ET(G2, G3). OU : A+B = NON-ET(Ā, B̄) (3 portes). NON-OU : le OU précédent suivi d\'un inverseur (4 portes).</p>'
});

/* ---- simplification (Boole) */
const SIMP = [
  { f: 'A·B·C + A·B·!C + !A·B·C', max: 3 },
  { f: 'A·!B + A·B + !A·B', max: 1 },
  { f: '!A·!B·C + !A·B·C + A·!B·C + A·B·C', max: 0 }];
regScenario({
  id: 'simplifier', cat: CAT, diff: 2, title: 'Simplifier un schéma', level: LV, duration: '45 min', variants: 3,
  refs: 'Simplification algébrique ; économie de portes', cours: ['boole', 'equation'],
  desc: v => 'Ce schéma réalise <b>S1 = ' + NS.toHTML(NS.parse(SIMP[v].f)) + '</b> avec beaucoup de portes. Trouvez une forme plus simple et <b>refaites le montage avec au plus ' + SIMP[v].max + ' porte' + (SIMP[v].max > 1 ? 's' : '') + '</b>' + (SIMP[v].max === 0 ? ' (un simple fil peut suffire)' : '') + '.',
  objectives: ['Simplifier avec les règles de Boole', 'Vérifier que la fonction est inchangée', 'Mesurer le gain en portes'],
  steps: ['Mettez des termes en facteur : A·B·C + A·B·!C = A·B·(C + !C) = A·B.', 'Écrivez l\'équation simplifiée dans la question.', 'Refaites le schéma, comparez les tables des deux versions.'],
  questions: [{ q: 'Donnez une équation simplifiée de S1.', type: 'expr', vars: ['A', 'B', 'C'], label: 'S1', target: c => SIMP[c.tp ? c.tp.variant : 0].f, minimal: true }],
  build(c, o) { NS.buildAst(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(SIMP[o.variant].f) }] }, { fuse: false }); },
  solve(c, x) { const v = x.tp.variant, T = NS.parse(SIMP[v].f); if (v === 2) { c.parts = c.parts.filter(p => ['switch'].includes(p.type) || p.ref === 'S1'); c.wires = []; c.junctions = []; c.link(c.byRef('C'), 'S', c.byRef('S1'), 'E'); return; }
    NS.synthesize(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', values: NS.tt(T, ['A', 'B', 'C']) }] }, { replace: true }); },
  checks: [noFloat, { label: 'S1 vaut toujours la même fonction', run: c => c.eq('S1', SIMP[c.tp.variant].f) }, { label: 'Nombre de portes réduit (limite de l\'énoncé)', run: c => c.nGates() <= SIMP[c.tp.variant].max }],
  correction: v => '<p>Forme simplifiée : <b>' + NS.toHTML(NS.minimize(['A', 'B', 'C'], NS.tt(NS.parse(SIMP[v].f), ['A', 'B', 'C'])).sop) + '</b>.</p>'
});

/* ---- Karnaugh 3 variables (lecture + groupes) */
const K3 = [[0, 0, 1, 1, 0, 1, 1, 1], [1, 1, 0, 0, 1, 1, 0, 0], [0, 1, 0, 1, 1, 1, 0, 0]];
regScenario({
  id: 'karnaugh3', cat: CAT, diff: 2, title: 'Karnaugh à 3 variables', level: LV, duration: '45 min', variants: 3, dock: 'karnaugh',
  refs: 'Tableau de Karnaugh ; groupements ; équation simplifiée', cours: ['karnaugh'],
  desc: 'Un schéma non simplifié réalise la fonction S1 de 3 variables. Chargez-le dans l\'onglet <b>Karnaugh</b>, faites les <b>groupements</b>, déduisez l\'équation minimale et <b>refaites le schéma</b>.',
  objectives: ['Remplir un tableau de Karnaugh', 'Former les plus gros groupes de 1', 'En déduire une équation minimale puis un schéma'],
  steps: ['Dans l\'onglet Karnaugh, chargez S1 depuis le schéma.', 'Passez en mode « groupes » : entourez les 1 par groupes de 1, 2, 4.', 'Écrivez l\'équation, refaites le circuit avec le moins de portes.'],
  questions: [
    { q: 'Combien de cases à 1 contient le tableau ?', answer: c => c.tt('S1').filter(v => v === 1).length, tol: 0, unit: '' },
    { q: 'Équation minimale de S1.', type: 'expr', vars: ['A', 'B', 'C'], label: 'S1', target: c => NS.toText(NS.exprOfOutput(c.c, 'S1')), minimal: true }],
  build(c, o) { NS.buildAst(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.canonSop(['A', 'B', 'C'], K3[o.variant]) }] }, { fuse: false }); },
  solve(c, x) { NS.synthesize(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', values: K3[x.tp.variant] }] }, { replace: true }); },
  checks: [noFloat, { label: 'S1 inchangée', run: c => c.tt('S1').join('') === K3[c.tp.variant].join('') }, { label: 'Réalisation minimale (nombre de portes de la forme minimale)', run: c => c.nGates() <= NS.minGates(['A', 'B', 'C'], [{ name: 'S1', values: K3[c.tp.variant] }]) }],
  correction: v => '<p>Forme minimale : <b>' + NS.toHTML(NS.minimize(['A', 'B', 'C'], K3[v]).sop) + '</b>. Chaque groupe de 2 cases supprime une variable, chaque groupe de 4 en supprime deux.</p>'
});

/* ---- Karnaugh 4 variables : de la table au schéma */
const K4 = [[0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1], [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0], [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1]];
const mt = a => a.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0).join(', ');
regScenario({
  id: 'karnaugh4', cat: CAT, diff: 3, title: 'Karnaugh à 4 variables : de la table au schéma', level: LV, duration: '1 h', variants: 3, dock: 'karnaugh',
  refs: 'Tableau de Karnaugh à 4 variables ; synthèse d\'un schéma', cours: ['karnaugh', 'conception'],
  desc: v => 'La sortie S1 de 4 entrées A, B, C, D (A poids fort) vaut 1 pour les combinaisons numéros <b>' + mt(K4[v]) + '</b> (A B C D lu en binaire) et 0 sinon. Trouvez l\'équation minimale puis réalisez-la.',
  objectives: ['Passer d\'une liste de combinaisons à un tableau 4×4', 'Utiliser les bords qui se touchent', 'Réaliser le schéma correspondant'],
  steps: ['Ouvrez l\'onglet Karnaugh, entrez les 1 aux numéros indiqués et formez les groupes.', 'Écrivez l\'équation minimale dans la réponse.', 'Câblez-la entre les interrupteurs A à D et S1.'],
  questions: [{ q: 'Équation minimale de S1 (A, B, C, D).', type: 'expr', vars: ['A', 'B', 'C', 'D'], label: 'S1', values: c => K4[c.tp.variant], minimal: true }],
  build(c) { NS.layoutIO(c, ['A', 'B', 'C', 'D'], ['S1'], { xo: 700, y: 60 }); },
  solve(c, x) { NS.synthesize(c, { vars: ['A', 'B', 'C', 'D'], outputs: [{ name: 'S1', values: K4[x.tp.variant] }] }, { replace: true }); },
  checks: [noFloat, { label: 'S1 respecte la table donnée', run: c => c.tt('S1').join('') === K4[c.tp.variant].join('') }, { label: 'Réalisation économe', run: c => c.nGates() <= NS.minGates(['A', 'B', 'C', 'D'], [{ name: 'S1', values: K4[c.tp.variant] }]) }],
  correction: v => '<p>Forme minimale : <b>' + NS.toHTML(NS.minimize(['A', 'B', 'C', 'D'], K4[v]).sop) + '</b>. Pensez que la première et la dernière colonne (ou ligne) sont voisines.</p>'
});

/* ---- Karnaugh avec indifférents : segment « a » d'un afficheur 7 segments (code BCD) */
const SEGA = [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2];
regScenario({
  id: 'indifferents', cat: CAT, diff: 3, title: 'États indifférents : segment « a » d\'un afficheur BCD', level: LV, duration: '1 h', dock: 'karnaugh',
  refs: 'Karnaugh avec cases indifférentes (X) ; décodage BCD → 7 segments', cours: ['karnaugh', 'conception'],
  desc: 'Un chiffre BCD (0 à 9) est présenté sur A B C D (A poids fort). Le segment haut « a » de l\'afficheur doit être allumé pour <b>0, 2, 3, 5, 6, 7, 8, 9</b> et éteint pour 1 et 4. Les codes 10 à 15 n\'arrivent jamais : ce sont des <b>états indifférents (X)</b>.',
  objectives: ['Repérer les états impossibles', 'Les exploiter pour agrandir les groupes', 'Réaliser le décodeur d\'un segment'],
  steps: ['Dans l\'onglet Karnaugh, mettez 1 (ou 0) sur les chiffres 0 à 9 et X sur 10 à 15.', 'Prenez les X dans vos groupes quand cela les agrandit.', 'Câblez l\'équation vers S1 (segment a), puis testez les chiffres 0 à 9.'],
  questions: [{ q: 'Équation minimale du segment a (en utilisant les X).', type: 'expr', vars: ['A', 'B', 'C', 'D'], label: 'S1', values: SEGA, minimal: true }],
  build(c) { NS.layoutIO(c, ['A', 'B', 'C', 'D'], ['S1'], { xo: 700, desc: { A: 'poids 8', B: 'poids 4', C: 'poids 2', D: 'poids 1' }, odesc: { S1: 'segment a' } }); },
  solve(c) { NS.synthesize(c, { vars: ['A', 'B', 'C', 'D'], outputs: [{ name: 'S1', values: SEGA }] }, { replace: true }); },
  checks: [noFloat, { label: 'S1 est juste pour les chiffres 0 à 9', run: c => NS.matchesValues(c.c, 'S1', ['A', 'B', 'C', 'D'], SEGA) }, { label: 'Réalisation économe grâce aux X', run: c => c.nGates() <= NS.minGates(['A', 'B', 'C', 'D'], [{ name: 'S1', values: SEGA }]) }],
  correction: () => '<p>Segment a = <b>' + NS.toHTML(NS.minimize(['A', 'B', 'C', 'D'], SEGA).sop) + '</b> (forme minimale avec les X). Sans X l\'équation serait plus longue.</p>'
});
})(typeof window !== 'undefined' ? window : globalThis);
