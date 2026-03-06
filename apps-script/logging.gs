/** Logging helpers for auditing and diagnostics. */

var LOGS_CANONICAL_HEADERS = ['Timestamp', 'Level', 'EventType', 'UserID', 'Command', 'Message', 'ContextJSON'];

/**
 * Header aliases used for migration notes and header normalization guidance.
 *
 * Deprecated -> canonical:
 * - CourseID      -> EnrollmentCourseID
 * - CurrentModule -> ActiveModuleID
 * - Progress      -> CompletionPercent
 * - UserID        -> SlackUserID
 * - CoreContent   -> Explanation
 * - Mission       -> PracticeTask
 */
var CANONICAL_HEADER_ALIASES = {
  courseid: 'EnrollmentCourseID',
  currentmodule: 'ActiveModuleID',
  progress: 'CompletionPercent',
  userid: 'SlackUserID',
  corecontent: 'Explanation',
  mission: 'PracticeTask'
};

function normalizeHeaderToken(header) {
  return String(header || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeObjectKeys(input) {
  var normalized = {};
  Object.keys(input || {}).forEach(function (key) {
    normalized[normalizeHeaderToken(key)] = input[key];
  });
  return normalized;
}

function ensureLogsSheet() {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.LOGS);
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.LOGS);
  sheet.appendRow(LOGS_CANONICAL_HEADERS);
  return sheet;
}

function appendLogRow(rowObj) {
  try {
    var sheet = ensureLogsSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (header) {
      return normalizeWhitespace(header);
    });
    var normalizedRow = normalizeObjectKeys(rowObj || {});
    var row = headers.map(function (header) {
      var token = normalizeHeaderToken(header);
      if (normalizedRow[token] !== undefined) return normalizedRow[token];

      var migratedCanonical = CANONICAL_HEADER_ALIASES[token];
      if (migratedCanonical) {
        var migratedToken = normalizeHeaderToken(migratedCanonical);
        if (normalizedRow[migratedToken] !== undefined) return normalizedRow[migratedToken];
      }

      return '';
    });
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

function getWorkflowLogContext(request, extra) {
  var base = {
    triggerId: request && (request.triggerId || request.trigger_id),
    triggerType: request && (request.triggerType || request.type || request.request_type),
    action: request && request.action,
    sheetName: request && request.sheetName
  };

  var merged = {};
  Object.keys(base).forEach(function (key) {
    if (base[key] !== undefined && base[key] !== null && base[key] !== '') {
      merged[key] = base[key];
    }
  });

  Object.keys(extra || {}).forEach(function (key) {
    merged[key] = extra[key];
  });

  return merged;
}

function logWorkflowTriggerStart(request) {
  logEvent('WORKFLOW_TRIGGER_START', 'Workflow trigger started', getWorkflowLogContext(request));
}

function logWorkflowTriggerEnd(request, extra) {
  logEvent('WORKFLOW_TRIGGER_END', 'Workflow trigger finished', getWorkflowLogContext(request, extra));
}

function logWorkflowQueryAction(request, extra) {
  logEvent('WORKFLOW_QUERY_ACTION', 'Workflow query action', getWorkflowLogContext(request, extra));
}

function logWorkflowFailure(request, reason, extra) {
  var error = reason;
  if (!(reason instanceof Error)) {
    error = new Error(String(reason || 'Unknown workflow failure'));
  }

  logError('WORKFLOW_FAILURE', error, getWorkflowLogContext(request, extra));
}
