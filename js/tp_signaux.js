/* tp_signaux.js — partie 5 : signaux, chronogrammes, bascule D et compteurs */
(function (g) {
'use strict';
const NS = g.NS, { mk, regScenario } = NS, { noFloat } = NS.CHK;
const CAT = '5 · Signaux et bascules', LV = 'Bac Pro CIEL (première / terminale)';
const near = (a, b, tol) => Math.abs(a - b) <= Math.abs(b) * tol;

/* ---- générateur de signaux : période, fréquence, rapport cyclique */
const GEN = [{ f: 4, d: 25 }, { f: 2, d: 75 }, { f: 5, d: 20 }];
regScenario({
  id: 'generateur', cat: CAT, diff: 1, title: 'Générateur de signaux : fréquence et rapport cyclique', level: LV, duration: '45 min', variants: 3, dock: 'chrono',
  refs: 'Signal logique périodique ; période, fréquence, rapport cyclique ; chronogramme', cours: ['signaux'],
  desc: v => 'Une horloge H1 pilote une LED. Réglez-la sur <b>' + GEN[v].f + ' Hz</b> avec un rapport cyclique de <b>' + GEN[v].d + ' %</b>, puis exploitez le chronogramme.',
  objectives: ['Régler un générateur', 'Lire une période et une durée à 1 sur un chronogramme (curseurs A/B)', 'Relier f, T et rapport cyclique'],
  steps: v => ['Double-cliquez sur H1 (ou sélectionnez-la) et réglez la fréquence à ' + GEN[v].f + ' Hz, le rapport cyclique à ' + GEN[v].d + ' %.', 'Ouvrez l\'onglet <b>Chronogramme</b> et placez les curseurs A et B sur deux fronts montants consécutifs pour lire T.', 'Répondez.'],
  questions: [
    { q: 'Période T du signal (en ms)', answer: c => 1000 / GEN[c.tp.variant].f, tol: 0.03, unit: 'ms' },
    { q: 'Durée de l\'état haut (en ms)', answer: c => 1000 / GEN[c.tp.variant].f * GEN[c.tp.variant].d / 100, tol: 0.05, unit: 'ms' },
    { q: 'Relation entre fréquence et période :', type: 'choice', options: ['f = T', 'f = 1 / T', 'f = T²', 'f = 2T'], correct: 1 }],
  build(c) { const L = mk(c); L.p('clock', 'H1', 100, 120, { f: 1, duty: 50, phase: 0 }); L.p('led', 'S1', 320, 120, { color: 'verte' }); L.w('H1', 'S', 'S1', 'E'); },
  solve(c, x) { const d = GEN[x.tp.variant]; c.byRef('H1').p.f = d.f; c.byRef('H1').p.duty = d.d; },
  checks: [{ label: 'Fréquence réglée', run: c => { const m = c.measure('H1', 'S', 4); return !!m && near(m.f, GEN[c.tp.variant].f, 0.05); } }, { label: 'Rapport cyclique réglé (± 3 %)', run: c => { const m = c.measure('H1', 'S', 4); return !!m && Math.abs(m.duty * 100 - GEN[c.tp.variant].d) <= 3; } }],
  correction: v => '<p>T = 1/f = ' + (1000 / GEN[v].f) + ' ms ; durée à 1 = T × ' + GEN[v].d + ' % = ' + (1000 / GEN[v].f * GEN[v].d / 100) + ' ms.</p>'
});

/* ---- portes en régime dynamique : deux horloges */
regScenario({
  id: 'horloges', cat: CAT, diff: 2, title: 'Deux horloges, trois portes', level: LV, duration: '1 h', dock: 'chrono',
  refs: 'Portes combinatoires appliquées à des signaux ; lecture d\'un chronogramme', cours: ['signaux', 'portes'],
  desc: 'H1 (2 Hz) et H2 (1 Hz), toutes deux à 50 %, entrent dans une porte ET (S1). Ajoutez une porte <b>OU</b> (S2) et une porte <b>OU exclusif</b> (S3) sur les mêmes entrées et comparez les <b>rapports cycliques</b> avec le chronogramme.',
  objectives: ['Prévoir un chronogramme de sortie', 'Constater qu\'une porte combinatoire suit ses entrées à chaque instant'],
  steps: ['Ajoutez G2 (OU) et G3 (OU exclusif), reliez chacune à H1, H2 et à une LED (S2, S3 à poser).', 'Ouvrez le chronogramme, fenêtre 2 s : lisez la durée à 1 de chaque sortie sur une période de H2.', 'Répondez.'],
  questions: [
    { q: 'Rapport cyclique de S1 (ET), en %', answer: () => 25, tol: 0.15, unit: '%' }, { q: 'Rapport cyclique de S2 (OU), en %', answer: () => 75, tol: 0.1, unit: '%' }, { q: 'Rapport cyclique de S3 (OU exclusif), en %', answer: () => 50, tol: 0.1, unit: '%' }],
  build(c) { const L = mk(c); L.p('clock', 'H1', 80, 100, { f: 2, duty: 50 }); L.p('clock', 'H2', 80, 220, { f: 1, duty: 50 }); L.p('and', 'G1', 300, 160, { n: 2 }); L.p('led', 'S1', 480, 160, { color: 'verte' });
    L.w('H1', 'S', 'G1', 'E1'); L.w('H2', 'S', 'G1', 'E2'); L.w('G1', 'S', 'S1', 'E'); },
  solve(c) { const L = mk(c); L.p('or', 'G2', 300, 280, { n: 2 }); L.p('xor', 'G3', 300, 400, { n: 2 }); L.p('led', 'S2', 480, 280, { color: 'jaune' }); L.p('led', 'S3', 480, 400, { color: 'bleue' });
    ['G2', 'G3'].forEach(g => { L.w('H1', 'S', g, 'E1'); L.w('H2', 'S', g, 'E2'); }); L.w('G2', 'S', 'S2', 'E'); L.w('G3', 'S', 'S3', 'E'); },
  checks: [noFloat, { label: 'S2 = OU de H1 et H2 (≈ 75 % à 1)', run: c => { const m = c.measure('G2', 'S', 8); return c.count('or') === 1 && !!m && Math.abs(m.duty - 0.75) < 0.05; } }, { label: 'S3 = OU exclusif de H1 et H2 (≈ 50 % à 1)', run: c => { const m = c.measure('G3', 'S', 8); return c.count('xor') === 1 && !!m && Math.abs(m.duty - 0.5) < 0.05; } }],
  correction: '<p>Sur une période de H2 (1 s) : H1 est à 1 de 0 à 0,25 s et de 0,5 à 0,75 s ; H2 de 0 à 0,5 s. ET : 0 → 0,25 s (25 %). OU : 0 → 0,75 s (75 %). OU exclusif : 0,25 → 0,75 s (50 %).</p>'
});

/* ---- compteur de combinaisons + décodage */
regScenario({
  id: 'combinaisons', cat: CAT, diff: 2, title: 'Détecter une combinaison avec un compteur', level: LV, duration: '1 h', dock: 'chrono',
  refs: 'Générateur de combinaisons ; décodage d\'une combinaison ; chronogramme', cours: ['signaux', 'equation'],
  desc: 'Le générateur de combinaisons N1 compte de 000 à 111 (A = poids fort) à 1 Hz, puis recommence. Réalisez un montage qui allume S1 <b>uniquement pour la combinaison 101</b> (A = 1, B = 0, C = 1).',
  objectives: ['Décoder une combinaison avec ET et NON', 'Voir comment une impulsion apparaît une fois par cycle'],
  steps: ['Décrivez 101 par une équation : A·!B·C.', 'Câblez les portes entre N1 et S1.', 'Ouvrez le chronogramme (fenêtre 16 s) et mesurez la durée à 1 de S1.'],
  questions: [{ q: 'Durée du cycle complet du compteur (en s)', answer: () => 8, tol: 0.02, unit: 's' }, { q: 'Pendant combien de secondes S1 est-elle allumée par cycle ?', answer: () => 1, tol: 0.05, unit: 's' }, { q: 'Équation de S1', type: 'expr', vars: ['A', 'B', 'C'], label: 'S1', target: 'A·!B·C' }],
  build(c) { const L = mk(c); L.p('cnt', 'N1', 80, 160, { bits: 3, f: 1 }); L.p('led', 'S1', 560, 160, { color: 'verte' }); },
  solve(c) { const L = mk(c); L.p('not', 'G1', 280, 190); L.p('and', 'G2', 420, 160, { n: 3 }); L.w('N1', 'B', 'G1', 'E'); L.w('N1', 'A', 'G2', 'E1'); L.w('G1', 'S', 'G2', 'E2'); L.w('N1', 'C', 'G2', 'E3'); L.w('G2', 'S', 'S1', 'E'); },
  checks: [noFloat, { label: 'S1 = A·!B·C', run: c => c.eq('S1', 'A·!B·C') }, { label: 'S1 est à 1 pendant 1/8 du cycle', run: c => { const m = c.measure('S1', 'E', 16) || c.measure('G2', 'S', 16); return !!m && Math.abs(m.duty - 0.125) < 0.02; } }],
  correction: '<p>S1 = A·!B·C : un ET à trois entrées avec B inversé. Une combinaison sur huit → 1/8 du cycle, soit 1 s sur 8 s.</p>'
});

/* ---- bascule D en diviseur par 2 */
regScenario({
  id: 'div2', cat: CAT, diff: 2, title: 'Bascule D : diviseur de fréquence par 2', level: LV, duration: '45 min', dock: 'chrono',
  refs: 'Logique séquentielle ; bascule D ; front montant ; division de fréquence', cours: ['bascule', 'signaux'],
  desc: 'Une horloge H1 (4 Hz) et une bascule D (FF1) sont posées. Câblez la bascule en <b>diviseur par 2</b> : l\'horloge sur CLK, NQ rebouclée sur D, Q vers la LED S1.',
  objectives: ['Comprendre l\'échantillonnage sur front montant', 'Obtenir un signal de fréquence moitié'],
  steps: ['H1 → CLK de FF1.', 'NQ de FF1 → D de FF1 (la bascule change d\'état à chaque front).', 'Q → S1, LED de contrôle.', 'Comparez H1 et Q dans le chronogramme.'],
  questions: [{ q: 'Fréquence de Q (en Hz)', answer: c => c.part('H1').p.f / 2, tol: 0.03, unit: 'Hz' }, { q: 'Sur quel événement la bascule D mémorise-t-elle D ?', type: 'choice', options: ['Front descendant de CLK', 'Front montant de CLK', 'Niveau haut de D', 'À tout moment'], correct: 1 }],
  build(c) { const L = mk(c); L.p('clock', 'H1', 80, 150, { f: 4, duty: 50 }); L.p('dff', 'FF1', 300, 150, {}); L.p('led', 'S1', 520, 130, { color: 'verte', desc: 'Q' }); },
  solve(c) { const L = mk(c); L.w('H1', 'S', 'FF1', 'CLK'); L.w('FF1', 'NQ', 'FF1', 'D', [[400, 230], [200, 230], [200, 130]]); L.w('FF1', 'Q', 'S1', 'E'); },
  checks: [noFloat, { label: 'Q change à chaque front montant de H1 : f(Q) = f(H1)/2', run: c => { const m = c.measure('FF1', 'Q', 6); return !!m && near(m.f, c.part('H1').p.f / 2, 0.05); } }, { label: 'Rapport cyclique de Q ≈ 50 %', run: c => { const m = c.measure('FF1', 'Q', 6); return !!m && Math.abs(m.duty - 0.5) < 0.05; } }],
  correction: '<p>À chaque front montant, D = NQ = l\'inverse de Q : Q bascule. Q monte une fois tous les deux fronts de H1 : f(Q) = 2 Hz, rapport cyclique 50 %.</p>'
});

/* ---- compteur 2 bits */
regScenario({
  id: 'compteur', cat: CAT, diff: 3, title: 'Compteur asynchrone 2 bits (÷ 4)', level: LV, duration: '1 h 15', dock: 'chrono',
  refs: 'Compteur binaire à bascules D ; division par 4 ; chronogramme', cours: ['bascule', 'signaux'],
  desc: 'Deux bascules en cascade forment un compteur : FF1 est cadencée par H1 (8 Hz), FF2 par la sortie Q de FF1. Chaque bascule a sa NQ rebouclée sur D. Les LED S1 et S2 montrent Q1 et Q2.',
  objectives: ['Mettre deux diviseurs par 2 en cascade', 'Lire le code binaire de 2 bits dans le chronogramme'],
  steps: ['Câblez FF1 comme au TP précédent (H1 → CLK, NQ → D).', 'Q de FF1 → CLK de FF2 ; NQ de FF2 → D de FF2.', 'Q1 → S1, Q2 → S2.', 'Affichez H1, Q1, Q2 et lisez les 4 états.'],
  questions: [{ q: 'Fréquence de Q1 (en Hz)', answer: () => 4, tol: 0.03, unit: 'Hz' }, { q: 'Fréquence de Q2 (en Hz)', answer: () => 2, tol: 0.03, unit: 'Hz' }, { q: 'Combien d\'états différents le compteur 2 bits parcourt-il avant de recommencer ?', type: 'choice', options: ['2', '3', '4', '8'], correct: 2 }],
  build(c) { const L = mk(c); L.p('clock', 'H1', 60, 150, { f: 8, duty: 50 }); L.p('dff', 'FF1', 280, 150, {}); L.p('dff', 'FF2', 520, 150, {}); L.p('led', 'S1', 740, 130, { color: 'verte', desc: 'Q1' }); L.p('led', 'S2', 740, 250, { color: 'jaune', desc: 'Q2' }); },
  solve(c) { const L = mk(c); L.w('H1', 'S', 'FF1', 'CLK'); L.w('FF1', 'NQ', 'FF1', 'D', [[380, 230], [180, 230], [180, 130]]); L.w('FF1', 'Q', 'FF2', 'CLK'); L.w('FF2', 'NQ', 'FF2', 'D', [[620, 230], [420, 230], [420, 130]]); L.w('FF1', 'Q', 'S1', 'E'); L.w('FF2', 'Q', 'S2', 'E'); },
  checks: [noFloat, { label: 'Q1 : f = f(H1)/2', run: c => { const m = c.measure('FF1', 'Q', 6); return !!m && near(m.f, c.part('H1').p.f / 2, 0.05); } }, { label: 'Q2 : f = f(H1)/4', run: c => { const m = c.measure('FF2', 'Q', 8); return !!m && near(m.f, c.part('H1').p.f / 4, 0.05); } }],
  correction: '<p>Chaque bascule divise par 2 : Q1 = 4 Hz, Q2 = 2 Hz. Le couple (Q2 Q1) parcourt quatre états (compte à rebours 00, 11, 10, 01 pour ce montage à horloge croisée sur Q), puis recommence.</p>'
});
})(typeof window !== 'undefined' ? window : globalThis);
