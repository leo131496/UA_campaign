(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model'));else root.CampaignCircuit=factory(root.CampaignModel);})(typeof globalThis!=='undefined'?globalThis:this,function(M){
 'use strict';
 // Ports are north/east/south/west bits. A connection conducts only when both neighboring ports meet.
 const bits=[1,2,4,8],opposite=[4,8,1,2];
 const rotateMask=mask=>((mask<<1)&15)|(mask>>3);
 function adjacent(index,size,dir){const x=index%size,y=Math.floor(index/size);return dir===0?(y?index-size:-1):dir===1?(x<size-1?index+1:-1):dir===2?(y<size-1?index+size:-1):(x?index-1:-1);}
 function evaluate(c){const powered=[c.source],seen=new Set(powered),breaks=[];
  for(let n=0;n<powered.length;n++){const i=powered[n],tile=c.tiles[i];for(let d=0;d<4;d++){if(!(tile.mask&bits[d]))continue;const j=adjacent(i,c.size,d);if(j<0||!(c.tiles[j].mask&opposite[d])){breaks.push({index:i,dir:d});continue;}if(!seen.has(j)){seen.add(j);powered.push(j);}}}
  const lit=c.bulbs.filter(i=>seen.has(i));return {powered,lit,breaks,solved:lit.length===c.bulbs.length};
 }
 function solutionPath(c){const todo=[c.source],seen=new Set(todo),order=[];for(let n=0;n<todo.length;n++){const i=todo[n];order.push(i);for(let d=0;d<4;d++){const j=adjacent(i,c.size,d);if(j>=0&&(c.tiles[i].solution&bits[d])&&!seen.has(j)){seen.add(j);todo.push(j);}}}
  const path=[];for(const i of order){const t=c.tiles[i];if(t.fixed)continue;let mask=t.mask;for(let n=0;n<4&&mask!==t.solution;n++){path.push(i);mask=rotateMask(mask);}}return path;
 }
 function create(seed,count,level,pressure='standard'){
  const team=count>1,size=team?Math.min(5,level+3):level+2,source=size*Math.floor(size/2),bulbs=team?[size-1,size*size-1,...(level>1||count>3?[size*Math.floor(size/2)+size-1]:[])]:level===1?[size*size-1]:[size-1,size*size-1];
  const rand=M.random(seed),edges=Array.from({length:size*size},()=>new Set()),seen=new Set([source]),stack=[source];
  while(stack.length){const i=stack.at(-1),choices=bits.map((_,d)=>adjacent(i,size,d)).filter(j=>j>=0&&!seen.has(j));if(!choices.length){stack.pop();continue;}const j=choices[Math.floor(rand()*choices.length)];edges[i].add(j);edges[j].add(i);seen.add(j);stack.push(j);}
  const terminals=new Set([source,...bulbs]);let removed=true;while(removed){removed=false;edges.forEach((set,i)=>{if(!terminals.has(i)&&set.size===1){const j=[...set][0];set.clear();edges[j].delete(i);removed=true;}});}
  const tiles=edges.map((set,i)=>{const mask=bits.reduce((sum,bit,d)=>sum|(set.has(adjacent(i,size,d))?bit:0),0);return {mask,solution:mask,fixed:terminals.has(i)||mask===0||mask===15};});
  const c={size,source,bulbs,tiles,rotations:0,lastIndex:null,lastMessage:'点击导线转 90°，让电源接到每一盏灯。'};
  tiles.forEach(t=>{if(!t.fixed){const turns=1+Math.floor(rand()*3);for(let n=0;n<turns;n++)t.mask=rotateMask(t.mask);}});
  // A new board must require a move. Repair scrambling only, never special-case the win detector.
  if(evaluate(c).solved){const i=tiles.findIndex(t=>!t.fixed&&t.solution);if(i>=0)tiles[i].mask=rotateMask(tiles[i].solution);}
  c.reference=solutionPath(c).length;c.budget=Math.max(12,c.reference+(pressure==='relaxed'?14:pressure==='expert'?4:9));return c;
 }
 function rotate(c,index,repair=false){const t=c.tiles[index];if(!Number.isInteger(index)||!t||t.fixed)throw new Error('请点击可旋转的导线，电源和灯泡的位置固定');const before=evaluate(c);if(repair&&t.mask===t.solution)throw new Error('这段导线方向已经正确，请选择其他导线');t.mask=repair?t.solution:rotateMask(t.mask);c.rotations++;c.lastIndex=index;const after=evaluate(c);const place='第 '+(Math.floor(index/c.size)+1)+' 行 '+(index%c.size+1)+' 列';
  c.lastMessage=after.solved?'全部灯泡已点亮，通关成功！':after.lit.length>before.lit.length?'又亮了一盏！还差 '+(c.bulbs.length-after.lit.length)+' 盏灯。':after.lit.length<before.lit.length?'这次转动断开了灯泡，沿发光导线检查连接。':place+' 已'+(repair?'校准':'旋转')+'，继续接通断开的线路。';return after;
 }
 function hint(c){const index=solutionPath(c)[0];return index===undefined?'电路已经连接完成。':'试着转动第 '+(Math.floor(index/c.size)+1)+' 行、第 '+(index%c.size+1)+' 列的导线，先从电源旁的断点接起。';}
 return {bits,adjacent,rotateMask,evaluate,create,rotate,solutionPath,hint};
});
