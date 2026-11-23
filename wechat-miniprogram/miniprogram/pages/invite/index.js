const api = require('../../services/api');
const ui = require('../../lib/ui');
const { sharePath } = require('../../lib/launch');
Page({
  data: { isDemo: api.isDemo, ready: false, loading: false, error: '', stats: null },
  onLoad() { ui.hideShare(); this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const invite = await api.call('createInvite', { campaignId: ui.campaignId() });
      this.shareLink = sharePath(ui.campaignId(), invite.token);
      this.setData({ ready: true, loading: false });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
      await this.refresh();
    } catch (e) { api.error(this, e); }
  },
  async refresh() {
    try { const stats = await api.call('getPromotionStats', { campaignId: ui.campaignId() }); this.setData({ stats, error: '' }); }
    catch (e) { api.error(this, e); }
  },
  onShow() { if (this.data.ready) this.refresh(); },
  onShareAppMessage() {
    return { title: '只剩 6 个回合，你能救回这个项目吗？', path: this.shareLink || '/pages/activity/index' };
    // WeChat does not provide reliable share completion confirmation. No success counter here.
  }
});
