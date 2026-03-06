/**
 * Sheet updater policy layer.
 * All write operations should be routed through this module.
 */

function buildSheetUpdaterPolicy() {
  return {
    allowedSheets: [
      CONFIG.SHEET_NAMES.COURSES,
      CONFIG.SHEET_NAMES.MODULES,
      CONFIG.SHEET_NAMES.LESSONS,
      CONFIG.SHEET_NAMES.LEARNERS,
      CONFIG.SHEET_NAMES.SUBMISSIONS,
      CONFIG.SHEET_NAMES.LOGS
    ],
    actions: ['insert', 'update', 'delete']
  };
}

function validateSheetUpdaterRequest(request) {
  var policy = buildSheetUpdaterPolicy();
  var action = String(request && request.action || '').toLowerCase();
  var sheetName = String(request && request.sheetName || '');

  if (policy.actions.indexOf(action) < 0) {
    return { ok: false, reason: 'Unsupported write action: ' + action };
  }

  if (policy.allowedSheets.indexOf(sheetName) < 0) {
    return { ok: false, reason: 'Sheet not allowed for writes: ' + sheetName };
  }

  if (action === 'insert' && (!request.row || typeof request.row !== 'object')) {
    return { ok: false, reason: 'Insert action requires request.row object.' };
  }

  if ((action === 'update' || action === 'delete') && !request.query) {
    return { ok: false, reason: action + ' action requires request.query.' };
  }

  if ((action === 'update' || action === 'delete') && !request.query.fieldName) {
    return { ok: false, reason: action + ' action requires query.fieldName.' };
  }

  return { ok: true };
}

function executeSheetUpdate(request) {
  var validation = validateSheetUpdaterRequest(request);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  var action = String(request.action).toLowerCase();
  if (action === 'insert') {
    appendRow(request.sheetName, request.row);
    return { inserted: 1, row: request.row };
  }

  if (action === 'update') {
    var updated = updateRowByField(
      request.sheetName,
      request.query.fieldName,
      request.query.fieldValue,
      request.row || {}
    );
    return { updated: updated ? 1 : 0, row: request.row || {} };
  }

  var deleted = deleteRowByField(
    request.sheetName,
    request.query.fieldName,
    request.query.fieldValue
  );
  return { deleted: deleted ? 1 : 0 };
}
