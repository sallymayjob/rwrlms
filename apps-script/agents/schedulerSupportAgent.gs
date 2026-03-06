/** Pure scheduler planning helpers. */

function buildDailyLessonReminders(learners, resolveLessonFn) {
  var out = [];
  (learners || []).forEach(function (learner) {
    if (!learner || String(learner.Status).toLowerCase() !== 'active') return;
    if (!learner.CourseID) return;

    var lesson = resolveLessonFn(learner);
    if (!lesson) return;

    out.push({
      userId: learner.UserID,
      lessonId: lesson.LessonID,
      message: '📘 Daily Lesson Reminder\n' + formatLessonCardForSlack(lesson, { heading: '*Next Lesson*' })
    });
  });

  return out;
}

function buildLeaderboardLines(learners, limit) {
  var max = toNumber(limit, 10);
  var ranked = (learners || [])
    .slice()
    .sort(function (a, b) { return toNumber(b.Progress, 0) - toNumber(a.Progress, 0); })
    .slice(0, max);

  var lines = ['🏁 *Weekly Leaderboard*'];
  ranked.forEach(function (learner, i) {
    lines.push((i + 1) + '. <@' + learner.UserID + '> — ' + learner.Progress + '%');
  });
  return lines;
}
