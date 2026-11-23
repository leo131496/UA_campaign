const api = require('../../services/api');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, result: null, error: '', busy: false },
  onLoad() { ui.hideShare(); const result = getApp().globalData.lastGame || wx.getStorageSync('ua-result-' + ui.campaignId()); this.setData({ result: result && result.campaignId === ui.campaignId() ? result : null }); },
  async claim() {
    if (this.data.busy) return;
    this.setData({ busy: true, error: '' });
    try {
      await api.call('claimBenefit', { campaignId: ui.campaignId(), sessionId: this.data.result.sessionId });
      ui.open('benefit');
    } catch (e) { api.error(this, e); } finally { this.setData({ busy: false }); }
  },
  invite() { ui.open('invite'); },
  again() { wx.redirectTo({ url: '/pages/game/index' }); },
  home() { wx.switchTab({ url: '/pages/activity/index' }); }
});
