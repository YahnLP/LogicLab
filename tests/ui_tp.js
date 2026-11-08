/* ouvre chaque TP (toutes variantes), applique la solution, vérifie que tous les critères passent : node tests/ui_tp.js [fichier.html] */
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'logiclab.html'));
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const pg = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errs = [];
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(file); await pg.waitForTimeout(500);
  const res = await pg.evaluate(async () => {
    const out = [], app = window.__app;
    for (const sc of NS.SCENARIOS) for (let v = 0; v < (sc.variants || 1); v++) {
      try {
        app.loadScenario(sc, v); await new Promise(r => setTimeout(r, 30));
        const before = NS.evalChecks(sc, app.circuit, app.tp).filter(r => r.ok).length;
        sc.solve(app.circuit, app.ctx()); app.editor.render(); app.changed && app.changed('circuit');
        const after = NS.evalChecks(sc, app.circuit, app.tp); const ko = after.filter(r => !r.ok).map(r => r.label);
        app.runChecks(); app.checkAnswers();
        out.push({ id: sc.id + '#' + v, before, n: after.length, ko, html: document.querySelector('#tp') ? document.querySelector('#tp').innerText.length : 0 });
      } catch (e) { out.push({ id: sc.id + '#' + v, err: String(e.stack || e).slice(0, 300) }); }
    }
    return out;
  });
  const bad = res.filter(r => r.err || (r.ko && r.ko.length)); bad.forEach(r => console.log('✘', JSON.stringify(r)));
  console.log(res.length + ' cas ouverts,', bad.length + ' en échec ; erreurs JS :', errs.length ? errs : 'aucune');
  await pg.screenshot({ path: '/tmp/tp_last.png' }); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
