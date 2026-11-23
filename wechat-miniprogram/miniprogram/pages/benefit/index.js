const api = require('../../services/api');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, loading: true, error: '', claim: null },
  onLoad() { ui.hideShare(); this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try { const mine = await api.call('getMyActivity', { campaignId: ui.campaignId() }); this.setData({ claim: mine.claim, loading: false }); }
    catch (e) { api.error(this, e); }
  },
  copy() {
    const claim = this.data.claim;
    if (!claim) return;
    wx.setClipboardData({ data: claim.title + '\n\n' + claim.sections.map(s => s.title + '\n' + s.items.join('\n')).join('\n\n') });
  },
  contact() { ui.open('contact'); },
  invite() { ui.open('invite'); },
  home() { wx.switchTab({ url: '/pages/activity/index' }); }
});
