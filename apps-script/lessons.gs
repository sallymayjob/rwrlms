/** Lesson retrieval and learning agents (module-based delivery). */

function getCourseModules(courseId) {
  if (!courseId) return [];
  return readTable(CONFIG.SHEET_NAMES.MODULES)
    .filter(function (m) {
      return String(m.CourseID) === String(courseId) && String(m.Status).toLowerCase() === 'active';
    })
    .sort(function (a, b) {
      return toNumber(a.ModuleNumber || a.Sequence, 999) - toNumber(b.ModuleNumber || b.Sequence, 999);
    });
}

function getFirstModuleForCourse(courseId) {
  var modules = getCourseModules(courseId);
  return modules.length ? modules[0] : null;
}

function lessonSortKey(lessonId) {
  var m = lessonId.match(/^M(\d{2})-W(\d{2})-L(\d{2})$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

function getLessonsForCourse(courseId, moduleId) {
  var moduleIds = getCourseModules(courseId).map(function (m) { return String(m.ModuleID); });
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS)
    .filter(function (l) { return String(l.Status).toLowerCase() === 'active'; })
    .filter(function (l) {
      if (!courseId) return true;
      return moduleIds.indexOf(String(l.Module)) >= 0;
    })
    .filter(function (l) {
      if (!moduleId) return true;
      return String(l.Module) === String(moduleId);
    })
    .sort(function (a, b) { return lessonSortKey(a.LessonID) - lessonSortKey(b.LessonID); });
  return lessons;
}

function getLessonById(lessonId) {
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS);
  return lessons.find(function (l) { return String(l.LessonID) === String(lessonId); }) || null;
}

function getCompletedLessonIds(userId) {
  var canonicalColumns = resolveTableCanonicalColumns('LESSON_SUBMISSIONS');
  var submissions = readLessonSubmissions().filter(function (s) {
    var learnerId = getCanonicalValue(s, canonicalColumns, 'learnerId');
    var status = getCanonicalValue(s, canonicalColumns, 'status');
    return String(learnerId) === String(userId) && ['complete', 'pass', 'done'].indexOf(String(status).toLowerCase()) >= 0;
  });
  var out = {};
  submissions.forEach(function (s) {
    out[String(getCanonicalValue(s, canonicalColumns, 'lessonId'))] = true;
  });
  return out;
}

function getNextPendingLesson(userId, courseId, moduleId) {
  var completed = getCompletedLessonIds(userId);
  var lessons = getLessonsForCourse(courseId, moduleId);
  for (var i = 0; i < lessons.length; i++) {
    if (!completed[String(lessons[i].LessonID)]) return lessons[i];
  }
  return null;
}

function getNextModuleWithPendingLessons(userId, courseId, currentModuleId) {
  var modules = getCourseModules(courseId);
  if (!modules.length) return null;

  var startIndex = 0;
  if (currentModuleId) {
    var idx = modules.findIndex(function (m) { return String(m.ModuleID) === String(currentModuleId); });
    if (idx >= 0) startIndex = idx;
  }

  for (var i = startIndex; i < modules.length; i++) {
    var modId = modules[i].ModuleID;
    if (getNextPendingLesson(userId, courseId, modId)) return modId;
  }
  return null;
}

function tutorAgent(payload) {
  return withErrorGuard('tutorAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');
    if (!learner.CourseID) return slackEphemeral('Run `/enroll COURSE_ID` first.');

    var currentModule = learner.CurrentModule || (getFirstModuleForCourse(learner.CourseID) || {}).ModuleID;
    if (!currentModule) return slackEphemeral('No module found for your course.');

    var lesson = getNextPendingLesson(payload.user_id, learner.CourseID, currentModule);
    if (!lesson) {
      var nextModule = getNextModuleWithPendingLessons(payload.user_id, learner.CourseID, currentModule);
      if (!nextModule) {
        return slackEphemeral('🎉 You have completed all modules in your course. Use `/cert` to check eligibility.');
      }

      currentModule = nextModule;
      executeSheetUpdate({
        action: 'update',
        sheetName: CONFIG.SHEET_NAMES.LEARNERS,
        query: { fieldName: 'UserID', fieldValue: payload.user_id },
        row: { CurrentModule: currentModule }
      });
      lesson = getNextPendingLesson(payload.user_id, learner.CourseID, currentModule);
    }

    if (!lesson) return slackEphemeral('No lesson found in your current module.');

    logEvent('LEARN', 'Lesson delivered', {
      userId: payload.user_id,
      command: payload.command,
      lessonId: lesson.LessonID,
      courseId: learner.CourseID,
      moduleId: currentModule
    });

    return slackEphemeral(formatLessonCardForSlack(lesson, { heading: '*Module:* ' + currentModule }));
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
      var modules = c.TotalModules || c.TotalMonths || c.DurationWeeks || '?';
      lines.push('• `' + c.CourseID + '` - ' + courseTitle + ' (' + modules + ' modules)');
    });
    lines.push('Use `/enroll COURSE_ID` to join.');
    return slackEphemeral(lines.join('\n'));
  });
}

function gapAgent(payload) {
  return withErrorGuard('gapAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');

    var completed = getCompletedLessonIds(payload.user_id);
    var openLessons = getLessonsForCourse(learner.CourseID).filter(function (l) {
      return !completed[String(l.LessonID)];
    });

    var lines = ['*Skill Gaps by Module*'];
    if (!openLessons.length) {
      lines.push('No open gaps detected. Great job!');
    } else {
      openLessons.slice(0, 5).forEach(function (l) {
        lines.push('• `' + l.Module + '` / `' + l.LessonID + '` — ' + l.Topic);
      });
      if (openLessons.length > 5) lines.push('…and ' + (openLessons.length - 5) + ' more.');
    }

    return slackEphemeral(lines.join('\n'));
  });
}
