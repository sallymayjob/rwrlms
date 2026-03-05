/** Slack request authentication and anti-replay checks. */

function verifySlackRequest(e) {
  const headers = (e && e.headers) || {};
  const signature = headers['X-Slack-Signature'] || headers['x-slack-signature'];
  const timestamp = headers['X-Slack-Request-Timestamp'] || headers['x-slack-request-timestamp'];
  const rawBody = (e && e.postData && e.postData.contents) || '';

  if (!signature || !timestamp || !rawBody) {
    throw new Error('Missing Slack auth headers or payload body.');
  }

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
