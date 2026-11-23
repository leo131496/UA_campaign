const https = require('https');
function transport(endpoint, token, event) {
  return new Promise((resolve, reject) => {
    let url; try { url = new URL(endpoint); } catch (_) { reject(new Error('CONFIG_URL')); return; }
    if (url.protocol !== 'https:' || url.username || url.password) { reject(new Error('CONFIG_HTTPS')); return; }
    const body = JSON.stringify({ schemaVersion: '1.0', eventId: event._id, tenantId: event.tenantId,
      campaignId: event.campaignId, type: event.type, occurredAt: event.createdAt, data: event.data });
    const request = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token, 'Idempotency-Key': event._id, 'Content-Length': Buffer.byteLength(body) } }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; if (raw.length > 65536) request.destroy(new Error('RESPONSE_SIZE')); });
      response.on('error', reject);
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) { reject(new Error('HTTP_' + response.statusCode)); return; }
        try {
          const ack = JSON.parse(raw);
          if (ack.accepted !== true || ack.eventId !== event._id) throw new Error('ACK');
          resolve();
        } catch (_) { reject(new Error('ACK')); }
      });
    });
    const deadline = setTimeout(() => request.destroy(new Error('TIMEOUT')), 8000);
    request.once('close', () => clearTimeout(deadline));
    request.on('error', reject); request.end(body);
  });
}
async function dispatch({ store, ids, endpoint, token, tenantId, now = Date.now, send = transport, leaseToken }) {
  if (!endpoint || !token || !tenantId) return { configured: false, delivered: 0, failed: 0, skipped: ids.length };
  const totals = { configured: true, delivered: 0, failed: 0, skipped: 0 };
  for (const id of ids) {
    const lock = leaseToken();
    const item = await store.transact(async tx => {
      const e = await tx.get('outbox', id);
      if (!e || e.tenantId !== tenantId || !['pending', 'retry', 'processing'].includes(e.state) || e.nextAttemptAt > now() || e.leaseUntil > now()) return null;
      if (e.data.dependsOn) {
        const parent = await tx.get('outbox', e.data.dependsOn);
        if (!parent || parent.state === 'dead') {
          e.state = 'dead'; e.lastError = 'DEPENDENCY'; await tx.set('outbox', id, e); return null;
        }
        if (parent.state !== 'delivered') {
          // Move waiting events back so a batch of revocations cannot starve their parent events.
          e.nextAttemptAt = Math.max(now() + 60000, (parent.nextAttemptAt || 0) + 1000);
          await tx.set('outbox', id, e); return null;
        }
      }
      e.state = 'processing'; e.lease = lock; e.leaseUntil = now() + 60000; e.nextAttemptAt = e.leaseUntil;
      e.attempts += 1; await tx.set('outbox', id, e); return e;
    });
    if (!item) { totals.skipped++; continue; }
    let failure = '';
    try { await send(endpoint, token, item); } catch (e) { failure = /^HTTP_\d{3}$|^(TIMEOUT|ACK|CONFIG_HTTPS|CONFIG_URL|RESPONSE_SIZE)$/.test(e.message) ? e.message : 'NETWORK'; }
    await store.transact(async tx => {
      const current = await tx.get('outbox', id);
      if (!current || current.lease !== lock) return;
      current.leaseUntil = 0; current.lease = '';
      if (!failure) { current.state = 'delivered'; current.deliveredAt = now(); }
      else {
        current.state = current.attempts >= 8 ? 'dead' : 'retry'; current.lastError = failure;
        current.nextAttemptAt = now() + Math.min(3600000, 30000 * Math.pow(2, current.attempts - 1));
      }
      await tx.set('outbox', id, current);
    });
    totals[failure ? 'failed' : 'delivered']++;
  }
  return totals;
}
module.exports = { dispatch, transport };
