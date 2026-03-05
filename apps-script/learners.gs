/** Learner-related operations and command agents. */

function getLearnerByUserId(userId) {
  const learners = readTable(CONFIG.SHEET_NAMES.LEARNERS);
  return learners.find(function (l) { return String(l.UserID) === String(userId); }) || null;
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
  appendRow(CONFIG.SHEET_NAMES.LEARNERS, learner);
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
    updateRowByField(CONFIG.SHEET_NAMES.LEARNERS, 'UserID', payload.user_id, {
      CourseID: courseId,
      CurrentModule: firstModule ? firstModule.ModuleID : '',
      Progress: 0,
      Status: 'active'
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

    updateRowByField(CONFIG.SHEET_NAMES.LEARNERS, 'UserID', payload.user_id, {
      CourseID: '',
      CurrentModule: '',
      Progress: 0,
      Status: 'inactive'
    });
    logEvent('UNENROLL', 'Learner unenrolled', { userId: payload.user_id, command: payload.command });
    return slackEphemeral('You have been unenrolled. Use `/enroll COURSE_ID` to rejoin.');
  });
}
