/** CSV ingestion routines from Google Drive. */

function importLessonsCSV() {
  return withErrorGuard('importLessonsCSV', function () {
    var fileId = getScriptProperty(CONFIG.PROPERTIES.LESSON_CSV_FILE_ID);
    var file = DriveApp.getFileById(fileId);
    var csv = file.getBlob().getDataAsString();
    var rows = Utilities.parseCsv(csv);

    assert(rows.length > 1, 'CSV must include header and at least one lesson row.');
    var headers = rows[0];

    var objects = rows.slice(1)
      .filter(function (r) { return r.join('').trim() !== ''; })
      .map(function (r) {
        var obj = {};
        headers.forEach(function (h, i) { obj[h] = r[i]; });
        return obj;
      });

    replaceSheetData(CONFIG.SHEET_NAMES.LESSONS, objects, headers);
    logEvent('IMPORT_LESSONS_CSV', 'Lessons CSV imported', { fileId: fileId, rows: objects.length });

    return objects.length;
  });
}
