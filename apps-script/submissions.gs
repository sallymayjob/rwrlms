/** Submission and achievement handlers. */

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

    recordSubmission(payload.user_id, parsed.lessonId, 'complete', 100, 'slash_command');
    var update = updateLearnerAfterSubmission(learner, parsed.lessonId);

    logEvent('SUBMIT', 'Submission recorded', {
      userId: payload.user_id,
      command: payload.command,
      lessonId: parsed.lessonId,
      progress: update.progress
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
