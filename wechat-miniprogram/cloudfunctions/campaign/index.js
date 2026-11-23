const cloud = require('wx-server-sdk');
const { createService, BusinessError } = require('./core');
const { createStore } = require('./store');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const service = createService({ store: createStore(cloud.database({ throwOnNotFound: false })),
  phone: async code => {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    const info = result.phoneInfo || result.phone_info;
    return info && (info.phoneNumber || info.phone_number);
  }
});
exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const data = await service.call(event.action, event.payload || {}, { openid: OPENID });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof BusinessError) return { ok: false, code: error.code, message: error.message };
    // Never log event payloads: phone authorization codes and contact data are sensitive.
    console.error('campaign_failed', { type: error.name || 'Error' });
    return { ok: false, code: 'SERVICE', message: '活动服务暂时不可用，请稍后重试' };
  }
};
