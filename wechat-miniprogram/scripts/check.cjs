const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.name === 'node_modules' ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
let scripts = 0, jsons = 0;
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.(js|cjs)$/.test(file)) {
    new vm.Script(text, { filename: file }); scripts++;
    for (const m of text.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
      const target = path.resolve(path.dirname(file), m[1]);
      assert([target, target + '.js', target + '.cjs', target + '.json', path.join(target, 'index.js')].some(p => fs.existsSync(p)), 'Missing require: ' + target);
    }
  }
  if (file.endsWith('.json')) { JSON.parse(text); jsons++; }
}
const sourceEngine = fs.readFileSync(path.join(root, 'miniprogram/lib/engine.js'), 'utf8');
const historicalEngine = path.join(root, '../game/engine.js');
if (fs.existsSync(historicalEngine)) assert.equal(sourceEngine, fs.readFileSync(historicalEngine, 'utf8'), 'Historical engine drift');
for (const copy of ['miniprogram/lib/engine.js', 'cloudfunctions/campaign/engine.js']) assert.equal(fs.readFileSync(path.join(root, copy), 'utf8'), sourceEngine, 'Engine drift: ' + copy);
assert.equal(fs.readFileSync(path.join(root, 'cloudfunctions/campaign/store.js'), 'utf8'), fs.readFileSync(path.join(root, 'cloudfunctions/scrm-dispatch/store.js'), 'utf8'), 'Store adapter drift');
console.log('Static checks passed: ' + scripts + ' scripts, ' + jsons + ' JSON files; shared engines and adapters match.');
if (process.argv.includes('--release')) {
  const config = require('../miniprogram/config'), project = require('../project.config.json');
  const errors = [];
  if (!/^wx[a-f0-9]{16}$/.test(project.appid)) errors.push('替换 touristappid，填写真实小程序 AppID');
  if (config.mode !== 'cloud') errors.push('将 mode 改为 cloud');
  if (!config.cloudEnv) errors.push('填写真实云环境 cloudEnv');
  if (errors.length) { console.error('Release configuration blocked:\n- ' + errors.join('\n- ')); process.exitCode = 1; }
  else console.log('Local release config is complete. This does not verify deployed data, WeChat permissions or SCRM connectivity.');
}
