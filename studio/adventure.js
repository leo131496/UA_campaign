(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model'));else root.CampaignAdventure=factory(root.CampaignModel);})(typeof globalThis!=='undefined'?globalThis:this,function(M){
 'use strict';
 const need=(ok,msg)=>{if(!ok)throw new Error(msg);};
 const roles=[{name:'供能师',skill:'charge',label:'应急充能',detail:'恢复 5 点能量'}, {name:'守护者',skill:'shield',label:'展开力场',detail:'抵挡接下来 2 次伤害'}, {name:'解码师',skill:'decode',label:'独立解码',detail:'单环转 180°，不牵动邻环'}];
 const relics=[{id:'battery',name:'长续航电池',icon:'ϟ',detail:'以后每关的初始能量 +5'}, {id:'armor',name:'星光护甲',icon:'⬡',detail:'以后每关自带 2 层护盾'}, {id:'prism',name:'解码棱镜',icon:'◈',detail:'以后每关首次转动核心不消耗能量'}];
 const chapters=['漂流之岛','回声遗迹','星核之门'];
 const neighbors=i=>[i%5?i-1:-1,i%5<4?i+1:-1,i>=5?i-5:-1,i<20?i+5:-1].filter(x=>x>=0);
 const turnPlayer=r=>r.players[r.game.expedition.turn%r.players.length];
 function rotate(rings,index,coupled){const next=rings.slice();next[index]=(next[index]+1)%4;if(coupled)next[(index+1)%3]=(next[(index+1)%3]+1)%4;return next;}
 // Only 64 circuit states. Breadth-first search gives an explainable next step, never hidden map information.
 function circuitPath(rings,target,coupled){const queue=[{rings,path:[]}],seen=new Set([rings.join()]);for(let head=0;head<queue.length;head++){const item=queue[head];if(item.rings.every((x,i)=>x===target[i]))return item.path;for(let i=0;i<3;i++){const next=rotate(item.rings,i,coupled),key=next.join();if(!seen.has(key)){seen.add(key);queue.push({rings:next,path:[...item.path,i]});}}}return null;}
 function hash(id){return Array.from(id).reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,0);}
 function create(r){
  const count=r.players.length,team=count>1,level=r.level,rand=M.random(r.config.seed+hash(r.id)+level*991),transform=Math.floor(rand()*8);
  function map(i){let x=i%5,y=Math.floor(i/5);if(transform>=4)x=4-x;for(let n=0;n<transform%4;n++)[x,y]=[4-y,x];return y*5+x;}
  const tiles=Array.from({length:25},()=>({type:'path',used:false}));
  const place=(i,type,extra={})=>tiles[map(i)]={type,used:false,...extra};
  [6,8,16,18].forEach(i=>place(i,'wall'));
  place(20,'start');place(4,'gate');place(0,'shard');place(12,'shard',{locked:team||level>1});
  if(team||level===3)place(24,'shard');else place(24,'supply');
  if(team||level>1)place(22,'switch');
  [10,14].forEach(i=>place(i,'hazard'));if(level>1||team)place(2,'hazard');
  // Two alternative caches create a route choice; their value varies each expedition.
  [5,19].forEach(i=>place(i,'supply',{value:4+Math.floor(rand()*3)}));
  place(21,'supply',{value:3});
  const owned=r.relics||[],pressure=r.config.adventure.pressure;
  const maxEnergy=29+(team?4:0)+(level===3?4:0)+(pressure==='relaxed'?8:pressure==='expert'?-4:0)+owned.filter(x=>x==='battery').length*5;
  const coupled=team||level===3,target=Array.from({length:3},()=>Math.floor(rand()*4));let rings=target.slice();
  for(let i=0;i<(team?3:1)+level;i++)rings=rotate(rings,Math.floor(rand()*3),coupled);
  if(rings.every((x,i)=>x===target[i]))rings=rotate(rings,0,coupled);
  return {tiles,pos:map(20),gate:map(4),energy:maxEnergy,maxEnergy,shields:owned.filter(x=>x==='armor').length*2,
   shards:0,required:team||level===3?3:2,switchOn:false,phase:'map',turn:0,steps:0,skills:{},
   rings,target,coupled,prism:owned.includes('prism'),hints:2,hint:'',log:['飞船已抵达。收集光片，带大家穿过星门。'],
   storm:team||level>1,stormOffset:Math.floor(rand()*5),stormEvery:pressure==='expert'?3:4,
   circuitMoves:0,damage:0,visited:[map(20)]};
 }
 function stormRow(e,turn=e.turn){return (Math.floor(turn/e.stormEvery)+e.stormOffset)%5;}
 function log(e,msg){e.log.push(msg);e.log=e.log.slice(-4);e.hint='';}
 function advice(r){const e=r.game.expedition;if(e.phase==='core'){const path=circuitPath(e.rings,e.target,e.coupled);return path&&path.length?`先转动 ${['A','B','C'][path[0]]} 环。当前结构最少还需 ${path.length} 次转动${e.coupled?'；转一个环会带动右侧环':'；各环独立转动'}。`:'三个环已对齐。';}
  const destinations=e.tiles.map((t,i)=>({t,i})).filter(({t})=>(t.type==='shard'&&!t.used&&(!t.locked||e.switchOn))||(t.type==='switch'&&!t.used)||(e.energy<12&&t.type==='supply'&&!t.used));
  if(e.shards===e.required)destinations.push({t:{type:'gate'},i:e.gate});
  let best=null;for(const dest of destinations){const queue=[[e.pos]],seen=new Set([e.pos]);for(let h=0;h<queue.length;h++){const path=queue[h],last=path.at(-1);if(last===dest.i){if(!best||path.length<best.path.length)best={path,dest};break;}for(const i of neighbors(last)){const t=e.tiles[i];if(t.type==='wall'||t.locked&&!e.switchOn||seen.has(i))continue;seen.add(i);queue.push([...path,i]);}}}
  if(!best||best.path.length<2)return '先观察地图，避开能量不足的长路；供能师可以恢复 5 点能量。';
  const names={shard:'光片',switch:'开关',supply:'补给',gate:'星门'},i=best.path[1];return `可先往第 ${Math.floor(i/5)+1} 行、第 ${i%5+1} 列走，前往最近的${names[best.dest.t.type]}。这是按步数找路；仍要留意风暴和陷阱。`;
 }
 function step(r,a){
  const e=r.game.expedition,member=r.players.find(p=>p.id===a.actor),team=r.players.length>1;
  if(a.type==='hint'){need(r.config.adventure.guide,'本活动未开启提示');need(e.hints>0,'本关的 2 次提示已用完');e.hints--;e.hint=advice(r);return null;}
  need(turnPlayer(r).id===a.actor,'现在轮到 '+turnPlayer(r).name+' 行动');
  if(a.type==='move'){
   need(e.phase==='map','请先完成星门机关');need(Number.isInteger(a.index)&&neighbors(e.pos).includes(a.index),'每次只能走到上下左右相邻的一格');
   const t=e.tiles[a.index];need(t.type!=='wall','这格是岩壁，请绕行');need(!t.locked||e.switchOn,'光片被封印，先踩亮地图上的开关');
   e.energy--;e.pos=a.index;e.steps++;if(!e.visited.includes(e.pos))e.visited.push(e.pos);let message=member.name+' 前进了一格';
   if(t.type==='hazard'){if(e.shields){e.shields--;message='护盾挡住了遗迹陷阱';}else{e.energy-=3;e.damage+=3;message='踩中陷阱，额外消耗 3 能量';}}
   if(t.type==='shard'&&!t.used){t.used=true;e.shards++;message='找到一枚光片！'+e.shards+' / '+e.required;}
   if(t.type==='supply'&&!t.used){t.used=true;const gain=Math.min(e.maxEnergy-e.energy,t.value||5);e.energy+=gain;message='找到补给，恢复 '+gain+' 能量';}
   if(t.type==='switch'&&!t.used){t.used=true;e.switchOn=true;message='封印已解除，中间的光片可以取走了';}
   if(t.type==='gate'){if(e.shards===e.required){e.phase='core';message='光片集齐！对齐三个星环，打开星门。';}else message='还差 '+(e.required-e.shards)+' 枚光片，星门尚未启动';}
   log(e,message);
  }else if(a.type==='rotate'){
   need(e.phase==='core','抵达星门后才能解码');need(Number.isInteger(a.index)&&a.index>=0&&a.index<3,'星环不存在');
   e.rings=rotate(e.rings,a.index,e.coupled);if(e.prism)e.prism=false;else e.energy--;e.circuitMoves++;log(e,member.name+' 转动了 '+['A','B','C'][a.index]+' 环');
  }else if(a.type==='skill'){
   need(!e.skills[a.actor],'本关技能已用过');const role=roles[r.players.findIndex(p=>p.id===a.actor)%3];
   need(['charge','shield','decode'].includes(a.skill)&&(!team||role.skill===a.skill),'请选择自己的角色技能');
   if(a.skill==='charge'){need(e.energy<=e.maxEnergy-3,'能量还很充足，至少消耗 3 点后再充能');e.energy=Math.min(e.maxEnergy,e.energy+5);log(e,'应急充能：恢复最多 5 点能量');}
   if(a.skill==='shield'){e.shields+=2;log(e,'守护力场已展开，可以挡住 2 次伤害');}
   if(a.skill==='decode'){need(e.phase==='core','独立解码需要在星门使用');need(Number.isInteger(a.index)&&a.index>=0&&a.index<3,'请选择要解码的环');e.rings=rotate(rotate(e.rings,a.index,false),a.index,false);log(e,'独立解码：单独转动 180°，作用于 '+['A','B','C'][a.index]+' 环，不带动邻环');}
   e.skills[a.actor]=true;
  }else if(a.type==='pass'){
   need(team,'单人不需要交接回合');e.energy--;log(e,member.name+' 交接回合，消耗 1 能量');
  }else throw new Error('不支持的远征操作');
  if(a.type!=='pass')r.game.contribution[a.actor]++;
  e.turn++;
  if(e.phase==='core'&&e.rings.every((x,i)=>x===e.target[i])&&e.energy>=0){log(e,'星门已开启！这一路的判断，终于有了回响。');return 'passed';}
  if(e.storm&&e.phase==='map'&&e.turn%e.stormEvery===0&&Math.floor(e.pos/5)===stormRow(e,e.turn-1)){
   if(e.shields){e.shields--;log(e,'风暴掠过，护盾保护了飞船');}else{e.energy-=2;e.damage+=2;log(e,'停在预警行，风暴消耗了 2 能量');}
  }
  if(e.energy<=0){e.energy=0;log(e,'能量耗尽，远征暂时停在这里。下一次换条路线再来。');return 'failed';}
  return null;
 }
 return {create,step,roles,relics,chapters,neighbors,turnPlayer,stormRow,circuitPath,advice};
});
