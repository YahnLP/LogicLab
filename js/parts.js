/* parts.js — catalogue des composants logiques : broches, paramètres, symboles (norme CEI 60617-12 / NF EN 60617 : symboles européens)
   Un composant = { type, label, cat, ref, pinsOf(p) | pins, defaults, fields, symbol(inst), value?(inst) }.
   Convention des broches : dir 'in' (entrée du composant) ou 'out' (sortie). */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const PARTS = NS.PARTS = {};
const CATS = NS.CATS = ['Entrées (interrupteurs, boutons)', 'Générateurs de signaux', 'Portes logiques', 'Bascule', 'Sorties (LED, afficheurs, actionneurs)', 'Divers'];
const L = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${c ? ' class="' + c + '"' : ''}/>`;
const T = (x, y, s, cls, anchor, extra) => `<text x="${x}" y="${y}" class="${cls || 'sym-t'}" text-anchor="${anchor || 'middle'}"${extra || ''}>${s}</text>`;
const num = (k, label, unit, o) => Object.assign({ k, label, unit, kind: 'num' }, o || {});
const sel = (k, label, o, labels) => ({ k, label, kind: 'sel', opts: o, labels });
const bool = (k, label) => ({ k, label, kind: 'bool' });
const txt = (k, label) => ({ k, label, kind: 'text' });
function def(type, d) { d.type = type; PARTS[type] = d; return d; }
NS.PD = { def, L, T, num, sel, bool, txt };

/* broches d'une instance (le nombre d'entrées d'une porte est un paramètre) */
NS.pinsOf = inst => { const d = PARTS[inst.type]; return d.pinsOf ? d.pinsOf(inst.p) : d.pins; };
NS.extOf = inst => { const d = PARTS[inst.type]; return d.extOf ? d.extOf(inst.p) : d.ext; };
NS.newInst = function (type, x, y, id) {
  const d = PARTS[type]; return { id, type, x, y, rot: 0, ref: '', p: JSON.parse(JSON.stringify(d.defaults || {})), rt: {}, fault: null };
};
const inPins = (n, x) => { const a = []; for (let i = 0; i < n; i++) a.push({ n: n === 1 ? 'E' : 'E' + (i + 1), x, y: (i - (n - 1) / 2) * 20, dir: 'in' }); return a; };

/* ======================== PORTES (rectangle + symbole CEI) ======================== */
const GT = { not: 'NOT', buf: 'BUF', and: 'AND', or: 'OR', nand: 'NAND', nor: 'NOR', xor: 'XOR', xnor: 'XNOR' };
NS.GATE_OF = GT;
Object.keys(GT).forEach(type => {
  const G = NS.GATES[GT[type]], multi = G.max > 2;
  const nOf = p => G.max === 1 ? 1 : G.max === 2 ? 2 : Math.max(2, Math.min(8, +p.n || 2));
  def(type, {
    label: G.name + (G.max === 1 ? '' : ' (' + G.sym + ')'), cat: 2, ref: 'G', gate: GT[type], noRefPool: true,
    defaults: G.max > 2 ? { n: 2 } : {}, fields: multi ? [sel('n', 'Nombre d\'entrées', [2, 3, 4, 5, 6, 7, 8])] : [],
    pinsOf: p => inPins(nOf(p), -50).concat([{ n: 'S', x: 50, y: 0, dir: 'out' }]),
    extOf: p => { const h = Math.max(nOf(p), 2) * 10; return [-50, -h, 50, h]; },
    symbol: i => {
      const n = nOf(i.p), h = Math.max(n, 2) * 10; let s = `<rect x="-30" y="${-h}" width="60" height="${2 * h}" class="gbody"/>`;
      for (let k = 0; k < n; k++) { const y = (k - (n - 1) / 2) * 20; s += L(-50, y, -30, y); }
      s += G.neg ? `<circle cx="35" cy="0" r="5" class="gneg"/>` + L(40, 0, 50, 0) : L(30, 0, 50, 0);
      s += T(0, G.sym.length > 1 ? 6 : 7, G.sym, 'gsym'); return s;
    }
  });
});

/* ======================== ENTRÉES ======================== */
const rectOut = (w) => `<rect x="${-w}" y="-16" width="${w + 20}" height="32" rx="3" class="gbody"/>` + L(20, 0, 40, 0);
def('switch', {
  label: 'Interrupteur (0 / 1)', cat: 0, ref: 'A', pool: 'in', clickable: true, ext: [-40, -18, 40, 18], defaults: { on: false, desc: '' },
  fields: [bool('on', 'Position (1 = fermé)'), txt('desc', 'Description')], pins: [{ n: 'S', x: 40, y: 0, dir: 'out' }],
  value: i => i.p.desc || '',
  symbol: i => rectOut(30) + `<rect x="-26" y="-8" width="22" height="16" rx="8" class="swtrack"/><circle cx="${i.p.on ? -10 : -20}" cy="0" r="6" class="swknob ${i.p.on ? 'on' : ''}"/>` + T(10, 7, i.p.on ? '1' : '0', 'bigv', 'middle', ' data-pv="0"')
});
def('button', {
  label: 'Bouton poussoir', cat: 0, ref: 'A', pool: 'in', momentary: true, ext: [-40, -18, 40, 18], defaults: { nc: false, desc: '' },
  fields: [bool('nc', 'Contact au repos fermé (NF)'), txt('desc', 'Description')], pins: [{ n: 'S', x: 40, y: 0, dir: 'out' }],
  value: i => (i.p.nc ? 'NF · ' : 'NO · ') + (i.p.desc || 'appuyer'),
  symbol: i => rectOut(30) + `<circle cx="-14" cy="0" r="9" class="btn ${i.rt.pressed ? 'down' : ''}"/>` + T(10, 7, '0', 'bigv', 'middle', ' data-pv="0"')
});
def('const1', {
  label: 'Niveau 1 (+5 V)', cat: 0, ref: 'N', noLabel: false, ext: [-30, -14, 30, 14], defaults: {}, fields: [], pins: [{ n: 'S', x: 30, y: 0, dir: 'out' }],
  symbol: i => `<rect x="-20" y="-12" width="30" height="24" rx="3" class="gbody"/>` + L(10, 0, 30, 0) + T(-5, 6, '1', 'bigv hi')
});
def('const0', {
  label: 'Niveau 0 (masse)', cat: 0, ref: 'N', ext: [-30, -14, 30, 14], defaults: {}, fields: [], pins: [{ n: 'S', x: 30, y: 0, dir: 'out' }],
  symbol: i => `<rect x="-20" y="-12" width="30" height="24" rx="3" class="gbody"/>` + L(10, 0, 30, 0) + T(-5, 6, '0', 'bigv')
});

/* ======================== GÉNÉRATEURS DE SIGNAUX ======================== */
def('clock', {
  label: 'Horloge (signal carré)', cat: 1, ref: 'H', ext: [-50, -20, 50, 20], defaults: { f: 1, duty: 50, phase: 0 },
  fields: [num('f', 'Fréquence', 'Hz', { min: 0.05, max: 1000, step: 0.05, slider: true, log: true }), num('duty', 'Rapport cyclique', '%', { min: 5, max: 95, step: 1, slider: true }), num('phase', 'Retard (fraction de période)', '%', { min: 0, max: 99, step: 1, slider: true })],
  pins: [{ n: 'S', x: 50, y: 0, dir: 'out' }],
  value: i => NS.fmt(i.p.f, 'Hz', 3) + ' · ' + i.p.duty + ' %',
  symbol: i => `<rect x="-30" y="-18" width="60" height="36" rx="3" class="gbody"/>` + L(30, 0, 50, 0) + `<polyline points="-22,8 -22,-8 -10,-8 -10,8 2,8 2,-8 14,-8 14,8 22,8" class="wavesym"/>`
});
def('seq', {
  label: 'Séquence binaire programmable', cat: 1, ref: 'A', pool: 'in', ext: [-50, -20, 50, 20], defaults: { pattern: '01101001', rate: 1 },
  fields: [txt('pattern', 'Motif (0 et 1)'), num('rate', 'Cadence', 'bit/s', { min: 0.05, max: 500, step: 0.05, slider: true, log: true })],
  pins: [{ n: 'S', x: 50, y: 0, dir: 'out' }],
  value: i => i.p.pattern,
  symbol: i => `<rect x="-30" y="-18" width="60" height="36" rx="3" class="gbody"/>` + L(30, 0, 50, 0) + T(0, -4, 'SÉQ.', 'sym-xs') + T(0, 12, '0110…', 'sym-xs')
});
def('cnt', {
  label: 'Générateur de combinaisons (compteur)', cat: 1, ref: 'N', defaults: { bits: 3, f: 1 },
  fields: [sel('bits', 'Nombre de bits', [2, 3, 4]), num('f', 'Fréquence de comptage', 'Hz', { min: 0.05, max: 500, step: 0.05, slider: true, log: true })],
  pinsOf: p => { const n = +p.bits || 3, a = []; for (let k = 0; k < n; k++) a.push({ n: 'ABCD'[k], x: 50, y: (k - (n - 1) / 2) * 20, dir: 'out' }); return a; },
  extOf: p => { const h = (+p.bits || 3) * 10 + 10; return [-30, -h, 50, h]; },
  value: i => NS.fmt(i.p.f, 'Hz', 3),
  symbol: i => { const n = +i.p.bits || 3, h = n * 10 + 10; let s = `<rect x="-30" y="${-h}" width="60" height="${2 * h}" rx="3" class="gbody"/>` + T(-4, 4, 'CTR', 'sym-s');
    for (let k = 0; k < n; k++) { const y = (k - (n - 1) / 2) * 20; s += L(30, y, 50, y) + T(22, y + 4, 'ABCD'[k], 'sym-xs', 'end'); } return s; }
});

/* ======================== BASCULE D ======================== */
def('dff', {
  label: 'Bascule D (front montant)', cat: 3, ref: 'FF', defaults: { reset: false },
  fields: [bool('reset', 'Entrée RAZ asynchrone (R)')],
  pinsOf: p => [{ n: 'D', x: -50, y: -20, dir: 'in' }, { n: 'CLK', x: -50, y: 20, dir: 'in' }, { n: 'Q', x: 50, y: -20, dir: 'out' }, { n: 'NQ', x: 50, y: 20, dir: 'out' }].concat(p.reset ? [{ n: 'R', x: 0, y: 60, dir: 'in' }] : []),
  extOf: p => [-50, -40, 50, p.reset ? 60 : 40],
  symbol: i => `<rect x="-30" y="-40" width="60" height="80" class="gbody"/>` + L(-50, -20, -30, -20) + L(-50, 20, -30, 20) + L(30, -20, 50, -20) + L(30, 20, 50, 20) +
    `<polygon points="-30,13 -22,20 -30,27" class="gtri"/>` + T(-26, -16, '1D', 'sym-s', 'start') + T(-18, 24, 'C1', 'sym-s', 'start') + T(26, -16, 'Q', 'sym-s', 'end') +
    T(26, 24, 'Q', 'sym-s overl', 'end') + (i.p.reset ? L(0, 40, 0, 60) + T(4, 32, 'R', 'sym-s', 'start') : '')
});

/* ======================== SORTIES ======================== */
const LEDC = { rouge: '#ef4444', verte: '#22c55e', jaune: '#facc15', bleue: '#3b82f6', orange: '#f97316' };
NS.LEDC = LEDC;
def('led', {
  label: 'LED', cat: 4, ref: 'S', pool: 'out', ext: [-40, -18, 20, 18], defaults: { color: 'rouge', desc: '' },
  fields: [sel('color', 'Couleur', Object.keys(LEDC)), txt('desc', 'Description')], pins: [{ n: 'E', x: -40, y: 0, dir: 'in' }],
  value: i => i.p.desc || '',
  symbol: i => `<circle cx="0" cy="0" r="13" class="led-glow" data-pfill="0" style="fill:${LEDC[i.p.color] || '#ef4444'};color:${LEDC[i.p.color] || '#ef4444'}"/>` + L(-40, 0, -12, 0) + `<circle cx="0" cy="0" r="12" class="ledbody"/>` +
    `<path d="M-7 -7 L7 7 M-7 7 L7 -7" class="ledx"/>`
});
def('probe', {
  label: 'Sonde logique (0 / 1)', cat: 4, ref: 'S', pool: 'out', ext: [-40, -16, 24, 16], defaults: { desc: '' }, fields: [txt('desc', 'Description')], pins: [{ n: 'E', x: -40, y: 0, dir: 'in' }],
  value: i => i.p.desc || '',
  symbol: i => L(-40, 0, -14, 0) + `<rect x="-14" y="-14" width="28" height="28" rx="3" class="gbody"/>` + T(0, 7, '?', 'bigv', 'middle', ' data-pv="0"')
});
def('seg7', {
  label: 'Afficheur 7 segments', cat: 4, ref: 'AF', defaults: {}, fields: [],
  pins: 'abcdefg'.split('').map((c, k) => ({ n: c, x: -50, y: -60 + k * 20, dir: 'in' })), ext: [-50, -70, 40, 70],
  symbol: i => {
    const seg = (k, pts) => `<polygon points="${pts}" class="seg" data-pfill="${k}"/>`; let s = `<rect x="-30" y="-64" width="64" height="128" rx="5" class="segbody"/>`;
    s += seg(0, '-14,-46 14,-46 10,-40 -10,-40') + seg(1, '16,-44 16,-4 10,-8 10,-38') + seg(2, '16,4 16,44 10,38 10,8') + seg(3, '-14,46 14,46 10,40 -10,40') + seg(4, '-16,4 -16,44 -10,38 -10,8') + seg(5, '-16,-44 -16,-4 -10,-8 -10,-38') + seg(6, '-12,0 -8,-4 8,-4 12,0 8,4 -8,4');
    'abcdefg'.split('').forEach((c, k) => { s += L(-50, -60 + k * 20, -30, -60 + k * 20) + T(-26, -56 + k * 20, c, 'sym-xs', 'start'); }); return s;
  }
});
const ACT = { moteur: 'M', pompe: 'P', lampe: '✕', sirène: '♪', 'électrovanne': 'V' };
def('actuator', {
  label: 'Actionneur (moteur, pompe, lampe…)', cat: 4, ref: 'S', pool: 'out', ext: [-40, -22, 24, 22], defaults: { kind: 'moteur', desc: '' },
  fields: [sel('kind', 'Type', Object.keys(ACT)), txt('desc', 'Description')], pins: [{ n: 'E', x: -40, y: 0, dir: 'in' }],
  value: i => i.p.kind + (i.p.desc ? ' · ' + i.p.desc : ''),
  symbol: i => L(-40, 0, -20, 0) + `<circle cx="0" cy="0" r="20" class="actbody" data-pfill="0"/>` + (i.p.kind === 'lampe' ? '<path d="M-14 -14 L14 14 M-14 14 L14 -14" class="actx"/>' : T(0, 7, ACT[i.p.kind] || 'M', 'actsym'))
});

/* ======================== DIVERS ======================== */
def('blackbox', {
  label: 'Boîte noire (fonction cachée)', cat: 5, ref: 'F', defaults: { n: 2, tt: '0001', hidden: false },
  fields: [sel('n', 'Nombre d\'entrées', [1, 2, 3, 4]), txt('tt', 'Table (sortie pour 00…0, 00…1, …)')],
  pinsOf: p => inPins(Math.max(1, Math.min(4, +p.n || 2)), -50).concat([{ n: 'S', x: 50, y: 0, dir: 'out' }]),
  extOf: p => { const h = Math.max(+p.n || 2, 2) * 10; return [-50, -h, 50, h]; },
  symbol: i => { const n = Math.max(1, Math.min(4, +i.p.n || 2)), h = Math.max(n, 2) * 10; let s = `<rect x="-30" y="${-h}" width="60" height="${2 * h}" class="gbody bbox"/>`;
    for (let k = 0; k < n; k++) { const y = (k - (n - 1) / 2) * 20; s += L(-50, y, -30, y); } s += L(30, 0, 50, 0) + T(0, 8, '?', 'gsym'); return s; }
});
def('label', {
  label: 'Texte (annotation)', cat: 5, ref: '', noLabel: true, ext: [-60, -10, 60, 10], defaults: { text: 'Texte' }, fields: [txt('text', 'Texte')], pins: [],
  extOf: p => { const w = Math.max(20, String(p.text || '').length * 3.6); return [-w, -10, w, 10]; },
  symbol: i => T(0, 4, NS.esc(i.p.text || ''), 'notetxt')
});

/* fonction de sortie d'une boîte noire : tt[ (E1 poids fort) … ] */
NS.blackboxOut = (p, ins) => { let idx = 0; for (let k = 0; k < ins.length; k++) { if (ins[k] === 2) return 2; idx = (idx << 1) | ins[k]; } const c = String(p.tt || '')[idx]; return c === '1' ? 1 : c === '0' ? 0 : 2; };
})(typeof window !== 'undefined' ? window : globalThis);
