'use strict';
const crypto = require('crypto');
const engine = require('./engine');
const digest = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 40);
const key = (...parts) => digest(parts.join('|'));
const ID = /^[a-zA-Z0-9_-]{1,64}$/;
class BusinessError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function assert(condition, code, message) { if (!condition) throw new BusinessError(code, message); }
function publicCampaign(c) {
  return { id: c._id, brand: c.brand, title: c.title, subtitle: c.subtitle,
    modules: c.modules, benefitTitle: c.benefitTitle, topics: c.topics,
    privacyVersion: c.privacyVersion, privacyText: c.privacyText,
    operatorName: c.operatorName, privacyContact: c.privacyContact,
    customerService: c.customerService || null, endsAt: c.endsAt };
}
function replay(seed, moves) {
  assert(Array.isArray(moves) && moves.length > 0 && moves.length <= 12, 'MOVES', '行动记录不完整');
  let state = engine.create(seed);
  for (const move of moves) {
    assert(move && typeof move.card === 'string' && Number.isInteger(move.target) && move.target >= 0 && move.target < 3,
      'MOVES', '行动记录无效');
    assert(state.status === 'playing', 'MOVES', '本局结束后不能继续行动');
    const next = engine.advance(state, move);
    assert(next, 'MOVES', '存在不符合游戏规则的行动');
    state = next;
  }
  assert(state.status !== 'playing', 'UNFINISHED', '请先完成本局挑战');
  return state;
}
function createService({ store, now = Date.now, random = n => crypto.randomBytes(n).toString('hex'),
  phone = async () => { throw new Error('手机号服务未配置'); } }) {
  const get = (table, id) => store.get(table, id);
  function validId(value) { assert(typeof value === 'string' && ID.test(value), 'PARAM', '活动参数无效'); return value; }
  function identity(context) { assert(context && typeof context.openid === 'string' && context.openid, 'AUTH', '请通过微信小程序访问'); return context.openid; }
  async function campaign(id, tx = store, active = true) {
    const c = await tx.get('campaigns', validId(id));
    assert(c, 'CAMPAIGN', '活动不存在');
    if (active) assert(c.status === 'active' && now() >= c.startsAt && now() < c.endsAt, 'CLOSED', '活动尚未开始或已结束');
    return c;
  }
  async function increment(tx, campaignId, inviter, field) {
    for (const owner of [null, inviter].filter(v => v !== undefined && v !== '')) {
      const id = key(campaignId, owner || 'campaign-total');
      const old = await tx.get('stats', id) || { campaignId, owner, arrivals: 0, finishes: 0, claims: 0, requests: 0 };
      old[field] += 1; await tx.set('stats', id, old);
    }
  }
  async function enqueue(tx, id, c, type, data) {
    await tx.set('outbox', id, { tenantId: c.tenantId, campaignId: c._id, type, data,
      state: 'pending', attempts: 0, nextAttemptAt: now(), createdAt: now(), leaseUntil: 0 });
  }
  function safeLead(l, sync) {
    return { id: l._id, topic: l.topic, maskedPhone: l.maskedPhone, marketing: l.marketing,
      shareRecap: l.shareRecap, createdAt: l.createdAt, syncState: sync ? sync.state : 'pending' };
  }
  const actions = {
    async visitCampaign(p, uid) {
      let token = null;
      if (p.inviteToken && /^[a-f0-9]{24}$/.test(p.inviteToken)) token = await get('invites', p.inviteToken);
      const c = await campaign(token && token.expiresAt > now() ? token.campaignId : p.campaignId);
      const inviter = token && token.expiresAt > now() && token.campaignId === c._id && token.owner !== uid ? token.owner : '';
      const id = key(c._id, uid);
      await store.transact(async tx => {
        if (await tx.get('visitors', id)) return;
        await tx.set('visitors', id, { campaignId: c._id, owner: uid, inviter, createdAt: now(), finished: false });
        await increment(tx, c._id, inviter, 'arrivals');
      });
      return { campaign: publicCampaign(c) };
    },
    async startChallenge(p, uid) {
      const c = await campaign(p.campaignId), requestId = validId(p.requestId), id = key(c._id, uid, requestId);
      return store.transact(async tx => {
        const visitor = await tx.get('visitors', key(c._id, uid));
        assert(visitor, 'VISIT', '请先从活动首页进入');
        const old = await tx.get('sessions', id);
        if (old) {
          assert(old.expiresAt > now() && !old.result, 'SESSION', '这局挑战已结束或过期，请重新开始');
          return { sessionId: id, seed: old.seed, expiresAt: old.expiresAt };
        }
        const day = Math.floor(now() / 86400000);
        const count = visitor.day === day ? visitor.starts || 0 : 0;
        assert(count < (c.dailyPlayLimit || 30), 'LIMIT', '今天挑战次数已用完，明天再来');
        visitor.day = day; visitor.starts = count + 1;
        await tx.set('visitors', key(c._id, uid), visitor);
        const session = { campaignId: c._id, owner: uid, seed: parseInt(random(3), 16) % 999999 + 1,
          createdAt: now(), expiresAt: now() + 2 * 3600000, result: null };
        await tx.set('sessions', id, session);
        return { sessionId: id, seed: session.seed, expiresAt: session.expiresAt };
      });
    },
    async finishChallenge(p, uid) {
      validId(p.sessionId);
      return store.transact(async tx => {
        const s = await tx.get('sessions', p.sessionId);
        assert(s && s.owner === uid, 'SESSION', '无法访问这局挑战');
        assert(Array.isArray(p.moves) && p.moves.length > 0 && p.moves.length <= 12, 'MOVES', '行动记录不完整');
        const moves = Array.isArray(p.moves) ? p.moves.map(m => m && ({ card: m.card, target: m.target })) : p.moves;
        const signature = digest(JSON.stringify(moves) || '');
        if (s.result) {
          assert(s.signature === signature, 'CONFLICT', '该挑战已提交其他行动记录');
          return s.result;
        }
        assert(s.expiresAt > now(), 'EXPIRED', '挑战已过期，请重新开始');
        await campaign(s.campaignId, tx);
        const state = replay(s.seed, moves);
        const result = { sessionId: p.sessionId, campaignId: s.campaignId, seed: s.seed,
          status: state.status, score: engine.score(state), budget: state.budget, risk: state.risk,
          round: state.round, nodes: state.nodes, moves };
        s.result = result; s.signature = signature; s.finishedAt = now();
        await tx.set('sessions', p.sessionId, s);
        const id = key(s.campaignId, uid), v = await tx.get('visitors', id);
        if (!v.finished) { v.finished = true; await tx.set('visitors', id, v); await increment(tx, s.campaignId, v.inviter, 'finishes'); }
        return result;
      });
    },
    async claimBenefit(p, uid) {
      const c = await campaign(p.campaignId), id = key(c._id, uid);
      return store.transact(async tx => {
        const old = await tx.get('claims', id);
        if (old) return { id, title: old.title, sections: old.sections, createdAt: old.createdAt };
        const current = await campaign(c._id, tx);
        const s = await tx.get('sessions', validId(p.sessionId));
        assert(s && s.owner === uid && s.campaignId === c._id && s.result, 'FINISH', '完成一局即可领取，无需获胜');
        assert(current.stock === null || Number.isInteger(current.stock) && current.stock > 0, 'STOCK', '这份资料已领完');
        if (current.stock !== null) { current.stock -= 1; await tx.set('campaigns', c._id, current); }
        const claim = { campaignId: c._id, owner: uid, title: c.benefitTitle, sections: c.benefitSections, createdAt: now() };
        await tx.set('claims', id, claim);
        const v = await tx.get('visitors', id);
        await increment(tx, c._id, v.inviter, 'claims');
        await enqueue(tx, 'claim_' + id, c, 'benefit.claimed', { participantId: id, benefitTitle: c.benefitTitle, attributionId: v.inviter ? key(c._id, v.inviter) : null });
        return { id, title: claim.title, sections: claim.sections, createdAt: claim.createdAt };
      });
    },
    async createInvite(p, uid) {
      const c = await campaign(p.campaignId), id = key(c._id, uid);
      return store.transact(async tx => {
        const v = await tx.get('visitors', id);
        assert(v, 'VISIT', '请先打开活动首页');
        if (v.inviteToken) {
          const old = await tx.get('invites', v.inviteToken);
          if (old && old.expiresAt > now()) return { token: v.inviteToken };
        }
        const token = random(12);
        await tx.set('invites', token, { owner: uid, campaignId: c._id, createdAt: now(), expiresAt: c.endsAt });
        v.inviteToken = token; await tx.set('visitors', id, v);
        return { token };
      });
    },
    async getPromotionStats(p, uid) {
      await campaign(p.campaignId, store, false);
      const s = await get('stats', key(p.campaignId, uid));
      return { arrivals: s && s.arrivals || 0, finishes: s && s.finishes || 0, claims: s && s.claims || 0, requests: s && s.requests || 0 };
    },
    async requestConsultation(p, uid) {
      const c = await campaign(p.campaignId), id = key(c._id, uid);
      assert(p.serviceConsent === true && p.privacyVersion === c.privacyVersion, 'CONSENT', '请阅读并同意本次咨询所需的信息使用说明');
      assert(c.topics.includes(p.topic), 'TOPIC', '请选择活动提供的咨询主题');
      assert(typeof p.marketing === 'boolean' && typeof p.shareRecap === 'boolean', 'CONSENT', '请确认可选授权');
      const snapshot = { topic: p.topic, marketing: p.marketing, shareRecap: p.shareRecap,
        sessionId: p.shareRecap ? validId(p.sessionId) : '', privacyVersion: c.privacyVersion };
      const signature = digest(JSON.stringify(snapshot));
      const old = await get('leads', id);
      if (old) {
        assert(old.signature === signature, 'DUPLICATE', '本活动已有咨询申请，可在“我的资料”查看');
        return safeLead(old, await get('outbox', 'lead_' + id));
      }
      assert(typeof p.phoneCode === 'string' && p.phoneCode.length > 0 && p.phoneCode.length < 512, 'PHONE', '请通过微信授权手机号');
      assert(await get('visitors', id), 'VISIT', '请先打开活动首页');
      let recap = null;
      if (p.shareRecap) {
        const s = await get('sessions', p.sessionId);
        assert(s && s.owner === uid && s.campaignId === c._id && s.result, 'RECAP', '找不到可附上的本人挑战记录');
        recap = { score: s.result.score, status: s.result.status, budget: s.result.budget, risk: s.result.risk };
      }
      const verifiedPhone = await phone(p.phoneCode);
      assert(verifiedPhone && /^[+0-9]{6,20}$/.test(verifiedPhone), 'PHONE', '手机号验证失败，请重新授权');
      return store.transact(async tx => {
        await campaign(c._id, tx);
        const duplicate = await tx.get('leads', id);
        if (duplicate) {
          assert(duplicate.signature === signature, 'DUPLICATE', '本活动已有咨询申请');
          return safeLead(duplicate, await tx.get('outbox', 'lead_' + id));
        }
        const v = await tx.get('visitors', id);
        const l = { _id: id, campaignId: c._id, owner: uid, topic: p.topic,
          phone: verifiedPhone, maskedPhone: verifiedPhone.slice(0, 3) + '****' + verifiedPhone.slice(-4),
          marketing: p.marketing, shareRecap: p.shareRecap, recap, privacyVersion: c.privacyVersion,
          serviceConsent: true, signature, createdAt: now() };
        await tx.set('leads', id, l);
        await increment(tx, c._id, v.inviter, 'requests');
        await enqueue(tx, 'lead_' + id, c, 'consultation.requested', { participantId: id, phone: verifiedPhone,
          topic: p.topic, serviceConsent: true, marketing: p.marketing, privacyVersion: c.privacyVersion,
          consentAt: l.createdAt, recap, attributionId: v.inviter ? key(c._id, v.inviter) : null });
        return safeLead(l);
      });
    },
    async revokeMarketing(p, uid) {
      const c = await campaign(p.campaignId, store, false), id = key(c._id, uid);
      await store.transact(async tx => {
        const l = await tx.get('leads', id);
        assert(l, 'LEAD', '暂无咨询申请');
        if (!l.marketing) return;
        l.marketing = false; l.revokedAt = now(); await tx.set('leads', id, l);
        // If a previous event is in flight, a later revocation event corrects the remote state.
        const original = await tx.get('outbox', 'lead_' + id);
        if (original && original.state !== 'delivered') { original.data.marketing = false; await tx.set('outbox', original._id, original); }
        await enqueue(tx, 'revoke_' + id, c, 'consent.revoked', { participantId: id, marketing: false, revokedAt: l.revokedAt, dependsOn: 'lead_' + id });
      });
      return { marketing: false };
    },
    async getMyActivity(p, uid) {
      const c = await campaign(p.campaignId, store, false), id = key(c._id, uid);
      const claim = await get('claims', id), lead = await get('leads', id);
      const revoked = lead && lead.revokedAt ? await get('outbox', 'revoke_' + id) : null;
      return { campaign: publicCampaign(c), claim: claim ? { id, title: claim.title, sections: claim.sections, createdAt: claim.createdAt } : null,
        lead: lead ? { ...safeLead(lead, await get('outbox', 'lead_' + id)), revocationState: revoked ? revoked.state : null } : null };
    }
  };
  return { async call(action, payload, context) {
    const uid = identity(context);
    assert(Object.prototype.hasOwnProperty.call(actions, action), 'ACTION', '不支持的操作');
    assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'PARAM', '请求参数无效');
    return actions[action](payload, uid);
  } };
}
module.exports = { createService, BusinessError, replay, key, publicCampaign };
