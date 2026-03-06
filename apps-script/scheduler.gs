/** Scheduled jobs for nudges and reporting. */

function sendDailyLesson() {
  return withErrorGuard('sendDailyLesson', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    var reminders = buildDailyLessonReminders(learners, function (learner) {
      var currentModule = learner.CurrentModule || (getFirstModuleForCourse(learner.CourseID) || {}).ModuleID;
      return getNextPendingLesson(learner.UserID, learner.CourseID, currentModule);
    });

    reminders.forEach(function (reminder) {
      try {
        postSlackMessage(reminder.userId, reminder.message);
      } catch (error) {
        logError('DAILY_LESSON_DM', error, { userId: reminder.userId });
      }
    });

    logEvent('SCHEDULE_DAILY', 'Daily lesson reminders sent', { count: reminders.length });
  });
}

function weeklyLeaderboard() {
  return withErrorGuard('weeklyLeaderboard', function () {
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    var lines = buildLeaderboardLines(learners, 10);

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
