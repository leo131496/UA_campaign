const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const { createStore } = require('./store');
const { dispatch } = require('./worker');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async () => {
  if (cloud.getWXContext().OPENID) return { ok: false, code: 'SERVER_ONLY' };
  const db = cloud.database({ throwOnNotFound: false }), tenantId = process.env.SCRM_TENANT_ID;
  if (!process.env.SCRM_ENDPOINT || !process.env.SCRM_AUTH_TOKEN || !tenantId) return { configured: false, delivered: 0 };
  const rows = await db.collection('ua_outbox').where({ tenantId, state: db.command.in(['pending', 'retry', 'processing']),
    nextAttemptAt: db.command.lte(Date.now()) }).orderBy('nextAttemptAt', 'asc').limit(5).get();
  return dispatch({ store: createStore(db), ids: rows.data.map(r => r._id),
    endpoint: process.env.SCRM_ENDPOINT, token: process.env.SCRM_AUTH_TOKEN, tenantId,
    leaseToken: () => crypto.randomBytes(16).toString('hex') });
};
