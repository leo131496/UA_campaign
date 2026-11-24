(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model'));else root.CampaignRoom=factory(root.CampaignModel);})(typeof globalThis!=='undefined'?globalThis:this,function(M){
 'use strict';
 const ID=/^[a-zA-Z0-9_-]{1,80}$/;
 const need=(ok,message)=>{if(!ok)throw new Error(message);};
 function difficulty(config,count,level){
  const team=count>1;
  return {pairs:team?4+(level-1)*2+Math.floor((count-2)/2):level+1,
   target:team?6+level*2:4+level*2,goodSlots:team?5:7,
   questions:Math.min(config.questions.length,team?level+1:level),
   base:team?config.team.teamBase:config.team.soloBase,multiplier:config.team.multiplier};
 }
 function create(config,id,actor,name,now=Date.now(),solo=false){
  const c=M.normalize(config);need(!M.validate(c).length,'活动配置不完整');need(ID.test(id)&&ID.test(actor),'房间标识无效');
  return {id,config:c,host:actor,solo,players:[{id:actor,name:String(name||'我').slice(0,20),bot:false,ready:true}],status:'lobby',level:1,revision:0,createdAt:now,expiresAt:now+7200000,game:null,totals:{[actor]:0},ledger:[],seen:[],notice:''};
 }
 function shuffle(items,seed){const r=M.random(seed);for(let i=items.length-1;i;i--){const j=Math.floor(r()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
 function slots(room,actor,wave){const limit=room.game.rules.goodSlots;return shuffle(Array.from({length:9},(_,i)=>({good:i<limit,item:i%4})),room.config.seed+room.level*97+room.players.findIndex(p=>p.id===actor)*23+wave*51);}
 function begin(r,now){
  const rules=difficulty(r.config,r.players.length,r.level);
  r.status='playing';r.notice='';r.game={rules,deadline:now+r.config.duration*1000,contribution:Object.fromEntries(r.players.map(p=>[p.id,0])),matched:[],open:[],revealUntil:0,flips:0,question:0,votes:{},answered:false,correct:false,misses:0,lanes:{}};
  r.game.cards=shuffle(Array.from({length:rules.pairs*2},(_,i)=>({pair:i%rules.pairs,item:i%rules.pairs%4,variant:Math.floor(i%rules.pairs/4)+1})),r.config.seed+r.level*101);
  r.players.forEach(p=>{r.game.lanes[p.id]={hits:0,wave:0,popped:[],slots:slots(r,p.id,0)};});
 }
 function settle(r,passed,now){
  if(r.ledger.some(x=>x.level===r.level))return;
  const rules=r.game.rules,awards=r.players.map(p=>({id:p.id,name:p.name,bot:p.bot,contribution:r.game.contribution[p.id],base:rules.base,multiplier:passed?rules.multiplier:1,points:passed&&r.game.contribution[p.id]>0?rules.base*rules.multiplier:0}));
  awards.forEach(p=>r.totals[p.id]=(r.totals[p.id]||0)+p.points);
  r.ledger.push({level:r.level,passed,awards,at:now});r.status=passed&&r.level<r.config.team.levels?'between':'finished';r.notice=passed?'这一关，合作完成！':'本关未通关，已过关积分保留。';
 }
 function apply(room,action,now=Date.now()){
  need(room&&action&&ID.test(action.id||''),'操作标识无效');need(ID.test(action.actor||''),'玩家标识无效');need(now<room.expiresAt,'演示房间已过期，请重新创建');
  if(room.seen.includes(action.id))return room;
  const r=M.copy(room),a=action,member=r.players.find(p=>p.id===a.actor),host=a.actor===r.host;
  if(a.type==='join'){
   if(member)return room;
   need(r.status==='lobby'&&!r.solo,'本局已经锁定成员，请参加下一局');need(r.players.length<r.config.team.maxFriends+1,'好友名额已满');
   r.players.push({id:a.actor,name:String(a.name||'好友').slice(0,20),ready:false,bot:false});r.totals[a.actor]=0;
  }else{
   need(member,'你尚未加入这个房间');
   if(r.status==='playing'&&now>=r.game.deadline){settle(r,false,now);}
   else if(a.type==='addBot'){
    need(host&&r.status==='lobby'&&!r.solo,'只有队长可在准备时添加演示好友');need(r.players.length<r.config.team.maxFriends+1,'最多添加 '+r.config.team.maxFriends+' 位好友');need(ID.test(a.playerId||'')&&!r.players.some(p=>p.id===a.playerId),'好友标识无效');
    r.players.push({id:a.playerId,name:'演示好友 '+(r.players.filter(p=>p.bot).length+1),ready:true,bot:true});r.totals[a.playerId]=0;
   }else if(a.type==='ready'){need(r.status==='lobby','本局已开始');member.ready=a.ready===true;}
   else if(a.type==='remove'){need(host&&r.status==='lobby'&&a.playerId!==r.host,'开局前由队长管理好友');need(r.players.some(p=>p.id===a.playerId),'好友不存在');r.players=r.players.filter(p=>p.id!==a.playerId);delete r.totals[a.playerId];}
   else if(a.type==='leave'){need(r.status==='lobby'&&!host,'开局后成员已锁定；可返回查看或等待本局结束');r.players=r.players.filter(p=>p.id!==a.actor);delete r.totals[a.actor];}
   else if(a.type==='start'){need(host&&r.status==='lobby','只有队长能开始本局');need(r.solo||r.players.length>=2,'至少邀请 1 位好友，或返回选择单人');need(r.players.every(p=>p.ready),'还有好友未准备');begin(r,now);}
   else if(a.type==='next'){need(host&&r.status==='between','等待队长开始下一关');r.level++;begin(r,now);}
   else if(a.type==='end'){need(host&&r.status==='playing','只有队长可提前结束当前挑战');settle(r,false,now);}
   else if(a.type==='tick'){if(r.status==='playing'&&r.game.revealUntil&&now>=r.game.revealUntil){r.game.open=[];r.game.revealUntil=0;}else return room;}
   else {
    need(r.status==='playing','当前不是游戏阶段');
    const g=r.game;
    if(a.type==='flip'){
     need(r.config.engine==='memory','玩法不匹配');need(Number.isInteger(a.index)&&g.cards[a.index],'卡牌不存在');
     if(g.revealUntil&&now>=g.revealUntil){g.open=[];g.revealUntil=0;}
     need(!g.revealUntil,'记住这两张卡，再继续');need(!g.matched.includes(g.cards[a.index].pair)&&!g.open.some(x=>x.index===a.index),'这张卡已经翻开');
     need(r.players.length===1||!g.open.length||g.open[0].actor!==a.actor,'请另一位队友翻开第二张卡');
     g.open.push({index:a.index,actor:a.actor});g.flips++;
     if(g.open.length===2){const [x,y]=g.open;if(g.cards[x.index].pair===g.cards[y.index].pair){g.matched.push(g.cards[x.index].pair);new Set([x.actor,y.actor]).forEach(id=>g.contribution[id]++);g.open=[];r.notice='配对成功！';if(g.matched.length===g.rules.pairs)settle(r,true,now);}else{g.revealUntil=now+700;g.misses++;r.notice='记住位置，换个组合试试。';}}
    }else if(a.type==='collect'){
     need(r.config.engine==='collect','玩法不匹配');const lane=g.lanes[a.actor];need(lane.hits<g.rules.target,'你的分工已完成，等待队友');need(Number.isInteger(a.index)&&lane.slots[a.index]&&!lane.popped.includes(a.index),'目标不可点击');
     if(!lane.slots[a.index].good){g.misses++;r.notice='这是干扰项，留意彩色目标。';}
     else{lane.popped.push(a.index);lane.hits++;g.contribution[a.actor]++;r.notice=member.name+' 收集了 1 颗灵感';if(lane.popped.length===g.rules.goodSlots&&lane.hits<g.rules.target){lane.wave++;lane.popped=[];lane.slots=slots(r,a.actor,lane.wave);}if(r.players.every(p=>g.lanes[p.id].hits>=g.rules.target))settle(r,true,now);}
    }else if(a.type==='vote'){
     need(r.config.engine==='quiz','玩法不匹配');need(!g.answered&&g.votes[a.actor]===undefined,'你已经作答，请等待队友');need(Number.isInteger(a.answer)&&a.answer>=0&&a.answer<3,'选项无效');g.votes[a.actor]=a.answer;
     if(Object.keys(g.votes).length===r.players.length){const q=r.config.questions[g.question%r.config.questions.length],correct=r.players.filter(p=>g.votes[p.id]===q.answer);g.answered=true;g.correct=correct.length>=Math.floor(r.players.length/2)+1;
      if(g.correct){correct.forEach(p=>g.contribution[p.id]++);r.notice='全员作答，答案已达标！';if(g.question+1===g.rules.questions)settle(r,true,now);}else{g.misses++;r.notice='还没达成正确答案，读完解释再试一次。';}}
    }else if(a.type==='questionNext'){
     need(r.config.engine==='quiz'&&g.answered,'等待全员完成作答');if(g.correct)g.question++;g.votes={};g.answered=false;g.correct=false;r.notice='';
    }else throw new Error('不支持的操作');
   }
  }
  r.revision++;r.seen.push(a.id);r.seen=r.seen.slice(-200);return r;
 }
 return {create,apply,difficulty};
});
