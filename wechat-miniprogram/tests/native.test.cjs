const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { parse, sharePath } = require('../miniprogram/lib/launch');
const engine = require('../miniprogram/lib/engine');
const sample = require('../miniprogram/lib/sample');
const config = require('../miniprogram/config');
const api = require('../miniprogram/services/api');
const clone = x => structuredClone(x);
function environment() {
  const storage = new Map(), nav = [], app = { globalData: { currentCampaignId: sample.id, campaign: clone(sample) } };
  global.getApp = () => app;
  global.wx = {
    getStorageSync: k => clone(storage.get(k)), setStorageSync: (k, v) => storage.set(k, clone(v)), removeStorageSync: k => storage.delete(k),
    hideShareMenu() {}, showShareMenu() {}, vibrateShort() {},
    navigateTo: p => nav.push(p.url), redirectTo: p => nav.push(p.url), switchTab: p => nav.push(p.url),
    showModal: p => p.success && p.success({ confirm: true }), setClipboardData: p => { global.wx.clipboard = p.data; },
    requirePrivacyAuthorize: p => p.success(), openCustomerServiceChat() {}
  };
  return { storage, nav, app };
}
function page(name) {
  let definition;
  global.Page = value => { definition = value; };
  const file = require.resolve('../miniprogram/pages/' + name + '/index.js'); delete require.cache[file]; require(file);
  return { ...definition, data: clone(definition.data), setData(update) { Object.assign(this.data, clone(update)); } };
}
const settle = () => new Promise(r => setImmediate(r));
test('launch parser handles direct links, QR scenes and malformed input', () => {
  assert.deepEqual(parse({ scene: encodeURIComponent('i=abc123&c=campaign_2') }), { campaignId: 'campaign_2', inviteToken: 'abc123' });
  assert.equal(parse({ scene: '%E0%A4%A', invite: '../x', campaign: '<script>' }).inviteToken, '');
  assert.equal(parse({ campaign: '../private' }).campaignId, config.campaignId);
  assert.equal(sharePath('campaign_2', 'abc123'), '/pages/activity/index?campaign=campaign_2&invite=abc123');
  assert.throws(() => sharePath('a', 'a&b'));
});
test('native demo completes a real game, claims useful content, shares and keeps real arrival counts zero', async () => {
  const e = environment();
  const activity = page('activity'); activity.onLoad({}); await settle();
  assert.equal(activity.data.campaign.id, sample.id);
  const game = page('game'); game.onLoad(); await settle();
  assert.equal(game.data.state.status, 'playing');
  game.target({ currentTarget: { dataset: { index: 0 } } }); assert.match(game.data.error, /先点/);
  const path = engine.solve(game.state, 24).path;
  for (const move of path) {
    if (move.card === 'pass') game.pass();
    else { game.select({ currentTarget: { dataset: { id: move.card } } }); game.target({ currentTarget: { dataset: { index: move.target } } }); }
  }
  await settle(); assert.equal(e.nav.at(-1), '/pages/result/index');
  const result = page('result'); result.onLoad(); assert(result.data.result.score > 0); await result.claim();
  const benefit = page('benefit'); benefit.onLoad(); await settle(); assert.equal(benefit.data.claim.sections.length, 3);
  benefit.copy(); assert.match(wx.clipboard, /验收标准/);
  const invite = page('invite'); invite.onLoad(); await settle();
  assert.match(invite.onShareAppMessage().path, /invite=demo_local_only/);
  assert.deepEqual(invite.data.stats, { arrivals: 0, finishes: 0, claims: 0, requests: 0 });
  game.onUnload();
});
test('leaving and reopening the game restores the same local session and exact moves', async () => {
  environment(); const first = page('game'); first.onLoad(); await settle();
  first.select({ currentTarget: { dataset: { id: 'repair' } } }); first.target({ currentTarget: { dataset: { index: 0 } } });
  first.onUnload(); const resumed = page('game'); resumed.onLoad(); await settle();
  assert.equal(resumed.session.sessionId, first.session.sessionId); assert.deepEqual(resumed.state, first.state); resumed.onUnload();
});
test('warm entry consumes a new invitation without losing launch parameters', async () => {
  const e = environment(), activity = page('activity'); activity.onLoad({}); await settle();
  e.app.globalData.pendingActivityOptions = { campaign: 'another-campaign', invite: 'abc123' };
  activity.onShow(); await settle();
  assert.deepEqual(activity.entry, { campaignId: 'another-campaign', inviteToken: 'abc123' });
  assert.equal(e.app.globalData.pendingActivityOptions, null);
});
test('consultation defaults optional permissions off, needs consent, and records an explicit virtual demo', async () => {
  environment(); const contact = page('contact'); contact.onLoad(); await settle();
  assert.equal(contact.data.marketing, false); assert.equal(contact.data.shareRecap, false);
  await contact.submit('demo-only'); assert.match(contact.data.error, /同意/);
  contact.choose({ currentTarget: { dataset: { topic: sample.topics[1] } } });
  contact.consent({ currentTarget: { dataset: { field: 'serviceConsent' } }, detail: { value: ['yes'] } });
  await contact.submit('demo-only'); assert.equal(contact.data.lead.maskedPhone, '虚拟手机号'); assert.equal(contact.data.lead.syncState, 'demo');
  const mine = page('me'); mine.onLoad(); mine.onShow(); await settle(); assert.match(mine.data.mine.lead.syncLabel, /未发送/);
});
test('cloud failures are reported and never silently create demo records', async () => {
  const e = environment(), savedMode = config.mode, savedEnv = config.cloudEnv;
  try {
    config.mode = 'cloud'; config.cloudEnv = 'test-env';
    wx.cloud = { callFunction: async () => { throw new Error('offline'); } };
    await assert.rejects(api.call('requestConsultation', {}), /无法连接/);
    assert.equal(e.storage.size, 0);
    wx.cloud.callFunction = async () => ({ result: { ok: false, message: '活动已结束' } });
    await assert.rejects(api.call('visitCampaign', {}), /活动已结束/);
  } finally { config.mode = savedMode; config.cloudEnv = savedEnv; }
});
test('every native page exists, contains only supported components, and binds existing handlers', () => {
  environment();
  const base = path.join(__dirname, '../miniprogram'), manifest = require('../miniprogram/app.json');
  const allowed = new Set(['view', 'text', 'button', 'block', 'checkbox-group', 'checkbox', 'label']);
  for (const route of manifest.pages) {
    for (const ext of ['js', 'json', 'wxml', 'wxss']) assert(fs.existsSync(path.join(base, route + '.' + ext)), route + '.' + ext);
    const name = route.split('/')[1], instance = page(name), wxml = fs.readFileSync(path.join(base, route + '.wxml'), 'utf8');
    assert(!wxml.includes('web-view'));
    const stack = [];
    for (const m of wxml.matchAll(/<\/?([\w-]+)\b(?:[^"'<>]|"[^"]*"|'[^']*')*\/?>/g)) {
      assert(allowed.has(m[1]), 'unknown component ' + m[1] + ' in ' + route);
      if (m[0].startsWith('</')) assert.equal(stack.pop(), m[1], route);
      else if (!m[0].endsWith('/>')) stack.push(m[1]);
    }
    assert.equal(stack.length, 0, route);
    for (const m of wxml.matchAll(/\b(?:bind|catch):?[a-z]+="([a-zA-Z0-9_]+)"/g)) assert.equal(typeof instance[m[1]], 'function', route + ': ' + m[1]);
  }
});
