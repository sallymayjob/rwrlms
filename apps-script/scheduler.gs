/** Scheduled jobs for nudges and reporting. */

function sendDailyLesson() {
  return withErrorGuard('sendDailyLesson', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS)
      .filter(function (l) {
        return l.Status === 'active' && l.CourseID;
      });

    var count = 0;
    learners.forEach(function (learner) {
      try {
        var currentModule = learner.CurrentModule || (getFirstModuleForCourse(learner.CourseID) || {}).ModuleID;
        var lesson = getNextPendingLesson(learner.UserID, learner.CourseID, currentModule);
        if (!lesson) return;

        postSlackMessage(learner.UserID, '📘 Daily Lesson Reminder\n' + lessonToSlackText(lesson));
        count++;
      } catch (error) {
        logError('DAILY_LESSON_DM', error, { userId: learner.UserID });
      }
    });

    logEvent('SCHEDULE_DAILY', 'Daily lesson reminders sent', { count: count });
  });
}

function weeklyLeaderboard() {
  return withErrorGuard('weeklyLeaderboard', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS)
      .sort(function (a, b) { return toNumber(b.Progress, 0) - toNumber(a.Progress, 0); })
      .slice(0, 10);

    var lines = ['🏁 *Weekly Leaderboard*'];
    learners.forEach(function (l, i) {
      lines.push((i + 1) + '. <@' + l.UserID + '> — ' + l.Progress + '%');
    });

    // Replace with your team channel ID.
    var channelId = getOptionalScriptProperty('LEADERBOARD_CHANNEL_ID', 'C00000000');
    postSlackMessage(channelId, lines.join('\n'));
    logEvent('SCHEDULE_LEADERBOARD', 'Weekly leaderboard sent', { channel: channelId });
  });
}

function progressReport() {
  return withErrorGuard('progressReport', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    var avg = 0;
    if (learners.length) {
      var total = learners.reduce(function (sum, l) { return sum + toNumber(l.Progress, 0); }, 0);
      avg = Math.round(total / learners.length);
    }

    logEvent('SCHEDULE_PROGRESS_REPORT', 'Weekly progress summary', {
      learners: learners.length,
      averageProgress: avg
    });
  });
}
