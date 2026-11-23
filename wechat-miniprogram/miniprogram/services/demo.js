// Explicit device-local walkthrough; never used as a fallback for cloud failures.
const sample = require('../lib/sample');
const engine = require('../lib/engine');
const KEY = 'ua-native-demo-v1';
const copy = x => JSON.parse(JSON.stringify(x));
function read() { try { return wx.getStorageSync(KEY) || { sessions: {} }; } catch (_) { return { sessions: {} }; } }
function save(s) { wx.setStorageSync(KEY, s); }
function need(ok, message) { if (!ok) throw new Error(message); }
async function call(action, p) {
  const data = read();
  const campaign = copy(sample); delete campaign.benefitSections;
  switch (action) {
    case 'visitCampaign': return { campaign };
    case 'startChallenge': {
      const id = 'demo-' + p.requestId;
      const old = data.sessions[id];
      if (old && !old.result && old.expiresAt > Date.now()) return copy(old);
      const session = { sessionId: id, seed: Math.floor(Math.random() * 999999) + 1, expiresAt: Date.now() + 7200000 };
      data.sessions[id] = session;
      const keys = Object.keys(data.sessions); keys.slice(0, Math.max(0, keys.length - 30)).forEach(k => delete data.sessions[k]);
      save(data); return copy(session);
    }
    case 'finishChallenge': {
      const s = data.sessions[p.sessionId]; need(s, '演示记录不存在，请重新挑战');
      if (s.result) return copy(s.result);
      need(Array.isArray(p.moves) && p.moves.length <= 12, '行动记录无效');
      let state = engine.create(s.seed);
      p.moves.forEach(m => { need(state.status === 'playing', '本局已结束'); state = engine.advance(state, m); need(state, '行动记录无效'); });
      need(state.status !== 'playing', '请完成一局挑战');
      s.result = { sessionId: p.sessionId, campaignId: sample.id, seed: s.seed, status: state.status,
        score: engine.score(state), budget: state.budget, risk: state.risk, round: state.round, nodes: state.nodes, moves: p.moves };
      save(data); return copy(s.result);
    }
    case 'claimBenefit': {
      if (!data.claim) {
        need(data.sessions[p.sessionId] && data.sessions[p.sessionId].result, '完成一局即可领取，无需获胜');
        data.claim = { id: 'demo-claim', title: sample.benefitTitle, sections: copy(sample.benefitSections), createdAt: Date.now() }; save(data);
      }
      return copy(data.claim);
    }
    case 'createInvite': return { token: 'demo_local_only' };
    case 'getPromotionStats': return { arrivals: 0, finishes: 0, claims: 0, requests: 0 };
    case 'requestConsultation': {
      need(p.serviceConsent && p.privacyVersion === sample.privacyVersion, '请先同意本次咨询的信息使用说明');
      need(sample.topics.includes(p.topic), '请选择咨询主题');
      if (!data.lead) {
        data.lead = { id: 'demo-lead', topic: p.topic, maskedPhone: '虚拟手机号', marketing: p.marketing === true,
          shareRecap: p.shareRecap === true, syncState: 'demo', createdAt: Date.now() }; save(data);
      }
      return copy(data.lead);
    }
    case 'revokeMarketing': if (data.lead) { data.lead.marketing = false; data.lead.revocationState = 'demo'; save(data); } return { marketing: false };
    case 'getMyActivity': return { campaign, claim: data.claim || null, lead: data.lead || null };
    default: throw new Error('演示模式不支持此操作');
  }
}
module.exports = { call };
