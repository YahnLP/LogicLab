/* karnaugh.js — tableau de Karnaugh interactif (2 à 4 variables) : remplissage, groupements manuels contrôlés, solution */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, clear } = NS;
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, a, parent, text) => { const e = document.createElementNS(SVGNS, tag); if (a) for (const k in a) e.setAttribute(k, a[k]); if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e; };
const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
const CW = 58, CH = 46, LX = 78, TY = 54;
const bitsStr = a => a.join('');

class KarnaughView {
  constructor(app, root) {
    this.app = app; this.root = root; this.src = 'free'; this.vars = ['A', 'B', 'C']; this.values = new Array(8).fill(0); this.mode = 'fill'; this.sel = new Set(); this.groups = []; this.sol = false; this.locked = false; this.msg = ''; this.title = '';
    this.ctl = h('div.chbar'); this.mapbox = h('div.kmapbox'); this.info = h('div.kinfo'); root.appendChild(this.ctl); root.appendChild(h('div.kwrap', this.mapbox, this.info)); this.build(); this.draw();
  }
  get n() { return this.vars.length; }
  /* sources de la fonction */
  setFree(n) { const names = ['A', 'B', 'C', 'D']; this.src = 'free'; this.vars = names.slice(0, n); this.values = new Array(1 << n).fill(0); this.locked = false; this.reset(); }
  loadFn(vars, values, o) { o = o || {}; if (vars.length < 2 || vars.length > 4) { this.msg = 'Le tableau de Karnaugh gère 2 à 4 variables (ici ' + vars.length + ').'; this.draw(); return; } this.src = o.src || 'fixed'; this.vars = vars.slice(); this.values = values.slice(); this.locked = !!o.locked; this.title = o.title || ''; this.reset(); }
  loadCircuit(name) {
    const f = NS.outputFn(this.app.circuit, name); this.src = 'circuit:' + name;
    if (!f) { this.msg = 'Impossible de lire la sortie ' + name + ' (entrées non reliées ? plus de 4 variables ?).'; this.draw(); return; }
    this.loadFn(f.vars, f.values, { src: 'circuit:' + name, locked: true, title: name });
  }
  /* appelé quand le circuit change et que la source est le circuit */
  refreshFromCircuit() { if (!this.src.startsWith('circuit:')) { this.build(); return; } const f = NS.outputFn(this.app.circuit, this.src.slice(8)); if (f && f.vars.length >= 2 && f.vars.length <= 4 && (f.values.join() !== this.values.join() || f.vars.join() !== this.vars.join())) { this.vars = f.vars; this.values = f.values; this.reset(); } this.build(); }
  reset() { this.sel.clear(); this.groups = []; this.sol = false; this.msg = ''; this.build(); this.draw(); }
  /* ---------- commandes ---------- */
  build() {
    clear(this.ctl); const outs = NS.sinkOuts(this.app.circuit);
    const srcSel = h('select', { onchange: e => { const v = e.target.value; if (v === 'free') this.setFree(this.n >= 2 && this.n <= 4 ? this.n : 3); else this.loadCircuit(v.slice(8)); } },
      h('option', { value: 'free', selected: this.src === 'free' }, 'Tableau libre'), outs.map(o => h('option', { value: 'circuit:' + o.name, selected: this.src === 'circuit:' + o.name }, 'Sortie ' + o.name + ' du circuit')),
      this.src === 'fixed' ? h('option', { value: 'fixed', selected: true }, this.title || 'Fonction proposée') : null);
    this.ctl.appendChild(srcSel);
    if (this.src === 'free') this.ctl.appendChild(h('select', { onchange: e => this.setFree(+e.target.value) }, [2, 3, 4].map(k => h('option', { value: k, selected: this.n === k }, k + ' variables'))));
    this.ctl.appendChild(h('span.seg', ['fill', 'group'].map(m => h('button' + (this.mode === m ? '.on' : ''), { onclick: () => { this.mode = m; this.sel.clear(); this.build(); this.draw(); } }, m === 'fill' ? '✎ Remplir' : '◯ Entourer'))));
    if (this.mode === 'group') this.ctl.appendChild(h('button.small', { onclick: () => this.validate() }, '✔ Valider ce groupement'));
    this.ctl.appendChild(h('button.small', { onclick: () => { this.groups = []; this.sel.clear(); this.sol = false; this.msg = ''; this.draw(); } }, 'Effacer les groupements'));
    this.ctl.appendChild(h('button.small' + (this.sol ? '.on' : ''), { onclick: () => { this.sol = !this.sol; this.draw(); } }, this.sol ? 'Masquer la solution' : '💡 Montrer la solution'));
    if (this.src === 'free') this.ctl.appendChild(h('button.small', { onclick: () => { this.values = new Array(1 << this.n).fill(0); this.groups = []; this.sel.clear(); this.draw(); } }, 'Tout à 0'));
  }
  cellsOf(sel) { return [...sel].sort((a, b) => a - b); }
  validate() {
    const cells = this.cellsOf(this.sel), n = this.n;
    if (!cells.length) { this.msg = 'Cliquez d\'abord les cases du groupement (elles deviennent jaunes), puis validez.'; return this.draw(); }
    if (cells.some(m => this.values[m] === 0)) { this.msg = '✘ Un groupement ne doit contenir que des 1 (ou des X), jamais de 0.'; return this.draw(); }
    if ((cells.length & (cells.length - 1)) !== 0) { this.msg = '✘ Un groupement contient 1, 2, 4, 8 ou 16 cases (une puissance de 2) : ici ' + cells.length + '.'; return this.draw(); }
    const cube = NS.cubeOf(cells, n);
    if (!cube) { this.msg = '✘ Ces cases ne forment pas un rectangle (les bords opposés du tableau se touchent : on peut passer de l\'autre côté).'; return this.draw(); }
    if (this.groups.some(gr => gr.cube.care === cube.care && gr.cube.bits === cube.bits)) { this.msg = 'Ce groupement existe déjà.'; return this.draw(); }
    const prime = NS.isPrime(cube, n, this.values);
    if (!cells.some(m => this.values[m] === 1)) { this.msg = '✘ Ce groupement ne contient aucun 1 : il est inutile.'; return this.draw(); }
    this.groups.push({ cube, cells, prime }); this.sel.clear(); this.msg = prime ? '✔ Groupement valide et maximal.' : '⚠ Groupement valide mais vous pouvez l\'agrandir (il est contenu dans un groupement plus grand).'; this.draw();
  }
  optimal() { const m = NS.minimize(this.vars, this.values); return m; }
  /* groupes affichés : solution ou groupes de l'élève */
  shown() {
    if (!this.sol) return this.groups.map(g1 => ({ cube: g1.cube, cells: g1.cells }));
    const m = this.optimal(); return m.cover.map(cu => ({ cube: cu, cells: NS.cubeCells(cu, this.n).filter(x => this.values[x] !== 0) }));
  }
  expr() { const gs = this.shown(); return NS.sopAst(gs.map(x => x.cube), this.vars); }
  /* ---------- dessin ---------- */
  draw() {
    const n = this.n; if (n < 2 || n > 4) { clear(this.mapbox); this.mapbox.appendChild(h('p.muted', this.msg || 'Choisissez une fonction de 2 à 4 variables.')); clear(this.info); return; }
    const K = NS.kmap(n), W = LX + K.nc * CW + 12, H = TY + K.nr * CH + 12; clear(this.mapbox);
    const s = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'kmap' }); this.mapbox.appendChild(s);
    const rowNames = this.vars.slice(0, K.rv), colNames = this.vars.slice(K.rv);
    sv('line', { x1: 6, y1: 6, x2: LX - 4, y2: TY - 4, class: 'kaxis' }, s); sv('text', { x: LX - 8, y: 20, 'text-anchor': 'end', class: 'klab' }, s, colNames.join('')); sv('text', { x: 10, y: TY - 8, class: 'klab' }, s, rowNames.join(''));
    K.cols.forEach((cc, c) => sv('text', { x: LX + c * CW + CW / 2, y: TY - 10, 'text-anchor': 'middle', class: 'khead' }, s, bitsStr(K.colBits[c])));
    K.rows.forEach((rr, r) => sv('text', { x: LX - 10, y: TY + r * CH + CH / 2 + 5, 'text-anchor': 'end', class: 'khead' }, s, bitsStr(K.rowBits[r])));
    const shown = this.shown();
    for (let r = 0; r < K.nr; r++) for (let c = 0; c < K.nc; c++) {
      const m = K.cell(r, c), v = this.values[m], x = LX + c * CW, y = TY + r * CH;
      const rect = sv('rect', { x, y, width: CW, height: CH, class: 'kcell' + (this.sel.has(m) ? ' ksel' : '') + (v === 1 ? ' k1' : v === 2 ? ' kx' : ''), 'data-m': m }, s);
      sv('text', { x: x + CW / 2, y: y + CH / 2 + 7, 'text-anchor': 'middle', class: 'kval' + (v === 1 ? ' k1' : v === 2 ? ' kx' : '') }, s, v === 2 ? 'X' : String(v));
      sv('text', { x: x + CW - 4, y: y + CH - 4, 'text-anchor': 'end', class: 'kidx' }, s, m);
      rect.addEventListener('click', () => this.clickCell(m));
    }
    shown.forEach((gr, gi) => this.drawGroup(s, K, gr, gi));
    this.drawInfo();
  }
  clickCell(m) {
    if (this.mode === 'fill') { if (this.locked) { this.msg = 'Ce tableau est calculé à partir du circuit : modifiez le circuit (ou choisissez « Tableau libre »).'; return this.draw(); } this.values[m] = (this.values[m] + 1) % 3; this.groups = []; this.msg = ''; this.draw(); }
    else { if (this.sel.has(m)) this.sel.delete(m); else this.sel.add(m); this.sol = false; this.msg = ''; this.draw(); }
  }
  drawGroup(s, K, gr, gi) {
    const col = COLORS[gi % COLORS.length], inset = 4 + (gi % 4) * 3, G = new Set(), pos = gr.cells.map(m => K.pos(m));
    pos.forEach(p => G.add(p.r + ',' + p.c)); const has = (r, c) => G.has(r + ',' + c);
    const fullRows = c => { for (let r = 0; r < K.nr; r++) if (!has(r, c)) return false; return true; }, fullCols = r => { for (let c = 0; c < K.nc; c++) if (!has(r, c)) return false; return true; };
    pos.forEach(({ r, c }) => {
      const x = LX + c * CW, y = TY + r * CH;
      sv('rect', { x: x + 2, y: y + 2, width: CW - 4, height: CH - 4, fill: col, 'fill-opacity': 0.12, stroke: 'none', 'pointer-events': 'none' }, s);
      const top = r > 0 ? !has(r - 1, c) : !(has(K.nr - 1, c) && !fullRows(c)), bot = r < K.nr - 1 ? !has(r + 1, c) : !(has(0, c) && !fullRows(c));
      const lef = c > 0 ? !has(r, c - 1) : !(has(r, K.nc - 1) && !fullCols(r)), rig = c < K.nc - 1 ? !has(r, c + 1) : !(has(r, 0) && !fullCols(r));
      const xa = lef ? x + inset : x, xb = rig ? x + CW - inset : x + CW, ya = top ? y + inset : y, yb = bot ? y + CH - inset : y + CH, st = { stroke: col, 'stroke-width': 2.6, 'stroke-linecap': 'round', fill: 'none', 'pointer-events': 'none' };
      if (top) sv('line', Object.assign({ x1: xa, y1: y + inset, x2: xb, y2: y + inset }, st), s); if (bot) sv('line', Object.assign({ x1: xa, y1: y + CH - inset, x2: xb, y2: y + CH - inset }, st), s);
      if (lef) sv('line', Object.assign({ x1: x + inset, y1: ya, x2: x + inset, y2: yb }, st), s); if (rig) sv('line', Object.assign({ x1: x + CW - inset, y1: ya, x2: x + CW - inset, y2: yb }, st), s);
    });
  }
  drawInfo() {
    const n = this.n, info = clear(this.info), shown = this.shown(), ones = []; this.values.forEach((v, m) => { if (v === 1) ones.push(m); });
    const opt = this.optimal();
    if (this.msg) info.appendChild(h('div.kmsg', this.msg));
    if (this.title) info.appendChild(h('div.small.muted', 'Fonction : ' + this.title + (this.src.startsWith('circuit') ? ' (lue sur le circuit)' : '')));
    const lis = shown.map((gr, gi) => h('li', h('span.kdot', { style: { background: COLORS[gi % COLORS.length] } }), gr.cells.length + ' cases → ', h('span.eq', { html: NS.toHTML(NS.cubeAst(gr.cube, this.vars)) }), !this.sol ? [' ', h('button.small', { onclick: () => { this.groups.splice(gi, 1); this.draw(); } }, '✕')] : null));
    info.appendChild(h('div', h('b', this.sol ? 'Solution minimale :' : 'Vos groupements :'), shown.length ? h('ul.klist', lis) : h('div.muted.small', this.mode === 'group' ? 'Cliquez des cases à entourer, puis « Valider ce groupement ».' : 'Aucun groupement.')));
    const e = NS.sopAst(shown.map(x => x.cube), this.vars);
    if (shown.length) info.appendChild(h('div', h('b', 'Équation : '), h('span.eq', { html: 'S = ' + NS.toHTML(e) })));
    if (!this.sol && this.groups.length) {
      const unc = ones.filter(m => !this.groups.some(gr => gr.cells.includes(m)));
      const lit = this.groups.reduce((a, gr) => a + NS.pop(gr.cube.care), 0), olit = opt.cover.reduce((a, cu) => a + NS.pop(cu.care), 0);
      if (unc.length) info.appendChild(h('div.kstat.warn', 'Il reste ' + unc.length + ' case(s) à 1 non entourée(s) (cases n° ' + unc.join(', ') + ').'));
      else if (this.groups.length === opt.cover.length && lit <= olit) info.appendChild(h('div.kstat.ok', '✔ Tous les 1 sont entourés et la solution est minimale (' + this.groups.length + ' groupement(s)).'));
      else info.appendChild(h('div.kstat.warn', 'Tous les 1 sont entourés, mais ce n\'est pas minimal : il existe une solution avec ' + opt.cover.length + ' groupement(s) et ' + olit + ' variable(s) au total (vous : ' + this.groups.length + ' et ' + lit + ').'));
    }
    info.appendChild(h('div.small.muted', { style: { marginTop: '6px' } }, 'Règles : on entoure des 1 (ou des X) par paquets de 1, 2, 4, 8 ou 16 cases en rectangle ; les bords opposés se touchent ; un 1 peut servir plusieurs fois ; on cherche les paquets les plus grands et le moins de paquets possible. Dans un paquet, seules les variables qui ne changent pas restent dans le terme.'));
  }
}
NS.KarnaughView = KarnaughView;
})(typeof window !== 'undefined' ? window : globalThis);
