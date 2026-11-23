const config = require('../config');
function campaignId() { return getApp().globalData.currentCampaignId || config.campaignId; }
function open(page, params = {}) {
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '').map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  wx.navigateTo({ url: '/pages/' + page + '/index' + (query ? '?' + query : '') });
}
function privacy(campaign) {
  wx.showModal({ title: '活动信息使用说明', content: campaign.privacyText + '\n运营方：' + campaign.operatorName + '\n联系渠道：' + campaign.privacyContact, showCancel: false, confirmText: '我知道了' });
}
function hideShare() { wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] }); }
function requestId() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
function syncLabel(state) {
  return ({ demo: '演示记录 · 未发送', pending: '等待同步至服务方', processing: '正在同步至服务方', retry: '同步重试中', dead: '同步异常，请联系活动方', delivered: '服务方已接收' })[state] || '等待同步至服务方';
}
module.exports = { campaignId, open, privacy, hideShare, requestId, syncLabel };
