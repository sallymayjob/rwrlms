/** Scheduled starters and auditable operations for nudges and reporting. */

var SCHEDULER_STATE_PROPERTY = 'SCHEDULER_OPERATION_STATE';
var SCHEDULER_FAILURE_ESCALATION_THRESHOLD = 3;

function sendDailyLesson() {
  return startScheduledOperation('daily_lesson_reminders', runDailyLessonOperation);
}

function weeklyLeaderboard() {
  return startScheduledOperation('weekly_leaderboard_publish', runWeeklyLeaderboardOperation);
}

function progressReport() {
  return startScheduledOperation('weekly_progress_report', runWeeklyProgressReportOperation);
}

function startScheduledOperation(operationName, operationFn) {
  var operationId = makeId('sched');
  var startedAt = nowISO();
  var actionLinks = buildSchedulerActionLinks(operationName, operationId);

  logEvent('SCHEDULE_STARTER_TRIGGERED', 'Starter triggered scheduled operation', {
    operation: operationName,
    operationId: operationId,
    startedAt: startedAt,
    actionLinks: actionLinks
  });

  notifySchedulerStatus('▶️ Scheduled operation started', operationName, operationId, actionLinks);

  try {
    var result = operationFn({ operationName: operationName, operationId: operationId, actionLinks: actionLinks }) || {};
    recordSchedulerOperationSuccess(operationName, operationId, startedAt, result);
    notifySchedulerStatus('✅ Scheduled operation completed', operationName, operationId, actionLinks, result);
    return result;
  } catch (error) {
    var escalation = recordSchedulerOperationFailure(operationName, operationId, startedAt, error);
    notifySchedulerFailure(operationName, operationId, actionLinks, error, escalation);
    return null;
  }
}

function runDailyLessonOperation(meta) {
  var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS)
    .filter(function (l) {
      return getLearnerStatus(l, '').toLowerCase() === 'active' && getLearnerCourseId(l);
    });

  var sentCount = 0;
  var failedCount = 0;
  learners.forEach(function (learner) {
    try {
      var learnerId = getLearnerIdValue(learner);
      var courseId = getLearnerCourseId(learner);
      var currentModule = getLearnerCurrentModule(learner) ||
        readLogicalValue(getFirstModuleForCourse(courseId) || {}, CONFIG.SHEET_NAMES.MODULES, 'moduleId', '');
      var lesson = getNextPendingLesson(learnerId, courseId, currentModule);
      if (!lesson) return;

      postSlackMessage(learnerId, '📘 Daily Lesson Reminder\n' + lessonToSlackText(lesson));
      sentCount++;
    } catch (error) {
      failedCount++;
      logError('DAILY_LESSON_DM', error, {
        userId: getLearnerIdValue(learner),
        operationId: meta.operationId,
        operation: meta.operationName
      });
    }
  });

  logEvent('SCHEDULE_DAILY_OPERATION', 'Daily lesson reminders processed', {
    operation: meta.operationName,
    operationId: meta.operationId,
    learnersConsidered: learners.length,
    remindersSent: sentCount,
    learnerFailures: failedCount
  });

  return {
    learnersConsidered: learners.length,
    remindersSent: sentCount,
    learnerFailures: failedCount
  };
}

function runWeeklyLeaderboardOperation(meta) {
  var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS)
    .sort(function (a, b) { return getLearnerProgressPercent(b) - getLearnerProgressPercent(a); })
    .slice(0, 10);

  var lines = ['🏁 *Weekly Leaderboard*'];
  learners.forEach(function (l, i) {
    lines.push((i + 1) + '. <@' + getLearnerIdValue(l) + '> — ' + getLearnerProgressPercent(l) + '%');
  });

  var channelId = getLeaderboardChannelId();
  postSlackMessage(channelId, lines.join('\n'));

  logEvent('SCHEDULE_LEADERBOARD_OPERATION', 'Weekly leaderboard sent', {
    operation: meta.operationName,
    operationId: meta.operationId,
    channel: channelId,
    participants: learners.length
  });

  return {
    channel: channelId,
    participants: learners.length
  };
}

function runWeeklyProgressReportOperation(meta) {
  var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS) || [];
  var avg = 0;
  if (learners.length) {
    var total = learners.reduce(function (sum, l) { return sum + getLearnerProgressPercent(l); }, 0);
    avg = Math.round(total / learners.length);
  }

  logEvent('SCHEDULE_PROGRESS_REPORT_OPERATION', 'Weekly progress summary', {
    operation: meta.operationName,
    operationId: meta.operationId,
    learners: learners.length,
    averageProgress: avg
  });

  var metricsSummary = emitWeeklySchedulerMetrics(meta);

  return {
    learners: learners.length,
    averageProgress: avg,
    schedulerMetrics: metricsSummary
  };
}

function getLeaderboardChannelId() {
  return getScriptProperty('LEADERBOARD_CHANNEL_ID');
}

function buildSchedulerActionLinks(operationName, operationId) {
  var spreadsheet = getSpreadsheet();
  var logsSheet = ensureLogsSheet();
  var links = {
    logs: 'https://docs.google.com/spreadsheets/d/' + spreadsheet.getId() + '/edit#gid=' + logsSheet.getSheetId(),
    operation: operationName,
    operationId: operationId
  };

  var runbookUrl = getOptionalScriptProperty('SCHEDULER_RUNBOOK_URL', '');
  if (runbookUrl) links.runbook = runbookUrl;

  return links;
}

function notifySchedulerStatus(prefix, operationName, operationId, actionLinks, details) {
  var channelId = getLeaderboardChannelId();
  var text = [
    prefix,
    '*Operation:* `' + operationName + '`',
    '*Operation ID:* `' + operationId + '`',
    '*Logs:* ' + actionLinks.logs
  ];

  if (actionLinks.runbook) {
    text.push('*Runbook:* ' + actionLinks.runbook);
  }

  if (details) {
    text.push('*Details:* ```' + JSON.stringify(details) + '```');
  }

  postSlackMessage(channelId, text.join('\n'));
}

function notifySchedulerFailure(operationName, operationId, actionLinks, error, escalation) {
  var channelId = getLeaderboardChannelId();
  var message = [
    escalation.escalated ? '🚨 *Escalation:* repeated scheduler failure' : '❌ Scheduled operation failed',
    '*Operation:* `' + operationName + '`',
    '*Operation ID:* `' + operationId + '`',
    '*Consecutive failures:* ' + escalation.consecutiveFailures,
    '*Error:* ' + String(error && error.message ? error.message : error),
    '*Logs:* ' + actionLinks.logs
  ];

  if (actionLinks.runbook) {
    message.push('*Runbook:* ' + actionLinks.runbook);
  }

  postSlackMessage(channelId, message.join('\n'));
}

function loadSchedulerState() {
  var raw = getOptionalScriptProperty(SCHEDULER_STATE_PROPERTY, '');
  var parsed = safeJsonParse(raw, null);
  if (parsed && parsed.operations && parsed.weekly) {
    return parsed;
  }

  return {
    operations: {},
    weekly: {
      startedAt: nowISO(),
      runs: 0,
      successes: 0,
      failures: 0,
      escalations: 0
    }
  };
}

function saveSchedulerState(state) {
  PropertiesService.getScriptProperties().setProperty(SCHEDULER_STATE_PROPERTY, JSON.stringify(state));
}

function recordSchedulerOperationSuccess(operationName, operationId, startedAt, result) {
  var state = loadSchedulerState();
  var operation = state.operations[operationName] || {};

  operation.consecutiveFailures = 0;
  operation.totalSuccesses = toNumber(operation.totalSuccesses, 0) + 1;
  operation.lastSuccessAt = nowISO();
  operation.lastOperationId = operationId;

  state.operations[operationName] = operation;
  state.weekly.runs = toNumber(state.weekly.runs, 0) + 1;
  state.weekly.successes = toNumber(state.weekly.successes, 0) + 1;
  saveSchedulerState(state);

  logEvent('SCHEDULE_OPERATION_SUCCESS', 'Scheduled operation succeeded', {
    operation: operationName,
    operationId: operationId,
    startedAt: startedAt,
    finishedAt: nowISO(),
    result: result,
    counters: operation
  });
}

function recordSchedulerOperationFailure(operationName, operationId, startedAt, error) {
  var state = loadSchedulerState();
  var operation = state.operations[operationName] || {};

  operation.consecutiveFailures = toNumber(operation.consecutiveFailures, 0) + 1;
  operation.totalFailures = toNumber(operation.totalFailures, 0) + 1;
  operation.lastFailureAt = nowISO();
  operation.lastOperationId = operationId;

  state.operations[operationName] = operation;
  state.weekly.runs = toNumber(state.weekly.runs, 0) + 1;
  state.weekly.failures = toNumber(state.weekly.failures, 0) + 1;

  var escalated = operation.consecutiveFailures >= SCHEDULER_FAILURE_ESCALATION_THRESHOLD;
  if (escalated) {
    state.weekly.escalations = toNumber(state.weekly.escalations, 0) + 1;
  }

  saveSchedulerState(state);

  logError('SCHEDULE_OPERATION_FAILURE', error, {
    operation: operationName,
    operationId: operationId,
    startedAt: startedAt,
    finishedAt: nowISO(),
    consecutiveFailures: operation.consecutiveFailures,
    totalFailures: operation.totalFailures,
    escalated: escalated
  });

  return {
    escalated: escalated,
    consecutiveFailures: operation.consecutiveFailures
  };
}

function emitWeeklySchedulerMetrics(meta) {
  var state = loadSchedulerState();
  var summary = {
    periodStartedAt: state.weekly.startedAt,
    periodEndedAt: nowISO(),
    runs: toNumber(state.weekly.runs, 0),
    successes: toNumber(state.weekly.successes, 0),
    failures: toNumber(state.weekly.failures, 0),
    escalations: toNumber(state.weekly.escalations, 0),
    operations: state.operations
  };

  logEvent('SCHEDULE_WEEKLY_METRICS', 'Weekly scheduler metrics summary', {
    operation: meta.operationName,
    operationId: meta.operationId,
    summary: summary
  });

  notifySchedulerStatus('📊 Weekly scheduler metrics', meta.operationName, meta.operationId, meta.actionLinks, summary);

  state.weekly = {
    startedAt: nowISO(),
    runs: 0,
    successes: 0,
    failures: 0,
    escalations: 0
  };
  saveSchedulerState(state);

  return summary;
}
