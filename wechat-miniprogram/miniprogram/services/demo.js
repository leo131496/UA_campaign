// Explicit local demo. Shared challenge data is public and self-reported; it is never a real lead.
const sample=require('../lib/sample'),spot=require('../lib/spot');
const KEY='ua-spot-demo-v1';
const copy=x=>JSON.parse(JSON.stringify(x));
function read(){try{return wx.getStorageSync(KEY)||{sessions:{}};}catch(_){return {sessions:{}};}}
function save(data){wx.setStorageSync(KEY,data);}
function need(ok,message){if(!ok)throw new Error(message);}
async function call(action,p){
  const data=read(),campaign=copy(sample);delete campaign.benefitSections;
  switch(action){
    case 'visitCampaign':{const friend=spot.decodeDuel(p.duel);return {campaign,friend:friend?{...friend,foundCount:friend.found.length,duel:p.duel}:null};}
    case 'startChallenge':{
      const id='demo-'+p.requestId,old=data.sessions[id];if(old&&!old.result&&old.expiresAt>Date.now())return copy(old);
      const friend=spot.decodeDuel(p.duel),session={sessionId:id,seed:friend?friend.seed:Math.floor(Math.random()*999999)+1,
        level:friend?friend.level:[0,1,2].includes(p.level)?p.level:1,friend,expiresAt:Date.now()+7200000};
      data.sessions[id]=session;Object.keys(data.sessions).slice(0,-30).forEach(k=>delete data.sessions[k]);save(data);return copy(session);
    }
    case 'finishChallenge':{
      const session=data.sessions[p.sessionId];need(session,'这局记录已失效，请重新开始');if(session.result)return copy(session.result);
      const state=spot.replay(session.seed,session.level,p.moves);
      session.result={sessionId:p.sessionId,campaignId:sample.id,...spot.summary(state),match:session.friend?spot.match(session.friend,state):null,moves:p.moves};
      if(session.result.match)data.duels=(data.duels||[]).concat({id:p.sessionId,...session.result.match,createdAt:Date.now()}).slice(-10);
      save(data);return copy(session.result);
    }
    case 'claimBenefit':{
      if(!data.claim){need(data.sessions[p.sessionId]&&data.sessions[p.sessionId].result,'玩一局即可领取小礼物');
        data.claim={id:'demo-claim',title:sample.benefitTitle,sections:copy(sample.benefitSections),createdAt:Date.now()};save(data);}
      return copy(data.claim);
    }
    case 'createInvite':{const session=data.sessions[p.sessionId];need(session&&session.result,'先玩一局，再邀请朋友比默契');return {token:'demo_local_only',duel:spot.encodeDuel(session.result)};}
    case 'getPromotionStats':return {arrivals:0,finishes:0,claims:0,requests:0};
    case 'requestConsultation':{
      need(p.serviceConsent&&p.privacyVersion===sample.privacyVersion,'请先同意本次联系的信息使用说明');need(sample.topics.includes(p.topic),'请选择想了解的内容');
      if(!data.lead){data.lead={id:'demo-lead',topic:p.topic,maskedPhone:'虚拟手机号',marketing:p.marketing===true,shareRecap:p.shareRecap===true,syncState:'demo',createdAt:Date.now()};save(data);}return copy(data.lead);
    }
    case 'revokeMarketing':if(data.lead){data.lead.marketing=false;data.lead.revocationState='demo';save(data);}return {marketing:false};
    case 'getMyActivity':return {campaign,duels:(data.duels||[]).slice().reverse(),claim:data.claim||null,lead:data.lead||null};
    default:throw new Error('演示模式不支持此操作');
  }
}
module.exports={call};
