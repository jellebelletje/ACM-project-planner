// =============================================================
// ACM Activity Dashboard — Google Apps Script API
// =============================================================
// Deploy as web app: Execute as "Me", Access "Anyone"
// All data is stored in the bound Google Sheet.
// =============================================================

// ---- Configuration ----
const SHEET_NAMES = {
  ACTIVITIES: 'Activities',
  TODOS: 'Todos',
  QUESTIONS: 'Questions',
  NOTES_LINKS: 'Notes_Links',
  MILESTONES: 'Technical_Milestones',
  TIMESHEET: 'Timesheet',  // Legacy — kept for backwards compat
  TIME_SPENT: 'Time_Spent',
  TIME_BILLED: 'Time_Billed',
  SOW: 'SOW',
  CONFIG: 'Project_Config',
  TRANSCRIPTS: 'Transcripts',
  PROMPTS: 'Prompts',
  AGREEMENTS: 'Agreements',
  TEMPLATE_CHANGES: 'Template_Changes',
  INSIGHTS: 'Insights',
  PROJECT_NOTES: 'Project_Notes'
};

// ---- Router ----

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getAll';
  const activityId = e && e.parameter && e.parameter.activityId;

  let result;
  try {
    switch (action) {
      case 'getAll':
        result = getAll();
        break;
      case 'getActivities':
        result = getActivities();
        break;
      case 'getTodos':
        result = activityId ? getTodos(activityId) : getTodosAll();
        break;
      case 'getQuestions':
        result = activityId ? getQuestions(activityId) : getQuestionsAll();
        break;
      case 'getNotesLinks':
        result = activityId ? getNotesLinks(activityId) : getNotesLinksAll();
        break;
      case 'getMilestones':
        result = getMilestones();
        break;
      case 'getConfig':
        result = getConfig();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message, stack: err.stack };
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

  const action = body.action || (e.parameter && e.parameter.action);
  let result;

  try {
    switch (action) {
      case 'updateActivity':
        result = updateActivity(body.data);
        break;
      case 'updateTodo':
        result = updateTodo(body.data);
        break;
      case 'addTodo':
        result = addTodo(body.data);
        break;
      case 'deleteTodo':
        result = deleteTodo(body.data.id);
        break;
      case 'updateQuestion':
        result = updateQuestion(body.data);
        break;
      case 'addQuestion':
        result = addQuestion(body.data);
        break;
      case 'deleteQuestion':
        result = deleteQuestion(body.data.id);
        break;
      case 'addNote':
        result = addNote(body.data);
        break;
      case 'deleteNote':
        result = deleteNote(body.data.id);
        break;
      case 'updateNote':
        result = updateNote(body.data);
        break;
      case 'updateMilestone':
        result = updateMilestone(body.data);
        break;
      case 'deleteMilestone':
        result = deleteMilestone(body.data.id);
        break;
      case 'updateConfig':
        result = updateConfig(body.data);
        break;
      case 'addTimesheetEntry':
        result = addTimesheetEntry(body.data);
        break;
      case 'deleteTimesheetEntry':
        result = deleteTimesheetEntry(body.data);
        break;
      case 'addTimeSpentEntry':
        result = addTimeSpentEntry(body.data);
        break;
      case 'deleteTimeSpentEntry':
        result = deleteTimeSpentEntry(body.data);
        break;
      case 'addTimeBilledEntry':
        result = addTimeBilledEntry(body.data);
        break;
      case 'deleteTimeBilledEntry':
        result = deleteTimeBilledEntry(body.data);
        break;
      case 'addSowEntry':
        result = addSowEntry(body.data);
        break;
      case 'addTranscriptEntry':
        result = addTranscriptEntry(body.data);
        break;
      case 'updateTranscript':
        result = updateTranscript(body.data);
        break;
      case 'deleteTranscriptEntry':
        result = deleteTranscriptEntry(body.data);
        break;
      case 'processTranscripts':
        result = processTranscripts(body.data);
        break;
      case 'addAgreement':
        result = addAgreement(body.data);
        break;
      case 'updateAgreement':
        result = updateAgreement(body.data);
        break;
      case 'deleteAgreement':
        result = deleteAgreement(body.data.id);
        break;
      case 'addActivity':
        result = addActivity(body.data);
        break;
      case 'moveActivity':
        result = moveActivity(body.data);
        break;
      case 'deleteActivity':
        result = deleteActivity(body.data.id);
        break;
      case 'addTemplateChange':
        result = addTemplateChange(body.data);
        break;
      case 'updateTemplateChange':
        result = updateTemplateChange(body.data);
        break;
      case 'deleteTemplateChange':
        result = deleteTemplateChange(body.data.id);
        break;
      case 'applyTemplateChanges':
        result = applyTemplateChanges(body.data);
        break;
      case 'reseedTemplate':
        result = reseedTemplate(body.data);
        break;
      case 'addPrompt':
        result = addPrompt(body.data);
        break;
      case 'updatePrompt':
        result = updatePrompt(body.data);
        break;
      case 'deletePrompt':
        result = deletePrompt(body.data.key);
        break;
      case 'generateInsights':
        result = generateInsights(body.data);
        break;
      case 'addInsight':
        result = addInsight(body.data);
        break;
      case 'addProjectNote':
        result = addProjectNote(body.data);
        break;
      case 'updateProjectNote':
        result = updateProjectNote(body.data);
        break;
      case 'deleteProjectNote':
        result = deleteProjectNote(body.data.id);
        break;
      case 'seedAll':
        result = seedAll(body.data);
        break;
      case 'batchUpdate':
        result = batchUpdate(body.data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message, stack: err.stack };
  }

  return jsonResponse(result);
}

// ---- Read Operations ----

function getAll() {
  var config = getConfig();
  // Check master sheet for Claude API key (never send the key itself to browser)
  config.has_claude_api_key = !!getClaudeApiKey(config);

  return {
    activities: getActivities(),
    todos: getTodosAll(),
    questions: getQuestionsAll(),
    notes: getNotesLinksAll(),
    milestones: getMilestones(),
    timesheet: getTimesheetAll(),  // Legacy
    time_spent: getTimeSpentAll(),
    time_billed: getTimeBilledAll(),
    sow: getSowAll(),
    transcripts: getTranscriptsAll(),
    agreements: getAgreementsAll(),
    template_changes: getTemplateChangesAll(),
    prompts: getPromptsAll(),
    insights: getInsightsAll(),
    project_notes: getProjectNotesAll(),
    config: config
  };
}

/**
 * Read the Claude API key from the master registry sheet.
 * Requires master_sheet_id to be set in the project's Project_Config tab.
 */
function getClaudeApiKey(optConfig) {
  try {
    var config = optConfig || getConfig();
    var masterSheetId = config.master_sheet_id;
    if (!masterSheetId) return null;
    var masterSS = SpreadsheetApp.openById(masterSheetId);
    var configSheet = masterSS.getSheetByName('Config');
    if (!configSheet) return null;
    var lastRow = configSheet.getLastRow();
    if (lastRow < 2) return null;
    var data = configSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'claude_api_key') return data[i][1] || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Read the latest versioned prompt from the Prompts sheet.
 * Keys follow the pattern: {prefix}_v{number} (e.g. process_all_v1, process_all_v2).
 * Returns the value (prompt text) for the highest version number found.
 */
function getLatestPrompt(prefix) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROMPTS);
    if (!sheet) return null;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    var pattern = new RegExp('^' + prefix + '_v(\\d+)$');
    var bestVersion = -1;
    var bestValue = null;
    for (var i = 0; i < data.length; i++) {
      var match = String(data[i][0]).match(pattern);
      if (match) {
        var ver = parseInt(match[1], 10);
        if (ver > bestVersion) {
          bestVersion = ver;
          bestValue = data[i][1];
        }
      }
    }
    return bestValue || null;
  } catch (e) {
    return null;
  }
}

function getActivities() {
  return getSheetData(SHEET_NAMES.ACTIVITIES);
}

function getTodos(activityId) {
  return getSheetData(SHEET_NAMES.TODOS).filter(r => r.activity_id === activityId);
}

function getTodosAll() {
  return getSheetData(SHEET_NAMES.TODOS);
}

function getQuestions(activityId) {
  return getSheetData(SHEET_NAMES.QUESTIONS).filter(r => r.activity_id === activityId);
}

function getQuestionsAll() {
  return getSheetData(SHEET_NAMES.QUESTIONS);
}

function getNotesLinks(activityId) {
  return getSheetData(SHEET_NAMES.NOTES_LINKS).filter(r => r.activity_id === activityId);
}

function getNotesLinksAll() {
  return getSheetData(SHEET_NAMES.NOTES_LINKS);
}

function getMilestones() {
  return getSheetData(SHEET_NAMES.MILESTONES);
}

function getTimesheetAll() {
  return getSheetData(SHEET_NAMES.TIMESHEET);
}

function getTimeSpentAll() {
  try { return getSheetData(SHEET_NAMES.TIME_SPENT); }
  catch (e) { return []; }
}

function getTimeBilledAll() {
  try { return getSheetData(SHEET_NAMES.TIME_BILLED); }
  catch (e) { return []; }
}

function getSowAll() {
  try { return getSheetData(SHEET_NAMES.SOW); }
  catch (e) { return []; }
}

function getTranscriptsAll() {
  try { return getSheetData(SHEET_NAMES.TRANSCRIPTS); }
  catch (e) { return []; }
}

function getAgreementsAll() {
  try {
    var rows = getSheetData(SHEET_NAMES.AGREEMENTS);
    // Normalize: ensure every row has id, active, added_by, added_on
    rows.forEach(function(row, i) {
      if (!row.id) row.id = 'AG_sheet_' + (i + 1);
      if (row.active === undefined || row.active === '') row.active = true;
      if (!row.added_by) row.added_by = '';
      if (!row.added_on) row.added_on = '';
    });
    return rows;
  }
  catch (e) { return []; }
}

function getInsightsAll() {
  try { return getSheetData(SHEET_NAMES.INSIGHTS); }
  catch (e) { return []; }
}

function getProjectNotesAll() {
  try { return getSheetData(SHEET_NAMES.PROJECT_NOTES); }
  catch (e) { return []; }
}

// ---- Prompts ----

function getPromptsAll() {
  try { return getSheetData(SHEET_NAMES.PROMPTS); }
  catch (e) { return []; }
}

function addPrompt(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROMPTS);
  if (!sheet) return { error: 'Prompts sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, key: data.key };
}

function updatePrompt(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROMPTS);
  if (!sheet) return { error: 'Prompts sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.key);
  if (rowIdx === -1) return { error: 'Prompt not found: ' + data.key };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const valIdx = headers.indexOf('value');
  if (valIdx !== -1) sheet.getRange(rowIdx, valIdx + 1).setValue(data.value);
  return { success: true, key: data.key };
}

function deletePrompt(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROMPTS);
  if (!sheet) return { error: 'Prompts sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, key);
  if (rowIdx === -1) return { error: 'Prompt not found: ' + key };
  sheet.deleteRow(rowIdx);
  return { success: true, key: key };
}

// ---- Template Changes ----

function getTemplateChangesAll() {
  try { return getSheetData(SHEET_NAMES.TEMPLATE_CHANGES); }
  catch (e) { return []; }
}

function addTemplateChange(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATE_CHANGES);
  if (!sheet) return { error: 'Template_Changes sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateTemplateChange(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATE_CHANGES);
  if (!sheet) return { error: 'Template_Changes sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Template change not found: ' + data.id };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) row[colIdx] = data[key];
  }
  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function deleteTemplateChange(id) {
  return deleteRowById(SHEET_NAMES.TEMPLATE_CHANGES, id);
}

function applyTemplateChanges(data) {
  var config = getConfig();
  var templateSheetId = config.template_sheet_id;
  if (!templateSheetId) return { error: 'Template sheet ID not configured.' };

  var templateSS;
  try {
    templateSS = SpreadsheetApp.openById(templateSheetId);
  } catch (e) {
    return { error: 'Cannot open template sheet: ' + e.message };
  }

  var results = [];
  var changes = data.changes || [];

  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    try {
      var sheetName = change.item_type;
      var sheet = templateSS.getSheetByName(sheetName);
      if (!sheet) {
        results.push({ id: change.id, error: 'Sheet not found: ' + sheetName });
        continue;
      }
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      if (change.change_type === 'edit') {
        var rowIdx = findRowIndex(sheet, 1, change.item_id);
        if (rowIdx === -1) {
          results.push({ id: change.id, error: 'Item not found in template: ' + change.item_id });
          continue;
        }
        var colIdx = headers.indexOf(change.field);
        if (colIdx === -1) {
          results.push({ id: change.id, error: 'Field not found in template: ' + change.field });
          continue;
        }
        sheet.getRange(rowIdx, colIdx + 1).setValue(change.new_value);
        results.push({ id: change.id, success: true });

      } else if (change.change_type === 'add') {
        var rowData;
        try { rowData = JSON.parse(change.new_value); } catch (e) { rowData = {}; }
        var newRow = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
        sheet.appendRow(newRow);
        results.push({ id: change.id, success: true });

      } else if (change.change_type === 'delete') {
        var delIdx = findRowIndex(sheet, 1, change.item_id);
        if (delIdx === -1) {
          results.push({ id: change.id, error: 'Item not found for deletion: ' + change.item_id });
          continue;
        }
        sheet.deleteRow(delIdx);
        results.push({ id: change.id, success: true });

      } else {
        results.push({ id: change.id, error: 'Unknown change_type: ' + change.change_type });
      }
    } catch (e) {
      results.push({ id: change.id, error: e.message });
    }
  }

  // Mark applied changes in the project's Template_Changes sheet
  changes.forEach(function(c) {
    try { updateTemplateChange({ id: c.id, status: 'applied' }); } catch (e) { /* best-effort */ }
  });

  return { success: true, results: results };
}

function reseedTemplate(data) {
  var config = getConfig();
  var templateSheetId = config.template_sheet_id;
  if (!templateSheetId) return { error: 'Template sheet ID not configured.' };

  var templateSS;
  try {
    templateSS = SpreadsheetApp.openById(templateSheetId);
  } catch (e) {
    return { error: 'Cannot open template sheet: ' + e.message };
  }

  var tabs = ['Activities', 'Todos', 'Questions', 'Agreements'];
  var dataKeys = { 'Activities': 'activities', 'Todos': 'todos', 'Questions': 'questions', 'Agreements': 'agreements' };

  for (var t = 0; t < tabs.length; t++) {
    var tabName = tabs[t];
    var items = data[dataKeys[tabName]];
    var sheet = templateSS.getSheetByName(tabName);
    if (!sheet || !items || items.length === 0) continue;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    clearDataRows(sheet);
    var rows = items.map(function(item) {
      return headers.map(function(h) { return item[h] !== undefined ? item[h] : ''; });
    });
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }

  return { success: true };
}

// Legacy timesheet functions (kept for backwards compat)
function addTimesheetEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIMESHEET);
  if (!sheet) return { error: 'Timesheet sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteTimesheetEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIMESHEET);
  if (!sheet) return { error: 'Timesheet sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Entry not found: ' + data.id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: data.id };
}

// New Time_Spent / Time_Billed functions
function addTimeSpentEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIME_SPENT);
  if (!sheet) return { error: 'Time_Spent sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteTimeSpentEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIME_SPENT);
  if (!sheet) return { error: 'Time_Spent sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Entry not found: ' + data.id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: data.id };
}

function addTimeBilledEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIME_BILLED);
  if (!sheet) return { error: 'Time_Billed sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteTimeBilledEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TIME_BILLED);
  if (!sheet) return { error: 'Time_Billed sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Entry not found: ' + data.id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: data.id };
}

function addSowEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SOW);
  if (!sheet) return { error: 'SOW sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true };
}

// ---- Transcript Operations ----

function addTranscriptEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSCRIPTS);
  if (!sheet) return { error: 'Transcripts sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateTranscript(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSCRIPTS);
  if (!sheet) return { error: 'Transcripts sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Transcript not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function deleteTranscriptEntry(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSCRIPTS);
  if (!sheet) return { error: 'Transcripts sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Entry not found: ' + data.id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: data.id };
}

// ---- Agreement Operations ----

function addAgreement(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.AGREEMENTS);
  if (!sheet) return { error: 'Agreements sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateAgreement(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.AGREEMENTS);
  if (!sheet) return { error: 'Agreements sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Agreement not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function deleteAgreement(id) {
  return deleteRowById(SHEET_NAMES.AGREEMENTS, id);
}

// ---- Insight Operations ----

function addInsight(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.INSIGHTS);
  if (!sheet) return { error: 'Insights sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

// ---- Project Note Operations ----

function addProjectNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECT_NOTES);
  if (!sheet) return { error: 'Project_Notes sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateProjectNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECT_NOTES);
  if (!sheet) return { error: 'Project_Notes sheet not found' };
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Project note not found: ' + data.id };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) row[colIdx] = data[key];
  }
  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function deleteProjectNote(id) {
  return deleteRowById(SHEET_NAMES.PROJECT_NOTES, id);
}

function processTranscripts(data) {
  // 1. Get all unprocessed entries
  var transcripts = getTranscriptsAll();
  var unprocessed = transcripts.filter(function(t) {
    return !t.processed || t.processed === 'FALSE' || t.processed === false;
  });
  if (unprocessed.length === 0) return { error: 'No unprocessed entries found.' };

  // 2. Read context data
  var activities = getActivities();
  var allQuestions = getSheetData(SHEET_NAMES.QUESTIONS);
  var openQuestions = allQuestions.filter(function(q) {
    return !q.is_answered || q.is_answered === 'FALSE' || q.is_answered === false;
  });
  var answeredQuestions = allQuestions.filter(function(q) {
    return q.is_answered && q.is_answered !== 'FALSE' && q.is_answered !== false && q.answer;
  });
  var todos = getSheetData(SHEET_NAMES.TODOS).filter(function(t) {
    return !t.is_done || t.is_done === 'FALSE' || t.is_done === false;
  });

  // 3. Get API key from master sheet (never sent to browser)
  var apiKey = getClaudeApiKey();
  if (!apiKey) return { error: 'Claude API key not configured. Add it to the master sheet Config tab.' };

  // 4. Build combined content from all unprocessed entries (include source_document)
  var combinedContent = unprocessed.map(function(entry) {
    var convType = entry.meeting_type || 'external';
    var sourceDoc = entry.source_filename || 'unknown document';
    return '--- Entry ' + entry.id + ' (source_document: ' + sourceDoc + ', ' +
           (entry.date || 'no date') + ', ' +
           (entry.participants || 'no participants') + ', ' + convType +
           (entry.context ? ', context: ' + entry.context : '') + ') ---\n' + entry.transcript_note;
  }).join('\n\n');

  // 5. Build context strings
  var activitiesContext = activities.map(function(a) {
    return a.id + ': ' + a.title + ' — ' + (a.intro_text || '');
  }).join('\n');

  var questionsContext = openQuestions.map(function(q) {
    return q.id + ' (Activity ' + q.activity_id + '): ' + q.question_text;
  }).join('\n');

  var answeredQuestionsContext = answeredQuestions.map(function(q) {
    // Strip previous AI attribution tags from the answer to keep context clean
    var cleanAnswer = (q.answer || '').replace(/\n\n\[answered by AI on [^\]]+\]/g, '').replace(/\n\n\[updated by AI on [^\]]+\]/g, '').trim();
    return q.id + ' (Activity ' + q.activity_id + '): ' + q.question_text + '\nExisting answer: ' + cleanAnswer;
  }).join('\n\n');

  var todosContext = todos.map(function(t) {
    return t.id + ' (Activity ' + t.activity_id + '): ' + t.text;
  }).join('\n');

  // Read agreements for AI context
  var allAgreements = getAgreementsAll();
  var activeAgreements = allAgreements.filter(function(ag) {
    return ag.active !== false && ag.active !== 'FALSE';
  });
  var agreementsContext = activeAgreements.map(function(ag) {
    var type = (ag.internal === true || ag.internal === 'TRUE' || ag.internal === 'true') ? 'Internal' : 'External';
    var cleanAgreement = (ag.agreement || '').replace(/\n\n\[answered by AI on [^\]]+\]/g, '').replace(/\n\n\[updated by AI on [^\]]+\]/g, '').trim();
    if (cleanAgreement) {
      return ag.id + ' (' + type + '): ' + (ag.question_agreed || '(no question)') + '\nCurrent agreement: ' + cleanAgreement;
    } else {
      return ag.id + ' (' + type + '): ' + (ag.question_agreed || '(no question)') + '\n(No agreement recorded yet)';
    }
  }).join('\n\n');

  // 6. Build prompt — load from Prompts sheet (latest version), with fallback
  var promptTemplate = getLatestPrompt('process_all');
  var prompt;
  var promptSource = promptTemplate ? 'sheet' : 'fallback';
  if (promptTemplate) {
    prompt = promptTemplate
      .replace(/\{\{ENTRY_COUNT\}\}/g, String(unprocessed.length))
      .replace(/\{\{CONTENT\}\}/g, combinedContent)
      .replace(/\{\{ACTIVITIES\}\}/g, activitiesContext)
      .replace(/\{\{QUESTIONS\}\}/g, questionsContext)
      .replace(/\{\{ANSWERED_QUESTIONS\}\}/g, answeredQuestionsContext || '(none)')
      .replace(/\{\{TODOS\}\}/g, todosContext)
      .replace(/\{\{AGREEMENTS\}\}/g, agreementsContext || '(none)');
  } else {
    // Hardcoded fallback if Prompts sheet is missing or empty
    prompt = 'You are an expert Adoption & Change Management (ACM) consultant analyzing meeting transcripts and notes from a change management trajectory.\n' +
      'There are ' + unprocessed.length + ' new entries to process.\n\n' +
      'CONTENT:\n' + combinedContent + '\n\n' +
      'ACTIVITIES:\n' + activitiesContext + '\n\n' +
      'OPEN QUESTIONS (unanswered):\n' + questionsContext + '\n\n' +
      'PREVIOUSLY ANSWERED QUESTIONS (only add NEW information if the content provides meaningful additions):\n' + (answeredQuestionsContext || '(none)') + '\n\n' +
      'INCOMPLETE TODOS:\n' + todosContext + '\n\n' +
      'EXISTING AGREEMENTS (update if new information adds to them, or fill empty agreements if the content addresses them):\n' + (agreementsContext || '(none)') + '\n\n' +
      'Analyze ALL the content. Pay special attention to any agreements, decisions, or commitments made in the transcript — these should be captured as agreements.\n\n' +
      'Return a JSON object with:\n' +
      '1. "matched_activities": array of activity IDs that this content primarily addresses\n' +
      '2. "answered_questions": array of { "id": question_id, "answer": extracted answer text, "is_update": boolean, "source_entry_id": which entry ID the answer came from, "source_document": the source_document name from that entry } for questions answered or updated. For previously answered questions, set "is_update" to true and provide ONLY the new information.\n' +
      '3. "completed_todos": array of { "id": todo_id, "note": brief explanation, "source_entry_id": which entry ID, "source_document": the source_document name from that entry } for todos completed based on the content\n' +
      '4. "summary": a paragraph shortly listing the items that are to be added to the sheet\n' +
      '5. "entry_summaries": array of { "id": entry_id, "summary": short summary, "activity_id": comma-separated matched activity IDs } for each processed entry\n' +
      '6. "answered_agreements": array for BOTH updating existing agreements AND proposing new ones. Two types:\n' +
      '   - Update existing: { "id": agreement_id, "answer": text, "is_update": boolean, "source_entry_id": entry ID, "source_document": source name }\n' +
      '   - Propose new: { "id": "NEW", "question_agreed": the agreement reformulated as a question (e.g. "Who owns the communication in the pilot phase?"), "answer": the answer to that question (e.g. "The ACM consultant in coordination with the internal project lead"), "internal": boolean, "source_entry_id": entry ID, "source_document": source name }\n\n' +
      'Only include questions/todos/agreements where the content clearly provides the answer or completion. Be conservative — do not guess.\n' +
      'For previously answered questions, only include them if the transcript adds genuinely NEW information not already in the existing answer.\n' +
      'For existing agreements: provide the agreement text if the content clearly establishes one. Only include if the transcript adds genuinely NEW information. Set "is_update" to true for updates.\n' +
      'DISCOVERING NEW AGREEMENTS: Actively scan for agreements, decisions, or commitments that do NOT match any existing agreement card. Use "id": "NEW" and reformulate each agreement as a question-answer pair: "question_agreed" is the agreement phrased as a question, "answer" is the answer. Set "internal" based on the entry meeting type (internal entry = internal agreement, external entry = external agreement).\n' +
      'Return ONLY valid JSON, no markdown formatting.';
  }

  // 7. Call Claude API
  try {
    var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (result.error) return { error: 'Claude API error: ' + result.error.message };

    // 8. Parse Claude's response (handle potential markdown fencing)
    var responseText = result.content[0].text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    var analysis = JSON.parse(responseText);

    return {
      success: true,
      processed_entry_ids: unprocessed.map(function(e) { return e.id; }),
      proposals: analysis,
      prompt_source: promptSource
    };
  } catch (err) {
    return { error: 'Processing failed: ' + err.message };
  }
}

// ---- Generate Insights (AI) ----

function generateInsights(data) {
  // 1. Gather all project data
  var activities = getActivities();
  var allTodos = getSheetData(SHEET_NAMES.TODOS);
  var allQuestions = getSheetData(SHEET_NAMES.QUESTIONS);
  var milestones = getMilestones();
  var agreements = getAgreementsAll();
  var sow = getSowAll();
  var config = getConfig();
  var projectNotes = getProjectNotesAll();

  // 2. Compute summary statistics
  var doneTodos = allTodos.filter(function(t) {
    return t.is_done === true || t.is_done === 'TRUE' || t.is_done === 'true';
  });
  var openTodos = allTodos.filter(function(t) {
    return !t.is_done || t.is_done === 'FALSE' || t.is_done === 'false';
  });
  var answeredQuestions = allQuestions.filter(function(q) {
    return q.is_answered === true || q.is_answered === 'TRUE' || q.is_answered === 'true' || (q.answer && String(q.answer).trim());
  });
  var openQuestions = allQuestions.filter(function(q) {
    return !q.is_answered || q.is_answered === 'FALSE' || q.is_answered === 'false';
  });
  var activeAgreements = agreements.filter(function(a) {
    return a.active !== false && a.active !== 'FALSE';
  });
  var filledAgreements = activeAgreements.filter(function(a) {
    return a.agreement && String(a.agreement).trim();
  });

  // Activity status counts
  var statusCounts = { not_started: 0, in_progress: 0, completed: 0, blocked: 0, inactive: 0 };
  activities.forEach(function(a) {
    var s = a.status || 'not_started';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });

  // PDCA phase distribution
  var phaseCount = {};
  activities.forEach(function(a) {
    var phase = a.pdca_phase || 'Unknown';
    if (!phaseCount[phase]) phaseCount[phase] = { total: 0, completed: 0, in_progress: 0, not_started: 0, blocked: 0 };
    phaseCount[phase].total++;
    var s = a.status || 'not_started';
    if (phaseCount[phase][s] !== undefined) phaseCount[phase][s]++;
  });

  var stats = {
    total_activities: activities.length,
    activity_statuses: statusCounts,
    total_todos: allTodos.length,
    done_todos: doneTodos.length,
    open_todos: openTodos.length,
    total_questions: allQuestions.length,
    answered_questions: answeredQuestions.length,
    open_questions: openQuestions.length,
    total_agreements: activeAgreements.length,
    filled_agreements: filledAgreements.length,
    empty_agreements: activeAgreements.length - filledAgreements.length,
    total_milestones: milestones.length,
    completed_milestones: milestones.filter(function(m) { return m.status === 'completed'; }).length,
    delayed_milestones: milestones.filter(function(m) { return m.status === 'delayed'; }).length,
    phase_distribution: phaseCount
  };

  // 3. Build context strings
  var activitiesContext = activities.map(function(a) {
    return a.id + ': ' + a.title + ' [' + (a.status || 'not_started') + '] Phase: ' + (a.pdca_phase || 'unknown') + ' — ' + (a.intro_text || '');
  }).join('\n');

  var openTodosContext = openTodos.slice(0, 30).map(function(t) {
    return t.id + ' (Activity ' + t.activity_id + '): ' + t.text;
  }).join('\n');

  var openQuestionsContext = openQuestions.map(function(q) {
    return q.id + ' (Activity ' + q.activity_id + '): ' + q.question_text;
  }).join('\n');

  var agreementsContext = activeAgreements.map(function(ag) {
    var type = (ag.internal === true || ag.internal === 'TRUE' || ag.internal === 'true') ? 'Internal' : 'External';
    var answer = (ag.agreement || '').replace(/\n\n\[answered by AI on [^\]]+\]/g, '').replace(/\n\n\[updated by AI on [^\]]+\]/g, '').trim();
    return ag.id + ' (' + type + '): ' + (ag.question_agreed || '(no question)') + (answer ? '\nAgreement: ' + answer : '\n(Empty — no agreement recorded)');
  }).join('\n\n');

  var milestonesContext = milestones.map(function(m) {
    return m.name + ' [' + (m.status || 'planned') + '] ' + (m.timeline_type || '') + ' — ' + (m.date || 'no date');
  }).join('\n');

  var sowContext = sow.length > 0 ? sow[0].content || '(no SOW content)' : '(no SOW defined)';
  var technicalSummaryContext = sow.length > 0 && sow[0].technical_summary ? sow[0].technical_summary : '(no technical summary provided)';

  var projectContext = 'Project: ' + (config.project_name || 'Unknown') +
    '\nClient: ' + (config.client_name || 'Unknown') +
    '\nConsultant: ' + (config.consultant_name || 'Unknown') +
    '\nStart: ' + (config.start_date || 'Unknown') +
    '\nEnd: ' + (config.end_date || 'Unknown') +
    '\nDuration: ' + (config.total_duration || 'Unknown');

  var userNotesContext = projectNotes.length > 0
    ? projectNotes.map(function(n) {
        return '[' + (n.created_at || 'no date') + '] ' + (n.content || '');
      }).join('\n')
    : '(no project notes)';

  // 4. Get API key
  var apiKey = getClaudeApiKey();
  if (!apiKey) return { error: 'Claude API key not configured. Add it to the master sheet Config tab.' };

  // 5. Build prompt from Prompts sheet or fallback
  var promptTemplate = getLatestPrompt('insights');
  var promptSource = promptTemplate ? 'sheet' : 'fallback';

  var prompt;
  if (promptTemplate) {
    prompt = promptTemplate
      .replace(/\{\{PROJECT_CONTEXT\}\}/g, projectContext)
      .replace(/\{\{STATS\}\}/g, JSON.stringify(stats, null, 2))
      .replace(/\{\{ACTIVITIES\}\}/g, activitiesContext)
      .replace(/\{\{OPEN_TODOS\}\}/g, openTodosContext || '(none)')
      .replace(/\{\{OPEN_QUESTIONS\}\}/g, openQuestionsContext || '(none)')
      .replace(/\{\{AGREEMENTS\}\}/g, agreementsContext || '(none)')
      .replace(/\{\{MILESTONES\}\}/g, milestonesContext || '(none)')
      .replace(/\{\{TECHNICAL_SUMMARY\}\}/g, technicalSummaryContext)
      .replace(/\{\{SOW\}\}/g, sowContext)
      .replace(/\{\{USER_NOTES\}\}/g, userNotesContext);
  } else {
    // Hardcoded fallback
    prompt = 'You are an expert Adoption & Change Management (ACM) consultant performing a health assessment of a change management project.\n' +
      'Your PRIMARY focus is assessing alignment between what is being done in the project and what is promised in the Statement of Work (SOW).\n\n' +
      'PROJECT OVERVIEW:\n' + projectContext + '\n\n' +
      'CURRENT STATISTICS:\n' + JSON.stringify(stats, null, 2) + '\n\n' +
      'ALL ACTIVITIES (with status and PDCA phase):\n' + activitiesContext + '\n\n' +
      'OPEN TO-DOS (incomplete):\n' + (openTodosContext || '(none)') + '\n\n' +
      'OPEN QUESTIONS (unanswered):\n' + (openQuestionsContext || '(none)') + '\n\n' +
      'AGREEMENTS (decisions and commitments):\n' + (agreementsContext || '(none)') + '\n\n' +
      'MILESTONES:\n' + (milestonesContext || '(none)') + '\n\n' +
      'TECHNICAL SUMMARY (context about the technical project the ACM work supports):\n' + technicalSummaryContext + '\n\n' +
      'STATEMENT OF WORK:\n' + sowContext + '\n\n' +
      'CONSULTANT NOTES:\n' + userNotesContext + '\n\n' +
      'Analyze this project and return a JSON object with: health_score (0-100), executive_summary, ' +
      'sow_alignment (overall_coherence, summary, in_scope items, out_of_scope items with concerns, unaddressed_commitments), ' +
      'risk_areas (area, severity High/Medium/Low, description), recommendations (action, priority, rationale), ' +
      'pdca_analysis (for each phase: status On Track/Behind/At Risk/Complete and summary), ' +
      'stakeholder_engagement (summary, gaps array), focus_areas (top 3 priorities).\n' +
      'Return ONLY valid JSON, no markdown formatting.';
  }

  // 6. Call Claude API
  try {
    var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (result.error) return { error: 'Claude API error: ' + result.error.message };

    var responseText = result.content[0].text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    var analysis = JSON.parse(responseText);

    return {
      success: true,
      insight: analysis,
      stats: stats,
      prompt_source: promptSource
    };
  } catch (err) {
    return { error: 'Insight generation failed: ' + err.message };
  }
}

function getConfig() {
  const rows = getSheetData(SHEET_NAMES.CONFIG);
  const config = {};
  rows.forEach(r => { config[r.key] = r.value; });
  return config;
}

// ---- Write Operations ----

function updateActivity(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVITIES);
  const rowIdx = findRowIndex(sheet, 1, data.id); // col A = id
  if (rowIdx === -1) return { error: 'Activity not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }
  // Update updated_at
  const updatedAtIdx = headers.indexOf('updated_at');
  if (updatedAtIdx !== -1) row[updatedAtIdx] = new Date();

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function updateTodo(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TODOS);
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Todo not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function addTodo(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TODOS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteTodo(id) {
  return deleteRowById(SHEET_NAMES.TODOS, id);
}

function updateQuestion(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUESTIONS);
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Question not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }

  // Auto-set is_answered
  const answerIdx = headers.indexOf('answer');
  const isAnsweredIdx = headers.indexOf('is_answered');
  if (answerIdx !== -1 && isAnsweredIdx !== -1) {
    row[isAnsweredIdx] = row[answerIdx] !== '' && row[answerIdx] !== null;
  }

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function addQuestion(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUESTIONS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteQuestion(id) {
  return deleteRowById(SHEET_NAMES.QUESTIONS, id);
}

function addNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES_LINKS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!data.date_added) data.date_added = new Date();
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES_LINKS);
  const rowIdx = findRowIndex(sheet, 1, data.id);
  if (rowIdx === -1) return { error: 'Note not found: ' + data.id };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }

  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id };
}

function deleteNote(id) {
  return deleteRowById(SHEET_NAMES.NOTES_LINKS, id);
}

function updateMilestone(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MILESTONES);
  const rowIdx = findRowIndex(sheet, 1, data.id);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (rowIdx === -1) {
    // Add new milestone
    const row = headers.map(h => data[h] !== undefined ? data[h] : '');
    sheet.appendRow(row);
    return { success: true, id: data.id, action: 'added' };
  }

  const row = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  for (const key in data) {
    if (key === 'id') continue;
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      row[colIdx] = data[key];
    }
  }
  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
  return { success: true, id: data.id, action: 'updated' };
}

function deleteMilestone(id) {
  return deleteRowById(SHEET_NAMES.MILESTONES, id);
}

function updateConfig(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CONFIG);
  for (const key in data) {
    const rowIdx = findRowIndex(sheet, 1, key);
    if (rowIdx !== -1) {
      sheet.getRange(rowIdx, 2).setValue(data[key]);
    } else {
      sheet.appendRow([key, data[key]]);
    }
  }
  return { success: true };
}

function addActivity(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVITIES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const now = new Date();
  if (!data.created_at) data.created_at = now;
  if (!data.updated_at) data.updated_at = now;
  if (!data.status) data.status = 'not_started';
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function moveActivity(data) {
  // data: { id, pdca_phase, sequence }
  return updateActivity(data);
}

function deleteActivity(id) {
  // Also delete associated todos, questions, notes
  deleteRowsById(SHEET_NAMES.TODOS, 'activity_id', id);
  deleteRowsById(SHEET_NAMES.QUESTIONS, 'activity_id', id);
  deleteRowsById(SHEET_NAMES.NOTES_LINKS, 'activity_id', id);
  return deleteRowById(SHEET_NAMES.ACTIVITIES, id);
}

// ---- Batch Update (for debounced writes) ----

function batchUpdate(operations) {
  const results = [];
  for (const op of operations) {
    try {
      let r;
      switch (op.action) {
        case 'updateActivity': r = updateActivity(op.data); break;
        case 'updateTodo': r = updateTodo(op.data); break;
        case 'addTodo': r = addTodo(op.data); break;
        case 'deleteTodo': r = deleteTodo(op.data.id); break;
        case 'updateQuestion': r = updateQuestion(op.data); break;
        case 'addQuestion': r = addQuestion(op.data); break;
        case 'deleteQuestion': r = deleteQuestion(op.data.id); break;
        case 'addNote': r = addNote(op.data); break;
        case 'updateNote': r = updateNote(op.data); break;
        case 'deleteNote': r = deleteNote(op.data.id); break;
        case 'updateMilestone': r = updateMilestone(op.data); break;
        case 'deleteMilestone': r = deleteMilestone(op.data.id); break;
        case 'updateConfig': r = updateConfig(op.data); break;
        case 'addTimesheetEntry': r = addTimesheetEntry(op.data); break;
        case 'deleteTimesheetEntry': r = deleteTimesheetEntry(op.data); break;
        case 'addTimeSpentEntry': r = addTimeSpentEntry(op.data); break;
        case 'deleteTimeSpentEntry': r = deleteTimeSpentEntry(op.data); break;
        case 'addTimeBilledEntry': r = addTimeBilledEntry(op.data); break;
        case 'deleteTimeBilledEntry': r = deleteTimeBilledEntry(op.data); break;
        case 'addSowEntry': r = addSowEntry(op.data); break;
        case 'addTranscriptEntry': r = addTranscriptEntry(op.data); break;
        case 'updateTranscript': r = updateTranscript(op.data); break;
        case 'deleteTranscriptEntry': r = deleteTranscriptEntry(op.data); break;
        case 'addAgreement': r = addAgreement(op.data); break;
        case 'updateAgreement': r = updateAgreement(op.data); break;
        case 'deleteAgreement': r = deleteAgreement(op.data.id); break;
        case 'addTemplateChange': r = addTemplateChange(op.data); break;
        case 'updateTemplateChange': r = updateTemplateChange(op.data); break;
        case 'addPrompt': r = addPrompt(op.data); break;
        case 'updatePrompt': r = updatePrompt(op.data); break;
        case 'addInsight': r = addInsight(op.data); break;
        case 'addProjectNote': r = addProjectNote(op.data); break;
        case 'updateProjectNote': r = updateProjectNote(op.data); break;
        case 'deleteProjectNote': r = deleteProjectNote(op.data.id); break;
        default: r = { error: 'Unknown batch action: ' + op.action };
      }
      results.push(r);
    } catch (err) {
      results.push({ error: err.message });
    }
  }
  return { success: true, results: results };
}

// ---- Seed All ----

function seedAll(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Clear and populate Activities
  if (data.activities && data.activities.length > 0) {
    const sheet = ss.getSheetByName(SHEET_NAMES.ACTIVITIES);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    clearDataRows(sheet);
    const rows = data.activities.map(a => headers.map(h => a[h] !== undefined ? a[h] : ''));
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }

  // Clear and populate Todos
  if (data.todos && data.todos.length > 0) {
    const sheet = ss.getSheetByName(SHEET_NAMES.TODOS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    clearDataRows(sheet);
    const rows = data.todos.map(t => headers.map(h => t[h] !== undefined ? t[h] : ''));
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }

  // Clear and populate Questions
  if (data.questions && data.questions.length > 0) {
    const sheet = ss.getSheetByName(SHEET_NAMES.QUESTIONS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    clearDataRows(sheet);
    const rows = data.questions.map(q => headers.map(h => q[h] !== undefined ? q[h] : ''));
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }

  // Clear Notes_Links
  clearDataRows(ss.getSheetByName(SHEET_NAMES.NOTES_LINKS));

  // Clear Technical_Milestones
  clearDataRows(ss.getSheetByName(SHEET_NAMES.MILESTONES));

  // Clear and populate Agreements
  var agSheet = ss.getSheetByName(SHEET_NAMES.AGREEMENTS);
  if (agSheet) {
    clearDataRows(agSheet);
    if (data.agreements && data.agreements.length > 0) {
      var agHeaders = agSheet.getRange(1, 1, 1, agSheet.getLastColumn()).getValues()[0];
      var agRows = data.agreements.map(function(a) { return agHeaders.map(function(h) { return a[h] !== undefined ? a[h] : ''; }); });
      if (agRows.length > 0) {
        agSheet.getRange(2, 1, agRows.length, agHeaders.length).setValues(agRows);
      }
    }
  }

  // Clear Transcripts
  var trSheet = ss.getSheetByName(SHEET_NAMES.TRANSCRIPTS);
  if (trSheet) {
    clearDataRows(trSheet);
  }

  // Clear Time_Spent
  var tsSheet = ss.getSheetByName(SHEET_NAMES.TIME_SPENT);
  if (tsSheet) {
    clearDataRows(tsSheet);
  }

  // Clear Time_Billed
  var tbSheet = ss.getSheetByName(SHEET_NAMES.TIME_BILLED);
  if (tbSheet) {
    clearDataRows(tbSheet);
  }

  // NOTE: SOW is NOT cleared — it holds project settings (total duration) configured under the gear icon

  // Clear Template_Changes
  var tcSheet = ss.getSheetByName(SHEET_NAMES.TEMPLATE_CHANGES);
  if (tcSheet) {
    clearDataRows(tcSheet);
  }

  // Set config
  if (data.config) {
    updateConfig(data.config);
  }

  return { success: true, counts: {
    activities: data.activities ? data.activities.length : 0,
    todos: data.todos ? data.todos.length : 0,
    questions: data.questions ? data.questions.length : 0
  }};
}

// ---- Utility Functions ----

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
    if (data[i][0] === value) return i + 2; // +2 because row 1 is header, array is 0-indexed
  }
  return -1;
}

function deleteRowById(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const rowIdx = findRowIndex(sheet, 1, id);
  if (rowIdx === -1) return { error: 'Not found: ' + id };
  sheet.deleteRow(rowIdx);
  return { success: true, id: id };
}

function deleteRowsById(sheetName, colName, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = headers.indexOf(colName) + 1;
  if (colIdx === 0) return;
  const data = sheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
  // Delete from bottom to top to preserve row indices
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === value) {
      sheet.deleteRow(i + 2);
    }
  }
}

function clearDataRows(sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  // Clear content first (always safe)
  sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  // Delete excess rows but always keep at least one data row to avoid
  // "cannot delete all non-frozen rows" error
  if (lastRow > 2) {
    sheet.deleteRows(3, lastRow - 2);
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
