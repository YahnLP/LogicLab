/* t_sc.js — pour chaque TP et chaque variante : critères KO au départ, la solution les valide tous, les bonnes réponses sont acceptées */
const NS = require('./load')();
let bad = 0, n = 0; const fail = (m) => { bad++; console.log('  ✘ ' + m); };
const only = process.argv[2];
NS.SCENARIOS.forEach(sc => {
  if (only && sc.id !== only) return;
  const nv = sc.variants || 1;
  for (let v = 0; v < nv; v++) {
    n++; const tag = sc.id + '#' + v; const c = new NS.Circuit(); sc.build(c, { variant: v, rnd: NS.rng(1234 + v) });
    const tp = { sc, variant: v }; const before = NS.evalChecks(sc, c, tp);
    if (before.every(r => r.ok)) fail(tag + ' : tous les critères sont déjà validés au départ');
    const c2 = NS.deserialize(NS.serialize(c)); sc.solve(c2, { tp });
    const after = NS.evalChecks(sc, c2, tp); after.filter(r => !r.ok).forEach(r => fail(tag + ' : critère KO après solution : ' + r.label));
    const ctx = NS.makeCtx(c2); ctx.tp = tp;
    (sc.stages || []).forEach((st, k) => { if (st.check) { const r = NS.evalChecks({ checks: [st.check] }, c2, tp)[0]; if (!r.ok) fail(tag + ' étape ' + (k + 1) + ' KO après solution : ' + st.check.label); if (!st.fail) fail(tag + ' étape ' + (k + 1) + ' : message d\'échec manquant'); } });
    if ((sc.kind === 'TD') && !(sc.stages && sc.stages.length >= 3)) fail(tag + ' : un TD doit avoir au moins 3 étapes');
    if (sc.kind === 'TP' && sc.td && !NS.SCENARIOS.find(x => x.id === sc.td)) fail(tag + ' : TD associé introuvable');
    (sc.questions || []).forEach((q, i) => {
      let a;
      try {
        if (q.type === 'choice') a = typeof q.correct === 'function' ? q.correct(ctx) : q.correct;
        else if (q.type === 'part') a = [].concat(typeof q.correct === 'function' ? q.correct(ctx) : q.correct)[0];
        else if (q.type === 'text') a = 'x';
        else if (q.type === 'table') a = (typeof q.answer === 'function' ? q.answer(ctx) : q.answer).slice();
        else if (q.type === 'expr') { if (q.values) { const m = NS.minimize(q.vars, typeof q.values === 'function' ? q.values(ctx) : q.values); a = NS.toText(NS.cost(m.sop).literals <= NS.cost(m.pos).literals ? m.sop : m.pos); } else { const t = typeof q.target === 'function' ? q.target(ctx) : q.target; a = typeof t === 'string' ? t : NS.toText(t); if (q.minimal) { const T = typeof t === 'string' ? NS.parse(t) : t, vs = NS.vars(T), m = NS.minimize(vs, NS.tt(T, vs)); a = NS.toText(NS.cost(m.sop).literals <= NS.cost(m.pos).literals ? m.sop : m.pos); } } }
        else a = String(typeof q.answer === 'function' ? q.answer(ctx) : q.answer);
      } catch (e) { return fail(tag + ' q' + (i + 1) + ' : réponse incalculable : ' + e.message); }
      if (q.type === 'choice' && a === undefined) return fail(tag + ' q' + (i + 1) + ' : pas de bonne réponse');
      const r = NS.checkAnswer(q, a, ctx); if (!r.ok) fail(tag + ' q' + (i + 1) + ' : bonne réponse refusée (' + JSON.stringify(a) + ') ' + (r.msg || ''));
      if (q.type === 'choice' && q.options.length > 1) { const w = q.options.map((_, k) => k).find(k => k !== a); if (NS.checkAnswer(q, w, ctx).ok) fail(tag + ' q' + (i + 1) + ' : mauvaise réponse acceptée'); }
    });
    if (!sc.title || !sc.objectives || !sc.steps || !sc.correction) fail(tag + ' : champs manquants');
    (sc.cours || []).forEach(k => { if (!NS.COURS[k]) fail(tag + ' : cours inconnu ' + k); });
  }
});
console.log(bad ? bad + ' échec(s) sur ' + n + ' cas' : 'OK : ' + NS.SCENARIOS.length + ' TP, ' + n + ' cas');
process.exit(bad ? 1 : 0);
