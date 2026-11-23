const spot=require('../../lib/spot'),art=require('../../lib/art'),api=require('../../services/api'),ui=require('../../lib/ui');
Page({
 data:{isDemo:api.isDemo,loading:true,busy:false,error:'',state:null,time:60,foundCount:0,hint:'',hintRegion:'',aiBusy:false,objects:[],imageA:'',imageB:'',dots:[],feedback:''},
 onLoad(){ui.hideShare();this.alive=true;this.campaign=getApp().globalData.campaign;if(!this.campaign){this.setData({loading:false,error:'请从活动首页开始'});return;}this.key='ua-spot-game-'+ui.campaignId();this.start();},
 onUnload(){this.alive=false;clearInterval(this.timer);clearTimeout(this.aiTimer);},
 onHide(){clearInterval(this.timer);},
 onShow(){if(this.state&&this.state.status==='playing')this.clock();},
 async start(){
  this.setData({loading:true,error:''});
  try{
   const saved=wx.getStorageSync(this.key),friend=getApp().globalData.friend,signature=friend?(friend.inviteToken||friend.duel):'';
   if(saved&&saved.mode===(api.isDemo?'demo':'cloud')&&saved.friendSignature===signature&&saved.expiresAt>Date.now()){
    this.session=saved;this.startedAt=saved.startedAt;this.state=spot.create(saved.seed,saved.level);
    for(const move of saved.moves||[]){this.state=spot.advance(this.state,move);if(!this.state)throw new Error('本局记录已失效，请重新开始');}
   }else{
    this.requestId=this.requestId||ui.requestId();
    this.session=await api.call('startChallenge',{campaignId:ui.campaignId(),requestId:this.requestId,level:getApp().globalData.nextLevel||0,inviteToken:friend&&friend.inviteToken,duel:friend&&friend.duel});
    this.session.friendSignature=signature;this.startedAt=Date.now();this.state=spot.create(this.session.seed,this.session.level);this.save();
   }
   if(!this.alive)return;
   this.setData({loading:false,imageA:art.image(this.state,'a'),imageB:art.image(this.state,'b'),theme:this.state.theme,withFriend:!!friend});this.render();
   if(this.state.status!=='playing')this.submit();else this.clock();
  }catch(e){api.error(this,e);}
 },
 save(){wx.setStorageSync(this.key,{...this.session,startedAt:this.startedAt,moves:this.state.events,mode:api.isDemo?'demo':'cloud'});},
 elapsed(){return Math.min(spot.DURATION,Math.max(this.state.elapsed,Date.now()-this.startedAt));},
 clock(){clearInterval(this.timer);const tick=()=>{if(!this.alive||this.state.status!=='playing')return;const elapsed=this.elapsed();this.setData({time:Math.ceil((spot.DURATION-elapsed)/1000)});if(elapsed>=spot.DURATION)this.execute({type:'end',at:spot.DURATION});};tick();if(this.state.status==='playing')this.timer=setInterval(tick,500);},
 render(){this.setData({state:this.state,foundCount:this.state.found.length,dots:Array.from({length:5},(_,i)=>({id:i,done:i<this.state.found.length})),
  objects:this.state.objects.map(o=>({...o,found:this.state.found.includes(o.id),style:'left:'+o.x/6+'%;top:'+o.y/3.6+'%;width:'+o.w/6+'%;height:'+o.h/3.6+'%;'}))});},
 tap(e){if(!this.state||this.state.status!=='playing'||this.data.busy||this.data.aiBusy)return;const id=Number(e.currentTarget.dataset.id);if(this.state.found.includes(id))return;const elapsed=this.elapsed();if(elapsed>=spot.DURATION){this.execute({type:'end',at:spot.DURATION});return;}
  const correct=this.state.changed.includes(id);this.setData({feedback:correct?'找到啦！就是这里。':'这里一样哦，再仔细看看。',hintRegion:correct?'':this.data.hintRegion,error:''});this.execute({type:'tap',id,at:elapsed});},
 execute(move){const next=spot.advance(this.state,move);if(!next)return;this.state=next;this.save();this.render();if(next.status!=='playing'){clearInterval(this.timer);this.submit();}},
 hint(){if(!this.state||this.state.status!=='playing'||this.data.aiBusy||this.data.busy)return;if(this.state.hints>=3){this.setData({hint:'这局 3 次 AI 提示已用完，相信你的眼力！'});return;}
  this.setData({aiBusy:true,hint:'正在比对两张画面的颜色与细节…'});
  this.aiTimer=setTimeout(()=>{if(!this.alive||this.state.status!=='playing'){if(this.alive)this.setData({aiBusy:false});return;}const elapsed=this.elapsed();if(elapsed>=spot.DURATION){this.setData({aiBusy:false});this.execute({type:'end',at:spot.DURATION});return;}
   const clue=spot.hint(this.state);if(clue){const second=this.lastClue===clue.id;this.lastClue=clue.id;this.execute({type:'hint',at:elapsed});this.setData({hint:second?clue.detail:'我找到一个可疑区域，仔细看看'+clue.region+'。',hintRegion:clue.region==='上面一排'?'top':clue.region==='中间一排'?'middle':'bottom',feedback:'',aiBusy:false});}else this.setData({hint:'已经找齐啦！',aiBusy:false});
  },350);
 },
 finish(){if(!this.state||this.data.busy||this.data.aiBusy)return;wx.showModal({title:'现在揭晓？',content:'还可以继续找。现在结束也可以领取小礼物。',confirmText:'揭晓结果',cancelText:'继续找',success:r=>{if(r.confirm&&this.alive&&this.state.status==='playing')this.execute({type:'end',at:this.elapsed()});}});},
 async submit(){if(this.data.busy)return;this.setData({busy:true,error:''});try{const result=await api.call('finishChallenge',{sessionId:this.session.sessionId,moves:this.state.events});getApp().globalData.lastGame=result;getApp().globalData.nextLevel=result.nextLevel;wx.setStorageSync('ua-spot-result-'+ui.campaignId(),result);wx.removeStorageSync(this.key);if(this.alive)wx.redirectTo({url:'/pages/result/index'});}catch(e){api.error(this,e);}},
 restart(){if(this.key)wx.removeStorageSync(this.key);this.requestId='';this.start();},
 home(){wx.switchTab({url:'/pages/activity/index'});}
});
