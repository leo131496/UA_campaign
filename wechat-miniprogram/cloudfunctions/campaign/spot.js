// Pure game rules and local computer vision. No language model or remote image service.
const DURATION = 60000, TOTAL = 5;
const THEMES = ['猫猫野餐会', '星际咖啡馆', '海边放映室'];
const LABELS = ['太阳', '云朵', '气球', '小旗', '小猫', '饮料', '花朵', '礼物', '小鸭', '甜甜圈', '星星', '蛋糕'];
const BOXES = [[35,22,76,65],[175,16,95,60],[341,16,65,75],[480,27,83,54],[33,119,90,98],[175,120,67,85],[313,120,85,87],[477,124,78,78],[35,252,87,67],[172,252,87,67],[322,250,75,70],[470,248,90,73]];
function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
function validSeed(seed) { return Number.isInteger(seed) && seed > 0 && seed <= 999999; }
function create(seed, level = 1) {
  if (!validSeed(seed) || ![0, 1, 2].includes(level)) throw new Error('关卡参数无效');
  const random = rng(seed), ids = Array.from({ length: 12 }, (_, id) => id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return { seed, level, theme: THEMES[seed % 3], changed: ids.slice(0, TOTAL),
    objects: BOXES.map(([x, y, w, h], id) => ({ id, label: LABELS[id], x, y, w, h })),
    found: [], hints: 0, misses: 0, events: [], elapsed: 0, status: 'playing' };
}
function advance(state, event) {
  if (!event || state.status !== 'playing' || !Number.isInteger(event.at) || event.at < state.elapsed || event.at > DURATION || state.events.length >= 100) return null;
  const next = { ...state, found: state.found.slice(), events: state.events.concat({ ...event }), elapsed: event.at };
  if (event.type === 'tap') {
    if (!Number.isInteger(event.id) || event.id < 0 || event.id >= 12 || next.found.includes(event.id) || event.at >= DURATION) return null;
    if (state.changed.includes(event.id)) next.found.push(event.id); else next.misses++;
    if (next.found.length === TOTAL) next.status = 'complete';
  } else if (event.type === 'hint') {
    if (state.hints >= 3 || event.at >= DURATION) return null;
    next.hints++;
  } else if (event.type === 'end') next.status = 'finished';
  else return null;
  if(next.events.length===100 && next.status==='playing') next.status='finished';
  return next;
}
function replay(seed, level, events) {
  if (!Array.isArray(events) || !events.length || events.length > 100) throw new Error('行动记录不完整');
  let state = create(seed, level);
  events.forEach(event => { state = advance(state, event); if (!state) throw new Error('行动记录无效'); });
  if (state.status === 'playing') throw new Error('请先结束本局');
  return state;
}
function score(state) { return Math.max(0, state.found.length * 100 + (state.status === 'complete' ? Math.floor((DURATION - state.elapsed) / 1000) : 0) - state.hints * 15 - state.misses * 5); }
function summary(state) {
  const nextLevel = state.found.length === TOTAL && state.hints === 0 && state.elapsed < 40000 ? Math.min(2, state.level + 1) : state.found.length < 3 ? Math.max(0, state.level - 1) : state.level;
  return { seed: state.seed, level: state.level, status: state.status, found: state.found, hints: state.hints, misses: state.misses,
    elapsed: state.elapsed, score: score(state), nextLevel,
    title: state.found.length === 5 ? '眼力小侦探' : state.found.length >= 3 ? '细节捕手' : '快乐探索家',
    advice: nextLevel > state.level ? '这局又快又准，下一局试试更小的细节。' : nextLevel < state.level ? '下一局放大差异，先找找手感。' : state.hints ? '下一局试试少用一次提示，看看能多快找到。' : '换一组不同的细节，再来一局吧。' };
}
function match(host, guest) {
  if (host.seed !== guest.seed || host.level !== guest.level) return null;
  const a = host.found.slice(0, 3), b = guest.found.slice(0, 3);
  if (a.length < 3 || b.length < 3) return { percent: null, title: '这次还没对上眼神', detail: '双方各找到至少 3 处，就能比较先注意到的细节。再来试试吧。', shared: [] };
  const shared = a.filter(id => b.includes(id));
  const sameFirst = a[0] === b[0];
  const percent = Math.round(80 * shared.length / Math.max(a.length, b.length) + (sameFirst ? 20 : 0));
  return { percent, title: percent >= 80 ? '神同步搭子' : percent >= 40 ? '互补侦探组' : '各有眼光组合',
    detail: sameFirst ? '你们第一眼都发现了「' + LABELS[a[0]] + '」！' : '你先注意「' + LABELS[b[0]] + '」，朋友先注意「' + LABELS[a[0]] + '」。', shared: shared.map(id => LABELS[id]) };
}
// Shapes are shared by SVG rendering and the raster input to the vision helper.
function shapes(id, changed, level) {
  const colors=['#ff91ad','#aa9be3','#ffda78','#79c8bc'];
  const size = [15, 11, 7][level], accent = colors[(id+(changed?1:0))%colors.length];
  const rect = (x,y,w,h,c,r=0) => ({type:'rect',x,y,w,h,c,r});
  const ellipse = (x,y,rx,ry,c) => ({type:'ellipse',x,y,rx,ry,c});
  const list = [];
  if(id===0) { for(let i=0;i<8;i++) { const a=i*Math.PI/4; list.push(ellipse(40+Math.cos(a)*33,35+Math.sin(a)*29,4,4,'#f4b74c')); } list.push(ellipse(40,35,23,23,'#ffda68')); }
  if(id===1) list.push(ellipse(45,37,43,19,'#fff'),ellipse(28,24,21,21,'#fff'),ellipse(57,19,24,21,'#fff'));
  if(id===2) list.push(rect(35,40,2,49,'#9a82bf'),ellipse(35,27,25,28,'#b7a2f2'),rect(25,53,20,5,'#8461d1',3));
  if(id===3) list.push(rect(9,6,5,57,'#8b72b2',2),rect(14,8,58,33,'#9dc7ee',3));
  if(id===4) { list.push(ellipse(45,71,32,29,'#ffc484'),ellipse(23,20,12,20,'#ffc484'),ellipse(68,20,12,20,'#ffc484'),ellipse(45,40,38,30,'#ffc484'),ellipse(30,36,3,4,'#564068'),ellipse(59,36,3,4,'#564068'),ellipse(45,47,4,3,'#bd7580'),ellipse(19,46,7,4,'#f29ca4'),ellipse(72,46,7,4,'#f29ca4')); }
  if(id===5) list.push(rect(12,19,46,64,'#b7d8fa',11),rect(5,18,60,8,'#7caee2',4),rect(42,0,6,25,'#a28ac7',3),ellipse(35,82,21,4,'#82b3e2'));
  if(id===6) { list.push(rect(39,37,5,49,'#86bca3',2),ellipse(28,64,16,7,'#86bca3')); for(let i=0;i<5;i++){const a=i*Math.PI*2/5;list.push(ellipse(42+Math.cos(a)*20,28+Math.sin(a)*18,13,13,'#b4a2e8'));}list.push(ellipse(42,28,11,11,'#ffe393')); }
  if(id===7) list.push(rect(8,24,65,52,'#f5a8ba',7),rect(3,17,75,14,'#e98aa8',5),rect(34,17,12,59,'#ffe6a1'),ellipse(28,12,13,9,'#ffe6a1'),ellipse(49,12,13,9,'#ffe6a1'));
  if(id===8) list.push(ellipse(42,45,38,23,'#ffe295'),ellipse(63,24,21,21,'#ffe295'),ellipse(83,29,10,5,'#f6a764'),ellipse(68,20,3,3,'#564068'),ellipse(30,44,18,12,'#efc971'));
  if(id===9) list.push(ellipse(43,37,37,27,'#dcaa84'),ellipse(43,33,36,23,'#dbb4ea'),ellipse(43,33,13,10,'#fff3d4'),rect(19,25,8,3,'#fff3d4',1),rect(54,43,8,3,'#fff3d4',1));
  if(id===10) list.push(ellipse(38,38,29,29,'#a6d8c6'),ellipse(17,17,10,10,'#a6d8c6'),ellipse(58,17,10,10,'#a6d8c6'),ellipse(26,33,3,3,'#4b756b'),ellipse(49,33,3,3,'#4b756b'));
  if(id===11) list.push(rect(7,28,77,40,'#f4b6c9',7),rect(7,23,77,13,'#fff8ea',7),rect(39,7,6,20,'#a18bd9',2),ellipse(42,6,5,7,'#ffc979'));
  const positions = [[40,35],[45,33],[35,26],[42,24],[45,72],[35,52],[42,28],[40,48],[44,43],[43,17],[38,50],[47,48]];
  const [x,y] = positions[id];
  list.push(ellipse(x,y,size,size*.72,accent));
  if(id===0||id===1) list.push(ellipse(x-5,y-2,2,2,'#66517c'),ellipse(x+5,y-2,2,2,'#66517c'));
  return list;
}
function raster(state, side, width=150, height=90) {
  const pixels = new Uint32Array(width*height), changed = side==='b' ? state.changed : [];
  state.objects.forEach(object => shapes(object.id,changed.includes(object.id),state.level).forEach(shape => {
    const c = parseInt(shape.c.slice(1),16), x0 = shape.type==='rect'?shape.x:shape.x-shape.rx, y0 = shape.type==='rect'?shape.y:shape.y-shape.ry;
    const w = shape.type==='rect'?shape.w:shape.rx*2, h=shape.type==='rect'?shape.h:shape.ry*2;
    for(let py=Math.max(0,Math.floor((object.y+y0)*height/360));py<Math.min(height,Math.ceil((object.y+y0+h)*height/360));py++) {
      for(let px=Math.max(0,Math.floor((object.x+x0)*width/600));px<Math.min(width,Math.ceil((object.x+x0+w)*width/600));px++) {
        const x=(px+.5)*600/width-object.x, y=(py+.5)*360/height-object.y;
        if(shape.type==='rect' || ((x-shape.x)/shape.rx)**2+((y-shape.y)/shape.ry)**2<=1) pixels[py*width+px]=c;
      }
    }
  }));
  return {pixels,width,height};
}
function detect(a,b) {
  if(a.width!==b.width||a.height!==b.height) throw new Error('画面尺寸不一致');
  const seen=new Uint8Array(a.pixels.length), regions=[];
  for(let i=0;i<a.pixels.length;i++) {
    if(seen[i]||a.pixels[i]===b.pixels[i]) continue;
    const queue=[i];seen[i]=1;let minX=a.width,minY=a.height,maxX=0,maxY=0,count=0;
    for(let q=0;q<queue.length;q++) {const n=queue[q],x=n%a.width,y=Math.floor(n/a.width);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {if(nx<0||nx>=a.width||ny<0||ny>=a.height)continue;const j=ny*a.width+nx;if(!seen[j]&&a.pixels[j]!==b.pixels[j]){seen[j]=1;queue.push(j);}}
    }
    if(count>=2) regions.push({x:(minX+maxX+1)/2/a.width*600,y:(minY+maxY+1)/2/a.height*360,area:count});
  }
  return regions.sort((a,b)=>b.area-a.area);
}
function hint(state) {
  const regions=detect(raster(state,'a'),raster(state,'b'));
  for(const region of regions) {
    const object=state.objects.find(o=>region.x>=o.x&&region.x<=o.x+o.w&&region.y>=o.y&&region.y<=o.y+o.h&&!state.found.includes(o.id));
    if(object) return {id:object.id, region:region.y<120?'上面一排':region.y<240?'中间一排':'下面一排', detail:'留意「'+object.label+'」上的颜色。', scanned:150*90};
  }
  return null;
}
function encodeDuel(result) {return result.seed+'_'+result.level+'_'+result.found.map(id=>id.toString(36)).join('');}
function decodeDuel(value) {
  if(typeof value!=='string'||!/^\d{1,6}_[0-2]_[0-9ab]{0,5}$/.test(value))return null;
  const [seedText,levelText,ids]=value.split('_'),seed=Number(seedText),level=Number(levelText);
  if(!validSeed(seed))return null;
  const found=ids.split('').map(id=>parseInt(id,36)),board=create(seed,level);
  if(new Set(found).size!==found.length||found.some(id=>!board.changed.includes(id)))return null;
  return {seed,level,found};
}
module.exports={DURATION,TOTAL,THEMES,LABELS,create,advance,replay,summary,score,match,shapes,raster,detect,hint,validSeed,encodeDuel,decodeDuel};
