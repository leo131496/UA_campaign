(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.CampaignModel=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const engines=[
    {id:'adventure',name:'星岛远征',verb:'规划路线，收集光片，解开星门',description:'带着有限能量穿越遗迹，选择强化，与好友分工解码。',tag:'策略冒险',icon:'◈'},
    {id:'memory',name:'记忆翻牌',verb:'翻开卡牌，找出相同图案',description:'记住品牌元素，把相同卡牌配成一对。',tag:'轻松互动',icon:'▦'},
    {id:'collect',name:'灵感收集',verb:'点亮目标，避开灰色干扰',description:'各自收集目标，协作通关后积分翻倍。',tag:'手速挑战',icon:'✦'},
    {id:'quiz',name:'知识闯关',verb:'选出答案，解锁下一道关卡',description:'把知识内容变成有解释、有反馈的小挑战。',tag:'内容教育',icon:'?'}
  ];
  const industries=[
    {id:'general',name:'通用活动 · 不限行业',brand:'好奇星球',title:'一起点亮好奇星球',reward:'品牌专属体验礼',items:['星星','月亮','火箭','礼物'],emoji:['⭐','🌙','🚀','🎁'],color:'#4266d5',topic:'了解品牌活动'},
    {id:'manufacturing',name:'工业制造',brand:'星河智造',title:'发现工业的另一面',reward:'新品体验与应用手册',items:['机械臂','传感器','齿轮','芯片'],emoji:['🦾','📡','⚙️','🔋'],color:'#4266d5',topic:'预约样品演示'},
    {id:'software',name:'软件与企业服务',brand:'云序科技',title:'收集你的灵感宇宙',reward:'产品体验与实用工具包',items:['云朵','闪电','星球','火箭'],emoji:['☁️','⚡','🪐','🚀'],color:'#4266d5',topic:'申请产品试用'},
    {id:'education',name:'教育与培训',brand:'知遇学堂',title:'知识星球闯关记',reward:'公开课与学习资料',items:['书本','铅笔','星星','地球'],emoji:['📚','✏️','⭐','🌍'],color:'#287b64',topic:'了解课程体验'},
    {id:'health',name:'医疗与健康',brand:'澄心健康',title:'每天一点好习惯',reward:'健康科普手册',items:['水滴','苹果','太阳','月亮'],emoji:['💧','🍎','☀️','🌙'],color:'#287b64',topic:'了解健康服务'},
    {id:'finance',name:'金融与保险',brand:'远见服务',title:'点亮生活小确幸',reward:'金融知识入门手册',items:['雨伞','房子','书本','星星'],emoji:['☂️','🏠','📖','⭐'],color:'#7560b7',topic:'了解服务内容'},
    {id:'retail',name:'消费与零售',brand:'好物研究所',title:'今天也有好事发生',reward:'新品试用与选购指南',items:['咖啡','面包','礼盒','花束'],emoji:['☕','🥐','🎁','💐'],color:'#ca6243',topic:'了解新品体验'},
    {id:'travel',name:'文旅与会展',brand:'山海之间',title:'把下一站装进口袋',reward:'展会攻略与参观指南',items:['山峰','帐篷','海浪','相机'],emoji:['⛰️','⛺','🌊','📷'],color:'#287b64',topic:'了解参观安排'},
    {id:'services',name:'专业服务与咨询',brand:'共好伙伴',title:'把好想法连在一起',reward:'公开分享与服务资料',items:['拼图','灯泡','指南针','桥梁'],emoji:['🧩','💡','🧭','🌉'],color:'#7560b7',topic:'了解服务体验'},
    {id:'agriculture',name:'农业与食品',brand:'田野来信',title:'收集一口好时光',reward:'产品体验与溯源资料',items:['麦穗','苹果','阳光','水滴'],emoji:['🌾','🍎','☀️','💧'],color:'#287b64',topic:'了解产品体验'},
    {id:'living',name:'地产家居与生活',brand:'理想生活',title:'拼出生活的小美好',reward:'空间灵感与体验指南',items:['房子','沙发','绿植','台灯'],emoji:['🏡','🛋️','🪴','💡'],color:'#ca6243',topic:'了解空间体验'},
    {id:'mobility',name:'汽车出行与能源',brand:'逐光同行',title:'好朋友，一起向前',reward:'体验预约与产品资料',items:['汽车','电池','地图','太阳'],emoji:['🚗','🔋','🗺️','☀️'],color:'#4266d5',topic:'了解体验预约'},
    {id:'custom',name:'自定义行业',brand:'你的品牌',title:'发现不一样的你',reward:'品牌专属体验礼包',items:['星星','礼物','灵感','伙伴'],emoji:['⭐','🎁','💡','🤝'],color:'#4266d5',topic:'了解品牌体验'}
  ];
  function quizFor(id){
    const bank={
      general:[['哪一件东西更适合在夜空中寻找？',['星星','书桌','雨伞'],0,'星星是夜空里的小小光点。'],['哪种交通工具能飞向太空？',['自行车','火箭','帆船'],1,'火箭可以把航天器送往太空。'],['哪种搭配能让种子慢慢长大？',['阳光和水','石头和玻璃','书本和铅笔'],0,'植物的生长离不开合适的水分和光照。']],
      manufacturing:[['传感器可以帮助设备做什么？',['感知环境变化','改变地球引力','让时间停止'],0,'传感器把温度、位置等物理量转成可读取的信号。'],['哪个词描述设备之间交换信息？',['互联','折叠','睡眠'],0,'互联让设备能够交换数据；具体能力以产品资料为准。'],['了解产品适用场景，优先看什么？',['颜色猜测','应用说明与实测','游戏分数'],1,'应用资料和实测是评估产品的依据。']],
      software:[['给在线账号加一道保护，选哪个？',['共享密码','多因素验证','公开验证码'],1,'多因素验证使用额外的身份验证因素。'],['协作时想找到旧文件版本，应查看什么？',['版本记录','屏幕亮度','头像颜色'],0,'版本记录可以帮助追踪历史修改。'],['申请产品试用前，先确认什么？',['别人游戏得分','自己的使用需求','壁纸样式'],1,'试用应围绕实际需求验证效果。']],
      education:[['想记住新知识，哪种方式更合适？',['间隔复习','只看标题','一直不休息'],0,'间隔复习是常用的学习策略。'],['遇到不理解的内容，可以怎么做？',['放弃所有学习','提出问题并验证','只记答案字母'],1,'提问与验证有助于建立理解。'],['发现两种说法冲突，先做什么？',['比较来源和依据','随机选一个','只看字数'],0,'比较可靠来源和证据，再作判断。']],
      health:[['哪项属于日常健康习惯？',['规律作息','只睡两小时','长期不活动'],0,'规律作息是一般健康建议，个体情况请咨询专业人士。'],['阅读健康信息时，应优先查看什么？',['转发次数','信息来源与证据','标题感叹号'],1,'可靠来源与证据比转发数量更值得参考。'],['身体持续不适时，应如何处理？',['根据游戏分数诊断','寻求专业医疗帮助','只看网络评论'],1,'游戏不提供诊断或治疗建议。']],
      finance:[['遇到“保证高收益”的陌生链接，先做什么？',['马上转账','核实主体与风险','分享验证码'],1,'应核实信息来源、主体和风险，不凭承诺转账。'],['验证码应该给谁？',['陌生客服','群里所有人','不向他人透露'],2,'验证码属于账号验证信息。'],['了解金融服务前，应该阅读什么？',['条款和风险说明','游戏排名','头像介绍'],0,'应阅读条款及风险说明，游戏不提供投资建议。']]
    };
    return (bank[id]||[['发现感兴趣的品牌，下一步可以怎样？',['了解产品详情','把密码发给它','只看游戏分数'],0,'查看真实产品信息，再决定是否进一步了解。'],['想邀请朋友一起玩，分享什么？',['自己的账号密码','同关挑战链接','陌生付款码'],1,'好友通过挑战链接进入同一活动。'],['选购或预约前，先确认什么？',['适用条件与服务说明','游戏名次','头像颜色'],0,'了解适用条件、价格和服务内容后再作决定。']]).map(([question,options,answer,explanation])=>({question,options,answer,explanation}));
  }
  function preset(id,engine='memory'){
    const i=industries.find(x=>x.id===id)||industries[0];
    return {schemaVersion:2,engine,industry:i.name,industryId:i.id,brand:i.brand,title:i.title,reward:i.reward,topic:i.topic,color:i.color,items:[...i.items],emoji:[...i.emoji],questions:quizFor(i.id),duration:engine==='adventure'?300:60,adventure:{pressure:'standard',guide:true},shareMode:'challenge',seed:72103,stock:200,consent:true,tag:i.name+' · 活动兴趣',owner:'按 SCRM 现有分配规则',brandStory:'玩一局，发现一点新灵感。感兴趣时，再来了解我们。',source:'manual',team:{maxFriends:5,soloBase:100,teamBase:200,multiplier:2,levels:3}};
  }
  const copy=x=>JSON.parse(JSON.stringify(x));
  const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
  function normalize(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('活动配置格式无效');
    const base=preset('custom');
    const c={schemaVersion:2,engine:engines.some(e=>e.id===raw.engine)?raw.engine:'memory'};
    for(const [k,max] of Object.entries({industry:40,industryId:30,brand:32,title:40,reward:70,topic:40,color:7,tag:60,owner:50,brandStory:180,source:15}))c[k]=clean(raw[k]===undefined?base[k]:raw[k],max);
    if(!/^#[0-9a-f]{6}$/i.test(c.color))c.color=base.color;
    c.duration=[30,60,90,180,300,480].includes(Number(raw.duration))?Number(raw.duration):60;
    c.shareMode=['challenge','share'].includes(raw.shareMode)?raw.shareMode:'challenge';
    c.seed=Number.isInteger(raw.seed)&&raw.seed>0&&raw.seed<1000000?raw.seed:base.seed;
    c.stock=Number.isInteger(Number(raw.stock))&&Number(raw.stock)>=1&&Number(raw.stock)<=100000?Number(raw.stock):200;
    c.consent=true;
    c.items=Array.isArray(raw.items)?raw.items.slice(0,4).map(x=>clean(x,12)):base.items;
    c.emoji=Array.isArray(raw.emoji)&&raw.emoji.length===4?raw.emoji.map(x=>clean(x,8)):base.emoji;
    c.questions=Array.isArray(raw.questions)?raw.questions.slice(0,8).map(q=>({question:clean(q&&q.question,100),options:Array.isArray(q&&q.options)?q.options.slice(0,3).map(x=>clean(x,50)):[],answer:q&&Number.isInteger(q.answer)?q.answer:-1,explanation:clean(q&&q.explanation,180)})):base.questions;
    c.adventure={pressure:['relaxed','standard','expert'].includes(raw.adventure?.pressure)?raw.adventure.pressure:'standard',guide:raw.adventure?.guide!==false};
    c.team={};for(const k of ['maxFriends','soloBase','teamBase','multiplier','levels'])c.team[k]=raw.team&&raw.team[k]!==undefined?Number(raw.team[k]):base.team[k];
    return c;
  }
  function validate(c){const errors=[];
    if(!c.brand)errors.push('请填写品牌名称');if(!c.title)errors.push('请填写活动标题');if(!c.reward)errors.push('请填写权益内容');if(!c.topic)errors.push('请填写自愿了解入口');
    if(c.items.length!==4||c.items.some(x=>!x)||new Set(c.items).size!==4)errors.push('请配置 4 个不同的游戏元素');
    if(c.engine==='quiz'&&(!c.questions.length||c.questions.some(q=>!q.question||q.options.length!==3||q.options.some(x=>!x)||new Set(q.options).size!==3||q.answer<0||q.answer>2||!q.explanation)))errors.push('每道题需要题目、3 个不同选项、正确答案和解释');
    const t=c.team||{};
    if(!Number.isInteger(t.maxFriends)||t.maxFriends<0||t.maxFriends>5)errors.push('好友上限必须为 0–5 位（不含发起人）');
    if(!Number.isInteger(t.levels)||t.levels<1||t.levels>3)errors.push('关卡数必须为 1–3 关');
    if(!Number.isInteger(t.soloBase)||t.soloBase<1||t.soloBase>10000||!Number.isInteger(t.teamBase)||t.teamBase<=t.soloBase||t.teamBase>20000)errors.push('组队基础积分须高于单人，且为有效整数');
    if(!Number.isInteger(t.multiplier)||t.multiplier<2||t.multiplier>5)errors.push('通关倍数必须为 2–5 倍');
    return errors;
  }
  function encode(c){const bytes=new TextEncoder().encode(JSON.stringify(normalize(c)));let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(value){if(typeof value!=='string'||value.length>16000||!/^[\w-]+$/.test(value))throw new Error('演示链接无效或过长');const s=atob(value.replace(/-/g,'+').replace(/_/g,'/'));const c=normalize(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(s,x=>x.charCodeAt(0)))));if(validate(c).length)throw new Error('链接中的活动内容不完整');return c;}
  function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function shuffled(c){const r=random(c.seed),cards=[0,1,2,3,0,1,2,3].map((pair,id)=>({pair,id}));for(let i=cards.length-1;i;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
  function plan(prompt,current){
    const text=clean(prompt,800);
    if(text.length<8)return {error:'请补充活动对象和玩法，例如：通用品牌活动，单人轻松翻牌，最多邀请 5 位好友组队，通关积分翻倍。'};
    if(/(3D|3d|赛车|射击|大型|开放世界|重力感应)/.test(text))return {error:'这个想法需要新增玩法能力。当前可生成星岛远征、翻牌、收集和知识闯关，并演示最多 6 人协作；全新引擎需开发与小程序审核。',capabilityGap:true};
    const patterns=[['general',/通用|不限行业|全行业/],['manufacturing',/工业|制造|工厂|传感器|样品|机械/],['software',/软件|SaaS|saas|云服务|企业服务/],['education',/教育|课程|学员|培训|学习/],['health',/医疗|健康|医院/],['finance',/金融|保险|理财/],['retail',/零售|门店|消费|咖啡|新品/],['travel',/文旅|展会|旅游|参观|景区/],['services',/专业服务|咨询服务/],['agriculture',/农业|食品|农场/],['living',/家居|地产|装修/],['mobility',/汽车|出行|能源/]];
    const id=(patterns.find(([,r])=>r.test(text))||[])[0];
    const c=id?preset(id,current&&current.engine||'memory'):copy(current||preset('general'));
    if(current&&id)c.team=copy(current.team);
    c.engine=/冒险|远征|遗迹|机关|路线/.test(text)?'adventure':/翻牌|配对|记忆/.test(text)?'memory':/收集|手速|气泡|点击/.test(text)?'collect':/答题|知识|科普/.test(text)?'quiz':c.engine;
    const cap=text.match(/(?:最多|上限|邀请|添加)\s*([0-9]+)\s*位?个?好友/);if(cap){if(Number(cap[1])>5)return {error:'最多支持添加 5 位好友，即发起人加好友共 6 人。请调整人数。'};c.team.maxFriends=Number(cap[1]);}
    if(/只.*单人|关闭组队/.test(text))c.team.maxFriends=0;
    const multi=text.match(/(?:通关|积分)[^。\n]{0,8}?(?:乘|×|x|翻)\s*([2-5])\s*倍?/);if(multi)c.team.multiplier=Number(multi[1]);else if(/翻倍/.test(text))c.team.multiplier=2;
    for(const [key,pattern] of [['soloBase',/单人(?:基础|每关|积分|得分|\s)*([0-9]+)\s*分/],['teamBase',/(?:组队|多人)(?:基础|每人|每关|积分|得分|\s)*([0-9]+)\s*分/]]){const match=text.match(pattern);if(match)c.team[key]=Number(match[1]);}
    if(c.engine==='adventure'&&c.duration<180)c.duration=300;
    if(/烧脑|困难|高手/.test(text))c.adventure.pressure='expert';else if(/入门|宽松/.test(text))c.adventure.pressure='relaxed';
    if(/关闭提示/.test(text))c.adventure.guide=false;
    const time=text.match(/(30|60|90|180|300|480)\s*秒/);if(time)c.duration=Number(time[1]);else if(/一分钟/.test(text))c.duration=60;
    const title=text.match(/(?:标题|活动名)[为是：:叫\s]*[“「"]([^”」"\n]{1,40})[”」"]/);if(title)c.title=title[1];
    const brand=text.match(/品牌[为是：:叫\s]*[“「"]([^”」"\n]{1,32})[”」"]/);if(brand)c.brand=brand[1];
    if(/橙色/.test(text))c.color='#ca6243';if(/蓝色/.test(text))c.color='#4266d5';if(/绿色/.test(text))c.color='#287b64';
    c.source='ai-sample';
    const errors=validate(c);if(errors.length)return {error:errors.join('；')};
    return {config:c,summary:'「'+engines.find(e=>e.id===c.engine).name+'」适用于'+c.industry+'。单人每关 '+c.team.soloBase+' 分；可添加 '+c.team.maxFriends+' 位好友协作，每位有效参与者每关 '+c.team.teamBase+' 分，通关 ×'+c.team.multiplier+'。',notes:['生成范围：行业主题、单人/组队规则、积分和预览。','来源：内置示例内容包；未连接真实模型或跨设备房间服务。','请核对品牌与权益，再发布。'],prompt:text};
  }
  return {engines,industries,preset,copy,normalize,validate,encode,decode,random,shuffled,plan};
});
