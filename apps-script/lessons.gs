/** Lesson retrieval and learning agents. */


function getCourseMonths(courseId) {
  if (!courseId) return [];
  return readTable(CONFIG.SHEET_NAMES.MONTHS)
    .filter(function (m) { return String(m.CourseID) === String(courseId); })
    .map(function (m) { return String(m.MonthID); });
}

function lessonBelongsToCourse(lessonId, courseId) {
  if (!courseId) return true;
  var monthPrefix = String(lessonId || '').split('-')[0]; // e.g. M03
  if (!monthPrefix) return false;
  var months = getCourseMonths(courseId);
  return months.indexOf(monthPrefix) >= 0;
}

function lessonSortKey(lessonId) {
  var m = lessonId.match(/^M(\d{2})-W(\d{2})-L(\d{2})$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

function getLessonsForCourse(courseId) {
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS)
    .filter(function (l) { return String(l.Status).toLowerCase() === 'active'; })
    .sort(function (a, b) { return lessonSortKey(a.LessonID) - lessonSortKey(b.LessonID); });

  if (!courseId) return lessons;
  return lessons.filter(function (lesson) {
    return lessonBelongsToCourse(lesson.LessonID, courseId);
  });
}

function getFirstLessonForCourse(courseId) {
  var lessons = getLessonsForCourse(courseId);
  return lessons.length ? lessons[0] : null;
}

function getLessonById(lessonId) {
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS);
  return lessons.find(function (l) { return String(l.LessonID) === String(lessonId); }) || null;
}

function getNextLesson(currentLessonId, courseId) {
  var lessons = getLessonsForCourse(courseId);
  if (!lessons.length) return null;
  if (!currentLessonId) return lessons[0];

  var idx = lessons.findIndex(function (l) { return l.LessonID === currentLessonId; });
  if (idx < 0) return lessons[0];
  return lessons[Math.min(idx + 1, lessons.length - 1)];
}

function tutorAgent(payload) {
  return withErrorGuard('tutorAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');
    if (!learner.CourseID) return slackEphemeral('Run `/enroll COURSE_ID` first.');

    var lesson = learner.CurrentLesson ? getLessonById(learner.CurrentLesson) : getFirstLessonForCourse(learner.CourseID);
    if (!lesson) return slackEphemeral('No lesson found. Confirm Lessons sheet is loaded.');

    logEvent('LEARN', 'Lesson delivered', {
      userId: payload.user_id,
      command: payload.command,
      lessonId: lesson.LessonID,
      courseId: learner.CourseID
    });

    return slackEphemeral(lessonToSlackText(lesson));
  });
}

function catalogAgent(payload) {
  return withErrorGuard('catalogAgent', function () {
    var courses = readTable(CONFIG.SHEET_NAMES.COURSES)
      .filter(function (c) { return String(c.Status).toLowerCase() === 'active'; });

    if (!courses.length) return slackEphemeral('No active courses available.');
    var lines = ['*Course Catalog*'];
    courses.forEach(function (c) {
      var courseTitle = c.CourseTitle || c.CourseName || c.CourseID;
      var months = c.TotalMonths || c.DurationWeeks || '?';
      lines.push('• `' + c.CourseID + '` - ' + courseTitle + ' (' + months + ' months)');
    });
    lines.push('Use `/enroll COURSE_ID` to join.');
    return slackEphemeral(lines.join('\n'));
  });
}

function gapAgent(payload) {
  return withErrorGuard('gapAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');

    var submissions = readTable(CONFIG.SHEET_NAMES.SUBMISSIONS)
      .filter(function (s) { return s.UserID === payload.user_id; });

    var attempted = {};
    submissions.forEach(function (s) { attempted[s.LessonID] = true; });

    var openLessons = getLessonsForCourse(learner.CourseID).filter(function (l) {
      return !attempted[l.LessonID];
    });

    var lines = ['*Skill Gaps*'];
    if (!openLessons.length) {
      lines.push('No open gaps detected. Great job!');
    } else {
      openLessons.slice(0, 5).forEach(function (l) {
        lines.push('• `' + l.LessonID + '` — ' + l.Topic);
      });
      if (openLessons.length > 5) lines.push('…and ' + (openLessons.length - 5) + ' more.');
    }

    return slackEphemeral(lines.join('\n'));
  });
}
