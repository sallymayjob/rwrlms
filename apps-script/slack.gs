/** Slack formatting and outbound messaging helpers. */

function slackEphemeral(text) {
  return ContentService
    .createTextOutput(JSON.stringify({ response_type: 'ephemeral', text: text }))
    .setMimeType(ContentService.MimeType.JSON);
}

function slackInChannel(text) {
  return ContentService
    .createTextOutput(JSON.stringify({ response_type: 'in_channel', text: text }))
    .setMimeType(ContentService.MimeType.JSON);
}

function lessonToSlackText(lesson) {
  return [
    '*Lesson ' + lesson.LessonID + '*',
    '',
    '*Topic:* ' + lesson.Topic,
    '',
    '*Hook*',
    lesson.Hook,
    '',
    '*Core Content*',
    lesson.CoreContent,
    '',
    '*Insight*',
    lesson.Insight,
    '',
    '*Takeaway*',
    lesson.Takeaway,
    '',
    '*Mission*',
    lesson.Mission
  ].join('\n');
}

function postSlackMessage(channel, text) {
  const token = getScriptProperty(CONFIG.PROPERTIES.BOT_TOKEN);
  const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ channel: channel, text: text })
  });

  const body = safeJsonParse(response.getContentText(), {});
  if (!body.ok) {
    throw new Error('Slack API error: ' + body.error);
  }
  return body;
}
