/**
 * Main HTTP entry points.
 */

function parseSlackRequestEnvelope(e) {
  var rawBody = (e && e.postData && e.postData.contents) || '';
  var contentType = (e && e.postData && e.postData.type) || '';
  var data = {};

  if (contentType.indexOf('application/json') >= 0) {
    data = safeJsonParse(rawBody, {});
  } else {
    data = parseFormEncoded(rawBody);

    // Interactive payloads arrive as x-www-form-urlencoded with a JSON string in `payload`.
    if (data.payload) {
      data.payload = safeJsonParse(data.payload, {});
    }
  }

  return {
    rawBody: rawBody,
    contentType: contentType,
    data: data
  };
}

function extractSlackChallenge(e) {
  var rawBody = (e && e.postData && e.postData.contents) || '';

  // Primary path: Events API URL verification payload is JSON.
  var parsed = safeJsonParse(rawBody, null);
  if (parsed && parsed.type === 'url_verification' && parsed.challenge) {
    return String(parsed.challenge);
  }

  // Fallback path: tolerate form-encoded challenge payloads.
  var form = parseFormEncoded(rawBody);
  if (form && form.challenge) {
    return String(form.challenge);
  }

  return '';
}

function doPost(e) {
  // Always prioritize Slack Events URL verification with a minimal fast-path response.
  // This avoids handshake timeout issues caused by downstream auth/logging/parsing errors.
  var challenge = extractSlackChallenge(e);
  if (challenge) {
    return ContentService
      .createTextOutput(JSON.stringify({ challenge: challenge }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return withErrorGuard('doPost', function () {
    var envelope = parseSlackRequestEnvelope(e);
    var payload = envelope.data || {};

    verifySlackRequest(e, envelope);

    // Slash commands.
    if (payload.command) {
      logSlackRequest(payload);
      return routeCommand(payload);
    }

    // Interactive payloads.
    if (payload.payload && payload.payload.type) {
      logEvent('SLACK_INTERACTIVE', 'Interactive payload received', {
        userId: payload.payload.user && payload.payload.user.id,
        actionType: payload.payload.type
      });
      return routeInteractive(payload.payload);
    }

    // Events API payloads.
    if (payload.event) {
      logEvent('SLACK_EVENT', 'Event payload received', {
        type: payload.event.type,
        userId: payload.event.user
      });
      return slackEphemeral('Event received.');
    }

    return slackEphemeral('Unsupported Slack payload type.');
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Agentic LMS', timestamp: nowISO() }))
    .setMimeType(ContentService.MimeType.JSON);
}
