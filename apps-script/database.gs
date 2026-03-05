/** Spreadsheet data access layer. */

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
