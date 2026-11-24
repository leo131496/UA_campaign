const test=require('node:test'),assert=require('node:assert/strict'),M=require('../studio/model'),R=require('../studio/room'),A=require('../studio/adventure'),{nextAction}=require('./adventure-driver.cjs');
function fixture(count=1,seed=72103,pressure='standard'){
 let serial=0,now=1000;const c=M.preset('general','adventure');c.seed=seed;c.adventure.pressure=pressure;
 let room=R.create(c,'expedition-'+seed,'h','我',now,count===1);
 const act=(type,extra={},actor='h')=>{room=R.apply(room,{id:'a'+(++serial),actor,type,...extra},now);return room;};
 for(let i=1;i<count;i++)act('addBot',{playerId:'p'+i});act('start');
 return {get room(){return room;},act,advance(ms){now+=ms;}};
}
function solve(s){let guard=0;while(s.room.status==='playing'&&guard++<200){const action=nextAction(s.room);s.act(action.type,action,A.turnPlayer(s.room).id);}assert.notEqual(s.room.status,'playing');assert(s.room.ledger.at(-1).passed,JSON.stringify({seed:s.room.config.seed,count:s.room.players.length,level:s.room.level,game:s.room.game.expedition}));}
test('standard expedition is winnable in solo, duo and six-player teams across varied maps, three chapters and exact rewards',()=>{
 for(const seed of [1,12,37,122,72103,999999])for(const count of [1,2,6]){const s=fixture(count,seed);for(let level=1;level<=3;level++){solve(s);assert.equal(s.room.ledger.length,level);assert(Object.values(s.room.totals).every(n=>n===level*(count===1?200:400)));if(level<3){assert.throws(()=>s.act('next'),/强化/);s.act('relic',{relic:level===1?'armor':'battery'});assert.throws(()=>s.act('relic',{relic:'prism'}),/已选择/);s.act('next');}}assert.equal(s.room.status,'finished');}
});
test('turns, adjacency, blocked terrain, finite skills and hints are enforced; passing and hints earn no contribution',()=>{
 const s=fixture(2),e=s.room.game.expedition;
 assert.throws(()=>s.act('move',{index:20},'p1'),/轮到/);
 assert.throws(()=>s.act('move',{index:e.pos}),/相邻/);
 const neighbor=A.neighbors(e.pos).find(i=>e.tiles[i].type!=='wall');s.act('move',{index:neighbor});assert.equal(A.turnPlayer(s.room).id,'p1');
 assert.throws(()=>s.act('move',{index:e.pos}),/轮到/);
 s.act('skill',{skill:'shield'},'p1');assert.equal(s.room.game.expedition.shields,2);
 s.act('pass');assert.throws(()=>s.act('skill',{skill:'shield'},'p1'),/用过/);
 s.act('hint',{},'p1');s.act('hint',{},'p1');assert.throws(()=>s.act('hint',{},'p1'),/用完/);assert.equal(s.room.game.contribution.h,1);assert.equal(s.room.game.contribution.p1,1);
});
test('all generated linked circuits and isolated 180-degree decoder moves remain solvable',()=>{
 for(let seed=1;seed<=50;seed++){const s=fixture(3,seed),e=s.room.game.expedition;assert(A.circuitPath(e.rings,e.target,true)?.length);for(let i=0;i<3;i++){const rings=e.rings.slice();rings[i]=(rings[i]+2)%4;assert.notEqual(A.circuitPath(rings,e.target,true),null);}}
});
test('energy exhaustion ends play and cannot award points; time expiry retains previous awards',()=>{
 const s=fixture(2);while(s.room.status==='playing')s.act('pass',{},A.turnPlayer(s.room).id);assert.equal(s.room.game.expedition.energy,0);assert.equal(s.room.ledger[0].passed,false);assert.deepEqual(Object.values(s.room.totals),[0,0]);assert.throws(()=>s.act('move',{index:0}),/游戏阶段/);
 const t=fixture();solve(t);t.act('relic',{relic:'prism'});t.act('next');t.advance(300001);t.act('tick');assert.equal(t.room.totals.h,200);assert.equal(t.room.ledger[1].passed,false);
});
test('camp equipment affects future chapters, configuration is immutable and plan parser supports expedition',()=>{
 const s=fixture();solve(s);s.act('relic',{relic:'battery'});s.act('next');assert.equal(s.room.game.expedition.maxEnergy,34);
 const p=M.plan('做一个通用品牌的遗迹远征，高手难度，关闭提示，最多添加 5 位好友，每关 300 秒');assert(!p.error,p.error);assert.equal(p.config.engine,'adventure');assert.equal(p.config.duration,300);assert.equal(p.config.adventure.pressure,'expert');assert.equal(p.config.adventure.guide,false);assert.deepEqual(M.decode(M.encode(p.config)),M.normalize(p.config));
});
test('decoder applies a 180-degree move without changing other rings or energy, and unique equipment cannot be wasted',()=>{
 const s=fixture(3,1234);while(s.room.game.expedition.phase==='map'&&s.room.status==='playing'){const action=nextAction(s.room);s.act(action.type,action,A.turnPlayer(s.room).id);}while(A.turnPlayer(s.room).id!=='p2')s.act('pass',{},A.turnPlayer(s.room).id);
 const before=M.copy(s.room.game.expedition);s.act('skill',{skill:'decode',index:0},'p2');const after=s.room.game.expedition;assert.equal(after.rings[0],(before.rings[0]+2)%4);assert.deepEqual(after.rings.slice(1),before.rings.slice(1));assert.equal(after.energy,before.energy);assert.equal(after.skills.p2,true);if(s.room.status==='playing')solve(s);
 const t=fixture();solve(t);t.act('relic',{relic:'prism'});t.act('next');solve(t);assert.throws(()=>t.act('relic',{relic:'prism'}),/已拥有/);t.act('relic',{relic:'armor'});t.act('next');assert.equal(t.room.game.expedition.prism,true);assert.equal(t.room.game.expedition.shields,2);
});
