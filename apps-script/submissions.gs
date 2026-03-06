/** Submission and achievement handlers. */

var SUBMISSION_IDEMPOTENCY_BUCKET_MINUTES = 5;

function getSubmissionTimeBucket(minutes) {
  var bucketMinutes = toNumber(minutes, SUBMISSION_IDEMPOTENCY_BUCKET_MINUTES);
  if (bucketMinutes <= 0) bucketMinutes = SUBMISSION_IDEMPOTENCY_BUCKET_MINUTES;

  var now = new Date();
  var ms = now.getTime();
  var bucketMs = bucketMinutes * 60 * 1000;
  var bucketStart = Math.floor(ms / bucketMs) * bucketMs;
  return new Date(bucketStart).toISOString();
}

function buildSubmissionIdempotencyKey(payload, userId, lessonId, status) {
  var requestId = payload && (payload.request_id || payload.trigger_id || payload.api_app_id || payload.response_url || '');
  if (requestId) {
    return ['submit', 'req', requestId].join(':');
  }

  var bucket = getSubmissionTimeBucket(SUBMISSION_IDEMPOTENCY_BUCKET_MINUTES);
  return ['submit', userId || '', lessonId || '', status || '', bucket].join(':');
}

function processSubmissionOnce(payload, learner, lessonId, status, score, method) {
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    var key = buildSubmissionIdempotencyKey(payload, learner.UserID, lessonId, status);
    var existing = readIdempotencyEntryByKey(key);
    if (existing) {
      logEvent('SUBMISSION_DUPLICATE_SUPPRESSED', 'Duplicate submission suppressed', {
        userId: learner.UserID,
        command: payload && payload.command,
        lessonId: lessonId,
        status: status,
        idempotencyKey: key
      });

      return {
        duplicateSuppressed: true,
        idempotencyKey: key,
        progressUpdate: null
      };
    }

    recordSubmission(learner.UserID, lessonId, status, score, method);
    var update = updateLearnerAfterSubmission(learner, lessonId);

    appendIdempotencyEntry({
      Key: key,
      CreatedAt: nowISO(),
      State: 'processed',
      UserID: learner.UserID,
      LessonID: lessonId,
      Status: status,
      RequestID: payload && (payload.request_id || payload.trigger_id || ''),
      ContextJSON: JSON.stringify({
        command: payload && payload.command,
        responseUrl: payload && payload.response_url,
        method: method || 'slash_command'
      })
    });

    return {
      duplicateSuppressed: false,
      idempotencyKey: key,
      progressUpdate: update
    };
  } finally {
    lock.releaseLock();
  }
}

function parseSubmitText(text) {
  var parts = normalizeWhitespace(text).split(' ');
  return {
    lessonId: parts[0] || '',
    status: (parts[1] || '').toLowerCase()
  };
}

function recordSubmission(userId, lessonId, status, score, method) {
  appendRow(CONFIG.SHEET_NAMES.SUBMISSIONS, {
    SubmissionID: makeId('S'),
    UserID: userId,
    LessonID: lessonId,
    Timestamp: nowISO(),
    Score: score,
    Status: status,
    Method: method || 'slash_command'
  });
}

function updateLearnerAfterSubmission(learner, lessonId) {
  var newProgress = Math.min(100, toNumber(learner.Progress, 0) + CONFIG.DEFAULT_PROGRESS_INCREMENT);
  var currentModule = learner.CurrentModule || '';

  var nextInModule = getNextPendingLesson(learner.UserID, learner.CourseID, currentModule);
  var nextModule = currentModule;
  if (!nextInModule) {
    nextModule = getNextModuleWithPendingLessons(learner.UserID, learner.CourseID, currentModule) || currentModule;
  }

  var hasRemaining = !!getNextModuleWithPendingLessons(learner.UserID, learner.CourseID, nextModule);
  if (!hasRemaining) {
    newProgress = 100;
  }

  var newStatus = hasRemaining ? 'active' : 'completed';

  updateRowByField(CONFIG.SHEET_NAMES.LEARNERS, 'UserID', learner.UserID, {
    CurrentModule: nextModule,
    Progress: newProgress,
    Status: newStatus
  });

  return { nextModule: nextModule, progress: newProgress, status: newStatus };
}

function quizAgent(payload) {
  return withErrorGuard('quizAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');

    var parsed = parseSubmitText(payload.text);
    if (!CONFIG.LESSON_ID_REGEX.test(parsed.lessonId)) {
      return slackEphemeral('Usage: `/submit M03-W02-L04 complete`');
    }
    if (['complete', 'pass', 'done'].indexOf(parsed.status) < 0) {
      return slackEphemeral('Second argument must be `complete` (or pass/done).');
    }

    var lesson = getLessonById(parsed.lessonId);
    if (!lesson) return slackEphemeral('Lesson `' + parsed.lessonId + '` not found.');

    var result = processSubmissionOnce(payload, learner, parsed.lessonId, 'complete', 100, 'slash_command');

    if (result.duplicateSuppressed) {
      return slackEphemeral('✅ Duplicate submission suppressed for `' + parsed.lessonId + '`.' +
        '\nYour previous submission was already processed.');
    }

    var update = result.progressUpdate;

    logEvent('SUBMIT', 'Submission recorded', {
      userId: payload.user_id,
      command: payload.command,
      lessonId: parsed.lessonId,
      progress: update.progress,
      idempotencyKey: result.idempotencyKey
    });

    return slackEphemeral('✅ Submission saved for `' + parsed.lessonId + '`.' +
      '\nProgress: ' + update.progress + '%.' +
      '\nCurrent module: `' + (update.nextModule || 'N/A') + '`.' +
      '\nUse `/learn` to continue.');
  });
}

function certAgent(payload) {
  return withErrorGuard('certAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');

    var progress = toNumber(learner.Progress, 0);
    if (progress >= CONFIG.CERT_MIN_PROGRESS) {
      return slackEphemeral('🏆 You are certificate-eligible for `' + learner.CourseID + '`!');
    }

    return slackEphemeral('Certificate locked. Current progress: ' + progress + '%. Reach 100% to unlock.');
  });
}

function reportingAgent(payload) {
  return withErrorGuard('reportingAgent', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    var submissions = readTable(CONFIG.SHEET_NAMES.SUBMISSIONS);
    var active = learners.filter(function (l) { return String(l.Status).toLowerCase() === 'active'; }).length;
    var completed = learners.filter(function (l) { return String(l.Status).toLowerCase() === 'completed'; }).length;

    var lines = [
      '*LMS Report*',
      'Learners: ' + learners.length,
      'Active Learners: ' + active,
      'Completed Learners: ' + completed,
      'Submissions: ' + submissions.length
    ];
    return slackEphemeral(lines.join('\n'));
  });
}
