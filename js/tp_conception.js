/* tp_conception.js — partie 4 : conception à partir d'un cahier des charges */
(function (g) {
'use strict';
const NS = g.NS, { regScenario } = NS, { noFloat } = NS.CHK;
const CAT = '4 · Conception', LV = 'Bac Pro CIEL (première / terminale)';
const V3 = ['A', 'B', 'C'];

/* fabrique de TP : spec = { id, title, diff, duration, intro, vars, desc:{}, outs:[{name, f (expression) ou values, desc, kind, params}], maxGates, minimal, steps, correction } */
function design(s) {
  const vars = s.vars, values = s.outs.map(o => o.values || NS.tt(NS.parse(o.f), vars));
  const outSpec = () => s.outs.map((o, i) => ({ name: o.name, values: values[i] }));
  const maxG = () => s.maxGates !== undefined ? s.maxGates : NS.minGates(vars, outSpec());
  const odesc = {}; s.outs.forEach(o => { odesc[o.name] = o.desc; });
  const questions = [];
  s.outs.forEach((o, i) => {
    questions.push({ q: 'Table de vérité de ' + o.name + ' (' + o.desc + ').', type: 'table', vars, out: o.name, answer: values[i] });
    if (s.minimal !== false) questions.push({ q: 'Équation minimale de ' + o.name + '.', type: 'expr', vars, label: o.name, values: values[i], minimal: true });
  });
  (s.extra || []).forEach(q => questions.push(q));
  regScenario({
    id: s.id, cat: CAT, diff: s.diff, title: s.title, level: LV, duration: s.duration, refs: s.refs, cours: ['conception', 'karnaugh'],
    desc: s.intro + '<ul>' + vars.map(v => '<li><b>' + v + '</b> : ' + s.desc[v] + '</li>').join('') + s.outs.map(o => '<li><b>' + o.name + '</b> : ' + o.desc + '</li>').join('') + '</ul>',
    objectives: ['Traduire un cahier des charges en table de vérité', 'Obtenir une équation simple (Karnaugh)', 'Câbler puis tester toutes les combinaisons'].concat(s.obj || []),
    steps: s.steps || ['Écrivez la table de vérité de la (des) sortie(s) à partir de l\'énoncé.', 'Simplifiez (Karnaugh dans l\'onglet dédié).', 'Dessinez et câblez le schéma avec peu de portes.', 'Testez les ' + (1 << vars.length) + ' combinaisons ; vous pouvez comparer avec l\'onglet <b>Concepteur</b>.'],
    questions,
    build(c) { NS.layoutIO(c, vars, s.outs.map(o => o.name), { desc: s.desc, odesc, xo: 640, kind: s.kind, params: s.params, dy: s.outs.length > 1 ? 90 : 80 }); },
    solve(c) { NS.buildAst(c, { vars, outputs: s.outs.map(o => ({ name: o.name, ast: o.f ? NS.parse(o.f) : NS.canonSop(vars, o.values) })) }, { fuse: true }); },
    checks: [noFloat].concat(s.outs.map((o, i) => ({ label: o.name + ' respecte le cahier des charges (' + o.desc + ')', run: c => c.tt(o.name) && c.tt(o.name).join('') === values[i].join('') })), [{ label: 'Réalisation économe (' + (s.maxGates !== undefined ? 'portes : ' + s.maxGates + ' au plus' : 'nombre de portes de la forme simplifiée') + ')', run: c => c.nGates() <= maxG() }]),
    correction: s.correction || (() => '<p>' + s.outs.map((o, i) => o.name + ' = <b>' + NS.toHTML(NS.minimize(vars, values[i]).sop) + '</b>').join(' ; ') + '.</p>')
  });
}

design({
  id: 'alarme', title: 'Alarme d\'une maison', diff: 1, duration: '45 min', refs: 'Cahier des charges → table → équation ; ET / OU', vars: V3,
  intro: 'La sirène doit sonner quand le système est <b>armé</b> et qu\'au moins une ouverture (porte ou fenêtre) est ouverte.',
  desc: { A: 'porte d\'entrée ouverte (1 = ouverte)', B: 'fenêtre ouverte (1 = ouverte)', C: 'système armé (1 = armé)' },
  outs: [{ name: 'S1', f: '(A+B)·C', desc: 'sirène (1 = elle sonne)' }], kind: 'actuator', params: { kind: 'sirène' }
});
design({
  id: 'pompe', title: 'Commande d\'une pompe de cuve', diff: 2, duration: '1 h', refs: 'Automatisme combinatoire ; sécurité', vars: V3,
  intro: 'Une pompe remplit une cuve. Elle démarre si le niveau est bas <b>ou</b> si l\'opérateur la force, mais <b>jamais</b> si le niveau haut est atteint (sécurité débordement).',
  desc: { A: 'capteur de niveau bas (1 = cuve presque vide)', B: 'capteur de niveau haut (1 = cuve pleine)', C: 'marche forcée par l\'opérateur' },
  outs: [{ name: 'S1', f: '(A+C)·!B', desc: 'pompe en marche' }], kind: 'actuator', params: { kind: 'pompe' }
});
design({
  id: 'vote', title: 'Vote à la majorité (2 sur 3)', diff: 2, duration: '1 h', refs: 'Karnaugh 3 variables ; redondance et sûreté', vars: V3,
  intro: 'Trois capteurs redondants surveillent la même grandeur. L\'alarme S1 doit être déclenchée dès que <b>au moins deux capteurs sur trois</b> indiquent un défaut.',
  desc: { A: 'capteur 1 (1 = défaut)', B: 'capteur 2 (1 = défaut)', C: 'capteur 3 (1 = défaut)' },
  outs: [{ name: 'S1', f: 'A·B + A·C + B·C', desc: 'alarme (1 = déclenchée)' }]
});
design({
  id: 'va_et_vient', title: 'Va-et-vient : allumer et éteindre de deux endroits', diff: 2, duration: '45 min', refs: 'OU exclusif ; commande d\'éclairage', vars: ['A', 'B'],
  intro: 'Un couloir a deux interrupteurs, l\'un à chaque bout. Chaque basculement d\'un interrupteur doit <b>changer l\'état</b> de la lampe (et lampe éteinte quand les deux sont en bas).',
  desc: { A: 'interrupteur de gauche', B: 'interrupteur de droite' },
  outs: [{ name: 'S1', f: 'A⊕B', desc: 'lampe du couloir' }], maxGates: 1,
  extra: [{ q: 'Quelle porte réalise directement cette fonction ?', type: 'choice', options: ['ET', 'OU', 'OU exclusif', 'NON-ET'], correct: 2 }]
});
design({
  id: 'demi_add', title: 'Demi-additionneur', diff: 2, duration: '45 min', refs: 'Arithmétique binaire ; circuits combinatoires à deux sorties', vars: ['A', 'B'],
  intro: 'On additionne deux bits A et B. Le circuit donne la <b>somme</b> S1 et la <b>retenue</b> S2 (par exemple 1 + 1 = 10 en binaire : somme 0, retenue 1).',
  desc: { A: 'premier bit', B: 'deuxième bit' },
  outs: [{ name: 'S1', f: 'A⊕B', desc: 'somme' }, { name: 'S2', f: 'A·B', desc: 'retenue' }], maxGates: 2, minimal: false, kind: 'led',
  extra: [{ q: 'Quelle est la somme binaire 1 + 1 ? (deux chiffres, retenue puis somme)', type: 'choice', options: ['01', '10', '11', '00'], correct: 1 }]
});
design({
  id: 'add_complet', title: 'Additionneur complet 1 bit', diff: 3, duration: '1 h 30', refs: 'Additionneur complet ; association de plusieurs portes', vars: V3,
  intro: 'Additionneur de trois bits : A, B et la retenue entrante C. Sorties : <b>somme</b> S1 et <b>retenue sortante</b> S2. Astuce : on peut associer deux demi-additionneurs.',
  desc: { A: 'bit A', B: 'bit B', C: 'retenue entrante' },
  outs: [{ name: 'S1', f: 'A⊕B⊕C', desc: 'somme' }, { name: 'S2', f: 'A·B + C·(A⊕B)', desc: 'retenue sortante' }], maxGates: 5, minimal: false,
  correction: () => '<p>S1 = A ⊕ B ⊕ C (deux OU exclusif) ; S2 = A·B + C·(A ⊕ B) (deux ET et un OU). Total : 5 portes, en réutilisant A ⊕ B.</p>',
  extra: [{ q: 'Combien de portes au minimum avec cette méthode (2 OU exclusif, 2 ET, 1 OU) ?', answer: () => 5, tol: 0 }]
});
})(typeof window !== 'undefined' ? window : globalThis);
