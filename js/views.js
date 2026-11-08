/* views.js — table de vérité du circuit (en direct) et équations (lue sur le schéma, canonique, simplifiée) */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, clear } = NS;
const LV = ['0', '1', '?'];

/* ================= TABLE DE VÉRITÉ ================= */
class TableView {
  constructor(app, root) {
    this.app = app; this.root = root; this.mids = false; this.idx = false; this.dirty = true; this.rowEls = []; this.cur = -1;
    this.bar = h('div.chbar'); this.body = h('div.tblwrap'); root.appendChild(this.bar); root.appendChild(this.body);
  }
  markDirty() { this.dirty = true; }
  render() {
    const c = this.app.circuit, T = this.tbl = NS.circuitTable(c); clear(this.body); clear(this.bar); this.rowEls = []; this.cur = -1;
    this.bar.appendChild(h('label.small', h('input', { type: 'checkbox', checked: this.mids, onchange: e => { this.mids = e.target.checked; this.render(); } }), ' sorties intermédiaires (derrière chaque porte)'));
    this.bar.appendChild(h('label.small', h('input', { type: 'checkbox', checked: this.idx, onchange: e => { this.idx = e.target.checked; this.render(); } }), ' numéros de ligne'));
    this.bar.appendChild(h('span.muted.small', 'Cliquez une ligne pour placer les interrupteurs dans cette position.'));
    if (T.empty) { this.body.appendChild(h('p.muted', 'Placez au moins une entrée (interrupteur) et une sortie (LED, sonde…) pour obtenir la table de vérité du circuit.')); return; }
    if (T.tooMany) { this.body.appendChild(h('p.muted', 'Trop d\'entrées (' + T.vars.length + ') : la table est limitée à ' + NS.MAXVARS + ' variables.')); return; }
    if (T.sequential) this.body.appendChild(h('p.small', { style: { color: '#b45309' } }, '⚠ Le circuit contient une bascule : la table ci-dessous suppose l\'état mémorisé actuel ; un circuit séquentiel ne se décrit pas complètement par une table de vérité.'));
    if (T.conflict) this.body.appendChild(h('p.small', { style: { color: '#b91c1c' } }, '⚠ Deux sorties sont reliées ensemble : certaines lignes sont indéterminées (?).'));
    const head = h('tr', this.idx ? h('th.idx', 'n°') : null, T.vars.map(v => h('th.in', v.name)), T.outs.map(o => h('th.out', o.name)), this.mids ? T.mids.map(m => h('th.mid', m.name)) : null);
    const rows = T.rows.map(r => { const tr = h('tr', { onclick: () => this.setRow(r) }, this.idx ? h('td.idx', r.idx) : null, r.ins.map(v => h('td.in', LV[v])), r.outs.map(v => h('td.out.lv' + (v === 2 ? 'x' : v), LV[v])), this.mids ? r.mids.map(v => h('td.mid.lv' + (v === 2 ? 'x' : v), LV[v])) : null); this.rowEls.push(tr); return tr; });
    this.body.appendChild(h('table.tt', h('thead', head), h('tbody', rows)));
    if (T.mids.length && !this.mids) this.body.appendChild(h('p.small.muted', 'Les colonnes « sorties intermédiaires » montrent le niveau en sortie de chaque porte : cochez la case pour les voir.'));
  }
  setRow(r) {
    let ch = false; this.tbl.vars.forEach((v, i) => { if (v.type === 'switch' && !!v.part.p.on !== !!r.ins[i]) { v.part.p.on = !!r.ins[i]; ch = true; } });
    if (ch) { this.app.changed('param'); this.app.refreshInspector(); }
  }
  /* appelé à chaque image : reconstruit si besoin et surligne la ligne correspondant aux entrées actuelles */
  tick() {
    if (this.root.offsetParent === null) return;
    if (this.dirty) { this.dirty = false; this.render(); }
    const T = this.tbl, sim = this.app.sim; if (!T || !T.rows.length || sim.dirty) return;
    let idx = 0, ok = true; T.vars.forEach(v => { const x = sim.pinVal(v.part, v.pin); if (x === 2) ok = false; idx = (idx << 1) | (x === 1 ? 1 : 0); });
    const k = ok ? idx : -1; if (k !== this.cur) { if (this.cur >= 0 && this.rowEls[this.cur]) this.rowEls[this.cur].classList.remove('cur'); this.cur = k; if (k >= 0 && this.rowEls[k]) this.rowEls[k].classList.add('cur'); }
  }
}
NS.TableView = TableView;

/* ================= ÉQUATIONS ================= */
const mono = x => h('span.eq', { html: x });
class EqView {
  constructor(app, root) { this.app = app; this.root = root; this.dirty = true; this.body = h('div.eqwrap'); root.appendChild(this.body); }
  markDirty() { this.dirty = true; }
  tick() { if (this.root.offsetParent === null) return; if (this.dirty) { this.dirty = false; this.render(); } }
  render() {
    const app = this.app, c = app.circuit, T = NS.circuitTable(c); clear(this.body);
    if (T.empty) { this.body.appendChild(h('p.muted', 'Placez des entrées et des sorties pour voir les équations du circuit.')); return; }
    if (T.tooMany) { this.body.appendChild(h('p.muted', 'Trop d\'entrées pour une analyse complète (maximum ' + NS.MAXVARS + ').')); return; }
    if (T.sequential) this.body.appendChild(h('p.small', { style: { color: '#b45309' } }, '⚠ Circuit avec bascule : les équations ci-dessous ne décrivent que la partie combinatoire.'));
    const gc = NS.gateCount(c);
    T.outs.forEach((o, k) => {
      const vars = T.vars.map(v => v.name), values = T.rows.map(r => r.outs[k]);
      if (values.includes(2)) { this.body.appendChild(h('div.eqblock', h('b', o.name), ' : niveau indéterminé pour certaines entrées (entrée non reliée ou conflit) — complétez le câblage.')); return; }
      const m = NS.minimize(vars, values), read = NS.exprOfPin(c, o.part, o.pin);
      const mint = NS.listTerms(values, 1), maxt = NS.listTerms(values, 0);
      const best = new NS.Circuit(); NS.synthesize(best, { vars, outputs: [{ name: 'S', values }] }, { style: 'andor', replace: true }); const bg = NS.gateCount(best).total;
      const blk = h('div.eqblock', h('div', h('b', o.name), ' = '));
      const rows = [];
      rows.push(['Lue sur le schéma', read ? mono(NS.toHTML(read)) : h('span.muted', 'non disponible (entrée non reliée, boîte noire, bascule ou boucle)')]);
      const gl = t => h('div.gloss', t);
      rows.push(['1ère forme canonique (somme de mintermes)', mint.length ? h('span', mono('Σ(' + mint.join(', ') + ')'), h('br'), mono(NS.toHTML(NS.canonSop(vars, values))), gl('Σ(…) : S vaut 1 pour les lignes n° ' + mint.join(', ') + ' de la table (numéro = combinaison lue en binaire, ' + vars[0] + ' en poids fort). Chaque ligne à 1 donne un produit (ET) de toutes les variables : un minterme. On les relie par des OU.')) : mono('0')]);
      rows.push(['2e forme canonique (produit de maxtermes)', maxt.length ? h('span', mono('Π(' + maxt.join(', ') + ')'), h('br'), mono(NS.toHTML(NS.canonPos(vars, values))), gl('Π(…) : S vaut 0 pour les lignes n° ' + maxt.join(', ') + '. Chaque ligne à 0 donne une somme (OU) de toutes les variables, complémentées si elles valent 1 dans la ligne : un maxterme. On les relie par des ET.')) : mono('1')]);
      rows.push(['Forme simplifiée : somme de produits', mono(NS.toHTML(m.sop))]);
      rows.push(['Forme simplifiée : produit de sommes', mono(NS.toHTML(m.pos))]);
      rows.push(['Portes', 'Votre schéma : ' + gc.total + ' porte(s) · réalisation à deux niveaux de la forme simplifiée : ' + bg + ' porte(s) (pour toutes les sorties du schéma : ' + gc.total + ')']);
      blk.appendChild(h('table.eqt', rows.map(([a, b]) => h('tr', h('th', a), h('td', b)))));
      blk.appendChild(h('div.small', { style: { marginTop: '4px' } }, h('button.small', { title: 'TD : mintermes, maxtermes, Σ et Π', onclick: () => { const td = NS.SCENARIOS.find(x => x.id === 'td_canoniques'); if (td && confirm('Ouvrir le TD remplace le schéma actuel. Continuer ?')) app.loadScenario(td); } }, '📘 Comprendre ces formes (TD)'), ' ', h('button.small', { onclick: () => app.openKarnaugh(o.name) }, '→ Tableau de Karnaugh'), ' ', h('button.small', { onclick: () => app.designer.importCircuit() || app.openDock('designer') }, '→ Concepteur')));
      this.body.appendChild(blk);
    });
  }
}
NS.EqView = EqView;
})(typeof window !== 'undefined' ? window : globalThis);
