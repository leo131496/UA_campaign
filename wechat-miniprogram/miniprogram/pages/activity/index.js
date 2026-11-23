const api = require('../../services/api');
const launch = require('../../lib/launch');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, loading: true, error: '', campaign: null },
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
      this.setData({ campaign: result.campaign, loading: false });
    } catch (e) { if (sequence === this.loadSequence) api.error(this, e); }
  },
  play() { ui.open('game'); },
  invite() { ui.open('invite'); },
  privacy() { ui.privacy(this.data.campaign); },
  mine() { wx.switchTab({ url: '/pages/me/index' }); }
});
