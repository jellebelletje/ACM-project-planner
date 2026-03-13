# Transcript Processing Feature — Implementation Prompt

Use this prompt in a fresh Claude Code session to implement the transcript processing feature.

---

## Project Overview

This is an ACM (Adoption & Change Management) Activity Dashboard. It's a vanilla HTML/CSS/JS frontend that talks to a Google Apps Script backend. Data lives in Google Sheets.

**Key files:**
- `dashboard.html` — HTML structure, modals
- `app.js` — All frontend logic, state management, rendering
- `styles.css` — All styling
- `apps-script/Code.gs` — Google Apps Script backend (reads/writes Google Sheets)
- `seed-data.js` — Default template data for new projects

## What to Build

A transcript/note processing feature that allows the user to:

1. **Upload** a client conversation transcript or note (paste text or upload .txt file)
2. **Store** it in a Google Sheet tab called "Transcripts"
3. **Process** it with the Claude API to automatically:
   - Match the content to relevant activities
   - Extract answers to open questions from the content
   - Identify completed todos from the content
   - Generate a summary of findings
4. **Review** Claude's proposals before they're applied (user approves/rejects each change)
5. **Apply** approved changes to the Questions and Todos sheets

## Architecture Decisions (already made)

- **Claude API runs in Google Apps Script** (server-side via `UrlFetchApp.fetch()`). The API key is stored in `Project_Config` sheet and never sent to the browser.
- **Review-first workflow**: Claude returns proposed changes as JSON. The frontend shows them in a review modal with checkboxes. User approves/rejects each before anything is written.

## Google Sheet Setup

### Transcripts Tab (user will create this)
Headers: `id`, `date`, `participants`, `transcript_note`, `summary`, `processed`, `activity_id`, `source_filename`, `created_at`

Note: The `transcript_note` column holds either a full conversation transcript or a shorter note — both get the same AI processing treatment.

### Project_Config Tab
User will add a row: key=`claude_api_key`, value=(their Anthropic API key)

## Implementation Details

### Phase 1: Storage & Upload

#### Code.gs additions:
- Add `TRANSCRIPTS: 'Transcripts'` to `SHEET_NAMES` object (line ~9)
- Add `getTranscriptsAll()` function using `getSheetData()` pattern with try/catch
- Add `transcripts: getTranscriptsAll()` to `getAll()` response
- Add `addTranscriptEntry(data)` — appends row with id, date, participants, transcript_note, etc.
- Add `updateTranscript(data)` — updates fields by id (for writing summary, activity_id, processed after Claude processing)
- Add `deleteTranscriptEntry(data)` — deletes row by id (same pattern as `deleteTimeSpentEntry`)
- Add cases to `doPost()` switch and `batchUpdate()` switch (for all three: addTranscriptEntry, updateTranscript, deleteTranscriptEntry)

#### app.js additions:
- Add `transcripts: []` to `state` object
- Add `transcripts` to `saveToLocalCache()`, `loadFromLocalCache()`, and all `fetchAll()` paths (mapped from `data.transcripts`)
- Upload modal: read file as text via `FileReader`, or accept paste into textarea
- Save function: `queueWrite('addTranscriptEntry', { id, date, participants, transcript_note, source_filename, created_at, processed: false })`
- Delete function: remove from state + `queueWrite('deleteTranscriptEntry', { id })`
- Render the "Raw Data Store" section at the bottom of the page (see UI section below)
- Single "Process All" button that processes ALL unprocessed entries (where `processed` is FALSE/empty) in one go. The button should be disabled/hidden when there are no unprocessed entries.

#### app.js — Nav panel update (`renderNav()`):
After the phase buttons, append a **separator line** and a "Raw Data" button at the bottom of the nav panel. This button should:
- Be visually distinct from phase buttons (e.g. smaller, dimmer, different style — no progress bar)
- Be separated from the phases by a horizontal divider (`<hr>` or border-top) with some margin
- Sit lower in the nav, clearly secondary to the phases
- On click: smooth-scroll to the "Raw Data Store" section at the bottom of the page

The nav panel is rendered in `renderNav()` (app.js line ~521). Add the separator + button after the phase `.map().join('')`. CSS class suggestion: `.nav-rawdata-separator` for the line, `.nav-rawdata-btn` for the button.

#### dashboard.html additions:
- Transcript upload modal (similar pattern to SOW modal): textarea for paste, file input for .txt upload, date picker, participants field
- **"Raw Data Store" section** at the bottom of the page (inside `<main class="content-area">`, after `#phasesContainer`):
  ```html
  <section class="raw-data-store" id="rawDataStore">
    <div class="raw-data-header">
      <h2>Raw Data Store</h2>
      <div class="raw-data-actions">
        <button class="btn-primary" onclick="openTranscriptUploadModal()">+ Add Entry</button>
        <button class="btn-primary" id="processAllBtn" onclick="processAllTranscripts()">Process All</button>
      </div>
    </div>
    <div id="transcriptList">
      <!-- Rendered by JS: historical log of all entries -->
    </div>
  </section>
  ```

#### UI — Raw Data Store section:
- Shows a **historical log** of all transcript/note entries, most recent first
- Each entry row shows: date, participants, first ~100 chars of transcript_note (truncated), processed status (green badge if processed, grey if not), and a delete button (x)
- Processed entries show a green "Processed" badge; unprocessed show grey "Pending"
- The "Process All" button should show the count of unprocessed entries (e.g. "Process All (3)") and be disabled when count is 0
- Clicking an entry could expand to show the full text + summary (if processed)

#### Existing patterns to follow:
- SOW modal pattern (recently added): `openSowModal()`, `saveSow()`, `closeModal()`
- Settings modal for the API key field: add `<label>Claude API Key<input type="password" id="cfgClaudeApiKey"></label>` to settings modal
- In `openSettings()`: load from `state.config.claude_api_key`
- In `saveSettings()`: include `claude_api_key` in `newConfig`

### Phase 2: Claude Integration

#### Code.gs — `processTranscripts(data)` function:

This processes ALL unprocessed entries in a single call. It concatenates all unprocessed transcript_note content and sends it to Claude as one prompt, so Claude sees the full picture.

```javascript
function processTranscripts(data) {
  // 1. Get all unprocessed entries
  var transcripts = getTranscriptsAll();
  var unprocessed = transcripts.filter(t => !t.processed || t.processed === 'FALSE' || t.processed === false);
  if (unprocessed.length === 0) return { error: 'No unprocessed entries found.' };

  // 2. Read all activities, open questions, incomplete todos
  var activities = getActivities();
  var questions = getSheetData(SHEET_NAMES.QUESTIONS).filter(q => !q.is_answered || q.is_answered === 'FALSE');
  var todos = getSheetData(SHEET_NAMES.TODOS).filter(t => !t.is_done || t.is_done === 'FALSE');

  // 3. Get API key from config
  var config = getConfig();
  var apiKey = config.claude_api_key;
  if (!apiKey) return { error: 'Claude API key not configured. Add it in Project Settings.' };

  // 4. Build combined content from all unprocessed entries
  var combinedContent = unprocessed.map(entry =>
    '--- Entry ' + entry.id + ' (' + (entry.date || 'no date') + ', ' + (entry.participants || 'no participants') + ') ---\n' +
    entry.transcript_note
  ).join('\n\n');

  // 5. Build the prompt
  var activitiesContext = activities.map(a =>
    a.id + ': ' + a.title + ' — ' + (a.intro_text || '')
  ).join('\n');

  var questionsContext = questions.map(q =>
    q.id + ' (Activity ' + q.activity_id + '): ' + q.question_text
  ).join('\n');

  var todosContext = todos.map(t =>
    t.id + ' (Activity ' + t.activity_id + '): ' + t.text
  ).join('\n');

  var prompt = 'You are analyzing client conversation transcripts and notes for a change management project. ' +
    'There are ' + unprocessed.length + ' new entries to process.\n\n' +
    'CONTENT:\n' + combinedContent + '\n\n' +
    'ACTIVITIES:\n' + activitiesContext + '\n\n' +
    'OPEN QUESTIONS:\n' + questionsContext + '\n\n' +
    'INCOMPLETE TODOS:\n' + todosContext + '\n\n' +
    'Analyze ALL the content and return a JSON object with:\n' +
    '1. "matched_activities": array of activity IDs that this content primarily addresses\n' +
    '2. "answered_questions": array of { "id": question_id, "answer": extracted answer text, "source_entry_id": which entry ID the answer came from } for questions answered in the content\n' +
    '3. "completed_todos": array of { "id": todo_id, "note": brief explanation, "source_entry_id": which entry ID } for todos completed based on the content\n' +
    '4. "summary": a paragraph summarizing what insights were extracted across all entries\n' +
    '5. "entry_summaries": array of { "id": entry_id, "summary": short summary, "activity_id": comma-separated matched activity IDs } for each processed entry\n\n' +
    'Only include questions/todos where the content clearly provides the answer or completion. Be conservative — do not guess.\n' +
    'Return ONLY valid JSON, no markdown formatting.';

  // 6. Call Claude API
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  if (result.error) return { error: 'Claude API error: ' + result.error.message };

  // 7. Parse Claude's response
  var analysis = JSON.parse(result.content[0].text);

  // 8. Return proposals to frontend (DO NOT auto-apply)
  //    Also return the list of entry IDs that were processed
  return {
    success: true,
    processed_entry_ids: unprocessed.map(e => e.id),
    proposals: analysis
  };
}
```

#### app.js — Processing flow:

```javascript
async function processAllTranscripts() {
  // Show loading spinner
  // Call Apps Script with action: 'processTranscripts', data: {}
  // On success: open review modal with proposals
  // Review modal shows checkboxes for each proposed change
  // "Apply Selected" button:
  //   - batch-updates approved questions/todos via existing queueWrite
  //   - updates each processed entry with its summary, activity_id, processed=true
  //     (using entry_summaries from Claude's response)
}
```

#### dashboard.html — Review modal:
- Shows matched activities (informational)
- Lists proposed question answers with checkboxes (question text + proposed answer)
- Lists proposed todo completions with checkboxes (todo text + reasoning)
- Shows generated summary
- "Apply Selected" button
- "Cancel" button (discards proposals)

### Phase 3: Polish
- Loading spinner during Claude API call
- Error handling for malformed Claude responses (try/catch with user-friendly message)
- Re-process button for already-processed entries
- Character count warning on upload if content exceeds 45,000 chars
- Transcript list shows summary on click for processed entries

## Data Flow Diagram

```
Upload:
  Browser → addTranscriptEntry → Transcripts sheet (processed=FALSE)

Process All:
  Browser → processTranscripts → Code.gs finds ALL unprocessed entries
                                → Concatenates their transcript_note content
                                → Calls Claude API with combined content
                                → Claude returns JSON proposals
                                → Code.gs returns proposals + entry IDs to browser

  Browser shows review modal → User checks/unchecks proposals → clicks "Apply Selected"

  Browser → batchUpdate → [updateQuestion x N, updateTodo x N, updateTranscript x M]
                         → Questions sheet (answer fields populated)
                         → Todos sheet (is_done = TRUE)
                         → Transcripts sheet (each entry gets: summary, activity_id, processed=TRUE)
```

## Key Technical Notes

- `updateQuestion({ id, answer })` automatically sets `is_answered = true` in Code.gs when answer is non-empty
- `updateTodo({ id, is_done: true })` marks todo as done
- Frontend uses `queueWrite()` which debounces and batches into a single `batchUpdate` POST
- Google Sheets cell limit is 50,000 characters — warn user if content is longer
- Apps Script has a 6-minute execution timeout — Claude API typically responds in 10-60 seconds
- The Claude API key in `Project_Config` is read by `getConfig()` and returned in `getAll()` — you may want to **exclude** it from the getAll response for security (only read it server-side in `processTranscript`)

## Security Note

The `claude_api_key` should NOT be sent to the browser. In `getAll()`, either:
- Filter it out: `config.claude_api_key = undefined` before returning
- Or use a separate config function that only `processTranscript` calls internally

The frontend only needs to know whether a key is configured (boolean), not the key itself. Consider adding a `has_claude_api_key: !!config.claude_api_key` field to the getAll response instead.
