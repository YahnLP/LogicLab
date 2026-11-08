/* captures d'écran + erreurs JS : node tests/ui_shots.js [fichier.html] */
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const pg = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errs = [];
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(file); await pg.waitForTimeout(800);
  await pg.screenshot({ path: '/tmp/ll1.png' });
  console.log('erreurs:', errs.length ? errs : 'aucune'); await b.close();
})();
