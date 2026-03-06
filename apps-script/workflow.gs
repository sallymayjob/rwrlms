/** Workflow trigger execution handlers. */

function isWorkflowTriggerPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.command) return false;

  var type = String(payload.type || payload.request_type || '').toLowerCase();
  if (type === 'workflow_trigger' || type === 'workflow_step_execute') {
    return true;
  }

  return !!(payload.workflowTrigger || payload.workflowStep || payload.workflow);
}

function validateWorkflowTriggerPayload(payload) {
  if (!isWorkflowTriggerPayload(payload)) {
    return {
      ok: false,
      reason: 'Unsupported workflow payload type.'
    };
  }

  var workflow = payload.workflow || payload.workflowTrigger || payload.workflowStep || {};
  var action = normalizeWhitespace(payload.action || workflow.action).toLowerCase();
  if (!action) {
    return {
      ok: false,
      reason: 'Missing workflow action.'
    };
  }

  return {
    ok: true,
    normalized: {
      triggerType: String(payload.type || payload.request_type || 'workflow_trigger'),
      triggerId: String(payload.triggerId || payload.trigger_id || workflow.triggerId || makeId('wf')),
      action: action,
      input: payload.input || workflow.input || {},
      query: payload.query || workflow.query || {},
      output: payload.output || workflow.output || {}
    }
  };
}

function parseLessonReleaseInput(input) {
  var lessonId = String(input.lessonId || '').toUpperCase();
  var reviewerUserId = String(input.reviewerUserId || input.approverUserId || '').trim();

  if (!CONFIG.LESSON_ID_REGEX.test(lessonId)) {
    throw new Error('Input lessonId must match M00-W00-L00 format.');
  }

  return {
    lessonId: lessonId,
    reviewerUserId: reviewerUserId,
    notes: String(input.notes || '').trim()
  };
}

function handleWorkflowOnboardingStart(request) {
  var input = request.input || {};
  var userId = String(input.userId || '').trim();
  if (!userId) {
    throw new Error('Onboarding requires input.userId.');
  }

  var payload = {
    user_id: userId,
    user_name: String(input.userName || ''),
    command: request.output && request.output.command ? request.output.command : '/onboard'
  };

  var learner = getLearnerByUserId(userId);
  if (!learner) {
    learner = createLearner(payload);
    logEvent('WORKFLOW_ONBOARDING', 'Learner profile created from onboarding workflow.', {
      userId: userId,
      action: request.action,
      triggerId: request.triggerId
    });

    return {
      workflow: 'onboarding',
      status: 'completed',
      learner: learner,
      message: 'Onboarding complete for <@' + userId + '>. Next step: `/courses` then `/enroll COURSE_ID`.'
    };
  }

  return {
    workflow: 'onboarding',
    status: 'already_exists',
    learner: learner,
    message: 'Learner <@' + userId + '> already has a profile. Use `/progress` for current state.'
  };
}

function handleWorkflowLessonReleasePrepare(request) {
  var parsed = parseLessonReleaseInput(request.input || {});
  var lesson = getLessonById(parsed.lessonId);
  if (!lesson) {
    throw new Error('Lesson `' + parsed.lessonId + '` not found.');
  }

  if (String(lesson.Status).toLowerCase() !== 'draft') {
    return {
      workflow: 'lesson_release',
      stage: 'prepare',
      status: 'noop',
      lessonId: parsed.lessonId,
      currentStatus: lesson.Status,
      requiresApproval: false,
      message: 'Lesson `' + parsed.lessonId + '` is `' + lesson.Status + '`, so release prep skipped.'
    };
  }

  var approvalToken = makeId('approval');
  logEvent('WORKFLOW_LESSON_RELEASE_PREPARE', 'Lesson prepared for release approval.', {
    lessonId: parsed.lessonId,
    reviewerUserId: parsed.reviewerUserId,
    approvalToken: approvalToken,
    triggerId: request.triggerId,
    notes: parsed.notes
  });

  return {
    workflow: 'lesson_release',
    stage: 'prepare',
    status: 'pending_approval',
    lessonId: parsed.lessonId,
    currentStatus: lesson.Status,
    requiresApproval: true,
    approvalToken: approvalToken,
    reviewerUserId: parsed.reviewerUserId,
    message: 'Release preparation complete for `' + parsed.lessonId + '`. Awaiting human approval.'
  };
}

function handleWorkflowLessonReleasePublish(request) {
  var parsed = parseLessonReleaseInput(request.input || {});
  var approvedBy = String(request.input.approvedBy || request.input.reviewerUserId || '').trim();
  if (!approvedBy) {
    throw new Error('Lesson release publish requires input.approvedBy.');
  }

  var updated = updateRowByField(CONFIG.SHEET_NAMES.LESSONS, 'LessonID', parsed.lessonId, {
    Status: 'active'
  });

  if (!updated) {
    throw new Error('Unable to update lesson `' + parsed.lessonId + '` for release.');
  }

  logEvent('WORKFLOW_LESSON_RELEASE_PUBLISH', 'Lesson released after approval.', {
    lessonId: parsed.lessonId,
    approvedBy: approvedBy,
    triggerId: request.triggerId,
    notes: parsed.notes
  });

  return {
    workflow: 'lesson_release',
    stage: 'publish',
    status: 'completed',
    lessonId: parsed.lessonId,
    approvedBy: approvedBy,
    newStatus: 'active',
    message: 'Lesson `' + parsed.lessonId + '` is now active.'
  };
}

function handleWorkflowContentReviewSubmit(request) {
  var parsed = parseLessonReleaseInput(request.input || {});
  var submissionId = makeId('review');

  logEvent('WORKFLOW_CONTENT_REVIEW_SUBMIT', 'Content review submitted for human approval.', {
    lessonId: parsed.lessonId,
    submissionId: submissionId,
    reviewerUserId: parsed.reviewerUserId,
    triggerId: request.triggerId,
    notes: parsed.notes
  });

  return {
    workflow: 'content_review',
    stage: 'submit',
    status: 'pending_approval',
    lessonId: parsed.lessonId,
    submissionId: submissionId,
    reviewerUserId: parsed.reviewerUserId,
    requiresApproval: true,
    message: 'Review submitted for `' + parsed.lessonId + '`. Waiting for editor approval.'
  };
}

function handleWorkflowContentReviewApprove(request) {
  var parsed = parseLessonReleaseInput(request.input || {});
  var approvedBy = String(request.input.approvedBy || request.input.reviewerUserId || '').trim();
  if (!approvedBy) {
    throw new Error('Content review approval requires input.approvedBy.');
  }

  var updated = updateRowByField(CONFIG.SHEET_NAMES.LESSONS, 'LessonID', parsed.lessonId, {
    Status: 'approved'
  });

  if (!updated) {
    throw new Error('Unable to mark lesson `' + parsed.lessonId + '` approved.');
  }

  logEvent('WORKFLOW_CONTENT_REVIEW_APPROVE', 'Content approved by human reviewer.', {
    lessonId: parsed.lessonId,
    approvedBy: approvedBy,
    triggerId: request.triggerId,
    notes: parsed.notes
  });

  return {
    workflow: 'content_review',
    stage: 'approve',
    status: 'completed',
    lessonId: parsed.lessonId,
    approvedBy: approvedBy,
    newStatus: 'approved',
    message: 'Content review approved for `' + parsed.lessonId + '`.'
  };
}

function handleWorkflowHealthCheck(request) {
  return {
    workflow: 'health',
    status: 'ok',
    triggerId: request.triggerId,
    timestamp: nowISO(),
    message: 'Workflow router is healthy.'
  };
}

function executeWorkflowAction(request) {
  logWorkflowQueryAction(request, {
    phase: 'start',
    action: request.action
  });

  var data = routeWorkflowActionKey(request);

  logWorkflowQueryAction(request, {
    phase: 'complete',
    action: request.action,
    status: data && data.status ? data.status : 'completed'
  });

  return data;
}

function buildWorkflowResponse(request, executionResult) {
  return {
    ok: true,
    trigger_id: request.triggerId,
    trigger_type: request.triggerType,
    action: request.action,
    data: executionResult,
    message: executionResult && executionResult.message ? executionResult.message : '',
    output: request.output || {},
    timestamp: nowISO()
  };
}

function routeWorkflow(payload) {
  var validation = validateWorkflowTriggerPayload(payload);
  if (!validation.ok) {
    logWorkflowFailure(payload, validation.reason, {
      stage: 'validation'
    });
    return workflowJsonResponse({
      ok: false,
      error: validation.reason
    });
  }

  var request = validation.normalized;

  logWorkflowTriggerStart(request);
  try {
    var executionResult = executeWorkflowAction(request);
    var response = buildWorkflowResponse(request, executionResult);
    logWorkflowTriggerEnd(request, { ok: true, action: request.action });
    return workflowJsonResponse(response);
  } catch (error) {
    logWorkflowFailure(request, error, {
      stage: 'execution',
      action: request.action
    });
    logWorkflowTriggerEnd(request, { ok: false, action: request.action });
    return workflowJsonResponse({
      ok: false,
      trigger_id: request.triggerId,
      action: request.action,
      error: String(error && error.message ? error.message : error),
      timestamp: nowISO()
    });
  }
}

function workflowJsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
