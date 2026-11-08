/* charge les modules (sans DOM) dans un contexte isolé : const NS = require('./load')(['util.js','logic.js',...]) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ALL = ['util.js', 'logic.js', 'parts.js', 'circuit.js', 'route.js', 'engine.js', 'analysis.js', 'synth.js', 'scenarios.js', 'cours.js', 'tp_portes.js', 'tp_equations.js', 'tp_boole.js', 'tp_conception.js', 'tp_signaux.js'];
module.exports = function (files) {
  files = files || ALL.filter(f => fs.existsSync(path.join(__dirname, '..', 'js', f)));
  const ctx = { console, Math, JSON, Map, Set, Array, Object, Number, String, Error, Date, performance: { now: () => Date.now() } };
  ctx.globalThis = ctx; vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f }));
  return ctx.NS;
};
