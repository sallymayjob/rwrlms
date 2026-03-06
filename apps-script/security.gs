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

function getAdminUserIds() {
  var raw = getOptionalScriptProperty(CONFIG.PROPERTIES.ADMIN_USER_IDS, '');
  if (!raw) return [];

  return raw.split(',').map(function (id) {
    return normalizeWhitespace(id);
  }).filter(function (id) {
    return !!id;
  });
}

function isAdminUser(userId) {
  var normalizedUserId = normalizeWhitespace(userId);
  if (!normalizedUserId) return false;

  var adminIds = getAdminUserIds();
  return adminIds.indexOf(normalizedUserId) >= 0;
}

function enforceAdminAccess(payload, handlerName, actionDescription) {
  var userId = payload && payload.user_id;
  var command = payload && payload.command;
  var action = actionDescription || (handlerName || 'admin_action');

  if (!isAdminUser(userId)) {
    logEvent('ADMIN_ACCESS_DENIED', 'Non-admin attempted admin action', {
      userId: userId,
      command: command,
      handler: handlerName || '',
      action: action
    });
    return slackEphemeral('🚫 You are not authorized to run `' + (command || action) + '`. Contact an admin if you need access.');
  }

  logEvent('ADMIN_ACCESS_GRANTED', 'Admin authorized for admin action', {
    userId: userId,
    command: command,
    handler: handlerName || '',
    action: action
  });

  return null;
}

