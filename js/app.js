/* app.js — application : boucle de simulation, palette, inspecteur, panneaux, TP, fichiers (même organisation qu'ElectroLab) */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, $, $$, clear, PARTS, CATS, fmt } = NS;
const LS = 'logiclab.v1';
const LV = ['0 (niveau bas)', '1 (niveau haut)', '? (indéterminé)'];
const plain = v => NS.fmt(v, '', 4).trim().replace(' ', '');

class App {
  constructor() {
    this.circuit = new NS.Circuit(); this.sim = new NS.Sim(this.circuit); this.opts = { levels: true }; this.teacher = false; this.speed = 1; this.running = true; this.tp = null; this.saveT = null; this.answers = {};
    this.sim.onEvent = e => this.log((e.type === 'warn' ? '⚠ ' : '') + e.msg, e.type === 'warn' ? 'warn' : 'info');
  }
  init() {
    this.editor = new NS.Editor(this); this.buildPalette();
    this.chrono = new NS.Chrono(this, $('#pane-chrono')); this.tableView = new NS.TableView(this, $('#pane-table')); this.eqView = new NS.EqView(this, $('#pane-eq'));
    this.karnaugh = new NS.KarnaughView(this, $('#pane-karnaugh')); this.designer = new NS.Designer(this, $('#pane-designer'));
    this.render(); this.bindUI(); this.logLines = [];
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  }
  /* ---------------- boucle ---------------- */
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.1, (ts - this.last) / 1000); this.last = ts;
    if (this.running && this.circuit.parts.length) { try { this.sim.advance(dt * this.speed, 400); } catch (e) { console.error(e); this.running = false; this.toast('Erreur de simulation : ' + e.message, 'err'); } }
    else if (this.sim.dirty) this.sim.refresh();
    this.editor.dyn(); this.chrono.draw(); this.tableView.tick(); this.eqView.tick();
    $('#simtime').textContent = 't = ' + this.sim.t.toFixed(3) + ' s';
    const wb = $('#simwarn'); const w = this.sim.warn; wb.style.display = w ? '' : 'none'; if (w) wb.textContent = '⚠ ' + w;
    if (!this._fl || ts - this._fl > 500) { this._fl = ts; const fl = this.sim.dirty ? [] : this.sim.floating().filter(f => f.part.type !== 'label'); const bn = $('#banner'); bn.style.display = fl.length ? '' : 'none'; if (fl.length) bn.textContent = fl.length + ' entrée(s) non reliée(s) (niveau « ? ») : ' + fl.slice(0, 4).map(f => (f.part.ref || f.part.type) + '.' + f.pin).join(', ') + (fl.length > 4 ? '…' : ''); }
  }
  toggleRun() { this.running = !this.running; $('#btn-run').textContent = this.running ? '⏸ Pause' : '▶ Lecture'; }
  setSpeed(v) { this.speed = Math.pow(10, (v - 50) / 25); const s = this.speed; $('#speedv').textContent = '×' + (s >= 10 ? Math.round(s) : s >= 1 ? s.toFixed(1).replace('.0', '') : s.toFixed(2).replace(/0+$/, '')); }
  /* recalcule immédiatement après une action de l'élève (même en pause) */
  poke() { this.sim.invalidate(); this.sim.refresh(); }
  /* ---------------- circuit ---------------- */
  loadCircuit(o, keepUndo) {
    this.circuit = NS.deserialize(o); this.sim.c = this.circuit; this.sim.sigs = []; this.sim.invalidate(); this.sim.t = 0; this.sim.events = []; this.editor.sel = null; this.editor.selWire = null; if (!keepUndo) this.editor.undoStack = [];
    this.editor.render(); this.onSelect(null); this.syncViews(); this.saveSoon();
  }
  newCircuit() { this.tp = null; this.loadCircuit({ parts: [], wires: [], junctions: [] }); this.renderTP(); }
  changed(kind) { this.sim.invalidate(); if (kind === 'structure' || kind === 'wire' || kind === 'geometry') this.editor.render(); this.poke(); this.syncViews(); this.saveSoon(); }
  syncViews() { this.tableView.markDirty(); this.eqView.markDirty(); if (this.karnaugh) this.karnaugh.refreshFromCircuit(); }
  saveSoon() { clearTimeout(this.saveT); this.saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify({ c: NS.serialize(this.circuit), tp: this.tp ? { id: this.tp.sc.id, variant: this.tp.variant } : null })); } catch (e) { } }, 400); }
  render() { this.editor.render(); }
  log(msg, cls) { const box = $('#pane-log'); if (!box) return; const d = h('div.logline.' + (cls || 'info'), h('span.muted.mono', '[' + this.sim.t.toFixed(2) + ' s] '), msg); box.appendChild(d); box.parentNode.scrollTop = 1e9; while (box.children.length > 200) box.removeChild(box.firstChild); }
  toast(msg, cls) { this.log(msg, cls === 'err' ? 'burn' : cls); }
  resetSim() { this.sim.reset(); this.sim.refresh(); this.chrono.cur = [null, null]; this.log('Simulation réinitialisée (temps à zéro, bascules à 0, chronogramme effacé)', 'info'); }
  openDock(name) { $$('.dtab').forEach(x => x.classList.toggle('on', x.dataset.dock === name)); $$('.pane').forEach(p => { p.style.display = p.id === 'pane-' + name ? '' : 'none'; }); const d = $('#dock'); if (d.classList.contains('min')) d.classList.remove('min'); if (name === 'table') this.tableView.markDirty(); if (name === 'eq') this.eqView.markDirty(); }
  openKarnaugh(outName) { this.karnaugh.loadCircuit(outName); this.openDock('karnaugh'); }
  /* ---------------- palette ---------------- */
  buildPalette() {
    const pal = clear($('#palette')); const q = h('input', { type: 'search', placeholder: 'Rechercher un composant…', style: { width: '100%', marginBottom: '6px' } }); pal.appendChild(q); const items = [];
    CATS.forEach((cat, ci) => {
      const det = h('details', { open: ci < 5 }, h('summary', cat));
      Object.keys(PARTS).filter(t => PARTS[t].cat === ci).forEach(t => {
        const d = PARTS[t]; const inst = NS.newInst(t, 0, 0, 'pv'); inst.ref = ''; let [x1, y1, x2, y2] = NS.extOf(inst) || [-24, -18, 24, 18]; NS.pinsOf(inst).forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); });
        const w = x2 - x1 + 12, hh = y2 - y1 + 12, sc = Math.min(1, 34 / hh, 56 / w); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', Math.round(w * sc)); svg.setAttribute('height', Math.round(hh * sc)); svg.setAttribute('viewBox', `${x1 - 6} ${y1 - 6} ${w} ${hh}`); svg.setAttribute('class', 'part');
        svg.innerHTML = d.symbol(inst);
        const b = h('button.pal-item', { 'data-type': t, title: d.label, onclick: () => this.editor.arm(t) }, h('span', { style: { width: '58px', display: 'inline-flex', justifyContent: 'center' } }, svg), h('span.pl', d.label)); det.appendChild(b); items.push([b, det, d.label.toLowerCase()]);
      });
      pal.appendChild(det);
    });
    q.addEventListener('input', () => { const s = q.value.trim().toLowerCase(); items.forEach(([b, det, l]) => { b.style.display = !s || l.includes(s) ? '' : 'none'; if (s) det.open = true; }); });
  }
  /* ---------------- inspecteur ---------------- */
  onSelect(inst) { this.selected = inst; this.refreshInspector(); }
  refreshInspector(soft) {
    const box = $('#inspector'); if (soft && box.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') return;
    clear(box); const inst = this.selected && this.circuit.part(this.selected.id);
    if (!inst) { box.appendChild(h('div', h('h3', 'Aucune sélection'), h('p.muted', 'Choisissez un composant dans la palette, cliquez dans le schéma pour le placer, puis tirez un fil d\'une broche à l\'autre. Cliquez un interrupteur pour le faire passer de 0 à 1.'), h('p.muted.small', 'Raccourcis : R pivoter · Suppr effacer · Ctrl+Z annuler · Espace pause · molette zoom · glisser le fond pour déplacer la vue. Le fil est vert à 1, bleu-gris à 0, pointillé orange si le niveau est indéterminé (?).'))); return; }
    const d = PARTS[inst.type];
    box.appendChild(h('h3', (inst.ref || d.label) + ' — ', h('span.muted', d.label)));
    if (!d.noLabel) box.appendChild(h('div.field', h('label', 'Repère'), h('input', { type: 'text', value: inst.ref, onchange: e => { const v = e.target.value.trim(); if (!v) { e.target.value = inst.ref; return; } if (this.circuit.parts.some(p => p !== inst && p.ref === v)) { this.toast('Le repère « ' + v + ' » existe déjà.', 'warn'); e.target.value = inst.ref; return; } inst.ref = v; if (['switch', 'button', 'led', 'probe', 'actuator', 'seq'].includes(inst.type) && !/^[A-Za-z][0-9]*$/.test(v)) this.toast('Pour les équations, utilisez une lettre éventuellement suivie de chiffres (A, B, S1…).', 'warn'); this.editor.render(); this.changed('param'); } })));
    if (inst.p.hidden && !this.teacher) box.appendChild(h('p.muted', 'Fonction masquée : testez la boîte noire en changeant ses entrées et observez sa sortie.')); else d.fields.forEach(f => box.appendChild(this.fieldRow(inst, f)));
    this.levelsPanel(box, inst);
    box.appendChild(h('div', { style: { marginTop: '12px', display: 'flex', gap: '6px' } }, h('button', { onclick: () => this.editor.rotate() }, '⟳ Pivoter'), h('button', { onclick: () => this.editor.removePart(inst) }, '🗑 Supprimer')));
  }
  /* niveaux logiques de chaque broche + fonction locale d'une porte */
  levelsPanel(box, inst) {
    const sim = this.sim; if (sim.dirty) return; const pins = NS.pinsOf(inst), G = NS.GATE_OF[inst.type];
    box.appendChild(h('h4', 'Niveaux logiques en ce moment'));
    const kv = h('div.kv'); pins.forEach((pin, i) => { const v = sim.pinVal(inst, i); kv.appendChild(h('span', pin.n + (pin.dir === 'out' ? ' (sortie)' : ' (entrée)'))); kv.appendChild(h('span.lvt.lv' + (v === 2 ? 'x' : v), LV[v])); }); box.appendChild(kv);
    if (G) {
      const gd = NS.GATES[G]; box.appendChild(h('div.learn', { html: '<b>' + gd.name + '</b> : ' + gd.rule }));
      const nIn = pins.filter(p => p.dir === 'in').length; if (nIn <= 3) {
        const cur = pins.map((p, i) => p.dir === 'in' ? sim.pinVal(inst, i) : null).filter(v => v !== null).join('');
        const rows = []; for (let k = 0; k < (1 << nIn); k++) { const b = NS.bits(k, nIn), o = NS.gate3(G, b); rows.push(h('tr' + (b.join('') === cur ? '.cur' : ''), b.map(x => h('td.in', x)), h('td.out', o))); }
        box.appendChild(h('table.tt.mini', h('thead', h('tr', pins.filter(p => p.dir === 'in').map(p => h('th.in', p.n)), h('th.out', 'S'))), h('tbody', rows)));
      }
    }
    if (inst.type === 'dff') box.appendChild(h('div.learn', { html: '<b>Bascule D</b> : à chaque <b>front montant</b> de CLK (passage de 0 à 1), Q prend la valeur de D et la garde jusqu\'au front suivant. Q̄ est l\'inverse de Q. À la mise sous tension Q = 0.' }));
    if (inst.type === 'blackbox' && this.teacher) { const n = Math.max(1, Math.min(4, +inst.p.n || 2)); const rows = []; for (let k = 0; k < (1 << n); k++) rows.push(h('tr', NS.bits(k, n).map(x => h('td.in', x)), h('td.out', String(inst.p.tt || '')[k] || '?'))); box.appendChild(h('table.tt.mini', h('tbody', rows))); }
  }
  fieldRow(inst, f) {
    const p = inst.p; let ctl; const done = () => { this.changed('param'); this.editor.render(); };
    if (f.kind === 'text') ctl = h('input', { type: 'text', value: p[f.k] == null ? '' : String(p[f.k]), style: { width: '100%' }, onchange: e => { let v = e.target.value; if (f.k === 'pattern') { v = v.replace(/[^01]/g, '') || '0'; e.target.value = v; } if (f.k === 'tt') { v = v.replace(/[^01]/g, ''); e.target.value = v; } p[f.k] = v; done(); } });
    else if (f.kind === 'bool') ctl = h('input', { type: 'checkbox', checked: !!p[f.k], onchange: e => { p[f.k] = e.target.checked; done(); this.refreshInspector(); } });
    else if (f.kind === 'sel') ctl = h('select', { onchange: e => { const raw = e.target.value; const idx = f.opts.map(String).indexOf(raw); p[f.k] = f.opts[idx]; if (f.k === 'n' || f.k === 'bits') { this.pruneWires(inst); } done(); this.refreshInspector(); } }, f.opts.map((o, i) => h('option', { value: String(o), selected: String(p[f.k]) === String(o) }, f.labels ? f.labels[i] : o)));
    else {
      const txt = h('input', { type: 'text', value: plain(p[f.k]), onchange: e => { const v = NS.parseVal(e.target.value); if (isNaN(v) || v < f.min || v > f.max) { e.target.value = plain(p[f.k]); this.toast('Valeur hors limites (' + plain(f.min) + ' – ' + plain(f.max) + ' ' + f.unit + ')', 'warn'); return; } p[f.k] = v; if (slider) slider.value = f.log ? Math.log10(v) : v; done(); } });
      let slider = null; if (f.slider) { const lg = f.log; slider = h('input', { type: 'range', min: lg ? Math.log10(f.min) : f.min, max: lg ? Math.log10(f.max) : f.max, step: lg ? 0.01 : f.step, value: lg ? Math.log10(p[f.k]) : p[f.k], oninput: e => { const v = lg ? Math.pow(10, +e.target.value) : +e.target.value; p[f.k] = lg ? +v.toPrecision(3) : v; txt.value = plain(p[f.k]); this.changed('param'); } }); }
      ctl = h('div', { style: { display: 'flex', gap: '4px', flexDirection: slider ? 'column' : 'row', alignItems: slider ? 'stretch' : 'center' } }, h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, txt, h('span.unit', f.unit || '')), slider);
    }
    return h('div.field', h('label', f.label), ctl);
  }
  /* quand le nombre de broches diminue, on retire les fils qui pointent vers des broches disparues */
  pruneWires(inst) {
    setTimeout(() => { const n = NS.pinsOf(inst).length; this.circuit.wires = this.circuit.wires.filter(w => !([w.a, w.b].some(e => e.c === inst.id && e.p >= n))); this.editor.render(); this.changed('structure'); }, 0);
  }
  /* ---------------- options ---------------- */
  setTeacher(on) {
    this.teacher = !!on; $('#opt-teacher').checked = this.teacher; const b = $('#btn-lock'); if (b) b.textContent = this.teacher ? '🔓 PIN…' : (NS.Teacher.hasPin() ? '🔒' : '🔑');
    this.editor.render(); this.refreshInspector(); this.renderTP();
  }
  bindUI() {
    $('#btn-run').onclick = () => this.toggleRun(); $('#btn-reset').onclick = () => this.resetSim();
    const spd = $('#speed'); spd.value = 50; spd.oninput = () => this.setSpeed(+spd.value); this.setSpeed(50);
    $('#opt-levels').onchange = e => { this.opts.levels = e.target.checked; };
    $('#opt-teacher').onchange = e => {
      if (e.target.checked && NS.Teacher.hasPin()) { e.target.checked = false; NS.Teacher.ask(ok => { if (ok) this.setTeacher(true); }); return; }
      this.setTeacher(e.target.checked);
    };
    $('#btn-lock').textContent = NS.Teacher.hasPin() ? '🔒' : '🔑';
    $('#btn-lock').onclick = () => { if (this.teacher) NS.Teacher.menu(this); else if (NS.Teacher.hasPin()) NS.Teacher.ask(ok => { if (ok) this.setTeacher(true); }); else NS.Teacher.menu(this); };
    $$('.tool').forEach(b => b.onclick = () => this.editor.setTool(b.dataset.tool)); $('#btn-rot').onclick = () => this.editor.rotate(); $('#btn-undo').onclick = () => this.editor.undo();
    $('#btn-fit').onclick = () => this.editor.fit(); $('#btn-new').onclick = () => { if (!this.circuit.parts.length || confirm('Effacer le schéma actuel ?')) this.newCircuit(); };
    $('#btn-save').onclick = () => this.saveFile(); $('#btn-open').onclick = () => $('#filein').click();
    $('#filein').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { this.tp = null; this.loadCircuit(JSON.parse(t)); this.editor.fit(); this.renderTP(); } catch (er) { alert('Fichier invalide : ' + er.message); } }); e.target.value = ''; };
    $$('.rtab').forEach(b => b.onclick = () => { $$('.rtab').forEach(x => x.classList.toggle('on', x === b)); $('#inspector').style.display = b.dataset.r === 'insp' ? '' : 'none'; $('#tppane').style.display = b.dataset.r === 'tp' ? '' : 'none'; });
    $$('.dtab').forEach(b => b.onclick = () => this.openDock(b.dataset.dock));
    $('#dockmin').onclick = () => { $('#dock').classList.toggle('min'); };
    this.openDock('chrono'); $('#dock').classList.remove('min');
  }
  saveFile() {
    const blob = new Blob([JSON.stringify(NS.serialize(this.circuit), null, 1)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: 'schema-logiclab.json' }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /* ---------------- TP ---------------- */
  menu(anchor, content) {
    $$('.menu').forEach(m => m.remove()); const r = anchor.getBoundingClientRect(); const m = h('div.menu', { style: { left: Math.max(4, r.left) + 'px', top: r.bottom + 4 + 'px' } }, content); document.body.appendChild(m);
    const off = e => { if (!m.contains(e.target) && e.target !== anchor) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0); return m;
  }
  openTPMenu(anchor) {
    const box = h('div'); const KINDS = [['TD', 'TD — Travaux dirigés (guidés pas à pas, avec le cours)'], ['TP', 'TP — Travaux pratiques (peu de guidage, pour valider)']];
    KINDS.forEach(([k, label]) => { const list = NS.SCENARIOS.filter(s => (s.kind || 'TP') === k); if (!list.length) return; box.appendChild(h('h4.menukind.' + k, label)); const cats = {}; list.forEach(s => (cats[s.cat] = cats[s.cat] || []).push(s));
      Object.keys(cats).forEach(c => { box.appendChild(h('h5', c)); cats[c].forEach(s => box.appendChild(h('button', { onclick: () => { $$('.menu').forEach(m => m.remove()); this.loadScenario(s); } }, s.title, h('small', s.level + ' · ' + s.duration + ' · ' + '★'.repeat(Math.min(3, s.diff)) + '☆'.repeat(Math.max(0, 3 - s.diff)))))); }); });
    this.menu(anchor, box);
  }
  loadScenario(sc, variant) {
    const v = variant === undefined ? (sc.variants ? Math.floor(Math.random() * sc.variants) : 0) : variant;
    const c = new NS.Circuit(); sc.build(c, { variant: v, rnd: NS.rng(1234 + v) });
    this.tp = { sc, variant: v, started: Date.now(), results: null, qres: {} }; this.answers = {};
    this.circuit = c; this.sim.c = c; this.sim.sigs = []; this.sim.invalidate(); this.sim.t = 0; this.sim.events = []; this.editor.sel = null; this.editor.undoStack = []; this.editor.render(); this.editor.fit(); this.onSelect(null); this.syncViews();
    { const lb = $('#pane-log'); if (lb) lb.innerHTML = ''; }
    this.designer.setN(Math.min(4, Math.max(2, NS.sourceVars(c).length || 3)));
    this.openDock(sc.dock || 'table'); if (sc.onLoad) sc.onLoad(this, v);
    this.log('TP chargé : ' + sc.title, 'info'); this.renderTP(); $$('.rtab')[1].click(); this.saveSoon();
  }
  restartTP() { if (this.tp) this.loadScenario(this.tp.sc, this.tp.variant); }
  renderTP() {
    const box = clear($('#tppane')); const tp = this.tp;
    if (!tp) { box.appendChild(h('div', h('h3', 'Sujet de TP'), h('p.muted', 'Aucun TP chargé. Utilisez le bouton « TP ▾ » pour choisir un sujet : portes logiques, tables de vérité, Karnaugh, conception de circuits, signaux…'), h('button.primary', { onclick: e => this.openTPMenu(e.target) }, 'Choisir un TP'))); return; }
    const sc = tp.sc;
    box.appendChild(h('h3', h('span.kindbadge.' + (sc.kind || 'TP'), sc.kind || 'TP'), ' ' + sc.title)); box.appendChild(h('div.muted.small', sc.cat + ' · ' + sc.level + ' · ' + sc.duration + ' · ' + '★'.repeat(Math.min(3, sc.diff)) + '☆'.repeat(Math.max(0, 3 - sc.diff))));
    box.appendChild(h('p', { html: typeof sc.desc === 'function' ? sc.desc(tp.variant) : sc.desc }));
    if (sc.refs) box.appendChild(h('div.small.muted', 'Référentiel : ' + sc.refs));
    box.appendChild(h('div.tp-card', h('b', 'Objectifs'), h('ul', sc.objectives.map(o => h('li', { html: o })))));
    (sc.cours || []).forEach((k, i) => { const c = NS.COURS && NS.COURS[k]; if (c) box.appendChild(h('details.cours', { open: i === 0 }, h('summary', '📘 Apport de cours — ' + c.t), h('div.coursbody', { html: c.h }))); });
    const steps = (typeof sc.steps === 'function' ? sc.steps(tp.variant) : sc.steps) || [];
    if (sc.stages) { box.appendChild(h('h4', 'Déroulé guidé : une étape à la fois')); tp.stageRes = tp.stageRes || {}; sc.stages.forEach((st, i) => box.appendChild(this.stageEl(st, i))); }
    else if (steps.length) box.appendChild(h('div.tp-card', h('b', 'Travail demandé'), h('ol', steps.map(s => h('li', { html: s })))));
    if ((sc.kind || 'TP') === 'TP' && sc.td) { const td = NS.SCENARIOS.find(x => x.id === sc.td); if (td) box.appendChild(h('div.tp-card.rappel', 'Besoin d\'un rappel de cours ou d\'un guidage pas à pas ? ', h('button', { onclick: () => this.loadScenario(td) }, 'Ouvrir le TD « ' + td.title + ' »'), h('div.small.muted', 'Attention : ouvrir le TD remplace le schéma actuel.'))); }
    if (sc.questions && sc.questions.length) {
      box.appendChild(h('h4', 'Questions'));
      sc.questions.forEach((q, i) => box.appendChild(this.questionEl(q, i)));
      box.appendChild(h('button', { onclick: () => this.checkAnswers() }, 'Valider mes réponses'));
    }
    box.appendChild(h('h4', 'Vérification du montage'));
    const cb = h('div#tpchecks'); box.appendChild(cb); if (tp.results) this.showChecks(cb, tp.results);
    box.appendChild(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' } }, h('button.primary', { onclick: () => this.runChecks() }, '✔ Vérifier mon travail'), h('button', { onclick: () => this.restartTP() }, sc.variants ? (sc.variantLabel || '↻ Autre variante') : '↻ Recommencer'), h('button', { onclick: () => this.showCorrection() }, '📖 Correction')));
    this._corr = h('div#tpcorr'); box.appendChild(this._corr);
  }
  stageEl(st, i) {
    const tp = this.tp, res = tp.stageRes[i]; const card = h('div.stage' + (res === undefined ? '' : res.ok ? '.ok' : '.ko'));
    card.appendChild(h('div.stagehead', h('span.stagen', String(i + 1)), h('b', st.t)));
    if (st.learn) card.appendChild(h('div.learn', h('b', '💡 À comprendre'), h('div', { html: st.learn })));
    if (st.do) card.appendChild(h('div.todo', h('b', '🛠 À faire'), h('div', { html: st.do })));
    if (st.hint) card.appendChild(h('details.hint', h('summary', 'Un coup de pouce'), h('div', { html: st.hint })));
    if (st.check) { card.appendChild(h('button', { onclick: () => { const r = NS.evalChecks({ checks: [st.check] }, this.circuit, tp)[0]; tp.stageRes[i] = r; card.replaceWith(this.stageEl(st, i)); } }, '✔ Valider cette étape'));
      if (res) card.appendChild(h('div.small.stageres', res.ok ? '✔ Étape réussie : ' + st.check.label : '✘ Pas encore : ' + (st.fail || st.check.label))); }
    return card;
  }
  ctx() { const c2 = NS.deserialize(NS.serialize(this.circuit)); const x = NS.makeCtx(c2); x.tp = this.tp; return x; }
  questionEl(q, i) {
    const res = this.tp.qres[i]; const cls = res === undefined ? '' : res.ok ? 'ok' : 'ko'; const row = h('div.q.' + cls, h('div', { html: (i + 1) + '. ' + (typeof q.q === 'function' ? q.q(this.ctx()) : q.q) }));
    if (q.type === 'choice') { const name = 'q' + i; q.options.forEach((o, k) => row.appendChild(h('label', { style: { display: 'block' } }, h('input', { type: 'radio', name, checked: this.answers[i] === k, onchange: () => { this.answers[i] = k; } }), ' ', h('span', { html: typeof o === 'function' ? o() : o })))); }
    else if (q.type === 'part') { const sel = h('select', { onchange: e => { this.answers[i] = e.target.value; } }, h('option', { value: '' }, '— choisir —'), this.circuit.parts.filter(p => NS.GATE_OF[p.type] || p.type === 'blackbox').map(p => h('option', { value: p.ref, selected: this.answers[i] === p.ref }, p.ref + ' (' + PARTS[p.type].label + ')'))); row.appendChild(sel); }
    else if (q.type === 'text') row.appendChild(h('textarea', { rows: 2, style: { width: '100%' }, onchange: e => { this.answers[i] = e.target.value; } }, this.answers[i] || ''));
    else if (q.type === 'table') {
      const vars = q.vars, n = vars.length; const a = this.answers[i] = this.answers[i] || new Array(1 << n).fill('');
      row.appendChild(h('table.tt.mini', h('thead', h('tr', vars.map(v => h('th.in', v)), h('th.out', q.out || 'S'))), h('tbody', a.map((v, k) => h('tr', NS.bits(k, n).map(b => h('td.in', b)), h('td.out', h('select', { onchange: e => { a[k] = e.target.value; } }, ['', '0', '1'].map(o => h('option', { value: o, selected: String(v) === o }, o || '·')))))))));
    }
    else if (q.type === 'expr') row.appendChild(h('div', this.exprInput(q, i)));
    else row.appendChild(h('div', h('input', { type: 'text', value: this.answers[i] === undefined ? '' : this.answers[i], onchange: e => { this.answers[i] = e.target.value; } }), ' ', h('span.muted', q.unit || '')));
    if (q.help && this.tp.sc.kind === 'TD') row.appendChild(h('div.qhelp', { html: '💡 ' + q.help }));
    if (res !== undefined) row.appendChild(h('div.small', res.ok ? '✔ Correct' : '✘ Incorrect' + (res.msg ? ' — ' + res.msg : q.hint ? ' — ' + q.hint : '')));
    return row;
  }
  /* saisie d'une équation : boutons ET, OU, NON… et aperçu avec barres */
  exprInput(q, i) {
    const vars = q.vars || [], inp = h('input', { type: 'text', class: 'exprin', value: this.answers[i] || '', placeholder: 'ex. A·!B + C', spellcheck: 'false' }); const prev = h('div.exprprev');
    const upd = () => { this.answers[i] = inp.value; const r = NS.tryParse(inp.value); prev.innerHTML = inp.value.trim() ? (r.err ? '<span class="bad">' + NS.esc(r.err) + '</span>' : (q.label || 'S') + ' = ' + NS.toHTML(r.ast)) : ''; };
    inp.oninput = upd; const ins = t => { const s = inp.selectionStart, e = inp.selectionEnd; inp.value = inp.value.slice(0, s) + t + inp.value.slice(e); inp.focus(); inp.setSelectionRange(s + t.length, s + t.length); upd(); };
    const keys = vars.map(v => h('button.key', { type: 'button', onclick: () => ins(v) }, v)).concat([['·', 'ET'], ['+', 'OU'], ['⊕', 'OU-EX'], ['!', 'NON'], ['(', '('], [')', ')']].map(([t, l]) => h('button.key.op', { type: 'button', title: l, onclick: () => ins(t) }, t === '!' ? 'NON ( ! )' : t)));
    setTimeout(upd, 0); return [inp, h('div.keys', keys), prev];
  }
  checkAnswers() {
    const tp = this.tp, sc = tp.sc; const ctx = this.ctx();
    sc.questions.forEach((q, i) => { tp.qres[i] = NS.checkAnswer(q, this.answers[i], ctx); });
    this.renderTP();
  }
  runChecks() {
    const tp = this.tp; if (!tp) return; const res = NS.evalChecks(tp.sc, this.circuit, tp);
    tp.results = res; const cb = $('#tpchecks'); if (cb) { clear(cb); this.showChecks(cb, res); }
  }
  showChecks(box, res) {
    res.forEach(r => box.appendChild(h('div.chk.' + (r.ok ? 'ok' : 'ko'), h('span.m', r.ok ? '✔' : '✘'), h('span', { html: r.label }))));
    const n = res.filter(r => r.ok).length; box.appendChild(h('div', { style: { margin: '4px 0' } }, h('span.badge.' + (n === res.length ? 'ok' : 'warn'), n + ' / ' + res.length + ' critères validés')));
  }
  showCorrection() {
    const tp = this.tp; if (!tp) return; const sc = tp.sc; const el = this._corr; clear(el);
    const doIt = () => { clear(el); el.appendChild(h('div.tp-card', h('b', 'Correction'), h('div', { html: typeof sc.correction === 'function' ? sc.correction(tp.variant) : (sc.correction || '') }))); if (sc.solve) el.appendChild(h('button', { onclick: () => { this.editor.pushUndo(); sc.solve(this.circuit, this.ctx(), tp.variant); this.changed('structure'); this.editor.fit(); this.log('Solution appliquée au schéma', 'info'); } }, 'Appliquer la solution au schéma')); };
    if (this.teacher) return doIt();
    el.appendChild(h('div.tp-card', 'Avez-vous cherché par vous-même ? ', h('button', { onclick: doIt }, 'Afficher la correction')));
  }
}
NS.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
