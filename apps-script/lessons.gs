/** Lesson retrieval and learning agents (module-based delivery). */

function getCourseModules(courseId) {
  if (!courseId) return [];
  return readTable(CONFIG.SHEET_NAMES.MODULES)
    .filter(function (m) {
      return String(readLogicalValue(m, CONFIG.SHEET_NAMES.MODULES, 'courseId', '')) === String(courseId) &&
      String(readLogicalValue(m, CONFIG.SHEET_NAMES.MODULES, 'status', '')).toLowerCase() === 'active';
    })
    .sort(function (a, b) {
      return toNumber(a.ModuleNumber || a.Sequence, 999) - toNumber(b.ModuleNumber || b.Sequence, 999);
    });
}

function getFirstModuleForCourse(courseId) {
  var modules = getCourseModules(courseId);
  return modules.length ? modules[0] : null;
}

function parseLessonId(lessonId) {
  var rawId = String(lessonId || '').trim();
  var m = rawId.match(/^M(\d{2})-W(\d{2})-L(\d{2})(?:-([A-Za-z0-9]+))?$/);
  if (!m) return null;

  var moduleNumber = Number(m[1]);
  var weekNumber = Number(m[2]);
  var lessonNumber = Number(m[3]);
  var suffixRaw = m[4] || '';
  var suffixNormalized = suffixRaw.toLowerCase();
  var suffixPriority = Array.isArray(CONFIG.LESSON_ID_SUFFIX_PRIORITY) ? CONFIG.LESSON_ID_SUFFIX_PRIORITY : [];
  var suffixPriorityIndex = suffixPriority.indexOf(suffixNormalized);
  var suffixRank = suffixRaw ? (suffixPriorityIndex >= 0 ? suffixPriorityIndex + 1 : suffixPriority.length + 1) : 0;

  return {
    raw: rawId,
    module: moduleNumber,
    week: weekNumber,
    lesson: lessonNumber,
    suffix: suffixRaw,
    suffixNormalized: suffixNormalized,
    suffixRank: suffixRank
  };
}

function lessonSortKey(lessonId) {
  var parsed = parseLessonId(lessonId);
  if (!parsed) return '9999999999~';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  return [
    pad(parsed.module),
    pad(parsed.week),
    pad(parsed.lesson),
    pad(parsed.suffixRank),
    parsed.suffixNormalized
  ].join('-');
}

function getLessonsForCourse(courseId, moduleId) {
  var moduleIds = getCourseModules(courseId).map(function (m) { return String(readLogicalValue(m, CONFIG.SHEET_NAMES.MODULES, 'moduleId', '')); });
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS)
    .filter(function (l) { return String(readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'status', '')).toLowerCase() === 'active'; })
    .filter(function (l) {
      if (!courseId) return true;
      return moduleIds.indexOf(String(readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'moduleId', ''))) >= 0;
    })
    .filter(function (l) {
      if (!moduleId) return true;
      return String(readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'moduleId', '')) === String(moduleId);
    })
    .sort(function (a, b) {
      var aKey = lessonSortKey(a.LessonID);
      var bKey = lessonSortKey(b.LessonID);
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;
      return 0;
    });
  return lessons;
}

function getLessonById(lessonId) {
  var lessons = readTable(CONFIG.SHEET_NAMES.LESSONS);
  return lessons.find(function (l) { return String(readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'lessonId', '')) === String(lessonId); }) || null;
}

function getCompletedLessonIds(userId) {
  var submissions = readTable(CONFIG.SHEET_NAMES.SUBMISSIONS)
    .filter(function (s) {
      return String(readLogicalValue(s, CONFIG.SHEET_NAMES.SUBMISSIONS, 'learnerId', '')) === String(userId) &&
        ['complete', 'pass', 'done'].indexOf(String(readLogicalValue(s, CONFIG.SHEET_NAMES.SUBMISSIONS, 'status', '')).toLowerCase()) >= 0;
    });
  var out = {};
  submissions.forEach(function (s) { out[String(readLogicalValue(s, CONFIG.SHEET_NAMES.SUBMISSIONS, 'lessonId', ''))] = true; });
  return out;
}

function getNextPendingLesson(userId, courseId, moduleId) {
  var completed = getCompletedLessonIds(userId);
  var lessons = getLessonsForCourse(courseId, moduleId);
  for (var i = 0; i < lessons.length; i++) {
    if (!completed[String(readLogicalValue(lessons[i], CONFIG.SHEET_NAMES.LESSONS, 'lessonId', ''))]) return lessons[i];
  }
  return null;
}

function getNextModuleWithPendingLessons(userId, courseId, currentModuleId) {
  var modules = getCourseModules(courseId);
  if (!modules.length) return null;

  var startIndex = 0;
  if (currentModuleId) {
    var idx = modules.findIndex(function (m) { return String(readLogicalValue(m, CONFIG.SHEET_NAMES.MODULES, 'moduleId', '')) === String(currentModuleId); });
    if (idx >= 0) startIndex = idx;
  }

  for (var i = startIndex; i < modules.length; i++) {
    var modId = readLogicalValue(modules[i], CONFIG.SHEET_NAMES.MODULES, 'moduleId', '');
    if (getNextPendingLesson(userId, courseId, modId)) return modId;
  }
  return null;
}

function tutorAgent(payload) {
  return withErrorGuard('tutorAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` first.');
    var learnerCourseId = getLearnerCourseId(learner);
    if (!learnerCourseId) return slackEphemeral('Run `/enroll COURSE_ID` first.');

    var currentModule = getLearnerCurrentModule(learner) ||
      readLogicalValue(getFirstModuleForCourse(learnerCourseId) || {}, CONFIG.SHEET_NAMES.MODULES, 'moduleId', '');
    if (!currentModule) return slackEphemeral('No module found for your course.');

    var lesson = getNextPendingLesson(payload.user_id, learnerCourseId, currentModule);
    if (!lesson) {
      var nextModule = getNextModuleWithPendingLessons(payload.user_id, learnerCourseId, currentModule);
      if (!nextModule) {
        return slackEphemeral('🎉 You have completed all modules in your course. Use `/cert` to check eligibility.');
      }

      currentModule = nextModule;
      executeSheetUpdate({
        action: 'update',
        sheetName: CONFIG.SHEET_NAMES.LEARNERS,
        query: {
          fieldName: resolveHeaderName(CONFIG.SHEET_NAMES.LEARNERS, 'learnerId'),
          fieldValue: payload.user_id
        },
        row: buildLogicalUpdateRow(CONFIG.SHEET_NAMES.LEARNERS, { currentModule: currentModule })
      });
      lesson = getNextPendingLesson(payload.user_id, learnerCourseId, currentModule);
    }

    if (!lesson) return slackEphemeral('No lesson found in your current module.');

    logEvent('LEARN', 'Lesson delivered', {
      userId: payload.user_id,
      command: payload.command,
      lessonId: readLogicalValue(lesson, CONFIG.SHEET_NAMES.LESSONS, 'lessonId', ''),
      courseId: learnerCourseId,
      moduleId: currentModule
    });

    return slackEphemeral(formatLessonCardForSlack(lesson, { heading: '*Module:* ' + currentModule }));
  });
}

function catalogAgent(payload) {
  return withErrorGuard('catalogAgent', function () {
    var courses = readTable(CONFIG.SHEET_NAMES.COURSES)
      .filter(function (c) { return String(readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'status', '')).toLowerCase() === 'active'; });

    if (!courses.length) return slackEphemeral('No active courses available.');
    var lines = ['*Course Catalog*'];
    courses.forEach(function (c) {
      var courseTitle = readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'courseTitle', readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'courseId', ''));
      var modules = c.TotalModules || c.TotalMonths || c.DurationWeeks || '?';
      lines.push('• `' + readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'courseId', '') + '` - ' + courseTitle + ' (' + modules + ' modules)');
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
    var openLessons = getLessonsForCourse(getLearnerCourseId(learner)).filter(function (l) {
      return !completed[String(readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'lessonId', ''))];
    });

    var lines = ['*Skill Gaps by Module*'];
    if (!openLessons.length) {
      lines.push('No open gaps detected. Great job!');
    } else {
      openLessons.slice(0, 5).forEach(function (l) {
        lines.push('• `' + readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'moduleId', '') + '` / `' + readLogicalValue(l, CONFIG.SHEET_NAMES.LESSONS, 'lessonId', '') + '` — ' + l.Topic);
      });
      if (openLessons.length > 5) lines.push('…and ' + (openLessons.length - 5) + ' more.');
    }

    return slackEphemeral(lines.join('\n'));
  });
}
