/* designer.js — Concepteur : du cahier des charges (table de vérité) au schéma, étape par étape */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, clear } = NS;
const NAMES = ['A', 'B', 'C', 'D'];

class Designer {
  constructor(app, root) {
    this.app = app; this.root = root; this.n = 3; this.vars = NAMES.slice(0, 3); this.outs = [{ name: 'S1', values: new Array(8).fill(0) }]; this.style = 'andor';
    this.body = h('div.dsgwrap'); root.appendChild(this.body); this.render();
  }
  setN(n) { this.n = n; this.vars = NAMES.slice(0, n); this.outs.forEach(o => { o.values = new Array(1 << n).fill(0); }); this.render(); }
  addOut() { if (this.outs.length >= 4) return; this.outs.push({ name: 'S' + (this.outs.length + 1), values: new Array(1 << this.n).fill(0) }); this.render(); }
  load(spec) { this.n = spec.vars.length; this.vars = spec.vars.slice(); this.outs = spec.outputs.map(o => ({ name: o.name, values: o.values.slice() })); this.render(); }
  importCircuit() {
    const T = NS.circuitTable(this.app.circuit); if (T.empty || T.tooMany || T.vars.length > 4) { this.app.toast('Import impossible : il faut de 2 à 4 entrées et au moins une sortie.', 'warn'); return false; }
    this.load({ vars: T.vars.map(v => v.name), outputs: T.outs.map((o, k) => ({ name: o.name, values: T.rows.map(r => r.outs[k]) })) }); return true;
  }
  spec() { return { vars: this.vars, outputs: this.outs.map(o => ({ name: o.name, values: o.values })) }; }
  build(replace) {
    const c = this.app.circuit; this.app.editor.pushUndo(); NS.synthesize(c, this.spec(), { style: this.style, replace }); this.app.changed('structure'); this.app.editor.fit(); this.app.toast('Schéma construit (' + NS.STYLES[this.style] + ').', 'info');
  }
  render() {
    const b = clear(this.body), n = this.n, rows = 1 << n;
    b.appendChild(h('div.chbar', h('span.small', 'Nombre d\'entrées : '), h('select', { onchange: e => this.setN(+e.target.value) }, [2, 3, 4].map(k => h('option', { value: k, selected: k === n }, k))),
      h('button.small', { onclick: () => this.addOut() }, '+ une sortie'), h('button.small', { onclick: () => { this.outs.pop(); if (!this.outs.length) this.addOut(); else this.render(); } }, '− une sortie'),
      h('button.small', { title: 'Reprend la table de vérité du circuit actuel', onclick: () => this.importCircuit() }, '⇩ Depuis le circuit'),
      h('span.muted.small', 'Cliquez une case de sortie : 0 → 1 → X (indifférent).')));
    const head = h('tr', h('th.idx', 'n°'), this.vars.map(v => h('th.in', v)), this.outs.map((o, k) => h('th.out', h('input', { type: 'text', value: o.name, style: { width: '46px' }, onchange: e => { o.name = (e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || o.name); this.render(); } }))));
    const trs = []; for (let i = 0; i < rows; i++) trs.push(h('tr', h('td.idx', i), NS.bits(i, n).map(v => h('td.in', v)), this.outs.map(o => h('td.out.dsgcell.d' + o.values[i], { onclick: () => { o.values[i] = (o.values[i] + 1) % 3; this.render(); } }, o.values[i] === 2 ? 'X' : o.values[i]))));
    b.appendChild(h('table.tt', h('thead', head), h('tbody', trs)));
    this.outs.forEach(o => {
      const m = NS.minimize(this.vars, o.values), mint = NS.listTerms(o.values, 1);
      b.appendChild(h('div.eqblock', h('div', h('b', o.name)),
        h('table.eqt',
          h('tr', h('th', '1ère forme canonique'), h('td', mint.length ? h('span', h('span.eq', 'Σ(' + mint.join(', ') + ')'), h('br'), h('span.eq', { html: NS.toHTML(NS.canonSop(this.vars, o.values)) })) : h('span.eq', '0'))),
          h('tr', h('th', 'Simplifiée (somme de produits)'), h('td', h('span.eq', { html: o.name + ' = ' + NS.toHTML(m.sop) }))),
          h('tr', h('th', 'Simplifiée (produit de sommes)'), h('td', h('span.eq', { html: o.name + ' = ' + NS.toHTML(m.pos) })))),
        this.n >= 2 ? h('button.small', { onclick: () => { this.app.karnaugh.loadFn(this.vars, o.values, { title: o.name }); this.app.openDock('karnaugh'); } }, '→ Karnaugh') : null));
    });
    b.appendChild(h('div.chbar', h('span.small', 'Style du schéma : '), h('select', { onchange: e => { this.style = e.target.value; } }, Object.keys(NS.STYLES).map(k => h('option', { value: k, selected: k === this.style }, NS.STYLES[k]))),
      h('button.primary.small', { onclick: () => this.build(false) }, 'Ajouter le schéma au circuit'), h('button.small', { onclick: () => { if (!this.app.circuit.parts.length || confirm('Remplacer le schéma actuel ?')) this.build(true); } }, 'Remplacer le circuit')));
  }
}
NS.Designer = Designer;
})(typeof window !== 'undefined' ? window : globalThis);
