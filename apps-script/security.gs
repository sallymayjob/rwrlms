/** Slack request authentication and anti-replay checks. */

function getTokenFromEnvelope(envelope) {
  var data = (envelope && envelope.data) || {};
  if (data.token) return data.token;
  if (data.payload && data.payload.token) return data.payload.token;
  return '';
}

function verifySlackRequest(e, envelope) {
  const rawBody = (envelope && envelope.rawBody) || ((e && e.postData && e.postData.contents) || '');
  const headers = (e && e.headers) || {};
  const signature = headers['X-Slack-Signature'] || headers['x-slack-signature'] || '';
  const timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'] || '';

  // Preferred verification path: signature + timestamp (works where headers are exposed).
  if (signature && timestamp && rawBody) {
    const ts = Number(timestamp);
    const currentTs = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTs - ts) > CONFIG.SLACK_MAX_TIMESTAMP_SKEW_SEC) {
      throw new Error('Slack timestamp outside allowed skew.');
    }

    const base = 'v0:' + timestamp + ':' + rawBody;
    const secret = getScriptProperty(CONFIG.PROPERTIES.SIGNING_SECRET);
    const digestBytes = Utilities.computeHmacSha256Signature(base, secret);
    const computed = 'v0=' + digestBytes.map(function (b) {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');

    if (computed !== signature) {
      throw new Error('Invalid Slack signature.');
    }
    return true;
  }

  // Fallback: verification token for environments where inbound headers are unavailable.
  const incomingToken = getTokenFromEnvelope(envelope);
  const expectedToken = getScriptProperty(CONFIG.PROPERTIES.VERIFICATION_TOKEN);

  if (!incomingToken || incomingToken !== expectedToken) {
    throw new Error('Slack request verification failed (token fallback).');
  }

  return true;
}
