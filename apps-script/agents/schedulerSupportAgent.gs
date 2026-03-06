/** Pure scheduler planning helpers. */

function buildDailyLessonReminders(learners, resolveLessonFn) {
  var out = [];
  (learners || []).forEach(function (learner) {
    if (!learner || getLearnerStatus(learner, '').toLowerCase() !== 'active') return;
    if (!getLearnerCourseId(learner)) return;

    var lesson = resolveLessonFn(learner);
    if (!lesson) return;

    out.push({
      userId: getLearnerIdValue(learner),
      lessonId: readLogicalValue(lesson, CONFIG.SHEET_NAMES.LESSONS, 'lessonId', ''),
      message: '📘 Daily Lesson Reminder\n' + formatLessonCardForSlack(lesson, { heading: '*Next Lesson*' })
    });
  });

  return out;
}

function buildLeaderboardLines(learners, limit) {
  var max = toNumber(limit, 10);
  var ranked = (learners || [])
    .slice()
    .sort(function (a, b) { return getLearnerProgressPercent(b) - getLearnerProgressPercent(a); })
    .slice(0, max);

  var lines = ['🏁 *Weekly Leaderboard*'];
  ranked.forEach(function (learner, i) {
    lines.push((i + 1) + '. <@' + getLearnerIdValue(learner) + '> — ' + getLearnerProgressPercent(learner) + '%');
  });
  return lines;
}
