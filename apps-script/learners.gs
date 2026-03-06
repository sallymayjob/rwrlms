/** Learner-related operations and command agents. */

var TABLE_LOGICAL_DEFINITIONS = {
  Learners: {
    learnerId: ['Learner', 'UserID'],
    enrolledCourse: ['Enrolled Course', 'CourseID'],
    currentModule: ['Current Module', 'CurrentModule'],
    progressPercent: ['Progress (%)', 'Progress'],
    status: ['Status'],
    onboardingStatus: ['Onboarding Status', 'Onboarding'],
    name: ['Name'],
    email: ['Email'],
    joinedDate: ['Joined Date', 'JoinedDate']
  },
  Courses: {
    courseId: ['CourseID'],
    status: ['Status'],
    courseTitle: ['CourseTitle', 'CourseName']
  },
  Modules: {
    moduleId: ['ModuleID'],
    courseId: ['CourseID'],
    status: ['Status']
  },
  Lessons: {
    lessonId: ['LessonID'],
    moduleId: ['Module'],
    status: ['Status']
  },
  Submissions: {
    learnerId: ['Learner', 'UserID'],
    lessonId: ['LessonID'],
    status: ['Status']
  }
};

function normalizeHeaderToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLogicalAliases(sheetName, logicalKey) {
  var tableDef = TABLE_LOGICAL_DEFINITIONS[sheetName] || {};
  return tableDef[logicalKey] || [logicalKey];
}

function resolveHeaderName(sheetName, logicalKey, headers) {
  var aliases = getLogicalAliases(sheetName, logicalKey);
  var list = headers || [];
  if (!list.length) {
    try {
      var sheet = getSheetByName(sheetName);
      var lastCol = sheet.getLastColumn();
      if (lastCol > 0) {
        list = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      }
    } catch (error) {
      list = [];
    }
  }
  var byToken = {};
  list.forEach(function (h) { byToken[normalizeHeaderToken(h)] = h; });

  for (var i = 0; i < aliases.length; i++) {
    var exact = list.indexOf(aliases[i]);
    if (exact >= 0) return list[exact];
  }

  for (var j = 0; j < aliases.length; j++) {
    var normalizedMatch = byToken[normalizeHeaderToken(aliases[j])];
    if (normalizedMatch) return normalizedMatch;
  }

  return aliases[0] || logicalKey;
}

function readLogicalValue(row, sheetName, logicalKey, fallback) {
  if (!row || typeof row !== 'object') return fallback;
  var aliases = getLogicalAliases(sheetName, logicalKey);
  for (var i = 0; i < aliases.length; i++) {
    if (row[aliases[i]] !== undefined && row[aliases[i]] !== '') return row[aliases[i]];
  }

  var keys = Object.keys(row);
  var aliasTokens = aliases.map(normalizeHeaderToken);
  for (var k = 0; k < keys.length; k++) {
    if (aliasTokens.indexOf(normalizeHeaderToken(keys[k])) >= 0) {
      if (row[keys[k]] !== undefined && row[keys[k]] !== '') return row[keys[k]];
    }
  }
  return fallback;
}

function buildLogicalUpdateRow(sheetName, logicalValues) {
  var headers = [];
  try {
    var sheet = getSheetByName(sheetName);
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    }
  } catch (error) {
    headers = [];
  }

  var row = {};
  Object.keys(logicalValues || {}).forEach(function (logicalKey) {
    var headerName = resolveHeaderName(sheetName, logicalKey, headers);
    row[headerName] = logicalValues[logicalKey];
  });
  return row;
}

function getLearnerIdValue(learner) {
  return String(readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'learnerId', '') || '');
}

function getLearnerCourseId(learner) {
  return String(readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'enrolledCourse', '') || '');
}

function getLearnerCurrentModule(learner) {
  return String(readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'currentModule', '') || '');
}

function getLearnerProgressPercent(learner) {
  return toNumber(readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'progressPercent', 0), 0);
}

function getLearnerStatus(learner, fallback) {
  return String(readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'status', fallback || 'inactive') || fallback || 'inactive');
}

function getLearnerByUserId(userId) {
  var targetId = String(userId || '').trim();
  if (!targetId) return null;

  // Fast path: exact row lookup by canonical Learner identifier to keep slash command responses under Slack's timeout.
  try {
    var sheet = getSheetByName(CONFIG.SHEET_NAMES.LEARNERS);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return null;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    if (!headers.length) return null;

    var learnerHeader = resolveHeaderName(CONFIG.SHEET_NAMES.LEARNERS, 'learnerId', headers);
    var learnerCol = headers.indexOf(learnerHeader);
    if (learnerCol < 0) {
      throw new Error('Learners sheet missing Learner identifier column.');
    }

    var range = sheet.getRange(2, learnerCol + 1, Math.max(0, lastRow - 1), 1);
    var match = range.createTextFinder(targetId).matchEntireCell(true).findNext();
    if (!match) return null;

    var rowValues = sheet.getRange(match.getRow(), 1, 1, lastCol).getValues()[0];
    var learner = {};
    headers.forEach(function (h, i) { learner[h] = rowValues[i]; });
    return learner;
  } catch (error) {
    // Fallback path preserves legacy behavior if TextFinder lookup fails for any reason.
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    return learners.find(function (l) { return getLearnerIdValue(l) === targetId; }) || null;
  }
}

function createLearner(payload) {
  var learner = buildLogicalUpdateRow(CONFIG.SHEET_NAMES.LEARNERS, {
    learnerId: payload.user_id,
    name: payload.user_name || 'Unknown',
    email: payload.user_name ? payload.user_name + '@example.com' : '',
    enrolledCourse: '',
    currentModule: '',
    progressPercent: 0,
    status: 'active',
    onboardingStatus: 'completed',
    joinedDate: nowISO().split('T')[0]
  });
  executeSheetUpdate({ action: 'insert', sheetName: CONFIG.SHEET_NAMES.LEARNERS, row: learner });
  return learner;
}

function onboardingAgent(payload) {
  return withErrorGuard('onboardingAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) {
      learner = createLearner(payload);
      logEvent('ONBOARD', 'Learner onboarded', { userId: payload.user_id, command: payload.command });
      return slackEphemeral('Welcome, ' + readLogicalValue(learner, CONFIG.SHEET_NAMES.LEARNERS, 'name', 'Learner') + '! You are onboarded. Use `/courses` then `/enroll COURSE_ID`.');
    }
    return slackEphemeral('You are already onboarded. Use `/progress` to view your status.');
  });
}

function enrollmentAgent(payload) {
  return withErrorGuard('enrollmentAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('Run `/onboard` before enrolling.');

    var courseId = normalizeWhitespace(payload.text).toUpperCase();
    if (!courseId) return slackEphemeral('Usage: `/enroll COURSE_ID`');

    var courses = readTable(CONFIG.SHEET_NAMES.COURSES);
    var course = courses.find(function (c) {
      return String(readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'courseId', '')).toUpperCase() === courseId &&
        String(readLogicalValue(c, CONFIG.SHEET_NAMES.COURSES, 'status', '')).toLowerCase() === 'active';
    });
    if (!course) return slackEphemeral('Course `' + courseId + '` not found or inactive.');

    var firstModule = getFirstModuleForCourse(courseId);
    executeSheetUpdate({
      action: 'update',
      sheetName: CONFIG.SHEET_NAMES.LEARNERS,
      query: {
        fieldName: resolveHeaderName(CONFIG.SHEET_NAMES.LEARNERS, 'learnerId'),
        fieldValue: payload.user_id
      },
      row: buildLogicalUpdateRow(CONFIG.SHEET_NAMES.LEARNERS, {
        enrolledCourse: courseId,
        currentModule: firstModule ? readLogicalValue(firstModule, CONFIG.SHEET_NAMES.MODULES, 'moduleId', '') : '',
        progressPercent: 0,
        status: 'active'
      })
    });

    logEvent('ENROLL', 'Learner enrolled', { userId: payload.user_id, command: payload.command, courseId: courseId });
    var courseTitle = readLogicalValue(course, CONFIG.SHEET_NAMES.COURSES, 'courseTitle', courseId);
    return slackEphemeral('Enrolled in *' + courseTitle + '* (`' + courseId + '`). Use `/learn` to start.');
  });
}

function progressAgent(payload) {
  return withErrorGuard('progressAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('No learner profile found. Run `/onboard`.');

    var msg = [
      '*Progress Report*',
      'User: <@' + payload.user_id + '>',
      'Course: ' + (getLearnerCourseId(learner) || 'Not enrolled'),
      'Current Module: ' + (getLearnerCurrentModule(learner) || 'N/A'),
      'Progress: ' + getLearnerProgressPercent(learner) + '%',
      'Status: ' + getLearnerStatus(learner, 'unknown')
    ].join('\n');
    return slackEphemeral(msg);
  });
}

function unenrollAgent(payload) {
  return withErrorGuard('unenrollAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) return slackEphemeral('No learner profile found.');

    executeSheetUpdate({
      action: 'update',
      sheetName: CONFIG.SHEET_NAMES.LEARNERS,
      query: {
        fieldName: resolveHeaderName(CONFIG.SHEET_NAMES.LEARNERS, 'learnerId'),
        fieldValue: payload.user_id
      },
      row: buildLogicalUpdateRow(CONFIG.SHEET_NAMES.LEARNERS, {
        enrolledCourse: '',
        currentModule: '',
        progressPercent: 0,
        status: 'inactive'
      })
    });
    logEvent('UNENROLL', 'Learner unenrolled', { userId: payload.user_id, command: payload.command });
    return slackEphemeral('You have been unenrolled. Use `/enroll COURSE_ID` to rejoin.');
  });
}
