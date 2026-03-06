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


function getWorkflowPolicy() {
  return CONFIG.WORKFLOW_POLICY || {};
}

function getAllowedSheetsForAction(action) {
  var policy = getWorkflowPolicy();
  var sheetsByAction = policy.SHEETS_BY_ACTION || {};
  return sheetsByAction[action] || [];
}

function getAllowedFieldsForActionAndSheet(action, sheetName) {
  var policy = getWorkflowPolicy();
  var fieldsByActionAndSheet = policy.FIELDS_BY_ACTION_AND_SHEET || {};
  var fieldsBySheet = fieldsByActionAndSheet[action] || {};
  return fieldsBySheet[sheetName] || null;
}

function isAllowedWorkflowAction(action) {
  var policy = getWorkflowPolicy();
  var actions = policy.ACTIONS || [];
  return actions.indexOf(action) >= 0;
}

function sanitizeWorkflowInputForWrite(request) {
  var input = request.input || {};
  var allowedFields = getAllowedFieldsForActionAndSheet(request.action, request.sheetName);

  if (!allowedFields || !allowedFields.length) {
    return input;
  }

  var sanitized = {};
  Object.keys(input).forEach(function (key) {
    if (allowedFields.indexOf(key) >= 0) {
      sanitized[key] = input[key];
    }
  });

  return sanitized;
}
function validateWorkflowTriggerPayload(payload) {
  if (!isWorkflowTriggerPayload(payload)) {
    return {
      ok: false,
      reason: 'Unsupported workflow payload type.'
    };
  }

  var workflow = payload.workflow || payload.workflowTrigger || payload.workflowStep || {};
  var action = String(payload.action || workflow.action || '').toLowerCase();
  if (!action) {
    return {
      ok: false,
      reason: 'Missing workflow action.'
    };
  }

  var sheetName = String(payload.sheetName || workflow.sheetName || '');
  if (!sheetName) {
    return {
      ok: false,
      reason: 'Missing target sheetName.'
    };
  }

  if (!isAllowedWorkflowAction(action)) {
    return {
      ok: false,
      reason: 'policy_violation: action_not_allowed'
    };
  }

  var allowedSheets = getAllowedSheetsForAction(action);
  if (allowedSheets.indexOf(sheetName) < 0) {
    return {
      ok: false,
      reason: 'policy_violation: sheet_not_allowed'
    };
  }

  return {
    ok: true,
    normalized: {
      triggerType: String(payload.type || payload.request_type || 'workflow_trigger'),
      triggerId: String(payload.triggerId || payload.trigger_id || workflow.triggerId || makeId('wf')),
      action: action,
      sheetName: sheetName,
      input: payload.input || workflow.input || {},
      query: payload.query || workflow.query || {},
      output: payload.output || workflow.output || {},
      userId: String(payload.user_id || payload.userId || workflow.user_id || workflow.userId || '')
    }
  };
}

function isAdminMutationAction(action) {
  return ['insert', 'update', 'delete', 'upsert'].indexOf(String(action || '').toLowerCase()) >= 0;
}

function enforceWorkflowAdminAccess(request) {
  if (!isAdminMutationAction(request && request.action)) return null;

  var userId = request && request.userId;
  if (!isAdminUser(userId)) {
    logEvent('ADMIN_ACCESS_DENIED', 'Non-admin attempted workflow mutation action', {
      userId: userId,
      command: 'workflow_trigger',
      action: request.action,
      sheetName: request.sheetName,
      triggerId: request.triggerId
    });

    return {
      ok: false,
      trigger_id: request.triggerId,
      error: 'Not authorized for admin mutation action.',
      timestamp: nowISO()
    };
  }

  logEvent('ADMIN_ACCESS_GRANTED', 'Admin authorized for workflow mutation action', {
    userId: userId,
    command: 'workflow_trigger',
    action: request.action,
    sheetName: request.sheetName,
    triggerId: request.triggerId
  });

  return null;
}

function executeWorkflowQuery(request) {
  var action = request.action;
  var sheetName = request.sheetName;
  var input = request.input || {};

  logWorkflowQueryAction(request, {
    phase: 'start',
    action: action,
    sheetName: sheetName
  });

  if (action === 'select') {
    var rows = readTable(sheetName);
    var fieldName = request.query && request.query.fieldName;
    var fieldValue = request.query && request.query.fieldValue;

    if (fieldName) {
      rows = rows.filter(function (row) {
        return String(row[fieldName]) === String(fieldValue);
      });
    }

    logWorkflowQueryAction(request, {
      phase: 'complete',
      action: action,
      rowCount: rows.length
    });

    return {
      rows: rows,
      rowCount: rows.length
    };
  }

  if (action === 'insert') {
    input = sanitizeWorkflowInputForWrite(request);
    appendRow(sheetName, input);
    logWorkflowQueryAction(request, {
      phase: 'complete',
      action: action,
      inserted: 1
    });

    return {
      inserted: 1,
      row: input
    };
  }

  if (action === 'update') {
    input = sanitizeWorkflowInputForWrite(request);
    var fieldNameForUpdate = request.query && request.query.fieldName;
    var fieldValueForUpdate = request.query && request.query.fieldValue;

    if (!fieldNameForUpdate) {
      throw new Error('Missing query.fieldName for update action.');
    }

    var updated = updateRowByField(sheetName, fieldNameForUpdate, fieldValueForUpdate, input);
    logWorkflowQueryAction(request, {
      phase: 'complete',
      action: action,
      updated: updated ? 1 : 0
    });

    return {
      updated: updated ? 1 : 0,
      applied: input
    };
  }

  throw new Error('Unsupported workflow action: ' + action);
}

function buildWorkflowResponse(request, executionResult) {
  return {
    ok: true,
    trigger_id: request.triggerId,
    trigger_type: request.triggerType,
    action: request.action,
    data: executionResult,
    output: request.output || {},
    timestamp: nowISO()
  };
}

function routeWorkflow(payload) {
  var validation = validateWorkflowTriggerPayload(payload);
  if (!validation.ok) {
    var isPolicyViolation = String(validation.reason || '').indexOf('policy_violation') === 0;
    logWorkflowFailure(payload, isPolicyViolation ? 'policy_violation' : validation.reason, {
      stage: 'validation',
      detail: validation.reason
    });
    return workflowJsonResponse({
      ok: false,
      error: validation.reason
    });
  }

  var request = validation.normalized;

  logWorkflowTriggerStart(request);

  var adminAccessDenied = enforceWorkflowAdminAccess(request);
  if (adminAccessDenied) {
    logWorkflowTriggerEnd(request, { ok: false, action: request.action, reason: 'admin_access_denied' });
    return workflowJsonResponse(adminAccessDenied);
  }

  try {
    var executionResult = executeWorkflowQuery(request);
    var response = buildWorkflowResponse(request, executionResult);
    logWorkflowTriggerEnd(request, { ok: true, action: request.action });
    return workflowJsonResponse(response);
  } catch (error) {
    logWorkflowFailure(request, error, {
      stage: 'execution',
      action: request.action,
      sheetName: request.sheetName
    });
    logWorkflowTriggerEnd(request, { ok: false, action: request.action });
    return workflowJsonResponse({
      ok: false,
      trigger_id: request.triggerId,
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
