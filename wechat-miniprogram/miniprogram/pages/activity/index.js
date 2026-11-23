const api = require('../../services/api');
const launch = require('../../lib/launch');
const ui = require('../../lib/ui');
const spot = require('../../lib/spot');
const art = require('../../lib/art');
Page({
  data: { isDemo: api.isDemo, loading: true, error: '', campaign: null, cover:art.image(spot.create(731025,0),'a'), friend:null },
  onLoad(options) {
    ui.hideShare();
    const app = getApp(); this.entry = launch.parse(app.globalData.pendingActivityOptions || options);
    app.globalData.pendingActivityOptions = null; this.load();
  },
  onShow() {
    const app = getApp(), pending = app.globalData.pendingActivityOptions;
    app.globalData.pendingActivityOptions = null;
    if (pending) {
      const entry = launch.parse(pending);
      if (JSON.stringify(entry) !== JSON.stringify(this.entry)) { this.entry = entry; this.load(); }
    }
  },
  async load() {
    const sequence = this.loadSequence = (this.loadSequence || 0) + 1;
    this.setData({ loading: true, error: '' });
    try {
      const result = await api.call('visitCampaign', this.entry);
      if (sequence !== this.loadSequence) return;
      getApp().globalData.currentCampaignId = result.campaign.id;
      getApp().globalData.campaign = result.campaign;
      getApp().globalData.friend = result.friend;
      this.setData({ campaign: result.campaign, friend:result.friend, loading: false });
    } catch (e) { if (sequence === this.loadSequence) api.error(this, e); }
  },
  play() { ui.open('game'); },
  invite() {const result=getApp().globalData.lastGame||wx.getStorageSync('ua-spot-result-'+ui.campaignId());if(result)ui.open('invite');else this.play();},
  aiInfo() {wx.showModal({title:'AI 怎么帮你？',content:'卡住时，视觉助手会比对两幅画面，先提示一排，再提示物体。它不会替你点击。每局最多 3 次提示，每次减 15 分。\n\n当前使用本地图像差分与区域搜索，不调用大模型。下一关难度会按你的找出数量、耗时和提示次数调整。',showCancel:false});},
  privacy() { ui.privacy(this.data.campaign); },
  mine() { wx.switchTab({ url: '/pages/me/index' }); }
});
