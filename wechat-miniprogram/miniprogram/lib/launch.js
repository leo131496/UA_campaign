const config = require('../config');
const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const INVITE = /^[a-zA-Z0-9_-]{1,32}$/;
function parse(options) {
  const query = Object.assign({}, options || {});
  if (query.scene) {
    let scene;
    try { scene = decodeURIComponent(query.scene); } catch (_) { scene = ''; }
    scene.split('&').forEach(part => {
      const index = part.indexOf('=');
      if (index > 0) {
        const key = part.slice(0, index), value = part.slice(index + 1);
        if (key === 'i') query.invite = value;
        if (key === 'c') query.campaign = value;
      }
    });
  }
  return {
    campaignId: ID.test(query.campaign || '') ? query.campaign : config.campaignId,
    inviteToken: INVITE.test(query.invite || '') ? query.invite : ''
  };
}
function sharePath(campaignId, token) {
  if (!ID.test(campaignId) || !INVITE.test(token)) throw new Error('邀请参数尚未准备好');
  return '/pages/activity/index?campaign=' + encodeURIComponent(campaignId) + '&invite=' + encodeURIComponent(token);
}
module.exports = { parse, sharePath };
