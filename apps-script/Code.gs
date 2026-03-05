/**
 * Main HTTP entry points.
 */

function doPost(e) {
  return withErrorGuard('doPost', function () {
    verifySlackRequest(e);

    var rawBody = e.postData && e.postData.contents;
    var payload = parseFormEncoded(rawBody);

    // URL verification or malformed payload fallback
    if (!payload || !payload.command) {
      return slackEphemeral('Invalid Slack request payload.');
    }

    logSlackRequest(payload);
    return routeCommand(payload);
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Agentic LMS', timestamp: nowISO() }))
    .setMimeType(ContentService.MimeType.JSON);
}
