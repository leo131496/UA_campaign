'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const icon = n => `<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const skins = {
  software: { name:'软件项目', mission:'软件项目 · 发布任务', nodes:['客户需求','产品交付','上线保障'], subs:['把目标对齐','把方案做出来','把风险压下去'], topics:['需求协同','流程自动化','项目交付'], service:'看这类项目如何落地' },
  industrial: { name:'制造项目', mission:'制造项目 · 产线升级', nodes:['工况确认','设备改造','试产验收'], subs:['看清现场边界','安排实施资源','守住交付质量'], topics:['改造规划','设备协同','风险控制'], service:'看真实改造要确认什么' },
  services: { name:'服务项目', mission:'服务项目 · 客户交付', nodes:['需求对齐','方案执行','效果验收'], subs:['先形成共识','让团队动起来','让结果被看见'], topics:['流程梳理','团队协同','效果评估'], service:'看专业服务怎样推进' }
};
const params = new URLSearchParams(location.search);
let skin = Object.hasOwn ? (Object.hasOwn(skins, params.get('skin')) ? params.get('skin') : 'software') : (['software','industrial','services'].includes(params.get('skin')) ? params.get('skin') : 'software');
let seed = Number(params.get('seed')) || 731024;
let gameState, active = false, selected = '', rivalSolution, rivalTrace = [], hintMove = null, requestTopic = '', serviceRequest = null;
let ops = [], toastTimer, pointer = null, ignoreClickUntil = 0, finishedRecorded = false, sessionCounter = 0;
const d = () => skins[skin];
const elapsed = s => (s.round - 1) * 2 + (2 - s.actions);
function track(type, label) { ops.push({ event_id:`demo-${sessionCounter}-${ops.length+1}`, type, label, scene:skin, seed:gameState.seed, at:new Date().toISOString() }); }
function notify(text) { clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, 3300); }
function modal(title, html) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; $('#modal').showModal(); }
function closeModal() { $('#modal').close(); }
function download(name, text, type='text/plain;charset=utf-8') { const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000); }
function setup(nextSeed = seed) {
  cleanupPointer(); seed = nextSeed; gameState = Rescue.create(seed); seed = gameState.seed; active = false; selected = ''; hintMove = null; finishedRecorded = false;
  requestTopic='';serviceRequest=null;ops=[];sessionCounter++;track('page_view','进入关卡');
  rivalSolution=Rescue.solve(Rescue.create(seed));let r=Rescue.create(seed);rivalTrace=[r];
  rivalSolution.path.forEach(move=>{r=Rescue.advance(r,move);rivalTrace.push(r);});
  $('#coach-note').hidden=true;$('#result-panel').hidden=true;$('#toast').hidden=true;
  render();
}
function machine(i, n) {
  const bright=n.progress>=80?'#8ad4be':i===0?'#9fcaff':i===1?'#e5b57c':'#97cbd2';
  let shape='';
  if(i===0)shape=`<path d="M78 85v-35l17-9 17 9v35l-17 9Z" fill="#4e77a8"/><path d="m78 50 17 9 17-9-17-9Z" fill="#9bbbe4"/><path d="M95 59v35l17-9V50Z" fill="#355a89"/><ellipse cx="93" cy="39" rx="30" ry="17" transform="rotate(-27 93 39)" fill="#547caa" stroke="${bright}" stroke-width="3"/><path d="M67 51q17-34 48-22M79 55q8-26 24-33M68 36l40 12M80 26l23 31" fill="none" stroke="#9fcaff" stroke-width="1.2"/><path d="m93 38 21-23" stroke="#d6e9ff" stroke-width="3"/><circle cx="115" cy="14" r="4" fill="#ffb372"/><path d="M126 19q10 4 10 14M132 10q18 5 19 22" fill="none" stroke="#719ace" stroke-width="2"/><path d="m53 83 20-11 13 7-20 11Z" fill="#6a9cce"/><path d="M53 83v12l13 7V90Z" fill="#3b6497"/><path d="m66 90 20-11v12l-20 11Z" fill="#254f82"/>`;
  if(i===1)shape=`<path d="m51 82 50-28 39 22-50 29Z" fill="#a6bbd4"/><path d="M51 82v15l39 23v-15Z" fill="#4f6c91"/><path d="m90 105 50-29v15l-50 29Z" fill="#365575"/><path d="m61 81 40-22 27 16-40 23Z" fill="#3a5579"/><path d="m70 81 33-18m-20 25 33-19" stroke="#8a9fb9" stroke-width="3"/><path d="m75 50 18-10 19 11-18 10Z" fill="${bright}"/><path d="M75 50v29l19 11V61Z" fill="#b48152"/><path d="m94 61 18-10v28L94 90Z" fill="#8c613f"/><path d="M123 68V39l14-8V17l-12-7-12 7v12l9 5v28" fill="none" stroke="#a8c1de" stroke-width="9" stroke-linejoin="round"/><circle cx="125" cy="20" r="5" fill="#e6b17a"/><path d="m119 66 10 6-10 6m10-6 9-7" fill="none" stroke="#bed3e9" stroke-width="4"/>`;
  if(i===2)shape=`<path d="m66 40 28-15 29 16-28 16Z" fill="${bright}"/><path d="M66 40v54l29 16V57Z" fill="#5d8f9c"/><path d="m95 57 28-16v54l-28 15Z" fill="#386375"/><path d="m71 51 18 10v8L71 59Zm0 17 18 10v8L71 76Zm0 17 18 10v8l-18-10Z" fill="#a3d5db"/><path d="m102 64 14-8m-14 24 14-8m-14 24 14-8" stroke="#73a4b4" stroke-width="4"/><circle cx="115" cy="24" r="15" fill="#bfdfe0" stroke="#fff2" stroke-width="4"/><path d="m108 24 5 5 9-12" fill="none" stroke="#407d81" stroke-width="3"/><path d="m44 89 13-7 12 7-13 8Z" fill="#80a6be"/><path d="M44 89v10l12 7v-9Z" fill="#406882"/><path d="m56 97 13-8v10l-13 7Z" fill="#2a4f6a"/>`;
  return `<svg class="machine" viewBox="0 0 190 145" aria-hidden="true"><ellipse cx="95" cy="122" rx="69" ry="17" fill="#0d2444" opacity=".4"/><path d="m17 100 78-42 78 42-78 42Z" fill="#4d719e"/><path d="m17 100 78 42v-10l-78-42Z" fill="#284c7b"/><path d="m95 142 78-42V90l-78 42Z" fill="#1e3f69"/><path d="m26 97 69-37 69 37-69 37Z" fill="#3a5d89"/>${shape}${n.blocked?'<g transform="translate(143 79)"><circle r="12" fill="#edbc68" stroke="#ffd99a" stroke-width="2"/><path d="M0-6v7m0 4v1" stroke="#73572e" stroke-width="3"/></g>':''}${n.auto?'<g transform="translate(39 57)"><circle r="11" fill="#9bc8d4"/><path d="m2-7-6 9h5l-1 6 6-10H1Z" fill="#367786"/></g>':''}</svg>`;
}
function renderTargets() {
  $('#stations').innerHTML=gameState.nodes.map((n,i)=>{
    const done=n.progress>=80,reason=selected?Rescue.invalid(gameState,selected,i):'';
    return `<button class="station ${n.blocked?'blocked':''} ${done?'completed':''} ${selected?(reason?'target-no':'target-ok'):''}" data-target="${i}" ${!active||gameState.status!=='playing'?'disabled':''} aria-label="${d().nodes[i]}，进度 ${n.progress}/80，${n.blocked?'阻塞中':done?'已完成':'可推进'}${selected?`，${reason||'可投放'+Rescue.CARDS.find(c=>c.id===selected).name}`:''}"><div class="station-top"><span>模块 0${i+1}</span><span class="station-status">${n.blocked?'! 阻塞':done?'✓ 已完成':'等待行动'}</span></div>${machine(i,n)}<h3>${d().nodes[i]}</h3><p class="station-sub">${d().subs[i]}</p><div class="station-progress"><span style="width:${n.progress/80*100}%"></span></div><div class="station-bottom"><span>${n.auto?'<span class="auto-badge">⚙ 回合 +10</span>':'模块进度'}</span><strong>${n.progress}<span style="opacity:.5;font-size:9px"> /80</span></strong></div></button>`;
  }).join('');
}
function renderCards() {
  $('#cards').innerHTML=Rescue.CARDS.map(c=>`<button class="resource-card ${selected===c.id?'selected':''}" data-card="${c.id}" ${!active||gameState.status!=='playing'||gameState.budget<c.cost?'disabled':''} aria-pressed="${selected===c.id}" aria-label="${c.name}，预算 ${c.cost}。${c.detail}" title="${c.detail}"><div class="card-top"><span class="card-mark">${c.mark}</span><span class="card-cost">◈ ${c.cost||'免费'}</span></div><h3>${c.name}</h3><p>${c.short}</p><span class="card-handle"></span></button>`).join('');
}
function selectCard(id) {
  if(!active||gameState.status!=='playing')return;
  const c=Rescue.CARDS.find(c=>c.id===id);if(!c||gameState.budget<c.cost)return;
  selected=id;renderTargets();
  document.querySelectorAll('[data-card]').forEach(b=>{b.classList.toggle('selected',b.dataset.card===id);b.setAttribute('aria-pressed',String(b.dataset.card===id));});
  $('#selection-hint').textContent=`${c.name}：${c.detail}`;
  $('#board-guide').textContent=`把「${c.name}」投向亮起的模块。`;
}
function render() {
  document.body.classList.toggle('in-game',active);
  $('#mission-id').textContent=`关卡 #${seed}`;$('#board-level').textContent=d().mission;
  $('#budget').textContent=gameState.budget;$('#risk').textContent=gameState.risk;$('#risk').style.color=gameState.risk>=75?'#d37759':'';
  $('#round').textContent=gameState.round;$('#actions').textContent='● '.repeat(gameState.actions).trim()+' ○'.repeat(2-gameState.actions);
  $('#hud-stage').textContent=!active?'等待接管':gameState.status==='won'?'项目已交付':gameState.status==='lost'?'救援未完成':'救援进行中';
  $('#start-overlay').hidden=active;$('#pass-turn').disabled=!active||gameState.status!=='playing';$('#coach').disabled=!active||gameState.status!=='playing';
  renderTargets();renderCards();
  $('#board-guide').textContent=gameState.status==='playing'?'拖动资源卡到模块，或点击卡牌后点选模块。':'本局已结算。可以重试同一关，或邀请好友挑战。';
  $('#selection-hint').textContent=!active?'先接管项目，即可使用手牌。':gameState.status==='playing'?'选一张卡，投向你要推进或救援的模块。':'本局结束，下面查看你的战报。';
  if(selected)selectCard(selected);
  const trace=gameState.status==='playing'?rivalTrace.filter(s=>elapsed(s)<=elapsed(gameState)).slice(-1)[0]:rivalSolution.state;
  const r=trace||rivalTrace[0], rp=Math.round(r.nodes.reduce((v,n)=>v+n.progress,0)/240*100);
  $('#rival-progress').innerHTML=`<div class="rival-row"><span>整体交付</span><strong>${rp}%</strong></div><div class="rival-track"><span style="width:${rp}%"></span></div><div class="rival-row"><span>预算 ${r.budget}</span><span>风险 ${r.risk}</span><span>${r.status==='won'?'已完成':`第 ${r.round} 回合`}</span></div>`;
  const last=r.history.filter(x=>x.type==='action').slice(-1)[0];
  $('#rival-note').textContent=last?`刚才的动作：${last.title}。${last.detail}`:'你行动时，它也会推进自己的项目。';
  const es=Rescue.events(seed), e=es[gameState.round-1],actual=gameState.history.filter(x=>x.type==='event').slice(-1)[0],next=es[gameState.round];
  $('#event-preview').innerHTML=`<div class="event-current"><span class="event-kicker">第 ${gameState.round} 回合事件</span><strong>${e.title}</strong><p>${actual.detail}</p></div>${next?`<div class="event-next"><span class="next-num">下一回合</span><div><strong>${next.title}</strong><p>${next.text}</p></div></div>`:'<div class="event-next"><div><strong>这是最后一回合</strong><p>用好剩余行动，自动化会在回合末结算。</p></div></div>'}`;
  $('#log-count').textContent=`${gameState.history.filter(x=>x.type==='action').length} 次行动`;
  $('#game-log').className='game-log';$('#game-log').innerHTML=gameState.history.slice(-4).reverse().map(x=>`<div class="log-item"><time>回合 ${x.round}</time><strong>${x.title}</strong><small>${x.detail}</small></div>`).join('');
  if(active&&gameState.status!=='playing')renderResult();
}
function playSelected(target) {
  if(!selected){notify('先选一张资源卡，再点击模块。');return;}
  const reason=Rescue.invalid(gameState,selected,target);if(reason){notify(reason);return;}
  const oldRound=gameState.round,id=selected,previous=gameState;
  gameState=Rescue.play(gameState,id,target);if(!gameState)return;
  track('card_played',`${Rescue.CARDS.find(c=>c.id===id).name} → ${d().nodes[target]}`);selected='';hintMove=null;$('#coach-note').hidden=true;render();
  const hit=$(`[data-target="${target}"]`);hit?.classList.add('station-hit');
  if(gameState.status==='playing')notify(gameState.round!==oldRound?`回合 ${gameState.round}：${Rescue.events(seed)[gameState.round-1].title}`:`${d().nodes[target]}：进度 ${previous.nodes[target].progress} → ${gameState.nodes[target].progress} · 预算 ${gameState.budget}`);
  finishIfNeeded();
}
function finishIfNeeded(){if(gameState.status==='playing'||finishedRecorded)return;finishedRecorded=true;track('game_finished',gameState.status==='won'?'完成救援':'挑战结束');renderResult();$('#result-panel').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function summary() {
  const autos=gameState.nodes.filter(n=>n.auto).length, repairs=gameState.history.filter(x=>x.type==='action'&&x.title==='排除阻塞').length;
  if(gameState.status==='won')return `你在第 ${gameState.round} 回合完成交付，部署了 ${autos} 处自动化，进行了 ${repairs} 次排障。${autos?'早期投入会在后续回合持续回报。':'直接推进很快，但自动化也许能省下后续行动。'}`;
  if(gameState.reason==='risk')return '风险触及 100，项目被迫中止。阻塞每回合都会增加风险，排障与协同可以把它降下来。';
  return `六回合已结束，还有 ${gameState.nodes.filter(n=>n.progress<80).length} 个模块未交付。尝试更早部署自动化，或在「协作中断」前完成受影响模块。`;
}
function renderResult() {
  const win=gameState.status==='won',score=Rescue.score(gameState),aiScore=Rescue.score(rivalSolution.state),compare=score>aiScore?'本局分数超过策略 AI':score===aiScore?'与策略 AI 打成平手':'还有一条值得挑战的 AI 路线';
  $('#result-panel').hidden=false;$('#result-panel').className=`result-panel ${win?'win':'lose'}`;
  $('#result-panel').innerHTML=`<div class="result-heading"><div><h2>${win?'救回来了，漂亮。':'这一局，还差一点。'}</h2><p>${win?compare:gameState.reason==='risk'?'风险失控，调整策略再试一次。':'时间用完了，换一种资源配置再试。'}</p></div><span class="result-symbol">${win?'✦':'↻'}</span></div><div class="result-scores"><div class="score-box"><span>你的项目积分</span><strong id="player-score">${score}</strong><small>${win?'成功交付':'未完成交付'} · 第 ${gameState.round} 回合</small></div><div class="score-box ai"><span>本局策略 AI 基准</span><strong>${aiScore}</strong><small>${rivalSolution.state.status==='won'?'成功交付':'未完成交付'} · 第 ${rivalSolution.state.round} 回合</small></div></div><p class="result-story">${summary()}</p><div class="result-buttons"><button class="btn orange" id="share-game">${icon('share')}发起同关挑战</button><button class="btn primary" id="retry-game">${icon('refresh')}再救一次</button><button class="btn" id="replay-ai">看 AI 的打法</button></div><p class="score-detail">积分 = 总进度 + 预算÷4 + (100−风险)÷2；成功交付另加 100 与剩余行动奖励。均为游戏成绩。</p><div class="business-cta"><div><strong>如果现实里也有类似的项目难题</strong><p>先拿走项目检查清单，再自愿了解专业服务。</p></div><button class="btn" id="business-next">${serviceRequest?'查看已登记的演示请求':d().service}</button></div>`;
}
function shareUrl() {const u=new URL(location.protocol==='file:'?'https://leo131496.github.io/UA_campaign/':location.origin+location.pathname);u.searchParams.set('seed',seed);u.searchParams.set('skin',skin);u.searchParams.set('score',Rescue.score(gameState));u.searchParams.set('v','3');return u.href;}
function shareGame(){track('share_opened','打开同关分享，不等于成功转发');modal('同一个项目，让朋友来救一次',`<div class="share-card"><span class="share-seed">项目急救局 · 关卡 #${seed}</span><h3>这个项目，你救得回来吗？</h3><strong>${Rescue.score(gameState)}</strong><p>我的游戏积分。相同资源、相同事件，等你来挑战。</p></div><label class="modal-field">可直接打开的挑战链接<input id="challenge-url" type="text" readonly value="${esc(shareUrl())}"></label><div class="modal-actions"><button class="btn primary" id="copy-challenge">复制挑战链接</button><button class="btn" id="download-recap">下载本局复盘</button></div><p class="note">链接不包含身份信息。成绩由链接携带、未经服务器验证，不用于正式排行榜。朋友打开后独立玩同一关，不共享你的操作记录。</p>`);}
function checklist(){return `# ${d().name}检查清单\n\n这是示例知识内容，不是根据游戏推断出的真实业务诊断。\n\n1. 明确三个交付模块的负责人、验收标准和约束。\n2. 梳理重复工作，判断哪些适合自动化，先验证小范围效果。\n3. 列出阻塞点，约定升级路径和反馈时限。\n4. 设定复盘节点，区分进度、质量、成本和风险。\n5. ${skin==='industrial'?'实际产线改造须经现场勘察、专业工程评估和安全审批。':'将业务目标与实际数据对照，不把上线或活跃直接等同于业务增量。'}\n\n当前 Demo 不接入真实企业知识库或 SCRM。\n`;}
function businessNext(){if(serviceRequest){modal('演示服务请求',`<p>你主动选择的主题：<strong>${esc(serviceRequest.topic)}</strong>。</p><p>仅使用虚拟身份 DEMO-PLAYER。${serviceRequest.share?'已选择附上本局游戏复盘。':'未附上游戏复盘。'}${serviceRequest.marketing?'已同意后续推荐（模拟）。':'未订阅后续推荐。'}</p><p>没有真实提交、顾问联系或企微消息。</p>`);return;}modal(d().service,`<p>游戏中的资源取舍可以成为讨论起点。真实方案仍需结合实际需求与资料判断，游戏成绩不代表采购意向。</p><button class="btn" id="download-checklist">直接下载项目检查清单</button><h3>也可以主动选择一个想了解的主题</h3><div class="pill-options">${d().topics.map(t=>`<button class="pill-option ${requestTopic===t?'active':''}" data-topic="${t}">${t}</button>`).join('')}</div><label class="check"><input id="service-consent" type="checkbox"><span>同意使用虚拟身份登记本次服务请求（演示，不会真实发送）。</span></label><label class="check"><input id="share-recap" type="checkbox"><span>愿意附上本局游戏复盘，供讨论参考（选填）。</span></label><label class="check"><input id="marketing-consent" type="checkbox"><span>愿意接收后续产品和活动推荐（选填）。</span></label><div class="modal-actions"><button class="btn primary" id="submit-service" disabled>登记演示请求</button></div><p class="note">完整游戏、复盘、分享和清单下载都不要求留资。正式接入 SCRM 后，仅同步明确授权的资料与主动需求。</p>`);}
function showInfo(kind){
  if(kind==='rules')modal('六回合，救回项目',`<ol><li><strong>选卡投放：</strong>拖资源卡到模块；手机或键盘也可先选卡，再点模块。每回合有两次行动。</li><li><strong>交付目标：</strong>三个模块都达到 80。完成的模块不会被事件打退。</li><li><strong>别让风险失控：</strong>风险达到 100 立即失败；未解除的每处阻塞会在回合结束增加 8 风险。</li><li><strong>投资后续回报：</strong>自动化在每回合结束为未阻塞模块增加 10 进度，包括部署当回合。</li><li><strong>可预判的突发：</strong>事件由关卡编号固定，双方相同。你可以查看完整事件表。</li></ol><p>六回合结束仍未完成，也算挑战失败。预算不足可以用免费的「调配资源」，但它会消耗行动并提高风险。</p>`);
  if(kind==='ai')modal('实际在运行的本地策略 AI',`<p>它会搜索资源卡、投放位置和事件变化的多种组合，在浏览器中计算一条可行路线。当前关卡试算了 <strong>${rivalSolution.explored.toLocaleString()} 个行动分支</strong>。</p><p>你的对手不是预填的固定分数；「问问策略 AI」也会从你的当前局面重新搜索。</p><p>AI 与玩家具有相同规则和公开事件表。它采用有限宽度的前瞻搜索，不保证全局最优，玩家可能取得更高分。</p><p class="note">这是实际的搜索决策 AI，没有调用大模型或生成式模型。真实企业知识与业务诊断未接入。</p>`);
  if(kind==='events')modal('同关双方共用的事件表',Rescue.events(seed).map(e=>`<h3>回合 ${e.round} · ${e.title}</h3><p>${e.text}${e.amount?` 影响量：${e.amount}。`:''}</p>`).join(''));
  if(kind==='business')modal('给企业一个真正可玩的获客入口',`<h3>先玩，结束后再自愿连接</h3><p>入口不收集角色、时间或联系方式。游戏靠卡牌、资源、事件和对手产生参与感，结算后再提供相关清单与专业服务入口。</p><h3>跨行业复用</h3><p>企业可换模块名称、事件包装、行业案例与服务内容。当前有软件、制造、服务三种皮肤，共享同一游戏规则。</p><h3>邀请来自同关挑战</h3><p>生成可直接打开的关卡链接，好友可独立玩相同项目。正式版再根据真实到达与自愿身份验证做推荐归因。</p><h3>SCRM 接住明确需求</h3><p>记录匿名参与、主动选择的业务主题和自愿服务请求。游戏分数不用于推断预算、职位或购买意向。</p>`);
  if(kind==='operations')modal('本页 SCRM 运营预览',`<p>这是当前页面的演示事件，未写入 BesChannels。${serviceRequest?'已有 1 条主动服务请求（模拟）。':'尚未产生主动服务请求。'}</p><div class="metric-grid"><div><strong>${active?1:0}</strong><span>本页参与者</span></div><div><strong>${gameState.status==='won'?1:0}</strong><span>成功完成</span></div><div><strong>${serviceRequest?1:0}</strong><span>主动请求（模拟）</span></div></div><h3>最近行为</h3><ul>${ops.slice(-8).map(e=>`<li>${esc(e.label)} <span class="note">${esc(e.type)}</span></li>`).join('')}</ul><p class="note">分享入口不等于成功传播。链接中的好友成绩为自报；没有跨设备身份去重、真实私域关系或销售商机数据。</p><button class="btn" id="export-events">导出本页演示事件</button>`);
}
document.addEventListener('click',async e=>{
  if(Date.now()<ignoreClickUntil)return;const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.card){selectCard(b.dataset.card);if(matchMedia('(max-width:620px)').matches&&$('.stations').getBoundingClientRect().top<0)$('.board').scrollIntoView({block:'start',behavior:'auto'});return;}if(b.dataset.target!==undefined){playSelected(Number(b.dataset.target));return;}
  if(b.dataset.modal){showInfo(b.dataset.modal);return;}
  if(b.dataset.topic){requestTopic=b.dataset.topic;document.querySelectorAll('[data-topic]').forEach(x=>x.classList.toggle('active',x.dataset.topic===requestTopic));$('#submit-service').disabled=!$('#service-consent').checked;return;}
  if(b.dataset.skin){skin=b.dataset.skin;closeModal();setup(seed);notify('已切换行业皮肤，开始一个新会话。');return;}
  switch(b.id){
    case 'start-game':active=true;track('game_started','开始救援，无需填表');render();selectCard('repair');notify('先把「排除阻塞」放到第一个模块，试试手感。');break;
    case 'new-mission':setup(Math.floor(Math.random()*999999)+1);$('#invite-banner').hidden=true;break;
    case 'retry-game':setup(seed);active=true;track('game_started','重新挑战同一关');render();selectCard('repair');$('.board').scrollIntoView({block:'start',behavior:'auto'});break;
    case 'pass-turn':gameState=Rescue.pass(gameState);selected='';hintMove=null;$('#coach-note').hidden=true;track('round_passed','提前结束当前回合');render();finishIfNeeded();break;
    case 'coach':{const result=Rescue.solve(gameState);hintMove=result.path[0];if(!hintMove){notify('当前局面没有可建议的后续行动。');break;}track('ai_hint_requested','请求本地策略搜索提示');const c=Rescue.CARDS.find(c=>c.id===hintMove.card);const why={auto:'早部署，能多获得几次自动推进。',repair:'先解除阻塞或压低风险，后续行动才有空间。',expert:'集中推进这个模块，争取更早交付。',sync:'同时推进两处，并压低整体风险。',fund:'先补预算，为后续行动留空间。',build:'这次直接推进可以更接近交付。'};if(c)selectCard(c.id);$('#coach-note').textContent=`试算 ${result.explored.toLocaleString()} 个行动分支后，建议${c?`把「${c.name}」投向「${d().nodes[hintMove.target]}」。${why[c.id]}`:'提前结束本回合，让自动化结算。'} ${result.state.status==='won'?'这条搜索路线仍有机会完成交付。':'当前搜索未找到完整通关路线，可以尝试改善完成度。'}`;$('#coach-note').hidden=false;break;}
    case 'share-game':shareGame();break;
    case 'copy-challenge':try{await navigator.clipboard.writeText(shareUrl());track('share_link_copied','复制挑战链接，不认定为成功传播');notify('挑战链接已复制，可以发给朋友直接玩。');}catch{$('#challenge-url').focus();$('#challenge-url').select();notify('请复制选中的挑战链接。');}break;
    case 'download-recap':download('项目急救局-本局复盘.md',`# 项目急救局复盘\n\n关卡：${seed}\n行业皮肤：${d().name}\n结果：${gameState.status==='won'?'完成':'未完成'}\n积分：${Rescue.score(gameState)}\n\n${summary()}\n\n${gameState.history.map(e=>`- 回合 ${e.round}：${e.title}。${e.detail}`).join('\n')}\n\n这只是游戏复盘，不是企业诊断。\n`);break;
    case 'replay-ai':modal('本局策略 AI 的实际路线',`<p>这条路线由本地搜索计算，最终积分 ${Rescue.score(rivalSolution.state)}。你可以重试同一关验证。</p><ol>${rivalSolution.path.map(m=>`<li>${m.card==='pass'?'提前结束回合':`${Rescue.CARDS.find(c=>c.id===m.card).name} → ${d().nodes[m.target]}`}</li>`).join('')}</ol><p class="note">有限搜索不保证最优。AI 没有额外预算、行动次数或隐藏事件信息。</p>`);break;
    case 'business-next':businessNext();break;
    case 'download-checklist':download('项目检查清单.md',checklist());track('checklist_downloaded','下载清单，无需留资');break;
    case 'submit-service':if(!requestTopic||!$('#service-consent').checked||serviceRequest)break;serviceRequest={topic:requestTopic,share:$('#share-recap').checked,marketing:$('#marketing-consent').checked,identity:'DEMO-PLAYER',sent_fields:{topic:requestTopic}};if(serviceRequest.share)serviceRequest.sent_fields.recap={seed,score:Rescue.score(gameState),result:gameState.status};track('service_requested','用户主动请求：'+requestTopic+'（模拟）');closeModal();renderResult();notify('已登记演示请求；没有真实发送或联系。');break;
    case 'export-events':download('项目急救局-演示事件.json',JSON.stringify({demo:true,events:ops,service_request:serviceRequest},null,2),'application/json');break;
    case 'change-skin':modal('同一玩法，换一个业务世界',`<p>切换会重新开始当前关卡。皮肤改变行业包装，规则与难度保持一致。</p><div class="skin-grid">${Object.entries(skins).map(([k,v])=>`<button class="skin-option ${k===skin?'active':''}" data-skin="${k}"><strong>${v.name}</strong><span>${v.nodes.join(' → ')}</span></button>`).join('')}</div>`);break;
    case 'modal-close':closeModal();break;
  }
});
document.addEventListener('change',e=>{if(e.target.id==='service-consent')$('#submit-service').disabled=!e.target.checked||!requestTopic;});
function cleanupPointer(){pointer=null;$('#drag-ghost').hidden=true;document.body.classList.remove('no-select');document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));}
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-card]');if(!b||b.disabled||e.button!==0)return;
  selectCard(b.dataset.card);pointer={id:e.pointerId,card:b.dataset.card,x:e.clientX,y:e.clientY,dragging:false,element:b};b.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>8)pointer.dragging=true;
  if(!pointer.dragging)return;e.preventDefault();document.body.classList.add('no-select');
  const c=Rescue.CARDS.find(c=>c.id===pointer.card),ghost=$('#drag-ghost');ghost.hidden=false;ghost.textContent=c.mark+' '+c.name;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-target]');if(target&&!Rescue.invalid(gameState,pointer.card,Number(target.dataset.target)))target.classList.add('drag-over');
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  const moving=pointer.dragging,target=moving?document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-target]'):null;
  if(pointer.element.hasPointerCapture(e.pointerId))pointer.element.releasePointerCapture(e.pointerId);
  cleanupPointer();if(moving){ignoreClickUntil=Date.now()+350;e.preventDefault();if(target)playSelected(Number(target.dataset.target));}
});
document.addEventListener('pointercancel',cleanupPointer);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cleanupPointer();selected='';render();}});
const inviteScore=Number(params.get('score'));if(params.has('seed')&&params.get('v')==='3'&&Number.isInteger(inviteScore)&&inviteScore>=0&&inviteScore<=600){$('#invite-banner').hidden=false;$('#invite-banner').textContent=`朋友邀你挑战同一项目 · 对方成绩 ${inviteScore} 分（链接自报，未验证）。你会有自己的独立游戏。`;}
setup(seed);
