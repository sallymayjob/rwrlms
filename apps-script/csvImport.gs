/** CSV ingestion routines from Google Drive (schema-driven across datasets). */

var CSV_IMPORT_SCHEMAS = {
  lessons: {
    dataset: 'lessons',
    label: 'Lessons',
    sheetName: CONFIG.SHEET_NAMES.LESSONS,
    fileProperty: CONFIG.PROPERTIES.LESSON_CSV_FILE_ID,
    approval: {
      fileIdProperty: CONFIG.PROPERTIES.LESSON_CSV_APPROVED_FILE_ID,
      checksumProperty: CONFIG.PROPERTIES.LESSON_CSV_APPROVED_CHECKSUM,
      approvedAtProperty: CONFIG.PROPERTIES.LESSON_CSV_APPROVED_AT,
      approvedByProperty: CONFIG.PROPERTIES.LESSON_CSV_APPROVED_BY
    },
    keyField: 'LessonID',
    keyRegex: CONFIG.LESSON_ID_REGEX,
    requiredHeaders: ['LessonID', 'Title', 'Module', 'Status', 'Hook', 'CoreContent', 'Takeaway', 'Mission'],
    optionalHeaders: [
      'Week', 'Lesson', 'Type', 'Topic', 'Objective', 'Insight', 'Difficulty', 'TonePreset', 'WordCount',
      'ToolsRequired', 'AlternativePath', 'ContinuityNotes', 'MediaRequired', 'MediaBrief',
      'BrandComplianceScore', 'PEDFlags', 'GoldenExample'
    ],
    aliases: {
      lesson_id: 'LessonID',
      lessonid: 'LessonID',
      lesson_title: 'Title',
      moduleid: 'Module',
      module_id: 'Module',
      core_content: 'CoreContent'
    },
    requiredFields: ['LessonID', 'Title', 'Module', 'Status', 'Hook', 'CoreContent', 'Takeaway', 'Mission'],
    statusField: 'Status',
    allowedStatuses: ['active', 'draft', 'archived', 'needs_revision'],
    linkage: [
      {
        field: 'Module',
        table: CONFIG.SHEET_NAMES.MODULES,
        tableKeyField: 'ModuleID',
        keyRegex: /^M\d{2}-W\d{2}$/
      }
    ]
  },
  modules: {
    dataset: 'modules',
    label: 'Modules',
    sheetName: CONFIG.SHEET_NAMES.MODULES,
    fileProperty: CONFIG.PROPERTIES.MODULE_CSV_FILE_ID,
    approval: {
      fileIdProperty: CONFIG.PROPERTIES.MODULE_CSV_APPROVED_FILE_ID,
      checksumProperty: CONFIG.PROPERTIES.MODULE_CSV_APPROVED_CHECKSUM,
      approvedAtProperty: CONFIG.PROPERTIES.MODULE_CSV_APPROVED_AT,
      approvedByProperty: CONFIG.PROPERTIES.MODULE_CSV_APPROVED_BY
    },
    keyField: 'ModuleID',
    keyRegex: /^M\d{2}-W\d{2}$/,
    requiredHeaders: ['ModuleID', 'ModuleTitle', 'CourseID', 'Status'],
    optionalHeaders: [
      'ModuleNumber', 'WeekIDs', 'LessonIDs', 'TotalLessons', 'PublishedLessons', 'DraftLessons',
      'NeedsRevision', 'AvgQAScore', 'QA_PassRate', 'ThemeDescription', 'DifficultyTier', 'LastUpdated'
    ],
    aliases: {
      module_id: 'ModuleID',
      moduletitle: 'ModuleTitle',
      course_id: 'CourseID'
    },
    requiredFields: ['ModuleID', 'ModuleTitle', 'CourseID', 'Status'],
    statusField: 'Status',
    allowedStatuses: ['active', 'draft', 'archived', 'needs_revision'],
    linkage: [
      {
        field: 'CourseID',
        table: CONFIG.SHEET_NAMES.COURSES,
        tableKeyField: 'CourseID',
        keyRegex: /^C\d{2}$/
      }
    ]
  },
  courses: {
    dataset: 'courses',
    label: 'Courses',
    sheetName: CONFIG.SHEET_NAMES.COURSES,
    fileProperty: CONFIG.PROPERTIES.COURSE_CSV_FILE_ID,
    approval: {
      fileIdProperty: CONFIG.PROPERTIES.COURSE_CSV_APPROVED_FILE_ID,
      checksumProperty: CONFIG.PROPERTIES.COURSE_CSV_APPROVED_CHECKSUM,
      approvedAtProperty: CONFIG.PROPERTIES.COURSE_CSV_APPROVED_AT,
      approvedByProperty: CONFIG.PROPERTIES.COURSE_CSV_APPROVED_BY
    },
    keyField: 'CourseID',
    keyRegex: /^C\d{2}$/,
    requiredHeaders: ['CourseID', 'CourseTitle', 'Status'],
    optionalHeaders: [
      'MonthIDs', 'TotalMonths', 'TotalLessons', 'PublishedLessons', 'CompletionRate', 'AvgQAScore',
      'Description', 'DifficultyRange', 'LastUpdated'
    ],
    aliases: {
      course_id: 'CourseID',
      title: 'CourseTitle'
    },
    requiredFields: ['CourseID', 'CourseTitle', 'Status'],
    statusField: 'Status',
    allowedStatuses: ['active', 'draft', 'archived', 'needs_revision']
  },
  learners: {
    dataset: 'learners',
    label: 'Learners',
    sheetName: CONFIG.SHEET_NAMES.LEARNERS,
    fileProperty: CONFIG.PROPERTIES.LEARNER_CSV_FILE_ID,
    approval: {
      fileIdProperty: CONFIG.PROPERTIES.LEARNER_CSV_APPROVED_FILE_ID,
      checksumProperty: CONFIG.PROPERTIES.LEARNER_CSV_APPROVED_CHECKSUM,
      approvedAtProperty: CONFIG.PROPERTIES.LEARNER_CSV_APPROVED_AT,
      approvedByProperty: CONFIG.PROPERTIES.LEARNER_CSV_APPROVED_BY
    },
    keyField: 'UserID',
    keyRegex: /^U[0-9A-Za-z_-]+$/,
    requiredHeaders: ['UserID', 'Name', 'Email', 'CourseID', 'Status'],
    optionalHeaders: ['CurrentModule', 'Progress', 'JoinedDate'],
    aliases: {
      user_id: 'UserID',
      learnerid: 'UserID',
      full_name: 'Name',
      course_id: 'CourseID'
    },
    requiredFields: ['UserID', 'Name', 'Email', 'CourseID', 'Status'],
    statusField: 'Status',
    allowedStatuses: ['active', 'inactive', 'completed', 'paused'],
    linkage: [
      {
        field: 'CourseID',
        table: CONFIG.SHEET_NAMES.COURSES,
        tableKeyField: 'CourseID',
        keyRegex: /^C\d{2}$/
      }
    ]
  },
  submissions: {
    dataset: 'submissions',
    label: 'Submissions',
    sheetName: CONFIG.SHEET_NAMES.SUBMISSIONS,
    fileProperty: CONFIG.PROPERTIES.SUBMISSION_CSV_FILE_ID,
    approval: {
      fileIdProperty: CONFIG.PROPERTIES.SUBMISSION_CSV_APPROVED_FILE_ID,
      checksumProperty: CONFIG.PROPERTIES.SUBMISSION_CSV_APPROVED_CHECKSUM,
      approvedAtProperty: CONFIG.PROPERTIES.SUBMISSION_CSV_APPROVED_AT,
      approvedByProperty: CONFIG.PROPERTIES.SUBMISSION_CSV_APPROVED_BY
    },
    keyField: 'SubmissionID',
    keyRegex: /^S[0-9A-Za-z_-]+$/,
    requiredHeaders: ['SubmissionID', 'UserID', 'LessonID', 'Timestamp', 'Status'],
    optionalHeaders: ['Score', 'Method'],
    aliases: {
      submission_id: 'SubmissionID',
      user_id: 'UserID',
      lesson_id: 'LessonID',
      submitted_at: 'Timestamp'
    },
    requiredFields: ['SubmissionID', 'UserID', 'LessonID', 'Timestamp', 'Status'],
    statusField: 'Status',
    allowedStatuses: ['submitted', 'graded', 'needs_revision', 'rejected'],
    linkage: [
      {
        field: 'UserID',
        table: CONFIG.SHEET_NAMES.LEARNERS,
        tableKeyField: 'UserID',
        keyRegex: /^U[0-9A-Za-z_-]+$/
      },
      {
        field: 'LessonID',
        table: CONFIG.SHEET_NAMES.LESSONS,
        tableKeyField: 'LessonID',
        keyRegex: CONFIG.LESSON_ID_REGEX
      }
    ]
  }
};

function importLessonsCSV() { return importDatasetCSV('lessons'); }
function validateLessonsCSVForReview() { return validateDatasetCSVForReview('lessons'); }
function approveLessonsCSVImport(approvedBy) { return approveDatasetCSVImport('lessons', approvedBy); }

function importCoursesCSV() { return importDatasetCSV('courses'); }
function validateCoursesCSVForReview() { return validateDatasetCSVForReview('courses'); }
function approveCoursesCSVImport(approvedBy) { return approveDatasetCSVImport('courses', approvedBy); }

function importModulesCSV() { return importDatasetCSV('modules'); }
function validateModulesCSVForReview() { return validateDatasetCSVForReview('modules'); }
function approveModulesCSVImport(approvedBy) { return approveDatasetCSVImport('modules', approvedBy); }

function importLearnersCSV() { return importDatasetCSV('learners'); }
function validateLearnersCSVForReview() { return validateDatasetCSVForReview('learners'); }
function approveLearnersCSVImport(approvedBy) { return approveDatasetCSVImport('learners', approvedBy); }

function importSubmissionsCSV() { return importDatasetCSV('submissions'); }
function validateSubmissionsCSVForReview() { return validateDatasetCSVForReview('submissions'); }
function approveSubmissionsCSVImport(approvedBy) { return approveDatasetCSVImport('submissions', approvedBy); }

function importDatasetCSV(dataset) {
  var schema = getCsvDatasetSchema(dataset);
  return withErrorGuard('importDatasetCSV:' + schema.dataset, function () {
    var fileId = getScriptProperty(schema.fileProperty);
    var approvedFileId = getScriptProperty(schema.approval.fileIdProperty);
    var approvedChecksum = getScriptProperty(schema.approval.checksumProperty);

    assert(
      String(fileId) === String(approvedFileId),
      'Import blocked: uploaded file has not been explicitly approved. Run approve' + schema.label + 'CSVImport().'
    );

    var parsed = parseDatasetCsvFile(schema, fileId);
    var checksum = checksumCsvRows(parsed.rows);
    assert(
      checksum === approvedChecksum,
      'Import blocked: file contents changed after approval. Re-run validate' + schema.label + 'CSVForReview() and approve' + schema.label + 'CSVImport().'
    );

    replaceSheetData(schema.sheetName, parsed.objects, parsed.outputHeaders);
    logEvent('IMPORT_' + schema.dataset.toUpperCase() + '_CSV', schema.label + ' CSV imported', {
      dataset: schema.dataset,
      sheetName: schema.sheetName,
      fileId: fileId,
      rows: parsed.objects.length,
      checksum: checksum,
      approvedAt: getOptionalScriptProperty(schema.approval.approvedAtProperty, ''),
      approvedBy: getOptionalScriptProperty(schema.approval.approvedByProperty, '')
    });

    return {
      imported: true,
      dataset: schema.dataset,
      sheetName: schema.sheetName,
      rows: parsed.objects.length,
      checksum: checksum
    };
  });
}

function validateDatasetCSVForReview(dataset) {
  var schema = getCsvDatasetSchema(dataset);
  return withErrorGuard('validateDatasetCSVForReview:' + schema.dataset, function () {
    var fileId = getScriptProperty(schema.fileProperty);
    var parsed = parseDatasetCsvFile(schema, fileId);
    var report = validateDatasetCsvRows(schema, parsed);

    logEvent(schema.dataset.toUpperCase() + '_CSV_VALIDATION_REPORT', schema.label + ' CSV validator report generated', {
      dataset: schema.dataset,
      fileId: fileId,
      rows: report.rowCount,
      errorCount: report.summary.errorCount,
      warningCount: report.summary.warningCount,
      canImport: report.canImport
    });

    return {
      workflow: {
        dataset: schema.dataset,
        step: 'validator_report_posted',
        nextStep: report.canImport
          ? 'human_approval_required_before_replaceSheetData'
          : 'csv_fix_required_before_human_approval'
      },
      report: report
    };
  });
}

function approveDatasetCSVImport(dataset, approvedBy) {
  var schema = getCsvDatasetSchema(dataset);
  return withErrorGuard('approveDatasetCSVImport:' + schema.dataset, function () {
    var fileId = getScriptProperty(schema.fileProperty);
    var parsed = parseDatasetCsvFile(schema, fileId);
    var report = validateDatasetCsvRows(schema, parsed);
    assert(report.canImport, 'Approval blocked: validator has errors. Fix CSV and rerun validation.');

    var checksum = checksumCsvRows(parsed.rows);
    var actor = normalizeWhitespace(approvedBy) || Session.getActiveUser().getEmail() || 'unknown';
    var approvedAt = nowISO();

    var props = PropertiesService.getScriptProperties();
    props.setProperty(schema.approval.fileIdProperty, String(fileId));
    props.setProperty(schema.approval.checksumProperty, checksum);
    props.setProperty(schema.approval.approvedAtProperty, approvedAt);
    props.setProperty(schema.approval.approvedByProperty, actor);

    logEvent(schema.dataset.toUpperCase() + '_CSV_APPROVED', schema.label + ' CSV approved for import', {
      dataset: schema.dataset,
      fileId: fileId,
      checksum: checksum,
      approvedAt: approvedAt,
      approvedBy: actor
    });

    return {
      approved: true,
      dataset: schema.dataset,
      fileId: fileId,
      checksum: checksum,
      approvedAt: approvedAt,
      approvedBy: actor,
      nextStep: 'run_import' + schema.label + 'CSV'
    };
  });
}

function parseLessonsCsvFile(fileId) {
  return parseDatasetCsvFile(getCsvDatasetSchema('lessons'), fileId);
}

function validateLessonsCsvRows(headers, rows) {
  var schema = getCsvDatasetSchema('lessons');
  var mapped = mapHeadersToCanonicalFields(schema, headers);
  return validateDatasetCsvRows(schema, {
    rawHeaders: headers,
    outputHeaders: mapped.outputHeaders,
    headerMap: mapped.headerMap,
    objects: rows
  });
}

function getCsvDatasetSchema(dataset) {
  var key = normalizeWhitespace(dataset).toLowerCase();
  var schema = CSV_IMPORT_SCHEMAS[key];
  assert(schema, 'Unsupported CSV dataset: ' + dataset + '. Supported: ' + Object.keys(CSV_IMPORT_SCHEMAS).join(', '));
  return schema;
}

function parseDatasetCsvFile(schema, fileId) {
  var file = DriveApp.getFileById(fileId);
  var csv = file.getBlob().getDataAsString();
  var rows = Utilities.parseCsv(csv);

  assert(rows.length > 1, schema.label + ' CSV must include header and at least one data row.');

  var rawHeaders = rows[0].map(function (header) { return normalizeWhitespace(header); });
  var mapped = mapHeadersToCanonicalFields(schema, rawHeaders);

  var objects = rows.slice(1)
    .filter(function (r) { return r.join('').trim() !== ''; })
    .map(function (r) {
      var obj = {};
      mapped.outputHeaders.forEach(function (canonicalHeader) {
        var columnIndex = mapped.headerMap[canonicalHeader];
        obj[canonicalHeader] = normalizeWhitespace(r[columnIndex]);
      });
      return obj;
    });

  return {
    file: file,
    rows: rows,
    rawHeaders: rawHeaders,
    outputHeaders: mapped.outputHeaders,
    headerMap: mapped.headerMap,
    objects: objects
  };
}

function mapHeadersToCanonicalFields(schema, rawHeaders) {
  var canonicalLookup = {};
  var aliasLookup = {};

  schema.requiredHeaders.concat(schema.optionalHeaders || []).forEach(function (header) {
    canonicalLookup[normalizeHeaderToken(header)] = header;
  });

  Object.keys(schema.aliases || {}).forEach(function (alias) {
    aliasLookup[normalizeHeaderToken(alias)] = schema.aliases[alias];
  });

  var headerMap = {};
  var unknownCriticalHeaders = [];
  var duplicateCanonicalHeaders = [];

  rawHeaders.forEach(function (header, idx) {
    var token = normalizeHeaderToken(header);
    var canonical = canonicalLookup[token] || aliasLookup[token] || null;
    if (!canonical) {
      if (token) unknownCriticalHeaders.push(header);
      return;
    }
    if (headerMap[canonical] !== undefined) {
      duplicateCanonicalHeaders.push(canonical);
      return;
    }
    headerMap[canonical] = idx;
  });

  var outputHeaders = schema.requiredHeaders.concat(schema.optionalHeaders || []);

  return {
    headerMap: headerMap,
    outputHeaders: outputHeaders,
    unknownCriticalHeaders: unknownCriticalHeaders,
    duplicateCanonicalHeaders: duplicateCanonicalHeaders
  };
}

function validateDatasetCsvRows(schema, parsed) {
  var mapped = mapHeadersToCanonicalFields(schema, parsed.rawHeaders || []);
  var headerMap = parsed.headerMap || mapped.headerMap;
  var errors = [];
  var warnings = [];
  var seenKeys = {};

  schema.requiredHeaders.forEach(function (requiredHeader) {
    if (headerMap[requiredHeader] === undefined) {
      errors.push(makeCsvValidationIssue(schema.sheetName, 'header', '', requiredHeader, 'missing_required_header', 'Missing required header `' + requiredHeader + '`.'));
    }
  });

  mapped.unknownCriticalHeaders.forEach(function (header) {
    errors.push(makeCsvValidationIssue(schema.sheetName, 'header', '', header, 'unknown_critical_header', 'Unknown header `' + header + '` is not recognized by schema/aliases.'));
  });

  mapped.duplicateCanonicalHeaders.forEach(function (canonical) {
    errors.push(makeCsvValidationIssue(schema.sheetName, 'header', '', canonical, 'duplicate_header_mapping', 'Multiple headers map to canonical field `' + canonical + '`.'));
  });

  var linkageIndex = buildLinkageIndex(schema.linkage || []);
  var rowObjects = parsed.objects || [];
  rowObjects.forEach(function (row, rowIndex) {
    var rowNumber = rowIndex + 2;
    var keyField = schema.keyField;
    var keyValue = normalizeWhitespace(row[keyField]);

    if (!keyValue) {
      errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, keyField, 'missing_required_value', keyField + ' is required.'));
    } else {
      if (schema.keyRegex && !schema.keyRegex.test(keyValue)) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, keyField, 'malformed_key', keyField + ' must match `' + schema.keyRegex + '`.'));
      }
      if (seenKeys[keyValue]) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, keyField, 'duplicate_key_row', 'Duplicate ' + keyField + ' `' + keyValue + '` found (first seen at row ' + seenKeys[keyValue] + ').'));
      } else {
        seenKeys[keyValue] = rowNumber;
      }
    }

    (schema.requiredFields || []).forEach(function (field) {
      if (!normalizeWhitespace(row[field])) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, field, 'missing_required_value', field + ' is required.'));
      }
    });

    var statusField = schema.statusField;
    if (statusField) {
      var status = normalizeWhitespace(row[statusField]).toLowerCase();
      if (status && schema.allowedStatuses && schema.allowedStatuses.indexOf(status) < 0) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, statusField, 'invalid_status', statusField + ' `' + status + '` is invalid. Allowed: ' + schema.allowedStatuses.join(', ') + '.'));
      }
    }

    (schema.linkage || []).forEach(function (link) {
      var linkValue = normalizeWhitespace(row[link.field]);
      if (!linkValue) return;

      if (link.keyRegex && !link.keyRegex.test(linkValue)) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, link.field, 'malformed_linkage_key', link.field + ' `' + linkValue + '` must match `' + link.keyRegex + '`.'));
        return;
      }

      var linkSet = linkageIndex[link.field] || {};
      if (!linkSet[linkValue]) {
        errors.push(makeCsvValidationIssue(schema.sheetName, 'row', rowNumber, link.field, 'missing_linkage', link.field + ' `' + linkValue + '` does not exist in ' + link.table + '.'));
      }
    });
  });

  if (!rowObjects.length) {
    errors.push(makeCsvValidationIssue(schema.sheetName, 'row', '', '', 'missing_data_rows', 'No data rows found in CSV.'));
  }

  return {
    dataset: schema.dataset,
    table: schema.sheetName,
    rowCount: rowObjects.length,
    requiredHeaders: schema.requiredHeaders,
    optionalHeaders: schema.optionalHeaders || [],
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length
    },
    errors: errors,
    warnings: warnings,
    canImport: errors.length === 0,
    operatorReport: errors.concat(warnings).map(function (issue) {
      return {
        table: issue.table,
        header: issue.scope === 'header' ? issue.field : '',
        row: issue.row,
        field: issue.field,
        code: issue.code,
        message: issue.message
      };
    })
  };
}

function buildLinkageIndex(linkageRules) {
  var index = {};
  linkageRules.forEach(function (link) {
    var values = readTable(link.table).map(function (row) {
      return normalizeWhitespace(row[link.tableKeyField]);
    }).filter(function (value) {
      return value !== '';
    });

    var valueSet = {};
    values.forEach(function (value) { valueSet[value] = true; });
    index[link.field] = valueSet;
  });
  return index;
}

function makeCsvValidationIssue(table, scope, row, field, code, message) {
  return {
    table: table,
    scope: scope,
    row: row,
    field: field,
    code: code,
    message: message
  };
}

function checksumLessonsRows(rows) {
  return checksumCsvRows(rows);
}

function checksumCsvRows(rows) {
  var normalized = rows.map(function (row) {
    return row.map(function (value) {
      return normalizeWhitespace(value);
    }).join('|');
  }).join('\n');

  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalized, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function normalizeHeaderToken(header) {
  return normalizeWhitespace(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}
