/* main.js — démarrage */
(function () {
'use strict';
const NS = window.NS; const { h, $, $$, clear } = NS;
const app = window.__app = new NS.App(); app.init();
$('#btn-scen').onclick = e => app.openTPMenu(e.currentTarget);
/* restauration de la dernière session */
let restored = false;
try {
  const s = JSON.parse(localStorage.getItem('logiclab.v1') || 'null');
  if (s && s.c && s.c.parts && s.c.parts.length) { app.loadCircuit(s.c); app.editor.fit(); restored = true; if (s.tp) { const sc = NS.SCENARIOS.find(x => x.id === s.tp.id); if (sc) { app.tp = { sc, variant: s.tp.variant, started: Date.now(), results: null, qres: {} }; } } }
} catch (e) { /* session illisible : on repart de zéro */ }
app.renderTP();
if (!restored) {
  /* circuit de démonstration : deux interrupteurs, une porte ET, une LED */
  const c = new NS.Circuit(); const L = NS.mk(c);
  L.p('switch', 'A', 60, 100); L.p('switch', 'B', 60, 180); L.p('and', 'G1', 260, 140, { n: 2 }); L.p('led', 'S1', 440, 140, { color: 'verte' });
  L.w('A', 'S', 'G1', 'E1'); L.w('B', 'S', 'G1', 'E2'); L.w('G1', 'S', 'S1', 'E');
  app.loadCircuit(NS.serialize(c)); app.editor.fit();
}
/* aide + symboles + couverture du programme */
$('#btn-help').onclick = () => {
  const ST = { ok: ['✔ simulé', 'st-ok'], part: ['◐ partiel', 'st-part'], no: ['○ prévu', 'st-no'] }; const cov = NS.COVERAGE;
  const rows = cov.items.map(it => h('tr', h('td', it[0]), h('td', it[1]), h('td.' + ST[it[2]][1], ST[it[2]][0]), h('td', it[3] || '')));
  const sym = ['not', 'buf', 'and', 'or', 'nand', 'nor', 'xor', 'xnor'].map(t => { const d = NS.PARTS[t], inst = NS.newInst(t, 0, 0, 's'); inst.ref = ''; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', 90); svg.setAttribute('height', 48); svg.setAttribute('viewBox', '-58 -26 116 52'); svg.setAttribute('class', 'part'); svg.innerHTML = d.symbol(inst); return h('tr', h('td', svg), h('td', h('b', NS.GATES[NS.GATE_OF[t]].name)), h('td', { html: NS.GATES[NS.GATE_OF[t]].rule })); });
  const m = h('div.modal', { onclick: e => { if (e.target === m) m.remove(); } }, h('div',
    h('h2', 'LogicLab — aide'), h('p', 'Simulateur pédagogique de circuits logiques (portes, tables de vérité, Karnaugh, chronogrammes, bascule D) avec TP corrigés automatiquement. Fonctionne hors ligne. Symboles : norme européenne CEI 60617-12 (rectangles).'),
    h('h4', 'Prise en main'), h('ol', h('li', 'Choisissez un composant dans la palette, cliquez dans le schéma pour le placer (R pour pivoter).'), h('li', 'Câblez : tirez depuis une broche vers une autre broche (clic dans le vide = point de passage). Une sortie peut alimenter plusieurs entrées.'), h('li', 'Cliquez sur un interrupteur pour le faire passer de 0 à 1 : les fils deviennent verts (1) ou bleu-gris (0), et chaque broche affiche son niveau.'), h('li', 'Les onglets du bas : chronogramme (signaux dans le temps), table de vérité, équations, tableau de Karnaugh, concepteur (du cahier des charges au schéma).')),
    h('h4', 'Symboles des portes (CEI 60617-12)'), h('table.cov', sym), h('p.small.muted', 'Un petit cercle sur la sortie signifie « inversé » (négation). On rencontre aussi, pour le NON-OU exclusif, le symbole « =1 » avec un cercle ; LogicLab utilise « = ».'),
    h('h4', 'Couverture du programme'), h('p.small.muted', cov.note), h('table.cov', h('tr', h('th', 'Thème'), h('th', 'Notion'), h('th', 'État'), h('th', 'TP')), rows),
    h('h4', 'Limites connues'), h('ul', cov.limits.map(l => h('li', l))), h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button.primary', { onclick: () => m.remove() }, 'Fermer'))));
  document.body.appendChild(m);
};
})();
