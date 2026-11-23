const api = require('../../services/api');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, loading: true, busy: false, error: '', campaign: null, topic: '', serviceConsent: false,
    marketing: false, shareRecap: false, canShareRecap: false, privacyReady: false, lead: null },
  onLoad() { ui.hideShare(); this.load(); },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const mine = await api.call('getMyActivity', { campaignId: ui.campaignId() });
      this.result = getApp().globalData.lastGame || wx.getStorageSync('ua-result-' + ui.campaignId());
      this.setData({ campaign: mine.campaign, loading: false, canShareRecap: !!(this.result && this.result.campaignId === ui.campaignId()),
        lead: mine.lead ? { ...mine.lead, syncLabel: ui.syncLabel(mine.lead.syncState) } : null });
    } catch (e) { api.error(this, e); }
  },
  choose(e) { if (!this.data.busy) this.setData({ topic: e.currentTarget.dataset.topic, error: '' }); },
  consent(e) {
    if (this.data.busy) return;
    const field = e.currentTarget.dataset.field;
    if (['serviceConsent', 'marketing', 'shareRecap'].includes(field)) this.setData({ [field]: e.detail.value.includes('yes'), error: '' });
  },
  privacy() { ui.privacy(this.data.campaign); },
  async preparePhone() {
    if (!this.data.topic || !this.data.serviceConsent) { this.setData({ error: '请选择咨询主题，并同意本次咨询的信息使用说明' }); return; }
    if (!wx.requirePrivacyAuthorize) { this.setData({ error: '请升级微信后再使用手机号授权' }); return; }
    this.setData({ busy: true, error: '' });
    wx.requirePrivacyAuthorize({ success: () => this.setData({ privacyReady: true, busy: false }),
      fail: () => this.setData({ busy: false, error: '你未同意微信隐私授权，本次未提交咨询' }) });
  },
  phone(e) {
    if (!e.detail.code) { this.setData({ error: '未获得手机号授权，本次未提交咨询' }); return; }
    this.submit(e.detail.code);
  },
  demoSubmit() { this.submit('demo-only'); },
  async submit(phoneCode) {
    if (this.data.busy) return;
    if (!this.data.topic || !this.data.serviceConsent) { this.setData({ error: '请选择咨询主题，并同意本次咨询的信息使用说明' }); return; }
    this.setData({ busy: true, error: '' });
    try {
      const lead = await api.call('requestConsultation', { campaignId: ui.campaignId(), phoneCode,
        topic: this.data.topic, serviceConsent: true, marketing: this.data.marketing, shareRecap: this.data.shareRecap,
        privacyVersion: this.data.campaign.privacyVersion,
        sessionId: this.data.shareRecap && this.result ? this.result.sessionId : '' });
      this.setData({ lead: { ...lead, syncLabel: ui.syncLabel(lead.syncState) }, busy: false });
    } catch (e) { api.error(this, e); }
  },
  service() {
    const service = this.data.campaign.customerService;
    if (!service || !service.url || !service.corpId) return;
    wx.openCustomerServiceChat({ extInfo: { url: service.url }, corpId: service.corpId,
      fail: () => this.setData({ error: '暂时无法打开企业微信客服，请稍后重试' }) });
  },
  mine() { wx.switchTab({ url: '/pages/me/index' }); }
});
