const test=require('node:test'),assert=require('node:assert/strict'),M=require('../studio/model'),R=require('../studio/room');
function fixture(engine='memory',count=1,settings={}){let time=10000,serial=0;const config=M.preset('general',engine);Object.assign(config.team,settings);let room=R.create(config,'room','host','我',time,count===1);const act=(type,extra={},actor='host')=>{room=R.apply(room,{id:'a'+(++serial),actor,type,...extra},time);return room;};for(let i=1;i<count;i++)act('addBot',{playerId:'p'+i});act('start');return {get room(){return room;},act,advance(ms){time+=ms;},time:()=>time};}
function solve(s){const actorIds=s.room.players.map(p=>p.id);while(s.room.status==='playing'){
 const r=s.room,g=r.game;
 if(r.config.engine==='memory'){const pair=g.cards.find(c=>!g.matched.includes(c.pair)).pair,ids=g.cards.map((c,i)=>c.pair===pair?i:-1).filter(i=>i>=0),first=actorIds[g.matched.length%actorIds.length],second=actorIds[(g.matched.length+1)%actorIds.length];s.act('flip',{index:ids[0]},first);s.act('flip',{index:ids[1]},second);}
 else if(r.config.engine==='collect'){for(const p of r.players){if(s.room.status!=='playing')break;const lane=s.room.game.lanes[p.id];if(lane.hits<s.room.game.rules.target)s.act('collect',{index:lane.slots.findIndex((x,i)=>x.good&&!lane.popped.includes(i))},p.id);}}
 else{for(const p of r.players){if(s.room.status!=='playing')break;if(s.room.game.votes[p.id]===undefined)s.act('vote',{answer:s.room.config.questions[s.room.game.question].answer},p.id);}if(s.room.status==='playing')s.act('questionNext');}
}}
test('all three engines have harder group objectives and settle each passed level exactly once',()=>{
 for(const engine of ['memory','collect','quiz'])for(const count of [1,2,6]){
  const s=fixture(engine,count);for(let level=1;level<=3;level++){assert.equal(s.room.level,level);solve(s);const award=count===1?200:400;assert(s.room.players.every(p=>s.room.totals[p.id]===award*level));assert.equal(s.room.ledger.length,level);if(level<3)s.act('next');}
  assert.equal(s.room.status,'finished');assert.throws(()=>s.act('next'));assert.equal(s.room.ledger.length,3);
 }
 for(let level=1;level<=3;level++){const c=M.preset('general'),solo=R.difficulty(c,1,level),team=R.difficulty(c,6,level);assert(team.pairs>solo.pairs);assert(team.target>solo.target);assert(team.goodSlots<solo.goodSlots);}
});
test('friend limit excludes host, cannot exceed five, and joining locks at start',()=>{
 for(let cap=0;cap<=5;cap++){
  const c=M.preset('general');c.team.maxFriends=cap;let r=R.create(c,'r','host','队长',0,false);
  for(let i=1;i<=cap;i++)r=R.apply(r,{id:'j'+i,actor:'p'+i,type:'join'},1);
  assert.equal(r.players.length,cap+1);assert.throws(()=>R.apply(r,{id:'overflow',actor:'extra',type:'join'},1),/名额已满/);
  if(cap){assert.throws(()=>R.apply(r,{id:'s',actor:'host',type:'start'},2),/未准备/);for(let i=1;i<=cap;i++)r=R.apply(r,{id:'ready'+i,actor:'p'+i,type:'ready',ready:true},3);r=R.apply(r,{id:'s2',actor:'host',type:'start'},4);assert.throws(()=>R.apply(r,{id:'late',actor:'late',type:'join'},5),/锁定/);}
 }
 const c=M.preset('general');c.team.maxFriends=6;assert(M.validate(c).length);assert.throws(()=>R.create(c,'r','h','h'));
});
test('cooperative memory requires different players; idle players earn zero',()=>{
 const s=fixture('memory',3),g=s.room.game,pair=g.cards[0].pair,second=g.cards.findIndex((c,i)=>i&&c.pair===pair);s.act('flip',{index:0});assert.throws(()=>s.act('flip',{index:second}),/另一位队友/);s.act('flip',{index:second},'p1');
 while(s.room.status==='playing'){const g=s.room.game,pair=g.cards.find(c=>!g.matched.includes(c.pair)).pair,ids=g.cards.map((c,i)=>c.pair===pair?i:-1).filter(i=>i>=0);s.act('flip',{index:ids[0]});s.act('flip',{index:ids[1]},'p1');}
 assert.equal(s.room.totals.host,400);assert.equal(s.room.totals.p1,400);assert.equal(s.room.totals.p2,0);
});
test('collect requires every member; quiz waits for every vote and a correct majority',()=>{
 const c=fixture('collect',2);while(c.room.game.lanes.host.hits<c.room.game.rules.target){const l=c.room.game.lanes.host;c.act('collect',{index:l.slots.findIndex((x,i)=>x.good&&!l.popped.includes(i))});}assert.equal(c.room.status,'playing');assert.equal(c.room.totals.host,0);solve(c);assert.equal(c.room.totals.host,400);
 const q=fixture('quiz',3);q.act('vote',{answer:0});assert.equal(q.room.game.answered,false);q.act('vote',{answer:1},'p1');assert.equal(q.room.game.answered,false);q.act('vote',{answer:1},'p2');assert.equal(q.room.game.correct,false);assert.equal(q.room.status,'playing');q.act('questionNext');assert.deepEqual(q.room.game.votes,{});solve(q);assert.equal(q.room.status,'between');
});
test('timeouts keep past awards, stale and repeated actions cannot mint points',()=>{
 const s=fixture();solve(s);assert.equal(s.room.totals.host,200);s.act('next');s.advance(60001);s.act('tick');assert.equal(s.room.status,'finished');assert.equal(s.room.totals.host,200);assert.equal(s.room.ledger[1].passed,false);assert.equal(s.room.ledger[1].awards[0].points,0);
 const a={id:'repeat',actor:'host',type:'tick'},r=R.apply(s.room,a,s.time());assert.deepEqual(R.apply(r,a,s.time()),r);
 assert.throws(()=>R.apply(s.room,{id:'x',actor:'outsider',type:'tick'},s.time()),/尚未加入/);
 assert.throws(()=>R.apply(s.room,{id:'expired',actor:'host',type:'tick'},8000000),/过期/);
});
test('AI sample applies friend cap, per-person base points and clear multiplier with validation',()=>{
 const p=M.plan('做一个不限行业的翻牌游戏，最多添加 3 位好友，单人 50 分，组队每人 150 分，通关翻倍');assert(!p.error,p.error);assert.equal(p.config.industryId,'general');assert.deepEqual(p.config.team,{maxFriends:3,soloBase:50,teamBase:150,multiplier:2,levels:3});assert(M.plan('最多添加 6 位好友组队闯关').error);assert(M.plan('单人 200 分，组队 100 分').error);
 const c=M.preset('retail');c.team.multiplier=3;const round=M.decode(M.encode(c));assert.deepEqual(round.team,c.team);assert.equal(M.preset().industryId,'general');
});
