/** Request routers. Slash-command routes remain isolated from workflow routes. */

function triggerWorkflowShortcut(actionKey, payload, input) {
  var workflowPayload = {
    type: 'workflow_trigger',
    action: actionKey,
    triggerId: makeId('shortcut'),
    input: input || {},
    query: {},
    output: {
      source: 'slash_command',
      command: payload.command || ''
    }
  };

  var result = routeWorkflow(workflowPayload);
  var body = safeJsonParse(result.getContent(), { ok: false, error: 'Invalid workflow response.' });
  if (!body.ok) {
    return slackEphemeral('Unable to start workflow `' + actionKey + '`: ' + body.error);
  }

  return slackEphemeral(body.message || ('Workflow `' + actionKey + '` executed.'));
}

function routeWorkflowActionKey(request) {
  var handlers = {
    'workflow.onboarding.start': handleWorkflowOnboardingStart,
    'workflow.lesson_release.prepare': handleWorkflowLessonReleasePrepare,
    'workflow.lesson_release.publish': handleWorkflowLessonReleasePublish,
    'workflow.content_review.submit': handleWorkflowContentReviewSubmit,
    'workflow.content_review.approve': handleWorkflowContentReviewApprove,
    'workflow.health': handleWorkflowHealthCheck
  };

  var handler = handlers[request.action];
  if (!handler) {
    throw new Error('Unsupported workflow action key: ' + request.action);
  }

  return handler(request);
}

function routeCommand(payload) {
  var cmd = payload.command;

  switch (cmd) {
    case '/onboard':
      return triggerWorkflowShortcut('workflow.onboarding.start', payload, {
        userId: payload.user_id,
        userName: payload.user_name,
        source: 'slash_command'
      });
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
