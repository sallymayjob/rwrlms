/** Logging helpers for auditing and diagnostics. */

function ensureLogsSheet() {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.LOGS);
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.LOGS);
  sheet.appendRow(['Timestamp', 'Level', 'EventType', 'UserID', 'Command', 'Message', 'ContextJSON']);
  return sheet;
}

function appendLogRow(rowObj) {
  try {
    var sheet = ensureLogsSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
    sheet.appendRow(row);
  } catch (error) {
    Logger.log('Failed to write log row: ' + error);
  }
}

function logEvent(eventType, message, context) {
  appendLogRow({
    Timestamp: nowISO(),
    Level: 'INFO',
    EventType: eventType,
    UserID: (context && context.userId) || '',
    Command: (context && context.command) || '',
    Message: message || '',
    ContextJSON: JSON.stringify(context || {})
  });
}

function logError(eventType, error, context) {
  appendLogRow({
    Timestamp: nowISO(),
    Level: 'ERROR',
    EventType: eventType,
    UserID: (context && context.userId) || '',
    Command: (context && context.command) || '',
    Message: String(error && error.message ? error.message : error),
    ContextJSON: JSON.stringify({
      stack: error && error.stack,
      extra: context || {}
    })
  });
}

function logSlackRequest(payload) {
  logEvent('SLACK_REQUEST', 'Incoming slash command', {
    userId: payload.user_id,
    command: payload.command,
    channel: payload.channel_id,
    text: payload.text
  });
}
