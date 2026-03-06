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

  // 1) Apps Script parsed parameter path (covers some webhook/content-type variants).
  if (e && e.parameter && e.parameter.challenge) {
    return String(e.parameter.challenge);
  }

  // 2) Primary path: Events API URL verification payload is JSON.
  var parsed = safeJsonParse(rawBody, null);
  if (parsed && parsed.type === 'url_verification' && parsed.challenge) {
    return String(parsed.challenge);
  }

  // 3) Fallback path: tolerate form-encoded challenge payloads.
  var form = parseFormEncoded(rawBody);
  if (form && form.challenge) {
    return String(form.challenge);
  }

  // 4) Last-resort body sniffing for malformed/atypical payload wrappers.
  var match = String(rawBody).match(/"challenge"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return String(match[1]);
  }

  return '';
}


function detectRequestKind(payload) {
  if (payload && payload.command) return 'slash_command';
  if (isWorkflowTriggerPayload(payload)) return 'workflow_trigger';
  if (payload && payload.payload && payload.payload.type) return 'interactive';
  if (payload && payload.event) return 'event';
  return 'unknown';
}

function doPost(e) {
  // Always prioritize Slack Events URL verification with a minimal fast-path response.
  // This avoids handshake timeout issues caused by downstream auth/logging/parsing errors.
  var challenge = extractSlackChallenge(e);
  if (challenge) {
    // Slack URL verification expects the raw challenge string in the response body.
    return ContentService
      .createTextOutput(challenge)
      .setMimeType(ContentService.MimeType.TEXT);
  }

  return withErrorGuard('doPost', function () {
    var envelope = parseSlackRequestEnvelope(e);
    var payload = envelope.data || {};

    var requestKind = detectRequestKind(payload);

    if (requestKind === 'slash_command' || requestKind === 'interactive' || requestKind === 'event') {
      verifySlackRequest(e, envelope);
    }

    if (requestKind === 'slash_command') {
      logSlackRequest(payload);
      return routeCommand(payload);
    }

    if (requestKind === 'workflow_trigger') {
      return routeWorkflow(payload);
    }

    if (requestKind === 'interactive') {
      logEvent('SLACK_INTERACTIVE', 'Interactive payload received', {
        userId: payload.payload.user && payload.payload.user.id,
        actionType: payload.payload.type
      });
      return routeInteractive(payload.payload);
    }

    if (requestKind === 'event') {
      logEvent('SLACK_EVENT', 'Event payload received', {
        type: payload.event.type,
        userId: payload.event.user
      });
      return slackEphemeral('Event received.');
    }

    return slackEphemeral('Unsupported payload type.');
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Agentic LMS', timestamp: nowISO() }))
    .setMimeType(ContentService.MimeType.JSON);
}
