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

function normalizeLessonFieldKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLessonField(lesson, logicalName, aliases) {
  if (!lesson) return '';

  var names = [logicalName].concat(aliases || []).filter(function (name) { return !!name; });
  for (var i = 0; i < names.length; i++) {
    if (lesson[names[i]] !== undefined && lesson[names[i]] !== null && String(lesson[names[i]]) !== '') {
      return String(lesson[names[i]]);
    }
  }

  var normalized = {};
  Object.keys(lesson).forEach(function (key) {
    normalized[normalizeLessonFieldKey(key)] = lesson[key];
  });

  for (var j = 0; j < names.length; j++) {
    var value = normalized[normalizeLessonFieldKey(names[j])];
    if (value !== undefined && value !== null && String(value) !== '') {
      return String(value);
    }
  }

  return '';
}

function slackMarkdownSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function appendLessonSection(lines, title, value) {
  var text = String(value || '').trim();
  if (!text) return;
  lines.push('');
  lines.push('*' + title + '*');
  lines.push(slackMarkdownSafe(text));
}

function formatLessonContentForSlack(lesson, options) {
  var opts = options || {};
  var heading = opts.heading || '*Lesson*';
  if (!lesson) return heading + '\nNo lesson available.';

  var lessonId = getLessonField(lesson, 'LessonID', ['Lesson ID']);
  var topic = getLessonField(lesson, 'Topic', ['Title']);
  var moduleId = getLessonField(lesson, 'Module', ['ModuleID', 'Module ID']);

  var lines = [heading];
  if (lessonId) lines.push('*ID:* `' + slackMarkdownSafe(lessonId) + '`');
  lines.push('*Topic:* ' + (topic ? slackMarkdownSafe(topic) : 'Untitled'));
  if (moduleId) lines.push('*Module:* `' + slackMarkdownSafe(moduleId) + '`');

  appendLessonSection(lines, 'Hook', getLessonField(lesson, 'Hook'));
  appendLessonSection(lines, 'Core Content', getLessonField(lesson, 'Core Content', ['CoreContent', 'Content']));
  appendLessonSection(lines, 'Mission', getLessonField(lesson, 'Mission Description', ['Mission', 'MissionDescription']));
  appendLessonSection(lines, 'Verification Question', getLessonField(lesson, 'Verification Question', ['VerificationQuestion']));
  appendLessonSection(lines, 'Insight', getLessonField(lesson, 'Insight'));
  appendLessonSection(lines, 'Takeaway', getLessonField(lesson, 'Takeaway'));
  appendLessonSection(lines, 'Slack Thread Text', getLessonField(lesson, 'Slack Thread Text', ['SlackThreadText']));
  appendLessonSection(lines, 'Objective', getLessonField(lesson, 'Objective'));
  appendLessonSection(lines, 'Due', getLessonField(lesson, 'DueDate', ['Due Date']));

  return lines.join('\n');
}

function lessonToSlackText(lesson) {
  var lessonId = getLessonField(lesson, 'LessonID', ['Lesson ID']);
  return formatLessonContentForSlack(lesson, {
    heading: lessonId ? '*Lesson ' + slackMarkdownSafe(lessonId) + '*' : '*Lesson*'
  });
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
