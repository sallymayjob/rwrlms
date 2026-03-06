/** Spreadsheet data access layer. */

var IDEMPOTENCY_SHEET_NAME = 'Idempotency';
var IDEMPOTENCY_HEADERS = ['Key', 'CreatedAt', 'State', 'UserID', 'LessonID', 'Status', 'RequestID', 'ContextJSON'];

var TABLE_SCHEMAS = {
  Courses: {
    headers: ['CourseID', 'CourseTitle', 'MonthIDs', 'TotalMonths', 'TotalLessons', 'PublishedLessons', 'CompletionRate', 'AvgQAScore', 'Status', 'Description', 'DifficultyRange', 'LastUpdated'],
    requiredHeaders: ['CourseID', 'CourseTitle', 'Status']
  },
  Modules: {
    headers: ['ModuleID', 'ModuleTitle', 'CourseID', 'ModuleNumber', 'WeekIDs', 'LessonIDs', 'TotalLessons', 'PublishedLessons', 'DraftLessons', 'NeedsRevision', 'AvgQAScore', 'QA_PassRate', 'Status', 'ThemeDescription', 'DifficultyTier', 'LastUpdated'],
    requiredHeaders: ['ModuleID', 'CourseID', 'Status']
  },
  Lessons: {
    headers: ['LessonID', 'Title', 'Module', 'Week', 'Lesson', 'Type', 'Status', 'Topic', 'Objective', 'Hook', 'CoreContent', 'Insight', 'Takeaway', 'Mission', 'Difficulty', 'TonePreset', 'WordCount', 'ToolsRequired', 'AlternativePath', 'ContinuityNotes', 'MediaRequired', 'MediaBrief', 'BrandComplianceScore', 'PEDFlags', 'GoldenExample'],
    requiredHeaders: ['LessonID', 'Module', 'Status', 'Topic']
  },
  Learners: {
    headers: ['UserID', 'Name', 'Email', 'CourseID', 'CurrentModule', 'Progress', 'Status', 'JoinedDate'],
    requiredHeaders: ['UserID', 'Name', 'CourseID', 'Status']
  },
  Submissions: {
    headers: ['SubmissionID', 'UserID', 'LessonID', 'Timestamp', 'Score', 'Status', 'Method'],
    requiredHeaders: ['SubmissionID', 'UserID', 'LessonID', 'Status']
  },
  Logs: {
    headers: ['Timestamp', 'Level', 'EventType', 'UserID', 'Command', 'Message', 'ContextJSON'],
    requiredHeaders: ['Timestamp', 'Level', 'EventType', 'Message']
  }
};

function getSpreadsheet() {
  const id = getScriptProperty(CONFIG.PROPERTIES.SHEET_ID);
  return SpreadsheetApp.openById(id);
}

function makeDatabaseError(code, message, details) {
  var err = new Error(message);
  err.name = 'DatabaseError';
  err.code = code;
  err.details = details || {};
  return err;
}

function throwDatabaseError(code, message, details) {
  throw makeDatabaseError(code, message, details);
}

function normalizeHeaderValue(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
}

function isBlankCell(value) {
  return value === '' || value === null || value === undefined;
}

function coerceCell(value) {
  return isBlankCell(value) ? '' : value;
}

function buildNormalizedHeaderMap(headers) {
  var map = {};
  headers.forEach(function (header, idx) {
    map[normalizeHeaderValue(header)] = { index: idx, header: header };
  });
  return map;
}

function normalizeTableSchema(tableName, schema) {
  var source = schema || TABLE_SCHEMAS[tableName] || {};
  var headers = source.headers || [];
  var requiredHeaders = source.requiredHeaders || headers;
  var optionalHeaders = source.optionalHeaders || headers.filter(function (header) {
    return requiredHeaders.indexOf(header) < 0;
  });
  var aliases = source.aliases || {};

  var logicalToCanonical = {};
  headers.forEach(function (header) {
    logicalToCanonical[normalizeHeaderValue(header)] = header;
  });

  Object.keys(aliases).forEach(function (logicalKey) {
    logicalToCanonical[normalizeHeaderValue(logicalKey)] = aliases[logicalKey];
  });

  return {
    tableName: tableName,
    headers: headers,
    requiredHeaders: requiredHeaders,
    optionalHeaders: optionalHeaders,
    logicalToCanonical: logicalToCanonical
  };
}

function resolveSheetWithHeaders(tableName, schema, options) {
  var opts = options || {};
  var sheet = getSpreadsheet().getSheetByName(tableName);
  if (!sheet) {
    throwDatabaseError('MISSING_TAB', 'Missing sheet tab: ' + tableName, { tableName: tableName });
  }

  var lastColumn = sheet.getLastColumn();
  if (lastColumn <= 0) {
    throwDatabaseError('EMPTY_TAB', 'Sheet has no header row: ' + tableName, { tableName: tableName });
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 0) {
    throwDatabaseError('EMPTY_TAB', 'Sheet is empty: ' + tableName, { tableName: tableName });
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  if (headers.every(function (header) { return normalizeHeaderValue(header) === ''; })) {
    throwDatabaseError('EMPTY_TAB', 'Sheet header row is blank: ' + tableName, { tableName: tableName });
  }

  var normalizedSchema = normalizeTableSchema(tableName, schema);
  var headerMap = buildNormalizedHeaderMap(headers);

  var missingRequiredHeaders = normalizedSchema.requiredHeaders.filter(function (requiredHeader) {
    return !headerMap[normalizeHeaderValue(requiredHeader)];
  });

  if (missingRequiredHeaders.length > 0) {
    throwDatabaseError('MISSING_REQUIRED_HEADERS', 'Missing required header(s) for ' + tableName + ': ' + missingRequiredHeaders.join(', '), {
      tableName: tableName,
      missingRequiredHeaders: missingRequiredHeaders,
      requiredHeaders: normalizedSchema.requiredHeaders,
      actualHeaders: headers
    });
  }

  if (opts.checkWriteFields && opts.writeFields && opts.writeFields.length) {
    var invalidWriteFields = opts.writeFields.filter(function (field) {
      var canonical = normalizedSchema.logicalToCanonical[normalizeHeaderValue(field)] || field;
      return !headerMap[normalizeHeaderValue(canonical)];
    });

    if (invalidWriteFields.length > 0) {
      throwDatabaseError('INVALID_WRITE_FIELDS', 'Invalid write field(s) for ' + tableName + ': ' + invalidWriteFields.join(', '), {
        tableName: tableName,
        invalidWriteFields: invalidWriteFields,
        actualHeaders: headers
      });
    }
  }

  return {
    sheet: sheet,
    headers: headers,
    headerMap: headerMap,
    schema: normalizedSchema
  };
}

function getSheetByName(name) {
  return resolveSheetWithHeaders(name).sheet;
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

function readTable(tableName, schema) {
  var resolved = resolveSheetWithHeaders(tableName, schema);
  var values = resolved.sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var schemaHeaders = resolved.schema.headers.length ? resolved.schema.headers : resolved.headers;

  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return !isBlankCell(cell); });
  }).map(function (row) {
    var obj = {};
    schemaHeaders.forEach(function (canonicalHeader) {
      var mapEntry = resolved.headerMap[normalizeHeaderValue(canonicalHeader)];
      if (!mapEntry) {
        if (resolved.schema.optionalHeaders.indexOf(canonicalHeader) >= 0) {
          obj[canonicalHeader] = '';
          return;
        }

        throwDatabaseError('MISSING_REQUIRED_HEADERS', 'Missing required header while reading ' + tableName + ': ' + canonicalHeader, {
          tableName: tableName,
          missingRequiredHeaders: [canonicalHeader],
          requiredHeaders: resolved.schema.requiredHeaders,
          actualHeaders: resolved.headers
        });
      }

      obj[canonicalHeader] = coerceCell(row[mapEntry.index]);
    });
    return obj;
  });
}

function appendRow(tableName, rowObj, schema) {
  var writeFields = Object.keys(rowObj || {});
  var resolved = resolveSheetWithHeaders(tableName, schema, {
    checkWriteFields: true,
    writeFields: writeFields
  });

  var row = resolved.headers.map(function (actualHeader) {
    var canonicalHeader = resolved.schema.logicalToCanonical[normalizeHeaderValue(actualHeader)] || actualHeader;
    if (rowObj[canonicalHeader] !== undefined) return coerceCell(rowObj[canonicalHeader]);
    if (rowObj[actualHeader] !== undefined) return coerceCell(rowObj[actualHeader]);
    return '';
  });
  resolved.sheet.appendRow(row);
}

function replaceSheetData(tableName, rows, headers, schema) {
  var schemaOverride = schema || { headers: headers, requiredHeaders: headers };
  var writeFields = headers || [];
  var resolved = resolveSheetWithHeaders(tableName, schemaOverride, {
    checkWriteFields: true,
    writeFields: writeFields
  });

  var canonicalHeaders = resolved.schema.headers.length ? resolved.schema.headers : headers;
  resolved.sheet.clearContents();
  resolved.sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);

  if (rows.length) {
    var values = rows.map(function (row) {
      return canonicalHeaders.map(function (canonicalHeader) {
        if (row[canonicalHeader] !== undefined) return coerceCell(row[canonicalHeader]);
        var mappedHeader = resolved.schema.logicalToCanonical[normalizeHeaderValue(canonicalHeader)] || canonicalHeader;
        if (row[mappedHeader] !== undefined) return coerceCell(row[mappedHeader]);
        return '';
      });
    });
    resolved.sheet.getRange(2, 1, values.length, canonicalHeaders.length).setValues(values);
  }
}

function updateRowByField(tableName, fieldName, fieldValue, updates, schema) {
  var resolved = resolveSheetWithHeaders(tableName, schema, {
    checkWriteFields: true,
    writeFields: [fieldName]
  });
  var values = resolved.sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  var keyCanonical = resolved.schema.logicalToCanonical[normalizeHeaderValue(fieldName)] || fieldName;
  var keyMapEntry = resolved.headerMap[normalizeHeaderValue(keyCanonical)];
  if (!keyMapEntry) {
    throwDatabaseError('INVALID_WRITE_FIELDS', 'Field not found for update in ' + tableName + ': ' + fieldName, {
      tableName: tableName,
      invalidWriteFields: [fieldName],
      actualHeaders: resolved.headers
    });
  }

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyMapEntry.index]) === String(fieldValue)) {
      var warnings = [];
      Object.keys(updates || {}).forEach(function (logicalKey) {
        var canonicalKey = resolved.schema.logicalToCanonical[normalizeHeaderValue(logicalKey)];
        if (!canonicalKey) {
          warnings.push('Unknown logical field skipped: ' + logicalKey);
          return;
        }

        var mapEntry = resolved.headerMap[normalizeHeaderValue(canonicalKey)];
        if (!mapEntry) {
          warnings.push('Mapped field missing in sheet, skipped: ' + logicalKey + ' -> ' + canonicalKey);
          return;
        }

        values[r][mapEntry.index] = coerceCell(updates[logicalKey]);
      });

      if (warnings.length > 0) {
        Logger.log('updateRowByField warnings (%s): %s', tableName, warnings.join(' | '));
      }

      resolved.sheet.getRange(r + 1, 1, 1, resolved.headers.length).setValues([values[r]]);
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
  const index = validateRequiredHeaders(headers, name);
  const idx = resolveFieldIndex(index, fieldName);
  assert(idx >= 0, 'Field not found: ' + fieldName + ' in table ' + name);

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idx]) === String(fieldValue)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

function resolveFieldIndex(index, fieldName) {
  if (!index) return -1;
  if (index.logicalToIndex[fieldName] !== undefined) return index.logicalToIndex[fieldName];

  var normalized = normalizeHeader(fieldName);
  if (normalized === '') return -1;

  var header = index.headers.find(function (h) { return normalizeHeader(h) === normalized; });
  if (header !== undefined && index.headerToIndex[header] !== undefined) {
    return index.headerToIndex[header];
  }

  var logicalField = Object.keys(index.logicalToHeader).find(function (key) {
    return normalizeHeader(index.logicalToHeader[key]) === normalized;
  });
  if (logicalField && index.logicalToIndex[logicalField] !== undefined) {
    return index.logicalToIndex[logicalField];
  }

  return -1;
}
