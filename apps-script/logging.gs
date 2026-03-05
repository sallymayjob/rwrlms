/** Logging helpers for auditing and diagnostics. */

function logEvent(eventType, message, context) {
  appendRow(CONFIG.SHEET_NAMES.LOGS, {
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
  appendRow(CONFIG.SHEET_NAMES.LOGS, {
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
