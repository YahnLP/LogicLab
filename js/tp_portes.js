/* tp_portes.js — partie 1 : portes logiques */
(function (g) {
'use strict';
const NS = g.NS, { mk, regScenario } = NS;
const CAT = '1 · Portes logiques', LV = 'Bac Pro CIEL (seconde)';
const noFloat = { label: 'Aucune entrée de porte ou de LED laissée en l\'air', run: c => c.floating().length === 0 };
NS.CHK = { noFloat };
/* tables de référence (A poids fort) */
const T2 = { and: [0, 0, 0, 1], or: [0, 1, 1, 1], nand: [1, 1, 1, 0], nor: [1, 0, 0, 0], xor: [0, 1, 1, 0], xnor: [1, 0, 0, 1] };
NS.T2 = T2;
const NOMS = { and: 'ET', or: 'OU', nand: 'NON-ET', nor: 'NON-OU', xor: 'OU exclusif', xnor: 'NON-OU exclusif' };

regScenario({
  id: 'premier', cat: CAT, diff: 1, title: 'Premier circuit : interrupteurs, porte ET, LED', level: LV, duration: '30 min',
  refs: 'Niveaux logiques ; porte ET ; table de vérité à 2 entrées', cours: ['niveaux', 'portes'],
  desc: 'Deux interrupteurs A et B, une porte <b>ET</b> et une LED S1 sont posés sur le schéma mais <b>pas câblés</b>. Vous les reliez, puis vous observez le comportement.',
  objectives: ['Câbler un schéma (tirer un fil d\'une broche à l\'autre)', 'Observer les niveaux 0 / 1 sur les fils', 'Établir la table de vérité d\'une porte ET'],
  steps: ['Reliez A à l\'entrée E1 de la porte, B à l\'entrée E2, puis la sortie de la porte à la LED.', 'Cliquez sur les interrupteurs et observez la couleur des fils et les pastilles 0 / 1.', 'Ouvrez l\'onglet <b>Table de vérité</b> et comparez avec vos observations.', 'Répondez aux questions.'],
  questions: [
    { q: 'Complétez la table de la porte ET (S1 en fonction de A, B).', type: 'table', vars: ['A', 'B'], out: 'S1', answer: T2.and },
    { q: 'Combien d\'entrées doivent valoir 1 pour que la sortie d\'une porte ET vaille 1 ?', type: 'choice', options: ['Au moins une', 'Exactement une', 'Toutes', 'Aucune'], correct: 2 },
    { q: 'Écrivez l\'équation de S1.', type: 'expr', vars: ['A', 'B'], label: 'S1', target: 'A·B' }],
  build(c) { const L = mk(c); L.p('switch', 'A', 60, 90, { desc: 'Entrée A' }); L.p('switch', 'B', 60, 190, { desc: 'Entrée B' }); L.p('and', 'G1', 280, 140, { n: 2 }); L.p('led', 'S1', 480, 140, { color: 'verte' }); },
  solve(c) { const L = mk(c); L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('G1', 'S', 'S1', 'E'); },
  checks: [noFloat, { label: 'S1 = A·B', run: c => c.eq('S1', 'A·B') }, { label: 'Une seule porte ET utilisée', run: c => c.nGates() === 1 && c.count('and') === 1 }],
  correction: '<p>La porte ET ne donne 1 que si <b>A et B</b> valent 1 : table 0, 0, 0, 1. Équation S1 = A·B.</p>'
});

regScenario({
  id: 'et_ou', cat: CAT, diff: 1, title: 'ET contre OU : deux portes, deux comportements', level: LV, duration: '30 min',
  refs: 'Portes ET et OU ; comparaison de tables', cours: ['portes', 'table'],
  desc: 'Les mêmes deux interrupteurs doivent commander <b>deux LED</b> : S1 par une porte ET, S2 par une porte OU.',
  objectives: ['Distinguer ET et OU', 'Alimenter plusieurs portes avec la même entrée (nœud de fils)', 'Remplir deux tables de vérité'],
  steps: ['Câblez A et B sur les deux portes (un fil peut partir d\'un fil existant : cliquez sur le fil pour créer un nœud).', 'Sortie de G1 vers S1, sortie de G2 vers S2.', 'Testez les quatre combinaisons et comparez S1 et S2.'],
  questions: [
    { q: 'Table de S2 (porte OU).', type: 'table', vars: ['A', 'B'], out: 'S2', answer: T2.or },
    { q: 'Pour quelle(s) combinaison(s) de A et B les deux LED sont-elles allumées ?', type: 'choice', options: ['A = 0, B = 0', 'A = 1, B = 0', 'A = 0, B = 1', 'A = 1, B = 1'], correct: 3 },
    { q: 'La LED S2 est allumée si…', type: 'choice', options: ['A et B valent 1', 'A ou B (ou les deux) vaut 1', 'A et B sont différents', 'A et B valent 0'], correct: 1 }],
  build(c) { const L = mk(c); L.p('switch', 'A', 60, 90); L.p('switch', 'B', 60, 220); L.p('and', 'G1', 300, 90, { n: 2 }); L.p('or', 'G2', 300, 230, { n: 2 }); L.p('led', 'S1', 500, 90, { color: 'verte', desc: 'ET' }); L.p('led', 'S2', 500, 230, { color: 'jaune', desc: 'OU' }); },
  solve(c) { const L = mk(c); L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('A', 'S', 'G2', 'E1'); L.w('B', 'S', 'G2', 'E2'); L.w('G1', 'S', 'S1', 'E'); L.w('G2', 'S', 'S2', 'E'); },
  checks: [noFloat, { label: 'S1 = A·B', run: c => c.eq('S1', 'A·B') }, { label: 'S2 = A + B', run: c => c.eq('S2', 'A+B') }],
  correction: '<p>ET : 0 0 0 1. OU : 0 1 1 1. Seule la combinaison A = B = 1 allume les deux LED.</p>'
});

regScenario({
  id: 'inverses', cat: CAT, diff: 1, title: 'NON, NON-ET, NON-OU et OU exclusif', level: LV, duration: '45 min',
  refs: 'Portes NON, NON-ET, NON-OU, OU exclusif ; négation et symbole CEI', cours: ['portes'],
  desc: 'Quatre portes à découvrir : <b>NON</b> (G1, sur A), <b>NON-ET</b> (G2), <b>NON-OU</b> (G3) et <b>OU exclusif</b> (G4). Chacune pilote une LED.',
  objectives: ['Reconnaître les symboles CEI (rond de négation)', 'Établir la table de chaque porte', 'Comparer une porte et son inverse'],
  steps: ['Reliez A à G1 ; A et B aux entrées de G2, G3 et G4.', 'Reliez chaque sortie à sa LED (S1 à S4).', 'Parcourez les quatre combinaisons en observant les quatre LED.'],
  questions: [
    { q: 'Table de S2 (NON-ET).', type: 'table', vars: ['A', 'B'], out: 'S2', answer: T2.nand },
    { q: 'Table de S3 (NON-OU).', type: 'table', vars: ['A', 'B'], out: 'S3', answer: T2.nor },
    { q: 'Table de S4 (OU exclusif).', type: 'table', vars: ['A', 'B'], out: 'S4', answer: T2.xor },
    { q: 'La sortie du OU exclusif vaut 1 quand…', type: 'choice', options: ['A et B valent 1', 'A et B sont différents', 'A et B sont égaux', 'A vaut 0'], correct: 1 },
    { q: 'Que représente le petit rond sur la sortie d\'une porte ?', type: 'choice', options: ['Une entrée supplémentaire', 'Une inversion (négation) de la sortie', 'Une sortie à collecteur ouvert', 'Une porte défectueuse'], correct: 1 }],
  build(c) { const L = mk(c); L.p('switch', 'A', 60, 120); L.p('switch', 'B', 60, 330);
    L.p('not', 'G1', 280, 40); L.p('nand', 'G2', 280, 150, { n: 2 }); L.p('nor', 'G3', 280, 250, { n: 2 }); L.p('xor', 'G4', 280, 350, { n: 2 });
    [['S1', 40], ['S2', 150], ['S3', 250], ['S4', 350]].forEach(([r, y], k) => L.p('led', r, 500, y, { color: ['rouge', 'verte', 'jaune', 'bleue'][k] })); },
  solve(c) { const L = mk(c); L.w('A', 'S', 'G1', 'E'); ['G2', 'G3', 'G4'].forEach(g => { L.w('A', 'S', g, 'E1'); L.w('B', 'S', g, 'E2'); }); ['G1', 'G2', 'G3', 'G4'].forEach((g, k) => L.w(g, 'S', 'S' + (k + 1), 'E')); },
  checks: [noFloat, { label: 'S1 = NON A', run: c => c.eq('S1', '!A') }, { label: 'S2 = NON-ET de A, B', run: c => c.eq('S2', '!(A·B)') }, { label: 'S3 = NON-OU de A, B', run: c => c.eq('S3', '!(A+B)') }, { label: 'S4 = A ⊕ B', run: c => c.eq('S4', 'A⊕B') }],
  correction: '<p>NON-ET : 1 1 1 0 (inverse du ET). NON-OU : 1 0 0 0 (inverse du OU). OU exclusif : 0 1 1 0 (1 si A ≠ B).</p>'
});

regScenario({
  id: 'inconnue', cat: CAT, diff: 2, title: 'Porte inconnue : identifier une boîte noire', level: LV, duration: '30 min', variants: 4,
  refs: 'Identification d\'une fonction logique par essais', cours: ['portes', 'table'],
  desc: 'Une boîte noire <b>F1</b> à deux entrées cache une porte de base. Testez-la, déterminez sa table, puis <b>reproduisez-la avec une vraie porte</b> pour allumer S2 comme S1.',
  objectives: ['Identifier une porte par ses effets', 'Choisir la porte adaptée'],
  steps: ['Faites les quatre essais A, B et notez S1.', 'Ajoutez une porte (G1) en parallèle de F1 qui donne le même résultat.', 'Reliez-la à la LED S2, puis répondez.'],
  questions: [
    { q: 'Table de S1 (boîte noire).', type: 'table', vars: ['A', 'B'], out: 'S1', answer: c => c.tt('S1') },
    { q: 'De quelle porte s\'agit-il ?', type: 'choice', options: ['ET', 'OU', 'OU exclusif', 'NON-ET'], correct: c => ['and', 'or', 'xor', 'nand'].findIndex(k => T2[k].join('') === c.part('F1').p.tt) }],
  build(c, o) { const v = o.variant, L = mk(c); const key = ['and', 'or', 'xor', 'nand'][v]; L.p('switch', 'A', 60, 90); L.p('switch', 'B', 60, 220);
    L.p('blackbox', 'F1', 280, 120, { n: 2, tt: T2[key].join(''), hidden: true }); L.p('led', 'S1', 480, 120, { color: 'verte' }); L.p('led', 'S2', 480, 300, { color: 'jaune' });
    L.w('A', 'S', 'F1', 'E1'); L.w('B', 'S', 'F1', 'E2'); L.w('F1', 'S', 'S1', 'E'); },
  solve(c) { const L = mk(c); const key = ['and', 'or', 'xor', 'nand'].find(k => T2[k].join('') === c.byRef('F1').p.tt); L.p(key, 'G1', 280, 300, { n: 2 }); L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('G1', 'S', 'S2', 'E'); },
  checks: [noFloat, { label: 'S2 donne le même résultat que S1 pour les 4 combinaisons', run: c => { const a = c.outFn('S1'), b = c.outFn('S2'); return !!a && !!b && a.values.join() === b.values.join(); } }, { label: 'La porte G1 (pas la boîte noire) pilote S2', run: c => c.nGates() === 1 }],
  correction: v => '<p>Cette boîte noire est une porte <b>' + NOMS[['and', 'or', 'xor', 'nand'][v]] + '</b>.</p>'
});
})(typeof window !== 'undefined' ? window : globalThis);
