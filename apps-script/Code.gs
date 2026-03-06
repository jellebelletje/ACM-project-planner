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
  PROMPTS: 'Prompts'
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
      case 'addActivity':
        result = addActivity(body.data);
        break;
      case 'moveActivity':
        result = moveActivity(body.data);
        break;
      case 'deleteActivity':
        result = deleteActivity(body.data.id);
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

function processTranscripts(data) {
  // 1. Get all unprocessed entries
  var transcripts = getTranscriptsAll();
  var unprocessed = transcripts.filter(function(t) {
    return !t.processed || t.processed === 'FALSE' || t.processed === false;
  });
  if (unprocessed.length === 0) return { error: 'No unprocessed entries found.' };

  // 2. Read context data
  var activities = getActivities();
  var questions = getSheetData(SHEET_NAMES.QUESTIONS).filter(function(q) {
    return !q.is_answered || q.is_answered === 'FALSE' || q.is_answered === false;
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

  var questionsContext = questions.map(function(q) {
    return q.id + ' (Activity ' + q.activity_id + '): ' + q.question_text;
  }).join('\n');

  var todosContext = todos.map(function(t) {
    return t.id + ' (Activity ' + t.activity_id + '): ' + t.text;
  }).join('\n');

  // 6. Build prompt — load from Prompts sheet (latest version), with fallback
  var promptTemplate = getLatestPrompt('process_all');
  var prompt;
  if (promptTemplate) {
    prompt = promptTemplate
      .replace(/\{\{ENTRY_COUNT\}\}/g, String(unprocessed.length))
      .replace(/\{\{CONTENT\}\}/g, combinedContent)
      .replace(/\{\{ACTIVITIES\}\}/g, activitiesContext)
      .replace(/\{\{QUESTIONS\}\}/g, questionsContext)
      .replace(/\{\{TODOS\}\}/g, todosContext);
  } else {
    // Hardcoded fallback if Prompts sheet is missing or empty
    prompt = 'You are an expert Adoption & Change Management (ACM) consultant analyzing meeting transcripts and notes from a change management trajectory.\n' +
      'There are ' + unprocessed.length + ' new entries to process.\n\n' +
      'CONTENT:\n' + combinedContent + '\n\n' +
      'ACTIVITIES:\n' + activitiesContext + '\n\n' +
      'OPEN QUESTIONS:\n' + questionsContext + '\n\n' +
      'INCOMPLETE TODOS:\n' + todosContext + '\n\n' +
      'Analyze ALL the content and return a JSON object with:\n' +
      '1. "matched_activities": array of activity IDs that this content primarily addresses\n' +
      '2. "answered_questions": array of { "id": question_id, "answer": extracted answer text, "source_entry_id": which entry ID the answer came from, "source_document": the source_document name from that entry } for questions answered in the content\n' +
      '3. "completed_todos": array of { "id": todo_id, "note": brief explanation, "source_entry_id": which entry ID, "source_document": the source_document name from that entry } for todos completed based on the content\n' +
      '4. "summary": a paragraph summarizing what ACM-relevant insights were extracted across all entries\n' +
      '5. "entry_summaries": array of { "id": entry_id, "summary": short summary, "activity_id": comma-separated matched activity IDs } for each processed entry\n\n' +
      'Only include questions/todos where the content clearly provides the answer or completion. Be conservative — do not guess.\n' +
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
      proposals: analysis
    };
  } catch (err) {
    return { error: 'Processing failed: ' + err.message };
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
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
