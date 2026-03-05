// =============================================================
// ACM Project Hub — Master Registry Apps Script API
// =============================================================
// Deploy as web app: Execute as "Me", Access "Anyone"
//
// This script manages the master project registry.
// It requires a Google Sheet with two tabs:
//   - Config:   key | value     (stores password_hash)
//   - Projects: id | name | client_name | api_url | created_at
// =============================================================

const SHEET_NAMES = {
  CONFIG: 'Config',
  PROJECTS: 'Projects'
};

// ---- Router ----

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getAll';
  let result;
  try {
    switch (action) {
      case 'getAll':
        result = { config: getConfig(), projects: getProjects() };
        break;
      case 'getConfig':
        result = getConfig();
        break;
      case 'getProjects':
        result = getProjects();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' });
  }

  const action = body.action;
  const data = body.data || {};
  let result;

  try {
    switch (action) {
      case 'setConfig':
        result = setConfigValue(data.key, data.value);
        break;
      case 'addProject':
        result = addProject(data);
        break;
      case 'updateProject':
        result = updateProject(data);
        break;
      case 'deleteProject':
        result = deleteProject(data.id);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

// ---- Config Operations ----

function getConfig() {
  const rows = getSheetData(SHEET_NAMES.CONFIG);
  const config = {};
  rows.forEach(r => { config[r.key] = r.value; });
  return config;
}

function setConfigValue(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONFIG);
  if (!sheet) return { error: 'Config sheet not found' };

  const rowIdx = findRowIndex(sheet, 1, key);
  if (rowIdx > 0) {
    // Update existing row
    sheet.getRange(rowIdx, 2).setValue(value);
  } else {
    // Append new row
    sheet.appendRow([key, value]);
  }
  return { success: true, key: key };
}

// ---- Project Operations ----

function getProjects() {
  return getSheetData(SHEET_NAMES.PROJECTS);
}

function addProject(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECTS);
  if (!sheet) return { error: 'Projects sheet not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateProject(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECTS);
  if (!sheet) return { error: 'Projects sheet not found' };

  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Project not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach((h, i) => {
    if (h !== 'id' && data[h] !== undefined) {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  return { success: true, id: data.id };
}

function deleteProject(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECTS);
  if (!sheet) return { error: 'Projects sheet not found' };

  const rowIdx = findRowIndex(sheet, 1, id);
  if (rowIdx === -1) return { error: 'Project not found: ' + id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: id };
}

// ---- Utilities ----

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function findRowIndex(sheet, col, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const data = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
