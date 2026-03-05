/** Slash command router. */

function routeCommand(payload) {
  var cmd = payload.command;

  switch (cmd) {
    case '/onboard': return onboardingAgent(payload);
    case '/enroll': return enrollmentAgent(payload);
    case '/progress': return progressAgent(payload);
    case '/learn': return tutorAgent(payload);
    case '/submit': return quizAgent(payload);
    case '/cert': return certAgent(payload);
    case '/report': return reportingAgent(payload);
    case '/gaps': return gapAgent(payload);
    case '/courses': return catalogAgent(payload);
    case '/help': return helpAgent(payload);
    case '/unenroll': return unenrollAgent(payload);
    default:
      return slackEphemeral('Unknown command `' + cmd + '`. Use `/help`.');
  }
}

function routeInteractive(interactivePayload) {
  // Placeholder for block actions / modal submissions.
  // Current LMS is slash-command-first; interactive events are acknowledged safely.
  return slackEphemeral('Interactive action received.');
}

function helpAgent() {
  var lines = [
    '*Agentic LMS Commands*',
    '`/onboard` — create learner profile',
    '`/courses` — list available courses',
    '`/enroll COURSE_ID` — enroll in course',
    '`/learn` — fetch current lesson',
    '`/submit LESSON_ID complete` — submit completion',
    '`/progress` — view progress',
    '`/gaps` — view open learning gaps',
    '`/cert` — check certificate eligibility',
    '`/report` — snapshot report',
    '`/unenroll` — leave current course'
  ];
  return slackEphemeral(lines.join('\n'));
}
