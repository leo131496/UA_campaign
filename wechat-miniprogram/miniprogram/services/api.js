const config = require('../config');
const demo = require('./demo');
async function call(action, payload) {
  if (config.mode === 'demo') return demo.call(action, payload || {});
  if (config.mode !== 'cloud' || !config.cloudEnv || !wx.cloud) throw new Error('小程序云环境未配置，请联系活动方');
  let response;
  try { response = await wx.cloud.callFunction({ name: config.functionName, data: { action, payload: payload || {} } }); }
  catch (_) { throw new Error('暂时无法连接活动服务，请重试'); }
  const result = response && response.result;
  if (!result || !result.ok) throw new Error(result && result.message || '活动服务暂不可用');
  return result.data;
}
function error(page, e) { page.setData({ error: e && e.message || '操作失败，请重试', busy: false, loading: false }); }
module.exports = { call, error, isDemo: config.mode === 'demo' };
