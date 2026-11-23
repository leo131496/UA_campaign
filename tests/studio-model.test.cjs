const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../studio/model');
test('every industry can use every engine and custom content survives shared links',()=>{
 for(const industry of M.industries)for(const engine of M.engines){const c=M.preset(industry.id,engine.id);assert.deepEqual(M.validate(c),[]);assert.deepEqual(M.decode(M.encode(c)),M.normalize(c));}
 const c=M.preset('custom');c.industry='航空航天零部件';c.title='把宇宙装进口袋';c.items=['卫星','引擎','太阳翼','轨道'];assert.equal(M.decode(M.encode(c)).industry,c.industry);
});
test('invalid links and incomplete or ambiguous content cannot be published',()=>{
 for(const s of ['',null,'%invalid','a'.repeat(17000)])assert.throws(()=>M.decode(s));
 const c=M.preset('custom','quiz');c.brand='';c.questions[0].options[1]=c.questions[0].options[0];c.items[1]=c.items[0];assert.equal(M.validate(c).length,3);
 const n=M.normalize({...c,color:'url(https://bad.test)',duration:100000,seed:-1,extra:'discard'});assert.match(n.color,/^#[a-f0-9]{6}$/);assert.equal(n.duration,60);assert(!('extra' in n));
});
test('AI sample selection supports multiple engines, bounded edits and explicit capability gaps',()=>{
 assert.equal(M.plan('制造企业在展会生成一个 30 秒翻牌小游戏').config.engine,'memory');
 assert.equal(M.plan('教育机构想给学生做 90 秒知识闯关').config.engine,'quiz');
 const p=M.plan('软件企业做灵感收集，品牌叫“银河软件”，标题叫“星际派对”，绿色');assert.equal(p.config.brand,'银河软件');assert.equal(p.config.title,'星际派对');assert.equal(p.config.engine,'collect');assert.equal(p.config.color,'#287b64');
 const r=M.plan('改成 30 秒翻牌，橙色风格',p.config);assert.equal(r.config.brand,'银河软件');assert.equal(r.config.engine,'memory');assert.equal(r.config.duration,30);
 assert(M.plan('做一个实时对战的3D赛车').capabilityGap);assert(M.plan('游戏').error);
});
test('same configuration creates identical complete pairs for friend challenges',()=>{
 const c=M.preset('software');const a=M.shuffled(c),b=M.shuffled(M.decode(M.encode(c)));assert.deepEqual(a,b);for(let i=0;i<4;i++)assert.equal(a.filter(x=>x.pair===i).length,2);
 assert.notDeepEqual(a,M.shuffled({...c,seed:c.seed+3}));
});
