/** CSV ingestion routines from Google Drive. */

var LESSONS_REQUIRED_HEADERS = [
  'LessonID',
  'Title',
  'Module',
  'Status',
  'Hook',
  'CoreContent',
  'Takeaway',
  'Mission'
];

var LESSONS_ALLOWED_STATUS = ['active', 'draft', 'archived', 'needs_revision'];

function importLessonsCSV() {
  return withErrorGuard('importLessonsCSV', function () {
    var fileId = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_FILE_ID);
    var approvedFileId = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_FILE_ID);
    var approvedChecksum = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_CHECKSUM);

    assert(
      String(fileId) === String(approvedFileId),
      'Import blocked: uploaded file has not been explicitly approved. Run approveLessonsCSVImport().'
    );

    var parsed = parseLessonsCsvFile(fileId);
    var checksum = checksumLessonsRows(parsed.rows);
    assert(
      checksum === approvedChecksum,
      'Import blocked: file contents changed after approval. Re-run validateLessonsCSVForReview() and approveLessonsCSVImport().'
    );

    replaceSheetData(CONFIG.SHEET_NAMES.LESSONS, parsed.objects, parsed.headers);
    logEvent('IMPORT_LESSONS_CSV', 'Lessons CSV imported', {
      fileId: fileId,
      rows: parsed.objects.length,
      checksum: checksum,
      approvedAt: getOptionalScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_AT, ''),
      approvedBy: getOptionalScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_BY, '')
    });

    return parsed.objects.length;
  });
}

/**
 * Step 1 (review workflow): run validator against latest uploaded AI CSV output.
 * Returns a structured report for operators to post for review.
 */
function validateLessonsCSVForReview() {
  return withErrorGuard('validateLessonsCSVForReview', function () {
    var fileId = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_FILE_ID);
    var parsed = parseLessonsCsvFile(fileId);
    var report = validateLessonsCsvRows(parsed.headers, parsed.objects);

    logEvent('LESSONS_CSV_VALIDATION_REPORT', 'Lessons CSV validator report generated', {
      fileId: fileId,
      rows: report.rowCount,
      errorCount: report.summary.errorCount,
      warningCount: report.summary.warningCount,
      canImport: report.canImport
    });

    return {
      workflow: {
        step: 'validator_report_posted',
        nextStep: report.canImport
          ? 'human_approval_required_before_replaceSheetData'
          : 'ai_output_fix_required_before_human_approval'
      },
      report: report
    };
  });
}

/**
 * Step 2 (review workflow): explicit human approval gate before replaceSheetData(...).
 * Save file/checksum approval metadata as script properties.
 */
function approveLessonsCSVImport(approvedBy) {
  return withErrorGuard('approveLessonsCSVImport', function () {
    var fileId = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_FILE_ID);
    var parsed = parseLessonsCsvFile(fileId);
    var report = validateLessonsCsvRows(parsed.headers, parsed.objects);
    assert(report.canImport, 'Approval blocked: validator has errors. Fix CSV and rerun validation.');

    var checksum = checksumLessonsRows(parsed.rows);
    var actor = normalizeWhitespace(approvedBy) || Session.getActiveUser().getEmail() || 'unknown';
    var approvedAt = nowISO();

    var props = PropertiesService.getScriptProperties();
    props.setProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_FILE_ID, String(fileId));
    props.setProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_CHECKSUM, checksum);
    props.setProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_AT, approvedAt);
    props.setProperty(CONFIG.PROPERTIES.LESSON_CSV_APPROVED_BY, actor);

    logEvent('LESSONS_CSV_APPROVED', 'Lessons CSV approved for import', {
      fileId: fileId,
      checksum: checksum,
      approvedAt: approvedAt,
      approvedBy: actor
    });

    return {
      approved: true,
      fileId: fileId,
      checksum: checksum,
      approvedAt: approvedAt,
      approvedBy: actor,
      nextStep: 'run_importLessonsCSV'
    };
  });
}

function parseLessonsCsvFile(fileId) {
  var file = DriveApp.getFileById(fileId);
  var csv = file.getBlob().getDataAsString();
  var rows = Utilities.parseCsv(csv);

  assert(rows.length > 1, 'CSV must include header and at least one lesson row.');
  var headers = rows[0].map(function (header) { return normalizeWhitespace(header); });

  var objects = rows.slice(1)
    .filter(function (r) { return r.join('').trim() !== ''; })
    .map(function (r) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = r[i]; });
      return obj;
    });

  return {
    file: file,
    rows: rows,
    headers: headers,
    objects: objects
  };
}

/**
 * Pre-import validator for deterministic Gemini ingestion.
 * Returns structured errors/warnings and canImport gate flag.
 */
function validateLessonsCsvRows(headers, rows) {
  var headerIndex = {};
  headers.forEach(function (header, idx) {
    headerIndex[String(header)] = idx;
  });

  var errors = [];
  var warnings = [];
  var seenLessonIds = {};
  var moduleIds = readTable(CONFIG.SHEET_NAMES.MODULES).map(function (moduleRow) {
    return normalizeWhitespace(moduleRow.ModuleID);
  }).filter(function (moduleId) {
    return moduleId !== '';
  });
  var moduleSet = {};
  moduleIds.forEach(function (moduleId) { moduleSet[moduleId] = true; });

  LESSONS_REQUIRED_HEADERS.forEach(function (requiredHeader) {
    if (headerIndex[requiredHeader] === undefined) {
      errors.push(makeCsvValidationIssue('header', '', requiredHeader, 'missing_required_header', 'Missing required header `' + requiredHeader + '`.'));
    }
  });

  var unknownStatus = {};

  rows.forEach(function (row, rowIndex) {
    var rowNumber = rowIndex + 2;
    var lessonId = normalizeWhitespace(row.LessonID);
    var moduleId = normalizeWhitespace(row.Module);
    var status = normalizeWhitespace(row.Status).toLowerCase();

    if (!lessonId) {
      errors.push(makeCsvValidationIssue('row', rowNumber, 'LessonID', 'missing_required_value', 'LessonID is required.'));
    } else {
      if (!CONFIG.LESSON_ID_REGEX.test(lessonId)) {
        errors.push(makeCsvValidationIssue('row', rowNumber, 'LessonID', 'invalid_lesson_id_format', 'LessonID must match `' + CONFIG.LESSON_ID_REGEX + '`.'));
      }
      if (seenLessonIds[lessonId]) {
        errors.push(makeCsvValidationIssue('row', rowNumber, 'LessonID', 'duplicate_lesson_id', 'Duplicate LessonID `' + lessonId + '` found (first seen at row ' + seenLessonIds[lessonId] + ').'));
      } else {
        seenLessonIds[lessonId] = rowNumber;
      }
    }

    if (!moduleId) {
      errors.push(makeCsvValidationIssue('row', rowNumber, 'Module', 'missing_required_value', 'Module is required for module linkage.'));
    } else if (!moduleSet[moduleId]) {
      errors.push(makeCsvValidationIssue('row', rowNumber, 'Module', 'missing_module_linkage', 'Module `' + moduleId + '` does not exist in Modules sheet.'));
    }

    if (!status) {
      errors.push(makeCsvValidationIssue('row', rowNumber, 'Status', 'missing_required_value', 'Status is required.'));
    } else if (LESSONS_ALLOWED_STATUS.indexOf(status) < 0) {
      errors.push(makeCsvValidationIssue('row', rowNumber, 'Status', 'invalid_status', 'Status `' + status + '` is invalid. Allowed: ' + LESSONS_ALLOWED_STATUS.join(', ') + '.'));
      unknownStatus[status] = true;
    }

    ['Title', 'Hook', 'CoreContent', 'Takeaway', 'Mission'].forEach(function (field) {
      if (!normalizeWhitespace(row[field])) {
        errors.push(makeCsvValidationIssue('row', rowNumber, field, 'missing_required_value', field + ' is required narrative content.'));
      }
    });
  });

  if (!rows.length) {
    errors.push(makeCsvValidationIssue('row', '', '', 'missing_data_rows', 'No lesson data rows found in CSV.'));
  }

  Object.keys(unknownStatus).forEach(function (status) {
    warnings.push(makeCsvValidationIssue('summary', '', 'Status', 'unexpected_status_value', 'Found unsupported status `' + status + '`.'));
  });

  return {
    rowCount: rows.length,
    requiredHeaders: LESSONS_REQUIRED_HEADERS,
    allowedStatuses: LESSONS_ALLOWED_STATUS,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length
    },
    errors: errors,
    warnings: warnings,
    canImport: errors.length === 0
  };
}

function makeCsvValidationIssue(scope, row, field, code, message) {
  return {
    scope: scope,
    row: row,
    field: field,
    code: code,
    message: message
  };
}

function checksumLessonsRows(rows) {
  var normalized = rows.map(function (row) {
    return row.map(function (value) {
      return normalizeWhitespace(value);
    }).join('|');
  }).join('\n');

  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalized, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}
