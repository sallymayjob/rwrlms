/** Spreadsheet data access layer. */

var IDEMPOTENCY_SHEET_NAME = 'Idempotency';
var IDEMPOTENCY_HEADERS = ['Key', 'CreatedAt', 'State', 'UserID', 'LessonID', 'Status', 'RequestID', 'ContextJSON'];

function getSpreadsheet() {
  const id = getScriptProperty(CONFIG.PROPERTIES.SHEET_ID);
  return SpreadsheetApp.openById(id);
}

function getSheetByName(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error('Missing sheet tab: ' + name);
  }
  return sheet;
}

function ensureIdempotencySheet() {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(IDEMPOTENCY_SHEET_NAME);
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(IDEMPOTENCY_SHEET_NAME);
  sheet.appendRow(IDEMPOTENCY_HEADERS);
  return sheet;
}

function readIdempotencyEntryByKey(key) {
  var sheet = ensureIdempotencySheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  var headers = values[0];
  var keyIdx = headers.indexOf('Key');
  if (keyIdx < 0) return null;

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(key)) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = values[r][i]; });
      obj.__rowNumber = r + 1;
      return obj;
    }
  }

  return null;
}

function appendIdempotencyEntry(rowObj) {
  var sheet = ensureIdempotencySheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  sheet.appendRow(row);
}

function getTableSchema(tableKey) {
  var tables = CONFIG.SCHEMA && CONFIG.SCHEMA.TABLES;
  if (!tables || !tables[tableKey]) {
    throw new Error('Unknown schema table key: ' + tableKey);
  }
  return tables[tableKey];
}

function resolveCanonicalColumnName(headers, candidates) {
  var headerList = headers || [];
  for (var i = 0; i < candidates.length; i++) {
    if (headerList.indexOf(candidates[i]) >= 0) return candidates[i];
  }
  return candidates[0] || '';
}

function resolveTableCanonicalColumns(tableKey) {
  var schema = getTableSchema(tableKey);
  var sheet = getSheetByName(schema.sheetName);
  var headerValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0] || [];
  var canonicalColumns = {};
  Object.keys(schema.canonicalKeys || {}).forEach(function (canonicalKey) {
    canonicalColumns[canonicalKey] = resolveCanonicalColumnName(headerValues, schema.canonicalKeys[canonicalKey]);
  });
  return canonicalColumns;
}

function getCanonicalValue(row, canonicalColumns, canonicalKey) {
  var columnName = canonicalColumns[canonicalKey];
  if (!columnName) return '';
  return row[columnName];
}

function findTableRowByCanonicalKey(tableKey, canonicalKey, value) {
  var schema = getTableSchema(tableKey);
  var rows = readTable(schema.sheetName);
  var canonicalColumns = resolveTableCanonicalColumns(tableKey);
  return rows.find(function (row) {
    return String(getCanonicalValue(row, canonicalColumns, canonicalKey)) === String(value);
  }) || null;
}

function findDuplicateRowByCanonicalValues(tableKey, keyValues) {
  var schema = getTableSchema(tableKey);
  var rows = readTable(schema.sheetName);
  var canonicalColumns = resolveTableCanonicalColumns(tableKey);

  return rows.find(function (row) {
    return Object.keys(keyValues || {}).every(function (canonicalKey) {
      return String(getCanonicalValue(row, canonicalColumns, canonicalKey)) === String(keyValues[canonicalKey]);
    });
  }) || null;
}

function buildTableRowFromCanonicalValues(tableKey, canonicalValues) {
  var canonicalColumns = resolveTableCanonicalColumns(tableKey);
  var row = {};
  Object.keys(canonicalValues || {}).forEach(function (canonicalKey) {
    var columnName = canonicalColumns[canonicalKey];
    if (columnName) {
      row[columnName] = canonicalValues[canonicalKey];
    }
  });
  return row;
}

function readLessonSubmissions() {
  return readTable(getTableSchema('LESSON_SUBMISSIONS').sheetName);
}

function createLessonSubmission(canonicalValues, duplicateCheckKeys) {
  var tableKey = 'LESSON_SUBMISSIONS';
  var schema = getTableSchema(tableKey);
  var duplicateKeys = duplicateCheckKeys || ['idempotencyKey'];
  var filterValues = {};
  duplicateKeys.forEach(function (k) {
    if (canonicalValues[k] !== undefined && canonicalValues[k] !== '') {
      filterValues[k] = canonicalValues[k];
    }
  });
  var existing = Object.keys(filterValues).length ? findDuplicateRowByCanonicalValues(tableKey, filterValues) : null;
  if (existing) {
    return { inserted: false, duplicate: true, row: existing };
  }

  var row = buildTableRowFromCanonicalValues(tableKey, canonicalValues);
  appendRow(schema.sheetName, row);
  return { inserted: true, duplicate: false, row: row };
}

function ensureTableWithHeaders(tableKey) {
  var schema = getTableSchema(tableKey);
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(schema.sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(schema.sheetName);
    var headers = [];
    Object.keys(schema.canonicalKeys || {}).forEach(function (k) {
      headers.push(schema.canonicalKeys[k][0]);
    });
    if (headers.length) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

function readQaRecords() {
  ensureTableWithHeaders('QA_RECORDS');
  return readTable(getTableSchema('QA_RECORDS').sheetName);
}

function createQaRecord(canonicalValues, duplicateCheckKeys) {
  ensureTableWithHeaders('QA_RECORDS');
  var tableKey = 'QA_RECORDS';
  var schema = getTableSchema(tableKey);
  var duplicateKeys = duplicateCheckKeys || ['idempotencyKey', 'submissionRecordId'];
  var filterValues = {};
  duplicateKeys.forEach(function (k) {
    if (canonicalValues[k] !== undefined && canonicalValues[k] !== '') {
      filterValues[k] = canonicalValues[k];
    }
  });
  var existing = Object.keys(filterValues).length ? findDuplicateRowByCanonicalValues(tableKey, filterValues) : null;
  if (existing) {
    return { inserted: false, duplicate: true, row: existing };
  }

  var row = buildTableRowFromCanonicalValues(tableKey, canonicalValues);
  appendRow(schema.sheetName, row);
  return { inserted: true, duplicate: false, row: row };
}

function readMetricsRecords() {
  ensureTableWithHeaders('METRICS');
  return readTable(getTableSchema('METRICS').sheetName);
}

function createMetricRecord(canonicalValues, duplicateCheckKeys) {
  ensureTableWithHeaders('METRICS');
  var tableKey = 'METRICS';
  var schema = getTableSchema(tableKey);
  var duplicateKeys = duplicateCheckKeys || ['idempotencyKey', 'metricName', 'operationId'];
  var filterValues = {};
  duplicateKeys.forEach(function (k) {
    if (canonicalValues[k] !== undefined && canonicalValues[k] !== '') {
      filterValues[k] = canonicalValues[k];
    }
  });
  var existing = Object.keys(filterValues).length ? findDuplicateRowByCanonicalValues(tableKey, filterValues) : null;
  if (existing) {
    return { inserted: false, duplicate: true, row: existing };
  }

  var row = buildTableRowFromCanonicalValues(tableKey, canonicalValues);
  appendRow(schema.sheetName, row);
  return { inserted: true, duplicate: false, row: row };
}

function readSlackThreads() {
  ensureTableWithHeaders('SLACK_THREADS');
  return readTable(getTableSchema('SLACK_THREADS').sheetName);
}

function createSlackThreadRecord(canonicalValues, duplicateCheckKeys) {
  ensureTableWithHeaders('SLACK_THREADS');
  var tableKey = 'SLACK_THREADS';
  var schema = getTableSchema(tableKey);
  var duplicateKeys = duplicateCheckKeys || ['channelId', 'threadTs'];
  var filterValues = {};
  duplicateKeys.forEach(function (k) {
    if (canonicalValues[k] !== undefined && canonicalValues[k] !== '') {
      filterValues[k] = canonicalValues[k];
    }
  });
  var existing = Object.keys(filterValues).length ? findDuplicateRowByCanonicalValues(tableKey, filterValues) : null;
  if (existing) {
    return { inserted: false, duplicate: true, row: existing };
  }

  var row = buildTableRowFromCanonicalValues(tableKey, canonicalValues);
  appendRow(schema.sheetName, row);
  return { inserted: true, duplicate: false, row: row };
}

function readTable(name) {
  const sheet = getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  return values.slice(1).filter(function (row) {
    return row.join('').trim() !== '';
  }).map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(name, rowObj) {
  const sheet = getSheetByName(name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  sheet.appendRow(row);
}

function replaceSheetData(name, rows, headers) {
  const sheet = getSheetByName(name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    const values = rows.map(function (row) {
      return headers.map(function (h) { return row[h] || ''; });
    });
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function updateRowByField(name, fieldName, fieldValue, updates) {
  const sheet = getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  const headers = values[0];
  const keyIdx = headers.indexOf(fieldName);
  assert(keyIdx >= 0, 'Field not found: ' + fieldName);

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(fieldValue)) {
      Object.keys(updates).forEach(function (key) {
        const col = headers.indexOf(key);
        if (col >= 0) values[r][col] = updates[key];
      });
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([values[r]]);
      return true;
    }
  }
  return false;
}

function deleteRowByField(name, fieldName, fieldValue) {
  const sheet = getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;
  const headers = values[0];
  const idx = headers.indexOf(fieldName);
  assert(idx >= 0, 'Field not found: ' + fieldName);

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idx]) === String(fieldValue)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}
