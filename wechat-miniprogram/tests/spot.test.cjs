const test=require('node:test'),assert=require('node:assert/strict');
const spot=require('../miniprogram/lib/spot'),art=require('../miniprogram/lib/art');
test('vision scans raster pixels and finds all differences in 297 generated boards',()=>{
 for(let seed=1;seed<100;seed++)for(let level=0;level<3;level++){
  let state=spot.create(seed,level);assert.equal(new Set(state.changed).size,5);
  assert.equal(spot.detect(spot.raster(state,'a'),spot.raster(state,'a')).length,0);
  for(let i=0;i<5;i++){const clue=spot.hint(state);assert(clue&&state.changed.includes(clue.id)&&!state.found.includes(clue.id));state=spot.advance(state,{type:'tap',id:clue.id,at:(i+1)*100});}
  assert.equal(state.status,'complete');assert.equal(spot.hint(state),null);
 }
});
test('misses, hints, time limit and ordered replay affect the actual result',()=>{
 let state=spot.create(7,1);const wrong=state.objects.find(o=>!state.changed.includes(o.id)).id;
 state=spot.advance(state,{type:'tap',id:wrong,at:1});assert.equal(state.misses,1);
 for(let i=0;i<3;i++)state=spot.advance(state,{type:'hint',at:2+i});
 assert.equal(spot.advance(state,{type:'hint',at:5}),null);
 assert.equal(spot.advance(state,{type:'tap',id:state.changed[0],at:60000}),null);
 state=spot.advance(state,{type:'end',at:60000});assert.equal(state.status,'finished');assert.equal(spot.score(state),0);
 assert.deepEqual(spot.replay(7,1,state.events),state);
 assert.throws(()=>spot.replay(7,1,[{type:'tap',id:1,at:-1}]));
 let many=spot.create(7,1);for(let i=0;i<100;i++)many=spot.advance(many,{type:'tap',id:wrong,at:i});assert.equal(many.status,'finished');
});
test('friend payload validates seed, level and unique real hits; results compare first three',()=>{
 const board=spot.create(111,0),host={seed:111,level:0,found:board.changed};
 assert.deepEqual(spot.decodeDuel(spot.encodeDuel(host)),host);
 assert.equal(spot.decodeDuel('111_0_00'),null);assert.equal(spot.decodeDuel('0_0_1'),null);assert.equal(spot.decodeDuel('<script>'),null);
 assert.equal(spot.match(host,host).percent,100);
 assert(spot.match(host,{...host,found:[...host.found].reverse()}).percent<100);
 assert.equal(spot.match(host,{...host,found:host.found.slice(0,1)}).percent,null);
 assert.equal(spot.match(host,{...host,seed:12}),null);
});
test('SVG illustration changes only puzzle variants and produces a portable image',()=>{
 const board=spot.create(99,1),image=art.image(board,'a');assert(image.startsWith('data:image/svg+xml;base64,'));
 const svg=Buffer.from(image.split(',')[1],'base64').toString();assert.equal(svg,art.svg(board,'a'));
 assert.notEqual(svg,art.svg(board,'b'));assert(!svg.includes('script'));
});
