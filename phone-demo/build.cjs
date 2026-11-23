const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../wechat-miniprogram/miniprogram');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const files = ['app.js', 'app.json', 'app.wxss', 'config.js', 'lib/engine.js', 'lib/launch.js', 'lib/sample.js', 'lib/ui.js', 'services/api.js', 'services/demo.js',
  ...app.pages.flatMap(page => ['js', 'json', 'wxml', 'wxss'].map(extension => page + '.' + extension))];
const sources = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const content = '// Generated from the native mini-program. Run: node phone-demo/build.cjs\nwindow.__MINI_PREVIEW_SOURCE__ = ' + JSON.stringify(sources) + ';\n';
const target = path.join(__dirname, 'native-source.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) throw new Error('Native preview is stale. Run node phone-demo/build.cjs');
  console.log('Browser preview matches ' + files.length + ' native source files.');
} else { fs.writeFileSync(target, content); console.log('Bundled ' + files.length + ' native source files.'); }
