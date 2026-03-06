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

  return {
    ok: true,
    normalized: {
      triggerType: String(payload.type || payload.request_type || 'workflow_trigger'),
      triggerId: String(payload.triggerId || payload.trigger_id || workflow.triggerId || makeId('wf')),
      action: action,
      sheetName: sheetName,
      input: payload.input || workflow.input || {},
      query: payload.query || workflow.query || {},
      output: payload.output || workflow.output || {}
    }
  };
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
    executeSheetUpdate({
      action: 'insert',
      sheetName: sheetName,
      row: input
    });
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
    var fieldNameForUpdate = request.query && request.query.fieldName;
    var fieldValueForUpdate = request.query && request.query.fieldValue;

    if (!fieldNameForUpdate) {
      throw new Error('Missing query.fieldName for update action.');
    }

    var updateResult = executeSheetUpdate({
      action: 'update',
      sheetName: sheetName,
      query: {
        fieldName: fieldNameForUpdate,
        fieldValue: fieldValueForUpdate
      },
      row: input
    });
    var updated = updateResult.updated > 0;
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
