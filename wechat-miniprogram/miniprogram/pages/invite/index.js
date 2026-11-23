const api=require('../../services/api'),ui=require('../../lib/ui'),spot=require('../../lib/spot'),art=require('../../lib/art');
const {sharePath}=require('../../lib/launch');
Page({
 data:{isDemo:api.isDemo,ready:false,loading:false,error:'',result:null,cover:''},
 onLoad(){ui.hideShare();const result=getApp().globalData.lastGame||wx.getStorageSync('ua-spot-result-'+ui.campaignId());if(result&&result.campaignId===ui.campaignId()){this.setData({result,cover:art.image(spot.create(result.seed,result.level),'a')});this.load();}},
 async load(){if(!this.data.result)return;this.setData({loading:true,error:''});try{const invite=await api.call('createInvite',{campaignId:ui.campaignId(),sessionId:this.data.result.sessionId});this.shareLink=sharePath(ui.campaignId(),invite.token,invite.duel);this.setData({ready:true,loading:false});wx.showShareMenu({menus:['shareAppMessage']});}catch(e){api.error(this,e);}},
 onShareAppMessage(){return {title:'我找到 '+this.data.result.found.length+' 处不同！你会先发现同一个吗？',path:this.shareLink||'/pages/activity/index'};},
 tryFriend(){if(!this.data.result)return;getApp().globalData.friend={...this.data.result,foundCount:this.data.result.found.length,duel:spot.encodeDuel(this.data.result)};wx.redirectTo({url:'/pages/game/index'});},
 home(){wx.switchTab({url:'/pages/activity/index'});}
});
