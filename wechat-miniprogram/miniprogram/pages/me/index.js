const api = require('../../services/api');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, loading: true, busy: false, error: '', mine: null },
  onLoad() { ui.hideShare(); },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const mine = await api.call('getMyActivity', { campaignId: ui.campaignId() });
      if (mine.lead) { mine.lead.syncLabel = ui.syncLabel(mine.lead.syncState); mine.lead.revocationLabel = ui.syncLabel(mine.lead.revocationState); }
      this.setData({ mine, loading: false });
    } catch (e) { api.error(this, e); }
  },
  benefit() { ui.open('benefit'); },
  invite() { ui.open('invite'); },
  home() { wx.switchTab({ url: '/pages/activity/index' }); },
  privacy() { ui.privacy(this.data.mine.campaign); },
  revoke() {
    if (this.data.busy) return;
    wx.showModal({ title: '撤回后续服务推荐授权', content: '活动方将停止基于本次授权的后续营销。本次咨询仍会按你的申请处理。', success: async r => {
      if (!r.confirm) return;
      this.setData({ busy: true, error: '' });
      try { await api.call('revokeMarketing', { campaignId: ui.campaignId() }); await this.load(); }
      catch (e) { api.error(this, e); } finally { this.setData({ busy: false }); }
    } });
  }
});
