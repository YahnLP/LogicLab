// assemble index.html + css + js dans un seul fichier autonome : dist/logiclab.html
const fs = require('fs'), path = require('path'); const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script>/gi, '<\\/script>') + '\n</script>');
html = html.replace('<!doctype html>', '<!doctype html>\n<!-- LogicLab — © 2026 Yahn LE PRETTRE - Formaxion Landes — EUPL 1.2 — https://interoperable-europe.ec.europa.eu/collection/eupl/eupl-text-eupl-12 -->');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true }); const out = path.join(root, 'dist', 'logiclab.html'); fs.writeFileSync(out, html);
console.log('OK', out, (html.length / 1024).toFixed(0) + ' Ko');
