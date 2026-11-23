const test = require('node:test');
const assert = require('node:assert/strict');
const { createService, key } = require('../cloudfunctions/campaign/core');
const engine = require('../cloudfunctions/campaign/spot');
const { dispatch } = require('../cloudfunctions/scrm-dispatch/worker');
const { memoryStore } = require('./memory-store.cjs');
const sample = require('../miniprogram/lib/sample');
function setup(stock = null) {
  let time = 1795392000000, serial = 0, phoneCalls = 0;
  const campaignId = sample.id;
  const store = memoryStore({ campaigns: { [campaignId]: { ...sample, _id: campaignId, status: 'active', tenantId: 'tenant-a', startsAt: time - 1000, stock } } });
  const service = createService({ store, now: () => time, random: n => (++serial).toString(16).padStart(n * 2, '0'),
    phone: async code => { phoneCalls++; assert.equal(code, 'wx-valid-code'); return '+8613800001234'; } });
  const call = (action, p = {}, user = 'alice') => service.call(action, { campaignId, ...p }, { openid: user });
  const visit = async user => call('visitCampaign', {}, user);
  const start = async user => { await visit(user); return call('startChallenge', { requestId: 'test-' + ++serial }, user); };
  const finish = async user => {
    const s = await start(user), moves = engine.create(s.seed,s.level).changed.map((id,i)=>({type:'tap',id,at:(i+1)*100}));
    const result = await call('finishChallenge', { sessionId: s.sessionId, moves }, user);
    return { ...s, result, moves };
  };
  const contact = (extra = {}, user = 'alice') => call('requestConsultation', { topic: sample.topics[0], serviceConsent: true,
    privacyVersion: sample.privacyVersion, marketing: false, shareRecap: false, phoneCode: 'wx-valid-code', ...extra }, user);
  return { store, service, call, visit, start, finish, contact, campaignId, now: () => time, advance: ms => { time += ms; }, phoneCalls: () => phoneCalls };
}
test('trusted identity, action and active campaign are required', async () => {
  const s = setup();
  await assert.rejects(s.service.call('visitCampaign', {}, {}), { code: 'AUTH' });
  await assert.rejects(s.call('constructor'), { code: 'ACTION' });
  await assert.rejects(s.call('visitCampaign', { campaignId: '../secret' }), { code: 'PARAM' });
  s.advance(400000000000); await assert.rejects(s.visit('alice'), { code: 'CLOSED' });
});
test('first touch is immutable, self/expired invites excluded; sharing alone adds zero arrivals', async () => {
  const s = setup(); await s.visit('alice');
  const { token } = await s.call('createInvite', {sessionId:(await s.finish('alice')).sessionId});
  assert.equal((await s.call('getPromotionStats')).arrivals, 0);
  await s.call('visitCampaign', { inviteToken: token });
  await s.call('visitCampaign', { inviteToken: token }, 'bob');
  await s.call('visitCampaign', { inviteToken: token }, 'bob');
  await s.visit('carol'); await s.call('visitCampaign', { inviteToken: token }, 'carol');
  assert.equal((await s.call('getPromotionStats')).arrivals, 1);
  assert.equal((await s.store.get('visitors', key(s.campaignId, 'carol'))).inviter, '');
  const invite = await s.store.get('invites', token); invite.expiresAt = s.now() - 1; await s.store.set('invites', token, invite);
  await s.call('visitCampaign', { inviteToken: token }, 'dave');
  assert.equal((await s.call('getPromotionStats')).arrivals, 1);
});
test('simultaneous duplicate visits count only once', async () => {
  const s = setup(); await s.visit('alice'); const { token } = await s.call('createInvite', {sessionId:(await s.finish('alice')).sessionId});
  await Promise.all(Array.from({ length: 8 }, () => s.call('visitCampaign', { inviteToken: token }, 'bob')));
  assert.equal((await s.call('getPromotionStats')).arrivals, 1);
});
test('session retries are idempotent, bound to owner, expire and limit daily starts', async () => {
  const s = setup(); await s.visit('alice');
  const first = await s.call('startChallenge', { requestId: 'same-request' });
  assert.deepEqual(await s.call('startChallenge', { requestId: 'same-request' }), first);
  const path = engine.create(first.seed,first.level).changed.map((id,i)=>({type:'tap',id,at:(i+1)*100}));
  await assert.rejects(s.call('finishChallenge', { sessionId: first.sessionId, moves: path }, 'bob'), { code: 'SESSION' });
  s.advance(7200001);
  await assert.rejects(s.call('finishChallenge', { sessionId: first.sessionId, moves: path }), { code: 'EXPIRED' });
  const c = await s.store.get('campaigns', s.campaignId); c.dailyPlayLimit = 1; await s.store.set('campaigns', s.campaignId, c);
  await assert.rejects(s.call('startChallenge', { requestId: 'new-request' }), { code: 'LIMIT' });
});
test('server replays spot actions, ignores scores, and rejects duplicate hits, unfinished and impossible time', async () => {
 const s=setup(),session=await s.start('alice'),board=engine.create(session.seed,session.level),id=board.changed[0];
 await assert.rejects(s.call('finishChallenge',{sessionId:session.sessionId,moves:[{type:'tap',id,at:100}]}),{code:'MOVES'});
 await assert.rejects(s.call('finishChallenge',{sessionId:session.sessionId,moves:[{type:'tap',id,at:100},{type:'tap',id,at:200},{type:'end',at:300}]}),{code:'MOVES'});
 await assert.rejects(s.call('finishChallenge',{sessionId:session.sessionId,moves:[{type:'end',at:50000}]}),{code:'TIME'});
 const moves=board.changed.map((id,i)=>({type:'tap',id,at:(i+1)*100}));
 const result=await s.call('finishChallenge',{sessionId:session.sessionId,moves,score:999999,owner:'bob'});
 assert.equal(result.score,engine.score(engine.replay(session.seed,session.level,moves)));
 assert.deepEqual(await s.call('finishChallenge',{sessionId:session.sessionId,moves}),result);
 await assert.rejects(s.call('finishChallenge',{sessionId:session.sessionId,moves:[{type:'end',at:0}]}),{code:'CONFLICT'});
});
test('unfinished or foreign sessions cannot claim; repeated claims consume one stock and create one event', async () => {
  const s = setup(2), a = await s.finish('alice'), b = await s.start('bob');
  await assert.rejects(s.call('claimBenefit', { sessionId: b.sessionId }, 'bob'), { code: 'FINISH' });
  await assert.rejects(s.call('claimBenefit', { sessionId: a.sessionId }, 'bob'), { code: 'FINISH' });
  const claims = await Promise.all(Array.from({ length: 6 }, () => s.call('claimBenefit', { sessionId: a.sessionId })));
  assert(claims.every(c => c.id === claims[0].id));
  assert.equal((await s.store.get('campaigns', s.campaignId)).stock, 1);
  assert.equal(Object.keys(s.store.snapshot().outbox).length, 1);
  assert.equal((await s.call('getMyActivity', {}, 'bob')).claim, null);
});
test('stock remains nonnegative under concurrent claims', async () => {
  const s = setup(1), a = await s.finish('alice'), b = await s.finish('bob');
  const results = await Promise.allSettled([s.call('claimBenefit', { sessionId: a.sessionId }), s.call('claimBenefit', { sessionId: b.sessionId }, 'bob')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'STOCK');
  assert.equal((await s.store.get('campaigns', s.campaignId)).stock, 0);
});
test('an unfinished picture can still claim; no share or phone is required', async () => {
 const s=setup(),session=await s.start('alice');
 const result=await s.call('finishChallenge',{sessionId:session.sessionId,moves:[{type:'end',at:100}]});
 assert.equal(result.status,'finished');assert((await s.call('claimBenefit',{sessionId:session.sessionId})).sections.length>0);assert.equal(s.phoneCalls(),0);
});
test('friends receive the same board and server computes compatibility from owned results', async () => {
 const s=setup(),host=await s.finish('alice');
 await assert.rejects(s.call('createInvite',{sessionId:host.sessionId},'bob'),{code:'VISIT'});
 const {token}=await s.call('createInvite',{sessionId:host.sessionId});
 const visit=await s.call('visitCampaign',{inviteToken:token},'bob');assert.equal(visit.friend.seed,host.seed);assert(!('found' in visit.friend));
 const guest=await s.call('startChallenge',{requestId:'friend-session',inviteToken:token,seed:999,level:2},'bob');
 assert.equal(guest.seed,host.seed);assert.equal(guest.level,host.level);
 const result=await s.call('finishChallenge',{sessionId:guest.sessionId,moves:host.moves},'bob');assert.equal(result.match.percent,100);
 await s.call('finishChallenge',{sessionId:guest.sessionId,moves:host.moves},'bob');
 const hostCards=(await s.call('getMyActivity')).duels;assert.equal(hostCards.length,1);assert.equal(hostCards[0].percent,100);assert(!JSON.stringify(hostCards).includes('bob'));
 await assert.rejects(s.call('createInvite',{sessionId:host.sessionId},'bob'),{code:'FINISH'});
 const newer=await s.finish('alice'),next=await s.call('createInvite',{sessionId:newer.sessionId});assert.notEqual(next.token,token);
});
test('consultation requires explicit consent, current notice and verified phone; optional data absent by default', async () => {
  const s = setup(); await s.visit('alice');
  await assert.rejects(s.contact({ serviceConsent: false }), { code: 'CONSENT' });
  await assert.rejects(s.contact({ privacyVersion: 'old' }), { code: 'CONSENT' });
  await assert.rejects(s.contact({ topic: 'invented' }), { code: 'TOPIC' });
  await assert.rejects(s.contact({ phoneCode: '', phone: '13800001234' }), { code: 'PHONE' });
  const lead = await s.contact();
  assert(!('phone' in lead)); assert(!('owner' in lead)); assert.equal(lead.marketing, false);
  const event = await s.store.get('outbox', 'lead_' + lead.id);
  assert.equal(event.data.phone, '+8613800001234'); assert.equal(event.data.recap, null); assert.equal(event.data.marketing, false);
  assert(!JSON.stringify(event).includes('alice')); assert(!JSON.stringify(event).includes('wx-valid-code'));
  assert.equal((await s.call('getMyActivity', {}, 'bob')).lead, null);
});
test('consultation retry creates one lead/event, without reusing one-time phone codes', async () => {
  const s = setup(); await s.visit('alice');
  const first = await s.contact(), second = await s.contact();
  assert.equal(first.id, second.id); assert.equal(s.phoneCalls(), 1);
  assert.equal(Object.keys(s.store.snapshot().outbox).length, 1);
  await assert.rejects(s.contact({ marketing: true }), { code: 'DUPLICATE' });
});
test('recap is taken from an owned validated session; marketing revocation is queued once', async () => {
  const s = setup(), a = await s.finish('alice'), b = await s.finish('bob');
  await assert.rejects(s.contact({ shareRecap: true, sessionId: b.sessionId }), { code: 'RECAP' });
  const lead = await s.contact({ shareRecap: true, sessionId: a.sessionId, marketing: true, recap: { score: 999999 } });
  assert.equal((await s.store.get('outbox', 'lead_' + lead.id)).data.recap.score, a.result.score);
  await s.call('revokeMarketing'); await s.call('revokeMarketing');
  const mine = await s.call('getMyActivity'); assert.equal(mine.lead.marketing, false); assert.equal(mine.lead.revocationState, 'pending');
  assert.equal((await s.store.get('outbox', 'lead_' + lead.id)).data.marketing, false);
  assert((await s.store.get('outbox', 'revoke_' + lead.id)).data.dependsOn);
});
test('referral funnel counts unique people and uses first-touch inviter only', async () => {
  const s = setup(); await s.visit('alice'); const { token } = await s.call('createInvite', {sessionId:(await s.finish('alice')).sessionId});
  await s.call('visitCampaign', { inviteToken: token }, 'bob');
  const a = await s.finish('bob'); await s.finish('bob');
  await s.call('claimBenefit', { sessionId: a.sessionId }, 'bob');
  await s.contact({}, 'bob');
  assert.deepEqual(await s.call('getPromotionStats'), { arrivals: 1, finishes: 1, claims: 1, requests: 1 });
});
test('worker leaves events pending without config, retries failed sends, leases and recovers, isolates tenants', async () => {
  const s = setup(); await s.visit('alice'); const lead = await s.contact(), id = 'lead_' + lead.id;
  let sends = 0, serial = 0;
  const options = { store: s.store, ids: [id], now: s.now, leaseToken: () => 'lock-' + ++serial,
    endpoint: 'https://adapter.example/events', token: 'server-only-test-token', tenantId: 'tenant-a', send: async () => { sends++; } };
  assert.equal((await dispatch({ ...options, endpoint: '' })).configured, false);
  assert.equal((await s.store.get('outbox', id)).state, 'pending');
  assert.equal((await dispatch({ ...options, tenantId: 'tenant-b' })).skipped, 1); assert.equal(sends, 0);
  await dispatch({ ...options, send: async () => { throw new Error('HTTP_503'); } });
  assert.equal((await s.store.get('outbox', id)).state, 'retry');
  assert.equal((await dispatch(options)).skipped, 1);
  s.advance(30001);
  await Promise.all([dispatch(options), dispatch(options)]); assert.equal(sends, 1);
  assert.equal((await s.store.get('outbox', id)).state, 'delivered');
  const event = await s.store.get('outbox', id); event.state = 'processing'; event.leaseUntil = s.now() - 1; event.nextAttemptAt = s.now() - 1; await s.store.set('outbox', id, event);
  await dispatch(options); assert.equal(sends, 2);
});
test('revocation cannot overtake consultation delivery; eight failures require operator repair', async () => {
  const s = setup(); await s.visit('alice'); const lead = await s.contact({ marketing: true }); await s.call('revokeMarketing');
  const leadId = 'lead_' + lead.id, revokeId = 'revoke_' + lead.id, sent = [];
  const options = { store: s.store, ids: [revokeId, leadId], now: s.now, leaseToken: () => String(Math.random()),
    endpoint: 'https://adapter.example/events', token: 'test', tenantId: 'tenant-a', send: async (_url, _token, e) => sent.push(e._id) };
  await dispatch(options); assert.deepEqual(sent, [leadId]);
  assert((await s.store.get('outbox', revokeId)).nextAttemptAt > s.now());
  s.advance(60001); await dispatch(options); assert.deepEqual(sent, [leadId, revokeId]);
  const event = await s.store.get('outbox', leadId); event.state = 'retry'; event.attempts = 7; event.nextAttemptAt = 0; await s.store.set('outbox', leadId, event);
  await dispatch({ ...options, ids: [leadId], send: async () => { throw new Error('secret-from-upstream'); } });
  const dead = await s.store.get('outbox', leadId); assert.equal(dead.state, 'dead'); assert.equal(dead.lastError, 'NETWORK');
});
test('dependent revocation reports a failed parent for operator repair', async () => {
  const s = setup(); await s.visit('alice'); const lead = await s.contact({ marketing: true }); await s.call('revokeMarketing');
  const id = 'lead_' + lead.id, parent = await s.store.get('outbox', id); parent.state = 'dead'; await s.store.set('outbox', id, parent);
  const revokeId = 'revoke_' + lead.id;
  await dispatch({ store: s.store, ids: [revokeId], now: s.now, leaseToken: () => 'lock', endpoint: 'https://adapter.example',
    token: 'test', tenantId: 'tenant-a', send: async () => { assert.fail('dependent event must not be sent'); } });
  assert.equal((await s.store.get('outbox', revokeId)).lastError, 'DEPENDENCY');
});
