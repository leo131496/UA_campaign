const config = require('./config');
App({
  globalData: { currentCampaignId: config.campaignId, lastGame: null, pendingActivityOptions: null },
  onLaunch() {
    if (config.mode === 'cloud' && config.cloudEnv && wx.cloud) {
      wx.cloud.init({ env: config.cloudEnv, traceUser: false });
    }
  },
  onShow(options) {
    if (options && options.path === 'pages/activity/index') {
      this.globalData.pendingActivityOptions = options.query || {};
    }
  }
});
