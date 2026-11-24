// Test-only route planner: drives the public action interface without modifying game state.
const A=require('../studio/adventure'),C=require('../studio/circuit');
function pathTo(e,target){
 const queue=[{pos:e.pos,cost:0,path:[]}],seen=new Set();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const node=queue.shift();if(seen.has(node.pos))continue;seen.add(node.pos);if(node.pos===target)return node;
  for(const i of A.neighbors(node.pos)){const t=e.tiles[i];if(t.type==='wall'||t.locked&&!e.switchOn)continue;queue.push({pos:i,cost:node.cost+(t.type==='hazard'?4:1),path:[...node.path,i]});}}
 return null;
}
function nextAction(r){const e=r.game.expedition,p=A.turnPlayer(r),team=r.players.length>1,role=A.roles[r.players.indexOf(p)%3];
 if(!e.skills[p.id]&&(role.skill==='charge'||!team)&&e.energy<=e.maxEnergy-5)return {type:'skill',skill:'charge'};
 if(team&&!e.skills[p.id]&&role.skill==='shield'&&e.phase==='map')return {type:'skill',skill:'shield'};
 if(e.phase==='core'){const path=C.solutionPath(e.circuit);if(!path?.length)throw Error('No solvable circuit');return {type:'rotate',index:path[0]};}
 let targets=e.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.used&&(t.type==='shard'&&(!t.locked||e.switchOn)||t.type==='switch'));
 if(e.energy<e.maxEnergy-6)targets.push(...e.tiles.map((t,i)=>({t,i})).filter(({t})=>t.type==='supply'&&!t.used));
 if(e.shards===e.required)targets.push({i:e.gate});
 const routes=targets.map(({i})=>pathTo(e,i)).filter(x=>x?.path.length).sort((a,b)=>a.cost-b.cost);
 if(!routes.length)throw Error('No reachable objective');return {type:'move',index:routes[0].path[0]};
}
module.exports={nextAction,pathTo};
