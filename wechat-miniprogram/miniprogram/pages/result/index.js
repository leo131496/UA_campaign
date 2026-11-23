const api=require('../../services/api'),ui=require('../../lib/ui'),spot=require('../../lib/spot');
Page({
 data:{isDemo:api.isDemo,result:null,error:'',busy:false,firstFinds:[],seconds:0},
 onLoad(){ui.hideShare();const r=getApp().globalData.lastGame||wx.getStorageSync('ua-spot-result-'+ui.campaignId());if(r&&r.campaignId===ui.campaignId())this.setData({result:r,seconds:Math.ceil(r.elapsed/1000),firstFinds:r.found.slice(0,3).map(id=>spot.LABELS[id])});},
 async claim(){if(this.data.busy)return;this.setData({busy:true,error:''});try{await api.call('claimBenefit',{campaignId:ui.campaignId(),sessionId:this.data.result.sessionId});ui.open('benefit');}catch(e){api.error(this,e);}finally{this.setData({busy:false});}},
 invite(){ui.open('invite');},
 again(){getApp().globalData.friend=null;wx.redirectTo({url:'/pages/game/index'});},
 home(){wx.switchTab({url:'/pages/activity/index'});}
});
