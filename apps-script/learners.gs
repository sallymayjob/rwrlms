/** Learner-related operations and command agents. */

function getLearnerByUserId(userId) {
  var targetId = String(userId || '').trim();
  if (!targetId) return null;

  // Fast path: exact row lookup by UserID to keep slash command responses under Slack's timeout.
  try {
    var sheet = getSheetByName(CONFIG.SHEET_NAMES.LEARNERS);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return null;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var userIdCol = headers.indexOf('UserID');
    if (userIdCol < 0) {
      throw new Error('Learners sheet missing UserID column.');
    }

    var range = sheet.getRange(2, userIdCol + 1, Math.max(0, lastRow - 1), 1);
    var match = range.createTextFinder(targetId).matchEntireCell(true).findNext();
    if (!match) return null;

    var rowValues = sheet.getRange(match.getRow(), 1, 1, lastCol).getValues()[0];
    var learner = {};
    headers.forEach(function (h, i) { learner[h] = rowValues[i]; });
    return learner;
  } catch (error) {
    // Fallback path preserves legacy behavior if TextFinder lookup fails for any reason.
    var learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
    return learners.find(function (l) { return String(l.UserID) === targetId; }) || null;
  }
}

function createLearner(payload) {
  const learner = {
    UserID: payload.user_id,
    Name: payload.user_name || 'Unknown',
    Email: payload.user_name ? payload.user_name + '@example.com' : '',
    CourseID: '',
    CurrentModule: '',
    Progress: 0,
    Status: 'active',
    JoinedDate: nowISO().split('T')[0]
  };
  executeSheetUpdate({ action: 'insert', sheetName: CONFIG.SHEET_NAMES.LEARNERS, row: learner });
  return learner;
}

function onboardingAgent(payload) {
  return withErrorGuard('onboardingAgent', function () {
    var learner = getLearnerByUserId(payload.user_id);
    if (!learner) {
      learner = createLearner(payload);
      logEvent('ONBOARD', 'Learner onboarded', { userId: payload.user_id, command: payload.command });
      return slackEphemeral('Welcome, ' + learner.Name + '! You are onboarded. Use `/courses` then `/enroll COURSE_ID`.');
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
    var course = courses.find(function (c) { return String(c.CourseID).toUpperCase() === courseId && c.Status === 'active'; });
    if (!course) return slackEphemeral('Course `' + courseId + '` not found or inactive.');

    var firstModule = getFirstModuleForCourse(courseId);
    executeSheetUpdate({
      action: 'update',
      sheetName: CONFIG.SHEET_NAMES.LEARNERS,
      query: { fieldName: 'UserID', fieldValue: payload.user_id },
      row: {
        CourseID: courseId,
        CurrentModule: firstModule ? firstModule.ModuleID : '',
        Progress: 0,
        Status: 'active'
      }
    });

    logEvent('ENROLL', 'Learner enrolled', { userId: payload.user_id, command: payload.command, courseId: courseId });
    var courseTitle = course.CourseTitle || course.CourseName || courseId;
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
      'Course: ' + (learner.CourseID || 'Not enrolled'),
      'Current Module: ' + (learner.CurrentModule || 'N/A'),
      'Progress: ' + learner.Progress + '%',
      'Status: ' + learner.Status
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
      query: { fieldName: 'UserID', fieldValue: payload.user_id },
      row: {
        CourseID: '',
        CurrentModule: '',
        Progress: 0,
        Status: 'inactive'
      }
    });
    logEvent('UNENROLL', 'Learner unenrolled', { userId: payload.user_id, command: payload.command });
    return slackEphemeral('You have been unenrolled. Use `/enroll COURSE_ID` to rejoin.');
  });
}
