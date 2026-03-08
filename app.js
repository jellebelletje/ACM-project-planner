// =============================================================
// ACM Activity Dashboard — Application Logic
// =============================================================

// ---- Configuration ----
const currentProject = (() => {
  try { return JSON.parse(sessionStorage.getItem('acm_current_project')); }
  catch { return null; }
})();

const CONFIG = {
  API_URL: currentProject ? currentProject.api_url || '' : (localStorage.getItem('acm_api_url') || ''),
  PROJECT_ID: currentProject ? currentProject.id : 'default',
  DEBOUNCE_MS: 500,
  CACHE_KEY: currentProject ? `acm_cache_${currentProject.id}` : 'acm_dashboard_cache',
  MASTER_URL_KEY: 'acm_master_url',
  PHASES: [
    'Plan I: Diagnosis',
    'Plan II: Design + Activate Champions',
    'Do: Deployment',
    'Check: Analysis',
    'Act: Handover, Anchor & Learn'
  ]
};

// Known spelling variants → canonical CONFIG.PHASES name
const PHASE_ALIASES = {
  'Check: Analyse': 'Check: Analysis'
};

function normalizePhaseNames() {
  state.activities.forEach(a => {
    if (a.pdca_phase && PHASE_ALIASES[a.pdca_phase]) {
      a.pdca_phase = PHASE_ALIASES[a.pdca_phase];
    }
  });
}

// Default time allocation percentages (based on 20-day / 160-hour baseline)
const DEFAULT_ALLOCATED_PCT = {
  A00: 5, A35: 2, A01: 3, A02: 4, A03: 4, A04: 3, A05: 2, A06: 2, A12: 2, A07: 2,
  A08: 5, A13: 3, A09: 4, A11: 4, A10: 4, A14: 3, A15: 3, A16: 2, A17: 2,
  A18: 4, A19: 5, A20: 4, A21: 3, A22: 3, A23: 3, A33: 3, A24: 3,
  A34: 3, A26: 3, A27: 2, A28: 2,
  A29: 2, A30: 1, A31: 1, A32: 1
};

// ---- Application State ----
const state = {
  activities: [],
  todos: [],
  questions: [],
  notes: [],
  milestones: [],
  timeSpent: [],
  timeBilled: [],
  sow: [],
  config: {},
  expandedActivityId: null,
  activeTab: {},
  searchQuery: '',
  filterStatus: '',
  editingMilestoneId: null,
  showInactive: {},
  showInactiveTodos: {},
  showInactiveQuestions: {},
  timeEntryOpen: false,
  transcripts: [],
  expandedTranscriptId: null,
  agreements: [],
  templateChanges: [],
  prompts: [],
  insights: [],
  projectNotes: [],
  chatLog: []
};

// ---- Debounce & Sync ----
const pendingWrites = [];
let debounceTimer = null;
let isSyncing = false;

function showSync(type = 'saving') {
  const el = document.getElementById('syncIndicator');
  el.style.display = 'flex';
  el.className = 'sync-indicator' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  el.querySelector('.sync-text').textContent = type === 'saving' ? 'Saving...' : type === 'error' ? 'Sync failed' : 'Saved';
  if (type === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 1500);
  }
}

function queueWrite(action, data) {
  pendingWrites.push({ action, data });
  saveToLocalCache();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushWrites, CONFIG.DEBOUNCE_MS);
}

async function flushWrites() {
  if (isSyncing || pendingWrites.length === 0) return;
  if (!CONFIG.API_URL) return;

  isSyncing = true;
  showSync('saving');

  const ops = pendingWrites.splice(0, pendingWrites.length);

  try {
    await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'batchUpdate', data: ops }),
      redirect: 'follow'
    });
    showSync('success');
  } catch (e) {
    console.error('Sync failed:', e);
    pendingWrites.unshift(...ops);
    showSync('error');
  } finally {
    isSyncing = false;
  }
}

// ---- Local Cache ----
function saveToLocalCache() {
  const cache = {
    activities: state.activities,
    todos: state.todos,
    questions: state.questions,
    notes: state.notes,
    milestones: state.milestones,
    timeSpent: state.timeSpent,
    timeBilled: state.timeBilled,
    sow: state.sow,
    transcripts: state.transcripts,
    agreements: state.agreements,
    templateChanges: state.templateChanges,
    prompts: state.prompts,
    insights: state.insights,
    projectNotes: state.projectNotes,
    chatLog: state.chatLog,
    config: state.config,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* localStorage full, ignore */ }
}

function loadFromLocalCache() {
  try {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      Object.assign(state, {
        activities: data.activities || [],
        todos: data.todos || [],
        questions: data.questions || [],
        notes: data.notes || [],
        milestones: data.milestones || [],
        timeSpent: data.timeSpent || [],
        timeBilled: data.timeBilled || [],
        sow: data.sow || [],
        transcripts: data.transcripts || [],
        agreements: data.agreements || [],
        templateChanges: data.templateChanges || [],
        prompts: data.prompts || [],
        insights: data.insights || [],
        projectNotes: data.projectNotes || [],
        chatLog: data.chatLog || [],
        config: data.config || {}
      });
      normalizePhaseNames();
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

// ---- Undo System ----
const UNDO_MAX = 5;
const undoStack = [];
let _undoGroupKey = null;
let _undoGroupTimer = null;
let _undoInProgress = false;
const UNDO_GROUP_TIMEOUT = 2000;

function snapshotForUndo(label, groupKey) {
  if (_undoInProgress) return;
  if (groupKey) {
    if (_undoGroupKey === groupKey) {
      clearTimeout(_undoGroupTimer);
      _undoGroupTimer = setTimeout(() => { _undoGroupKey = null; }, UNDO_GROUP_TIMEOUT);
      return;
    }
    _undoGroupKey = groupKey;
    clearTimeout(_undoGroupTimer);
    _undoGroupTimer = setTimeout(() => { _undoGroupKey = null; }, UNDO_GROUP_TIMEOUT);
  }
  const snapshot = {
    activities: JSON.parse(JSON.stringify(state.activities)),
    todos: JSON.parse(JSON.stringify(state.todos)),
    questions: JSON.parse(JSON.stringify(state.questions)),
    agreements: JSON.parse(JSON.stringify(state.agreements)),
    notes: JSON.parse(JSON.stringify(state.notes)),
    milestones: JSON.parse(JSON.stringify(state.milestones)),
    config: JSON.parse(JSON.stringify(state.config)),
  };
  undoStack.push({ label, snapshot, timestamp: Date.now() });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  renderUndoButton();
}

function generateDiffOps(snapshot) {
  const ops = [];
  const collections = [
    { key: 'activities', add: 'addActivity', update: 'updateActivity', del: 'deleteActivity' },
    { key: 'todos', add: 'addTodo', update: 'updateTodo', del: 'deleteTodo' },
    { key: 'questions', add: 'addQuestion', update: 'updateQuestion', del: 'deleteQuestion' },
    { key: 'agreements', add: 'addAgreement', update: 'updateAgreement', del: 'deleteAgreement' },
    { key: 'notes', add: 'addNote', update: 'updateNote', del: 'deleteNote' },
    { key: 'milestones', add: 'updateMilestone', update: 'updateMilestone', del: 'deleteMilestone' },
  ];
  collections.forEach(({ key, add, update, del }) => {
    const snapMap = new Map((snapshot[key] || []).map(item => [item.id, item]));
    const currMap = new Map((state[key] || []).map(item => [item.id, item]));
    currMap.forEach((item, id) => { if (!snapMap.has(id)) ops.push({ action: del, data: { id } }); });
    snapMap.forEach((snapItem, id) => {
      const curItem = currMap.get(id);
      if (!curItem) { ops.push({ action: add, data: snapItem }); }
      else if (JSON.stringify(snapItem) !== JSON.stringify(curItem)) { ops.push({ action: update, data: snapItem }); }
    });
  });
  if (JSON.stringify(snapshot.config) !== JSON.stringify(state.config)) {
    ops.push({ action: 'updateConfig', data: snapshot.config });
  }
  return ops;
}

function undo() {
  if (undoStack.length === 0) return;
  const { label, snapshot } = undoStack.pop();
  _undoGroupKey = null;
  clearTimeout(_undoGroupTimer);
  _undoInProgress = true;
  pendingWrites.length = 0;
  clearTimeout(debounceTimer);
  const ops = generateDiffOps(snapshot);
  state.activities = snapshot.activities;
  state.todos = snapshot.todos;
  state.questions = snapshot.questions;
  state.agreements = snapshot.agreements;
  state.notes = snapshot.notes;
  state.milestones = snapshot.milestones;
  state.config = snapshot.config;
  ops.forEach(op => pendingWrites.push(op));
  saveToLocalCache();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushWrites, CONFIG.DEBOUNCE_MS);
  clearCache();
  renderAll();
  attachExpandedEvents();
  _undoInProgress = false;
  renderUndoButton();
  showSync('saving');
}

function renderUndoButton() {
  const btn = document.getElementById('undoBtn');
  if (!btn) return;
  if (undoStack.length === 0) {
    btn.style.display = 'none';
  } else {
    btn.style.display = '';
    btn.title = 'Undo: ' + undoStack[undoStack.length - 1].label;
  }
}

// ---- Data Fetching ----
async function fetchAll() {
  if (!CONFIG.API_URL) {
    // Try loading from local seed-data.json for demo
    // Try fetch first (works with http:// but not file://)
    try {
      const resp = await fetch('seed-data.json?v=' + Date.now());
      if (resp.ok) {
        const data = await resp.json();
        state.activities = data.activities || [];
        state.todos = data.todos || [];
        state.questions = data.questions || [];
        state.notes = data.notes || [];
        state.milestones = data.milestones || [];
        state.timeSpent = data.time_spent || [];
        state.timeBilled = data.time_billed || [];
        state.sow = data.sow || [];
        state.transcripts = data.transcripts || [];
        state.agreements = data.agreements || [];
        state.templateChanges = data.template_changes || [];
        state.prompts = data.prompts || [];
        state.insights = data.insights || [];
        state.projectNotes = data.project_notes || [];
        state.chatLog = data.chat_log || [];
        state.config = data.config || {};
        normalizePhaseNames();
        normalizeAgreements();
        saveToLocalCache();
        return true;
      }
    } catch (e) { /* fetch not available (file:// protocol) */ }

    // Fallback: use embedded seed data from seed-data.js
    if (window.SEED_DATA) {
      const data = window.SEED_DATA;
      state.activities = data.activities || [];
      state.todos = data.todos || [];
      state.questions = data.questions || [];
      state.notes = data.notes || [];
      state.milestones = data.milestones || [];
      state.timeSpent = data.time_spent || [];
      state.timeBilled = data.time_billed || [];
      state.sow = data.sow || [];
      state.transcripts = data.transcripts || [];
      state.agreements = data.agreements || [];
      state.templateChanges = data.template_changes || [];
      state.prompts = data.prompts || [];
      state.insights = data.insights || [];
      state.projectNotes = data.project_notes || [];
      state.chatLog = data.chat_log || [];
      state.config = data.config || {};
      normalizePhaseNames();
      normalizeAgreements();
      saveToLocalCache();
      return true;
    }

    return loadFromLocalCache();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(CONFIG.API_URL + '?action=getAll', { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    // Preserve local config if there are pending config writes (prevents stale API data from overwriting recent changes)
    const hadPendingConfig = pendingWrites.some(w => w.action === 'updateConfig');
    const localConfig = hadPendingConfig ? { ...state.config } : null;
    state.activities = data.activities || [];
    state.todos = data.todos || [];
    state.questions = data.questions || [];
    state.notes = data.notes || [];
    state.milestones = data.milestones || [];
    state.timeSpent = data.time_spent || [];
    state.timeBilled = data.time_billed || [];
    state.sow = data.sow || [];
    state.transcripts = data.transcripts || [];
    state.agreements = data.agreements || [];
    state.templateChanges = data.template_changes || [];
    state.prompts = data.prompts || [];
    state.insights = data.insights || [];
    state.projectNotes = data.project_notes || [];
    state.chatLog = data.chat_log || [];
    state.config = typeof data.config === 'object' && !Array.isArray(data.config) ? data.config : {};
    if (localConfig) {
      Object.assign(state.config, localConfig);
    }
    normalizePhaseNames();
    normalizeAgreements();
    saveToLocalCache();
    return true;
  } catch (e) {
    console.error('Fetch failed, using cache:', e);
    return loadFromLocalCache();
  }
}

function showSyncError() {
  const existing = document.getElementById('syncErrorBanner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'syncErrorBanner';
  banner.className = 'sync-error-banner';
  banner.innerHTML = `Could not connect to Google Sheets — showing cached data. <button class="sync-retry-btn" onclick="retrySyncFromBanner()">Retry</button><button onclick="this.parentElement.remove()">✕</button>`;
  document.body.prepend(banner);
}

function retrySyncFromBanner() {
  const btn = document.querySelector('.sync-retry-btn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Retrying…';
  let dots = 0;
  const dotTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    btn.textContent = 'Retrying' + '.'.repeat(dots);
  }, 500);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  fetch(CONFIG.API_URL + '?action=getAll', { redirect: 'follow', signal: controller.signal })
    .then(r => r.json())
    .then(data => {
      clearTimeout(timeout);
      clearInterval(dotTimer);
      state.activities = data.activities || [];
      state.todos = data.todos || [];
      state.questions = data.questions || [];
      state.notes = data.notes || [];
      state.milestones = data.milestones || [];
      state.timeSpent = data.time_spent || [];
      state.timeBilled = data.time_billed || [];
      state.transcripts = data.transcripts || [];
      state.insights = data.insights || [];
      state.projectNotes = data.project_notes || [];
      state.config = typeof data.config === 'object' && !Array.isArray(data.config) ? data.config : {};
      saveToLocalCache();
      const banner = document.getElementById('syncErrorBanner');
      if (banner) banner.remove();
      renderAll();
      attachExpandedEvents();
    })
    .catch(() => {
      clearTimeout(timeout);
      clearInterval(dotTimer);
      btn.disabled = false;
      btn.textContent = 'Retry';
    });
}

// ---- Helper Functions ----
function escapeHtml(str) {
  if (!str) return '';
  const s = String(str);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateLong(date) {
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = d.getDate();
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
    : (day === 2 || day === 22) ? 'nd'
    : (day === 3 || day === 23) ? 'rd' : 'th';
  return `${day}${suffix} ${fullMonths[d.getMonth()]} ${d.getFullYear()}`;
}

function renderMarkdownGuidance(text) {
  if (!text) return '';
  // Split on sentences that start with "For **" to create list items
  const parts = text.split(/(?=For \*\*)/g).map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // No "For **" pattern — just render markdown inline
    return `<p>${simpleMarkdown(escapeHtml(text))}</p>`;
  }
  return '<ul class="guidance-list">' + parts.map(p =>
    `<li>${simpleMarkdown(escapeHtml(p))}</li>`
  ).join('') + '</ul>';
}

function simpleMarkdown(html) {
  // Convert **bold** to <strong>
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function truncate(str, len = 80) {
  if (!str) return '';
  const s = String(str);
  return s.length > len ? s.substring(0, len) + '...' : s;
}

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function isTodoDone(t) {
  return t.is_done === true || t.is_done === 'TRUE' || t.is_done === 'true';
}

function isQuestionAnswered(q) {
  return (q.answer && String(q.answer).trim()) || q.is_answered === true || q.is_answered === 'TRUE' || q.is_answered === 'true';
}

// Render-cycle cache: cleared before each render pass to avoid stale data
const _cache = {};
function clearCache() {
  for (const k in _cache) delete _cache[k];
}

function getActivityTodos(actId) {
  const key = 'todos_' + actId;
  if (_cache[key]) return _cache[key];
  const result = state.todos.filter(t => t.activity_id === actId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  _cache[key] = result;
  return result;
}

function getActivityQuestions(actId) {
  const key = 'questions_' + actId;
  if (_cache[key]) return _cache[key];
  const result = state.questions.filter(q => q.activity_id === actId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  _cache[key] = result;
  return result;
}

function getActivityNotes(actId) {
  const key = 'notes_' + actId;
  if (_cache[key]) return _cache[key];
  const result = state.notes.filter(n => n.activity_id === actId);
  _cache[key] = result;
  return result;
}

function getPhaseActivities(phase) {
  const key = 'phase_' + phase;
  if (_cache[key]) return _cache[key];
  const result = state.activities
    .filter(a => a.pdca_phase === phase)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  _cache[key] = result;
  return result;
}

function getActivity(id) { return state.activities.find(a => a.id === id); }
function getTodo(id) { return state.todos.find(t => t.id === id); }
function getQuestion(id) { return state.questions.find(q => q.id === id); }
function getNote(id) { return state.notes.find(n => n.id === id); }
function getMilestone(id) { return state.milestones.find(m => m.id === id); }
function getAgreement(id) { return state.agreements.find(a => a.id === id); }

function normalizeAgreements() {
  state.agreements.forEach((a, i) => {
    if (!a.id) a.id = 'AG_auto_' + (i + 1);
    if (a.active === undefined || a.active === '') a.active = true;
    if (!a.added_by) a.added_by = '';
    if (!a.added_on) a.added_on = '';
  });
}

function isMetaActivity(act) {
  return act.activity_type === 'meta';
}

// ---- Template Change Tracking ----
const TEMPLATE_FIELDS_ACTIVITY = ['title', 'intro_text', 'full_description', 'particularisation_guidance', 'activity_type', 'pdca_phase', 'sequence'];

function trackTemplateChange(changeType, itemType, itemId, field, oldValue, newValue, description) {
  const change = {
    id: generateId('TC'),
    change_type: changeType,
    item_type: itemType,
    item_id: itemId,
    field: field || '',
    old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : '',
    new_value: newValue !== undefined && newValue !== null ? String(newValue) : '',
    description: description || '',
    created_at: new Date().toISOString(),
    status: 'pending'
  };
  state.templateChanges.push(change);
  queueWrite('addTemplateChange', change);
  renderNav();
}

function getPhases() {
  // Get unique phases in order, preserving custom phases
  const seen = new Set();
  const phases = [];
  // Start with configured order
  CONFIG.PHASES.forEach(p => {
    if (state.activities.some(a => a.pdca_phase === p)) {
      seen.add(p);
      phases.push(p);
    }
  });
  // Add any custom phases
  state.activities.forEach(a => {
    if (a.pdca_phase && !seen.has(a.pdca_phase)) {
      seen.add(a.pdca_phase);
      phases.push(a.pdca_phase);
    }
  });
  return phases;
}

// ---- Phase auto-advance ----
function checkPhaseAdvance() {
  const phases = getPhases();
  if (phases.length === 0) return;
  const current = state.config.current_phase || phases[0];
  const idx = phases.indexOf(current);
  if (idx === -1 || idx >= phases.length - 1) return; // unknown or already last phase

  // Check if all non-inactive, non-deprioritised activities in the current phase are completed
  const acts = getPhaseActivities(current);
  const activeActs = acts.filter(a => a.status !== 'inactive' && !a.deprioritised);
  if (activeActs.length === 0) return; // no activities to complete
  const allDone = activeActs.every(a => a.status === 'completed');
  if (!allDone) return;

  // Advance to next phase
  const nextPhase = phases[idx + 1];
  state.config.current_phase = nextPhase;
  queueWrite('updateConfig', { current_phase: nextPhase });
}

// ---- Search ----
function matchesSearch(text) {
  if (!state.searchQuery) return true;
  return String(text || '').toLowerCase().includes(state.searchQuery.toLowerCase());
}

function activityMatchesSearch(act) {
  if (!state.searchQuery) return true;
  const q = state.searchQuery.toLowerCase();

  if (String(act.title || '').toLowerCase().includes(q)) return true;
  if (String(act.intro_text || '').toLowerCase().includes(q)) return true;
  if (String(act.full_description || '').toLowerCase().includes(q)) return true;

  const todos = getActivityTodos(act.id);
  if (todos.some(t => String(t.text || '').toLowerCase().includes(q))) return true;

  const questions = getActivityQuestions(act.id);
  if (questions.some(qn => String(qn.question_text || '').toLowerCase().includes(q) || String(qn.answer || '').toLowerCase().includes(q))) return true;

  const notes = getActivityNotes(act.id);
  if (notes.some(n => String(n.content || '').toLowerCase().includes(q) || String(n.label || '').toLowerCase().includes(q))) return true;

  return false;
}

function activityMatchesFilter(act) {
  if (!state.filterStatus) return true;
  return act.status === state.filterStatus;
}

function highlightText(text) {
  if (!state.searchQuery || !text) return escapeHtml(text);
  const escaped = escapeHtml(String(text));
  const q = escapeHtml(state.searchQuery);
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

// ---- What's Next ----
function getWhatsNext() {
  const phases = getPhases();
  for (const phase of phases) {
    const acts = getPhaseActivities(phase);
    for (const act of acts) {
      if (act.deprioritised) continue;
      if (act.status === 'not_started' || act.status === 'in_progress') {
        const todos = getActivityTodos(act.id).filter(t => t.active !== false);
        const questions = getActivityQuestions(act.id).filter(q => q.active !== false);
        const incompleteTodos = todos.filter(t => !isTodoDone(t)).length;
        const unansweredQs = questions.filter(q => !isQuestionAnswered(q)).length;

        // Get unique "ask whom" for unanswered questions
        const askWhom = [...new Set(questions.filter(q => !isQuestionAnswered(q) && q.ask_whom).map(q => q.ask_whom))];

        return { activity: act, phase, incompleteTodos, unansweredQs, askWhom };
      }
    }
  }
  return null;
}

// ---- Dependency Checking ----
function checkDependencies(act) {
  if (!act.depends_on) return [];
  const depIds = String(act.depends_on).split(',').map(s => s.trim()).filter(Boolean);
  const incomplete = [];
  for (const depId of depIds) {
    const dep = getActivity(depId);
    if (dep && dep.status !== 'completed') {
      incomplete.push(dep);
    }
  }
  return incomplete;
}

// ---- Renderers ----

function renderAll() {
  clearCache();
  renderNav();
  renderTimeline();
  renderStatusBar();
  renderNowDoing();
  renderWhatsNext();
  renderPhases();
  renderTranscripts();
  renderAgreements();
  updateProjectHeader();
}

function updateProjectHeader() {
  document.getElementById('projectName').textContent = state.config.project_name || 'ACM Project';
  document.getElementById('clientName').textContent = state.config.client_name || '';
}

function renderNav() {
  const nav = document.getElementById('navPanel');
  const phases = getPhases();

  nav.innerHTML = phases.map(phase => {
    const acts = getPhaseActivities(phase).filter(a => a.status !== 'inactive' && !a.deprioritised);
    const completed = acts.filter(a => a.status === 'completed').length;
    const total = acts.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isActive = state.expandedActivityId && acts.some(a => a.id === state.expandedActivityId);

    return `<button class="nav-phase${isActive ? ' active' : ''}" data-phase="${escapeHtml(phase)}">
      <span class="nav-phase-name">${escapeHtml(phase)}</span>
      <span class="nav-phase-progress">
        <span class="nav-progress-bar"><span class="nav-progress-fill" style="width:${pct}%"></span></span>
        ${completed}/${total}
      </span>
    </button>`;
  }).join('');

  // Agreements button
  nav.innerHTML += `
    <div class="nav-rawdata-separator"></div>
    <button class="nav-rawdata-btn" data-scroll-target="agreementsSection">
      <span class="nav-rawdata-icon">&#9999;&#65039;</span>
      Agreements
    </button>`;

  // Update Template button (only if pending changes exist)
  const pendingTC = state.templateChanges.filter(tc => tc.status === 'pending').length;
  if (pendingTC > 0) {
    nav.innerHTML += `
      <div class="nav-rawdata-separator"></div>
      <button class="nav-rawdata-btn" onclick="openTemplateChangesModal()">
        <span class="nav-rawdata-icon">&#128295;</span>
        Update Template <span class="nav-rawdata-badge">${pendingTC}</span>
      </button>`;
  }

  // Raw Data button below phases
  const unprocessedCount = state.transcripts.filter(t => !t.processed || t.processed === 'FALSE' || t.processed === false).length;
  nav.innerHTML += `
    <div class="nav-rawdata-separator"></div>
    <button class="nav-rawdata-btn" data-scroll-target="rawDataStore">
      <span class="nav-rawdata-icon">&#128196;</span>
      Raw Data${unprocessedCount > 0 ? ' <span class="nav-rawdata-badge">' + unprocessedCount + '</span>' : ''}
    </button>`;
}

function renderTimeline() {
  const technicalMs = state.milestones.filter(m => m.timeline_type !== 'acm');
  const acmMs = state.milestones.filter(m => m.timeline_type === 'acm');

  // Compute global date range across BOTH timelines + project start/end for alignment
  const allDated = state.milestones.filter(m => m.date);
  const projectStart = state.config.start_date ? new Date(state.config.start_date).getTime() : null;
  const projectEnd = state.config.end_date ? new Date(state.config.end_date).getTime() : null;

  // Collect all known dates (milestones + project bounds)
  const allDates = allDated.map(m => new Date(m.date).getTime());
  if (projectStart && !isNaN(projectStart)) allDates.push(projectStart);
  if (projectEnd && !isNaN(projectEnd)) allDates.push(projectEnd);

  let globalMin, globalMax;

  if (allDates.length >= 2) {
    globalMin = Math.min(...allDates);
    globalMax = Math.max(...allDates);
    const padding = (globalMax - globalMin) * 0.05 || (86400000 * 7);
    globalMin -= padding;
    globalMax += padding;
  } else if (allDates.length === 1) {
    const d = allDates[0];
    globalMin = d - 86400000 * 30;
    globalMax = d + 86400000 * 30;
  } else {
    globalMin = null;
    globalMax = null;
  }

  renderSingleTimeline('timelineBarTechnical', technicalMs, globalMin, globalMax, projectStart, projectEnd);
  renderSingleTimeline('timelineBarAcm', acmMs, globalMin, globalMax, projectStart, projectEnd);

  // "We are here" today marker above the technical timeline
  const techBar = document.getElementById('timelineBarTechnical');
  if (techBar) {
    let marker = techBar.querySelector('.today-marker');
    if (marker) marker.remove();

    if (globalMin !== null && globalMax !== null && globalMax !== globalMin) {
      const now = Date.now();
      const pct = ((now - globalMin) / (globalMax - globalMin)) * 100;
      if (pct >= 0 && pct <= 100) {
        marker = document.createElement('div');
        marker.className = 'today-marker';
        marker.style.left = pct.toFixed(1) + '%';
        marker.innerHTML = '<span class="today-label">We are here</span><span class="today-chevron">&#9660;</span>';
        techBar.appendChild(marker);
      }
    }
  }
}

function renderSingleTimeline(barId, milestones, globalMin, globalMax, projectStart, projectEnd) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  // Build project boundary markers HTML
  let boundaryHtml = '';
  if (globalMin !== null && globalMax !== null && globalMax !== globalMin) {
    if (projectStart && !isNaN(projectStart)) {
      const pct = Math.max(0, Math.min(100, ((projectStart - globalMin) / (globalMax - globalMin)) * 100));
      boundaryHtml += `<div class="timeline-project-marker project-start-marker" style="left:${pct.toFixed(1)}%">
        <div class="project-marker-line"></div>
        <span class="project-marker-label">Start: ${formatDate(new Date(projectStart).toISOString())}</span>
      </div>`;
    }
    if (projectEnd && !isNaN(projectEnd)) {
      const pct = Math.max(0, Math.min(100, ((projectEnd - globalMin) / (globalMax - globalMin)) * 100));
      boundaryHtml += `<div class="timeline-project-marker project-end-marker" style="left:${pct.toFixed(1)}%">
        <div class="project-marker-line"></div>
        <span class="project-marker-label">End: ${formatDate(new Date(projectEnd).toISOString())}</span>
      </div>`;
    }
  }

  if (milestones.length === 0) {
    bar.innerHTML = '<div class="timeline-line"></div>' + boundaryHtml +
      '<div style="position:relative;z-index:1;color:var(--text-light);font-size:0.8rem;text-align:center;width:100%;padding:8px 0;">' +
      'No milestones yet.</div>';
    return;
  }

  const sorted = [...milestones].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  let html = '<div class="timeline-line"></div>' + boundaryHtml;
  const undated = sorted.filter(m => !m.date);

  sorted.forEach(m => {
    let leftPercent;
    if (m.date && globalMin !== null && globalMax !== null && globalMax !== globalMin) {
      const d = new Date(m.date).getTime();
      leftPercent = ((d - globalMin) / (globalMax - globalMin)) * 100;
      leftPercent = Math.max(2, Math.min(98, leftPercent));
    } else {
      const undatedIdx = undated.indexOf(m);
      const undatedCount = undated.length;
      leftPercent = 85 + (undatedIdx / Math.max(undatedCount, 1)) * 13;
    }

    html += `<div class="timeline-milestone" data-milestone-id="${escapeHtml(m.id)}" style="left:${leftPercent.toFixed(1)}%">
      <div class="milestone-dot ${escapeHtml(m.status || 'planned')}"></div>
      <span class="milestone-label">${escapeHtml(m.milestone_name)}</span>
      ${m.date ? `<span class="milestone-date">${formatDate(m.date)}</span>` : '<span class="milestone-date" style="font-style:italic;">(no date)</span>'}
    </div>`;
  });

  bar.innerHTML = html;

  bar.querySelectorAll('.timeline-milestone').forEach(el => {
    el.addEventListener('click', () => openMilestoneModal(el.dataset.milestoneId));
  });
}

// ---- Time Tracking Helpers ----
function getTotalBilledMinutes() {
  return state.timeBilled.reduce((sum, e) => sum + (parseInt(e.billed_minutes) || 0), 0);
}

function getTotalSpentMinutes() {
  return state.timeSpent.reduce((sum, e) => sum + (parseInt(e.spent_minutes) || 0), 0);
}

function getActivityTimeSpent(actId) {
  return state.timeSpent.filter(e => e.activity_id === actId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function getActivityTimeBilled(actId) {
  return state.timeBilled.filter(e => e.activity_id === actId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function recalcActualMinutes(actId) {
  const total = getActivityTimeSpent(actId).reduce((sum, e) => sum + (parseInt(e.spent_minutes) || 0), 0);
  const act = getActivity(actId);
  if (act) {
    act.actual_minutes = total;
    queueWrite('updateActivity', { id: actId, actual_minutes: total });
  }
  return total;
}

function getTotalBudgetMinutes() {
  const val = parseFloat(state.config.total_duration_value);
  if (!val || val <= 0) return 0;
  const unit = state.config.duration_unit || 'hours';
  return unit === 'days' ? val * 480 : val * 60;
}

function formatMinutes(mins, unit) {
  if (unit === 'days') {
    return (mins / 480).toFixed(1) + 'd';
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getActivityAllocatedPct(act) {
  if (act.allocated_pct !== undefined && act.allocated_pct !== null && act.allocated_pct !== '') {
    return parseFloat(act.allocated_pct) || 0;
  }
  return DEFAULT_ALLOCATED_PCT[act.id] || 0;
}

function getEffectiveAllocatedPct(actId) {
  const act = getActivity(actId);
  if (!act || act.status === 'inactive' || act.deprioritised) return 0;
  const rawPct = getActivityAllocatedPct(act);
  if (_cache.sumActivePct === undefined) {
    _cache.sumActivePct = state.activities
      .filter(a => a.status !== 'inactive' && !a.deprioritised)
      .reduce((sum, a) => sum + getActivityAllocatedPct(a), 0);
  }
  const sumActive = _cache.sumActivePct;
  if (sumActive <= 0) return 0;
  return (rawPct / sumActive) * 100;
}

function getAllocatedMinutes(actId) {
  const pct = getEffectiveAllocatedPct(actId);
  return Math.round((pct / 100) * getTotalBudgetMinutes());
}

function formatMinutesHM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatEntryLine(minutes, dateStr, createdAt, activityName) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const duration = `${h}' ${String(m).padStart(2, '0')}''`;

  // Parse date (YYYY-MM-DD) for display
  let dateDisplay = dateStr || '';
  if (dateStr && dateStr.length >= 10) {
    const parts = dateStr.split('-');
    const day = parseInt(parts[2], 10);
    const mon = MONTH_NAMES[parseInt(parts[1], 10) - 1] || parts[1];
    const year = parts[0];
    dateDisplay = `${day} ${mon} ${year}`;
  }

  // Parse time from created_at (ISO string)
  let timeDisplay = '';
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      timeDisplay = ` at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  const prefix = activityName ? `${activityName}: ` : '';
  return `${prefix}${duration} logged on ${dateDisplay}${timeDisplay}`;
}

function addTimeBilledEntry(activityId, billedMinutes, note) {
  const entry = {
    id: generateId('TB'),
    activity_id: activityId,
    date: new Date().toISOString().split('T')[0],
    billed_minutes: billedMinutes,
    note: note || '',
    created_at: new Date().toISOString()
  };
  state.timeBilled.push(entry);
  queueWrite('addTimeBilledEntry', entry);
  renderStatusBar();
}

function addTimeSpentEntry(activityId, spentMinutes, note) {
  const entry = {
    id: generateId('TS'),
    activity_id: activityId,
    date: new Date().toISOString().split('T')[0],
    spent_minutes: spentMinutes,
    note: note || '',
    created_at: new Date().toISOString()
  };
  state.timeSpent.push(entry);
  queueWrite('addTimeSpentEntry', entry);
  recalcActualMinutes(activityId);
  renderStatusBar();
}

function renderStatusBar() {
  const bar = document.getElementById('statusBar');
  const depriIds = new Set(state.activities.filter(a => a.deprioritised).map(a => a.id));
  const activeActivities = state.activities.filter(a => a.status !== 'inactive' && !a.deprioritised);
  const total = activeActivities.length;
  const completed = activeActivities.filter(a => a.status === 'completed').length;
  const activeTodos = state.todos.filter(t => t.active !== false && !depriIds.has(t.activity_id));
  const allTodos = activeTodos.length;
  const doneTodos = activeTodos.filter(t => isTodoDone(t)).length;
  const activeQs = state.questions.filter(q => q.active !== false && !depriIds.has(q.activity_id));
  const allQs = activeQs.length;
  const answeredQs = activeQs.filter(q => isQuestionAnswered(q)).length;
  const currentPhase = state.config.current_phase || getPhases()[0] || '';

  const unit = state.config.duration_unit || 'hours';
  const budgetMins = getTotalBudgetMinutes();
  const billedMins = getTotalBilledMinutes();
  const pct = budgetMins > 0 ? Math.min((billedMins / budgetMins) * 100, 100) : 0;
  const barColor = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e';

  const budgetLabel = budgetMins > 0
    ? `<strong>${formatMinutes(billedMins, unit)}</strong> / ${formatMinutes(budgetMins, unit)}`
    : `<strong>${formatMinutes(billedMins, unit)}</strong> billed`;

  // Build billing tooltip from Time_Billed entries
  const sortedBilled = [...state.timeBilled].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  let billedTooltip = '';
  if (sortedBilled.length > 0) {
    billedTooltip = sortedBilled.map(e => {
      const act = getActivity(e.activity_id);
      const actName = act ? (act.title || e.activity_id) : e.activity_id;
      const mins = parseInt(e.billed_minutes) || 0;
      return formatEntryLine(mins, e.date, e.created_at, actName);
    }).join('\n');
  } else {
    billedTooltip = 'No billed time entries yet';
  }

  const budgetHtml = `
    <span class="status-item budget-item">
      <span class="budget-bar" title="${escapeHtml(billedTooltip)}">
        <span class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></span>
      </span>
      <span class="budget-label">${budgetLabel}</span>
      <button class="time-entry-btn" id="timeEntryBtn" title="Log billed time">+</button>
    </span>`;

  bar.innerHTML = `
    <span class="status-item"><strong>${completed}/${total}</strong> activities done</span>
    <span class="status-item"><strong>${doneTodos}/${allTodos}</strong> todos</span>
    <span class="status-item"><strong>${answeredQs}/${allQs}</strong> questions answered</span>
    <span class="status-item">Phase: <strong>${escapeHtml(currentPhase)}</strong></span>
    ${budgetHtml}
  `;

  renderTimeComparison();
}

function toggleTimeEntry() {
  state.timeEntryOpen = !state.timeEntryOpen;
  renderTimeEntryPopover();
}

function openTimeEntryForActivity(activityId) {
  state.timeEntryOpen = true;
  renderTimeEntryPopover();
  const actSelect = document.getElementById('teActivity');
  if (actSelect) actSelect.value = activityId;
}

function renderTimeEntryPopover() {
  let popover = document.getElementById('timeEntryPopover');
  if (!state.timeEntryOpen) {
    if (popover) popover.remove();
    return;
  }

  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'timeEntryPopover';
    popover.className = 'time-entry-popover';
    document.body.appendChild(popover);
  }

  const unit = state.config.duration_unit || 'hours';
  const activeActs = state.activities.filter(a => a.status !== 'inactive' && !a.deprioritised);
  const actOptions = activeActs.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.id)} — ${escapeHtml(a.title)}</option>`).join('');

  let durationHtml;
  if (unit === 'days') {
    durationHtml = `
      <label>Duration (days)<span class="field-hint">1 day = 8 hours</span>
        <input type="number" id="teDays" min="0" max="99" step="0.5" value="0.5">
      </label>`;
  } else {
    let minOpts = '';
    for (let m = 0; m < 60; m += 5) {
      minOpts += `<option value="${m}"${m === 0 ? ' selected' : ''}>${String(m).padStart(2, '0')}</option>`;
    }
    durationHtml = `
      <label>Duration
        <div class="time-inputs">
          <select id="teHours">${Array.from({length: 100}, (_, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${i}</option>`).join('')}</select>
          <span class="time-sep">h</span>
          <select id="teMinutes">${minOpts}</select>
          <span class="time-sep">m</span>
        </div>
      </label>`;
  }

  popover.innerHTML = `
    <div class="popover-header">
      <strong>Log Billed Time</strong>
      <button class="popover-close" id="teClose">&times;</button>
    </div>
    <label>Activity
      <select id="teActivity">${actOptions}</select>
    </label>
    ${durationHtml}
    <label>Note (optional)
      <input type="text" id="teNote" placeholder="What was done...">
    </label>
    <div class="popover-actions">
      <button class="btn-primary" id="teAdd">Add Entry</button>
    </div>
  `;

  // Position near the button
  const btn = document.getElementById('timeEntryBtn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    popover.style.top = (rect.bottom + 6) + 'px';
    popover.style.right = (window.innerWidth - rect.right) + 'px';
  }

  document.getElementById('teClose').addEventListener('click', () => {
    state.timeEntryOpen = false;
    renderTimeEntryPopover();
  });

  document.getElementById('teAdd').addEventListener('click', () => {
    const actId = document.getElementById('teActivity').value;
    let mins = 0;
    if (unit === 'days') {
      const days = parseFloat(document.getElementById('teDays').value) || 0;
      mins = Math.round(days * 480);
    } else {
      const h = parseInt(document.getElementById('teHours').value) || 0;
      const m = parseInt(document.getElementById('teMinutes').value) || 0;
      mins = h * 60 + m;
    }
    if (mins <= 0 || !actId) return;

    // Round to 5-minute granularity
    mins = Math.round(mins / 5) * 5;

    const note = document.getElementById('teNote').value.trim();
    addTimeBilledEntry(actId, mins, note);

    state.timeEntryOpen = false;
    renderTimeEntryPopover();
  });

  // Close on outside click — use click (not mousedown) and ignore select/option elements
  setTimeout(() => {
    const closeHandler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'OPTION' || tag === 'SELECT') return;
      if (!popover.contains(e.target) && e.target.id !== 'timeEntryBtn') {
        state.timeEntryOpen = false;
        renderTimeEntryPopover();
        document.removeEventListener('click', closeHandler, true);
      }
    };
    document.addEventListener('click', closeHandler, true);
  }, 10);
}

function renderNowDoing() {
  const row = document.getElementById('nowDoingRow');
  const content = document.getElementById('nowDoing');
  const toggle = document.getElementById('nowDoingToggle');
  const inProgress = state.activities.filter(a => a.status === 'in_progress');

  row.style.display = 'flex';

  if (inProgress.length === 0) {
    content.innerHTML = '<strong>Now doing:</strong>&nbsp; <span style="opacity:0.5">No activities in progress</span>';
    toggle.style.display = 'none';
    row.classList.remove('expanded');
    updateMainOffset();
    return;
  }

  row.classList.remove('expanded');
  const titles = inProgress.map(a => escapeHtml(a.title)).join(' <span style="opacity:0.5">|</span> ');
  content.innerHTML = `<strong>Now doing:</strong>&nbsp; ${titles}`;

  // Check overflow after render
  requestAnimationFrame(() => {
    if (content.scrollWidth > content.clientWidth) {
      toggle.style.display = '';
      toggle.textContent = '+';
    } else {
      toggle.style.display = 'none';
    }
    updateMainOffset();
  });

  toggle.onclick = () => {
    const expanded = row.classList.toggle('expanded');
    toggle.textContent = expanded ? '−' : '+';
    updateMainOffset();
  };
}

function updateMainOffset() {
  requestAnimationFrame(() => {
    const bar = document.querySelector('.top-bar');
    const h = bar.offsetHeight;
    document.querySelector('.main-layout').style.marginTop = h + 'px';
    const nav = document.querySelector('.nav-panel');
    if (nav) nav.style.top = h + 'px';
  });
}

function renderWhatsNext() {
  const el = document.getElementById('whatsNext');
  const next = getWhatsNext();
  if (!next) {
    el.style.display = 'none';
    renderTimeComparison();
    return;
  }

  el.style.display = 'block';
  el.innerHTML = `
    <div class="whats-next-title">What's Next</div>
    <div class="whats-next-activity">${escapeHtml(next.activity.title)}</div>
    <div class="whats-next-details">
      <span>Phase: ${escapeHtml(next.phase)}</span>
      ${next.incompleteTodos > 0 ? `<span>${next.incompleteTodos} todos remaining</span>` : ''}
      ${next.unansweredQs > 0 ? `<span>${next.unansweredQs} unanswered questions</span>` : ''}
      ${next.askWhom.length > 0 ? `<span>Contact: ${escapeHtml(next.askWhom.join(', '))}</span>` : ''}
    </div>
  `;

  el.style.cursor = 'pointer';
  el.onclick = () => expandActivity(next.activity.id);
  renderTimeComparison();
}

function renderTimeComparison() {
  const el = document.getElementById('timeComparisonBox');
  if (!el) return;
  const unit = state.config.duration_unit || 'hours';
  const spentMins = getTotalSpentMinutes();
  const billedMins = getTotalBilledMinutes();
  const budgetMins = getTotalBudgetMinutes();
  const maxMins = budgetMins > 0 ? budgetMins : Math.max(spentMins, billedMins, 1);
  const spentPct = Math.min((spentMins / maxMins) * 100, 100);
  const billedPct = Math.min((billedMins / maxMins) * 100, 100);

  el.innerHTML = `
    <div class="time-comp-title">Time Spent vs Time Billed</div>
    <div class="time-bar-row">
      <span class="time-bar-label">Spent</span>
      <div class="time-bar-track"><div class="time-bar-fill spent-fill" style="width:${spentPct}%"></div></div>
      <span class="time-bar-value">${formatMinutes(spentMins, unit)}${budgetMins > 0 ? ' / ' + formatMinutes(budgetMins, unit) : ''}</span>
    </div>
    <div class="time-bar-row">
      <span class="time-bar-label">Billed</span>
      <div class="time-bar-track"><div class="time-bar-fill billed-fill" style="width:${billedPct}%"></div></div>
      <span class="time-bar-value">${formatMinutes(billedMins, unit)}${budgetMins > 0 ? ' / ' + formatMinutes(budgetMins, unit) : ''}</span>
    </div>
  `;
}

function renderPhases() {
  clearCache();
  const container = document.getElementById('phasesContainer');
  const phases = getPhases();

  container.innerHTML = phases.map((phase, idx) => {
    const acts = getPhaseActivities(phase);
    const mainActs = acts.filter(a => !a.deprioritised);
    const depriActs = acts.filter(a => a.deprioritised);
    const showDepri = state.showInactive && state.showInactive[phase];
    const visibleMainActs = mainActs.filter(a => activityMatchesSearch(a) && activityMatchesFilter(a));
    const visibleDepriActs = depriActs.filter(a => activityMatchesSearch(a) && activityMatchesFilter(a));
    const completed = mainActs.filter(a => a.status === 'completed').length;

    const phaseLower = phase.toLowerCase();
    const pdcaType = phaseLower.startsWith('plan') ? 'plan'
      : phaseLower.startsWith('do') ? 'do'
      : phaseLower.startsWith('check') ? 'check'
      : phaseLower.startsWith('act') ? 'act' : 'default';

    let depriSection = '';
    if (depriActs.length > 0) {
      depriSection = `<div class="phase-deprioritised-section">
        <details class="phase-depri-details"${showDepri ? ' open' : ''}>
          <summary class="phase-depri-summary" data-phase="${escapeHtml(phase)}">Deprioritised (${depriActs.length})</summary>
          <div class="cards-grid cards-grid-deprioritised">
            ${visibleDepriActs.map(a => renderCard(a)).join('')}
          </div>
        </details>
      </div>`;
    }

    return `<section class="phase-section phase-${pdcaType}" data-phase-section="${escapeHtml(phase)}" data-phase-idx="${idx}">
      <div class="phase-header">
        <span class="phase-title" contenteditable="true" data-phase="${escapeHtml(phase)}">${escapeHtml(phase)}</span>
        <span class="phase-count">${completed}/${mainActs.length} done</span>
        <button class="btn-small phase-add-btn" data-phase="${escapeHtml(phase)}">+ Activity</button>
      </div>
      <div class="cards-grid">
        ${visibleMainActs.map(a => renderCard(a)).join('')}
      </div>
      ${depriSection}
    </section>`;
  }).join('');
}

function renderCard(act) {
  const todos = getActivityTodos(act.id).filter(t => t.active !== false);
  const questions = getActivityQuestions(act.id).filter(q => q.active !== false);
  const doneTodos = todos.filter(t => isTodoDone(t)).length;
  const answeredQs = questions.filter(q => isQuestionAnswered(q)).length;
  const notes = getActivityNotes(act.id);
  const hasNotes = notes.some(n => n.type === 'note' || n.type === 'attachment_ref');
  const hasLinks = notes.some(n => n.type === 'link');
  const isExpanded = state.expandedActivityId === act.id;

  // Calculate fill percentage from combined todos + questions completion
  const totalItems = todos.length + questions.length;
  const doneItems = doneTodos + answeredQs;
  const fillPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // Check if time spent exceeds allocated
  const allocMins = getAllocatedMinutes(act.id);
  const actualMins = parseInt(act.actual_minutes) || 0;
  const isOverBudget = allocMins > 0 && actualMins > allocMins;
  const fillClass = isOverBudget ? ' fill-over-budget' : '';
  const showProgressWarning = isOverBudget && doneTodos < 3 && answeredQs < 3;

  const metaClass = isMetaActivity(act) ? ' meta-activity' : '';

  // Check if this activity was updated by AI processing in this session
  let aiUpdated = false;
  try {
    const aiIds = JSON.parse(sessionStorage.getItem('acm_ai_updated_activities') || '[]');
    aiUpdated = aiIds.includes(act.id);
  } catch (e) { /* ignore */ }

  let html = `<div class="activity-card status-${escapeHtml(act.status || 'not_started')}${isExpanded ? ' expanded' : ''}${fillClass}${metaClass}" data-activity-id="${escapeHtml(act.id)}" style="--fill-pct: ${fillPct}">
    <div class="card-header">
      <span class="card-status-dot dot-${escapeHtml(act.status || 'not_started')}"></span>
      <span class="card-title">${isExpanded ? escapeHtml(act.title) : highlightText(act.title)}</span>
      ${isExpanded ? `<button class="card-rename-btn" data-rename-id="${escapeHtml(act.id)}" title="Rename">Rename</button>` : ''}
      <span class="card-id">${escapeHtml(act.id)}</span>
      ${isMetaActivity(act) ? '<span class="card-type-badge meta-badge">Admin</span>' : ''}
      ${isExpanded ? `<button class="card-close-btn" data-close-id="${escapeHtml(act.id)}" title="Close">&times;</button>` : ''}
    </div>`;

  if (!isExpanded) {
    html += `<div class="card-intro">${highlightText(act.intro_text || act.title)}</div>
    <div class="card-meta">
      ${aiUpdated ? '<span class="card-meta-item ai-new-badge" title="Updated by AI processing">&#11088; New info!</span>' : ''}
      ${showProgressWarning ? '<span class="card-meta-item card-progress-warning" title="Over budget with little visible progress">&#9888;</span>' : ''}
      ${todos.length > 0 ? `<span class="card-meta-item">&#9745; ${doneTodos}/${todos.length}</span>` : ''}
      ${questions.length > 0 ? `<span class="card-meta-item">&#128172; ${answeredQs}/${questions.length}</span>` : ''}
      ${hasNotes ? '<span class="card-meta-item card-indicator" title="Has notes">✏️</span>' : ''}
      ${hasLinks ? '<span class="card-meta-item card-indicator" title="Has links">🔗</span>' : ''}
      ${isMetaActivity(act) ? `<button class="card-meta-item card-log-time-btn" data-log-time-id="${escapeHtml(act.id)}" title="Log time against this activity">&#128339; Log time</button>` : ''}
      ${act.due_date ? `<span class="card-meta-item card-due">${formatDate(act.due_date)}</span>` : ''}
      <span class="card-move-arrows">
        <button class="card-move-btn" data-move-id="${escapeHtml(act.id)}" data-move-dir="-1" title="Move left">&#9664;</button>
        <button class="card-move-btn" data-move-id="${escapeHtml(act.id)}" data-move-dir="1" title="Move right">&#9654;</button>
        <button class="card-complete-btn${act.status === 'completed' ? ' is-completed' : ''}" data-complete-id="${escapeHtml(act.id)}" title="${act.status === 'completed' ? 'Mark as not started' : 'Mark as completed'}">${act.status === 'completed' ? '☑' : '☐'}</button>
      </span>
    </div>`;
  } else {
    html += renderExpandedContent(act);
  }

  html += '</div>';
  return html;
}

function renderExpandedContent(act) {
  const activeTab = state.activeTab[act.id] || 'overview';

  return `<div class="expanded-content">
    <div class="tab-bar">
      <button class="tab-btn${activeTab === 'overview' ? ' active' : ''}" data-tab="overview" data-act-id="${act.id}">Overview</button>
      <button class="tab-btn${activeTab === 'todos' ? ' active' : ''}" data-tab="todos" data-act-id="${act.id}">To-dos</button>
      <button class="tab-btn${activeTab === 'questions' ? ' active' : ''}" data-tab="questions" data-act-id="${act.id}">Questions</button>
      <button class="tab-btn${activeTab === 'notes' ? ' active' : ''}" data-tab="notes" data-act-id="${act.id}">Notes & Links</button>
      <button class="tab-btn${activeTab === 'timelog' ? ' active' : ''}" data-tab="timelog" data-act-id="${act.id}">Time Log</button>
    </div>
    <div class="tab-content${activeTab === 'overview' ? ' active' : ''}" data-tab-content="overview">${renderOverviewTab(act)}</div>
    <div class="tab-content${activeTab === 'todos' ? ' active' : ''}" data-tab-content="todos">${renderTodosTab(act)}</div>
    <div class="tab-content${activeTab === 'questions' ? ' active' : ''}" data-tab-content="questions">${renderQuestionsTab(act)}</div>
    <div class="tab-content${activeTab === 'notes' ? ' active' : ''}" data-tab-content="notes">${renderNotesTab(act)}</div>
    <div class="tab-content${activeTab === 'timelog' ? ' active' : ''}" data-tab-content="timelog">${renderTimeLogTab(act)}</div>
  </div>`;
}

function renderTimeAllocationField(act) {
  const effectivePct = getEffectiveAllocatedPct(act.id);
  const allocMins = getAllocatedMinutes(act.id);
  const budgetMins = getTotalBudgetMinutes();
  const spentEntries = getActivityTimeSpent(act.id);
  const spentTotal = spentEntries.reduce((sum, e) => sum + (parseInt(e.spent_minutes) || 0), 0);

  // Comparison
  let comparisonHtml = '';
  if (allocMins > 0 && spentTotal > 0) {
    const diff = spentTotal - allocMins;
    const diffPct = Math.round(Math.abs(diff) / allocMins * 100);
    if (diff > 0) {
      comparisonHtml = `<span class="time-comparison-badge over">${diffPct}% over</span>`;
    } else if (diff < 0) {
      comparisonHtml = `<span class="time-comparison-badge under">${diffPct}% under</span>`;
    } else {
      comparisonHtml = `<span class="time-comparison-badge on-track">On track</span>`;
    }
  }

  // Hours options for adding time (0-23)
  let addHoursOpts = '';
  for (let i = 0; i <= 23; i++) {
    addHoursOpts += `<option value="${i}"${i === 1 ? ' selected' : ''}>${i}</option>`;
  }

  // Minutes options (5-min granularity)
  let addMinsOpts = '';
  for (let i = 0; i < 60; i += 5) {
    const padded = String(i).padStart(2, '0');
    addMinsOpts += `<option value="${i}"${i === 0 ? ' selected' : ''}>${padded}</option>`;
  }

  // Build history HTML
  let historyHtml = '';
  if (spentEntries.length > 0) {
    historyHtml = `
    <div class="time-spent-history-wrapper" data-act-id="${act.id}">
      <div class="time-spent-history" data-act-id="${act.id}">
        ${spentEntries.map(e => {
          const mins = parseInt(e.spent_minutes) || 0;
          const line = formatEntryLine(mins, e.date, e.created_at);
          const note = e.note ? ` — ${escapeHtml(e.note)}` : '';
          return `<div class="time-spent-entry">${escapeHtml(line)}${note}</div>`;
        }).join('')}
      </div>
      <div class="time-spent-history-fade"></div>
      ${spentEntries.length > 3 ? `<button class="time-spent-history-toggle" data-act-id="${act.id}">Show all (${spentEntries.length} entries)</button>` : ''}
    </div>`;
  }

  return `<div class="overview-field time-allocation-section">
    <div class="time-section-row">
      <div class="time-section-left">
        <label>Time Allocation</label>
        <div class="time-alloc-row">
          <div class="time-alloc-projected">
            <input type="number" class="alloc-pct-input" value="${getActivityAllocatedPct(act)}" min="0" max="100" step="0.5"
                   data-field="allocated_pct" data-act-id="${act.id}">
            <span class="alloc-pct-label">%</span>
            <span class="alloc-projected-time">${budgetMins > 0 ? formatMinutesHM(allocMins) + ' of ' + formatMinutesHM(budgetMins) : 'No budget set'}</span>
            <span class="alloc-effective-pct">(effective: ${effectivePct.toFixed(1)}%)</span>
          </div>
        </div>
        <label>Time Spent</label>
        <div class="time-alloc-row">
          <div class="time-spent-total">
            <strong>${formatMinutesHM(spentTotal)}</strong>
            ${comparisonHtml}
          </div>
        </div>
        <div class="time-spent-add-form">
          <select class="time-spent-add-hours" data-act-id="${act.id}">${addHoursOpts}</select>
          <span>h</span>
          <select class="time-spent-add-mins" data-act-id="${act.id}">${addMinsOpts}</select>
          <span>m</span>
          <input type="text" class="time-spent-add-note" data-act-id="${act.id}" placeholder="Note (optional)">
          <button class="btn-small btn-add-time-spent" data-act-id="${act.id}">+ Add</button>
        </div>
      </div>
      <div class="time-section-right">
        ${historyHtml}
      </div>
    </div>
  </div>`;
}

function renderOverviewTab(act) {
  const deps = act.depends_on ? String(act.depends_on).split(',').map(s => s.trim()).filter(Boolean) : [];
  const incompleteDeps = checkDependencies(act);

  let html = `<div class="overview-grid">
    <div class="overview-field">
      <label>Status</label>
      <select data-field="status" data-act-id="${act.id}" class="activity-field-select">
        <option value="not_started"${act.status === 'not_started' ? ' selected' : ''}>Not Started</option>
        <option value="in_progress"${act.status === 'in_progress' ? ' selected' : ''}>In Progress</option>
        <option value="completed"${act.status === 'completed' ? ' selected' : ''}>Completed</option>
        <option value="blocked"${act.status === 'blocked' ? ' selected' : ''}>Blocked</option>
        <option value="inactive"${act.status === 'inactive' ? ' selected' : ''}>Inactive</option>
      </select>
    </div>
    <div class="overview-field">
      <label>Due Date</label>
      <input type="date" value="${escapeHtml(act.due_date || '')}" data-field="due_date" data-act-id="${act.id}" class="activity-field-input">
    </div>
    <div class="overview-field overview-description">
      <label>Description</label>
      <div class="editable-text" contenteditable="true" data-field="intro_text" data-act-id="${act.id}">${escapeHtml(act.intro_text || '')}</div>
      <div class="full-desc-preview-wrapper" data-act-id="${act.id}">
        <div class="full-desc-preview" data-full-desc-preview="${escapeHtml(act.id)}">${escapeHtml(act.full_description || '')}</div>
        <div class="full-desc-fade"></div>
      </div>
      <button class="full-desc-toggle" data-act-id="${act.id}">Description</button>
      <div class="full-desc-content" data-full-desc="${escapeHtml(act.id)}" style="display:none;">
        <div class="editable-text" contenteditable="true" data-field="full_description" data-act-id="${act.id}">${escapeHtml(act.full_description || '')}</div>
      </div>
    </div>`;

  if (deps.length > 0) {
    html += `<div class="overview-field">
      <label>Dependencies</label>
      <div class="deps-list">
        ${deps.map(d => {
          const dep = getActivity(d);
          return `<span class="dep-badge" data-dep-id="${escapeHtml(d)}">${escapeHtml(d)}${dep ? ': ' + escapeHtml(truncate(dep.title, 30)) : ''}</span>`;
        }).join('')}
      </div>
      ${incompleteDeps.length > 0 ? `<div class="dep-warning">&#9888; ${incompleteDeps.length} dependencies not yet completed: ${incompleteDeps.map(d => d.id).join(', ')}</div>` : ''}
    </div>`;
  }

  if (act.particularisation_guidance) {
    html += `<div class="overview-field particularisation">
      <button class="particularisation-toggle" data-act-id="${act.id}">&#9660; Project Specific Guidance</button>
      <div class="particularisation-content" data-act-id="${act.id}">
        <div class="particularisation-rendered">${renderMarkdownGuidance(act.particularisation_guidance)}</div>
        <textarea class="particularisation-edit" data-field="particularisation_guidance" data-act-id="${act.id}" style="display:none;">${escapeHtml(act.particularisation_guidance)}</textarea>
        <button class="btn-small particularisation-edit-btn" data-act-id="${act.id}">✎ Edit</button>
      </div>
    </div>`;
  }

  html += renderTimeAllocationField(act);

  html += `<div class="overview-field-row">
    <div class="overview-field" style="margin-bottom:0;">
      <label>Activity Type</label>
      <select data-field="activity_type" data-act-id="${act.id}" class="activity-field-select" style="width:auto;">
        <option value=""${!act.activity_type || act.activity_type === 'standard' ? ' selected' : ''}>Standard (Methodology)</option>
        <option value="meta"${act.activity_type === 'meta' ? ' selected' : ''}>Admin / Overhead</option>
      </select>
    </div>`;

  if (act.status === 'inactive') {
    html += `<div style="display:flex;gap:8px;align-items:flex-end;margin-left:auto;">
      <button class="btn-small btn-reactivate" data-reactivate-id="${escapeHtml(act.id)}">&#9654; Reactivate this activity</button>
      <button class="btn-small btn-delete-activity" data-delete-id="${escapeHtml(act.id)}">&#128465; Delete this activity permanently</button>
    </div>`;
  } else {
    html += `<div style="align-self:flex-end;margin-left:auto;"><button class="btn-small btn-deactivate" data-deactivate-id="${escapeHtml(act.id)}">&#10005; Make this card inactive</button></div>`;
  }

  html += `</div>`;

  html += '</div>';
  return html;
}

function renderTodosTab(act) {
  const allTodos = getActivityTodos(act.id);
  const activeTodos = allTodos.filter(t => t.active !== false);
  const inactiveTodos = allTodos.filter(t => t.active === false);
  const done = activeTodos.filter(t => isTodoDone(t)).length;
  const total = activeTodos.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const showInactive = state.showInactiveTodos && state.showInactiveTodos[act.id];

  let html = `<div class="todo-progress">
    <div class="progress-bar-container">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="progress-label">${done}/${total} (${pct}%)</span>
    </div>
  </div>
  <ul class="todo-list">`;

  activeTodos.forEach(t => {
    const isDone = isTodoDone(t);
    html += `<li class="todo-item${isDone ? ' done' : ''}${t.is_project_specific ? ' todo-project-specific' : ''}">
      <input type="checkbox" ${isDone ? 'checked' : ''} data-todo-id="${escapeHtml(t.id)}">
      <span class="todo-text" contenteditable="true" data-todo-id="${escapeHtml(t.id)}" data-field="text">${highlightText(t.text)}</span>
      ${t.notes ? '<span class="todo-notes">' + escapeHtml(t.notes) + '</span>' : ''}
      <button class="todo-delete" data-todo-id="${escapeHtml(t.id)}" title="Make inactive">&times;</button>
    </li>`;
  });

  if (inactiveTodos.length > 0) {
    html += `</ul>`;
    html += `<button class="inactive-toggle-btn" data-act-id="${act.id}" data-toggle-type="todos">${showInactive ? 'Hide' : 'Show'} ${inactiveTodos.length} inactive</button>`;

    if (showInactive) {
      html += `<ul class="todo-list todo-list-inactive">`;
      inactiveTodos.forEach(t => {
        html += `<li class="todo-item inactive">
          <span class="todo-text inactive-text">${escapeHtml(t.text)}</span>
          <button class="todo-restore" data-todo-id="${escapeHtml(t.id)}" title="Restore">↩</button>
        </li>`;
      });
      html += `</ul>`;
    }
  } else {
    html += `</ul>`;
  }

  html += `<div class="add-item-row">
    <input class="add-item-input" type="text" placeholder="Add a to-do..." data-act-id="${act.id}" data-add-type="todo">
    <button class="btn-small" data-act-id="${act.id}" data-add-btn="todo">Add</button>
  </div>`;

  return html;
}

function renderQuestionsTab(act) {
  const allQuestions = getActivityQuestions(act.id);
  const activeQuestions = allQuestions.filter(q => q.active !== false);
  const inactiveQuestions = allQuestions.filter(q => q.active === false);
  const answered = activeQuestions.filter(q => isQuestionAnswered(q)).length;
  const total = activeQuestions.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  const showInactive = state.showInactiveQuestions && state.showInactiveQuestions[act.id];

  // Group active questions by sub_topic
  const groups = {};
  activeQuestions.forEach(q => {
    const topic = q.sub_topic || 'General';
    if (!groups[topic]) groups[topic] = [];
    groups[topic].push(q);
  });

  let html = `<div class="question-progress">
    <div class="progress-bar-container">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="progress-label">${answered}/${total} answered (${pct}%)</span>
    </div>
  </div>`;

  for (const [topic, qs] of Object.entries(groups)) {
    html += `<div class="subtopic-group">
      <div class="subtopic-heading" contenteditable="true" data-subtopic="${escapeHtml(topic)}" data-act-id="${act.id}">${escapeHtml(topic)}</div>`;

    qs.forEach(q => {
      const isAnswered = isQuestionAnswered(q);
      html += `<div class="question-item${isAnswered ? ' answered' : ''}">
        <button class="question-delete" data-question-id="${escapeHtml(q.id)}" title="Make inactive">&times;</button>
        <div class="question-text" contenteditable="true" data-question-id="${escapeHtml(q.id)}" data-field="question_text">${highlightText(q.question_text)}</div>
        ${q.ask_whom ? `<span class="ask-whom-badge" contenteditable="true" data-question-id="${escapeHtml(q.id)}" data-field="ask_whom">Ask: ${escapeHtml(q.ask_whom)}</span>` : ''}
        <div class="answer-field-wrap">
          <textarea class="answer-field" data-question-id="${escapeHtml(q.id)}" placeholder="Answer...">${escapeHtml(q.answer || '')}</textarea>
        </div>
      </div>`;
    });

    html += '</div>';
  }

  if (inactiveQuestions.length > 0) {
    html += `<button class="inactive-toggle-btn" data-act-id="${act.id}" data-toggle-type="questions">${showInactive ? 'Hide' : 'Show'} ${inactiveQuestions.length} inactive</button>`;

    if (showInactive) {
      html += `<div class="inactive-questions-list">`;
      inactiveQuestions.forEach(q => {
        html += `<div class="question-item inactive">
          <div class="question-text inactive-text">${escapeHtml(q.question_text)}</div>
          <button class="question-restore" data-question-id="${escapeHtml(q.id)}" title="Restore">↩</button>
        </div>`;
      });
      html += `</div>`;
    }
  }

  html += `<div class="add-item-row">
    <input class="add-item-input" type="text" placeholder="Add a question..." data-act-id="${act.id}" data-add-type="question">
    <button class="btn-small" data-act-id="${act.id}" data-add-btn="question">Add</button>
  </div>`;

  return html;
}

function renderNotesTab(act) {
  const notes = getActivityNotes(act.id);

  let html = '';
  notes.forEach(n => {
    const icon = n.type === 'link' ? '&#128279;' : n.type === 'attachment_ref' ? '&#128206;' : '&#128221;';
    html += `<div class="note-item">
      <span class="note-icon">${icon}</span>
      <div class="note-content">
        <div class="note-label" contenteditable="true" data-note-id="${escapeHtml(n.id)}" data-field="label">${escapeHtml(n.label || n.content || 'Note')}</div>
        ${n.type === 'note' ? `<div class="note-text" contenteditable="true" data-note-id="${escapeHtml(n.id)}" data-field="content">${escapeHtml(n.content || '')}</div>` : ''}
        ${n.url ? `<a class="note-link" href="${escapeHtml(n.url)}" target="_blank" rel="noopener">${escapeHtml(n.url)}</a>` : ''}
      </div>
      <button class="note-delete" data-note-id="${escapeHtml(n.id)}" title="Delete">&times;</button>
    </div>`;
  });

  html += `<div class="add-note-actions">
    <button class="btn-small" data-act-id="${act.id}" data-add-btn="note">+ Note</button>
    <button class="btn-small" data-act-id="${act.id}" data-add-btn="link">+ Link</button>
  </div>`;

  return html;
}

function renderTimeLogTab(act) {
  const spentEntries = getActivityTimeSpent(act.id);
  const billedEntries = getActivityTimeBilled(act.id);
  const spentTotal = spentEntries.reduce((sum, e) => sum + (parseInt(e.spent_minutes) || 0), 0);
  const billedTotal = billedEntries.reduce((sum, e) => sum + (parseInt(e.billed_minutes) || 0), 0);
  const unit = state.config.duration_unit || 'hours';

  // Merge and sort by date descending
  const allEntries = [
    ...spentEntries.map(e => ({ ...e, type: 'spent', minutes: parseInt(e.spent_minutes) || 0 })),
    ...billedEntries.map(e => ({ ...e, type: 'billed', minutes: parseInt(e.billed_minutes) || 0 }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));

  let html = '<div class="time-log-tab">';
  html += '<div class="time-log-summary">';
  html += `<span>Total spent: <strong>${formatMinutesHM(spentTotal)}</strong></span>`;
  html += `<span>Total billed: <strong>${formatMinutesHM(billedTotal)}</strong></span>`;
  html += '</div>';

  if (allEntries.length === 0) {
    html += '<p class="time-log-empty">No time entries yet.</p>';
  } else {
    html += '<div class="time-log-entries">';
    allEntries.forEach(entry => {
      const typeClass = entry.type === 'spent' ? 'time-log-spent' : 'time-log-billed';
      const typeLabel = entry.type === 'spent' ? 'Spent' : 'Billed';
      const deleteBtn = entry.type === 'spent'
        ? `<button class="time-log-delete" data-entry-id="${escapeHtml(entry.id)}" data-act-id="${escapeHtml(act.id)}" title="Delete entry">&times;</button>`
        : '';
      html += `<div class="time-log-entry ${typeClass}">
        <span class="time-log-date">${entry.date ? formatDate(entry.date) : ''}</span>
        <span class="time-log-type">${typeLabel}</span>
        <span class="time-log-duration">${formatMinutesHM(entry.minutes)}</span>
        <span class="time-log-note">${escapeHtml(entry.note || '')}</span>
        ${deleteBtn}
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ---- Event Handlers ----

function expandActivity(actId) {
  if (state.expandedActivityId === actId) {
    state.expandedActivityId = null;
  } else {
    state.expandedActivityId = actId;
    if (!state.activeTab[actId]) state.activeTab[actId] = 'overview';
  }
  renderPhases();
  renderNav();
  attachExpandedEvents();

  if (state.expandedActivityId) {
    const card = document.querySelector(`[data-activity-id="${actId}"]`);
    if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

function autoSizeAnswer(ta) {
  const lineH = parseFloat(getComputedStyle(ta).lineHeight) || (parseFloat(getComputedStyle(ta).fontSize) * 1.5);
  const maxCollapsed = Math.round(lineH * 10 + 12); // 10 lines cap
  const wrap = ta.closest('.answer-field-wrap');
  if (!wrap) return;

  // Measure full content height
  ta.style.maxHeight = 'none';
  ta.style.height = 'auto';
  const scrollH = ta.scrollHeight;
  ta.style.removeProperty('max-height');

  const isExpanded = ta.classList.contains('expanded');
  const needsTruncation = scrollH > maxCollapsed;

  // Auto-fit height to content, capped at 10 lines (unless expanded)
  ta.style.height = (isExpanded || !needsTruncation ? scrollH : maxCollapsed) + 'px';

  // Manage fade + button
  let fade = wrap.querySelector('.answer-fade');
  let btn = wrap.querySelector('.answer-read-more');

  if (needsTruncation && !isExpanded) {
    // Add fade overlay
    if (!fade) {
      fade = document.createElement('div');
      fade.className = 'answer-fade';
      wrap.appendChild(fade);
    }
    fade.style.display = '';
    // Add button
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'answer-read-more';
      wrap.appendChild(btn);
    }
    btn.textContent = 'Read more ▾';
    btn.style.display = '';
    btn.onclick = () => {
      ta.classList.add('expanded');
      autoSizeAnswer(ta);
    };
  } else if (needsTruncation && isExpanded) {
    // Hide fade, show "Show less"
    if (fade) fade.style.display = 'none';
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'answer-read-more';
      wrap.appendChild(btn);
    }
    btn.textContent = 'Show less ▴';
    btn.style.display = '';
    btn.style.position = 'static';
    btn.style.transform = 'none';
    btn.style.left = 'auto';
    btn.style.bottom = 'auto';
    btn.style.marginTop = '4px';
    btn.onclick = () => {
      ta.classList.remove('expanded');
      autoSizeAnswer(ta);
    };
  } else {
    // Content fits — remove fade and button
    if (fade) fade.remove();
    if (btn) btn.remove();
  }
}

function attachExpandedEvents() {
  const container = document.getElementById('phasesContainer');

  // Close button on expanded card
  container.querySelectorAll('.card-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandActivity(btn.dataset.closeId);
    });
  });

  // Click card title to collapse expanded card
  container.querySelectorAll('.activity-card.expanded .card-header .card-title').forEach(title => {
    title.style.cursor = 'pointer';
    title.addEventListener('click', (e) => {
      e.stopPropagation();
      if (title.isContentEditable) return;
      const card = title.closest('.activity-card');
      if (card) expandActivity(card.dataset.activityId);
    });
  });

  // Rename button on expanded card
  container.querySelectorAll('.card-rename-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.renameId;
      const card = btn.closest('.activity-card');
      const titleEl = card.querySelector('.card-title');
      if (!titleEl) return;
      titleEl.contentEditable = 'true';
      titleEl.style.cursor = 'text';
      titleEl.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.style.display = 'none';

      const save = () => {
        titleEl.contentEditable = 'false';
        titleEl.style.cursor = 'pointer';
        const newTitle = titleEl.textContent.trim();
        const act = getActivity(actId);
        if (act && newTitle && act.title !== newTitle) {
          snapshotForUndo('Rename activity', 'title-' + actId);
          const oldTitle = act.title;
          act.title = newTitle;
          queueWrite('updateActivity', { id: actId, title: newTitle });
          trackTemplateChange('edit', 'Activities', actId, 'title', oldTitle, newTitle, 'Activity title renamed');
        }
        btn.style.display = '';
      };

      titleEl.addEventListener('blur', save, { once: true });
      titleEl.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); titleEl.blur(); }
        if (ke.key === 'Escape') { titleEl.textContent = getActivity(actId)?.title || ''; titleEl.blur(); }
      });
    });
  });

  // Deactivate / Reactivate
  container.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActivityStatus(btn.dataset.deactivateId, 'inactive');
    });
  });
  container.querySelectorAll('.btn-reactivate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActivityStatus(btn.dataset.reactivateId, 'not_started');
    });
  });

  container.querySelectorAll('.btn-delete-activity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Permanently delete this activity and all its todos, questions, and notes? This cannot be undone.')) {
        deleteActivity(btn.dataset.deleteId);
      }
    });
  });

  // Tab switching — surgical re-render of just the expanded card's content
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const tab = btn.dataset.tab;
      state.activeTab[actId] = tab;
      // Try to replace only the expanded content instead of all phases
      const card = container.querySelector(`[data-activity-id="${actId}"].expanded`);
      if (card) {
        const act = getActivity(actId);
        const expandedEl = card.querySelector('.expanded-content');
        if (act && expandedEl) {
          expandedEl.outerHTML = renderExpandedContent(act);
          attachExpandedEvents();
          return;
        }
      }
      // Fallback: full re-render if surgical update fails
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Activity field changes (status, due_date)
  container.querySelectorAll('.activity-field-select, .activity-field-input, .alloc-pct-input').forEach(el => {
    el.addEventListener('change', () => {
      const actId = el.dataset.actId;
      const field = el.dataset.field;
      const value = el.value;
      const act = getActivity(actId);
      if (act) {
        snapshotForUndo('Change ' + field);
        const oldValue = act[field];
        act[field] = value;
        queueWrite('updateActivity', { id: actId, [field]: value });
        if (TEMPLATE_FIELDS_ACTIVITY.includes(field)) {
          trackTemplateChange('edit', 'Activities', actId, field, oldValue, value, 'Activity ' + field + ' changed');
        }
        if (field === 'status') {
          checkPhaseAdvance();
          renderAll();
        } else {
          renderPhases();
          renderStatusBar();
        }
        attachExpandedEvents();
      }
    });
  });

  // Add time spent entry
  container.querySelectorAll('.btn-add-time-spent').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const hoursEl = container.querySelector(`.time-spent-add-hours[data-act-id="${actId}"]`);
      const minsEl = container.querySelector(`.time-spent-add-mins[data-act-id="${actId}"]`);
      const noteEl = container.querySelector(`.time-spent-add-note[data-act-id="${actId}"]`);
      const mins = (parseInt(hoursEl.value) || 0) * 60 + (parseInt(minsEl.value) || 0);
      if (mins <= 0) return;
      const note = noteEl ? noteEl.value.trim() : '';
      addTimeSpentEntry(actId, mins, note);
      renderPhases();  // renderPhases() already calls clearCache() internally
      attachExpandedEvents();
    });
  });

  // Editable text fields (description, particularisation)
  container.querySelectorAll('.editable-text[data-act-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const actId = el.dataset.actId;
      const field = el.dataset.field;
      const value = el.textContent.trim();
      const act = getActivity(actId);
      if (act && act[field] !== value) {
        snapshotForUndo('Edit ' + field, 'actfield-' + actId + '-' + field);
        const oldValue = act[field];
        act[field] = value;
        queueWrite('updateActivity', { id: actId, [field]: value });
        if (TEMPLATE_FIELDS_ACTIVITY.includes(field)) {
          trackTemplateChange('edit', 'Activities', actId, field, oldValue, value, 'Activity ' + field + ' edited');
        }
      }
    });
  });

  // Particularisation toggle
  container.querySelectorAll('.particularisation-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = btn.nextElementSibling;
      content.classList.toggle('visible');
      btn.innerHTML = content.classList.contains('visible') ? '&#9650; Project Specific Guidance' : '&#9660; Project Specific Guidance';
    });
  });

  // Particularisation edit toggle
  container.querySelectorAll('.particularisation-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const wrapper = btn.closest('.particularisation-content');
      const rendered = wrapper.querySelector('.particularisation-rendered');
      const textarea = wrapper.querySelector('.particularisation-edit');
      if (textarea.style.display === 'none') {
        textarea.style.display = 'block';
        rendered.style.display = 'none';
        btn.textContent = '✓ Done';
        textarea.focus();
      } else {
        const newValue = textarea.value.trim();
        const act = getActivity(actId);
        if (act) {
          snapshotForUndo('Edit guidance', 'guidance-' + actId);
          const oldValue = act.particularisation_guidance;
          act.particularisation_guidance = newValue;
          queueWrite('updateActivity', { id: actId, particularisation_guidance: newValue });
          trackTemplateChange('edit', 'Activities', actId, 'particularisation_guidance', oldValue, newValue, 'Particularisation guidance edited');
          rendered.innerHTML = renderMarkdownGuidance(newValue);
        }
        textarea.style.display = 'none';
        rendered.style.display = '';
        btn.textContent = '✎ Edit';
      }
    });
  });

  // Full description toggle
  container.querySelectorAll('.full-desc-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const content = document.querySelector(`[data-full-desc="${actId}"]`);
      const wrapper = btn.previousElementSibling?.classList.contains('full-desc-preview-wrapper')
        ? btn.previousElementSibling
        : document.querySelector(`.full-desc-preview-wrapper[data-act-id="${actId}"]`);
      if (!content) return;
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      if (wrapper) wrapper.style.display = isVisible ? '' : 'none';
      btn.textContent = isVisible ? 'Description' : '▲ Hide Description';
    });
  });

  // Time spent history toggle
  container.querySelectorAll('.time-spent-history-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const history = container.querySelector(`.time-spent-history[data-act-id="${actId}"]`);
      const fade = btn.parentElement.querySelector('.time-spent-history-fade');
      const rightCol = btn.closest('.time-section-right');
      const row = btn.closest('.time-section-row');
      if (!history) return;
      const isExpanded = history.classList.contains('expanded');
      history.classList.toggle('expanded');
      if (rightCol) rightCol.classList.toggle('expanded');
      if (row) row.classList.toggle('expanded');
      if (fade) fade.style.display = isExpanded ? '' : 'none';
      const count = history.querySelectorAll('.time-spent-entry').length;
      btn.textContent = isExpanded ? `Show all (${count} entries)` : '▲ Show less';
    });
  });

  // Todo checkbox
  container.querySelectorAll('.todo-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const todoId = cb.dataset.todoId;
      const todo = getTodo(todoId);
      if (todo) {
        snapshotForUndo('Toggle todo');
        todo.is_done = cb.checked;
        todo.completed_at = cb.checked ? new Date().toISOString() : '';
        queueWrite('updateTodo', { id: todoId, is_done: cb.checked, completed_at: todo.completed_at });
        renderPhases();
        renderStatusBar();
        renderNav();
        renderWhatsNext();
        attachExpandedEvents();
      }
    });
  });

  // Todo text edit
  container.querySelectorAll('.todo-text[data-todo-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const todoId = el.dataset.todoId;
      const text = el.textContent.trim();
      const todo = getTodo(todoId);
      if (todo && todo.text !== text) {
        snapshotForUndo('Edit todo text', 'todotext-' + todoId);
        const oldText = todo.text;
        todo.text = text;
        queueWrite('updateTodo', { id: todoId, text: text });
        trackTemplateChange('edit', 'Todos', todoId, 'text', oldText, text, 'Todo text edited');
      }
    });
  });

  // Todo soft-delete (set inactive)
  container.querySelectorAll('.todo-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const todoId = btn.dataset.todoId;
      const todo = getTodo(todoId);
      if (todo) {
        snapshotForUndo('Delete todo');
        trackTemplateChange('delete', 'Todos', todoId, '', todo.text, '', 'Todo deleted: ' + truncate(todo.text, 60));
        todo.active = false;
        queueWrite('updateTodo', { id: todoId, active: false });
        renderPhases();
        attachExpandedEvents();
        renderStatusBar();
      }
    });
  });

  // Todo restore (reactivate)
  container.querySelectorAll('.todo-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const todoId = btn.dataset.todoId;
      const todo = getTodo(todoId);
      if (todo) {
        snapshotForUndo('Restore todo');
        todo.active = true;
        queueWrite('updateTodo', { id: todoId, active: true });
        renderPhases();
        attachExpandedEvents();
        renderStatusBar();
      }
    });
  });

  // Inactive toggle buttons (todos and questions)
  container.querySelectorAll('.inactive-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const type = btn.dataset.toggleType;
      if (type === 'todos') {
        state.showInactiveTodos[actId] = !state.showInactiveTodos[actId];
      } else {
        state.showInactiveQuestions[actId] = !state.showInactiveQuestions[actId];
      }
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Add todo
  container.querySelectorAll('[data-add-btn="todo"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`[data-add-type="todo"][data-act-id="${btn.dataset.actId}"]`);
      const text = input.value.trim();
      if (!text) return;
      const todo = {
        id: generateId('T'),
        activity_id: btn.dataset.actId,
        text: text,
        is_done: false,
        is_project_specific: true,
        assigned_to: '',
        due_date: '',
        sequence: getActivityTodos(btn.dataset.actId).length,
        active: true
      };
      snapshotForUndo('Add todo');
      state.todos.push(todo);
      queueWrite('addTodo', todo);
      trackTemplateChange('add', 'Todos', todo.id, '', '', JSON.stringify(todo), 'Todo added: ' + truncate(text, 60));
      input.value = '';
      renderPhases();
      attachExpandedEvents();
      renderStatusBar();
    });
  });

  // Add todo on Enter
  container.querySelectorAll('[data-add-type="todo"]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = container.querySelector(`[data-add-btn="todo"][data-act-id="${input.dataset.actId}"]`);
        if (btn) btn.click();
      }
    });
  });

  // Question answer — auto-size and "Read more" button
  container.querySelectorAll('.answer-field').forEach(ta => {
    let timer;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      autoSizeAnswer(ta);
      snapshotForUndo('Edit answer', 'answer-' + ta.dataset.questionId);
      timer = setTimeout(() => {
        const qId = ta.dataset.questionId;
        const answer = ta.value;
        const q = getQuestion(qId);
        if (q) {
          q.answer = answer;
          q.is_answered = !!answer.trim();
          if (answer.trim() && !q.answered_at) q.answered_at = new Date().toISOString();
          if (!answer.trim()) q.answered_at = '';
          queueWrite('updateQuestion', { id: qId, answer: answer, is_answered: q.is_answered, answered_at: q.answered_at || '' });
          renderStatusBar();
          renderNav();
          renderWhatsNext();
        }
      }, CONFIG.DEBOUNCE_MS);
    });
    // Initial auto-size on render
    autoSizeAnswer(ta);
  });

  // Question text edit
  container.querySelectorAll('.question-text[data-question-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const qId = el.dataset.questionId;
      const text = el.textContent.trim();
      const q = getQuestion(qId);
      if (q && q.question_text !== text) {
        snapshotForUndo('Edit question text', 'qtext-' + qId);
        const oldText = q.question_text;
        q.question_text = text;
        queueWrite('updateQuestion', { id: qId, question_text: text });
        trackTemplateChange('edit', 'Questions', qId, 'question_text', oldText, text, 'Question text edited');
      }
    });
  });

  // Ask whom edit
  container.querySelectorAll('.ask-whom-badge[data-question-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const qId = el.dataset.questionId;
      let text = el.textContent.trim();
      if (text.startsWith('Ask: ')) text = text.substring(5);
      const q = getQuestion(qId);
      if (q && q.ask_whom !== text) {
        snapshotForUndo('Edit ask whom', 'askwhom-' + qId);
        const oldAskWhom = q.ask_whom;
        q.ask_whom = text;
        queueWrite('updateQuestion', { id: qId, ask_whom: text });
        trackTemplateChange('edit', 'Questions', qId, 'ask_whom', oldAskWhom, text, 'Question ask_whom edited');
      }
    });
  });

  // Question delete
  // Question soft-delete (set inactive)
  container.querySelectorAll('.question-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qId = btn.dataset.questionId;
      const question = getQuestion(qId);
      if (question) {
        snapshotForUndo('Delete question');
        trackTemplateChange('delete', 'Questions', qId, '', question.question_text, '', 'Question deleted: ' + truncate(question.question_text, 60));
        question.active = false;
        queueWrite('updateQuestion', { id: qId, active: false });
        renderPhases();
        attachExpandedEvents();
        renderStatusBar();
      }
    });
  });

  // Question restore (reactivate)
  container.querySelectorAll('.question-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qId = btn.dataset.questionId;
      const question = getQuestion(qId);
      if (question) {
        snapshotForUndo('Restore question');
        question.active = true;
        queueWrite('updateQuestion', { id: qId, active: true });
        renderPhases();
        attachExpandedEvents();
        renderStatusBar();
      }
    });
  });

  // Add question
  container.querySelectorAll('[data-add-btn="question"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`[data-add-type="question"][data-act-id="${btn.dataset.actId}"]`);
      const text = input.value.trim();
      if (!text) return;
      const q = {
        id: generateId('Q'),
        activity_id: btn.dataset.actId,
        sub_topic: 'Project-Specific',
        question_text: text,
        ask_whom: '',
        answer: '',
        is_answered: false,
        sequence: getActivityQuestions(btn.dataset.actId).length,
        active: true
      };
      snapshotForUndo('Add question');
      state.questions.push(q);
      queueWrite('addQuestion', q);
      trackTemplateChange('add', 'Questions', q.id, '', '', JSON.stringify(q), 'Question added: ' + truncate(text, 60));
      input.value = '';
      renderPhases();
      attachExpandedEvents();
      renderStatusBar();
    });
  });

  // Add question on Enter
  container.querySelectorAll('[data-add-type="question"]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = container.querySelector(`[data-add-btn="question"][data-act-id="${input.dataset.actId}"]`);
        if (btn) btn.click();
      }
    });
  });

  // Note delete
  container.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const noteId = btn.dataset.noteId;
      snapshotForUndo('Delete note');
      state.notes = state.notes.filter(n => n.id !== noteId);
      queueWrite('deleteNote', { id: noteId });
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Delete time spent entry
  container.querySelectorAll('.time-log-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = btn.dataset.entryId;
      const actId = btn.dataset.actId;
      state.timeSpent = state.timeSpent.filter(e => e.id !== entryId);
      queueWrite('deleteTimeSpentEntry', { id: entryId });
      recalcActualMinutes(actId);
      renderPhases();  // renderPhases() already calls clearCache() internally
      renderStatusBar();
      attachExpandedEvents();
    });
  });

  // Note field edit
  container.querySelectorAll('[data-note-id][data-field]').forEach(el => {
    el.addEventListener('blur', () => {
      const noteId = el.dataset.noteId;
      const field = el.dataset.field;
      const value = el.textContent.trim();
      const note = getNote(noteId);
      if (note && note[field] !== value) {
        snapshotForUndo('Edit note', 'note-' + noteId);
        note[field] = value;
        queueWrite('updateNote', { id: noteId, [field]: value });
      }
    });
  });

  // Add note
  container.querySelectorAll('[data-add-btn="note"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const note = {
        id: generateId('N'),
        activity_id: btn.dataset.actId,
        type: 'note',
        content: 'New note...',
        url: '',
        label: 'Note',
        date_added: new Date().toISOString()
      };
      snapshotForUndo('Add note');
      state.notes.push(note);
      queueWrite('addNote', note);
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Add link
  container.querySelectorAll('[data-add-btn="link"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = prompt('Enter URL:');
      if (!url) return;
      const label = prompt('Enter label:', url) || url;
      const note = {
        id: generateId('N'),
        activity_id: btn.dataset.actId,
        type: 'link',
        content: '',
        url: url,
        label: label,
        date_added: new Date().toISOString()
      };
      snapshotForUndo('Add link');
      state.notes.push(note);
      queueWrite('addNote', note);
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Dependency badges - click to navigate
  container.querySelectorAll('.dep-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      expandActivity(badge.dataset.depId);
    });
  });
}

function moveCard(actId, direction) {
  const act = getActivity(actId);
  if (!act) return;
  const phaseActs = getPhaseActivities(act.pdca_phase);
  const idx = phaseActs.findIndex(a => a.id === actId);
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= phaseActs.length) return;
  snapshotForUndo('Reorder activities');

  // Swap sequences
  const mySeq = act.sequence;
  const otherAct = phaseActs[swapIdx];
  const otherSeq = otherAct.sequence;
  act.sequence = otherSeq;
  otherAct.sequence = mySeq;

  queueWrite('updateActivity', { id: act.id, sequence: act.sequence });
  queueWrite('updateActivity', { id: otherAct.id, sequence: otherAct.sequence });
  trackTemplateChange('edit', 'Activities', act.id, 'sequence', mySeq, otherSeq, 'Activity reordered');
  trackTemplateChange('edit', 'Activities', otherAct.id, 'sequence', otherSeq, mySeq, 'Activity reordered');
  renderPhases();
  attachExpandedEvents();
}

function setActivityStatus(actId, newStatus) {
  const act = getActivity(actId);
  if (!act) return;
  snapshotForUndo('Change activity status');
  act.status = newStatus;
  queueWrite('updateActivity', { id: act.id, status: newStatus });
  checkPhaseAdvance();
  state.expandedActivityId = null;
  renderAll();
  attachExpandedEvents();
}

function deleteActivity(actId) {
  const act = getActivity(actId);
  const actTitle = act ? act.title : actId;
  snapshotForUndo('Delete activity');
  state.activities = state.activities.filter(a => a.id !== actId);
  state.todos = state.todos.filter(t => t.activity_id !== actId);
  state.questions = state.questions.filter(q => q.activity_id !== actId);
  state.notes = state.notes.filter(n => n.activity_id !== actId);
  queueWrite('deleteActivity', { id: actId });
  trackTemplateChange('delete', 'Activities', actId, '', actTitle, '', 'Activity deleted: ' + truncate(actTitle, 60));
  state.expandedActivityId = null;
  renderAll();
  attachExpandedEvents();
}

function addNewActivity(phase) {
  const title = prompt('Activity title:');
  if (!title) return;

  const existing = getPhaseActivities(phase);
  const act = {
    id: generateId('A'),
    title: title,
    intro_text: '',
    full_description: '',
    pdca_phase: phase,
    sequence: existing.length + 1,
    status: 'not_started',
    due_date: '',
    depends_on: '',
    activity_type: '',
    particularisation_guidance: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  snapshotForUndo('Add activity');
  state.activities.push(act);
  queueWrite('addActivity', act);
  trackTemplateChange('add', 'Activities', act.id, '', '', JSON.stringify(act), 'Activity added: ' + truncate(title, 60));
  renderPhases();
  renderNav();
  renderStatusBar();
  renderWhatsNext();
  attachExpandedEvents();
}

function renamePhase(oldName, newName) {
  snapshotForUndo('Rename phase');
  state.activities.forEach(a => {
    if (a.pdca_phase === oldName) {
      a.pdca_phase = newName;
      queueWrite('updateActivity', { id: a.id, pdca_phase: newName });
      trackTemplateChange('edit', 'Activities', a.id, 'pdca_phase', oldName, newName, 'Phase renamed');
    }
  });
  // Update CONFIG.PHASES
  const idx = CONFIG.PHASES.indexOf(oldName);
  if (idx !== -1) CONFIG.PHASES[idx] = newName;
  renderPhases();
  renderNav();
  attachExpandedEvents();
}

// ---- Milestone Modal ----

function openMilestoneModal(msId, timelineType) {
  const modal = document.getElementById('milestoneModal');
  state.editingMilestoneId = msId || null;

  if (msId) {
    const ms = getMilestone(msId);
    if (!ms) return;
    document.getElementById('milestoneModalTitle').textContent = 'Edit Milestone';
    document.getElementById('msName').value = ms.milestone_name || '';
    document.getElementById('msTimelineType').value = ms.timeline_type || 'technical';
    document.getElementById('msDate').value = ms.date || '';
    document.getElementById('msStatus').value = ms.status || 'planned';
    document.getElementById('msNotes').value = ms.notes || '';
    document.getElementById('msDeleteBtn').style.display = 'inline-block';
  } else {
    document.getElementById('milestoneModalTitle').textContent = 'Add Milestone';
    document.getElementById('msName').value = '';
    document.getElementById('msTimelineType').value = timelineType || 'technical';
    document.getElementById('msDate').value = '';
    document.getElementById('msStatus').value = 'planned';
    document.getElementById('msNotes').value = '';
    document.getElementById('msDeleteBtn').style.display = 'none';
  }

  modal.style.display = 'flex';
}

function saveMilestone() {
  const name = document.getElementById('msName').value.trim();
  if (!name) return;
  snapshotForUndo('Edit milestone');

  const data = {
    milestone_name: name,
    timeline_type: document.getElementById('msTimelineType').value,
    date: document.getElementById('msDate').value,
    status: document.getElementById('msStatus').value,
    notes: document.getElementById('msNotes').value
  };

  if (state.editingMilestoneId) {
    const ms = getMilestone(state.editingMilestoneId);
    if (ms) Object.assign(ms, data);
    data.id = state.editingMilestoneId;
    queueWrite('updateMilestone', data);
  } else {
    data.id = generateId('M');
    data.sequence = state.milestones.length;
    state.milestones.push(data);
    queueWrite('updateMilestone', data);
  }

  closeModal('milestoneModal');
  renderTimeline();
}

function deleteMilestoneAction() {
  if (!state.editingMilestoneId) return;
  snapshotForUndo('Delete milestone');
  state.milestones = state.milestones.filter(m => m.id !== state.editingMilestoneId);
  queueWrite('deleteMilestone', { id: state.editingMilestoneId });
  closeModal('milestoneModal');
  renderTimeline();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ---- SOW (Statement of Work) ----

function openSowModal() {
  const techSummary = document.getElementById('sowTechnicalSummary');
  const textarea = document.getElementById('sowContent');
  const remarks = document.getElementById('sowRemarks');
  const status = document.getElementById('sowStatus');
  // Load latest SOW entry
  if (state.sow.length > 0) {
    const latest = state.sow.reduce((a, b) => (a.date_added || '') >= (b.date_added || '') ? a : b);
    techSummary.value = latest.technical_summary || '';
    textarea.value = latest.content || '';
    remarks.value = latest.remarks || '';
    status.textContent = latest.date_added ? 'Last saved: ' + latest.date_added : '';
  } else {
    techSummary.value = '';
    textarea.value = '';
    remarks.value = '';
    status.textContent = '';
  }
  document.getElementById('sowModal').style.display = 'flex';
}

function saveSow() {
  const technicalSummary = document.getElementById('sowTechnicalSummary').value.trim();
  const content = document.getElementById('sowContent').value.trim();
  const remarks = document.getElementById('sowRemarks').value.trim();
  const status = document.getElementById('sowStatus');
  if (!content && !technicalSummary) {
    status.textContent = 'Please enter the Statement of Work or Technical Summary.';
    return;
  }
  const now = new Date();
  const dateAdded = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const entry = { date_added: dateAdded, technical_summary: technicalSummary, content: content, remarks: remarks };
  // Replace existing or add new
  state.sow = [entry];
  queueWrite('addSowEntry', entry);
  saveToLocalCache();
  status.textContent = 'Saved!';
  setTimeout(() => { closeModal('sowModal'); }, 2000);
}

// ---- Transcripts ----

function renderTranscripts() {
  const container = document.getElementById('transcriptList');
  if (!container) return;

  const sorted = [...state.transcripts].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''));

  const unprocessedCount = sorted.filter(t =>
    !t.processed || t.processed === 'FALSE' || t.processed === false).length;

  // Update Process All button
  const processBtn = document.getElementById('processAllBtn');
  if (processBtn) {
    processBtn.textContent = unprocessedCount > 0
      ? `Process All (${unprocessedCount})`
      : 'Process All';
    processBtn.disabled = unprocessedCount === 0;
    processBtn.style.opacity = unprocessedCount === 0 ? '0.5' : '1';
  }

  if (sorted.length === 0) {
    container.innerHTML = '<p class="transcript-empty">No entries yet. Click "+ Add Entry" to upload a transcript or note.</p>';
    return;
  }

  container.innerHTML = sorted.map(t => {
    const isProcessed = t.processed === true || t.processed === 'TRUE' || t.processed === 'true';
    const preview = truncate(t.transcript_note || '', 120);
    const isExpanded = state.expandedTranscriptId === t.id;

    const convType = t.meeting_type || 'external';

    return `<div class="transcript-entry${isExpanded ? ' expanded' : ''}" data-transcript-id="${escapeHtml(t.id)}">
      <div class="transcript-entry-row">
        <span class="transcript-date">${formatDate(t.date || t.created_at)}</span>
        <span class="transcript-type-badge ${convType}" onclick="event.stopPropagation();toggleTranscriptType('${escapeHtml(t.id)}')" title="Click to toggle">${convType === 'internal' ? 'Internal' : 'External'}</span>
        <span class="transcript-participants">${escapeHtml(t.participants || '')}</span>
        <span class="transcript-preview">${escapeHtml(preview)}</span>
        <span class="transcript-status-badge ${isProcessed ? 'processed' : 'pending'}">${isProcessed ? 'Processed' : 'Pending'}</span>
        ${t.source_filename ? '<span class="transcript-filename">' + escapeHtml(t.source_filename) + '</span>' : ''}
        <button class="transcript-delete" data-transcript-id="${escapeHtml(t.id)}" title="Delete">&times;</button>
      </div>
      ${isExpanded ? `<div class="transcript-expanded-content">
        ${t.context ? '<div class="transcript-context"><strong>Context:</strong> ' + escapeHtml(t.context) + '</div>' : ''}
        <div class="transcript-full-text">${escapeHtml(t.transcript_note || '')}</div>
        ${isProcessed && t.summary ? '<div class="transcript-summary"><strong>Summary:</strong> ' + escapeHtml(t.summary) + '</div>' : ''}
        ${isProcessed && t.activity_id ? '<div class="transcript-matched"><strong>Matched activities:</strong> ' + escapeHtml(t.activity_id) + '</div>' : ''}
      </div>` : ''}
    </div>`;
  }).join('');
}

function toggleTranscriptExpand(id) {
  state.expandedTranscriptId = state.expandedTranscriptId === id ? null : id;
  renderTranscripts();
}

function deleteTranscript(id) {
  state.transcripts = state.transcripts.filter(t => t.id !== id);
  queueWrite('deleteTranscriptEntry', { id });
  saveToLocalCache();
  renderTranscripts();
  renderNav();
}

function openTranscriptUploadModal() {
  document.getElementById('trUploadDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('trUploadParticipants').value = '';
  document.getElementById('trUploadContext').value = '';
  document.getElementById('trUploadContent').value = '';
  document.getElementById('trUploadFile').value = '';
  document.getElementById('trCharCount').textContent = '';
  clearTranscriptType(); // no default — user must choose
  document.getElementById('transcriptUploadModal').style.display = 'flex';
}

function toggleTranscriptType(id) {
  const t = state.transcripts.find(t => t.id === id);
  if (!t) return;
  t.meeting_type = t.meeting_type === 'internal' ? 'external' : 'internal';
  queueWrite('updateTranscript', { id: id, meeting_type: t.meeting_type });
  saveToLocalCache();
  renderTranscripts();
}

function setTranscriptType(type) {
  document.getElementById('trTypeExternal').classList.toggle('active', type === 'external');
  document.getElementById('trTypeInternal').classList.toggle('active', type === 'internal');
  // Store on the modal so saveTranscriptEntry() can read it
  document.getElementById('transcriptUploadModal').dataset.meetingType = type;
}

function clearTranscriptType() {
  document.getElementById('trTypeExternal').classList.remove('active');
  document.getElementById('trTypeInternal').classList.remove('active');
  document.getElementById('transcriptUploadModal').dataset.meetingType = '';
}

function promptTranscriptType() {
  // Show inline prompt below the type toggle
  let prompt = document.getElementById('trTypePrompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'trTypePrompt';
    prompt.className = 'tr-type-prompt';
    prompt.innerHTML = '<span>Is this meeting or note internal or external?</span>' +
      '<button type="button" class="tr-type-btn" onclick="setTranscriptType(\'internal\');dismissTranscriptTypePrompt();saveTranscriptEntry()">Internal</button>' +
      '<button type="button" class="tr-type-btn" onclick="setTranscriptType(\'external\');dismissTranscriptTypePrompt();saveTranscriptEntry()">External</button>';
    const toggle = document.querySelector('.tr-type-toggle');
    toggle.parentNode.insertBefore(prompt, toggle.nextSibling);
  }
  // Highlight the toggle area
  document.querySelector('.tr-type-toggle').classList.add('tr-type-highlight');
}

function dismissTranscriptTypePrompt() {
  const prompt = document.getElementById('trTypePrompt');
  if (prompt) prompt.remove();
  document.querySelector('.tr-type-toggle').classList.remove('tr-type-highlight');
}

function handleTranscriptFile() {
  const fileInput = document.getElementById('trUploadFile');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('trUploadContent').value = e.target.result;
    updateTranscriptCharCount();
  };
  reader.readAsText(file);
}

const TRANSCRIPT_MAX_CHARS = 50000; // Google Sheets cell limit

function updateTranscriptCharCount() {
  const textarea = document.getElementById('trUploadContent');
  const count = textarea.value.length;
  const el = document.getElementById('trCharCount');
  if (count > TRANSCRIPT_MAX_CHARS) {
    textarea.value = textarea.value.substring(0, TRANSCRIPT_MAX_CHARS);
    el.textContent = TRANSCRIPT_MAX_CHARS.toLocaleString() + ' / ' + TRANSCRIPT_MAX_CHARS.toLocaleString() + ' (limit reached)';
    el.style.color = 'var(--danger)';
  } else if (count > 40000) {
    el.textContent = count.toLocaleString() + ' / ' + TRANSCRIPT_MAX_CHARS.toLocaleString();
    el.style.color = 'var(--danger)';
  } else if (count > 0) {
    el.textContent = count.toLocaleString() + ' / ' + TRANSCRIPT_MAX_CHARS.toLocaleString();
    el.style.color = 'var(--text-light)';
  } else {
    el.textContent = '';
  }
}

function saveTranscriptEntry() {
  const content = document.getElementById('trUploadContent').value.trim();
  if (!content) { alert('Please enter or upload transcript content.'); return; }
  if (content.length > TRANSCRIPT_MAX_CHARS) { alert('Content exceeds the 50,000 character limit. Please shorten it.'); return; }

  const meetingType = document.getElementById('transcriptUploadModal').dataset.meetingType;
  if (!meetingType) {
    promptTranscriptType();
    return;
  }

  const entry = {
    id: generateId('TR'),
    date: document.getElementById('trUploadDate').value,
    participants: document.getElementById('trUploadParticipants').value.trim(),
    context: document.getElementById('trUploadContext').value.trim(),
    meeting_type: meetingType,
    transcript_note: content,
    summary: '',
    processed: false,
    activity_id: '',
    source_filename: document.getElementById('trUploadFile').files[0]
      ? document.getElementById('trUploadFile').files[0].name : '',
    created_at: new Date().toISOString()
  };

  state.transcripts.push(entry);
  queueWrite('addTranscriptEntry', entry);
  saveToLocalCache();
  closeModal('transcriptUploadModal');
  renderTranscripts();
  renderNav();
}

// ---- Transcript Processing ----

async function processAllTranscripts() {
  if (!CONFIG.API_URL) { alert('No API URL configured.'); return; }

  const unprocessed = state.transcripts.filter(t =>
    !t.processed || t.processed === 'FALSE' || t.processed === false);
  if (unprocessed.length === 0) { alert('No unprocessed entries.'); return; }

  // Show loading
  const btn = document.getElementById('processAllBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Processing...';
  btn.disabled = true;

  const loading = document.getElementById('loadingOverlay');
  loading.innerHTML = '<div class="loading-spinner"></div><p>Processing ' + unprocessed.length +
    ' entries with Claude AI...</p><p style="font-size:0.8rem;color:var(--text-light);">This may take 30\u201360 seconds.</p>';
  loading.classList.remove('hidden');

  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'processTranscripts', data: {} }),
      redirect: 'follow'
    });
    const result = await resp.json();

    loading.classList.add('hidden');

    if (result.error) {
      alert('Processing failed: ' + result.error);
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    openReviewModal(result.proposals, result.processed_entry_ids, result.prompt_source);
  } catch (e) {
    loading.classList.add('hidden');
    alert('Processing failed: ' + e.message);
  }

  btn.textContent = originalText;
  btn.disabled = false;
}

// ---- Agreements ----

function renderAgreements() {
  const container = document.getElementById('agreementsSection');
  if (!container) return;

  const internalAgreements = state.agreements.filter(a =>
    a.active !== false && a.active !== 'FALSE' && a.active !== 'false' &&
    (a.internal === true || a.internal === 'TRUE' || a.internal === 'true'));
  const externalAgreements = state.agreements.filter(a =>
    a.active !== false && a.active !== 'FALSE' && a.active !== 'false' &&
    (a.internal === false || a.internal === 'FALSE' || a.internal === 'false' || a.internal === ''));

  // Check which agreements were updated by AI in this session
  let aiUpdatedAgreementIds = [];
  try { aiUpdatedAgreementIds = JSON.parse(sessionStorage.getItem('acm_ai_updated_agreements') || '[]'); } catch (e) { /* ignore */ }

  function renderCards(agreements) {
    if (agreements.length === 0) {
      return '<p class="agreement-empty">No agreements yet.</p>';
    }
    return agreements.map(ag => {
      const hasAnswer = ag.agreement && String(ag.agreement).trim();
      const aiUpdated = aiUpdatedAgreementIds.includes(ag.id);
      const attribution = ag.added_by && ag.added_on
        ? `<div class="agreement-attribution">Added by ${escapeHtml(ag.added_by)} on ${escapeHtml(ag.added_on)}</div>`
        : '';
      return `<div class="agreement-card${hasAnswer ? ' answered' : ''}" data-agreement-id="${escapeHtml(ag.id)}">
        <button class="agreement-delete" data-agreement-id="${escapeHtml(ag.id)}" title="Remove">&times;</button>
        ${aiUpdated ? '<span class="ai-new-badge agreement-ai-badge" title="Updated by AI processing">&#11088; New info!</span>' : ''}
        <div class="agreement-question" contenteditable="true" data-agreement-id="${escapeHtml(ag.id)}" data-field="question_agreed">${escapeHtml(ag.question_agreed || '')}</div>
        <div class="answer-field-wrap">
          <textarea class="answer-field agreement-answer" data-agreement-id="${escapeHtml(ag.id)}" placeholder="Agreement...">${escapeHtml(ag.agreement || '')}</textarea>
        </div>
        ${attribution}
      </div>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="agreements-header">
      <h2>Agreements</h2>
    </div>
    <div class="agreements-columns">
      <div class="agreements-block agreements-internal">
        <h3 class="agreements-block-title">Internal Agreements</h3>
        ${renderCards(internalAgreements)}
        <button class="btn-small agreement-add" data-agreement-type="internal">+ Add Agreement</button>
      </div>
      <div class="agreements-block agreements-external">
        <h3 class="agreements-block-title">External Agreements</h3>
        ${renderCards(externalAgreements)}
        <button class="btn-small agreement-add" data-agreement-type="external">+ Add Agreement</button>
      </div>
    </div>`;

  attachAgreementEvents();
}

function attachAgreementEvents() {
  const container = document.getElementById('agreementsSection');
  if (!container) return;

  // Answer field auto-size and save
  container.querySelectorAll('.agreement-answer').forEach(ta => {
    let timer;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      autoSizeAnswer(ta);
      snapshotForUndo('Edit agreement', 'agreement-' + ta.dataset.agreementId);
      timer = setTimeout(() => {
        const agId = ta.dataset.agreementId;
        const agreement = ta.value;
        const ag = getAgreement(agId);
        if (ag) {
          // Set attribution on first answer input
          if (!ag.added_by && agreement.trim()) {
            const oldAgreement = ag.agreement;
            ag.added_by = 'human';
            ag.added_on = formatDateLong(new Date());
            ag.agreement = agreement;
            queueWrite('updateAgreement', { id: agId, agreement, added_by: ag.added_by, added_on: ag.added_on });
            renderAgreements();
            return;
          }
          const oldAgreement = ag.agreement;
          ag.agreement = agreement;
          queueWrite('updateAgreement', { id: agId, agreement });
        }
      }, CONFIG.DEBOUNCE_MS);
    });
    autoSizeAnswer(ta);
  });

  // Question text edit
  container.querySelectorAll('.agreement-question[data-agreement-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const agId = el.dataset.agreementId;
      const text = el.textContent.trim();
      const ag = getAgreement(agId);
      if (ag && ag.question_agreed !== text) {
        snapshotForUndo('Edit agreement question', 'agq-' + agId);
        const oldText = ag.question_agreed;
        ag.question_agreed = text;
        queueWrite('updateAgreement', { id: agId, question_agreed: text });
      }
    });
  });

  // Delete agreement (soft delete)
  container.querySelectorAll('.agreement-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const agId = btn.dataset.agreementId;
      const ag = getAgreement(agId);
      if (ag) {
        snapshotForUndo('Delete agreement');
        trackTemplateChange('delete', 'Agreements', agId, '', ag.question_agreed || ag.agreement, '', 'Agreement deleted: ' + truncate(ag.question_agreed || ag.agreement, 60));
        ag.active = false;
        queueWrite('updateAgreement', { id: agId, active: false });
        renderAgreements();
      }
    });
  });

  // Add agreement
  container.querySelectorAll('.agreement-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const isInternal = btn.dataset.agreementType === 'internal';
      const newAg = {
        id: generateId('AG'),
        question_agreed: '',
        agreement: '',
        internal: isInternal,
        active: true,
        added_by: '',
        added_on: ''
      };
      snapshotForUndo('Add agreement');
      state.agreements.push(newAg);
      queueWrite('addAgreement', newAg);
      trackTemplateChange('add', 'Agreements', newAg.id, '', '', JSON.stringify(newAg), 'Agreement added');
      renderAgreements();
      // Focus the new question field
      const newField = container.querySelector(`[data-agreement-id="${newAg.id}"] .agreement-question`);
      if (newField) newField.focus();
    });
  });
}

// ---- Review Modal ----

let pendingProposals = null;
let pendingEntryIds = null;

function openReviewModal(proposals, entryIds, promptSource) {
  pendingProposals = proposals;
  pendingEntryIds = entryIds;

  const body = document.getElementById('reviewModalBody');
  let html = '';

  // Warn if fallback prompt was used
  if (promptSource === 'fallback') {
    html += `<div class="review-fallback-warning">
      <strong>Note:</strong> The Prompts sheet could not be read — a built-in fallback prompt was used.
      Check that a <em>Prompts</em> tab exists with a <code>process_all_v1</code> key.
    </div>`;
  }

  // Summary
  if (proposals.summary) {
    html += `<div class="review-section">
      <h3 class="review-section-title">Summary</h3>
      <p class="review-summary">${escapeHtml(proposals.summary)}</p>
    </div>`;
  }

  // Matched activities (informational)
  if (proposals.matched_activities && proposals.matched_activities.length > 0) {
    html += `<div class="review-section">
      <h3 class="review-section-title">Matched Activities</h3>
      <div class="review-activities">
        ${proposals.matched_activities.map(id => {
          const act = getActivity(id);
          return `<span class="review-activity-badge">${escapeHtml(id)}${act ? ': ' + escapeHtml(truncate(act.title, 40)) : ''}</span>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Answered questions (with checkboxes)
  if (proposals.answered_questions && proposals.answered_questions.length > 0) {
    html += `<div class="review-section">
      <h3 class="review-section-title">Proposed Question Answers (${proposals.answered_questions.length})</h3>
      ${proposals.answered_questions.map((aq, i) => {
        const q = getQuestion(aq.id);
        const isUpdate = aq.is_update && q && q.answer;
        const label = isUpdate ? 'New information to append' : 'Proposed answer';
        return `<div class="review-item">
          <label class="review-checkbox">
            <input type="checkbox" checked data-review-type="question" data-review-idx="${i}">
            <div class="review-item-content">
              <div class="review-item-id">${escapeHtml(aq.id)}${isUpdate ? ' <span class="review-update-badge">Update</span>' : ''}</div>
              <div class="review-item-question">${q ? escapeHtml(q.question_text) : 'Unknown question'}</div>
              ${isUpdate ? `<div class="review-item-existing"><strong>Existing answer:</strong> ${escapeHtml(truncate(q.answer, 200))}</div>` : ''}
              <div class="review-item-answer"><strong>${label}:</strong> ${escapeHtml(aq.answer)}</div>
              ${aq.source_document ? `<div class="review-item-source">Source: ${escapeHtml(aq.source_document)}</div>` : ''}
            </div>
          </label>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Completed todos (with checkboxes)
  if (proposals.completed_todos && proposals.completed_todos.length > 0) {
    html += `<div class="review-section">
      <h3 class="review-section-title">Proposed Todo Completions (${proposals.completed_todos.length})</h3>
      ${proposals.completed_todos.map((ct, i) => {
        const t = getTodo(ct.id);
        return `<div class="review-item">
          <label class="review-checkbox">
            <input type="checkbox" checked data-review-type="todo" data-review-idx="${i}">
            <div class="review-item-content">
              <div class="review-item-id">${escapeHtml(ct.id)}</div>
              <div class="review-item-todo">${t ? escapeHtml(t.text) : 'Unknown todo'}</div>
              <div class="review-item-note"><strong>Reason:</strong> ${escapeHtml(ct.note || '')}</div>
              ${ct.source_document ? `<div class="review-item-source">Source: ${escapeHtml(ct.source_document)}</div>` : ''}
            </div>
          </label>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Answered agreements (with checkboxes)
  if (proposals.answered_agreements && proposals.answered_agreements.length > 0) {
    html += `<div class="review-section">
      <h3 class="review-section-title">Agreements (${proposals.answered_agreements.length})</h3>
      ${proposals.answered_agreements.map((aa, i) => {
        const isNew = aa.id === 'NEW';
        const ag = isNew ? null : getAgreement(aa.id);
        const isUpdate = !isNew && aa.is_update && ag && ag.agreement;
        const typeBadge = isNew ? (aa.internal ? 'Internal' : 'External') : '';
        let label, questionText, idLabel;
        if (isNew) {
          label = 'New agreement discovered';
          questionText = aa.question_agreed || 'Untitled agreement';
          idLabel = `<span class="review-new-badge">New ${typeBadge}</span>`;
        } else {
          label = isUpdate ? 'New information to append' : 'Proposed agreement';
          questionText = ag ? ag.question_agreed : 'Unknown agreement';
          idLabel = `${escapeHtml(aa.id)}${isUpdate ? ' <span class="review-update-badge">Update</span>' : ''}`;
        }
        return `<div class="review-item">
          <label class="review-checkbox">
            <input type="checkbox" checked data-review-type="agreement" data-review-idx="${i}">
            <div class="review-item-content">
              <div class="review-item-id">${idLabel}</div>
              <div class="review-item-question">${escapeHtml(questionText)}</div>
              ${isUpdate ? `<div class="review-item-existing"><strong>Current agreement:</strong> ${escapeHtml(truncate(ag.agreement, 200))}</div>` : ''}
              <div class="review-item-answer"><strong>${label}:</strong> ${escapeHtml(aa.answer)}</div>
              ${aa.source_document ? `<div class="review-item-source">Source: ${escapeHtml(aa.source_document)}</div>` : ''}
            </div>
          </label>
        </div>`;
      }).join('')}
    </div>`;
  }

  if (!proposals.answered_questions?.length && !proposals.completed_todos?.length && !proposals.answered_agreements?.length) {
    html += `<div class="review-section">
      <p class="review-empty">No specific question answers, todo completions, or agreement updates were identified. The entries will still be marked as processed.</p>
    </div>`;
  }

  body.innerHTML = html;
  document.getElementById('reviewModal').style.display = 'flex';
}

function applySelectedProposals() {
  if (!pendingProposals || !pendingEntryIds) return;
  snapshotForUndo('Apply transcript proposals');

  const modal = document.getElementById('reviewModal');
  const aiUpdatedIds = new Set();
  const todayStr = formatDateLong(new Date());

  // Apply checked question answers
  if (pendingProposals.answered_questions) {
    modal.querySelectorAll('[data-review-type="question"]').forEach(cb => {
      if (cb.checked) {
        const idx = parseInt(cb.dataset.reviewIdx);
        const aq = pendingProposals.answered_questions[idx];
        const q = getQuestion(aq.id);
        if (q) {
          const sourceDoc = aq.source_document || 'transcript';
          let fullAnswer;
          if (aq.is_update && q.answer) {
            // Append new info to existing answer
            const attribution = '\n\n[updated by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
            fullAnswer = q.answer + '\n\n' + aq.answer + attribution;
          } else {
            // New answer for previously unanswered question
            const attribution = '\n\n[answered by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
            fullAnswer = aq.answer + attribution;
          }
          q.answer = fullAnswer;
          q.is_answered = true;
          if (!q.answered_at) q.answered_at = new Date().toISOString();
          queueWrite('updateQuestion', { id: aq.id, answer: fullAnswer, is_answered: true, answered_at: q.answered_at });
          if (q.activity_id) aiUpdatedIds.add(q.activity_id);
        }
      }
    });
  }

  // Apply checked todo completions
  if (pendingProposals.completed_todos) {
    modal.querySelectorAll('[data-review-type="todo"]').forEach(cb => {
      if (cb.checked) {
        const idx = parseInt(cb.dataset.reviewIdx);
        const ct = pendingProposals.completed_todos[idx];
        const t = getTodo(ct.id);
        if (t) {
          const sourceDoc = ct.source_document || 'transcript';
          const attribution = '[completed by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
          const noteText = (ct.note ? ct.note + ' ' : '') + attribution;
          t.is_done = true;
          t.notes = noteText;
          t.completed_at = new Date().toISOString();
          queueWrite('updateTodo', { id: ct.id, is_done: true, notes: noteText, completed_at: t.completed_at });
          if (t.activity_id) aiUpdatedIds.add(t.activity_id);
        }
      }
    });
  }

  // Apply checked agreement answers
  let agreementsChanged = false;
  const aiUpdatedAgreementIds = new Set();
  try {
    JSON.parse(sessionStorage.getItem('acm_ai_updated_agreements') || '[]').forEach(id => aiUpdatedAgreementIds.add(id));
  } catch (e) { /* ignore */ }

  if (pendingProposals.answered_agreements) {
    modal.querySelectorAll('[data-review-type="agreement"]').forEach(cb => {
      if (cb.checked) {
        const idx = parseInt(cb.dataset.reviewIdx);
        const aa = pendingProposals.answered_agreements[idx];
        const sourceDoc = aa.source_document || 'transcript';
        const isInternal = aa.internal === true || aa.internal === 'true' || aa.internal === 'TRUE';

        if (aa.id === 'NEW') {
          // Create a new agreement card
          const attribution = '\n\n[answered by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
          const newAg = {
            id: generateId('AG'),
            question_agreed: aa.question_agreed || '',
            agreement: aa.answer + attribution,
            internal: isInternal,
            active: true,
            added_by: 'AI',
            added_on: todayStr
          };
          state.agreements.push(newAg);
          queueWrite('addAgreement', newAg);
          aiUpdatedAgreementIds.add(newAg.id);
          agreementsChanged = true;
        } else {
          // Update existing agreement
          const ag = getAgreement(aa.id);
          if (ag) {
            let fullAgreement;
            if (aa.is_update && ag.agreement) {
              const attribution = '\n\n[updated by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
              fullAgreement = ag.agreement + '\n\n' + aa.answer + attribution;
            } else {
              const attribution = '\n\n[answered by AI on ' + todayStr + ' based on ' + sourceDoc + ']';
              fullAgreement = aa.answer + attribution;
            }
            ag.agreement = fullAgreement;
            const updateData = { id: aa.id, agreement: fullAgreement };
            // Fill in the question if the card has none and the AI provided one
            if (!ag.question_agreed && aa.question_agreed) {
              ag.question_agreed = aa.question_agreed;
              updateData.question_agreed = aa.question_agreed;
            }
            if (!ag.added_by) {
              ag.added_by = 'AI';
              ag.added_on = todayStr;
              updateData.added_by = 'AI';
              updateData.added_on = todayStr;
            }
            queueWrite('updateAgreement', updateData);
            aiUpdatedAgreementIds.add(aa.id);
            agreementsChanged = true;
          }
        }
      }
    });
  }
  sessionStorage.setItem('acm_ai_updated_agreements', JSON.stringify(Array.from(aiUpdatedAgreementIds)));
  if (agreementsChanged) renderAgreements();

  // Track matched activities for the "New info!" badge
  if (pendingProposals.matched_activities) {
    pendingProposals.matched_activities.forEach(id => aiUpdatedIds.add(id));
  }

  // Merge with existing session data and save
  try {
    const existing = JSON.parse(sessionStorage.getItem('acm_ai_updated_activities') || '[]');
    existing.forEach(id => aiUpdatedIds.add(id));
  } catch (e) { /* ignore */ }
  sessionStorage.setItem('acm_ai_updated_activities', JSON.stringify(Array.from(aiUpdatedIds)));

  // Update each processed entry with summary and mark as processed
  if (pendingProposals.entry_summaries) {
    pendingProposals.entry_summaries.forEach(es => {
      const entry = state.transcripts.find(t => t.id === es.id);
      if (entry) {
        entry.summary = es.summary || '';
        entry.activity_id = es.activity_id || '';
        entry.processed = true;
        queueWrite('updateTranscript', {
          id: es.id,
          summary: es.summary || '',
          activity_id: es.activity_id || '',
          processed: true
        });
      }
    });
  } else {
    // Fallback: mark all as processed with overall summary
    pendingEntryIds.forEach(id => {
      const entry = state.transcripts.find(t => t.id === id);
      if (entry) {
        entry.summary = pendingProposals.summary || '';
        entry.processed = true;
        queueWrite('updateTranscript', {
          id: id,
          summary: pendingProposals.summary || '',
          processed: true
        });
      }
    });
  }

  pendingProposals = null;
  pendingEntryIds = null;

  closeModal('reviewModal');
  saveToLocalCache();
  renderAll();
  attachExpandedEvents();
}

function cancelReview() {
  pendingProposals = null;
  pendingEntryIds = null;
  closeModal('reviewModal');
}

// ---- Latest Modal ----

function openLatestModal() {
  const body = document.getElementById('latestModalBody');

  // Last 5 completed todos (sorted by completed_at descending)
  const completedTodos = state.todos
    .filter(t => isTodoDone(t) && t.completed_at)
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 5);

  // Last 5 answered questions (sorted by answered_at descending)
  const answeredQuestions = state.questions
    .filter(q => isQuestionAnswered(q) && q.answered_at)
    .sort((a, b) => (b.answered_at || '').localeCompare(a.answered_at || ''))
    .slice(0, 5);

  // Last 5 agreements (sorted by added_on descending)
  const recentAgreements = state.agreements
    .filter(a => a.active !== false && a.active !== 'FALSE' && a.agreement && a.added_on)
    .sort((a, b) => (b.added_on || '').localeCompare(a.added_on || ''))
    .slice(0, 5);

  let html = '';

  // Completed Todos section
  html += '<h3 class="latest-section-title">Recently Completed To-dos</h3>';
  if (completedTodos.length === 0) {
    html += '<p class="latest-empty">No completed to-dos yet.</p>';
  } else {
    completedTodos.forEach(t => {
      const act = getActivity(t.activity_id);
      const actTitle = act ? act.title : t.activity_id;
      html += `<div class="latest-item">
        <div class="latest-item-text">${escapeHtml(t.text)}</div>
        <div class="latest-item-meta">${escapeHtml(actTitle)} &middot; ${formatDate(t.completed_at)}</div>
      </div>`;
    });
  }

  // Answered Questions section
  html += '<h3 class="latest-section-title">Recently Answered Questions</h3>';
  if (answeredQuestions.length === 0) {
    html += '<p class="latest-empty">No answered questions yet.</p>';
  } else {
    answeredQuestions.forEach(q => {
      const act = getActivity(q.activity_id);
      const actTitle = act ? act.title : q.activity_id;
      html += `<div class="latest-item">
        <div class="latest-item-text">${escapeHtml(q.question_text)}</div>
        <div class="latest-item-answer">${escapeHtml(truncate(q.answer, 120))}</div>
        <div class="latest-item-meta">${escapeHtml(actTitle)} &middot; ${formatDate(q.answered_at)}</div>
      </div>`;
    });
  }

  // Recent Agreements section
  html += '<h3 class="latest-section-title">Recent Agreements</h3>';
  if (recentAgreements.length === 0) {
    html += '<p class="latest-empty">No agreements yet.</p>';
  } else {
    recentAgreements.forEach(ag => {
      const type = (ag.internal === true || ag.internal === 'TRUE') ? 'Internal' : 'External';
      html += `<div class="latest-item">
        <div class="latest-item-text">${escapeHtml(ag.question_agreed || '(no question)')}</div>
        <div class="latest-item-answer">${escapeHtml(truncate(ag.agreement, 120))}</div>
        <div class="latest-item-meta">${type} &middot; ${escapeHtml(ag.added_on || 'no date')}</div>
      </div>`;
    });
  }

  body.innerHTML = html;
  document.getElementById('latestModal').style.display = 'flex';
}

// ---- Insights ----

let _pendingInsight = null;

function openInsightsModal() {
  _pendingInsight = null;
  const body = document.getElementById('insightsModalBody');
  const footer = document.getElementById('insightsModalFooter');

  let html = '<div class="insights-tabs">' +
    '<button class="insights-tab active" data-tab="generate" onclick="switchInsightsTab(\'generate\')">Generate Insight</button>' +
    '<button class="insights-tab" data-tab="history" onclick="switchInsightsTab(\'history\')">History (' + state.insights.length + ')</button>' +
    '</div>';

  html += '<div class="insights-tab-content" id="insightsTabGenerate">' +
    '<div class="insights-generate-intro"><p>Generate an AI-powered health assessment of your project, focused on alignment between actual project work and the Statement of Work.</p></div>' +
    '<div id="insightsResult"></div>' +
    '</div>';

  html += '<div class="insights-tab-content" id="insightsTabHistory" style="display:none;">' +
    renderInsightsHistory() +
    '</div>';

  body.innerHTML = html;

  footer.innerHTML = '<span id="insightsStatus" style="font-size:0.8rem;color:var(--text-light);"></span>' +
    '<div style="display:flex;gap:0.5rem;">' +
    '<button class="btn-primary btn-insights-generate" id="generateInsightBtn" onclick="generateInsight()">Generate New Insight</button>' +
    '<button class="btn-primary btn-success" id="logInsightBtn" onclick="logInsight()" style="display:none;">Log This Insight</button>' +
    '</div>';

  document.getElementById('insightsModal').style.display = 'flex';
}

function switchInsightsTab(tab) {
  document.querySelectorAll('.insights-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('insightsTabGenerate').style.display = tab === 'generate' ? '' : 'none';
  document.getElementById('insightsTabHistory').style.display = tab === 'history' ? '' : 'none';
}

async function generateInsight() {
  if (!CONFIG.API_URL) { alert('No API URL configured.'); return; }

  const btn = document.getElementById('generateInsightBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  const resultDiv = document.getElementById('insightsResult');
  resultDiv.innerHTML = '<div class="insights-loading"><div class="loading-spinner"></div>' +
    '<p>Analyzing project data with Claude AI...</p>' +
    '<p style="font-size:0.8rem;color:var(--text-light);">This may take 30\u201360 seconds.</p></div>';

  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'generateInsights', data: {} }),
      redirect: 'follow'
    });
    const result = await resp.json();

    if (result.error) {
      resultDiv.innerHTML = '<p style="color:var(--danger);padding:1rem;">' + escapeHtml(result.error) + '</p>';
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    _pendingInsight = result.insight;
    _pendingInsight._prompt_source = result.prompt_source;

    resultDiv.innerHTML = renderInsightDetail(result.insight);
    document.getElementById('logInsightBtn').style.display = '';
  } catch (e) {
    resultDiv.innerHTML = '<p style="color:var(--danger);padding:1rem;">Generation failed: ' + escapeHtml(e.message) + '</p>';
  }

  btn.textContent = originalText;
  btn.disabled = false;
}

function logInsight() {
  if (!_pendingInsight) return;
  const now = new Date();
  const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const entry = {
    id: generateId('INS'),
    created_at: createdAt,
    health_score: _pendingInsight.health_score || 0,
    executive_summary: _pendingInsight.executive_summary || '',
    full_response: JSON.stringify(_pendingInsight),
    prompt_version: _pendingInsight._prompt_source || 'unknown'
  };

  state.insights.unshift(entry);
  queueWrite('addInsight', entry);
  saveToLocalCache();

  document.getElementById('logInsightBtn').style.display = 'none';
  document.getElementById('insightsStatus').textContent = 'Insight logged!';
  const historyTab = document.querySelector('.insights-tab[data-tab="history"]');
  if (historyTab) historyTab.textContent = 'History (' + state.insights.length + ')';
  const historyContent = document.getElementById('insightsTabHistory');
  if (historyContent) historyContent.innerHTML = renderInsightsHistory();
  _pendingInsight = null;
}

function renderInsightDetail(insight) {
  const score = insight.health_score || 0;
  const scoreClass = score >= 70 ? 'score-good' : score >= 40 ? 'score-warning' : 'score-critical';
  const scoreLabel = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';

  let html = '<div class="insight-detail">';

  // Health Score
  html += '<div class="insight-score-row"><div class="insight-score-badge ' + scoreClass + '">' +
    '<span class="insight-score-number">' + score + '</span>' +
    '<span class="insight-score-label">' + scoreLabel + '</span></div></div>';

  // Executive Summary
  html += '<div class="insight-section"><h4 class="insight-section-title">Executive Summary</h4>' +
    '<p class="insight-section-text">' + escapeHtml(insight.executive_summary || '') + '</p></div>';

  // SOW Alignment
  if (insight.sow_alignment) {
    const sa = insight.sow_alignment;
    const coherenceClass = 'sow-coherence-' + (sa.overall_coherence || 'medium').toLowerCase();
    html += '<div class="insight-section"><h4 class="insight-section-title">SOW Alignment</h4>';
    html += '<span class="insight-sow-coherence ' + coherenceClass + '">' + escapeHtml(sa.overall_coherence || '') + ' Coherence</span>';
    html += '<p class="insight-section-text">' + escapeHtml(sa.summary || '') + '</p>';

    if (sa.out_of_scope && sa.out_of_scope.length > 0) {
      html += '<h4 class="insight-section-title" style="margin-top:0.75rem;color:#dc2626;">Out of Scope</h4>';
      sa.out_of_scope.forEach(function(item) {
        html += '<div class="insight-sow-item"><strong>' + escapeHtml(item.item || '') + '</strong>' +
          '<div class="sow-concern">' + escapeHtml(item.concern || '') + '</div></div>';
      });
    }

    if (sa.unaddressed_commitments && sa.unaddressed_commitments.length > 0) {
      html += '<h4 class="insight-section-title" style="margin-top:0.75rem;color:#d97706;">Unaddressed SOW Commitments</h4>';
      sa.unaddressed_commitments.forEach(function(item) {
        html += '<div class="insight-sow-item"><strong>' + escapeHtml(item.sow_commitment || '') + '</strong>' +
          '<div class="sow-concern">' + escapeHtml(item.recommendation || '') + '</div></div>';
      });
    }
    html += '</div>';
  }

  // Risk Areas
  if (insight.risk_areas && insight.risk_areas.length > 0) {
    html += '<div class="insight-section"><h4 class="insight-section-title">Risk Areas</h4><ul class="insight-list">';
    insight.risk_areas.forEach(function(r) {
      const sevClass = 'risk-' + (r.severity || 'medium').toLowerCase();
      html += '<li class="' + sevClass + '"><strong>' + escapeHtml(r.area || '') +
        '<span class="insight-risk-severity">' + escapeHtml(r.severity || '') + '</span></strong>' +
        '<p>' + escapeHtml(r.description || '') + '</p></li>';
    });
    html += '</ul></div>';
  }

  // Recommendations
  if (insight.recommendations && insight.recommendations.length > 0) {
    html += '<div class="insight-section"><h4 class="insight-section-title">Recommendations</h4><ol class="insight-list">';
    insight.recommendations.forEach(function(r) {
      html += '<li><strong>' + escapeHtml(r.action || '') +
        '<span class="insight-priority">' + escapeHtml(r.priority || '') + '</span></strong>' +
        '<p>' + escapeHtml(r.rationale || '') + '</p></li>';
    });
    html += '</ol></div>';
  }

  // PDCA Analysis
  if (insight.pdca_analysis) {
    html += '<div class="insight-section"><h4 class="insight-section-title">PDCA Phase Analysis</h4><div class="insight-pdca-grid">';
    Object.keys(insight.pdca_analysis).forEach(function(phase) {
      const analysis = insight.pdca_analysis[phase];
      html += '<div class="insight-pdca-card"><div class="insight-pdca-phase">' + escapeHtml(phase) + '</div>' +
        '<div class="insight-pdca-status">' + escapeHtml(analysis.status || '') + '</div>' +
        '<p>' + escapeHtml(analysis.summary || '') + '</p></div>';
    });
    html += '</div></div>';
  }

  // Stakeholder Engagement
  if (insight.stakeholder_engagement) {
    html += '<div class="insight-section"><h4 class="insight-section-title">Stakeholder Engagement</h4>' +
      '<p class="insight-section-text">' + escapeHtml(insight.stakeholder_engagement.summary || '') + '</p>';
    if (insight.stakeholder_engagement.gaps && insight.stakeholder_engagement.gaps.length > 0) {
      html += '<ul class="insight-list">';
      insight.stakeholder_engagement.gaps.forEach(function(g) {
        html += '<li>' + escapeHtml(g) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div>';
  }

  // Focus Areas
  if (insight.focus_areas && insight.focus_areas.length > 0) {
    html += '<div class="insight-section"><h4 class="insight-section-title">Focus Areas for Next Period</h4><ul class="insight-list">';
    insight.focus_areas.forEach(function(f) {
      html += '<li>' + escapeHtml(f) + '</li>';
    });
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

function renderInsightsHistory() {
  if (state.insights.length === 0) {
    return '<p class="insights-empty">No insights logged yet. Generate your first insight!</p>';
  }

  const sorted = [...state.insights].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  let html = '<div class="insights-history-list">';

  sorted.forEach(function(entry) {
    const score = parseInt(entry.health_score) || 0;
    const scoreClass = score >= 70 ? 'score-good' : score >= 40 ? 'score-warning' : 'score-critical';
    const dateStr = entry.created_at ? formatDate(entry.created_at.split(' ')[0]) : 'Unknown date';

    html += '<div class="insights-history-card" onclick="toggleInsightHistory(\'' + entry.id + '\')">' +
      '<div class="insights-history-header">' +
      '<div class="insight-score-badge-small ' + scoreClass + '">' + score + '</div>' +
      '<div class="insights-history-meta">' +
      '<span class="insights-history-date">' + dateStr + '</span>' +
      '<span class="insights-history-summary">' + escapeHtml(truncate(entry.executive_summary, 100)) + '</span>' +
      '</div>' +
      '<span class="insights-history-chevron" id="chevron_' + entry.id + '">&#9654;</span>' +
      '</div>' +
      '<div class="insights-history-detail" id="detail_' + entry.id + '" style="display:none;">' +
      renderInsightDetailFromEntry(entry) +
      '</div></div>';
  });

  html += '</div>';
  return html;
}

function toggleInsightHistory(id) {
  const detail = document.getElementById('detail_' + id);
  const chevron = document.getElementById('chevron_' + id);
  if (detail.style.display === 'none') {
    detail.style.display = '';
    chevron.innerHTML = '&#9660;';
  } else {
    detail.style.display = 'none';
    chevron.innerHTML = '&#9654;';
  }
}

function renderInsightDetailFromEntry(entry) {
  try {
    const insight = JSON.parse(entry.full_response);
    return renderInsightDetail(insight);
  } catch (e) {
    return '<p class="insight-section-text">' + escapeHtml(entry.executive_summary || 'No detail available.') + '</p>';
  }
}

// ---- Project Notes ----

function openNotesModal() {
  const body = document.getElementById('notesModalBody');
  body.innerHTML = renderProjectNotes();
  document.getElementById('notesModal').style.display = 'flex';
}

function renderProjectNotes() {
  if (state.projectNotes.length === 0) {
    return '<p class="project-notes-empty">No project notes yet. Add your first note!</p>';
  }

  const sorted = [...state.projectNotes].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  let html = '<div class="project-notes-list">';

  sorted.forEach(function(note) {
    const dateStr = note.created_at ? formatDate(note.created_at.split(' ')[0]) : '';
    const updatedStr = note.updated_at && note.updated_at !== note.created_at ? ' (edited)' : '';
    html += '<div class="project-note-card">' +
      '<textarea class="project-note-textarea" data-note-id="' + note.id + '" onblur="saveProjectNote(\'' + note.id + '\', this)">' +
      escapeHtml(note.content || '') + '</textarea>' +
      '<div class="project-note-meta"><span>' + dateStr + updatedStr + '</span>' +
      '<button class="project-note-delete" onclick="deleteProjectNote(\'' + note.id + '\')" title="Delete note">&times; Delete</button>' +
      '</div></div>';
  });

  html += '</div>';
  return html;
}

function addProjectNote() {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const note = {
    id: generateId('PN'),
    content: '',
    created_at: now,
    updated_at: now
  };
  state.projectNotes.unshift(note);
  queueWrite('addProjectNote', note);
  saveToLocalCache();

  const body = document.getElementById('notesModalBody');
  body.innerHTML = renderProjectNotes();
  // Focus the new textarea
  const firstTextarea = body.querySelector('.project-note-textarea');
  if (firstTextarea) firstTextarea.focus();
}

function deleteProjectNote(id) {
  state.projectNotes = state.projectNotes.filter(n => n.id !== id);
  queueWrite('deleteProjectNote', { id: id });
  saveToLocalCache();
  const body = document.getElementById('notesModalBody');
  body.innerHTML = renderProjectNotes();
}

function saveProjectNote(id, textarea) {
  const content = textarea.value;
  const note = state.projectNotes.find(n => n.id === id);
  if (!note || note.content === content) return;
  note.content = content;
  note.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  queueWrite('updateProjectNote', { id: id, content: content, updated_at: note.updated_at });
  saveToLocalCache();
}

// ---- Chat ----

const CHAT_EXAMPLE_QUESTIONS = [
  { phase: 'Plan I: Diagnosis', text: 'Based on the sponsorship assessment and stakeholder map so far, which stakeholder groups have the highest impact but the weakest engagement, and what should I prioritise before moving into strategy design?' },
  { phase: 'Plan I: Diagnosis', text: 'Looking at the resistance risk profile and change history data collected, what patterns suggest the biggest adoption risks for this project, and are there any gaps in my diagnosis I should address before designing interventions?' },
  { phase: 'Plan II: Design + Activate Champions', text: 'Given the measurement framework and resistance management approach I\'ve designed, are there any misalignments between my planned interventions and what the SOW commits to delivering?' },
  { phase: 'Plan II: Design + Activate Champions', text: 'Based on the champions network setup and governance integration progress, what dependencies or blockers should I resolve before we move into live deployment?' },
  { phase: 'Do: Deployment', text: 'Based on the early adoption telemetry and support ticket data, which user segments are falling behind on adoption and what targeted interventions should I prioritise this week?' },
  { phase: 'Do: Deployment', text: 'Looking at the communication sequence execution and training completion so far, are there any gaps between what we planned and what we\'ve actually delivered that could undermine adoption?' },
  { phase: 'Check: Analysis', text: 'Based on the adoption trajectory data and champion network health assessment, which areas of the programme are on track for sustainment and which need reinforcement before handover?' },
  { phase: 'Check: Analysis', text: 'Looking across all agreements, open questions, and milestone status, what are the top systemic barriers that need to be escalated to the steering committee?' },
  { phase: 'Act: Handover, Anchor & Learn', text: 'Comparing the initial resistance profile against current adoption data, what resistance areas were successfully mitigated and which persist, and what does this mean for the knowledge transfer plan?' },
  { phase: 'Act: Handover, Anchor & Learn', text: 'Based on all project data and the SOW commitments, what are the key lessons learned and recommendations I should include in the ACM retrospective document?' }
];

let _pendingChatAnswer = null;

function openChatModal() {
  _pendingChatAnswer = null;
  const body = document.getElementById('chatModalBody');
  const footer = document.getElementById('chatModalFooter');

  let html = '<div class="chat-tabs">' +
    '<button class="chat-tab active" data-tab="ask" onclick="switchChatTab(\'ask\')">Ask a Question</button>' +
    '<button class="chat-tab" data-tab="history" onclick="switchChatTab(\'history\')">History (' + state.chatLog.length + ')</button>' +
    '</div>';

  // Ask tab
  html += '<div class="chat-tab-content" id="chatTabAsk">';
  html += '<div class="chat-input-section">' +
    '<textarea id="chatQuestionInput" class="chat-textarea" rows="3" placeholder="Ask anything about your project..."></textarea>' +
    '<div class="chat-input-actions">' +
    '<span id="chatStatus" style="font-size:0.8rem;color:var(--text-light);"></span>' +
    '<div style="display:flex;gap:0.5rem;">' +
    '<button class="btn-primary btn-chat-send" id="sendChatBtn" onclick="sendChatQuestion()">Send</button>' +
    '<button class="btn-primary btn-success" id="logChatBtn" onclick="logChatEntry()" style="display:none;">Log to History</button>' +
    '</div></div></div>';

  // Example question chips grouped by phase with subheadings
  html += '<div class="chat-examples">';
  html += '<p class="chat-examples-label">Example questions:</p>';
  var currentPhase = '';
  CHAT_EXAMPLE_QUESTIONS.forEach(function(eq, i) {
    if (eq.phase !== currentPhase) {
      if (currentPhase) html += '</div></div>'; // close previous chips-container + group
      currentPhase = eq.phase;
      html += '<div class="chat-phase-group">';
      html += '<p class="chat-phase-heading">' + escapeHtml(eq.phase) + '</p>';
      html += '<div class="chat-chips-container">';
    }
    html += '<button class="chat-chip" onclick="selectChatExample(' + i + ')">' +
      escapeHtml(eq.text) +
      '</button>';
  });
  if (currentPhase) html += '</div></div>'; // close last chips-container + group
  html += '</div>';

  html += '<div id="chatResult"></div>';
  html += '</div>';

  // History tab
  html += '<div class="chat-tab-content" id="chatTabHistory" style="display:none;">' +
    renderChatHistory() +
    '</div>';

  body.innerHTML = html;

  footer.style.display = 'none';

  document.getElementById('chatModal').style.display = 'flex';

  setTimeout(function() {
    var ta = document.getElementById('chatQuestionInput');
    if (ta) ta.focus();
  }, 100);
}

function switchChatTab(tab) {
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('chatTabAsk').style.display = tab === 'ask' ? '' : 'none';
  document.getElementById('chatTabHistory').style.display = tab === 'history' ? '' : 'none';
}

function selectChatExample(index) {
  var textarea = document.getElementById('chatQuestionInput');
  if (textarea) {
    textarea.value = CHAT_EXAMPLE_QUESTIONS[index].text;
    textarea.focus();
  }
}

async function sendChatQuestion() {
  if (!CONFIG.API_URL) { alert('No API URL configured.'); return; }

  var textarea = document.getElementById('chatQuestionInput');
  var question = textarea ? textarea.value.trim() : '';
  if (!question) { alert('Please enter a question.'); return; }

  const btn = document.getElementById('sendChatBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Thinking...';
  btn.disabled = true;

  const resultDiv = document.getElementById('chatResult');
  resultDiv.innerHTML = '<div class="chat-loading"><div class="loading-spinner"></div>' +
    '<p>Analyzing project data and thinking...</p>' +
    '<p style="font-size:0.8rem;color:var(--text-light);">This may take 30\u201360 seconds.</p></div>';

  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'handleChatQuestion', data: { question: question } }),
      redirect: 'follow'
    });
    const result = await resp.json();

    if (result.error) {
      resultDiv.innerHTML = '<p style="color:var(--danger);padding:1rem;">' + escapeHtml(result.error) + '</p>';
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    _pendingChatAnswer = {
      question: question,
      answer: result.answer,
      prompt_source: result.prompt_source
    };

    resultDiv.innerHTML = renderChatAnswer(result.answer);
    document.getElementById('logChatBtn').style.display = '';
  } catch (e) {
    resultDiv.innerHTML = '<p style="color:var(--danger);padding:1rem;">Chat failed: ' + escapeHtml(e.message) + '</p>';
  }

  btn.textContent = originalText;
  btn.disabled = false;
}

function renderChatAnswer(text) {
  var html = '<div class="chat-answer">';
  var paragraphs = text.split('\n\n');
  paragraphs.forEach(function(para) {
    para = para.trim();
    if (!para) return;
    var lines = para.split('\n');
    var isBulletList = lines.every(function(l) { return /^[\-\*\u2022]\s/.test(l.trim()) || !l.trim(); });
    if (isBulletList && lines.length > 1) {
      html += '<ul>';
      lines.forEach(function(l) {
        l = l.trim().replace(/^[\-\*\u2022]\s*/, '');
        if (l) html += '<li>' + escapeHtml(l) + '</li>';
      });
      html += '</ul>';
    } else {
      var isNumbered = lines.every(function(l) { return /^\d+[\.\)]\s/.test(l.trim()) || !l.trim(); });
      if (isNumbered && lines.length > 1) {
        html += '<ol>';
        lines.forEach(function(l) {
          l = l.trim().replace(/^\d+[\.\)]\s*/, '');
          if (l) html += '<li>' + escapeHtml(l) + '</li>';
        });
        html += '</ol>';
      } else {
        html += '<p>' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
      }
    }
  });
  html += '</div>';
  return html;
}

function logChatEntry() {
  if (!_pendingChatAnswer) return;
  const now = new Date();
  const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');

  var phaseContext = '';
  var phases = getPhases();
  if (phases.length > 0) phaseContext = phases[0];

  const entry = {
    id: generateId('CL'),
    question: _pendingChatAnswer.question,
    answer: _pendingChatAnswer.answer,
    phase_context: phaseContext,
    created_at: createdAt
  };

  state.chatLog.unshift(entry);
  queueWrite('addChatEntry', entry);
  saveToLocalCache();

  document.getElementById('logChatBtn').style.display = 'none';
  document.getElementById('chatStatus').textContent = 'Logged to history!';
  const historyTab = document.querySelector('.chat-tab[data-tab="history"]');
  if (historyTab) historyTab.textContent = 'History (' + state.chatLog.length + ')';
  const historyContent = document.getElementById('chatTabHistory');
  if (historyContent) historyContent.innerHTML = renderChatHistory();
  _pendingChatAnswer = null;
}

function renderChatHistory() {
  if (state.chatLog.length === 0) {
    return '<p class="chat-empty">No chat history yet. Ask your first question!</p>';
  }

  const sorted = [...state.chatLog].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  let html = '<div class="chat-history-list">';

  sorted.forEach(function(entry) {
    const dateStr = entry.created_at ? formatDate(entry.created_at.split(' ')[0]) : 'Unknown date';
    const phaseLabel = entry.phase_context ? ' \u2014 ' + escapeHtml(entry.phase_context) : '';

    html += '<div class="chat-history-card" onclick="toggleChatHistory(\'' + entry.id + '\')">' +
      '<div class="chat-history-header">' +
      '<div class="chat-history-meta">' +
      '<span class="chat-history-date">' + dateStr + phaseLabel + '</span>' +
      '<span class="chat-history-question">' + escapeHtml(truncate(entry.question, 120)) + '</span>' +
      '</div>' +
      '<span class="chat-history-chevron" id="chatChevron_' + entry.id + '">&#9654;</span>' +
      '</div>' +
      '<div class="chat-history-detail" id="chatDetail_' + entry.id + '" style="display:none;">' +
      '<div class="chat-history-q"><strong>Q:</strong> ' + escapeHtml(entry.question) + '</div>' +
      renderChatAnswer(entry.answer || '') +
      '</div></div>';
  });

  html += '</div>';
  return html;
}

function toggleChatHistory(id) {
  const detail = document.getElementById('chatDetail_' + id);
  const chevron = document.getElementById('chatChevron_' + id);
  if (detail.style.display === 'none') {
    detail.style.display = '';
    chevron.innerHTML = '&#9660;';
  } else {
    detail.style.display = 'none';
    chevron.innerHTML = '&#9654;';
  }
}

// ---- Template Changes Modal ----

function openTemplateChangesModal() {
  const pending = state.templateChanges.filter(tc => tc.status === 'pending');
  const body = document.getElementById('templateChangesModalBody');
  const actions = document.getElementById('templateChangesModalActions');

  if (pending.length === 0) {
    body.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem 0;">No pending template changes.</p>';
    actions.innerHTML = '<button class="btn-small" onclick="closeModal(\'templateChangesModal\')">Close</button>';
    document.getElementById('templateChangesModal').style.display = 'flex';
    return;
  }

  // Group by item_type
  const groups = {};
  pending.forEach(tc => {
    if (!groups[tc.item_type]) groups[tc.item_type] = [];
    groups[tc.item_type].push(tc);
  });

  let html = `<div class="tc-select-all">
    <label class="review-checkbox"><input type="checkbox" id="tcSelectAll" checked onchange="toggleAllTemplateChanges(this.checked)"> Select all (${pending.length})</label>
  </div>`;

  for (const [type, changes] of Object.entries(groups)) {
    html += `<div class="tc-group-header">${escapeHtml(type)}</div>`;
    changes.forEach(tc => {
      const badgeClass = tc.change_type === 'add' ? 'tc-add' : tc.change_type === 'delete' ? 'tc-delete' : 'tc-edit';
      const desc = tc.description || tc.field || tc.item_id;
      html += `<div class="tc-item">
        <label class="review-checkbox">
          <input type="checkbox" class="tc-checkbox" data-tc-id="${tc.id}" checked>
          <div class="tc-item-content">
            <div class="tc-item-header">
              <span class="tc-type-badge ${badgeClass}">${escapeHtml(tc.change_type)}</span>
              <span class="tc-item-desc">${escapeHtml(desc)}</span>
            </div>`;
      if (tc.change_type === 'edit' && tc.field) {
        html += `<div class="tc-item-diff">
              <strong>${escapeHtml(tc.field)}:</strong>
              <span class="tc-old-value">${escapeHtml(truncate(tc.old_value, 80))}</span>
              <span class="tc-arrow">&rarr;</span>
              <span class="tc-new-value">${escapeHtml(truncate(tc.new_value, 80))}</span>
            </div>`;
      }
      html += `</div></label></div>`;
    });
  }

  body.innerHTML = html;
  actions.innerHTML = `
    <button class="btn-small" onclick="dismissSelectedTemplateChanges()">Dismiss Selected</button>
    <button class="btn-primary" onclick="applySelectedTemplateChanges()">Apply to Template</button>`;

  document.getElementById('templateChangesModal').style.display = 'flex';
}

function toggleAllTemplateChanges(checked) {
  document.querySelectorAll('.tc-checkbox').forEach(cb => { cb.checked = checked; });
}

function getSelectedTemplateChangeIds() {
  return Array.from(document.querySelectorAll('.tc-checkbox:checked')).map(cb => cb.dataset.tcId);
}

function dismissSelectedTemplateChanges() {
  const ids = getSelectedTemplateChangeIds();
  if (ids.length === 0) { alert('No changes selected.'); return; }
  if (!confirm('Dismiss ' + ids.length + ' selected change(s)? They will no longer appear in this list.')) return;

  ids.forEach(id => {
    const tc = state.templateChanges.find(t => t.id === id);
    if (tc) {
      tc.status = 'dismissed';
      queueWrite('updateTemplateChange', { id: tc.id, status: 'dismissed' });
    }
  });

  renderNav();
  // Re-render or close modal
  const remaining = state.templateChanges.filter(tc => tc.status === 'pending');
  if (remaining.length === 0) {
    closeModal('templateChangesModal');
  } else {
    openTemplateChangesModal();
  }
}

async function applySelectedTemplateChanges() {
  const ids = getSelectedTemplateChangeIds();
  if (ids.length === 0) { alert('No changes selected.'); return; }

  const templateId = state.config.template_sheet_id;
  if (!templateId) {
    alert('Template Sheet ID not configured. Set it in Project Settings.');
    return;
  }

  if (!confirm('Apply ' + ids.length + ' selected change(s) to the template sheet?')) return;

  // Flush any pending writes first
  await flushWrites();

  const selectedChanges = state.templateChanges.filter(tc => ids.includes(tc.id));

  showSync('saving');
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'applyTemplateChanges', data: { changes: selectedChanges } })
    });
    const result = await resp.json();
    if (result.error) {
      alert('Error: ' + result.error);
      showSync('error');
      return;
    }

    // Mark applied in local state
    ids.forEach(id => {
      const tc = state.templateChanges.find(t => t.id === id);
      if (tc) tc.status = 'applied';
    });

    renderNav();
    const successCount = (result.results || []).filter(r => r.success).length;
    const errorCount = (result.results || []).filter(r => r.error).length;
    let msg = successCount + ' change(s) applied to template.';
    if (errorCount > 0) msg += ' ' + errorCount + ' error(s) — check template sheet.';
    alert(msg);
    showSync('success');

    const remaining = state.templateChanges.filter(tc => tc.status === 'pending');
    if (remaining.length === 0) {
      closeModal('templateChangesModal');
    } else {
      openTemplateChangesModal();
    }
  } catch (e) {
    alert('Network error: ' + e.message);
    showSync('error');
  }
}

// ---- Reseed Template ----

async function reseedTemplate() {
  var templateId = state.config.template_sheet_id;
  if (!templateId) { alert('Template Sheet ID not configured. Set it in Project Settings.'); return; }
  if (!confirm('This will overwrite ALL data in the seed template with the default data. You will lose all customisations. Are you sure?')) return;

  var seedData = window.SEED_DATA || await fetch('seed-data.json').then(r => r.json());
  var payload = {
    activities: seedData.activities,
    todos: seedData.todos,
    questions: seedData.questions,
    agreements: seedData.agreements
  };

  showSync('saving');
  try {
    var resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'reseedTemplate', data: payload })
    });
    var result = await resp.json();
    if (result.error) { alert('Error: ' + result.error); showSync('error'); return; }

    // Dismiss all pending template changes since the template was reset
    state.templateChanges.filter(tc => tc.status === 'pending').forEach(tc => {
      tc.status = 'dismissed';
      queueWrite('updateTemplateChange', { id: tc.id, status: 'dismissed' });
    });
    renderNav();

    alert('Seed template has been reset to defaults.');
    showSync('success');
  } catch (e) {
    alert('Network error: ' + e.message);
    showSync('error');
  }
}

// ---- Prompt Editor ----

function openPromptEditor() {
  const prefixSelect = document.getElementById('promptPrefix');
  const versionSelect = document.getElementById('promptVersion');
  const textarea = document.getElementById('promptEditorContent');
  const status = document.getElementById('promptEditorStatus');

  // Extract unique prefixes from prompt keys (strip _v{N} suffix)
  const prefixes = [];
  state.prompts.forEach(p => {
    const match = String(p.key).match(/^(.+)_v\d+$/);
    if (match && !prefixes.includes(match[1])) prefixes.push(match[1]);
  });

  if (prefixes.length === 0) {
    prefixSelect.innerHTML = '<option value="">No prompts found</option>';
    versionSelect.innerHTML = '';
    textarea.value = '';
    status.textContent = 'No prompts in the Prompts sheet.';
    document.getElementById('promptEditorModal').style.display = 'flex';
    return;
  }

  prefixSelect.innerHTML = prefixes.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  selectPromptPrefix();
  document.getElementById('promptEditorModal').style.display = 'flex';
}

function selectPromptPrefix() {
  const prefix = document.getElementById('promptPrefix').value;
  const versionSelect = document.getElementById('promptVersion');
  if (!prefix) return;

  // Find all versions for this prefix, sorted descending
  const pattern = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_v(\\d+)$');
  const versions = [];
  state.prompts.forEach(p => {
    const match = String(p.key).match(pattern);
    if (match) versions.push({ key: p.key, version: parseInt(match[1], 10) });
  });
  versions.sort((a, b) => b.version - a.version);

  versionSelect.innerHTML = versions.map(v =>
    `<option value="${escapeHtml(v.key)}">v${v.version}${v === versions[0] ? ' (latest)' : ''}</option>`
  ).join('');

  selectPromptVersion();
}

function selectPromptVersion() {
  const key = document.getElementById('promptVersion').value;
  const textarea = document.getElementById('promptEditorContent');
  const status = document.getElementById('promptEditorStatus');

  const prompt = state.prompts.find(p => p.key === key);
  textarea.value = prompt ? prompt.value : '';
  status.textContent = key ? 'Editing: ' + key : '';

  // Show delete button only for v2+ (never allow deleting v1)
  const deleteBtn = document.getElementById('deletePromptBtn');
  const versionMatch = key.match(/_v(\d+)$/);
  const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
  deleteBtn.style.display = version > 1 ? '' : 'none';
}

async function savePrompt() {
  const key = document.getElementById('promptVersion').value;
  const value = document.getElementById('promptEditorContent').value;
  const status = document.getElementById('promptEditorStatus');

  if (!key) { alert('No prompt selected.'); return; }

  showSync('saving');
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updatePrompt', data: { key, value } })
    });
    const result = await resp.json();
    if (result.error) { alert('Error: ' + result.error); showSync('error'); return; }

    // Update local state
    const prompt = state.prompts.find(p => p.key === key);
    if (prompt) prompt.value = value;

    status.textContent = 'Saved: ' + key;
    showSync('success');
  } catch (e) {
    alert('Network error: ' + e.message);
    showSync('error');
  }
}

async function createNewPromptVersion() {
  const prefix = document.getElementById('promptPrefix').value;
  const value = document.getElementById('promptEditorContent').value;
  const status = document.getElementById('promptEditorStatus');

  if (!prefix) { alert('No prompt prefix selected.'); return; }

  // Find max version for this prefix
  const pattern = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_v(\\d+)$');
  let maxVersion = 0;
  state.prompts.forEach(p => {
    const match = String(p.key).match(pattern);
    if (match) maxVersion = Math.max(maxVersion, parseInt(match[1], 10));
  });

  const newKey = prefix + '_v' + (maxVersion + 1);
  if (!confirm('Create ' + newKey + ' with the current content?')) return;

  showSync('saving');
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addPrompt', data: { key: newKey, value } })
    });
    const result = await resp.json();
    if (result.error) { alert('Error: ' + result.error); showSync('error'); return; }

    // Add to local state
    state.prompts.push({ key: newKey, value });

    // Refresh dropdowns and select new version
    selectPromptPrefix();
    document.getElementById('promptVersion').value = newKey;
    selectPromptVersion();

    status.textContent = 'Created: ' + newKey;
    showSync('success');
  } catch (e) {
    alert('Network error: ' + e.message);
    showSync('error');
  }
}

async function deletePromptVersion() {
  const key = document.getElementById('promptVersion').value;
  if (!key) { alert('No prompt selected.'); return; }

  // Safety: never delete v1
  const versionMatch = key.match(/_v(\d+)$/);
  const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
  if (version <= 1) { alert('Cannot delete the base version (v1).'); return; }

  if (!confirm('Delete ' + key + '? This cannot be undone.')) return;

  showSync('saving');
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deletePrompt', data: { key } })
    });
    const result = await resp.json();
    if (result.error) { alert('Error: ' + result.error); showSync('error'); return; }

    // Remove from local state
    state.prompts = state.prompts.filter(p => p.key !== key);

    // Refresh dropdowns
    selectPromptPrefix();

    document.getElementById('promptEditorStatus').textContent = 'Deleted: ' + key;
    showSync('success');
  } catch (e) {
    alert('Network error: ' + e.message);
    showSync('error');
  }
}

// ---- Settings ----

function openSettings() {
  document.getElementById('cfgProjectName').value = state.config.project_name || '';
  document.getElementById('cfgClientName').value = state.config.client_name || '';
  document.getElementById('cfgConsultantName').value = state.config.consultant_name || '';
  document.getElementById('cfgStartDate').value = state.config.start_date || '';
  document.getElementById('cfgEndDate').value = state.config.end_date || '';
  document.getElementById('cfgDurationValue').value = state.config.total_duration_value || '';
  document.getElementById('cfgDurationUnit').value = state.config.duration_unit || 'hours';
  updateDurationHint();
  document.getElementById('cfgDurationUnit').addEventListener('change', updateDurationHint);
  document.getElementById('cfgApiUrl').value = CONFIG.API_URL || '';
  document.getElementById('cfgMasterSheetId').value = state.config.master_sheet_id || '';
  document.getElementById('cfgTemplateSheetId').value = state.config.template_sheet_id || '';
  const touchSel = document.getElementById('cfgAcmTouchLevel');
  touchSel.value = state.config.acm_touch_level || 'full';
  updateTouchLevelHint();
  touchSel.addEventListener('change', updateTouchLevelHint);
  document.getElementById('settingsModal').style.display = 'flex';
}

function updateDurationHint() {
  const hint = document.getElementById('durationHint');
  if (hint) hint.style.display = document.getElementById('cfgDurationUnit').value === 'days' ? 'block' : 'none';
}

async function saveSettings() {
  snapshotForUndo('Change settings');
  const newConfig = {
    project_name: document.getElementById('cfgProjectName').value.trim(),
    client_name: document.getElementById('cfgClientName').value.trim(),
    consultant_name: document.getElementById('cfgConsultantName').value.trim(),
    start_date: document.getElementById('cfgStartDate').value,
    end_date: document.getElementById('cfgEndDate').value,
    total_duration_value: document.getElementById('cfgDurationValue').value.trim(),
    duration_unit: document.getElementById('cfgDurationUnit').value,
    master_sheet_id: document.getElementById('cfgMasterSheetId').value.trim(),
    template_sheet_id: document.getElementById('cfgTemplateSheetId').value.trim(),
    acm_touch_level: document.getElementById('cfgAcmTouchLevel').value
  };

  Object.assign(state.config, newConfig);
  queueWrite('updateConfig', newConfig);

  // Config changes are critical — flush to API immediately, don't wait for debounce
  clearTimeout(debounceTimer);
  flushWrites();

  const apiUrl = document.getElementById('cfgApiUrl').value.trim();
  const apiUrlChanged = apiUrl !== CONFIG.API_URL;
  if (apiUrlChanged) {
    CONFIG.API_URL = apiUrl;
    localStorage.setItem('acm_api_url', apiUrl);

    // Sync API URL back to sessionStorage project and master sheet
    if (currentProject) {
      currentProject.api_url = apiUrl;
      sessionStorage.setItem('acm_current_project', JSON.stringify(currentProject));
      // Update master sheet project registry
      const masterUrl = localStorage.getItem(CONFIG.MASTER_URL_KEY);
      if (masterUrl) {
        fetch(masterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateProject', data: { id: currentProject.id, api_url: apiUrl } })
        }).catch(() => {}); // best-effort, don't block
      }
    }
  }

  closeModal('settingsModal');

  // If API URL changed, refetch all data from the new sheet
  if (apiUrlChanged && CONFIG.API_URL) {
    const loading = document.getElementById('loadingOverlay');
    loading.innerHTML = '<div class="loading-spinner"></div><p>Loading project data...</p>';
    loading.classList.remove('hidden');
    const ok = await fetchAll();
    loading.classList.add('hidden');
    if (!ok) {
      showSyncError();
    }
  }

  renderAll();
  attachExpandedEvents();
}

// ---- Project name / client name inline edit ----

function setupHeaderEditing() {
  const projectEl = document.getElementById('projectName');
  const clientEl = document.getElementById('clientName');

  projectEl.addEventListener('click', () => {
    const current = state.config.project_name || 'ACM Project';
    const newName = prompt('Project name:', current);
    if (newName !== null && newName.trim()) {
      snapshotForUndo('Rename project');
      state.config.project_name = newName.trim();
      queueWrite('updateConfig', { project_name: newName.trim() });
      updateProjectHeader();
    }
  });

  clientEl.addEventListener('click', () => {
    const current = state.config.client_name || '';
    const newName = prompt('Client name:', current);
    if (newName !== null) {
      snapshotForUndo('Rename client');
      state.config.client_name = newName.trim();
      queueWrite('updateConfig', { client_name: newName.trim() });
      updateProjectHeader();
    }
  });
}

// ---- Hub ↔ Sheet Config Sync ----

function syncHubConfigToSheet() {
  if (!currentProject) return;
  let configChanged = false;

  if (currentProject.name && currentProject.name !== state.config.project_name) {
    state.config.project_name = currentProject.name;
    configChanged = true;
  }
  if (currentProject.client_name && currentProject.client_name !== state.config.client_name) {
    state.config.client_name = currentProject.client_name;
    configChanged = true;
  }

  if (configChanged) {
    queueWrite('updateConfig', {
      project_name: state.config.project_name,
      client_name: state.config.client_name
    });
  }
}

async function resetProjectData() {
  if (!CONFIG.API_URL) {
    alert('No API URL configured. Set it in Settings first.');
    return;
  }
  if (!confirm('This will reset all activities, to-dos, and questions back to the standard template.\n\nYour project name and client name will be kept.\n\nContinue?')) {
    return;
  }

  const loading = document.getElementById('loadingOverlay');
  loading.innerHTML = '<div class="loading-spinner"></div><p>Resetting project data...</p>';
  loading.classList.remove('hidden');

  try {
    // Load seed data
    let seedData;
    try {
      const resp = await fetch('seed-data.json?v=' + Date.now());
      seedData = await resp.json();
    } catch {
      if (window.SEED_DATA) {
        seedData = window.SEED_DATA;
      } else {
        throw new Error('Could not load seed data template.');
      }
    }

    // Send seed to API
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'seedAll', data: seedData }),
      redirect: 'follow'
    });
    const result = await resp.json();
    if (result.error) throw new Error(result.error);

    // Refetch data from the now-seeded sheet
    await fetchAll();

    // Re-apply hub project name/client (seed may have overwritten config)
    syncHubConfigToSheet();

    loading.classList.add('hidden');
    renderAll();
    attachExpandedEvents();
    closeModal('settingsModal');

  } catch (e) {
    console.error('Reset failed:', e);
    loading.classList.add('hidden');
    alert('Failed to reset project data: ' + e.message);
  }
}

async function injectDummyData() {
  if (!CONFIG.API_URL) {
    alert('No API URL configured. Please set your API URL in Settings first.');
    return;
  }
  if (!confirm('This will replace all project data with a CuraNova Healthcare Group demo project.\n\nAll existing activities, to-dos, questions, and agreements will be overwritten.\nSOW and transcripts will be added.\n\nContinue?')) {
    return;
  }

  const loading = document.getElementById('loadingOverlay');
  loading.innerHTML = '<div class="loading-spinner"></div><p>Loading demo data\u2026</p>';
  loading.classList.remove('hidden');

  try {
    // 1. Load dummy data JSON
    let dummyData;
    try {
      const resp = await fetch('dummy-data.json?v=' + Date.now());
      dummyData = await resp.json();
    } catch {
      throw new Error('Could not load dummy-data.json. Make sure the file exists.');
    }

    // 2. Seed activities, todos, questions, agreements via seedAll (clears & replaces)
    loading.querySelector('p').textContent = 'Seeding activities and questions\u2026';
    const seedPayload = {
      activities: dummyData.activities,
      todos: dummyData.todos,
      questions: dummyData.questions,
      agreements: dummyData.agreements
    };
    if (dummyData.config) {
      // Preserve the user's master_sheet_id and template_sheet_id — never overwrite these
      const safeConfig = { ...dummyData.config };
      delete safeConfig.master_sheet_id;
      delete safeConfig.template_sheet_id;
      seedPayload.config = safeConfig;
    }

    const seedResp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'seedAll', data: seedPayload }),
      redirect: 'follow'
    });
    const seedResult = await seedResp.json();
    if (seedResult.error) throw new Error('Seed failed: ' + seedResult.error);

    // 3. Add SOW + transcripts via batchUpdate (these sheets aren't cleared by seedAll)
    loading.querySelector('p').textContent = 'Adding SOW and transcripts\u2026';
    const batchOps = [];
    if (dummyData.sow) {
      batchOps.push({ action: 'addSowEntry', data: dummyData.sow });
    }
    if (dummyData.transcripts) {
      dummyData.transcripts.forEach(t => batchOps.push({ action: 'addTranscriptEntry', data: t }));
    }
    if (batchOps.length > 0) {
      const batchResp = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'batchUpdate', data: batchOps }),
        redirect: 'follow'
      });
      const batchResult = await batchResp.json();
      if (batchResult.error) throw new Error('Batch failed: ' + batchResult.error);
    }

    // 4. Reload everything from the backend
    loading.querySelector('p').textContent = 'Loading demo dashboard\u2026';
    await fetchAll();

    loading.classList.add('hidden');
    renderAll();
    attachExpandedEvents();
    closeModal('settingsModal');

  } catch (e) {
    console.error('Demo data injection failed:', e);
    loading.classList.add('hidden');
    alert('Failed to inject demo data: ' + e.message);
  }
}

// ---- Initialization ----

async function init() {
  // Guard: if no project selected and no legacy API URL, redirect to hub
  if (!currentProject && !localStorage.getItem('acm_api_url')) {
    window.location.href = 'index.html';
    return;
  }

  const loading = document.getElementById('loadingOverlay');

  // Back to projects button
  const backBtn = document.getElementById('backToProjects');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('acm_current_project');
      window.location.href = 'index.html';
    });
  }

  // Undo button click
  document.getElementById('undoBtn').addEventListener('click', undo);

  // Ctrl+Z / Cmd+Z keyboard shortcut (only when not in a text field)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      undo();
    }
  });

  // Delegated event listeners on stable containers (registered once, not per-render)

  // Nav panel: delegate clicks for phase scroll-to and Raw Data button
  document.getElementById('navPanel').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-phase');
    if (btn) {
      const section = document.querySelector(`[data-phase-section="${btn.dataset.phase}"]`);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const rawDataBtn = e.target.closest('.nav-rawdata-btn');
    if (rawDataBtn) {
      const targetId = rawDataBtn.dataset.scrollTarget;
      const section = document.getElementById(targetId);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Raw Data Store: delegate clicks for transcript entries
  const rawDataStore = document.getElementById('rawDataStore');
  if (rawDataStore) {
    rawDataStore.addEventListener('click', (e) => {
      const target = e.target;

      // Delete transcript entry
      const deleteBtn = target.closest('.transcript-delete');
      if (deleteBtn) { e.stopPropagation(); deleteTranscript(deleteBtn.dataset.transcriptId); return; }

      // Click entry row to expand/collapse
      const entryRow = target.closest('.transcript-entry-row');
      if (entryRow && !target.closest('.transcript-delete')) {
        const entry = entryRow.closest('.transcript-entry');
        if (entry) toggleTranscriptExpand(entry.dataset.transcriptId);
        return;
      }
    });
  }

  // Status bar: delegate click for time entry button
  document.querySelector('.top-bar').addEventListener('click', (e) => {
    if (e.target.closest('#timeEntryBtn')) {
      e.stopPropagation();
      toggleTimeEntry();
    }
  });

  // Phases container: delegate clicks for cards, buttons, and controls
  const phasesContainer = document.getElementById('phasesContainer');
  phasesContainer.addEventListener('click', (e) => {
    const target = e.target;

    // Add activity button
    const addBtn = target.closest('.phase-add-btn');
    if (addBtn) { e.stopPropagation(); addNewActivity(addBtn.dataset.phase); return; }

    // Deprioritised toggle (via details/summary)
    const depriSummary = target.closest('.phase-depri-summary');
    if (depriSummary) {
      const phase = depriSummary.dataset.phase;
      if (!state.showInactive) state.showInactive = {};
      // Toggle will be handled by <details> natively, just track state
      const details = depriSummary.closest('details');
      if (details) {
        // details.open reflects state BEFORE the toggle, so invert
        state.showInactive[phase] = !details.open;
      }
      return;
    }

    // Move card buttons
    const moveBtn = target.closest('.card-move-btn');
    if (moveBtn) { e.stopPropagation(); moveCard(moveBtn.dataset.moveId, parseInt(moveBtn.dataset.moveDir)); return; }

    // Quick-complete checkbox on card
    const completeBtn = target.closest('.card-complete-btn');
    if (completeBtn) {
      e.stopPropagation();
      const actId = completeBtn.dataset.completeId;
      const act = getActivity(actId);
      if (act) {
        snapshotForUndo('Toggle activity complete');
        const newStatus = act.status === 'completed' ? 'not_started' : 'completed';
        act.status = newStatus;
        queueWrite('updateActivity', { id: actId, status: newStatus });
        checkPhaseAdvance();
        renderAll();
        attachExpandedEvents();
      }
      return;
    }

    // Log time button on meta cards
    const logBtn = target.closest('.card-log-time-btn');
    if (logBtn) { e.stopPropagation(); openTimeEntryForActivity(logBtn.dataset.logTimeId); return; }

    // Card click to expand (only collapsed cards)
    const card = target.closest('.activity-card');
    if (card && !card.classList.contains('expanded') && !target.closest('.card-move-btn') && !target.closest('.card-log-time-btn') && !target.closest('.card-complete-btn')) {
      expandActivity(card.dataset.activityId);
      return;
    }
  });

  // Phases container: delegate focusout for phase title rename
  phasesContainer.addEventListener('focusout', (e) => {
    const title = e.target.closest('.phase-title');
    if (title) {
      const oldPhase = title.dataset.phase;
      const newPhase = title.textContent.trim();
      if (newPhase && newPhase !== oldPhase) {
        renamePhase(oldPhase, newPhase);
      }
    }
  });

  // Phases container: delegate keydown for Enter on phase title
  phasesContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('.phase-title')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  // Setup global event listeners
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.querySelectorAll('.timeline-add').forEach(btn => {
    btn.addEventListener('click', () => openMilestoneModal(null, btn.dataset.timelineType));
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = searchInput.value.trim();
      searchClear.style.display = state.searchQuery ? 'block' : 'none';
      renderPhases();
      attachExpandedEvents();
    }, 200);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.style.display = 'none';
    renderPhases();
    attachExpandedEvents();
  });

  // Filter
  document.getElementById('filterStatus').addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    renderPhases();
    attachExpandedEvents();
  });

  // Modal close on overlay click (only when clicking the dark backdrop itself)
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });
  // Prevent clicks inside modal from reaching the overlay
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('mousedown', (e) => e.stopPropagation());
  });

  setupHeaderEditing();

  // Flush any pending writes before page unload (prevents data loss on refresh)
  window.addEventListener('beforeunload', () => {
    if (pendingWrites.length > 0 && CONFIG.API_URL) {
      const ops = pendingWrites.splice(0, pendingWrites.length);
      navigator.sendBeacon(CONFIG.API_URL, JSON.stringify({ action: 'batchUpdate', data: ops }));
    }
  });

  // Show cached data instantly while fetching fresh data
  const hasCached = loadFromLocalCache();
  if (hasCached && state.activities.length > 0) {
    syncHubConfigToSheet();
    loading.classList.add('hidden');
    renderAll();
    attachExpandedEvents();
    // Refresh from API in background (non-blocking)
    if (CONFIG.API_URL) {
      fetchAll().then(ok => {
        if (ok) { syncHubConfigToSheet(); renderAll(); attachExpandedEvents(); }
        else { showSyncError(); }
      });
    }
    return;
  }

  // No cache — must wait for fetch
  const loaded = await fetchAll();
  if (!loaded || state.activities.length === 0) {
    loading.innerHTML = `
      <div style="text-align:center;max-width:500px;padding:2rem;">
        <h2>Welcome to ACM Dashboard</h2>
        <p style="margin:1rem 0;color:var(--text-light);">No data found. To get started:</p>
        <ol style="text-align:left;margin:1rem 2rem;line-height:2;">
          <li>Set up your Google Sheet (see SETUP.md)</li>
          <li>Deploy the Apps Script</li>
          <li>Click Settings (gear icon) to enter the API URL</li>
          <li>Use seed.html to populate initial data</li>
        </ol>
        <p style="margin:1rem 0;color:var(--text-light);">Or if seed-data.json exists locally, reload the page.</p>
        <button class="btn-primary" onclick="openSettings();document.getElementById('loadingOverlay').classList.add('hidden');">Open Settings</button>
      </div>`;
    return;
  }

  syncHubConfigToSheet();
  loading.classList.add('hidden');
  renderAll();
  attachExpandedEvents();
}

// ---- ACM Touch Level Hint ----
function updateTouchLevelHint() {
  const hint = document.getElementById('touchLevelHint');
  if (!hint) return;
  const val = document.getElementById('cfgAcmTouchLevel').value;
  const hints = {
    full: 'Full Programme: comprehensive ACM engagement across all activities',
    medium: 'Medium Touch: core diagnosis, design, and deployment; reduced ancillary work',
    light: 'Light Touch: minimal ACM — typically a plan and/or training delivery'
  };
  hint.textContent = hints[val] || hints.full;
}

// ---- AI Configuration ----

// ---- AI Configuration Wizard (3-step) ----
let aiWizard = { step: 0, step1Data: null, step2Data: null, step3Data: null, prioritisedIds: [] };

function aiConfigLoadingHtml(msg) {
  return '<div class="ai-loading-scene">' +
    '<div class="ai-loading-cards">' +
      '<div class="ai-loading-card"></div><div class="ai-loading-card"></div>' +
      '<div class="ai-loading-card"></div><div class="ai-loading-card"></div><div class="ai-loading-card"></div>' +
    '</div>' +
    '<div class="ai-loading-sparks">' +
      '<div class="ai-loading-spark"></div><div class="ai-loading-spark"></div>' +
      '<div class="ai-loading-spark"></div><div class="ai-loading-spark"></div><div class="ai-loading-spark"></div>' +
    '</div>' +
    '<div class="ai-loading-brain">\uD83E\uDDE0</div>' +
  '</div>' +
  '<p style="font-size:1rem;font-weight:600;color:var(--text-on-dark);">' + escapeHtml(msg) + '</p>' +
  '<div class="ai-loading-progress">' +
    '<div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div>' +
  '</div>' +
  '<p style="font-size:0.8rem;color:rgba(241,245,249,0.6);margin-top:0.75rem;">This is a big deal \u2014 it may take a few minutes</p>';
}

function renderAiConfigStepper(currentStep) {
  const steps = [
    { num: 1, label: 'Prioritise', sub: 'Activities' },
    { num: 2, label: 'Refine', sub: 'Todos & Questions' },
    { num: 3, label: 'Tailor', sub: 'Wording' }
  ];
  return '<div class="ai-config-stepper">' + steps.map((s, i) => {
    let cls = 'ai-config-step';
    if (s.num < currentStep) cls += ' completed';
    else if (s.num === currentStep) cls += ' active';
    return '<div class="' + cls + '">' +
      '<div class="ai-config-step-circle">' + (s.num < currentStep ? '\u2713' : s.num) + '</div>' +
      '<div class="ai-config-step-label">' + s.label + '</div>' +
      '<div class="ai-config-step-sub">' + s.sub + '</div>' +
    '</div>' + (i < steps.length - 1 ? '<div class="ai-config-step-line' + (s.num < currentStep ? ' completed' : '') + '"></div>' : '');
  }).join('') + '</div>';
}

function updateAiConfigFooter(stepNum) {
  const footer = document.getElementById('aiConfigModalFooter');
  if (stepNum === 1) {
    footer.innerHTML = '<button class="btn-small" onclick="aiConfigSkipRemaining()">Apply & Close</button>' +
      '<button class="btn-primary" onclick="aiConfigNextStep()">Next: Refine \u2192</button>';
  } else if (stepNum === 2) {
    footer.innerHTML = '<button class="btn-small" onclick="aiConfigSkipRemaining()">Apply & Close</button>' +
      '<button class="btn-primary" onclick="aiConfigNextStep()">Next: Tailor \u2192</button>';
  } else {
    footer.innerHTML = '<button class="btn-small" onclick="closeModal(\'aiConfigModal\')">Cancel</button>' +
      '<button class="btn-primary" onclick="aiConfigFinish()">Apply & Close</button>';
  }
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid var(--border);';
}

async function startAiConfiguration() {
  if (!state.sow || state.sow.length === 0 || !state.sow[0].content) {
    alert('Please fill in the Statement of Work (SOW) first.');
    return;
  }
  if (!CONFIG.API_URL) {
    alert('No API URL configured. Please set your API URL in Settings first.');
    return;
  }

  // Reset wizard state
  aiWizard = { step: 1, step1Data: null, step2Data: null, step3Data: null, prioritisedIds: [] };

  // Show full-page loading for step 1
  const loading = document.getElementById('loadingOverlay');
  loading.innerHTML = aiConfigLoadingHtml('Step 1 of 3: Analysing activity priorities\u2026');
  loading.classList.remove('hidden');

  try {
    // Read touch level directly from the dropdown (not state.config, which may not be saved yet
    // because the "AI Configuration" button doesn't call saveSettings() first)
    const touchSelect = document.getElementById('cfgAcmTouchLevel');
    const touchLevel = touchSelect ? touchSelect.value : (state.config.acm_touch_level || 'full');
    // Also persist it to state and sheet so it stays consistent
    state.config.acm_touch_level = touchLevel;
    queueWrite('updateConfig', { acm_touch_level: touchLevel });

    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'aiConfigure', data: { acm_touch_level: touchLevel } }),
      redirect: 'follow'
    });
    const result = await resp.json();
    loading.classList.add('hidden');

    if (result.error) { alert('AI Configuration failed: ' + result.error); return; }

    aiWizard.step1Data = result.configuration;

    // Open modal and render step 1
    document.getElementById('aiConfigStepper').innerHTML = renderAiConfigStepper(1);
    renderAiConfigStep1(result.configuration, result.prompt_source);
    updateAiConfigFooter(1);
    document.getElementById('aiConfigModal').style.display = 'flex';
  } catch (e) {
    loading.classList.add('hidden');
    alert('AI Configuration failed: ' + e.message);
  }
}

// ---- Step 1: Prioritise Activities ----
function renderAiConfigStep1(configuration, promptSource) {
  const body = document.getElementById('aiConfigModalBody');
  let html = '';

  if (promptSource === 'fallback') {
    html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.78rem;color:#92400e;">' +
      'Using default prompt. Add an <strong>ai_config_step1_v1</strong> prompt to the Prompts sheet for better results.</div>';
  }

  if (configuration.summary) {
    html += '<div class="review-section"><h3 class="review-section-title">Summary</h3>' +
      '<div class="review-summary">' + escapeHtml(configuration.summary) + '</div></div>';
  }

  if (configuration.phases && configuration.phases.length > 0) {
    configuration.phases.forEach((phaseData, phaseIdx) => {
      html += '<div class="ai-config-phase" data-ai-phase-idx="' + phaseIdx + '">' +
        '<h3 class="ai-config-phase-title">' + escapeHtml(phaseData.phase) + '</h3>';

      if (phaseData.prioritised && phaseData.prioritised.length > 0) {
        html += '<div class="ai-config-group"><h4 class="ai-config-group-title">Prioritised Activities</h4>' +
          '<div class="ai-config-list ai-config-prioritised" data-ai-phase="' + phaseIdx + '" data-ai-group="prioritised">';
        phaseData.prioritised.forEach((item, idx) => {
          html += renderAiConfigItem(item, phaseIdx, 'prioritised', idx, true);
        });
        html += '</div></div>';
      }

      if (phaseData.deprioritised && phaseData.deprioritised.length > 0) {
        html += '<div class="ai-config-group"><details class="ai-config-depri-details" open>' +
          '<summary class="ai-config-group-title ai-config-depri-summary">Deprioritised (' + phaseData.deprioritised.length + ')</summary>' +
          '<div class="ai-config-list ai-config-deprioritised" data-ai-phase="' + phaseIdx + '" data-ai-group="deprioritised">';
        phaseData.deprioritised.forEach((item, idx) => {
          html += renderAiConfigItem(item, phaseIdx, 'deprioritised', idx, false);
        });
        html += '</div></details></div>';
      }

      if (phaseData.new_activities && phaseData.new_activities.length > 0) {
        html += '<div class="ai-config-group"><h4 class="ai-config-group-title">New Activities</h4><div class="ai-config-list">';
        phaseData.new_activities.forEach((item, idx) => {
          html += '<div class="ai-config-item ai-config-new-item"><label class="review-checkbox">' +
            '<input type="checkbox" checked data-ai-type="new" data-ai-phase="' + phaseIdx + '" data-ai-idx="' + idx + '">' +
            '<div class="review-item-content">' +
              '<span class="ai-config-badge ai-config-badge-new">NEW</span>' +
              '<div class="ai-config-item-title">' + escapeHtml(item.title) + '</div>' +
              '<div class="ai-config-item-rationale">' + escapeHtml(item.rationale || '') + '</div>' +
              (item.intro_text ? '<div class="ai-config-item-intro">' + escapeHtml(item.intro_text) + '</div>' : '') +
            '</div></label></div>';
        });
        html += '</div></div>';
      }

      html += '</div>';
    });
  }

  body.innerHTML = html;
  setupAiConfigDragDrop();
}

// ---- Step 2: Refine Todos & Questions ----
function renderAiConfigStep2(refinements, promptSource) {
  const body = document.getElementById('aiConfigModalBody');
  let html = '';

  if (promptSource === 'fallback') {
    html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.78rem;color:#92400e;">' +
      'Using default prompt. Add an <strong>ai_config_step2_v1</strong> prompt to the Prompts sheet for better results.</div>';
  }

  if (refinements.summary) {
    html += '<div class="review-section"><h3 class="review-section-title">Summary</h3>' +
      '<div class="review-summary">' + escapeHtml(refinements.summary) + '</div></div>';
  }

  const deactTodos = refinements.deactivate_todos || [];
  const deactQuestions = refinements.deactivate_questions || [];

  if (deactTodos.length === 0 && deactQuestions.length === 0) {
    html += '<div class="review-section"><p style="color:var(--text-secondary);font-style:italic;">No irrelevant items found \u2014 all todos and questions look relevant to your SOW.</p></div>';
  }

  if (deactTodos.length > 0) {
    html += '<div class="review-section"><h3 class="review-section-title">Suggested Todo Removals (' + deactTodos.length + ')</h3>' +
      '<p class="ai-config-rename-explainer">These todos appear irrelevant to your SOW. Checked items will be permanently removed. Uncheck any you want to keep.</p>';
    deactTodos.forEach((item, idx) => {
      const originalText = getOriginalText('todo', item.id);
      const activityId = item.activity_id || '';
      const activity = activityId ? state.activities.find(a => a.id === activityId) : null;
      html += '<div class="review-item ai-config-deact-item"><label class="review-checkbox">' +
        '<input type="checkbox" checked data-ai-type="deact-todo" data-deact-idx="' + idx + '">' +
        '<div class="review-item-content">' +
          '<div class="ai-config-rename-header">' +
            '<span class="ai-config-badge" style="background:#fee2e2;color:#991b1b;">TODO</span>' +
            '<span class="review-item-id">' + escapeHtml(item.id) + '</span>' +
            (activity ? '<span class="review-item-id" style="margin-left:0.25rem;">\u2190 ' + escapeHtml(activity.title) + '</span>' : '') +
          '</div>' +
          '<div class="ai-config-item-title">' + escapeHtml(originalText) + '</div>' +
          '<div class="ai-config-item-rationale">' + escapeHtml(item.rationale || '') + '</div>' +
        '</div></label></div>';
    });
    html += '</div>';
  }

  if (deactQuestions.length > 0) {
    html += '<div class="review-section"><h3 class="review-section-title">Suggested Question Removals (' + deactQuestions.length + ')</h3>' +
      '<p class="ai-config-rename-explainer">These questions appear irrelevant to your SOW. Checked items will be permanently removed. Uncheck any you want to keep.</p>';
    deactQuestions.forEach((item, idx) => {
      const originalText = getOriginalText('question', item.id);
      const activityId = item.activity_id || '';
      const activity = activityId ? state.activities.find(a => a.id === activityId) : null;
      html += '<div class="review-item ai-config-deact-item"><label class="review-checkbox">' +
        '<input type="checkbox" checked data-ai-type="deact-question" data-deact-idx="' + idx + '">' +
        '<div class="review-item-content">' +
          '<div class="ai-config-rename-header">' +
            '<span class="ai-config-badge" style="background:#e0e7ff;color:#3730a3;">QUESTION</span>' +
            '<span class="review-item-id">' + escapeHtml(item.id) + '</span>' +
            (activity ? '<span class="review-item-id" style="margin-left:0.25rem;">\u2190 ' + escapeHtml(activity.title) + '</span>' : '') +
          '</div>' +
          '<div class="ai-config-item-title">' + escapeHtml(originalText) + '</div>' +
          '<div class="ai-config-item-rationale">' + escapeHtml(item.rationale || '') + '</div>' +
        '</div></label></div>';
    });
    html += '</div>';
  }

  body.innerHTML = html;
}

// ---- Step 3: Tailor Wording ----
function renderAiConfigStep3(tailoring, promptSource) {
  const body = document.getElementById('aiConfigModalBody');
  let html = '';

  if (promptSource === 'fallback') {
    html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.78rem;color:#92400e;">' +
      'Using default prompt. Add an <strong>ai_config_step3_v1</strong> prompt to the Prompts sheet for better results.</div>';
  }

  if (tailoring.summary) {
    html += '<div class="review-section"><h3 class="review-section-title">Summary</h3>' +
      '<div class="review-summary">' + escapeHtml(tailoring.summary) + '</div></div>';
  }

  const renames = tailoring.renames || [];

  if (renames.length === 0) {
    html += '<div class="review-section"><p style="color:var(--text-secondary);font-style:italic;">No renames suggested \u2014 the current wording already fits your project well.</p></div>';
  } else {
    html += '<div class="review-section"><h3 class="review-section-title">Suggested Renames (' + renames.length + ')</h3>' +
      '<p class="ai-config-rename-explainer">These items will be renamed to better match your SOW context. Uncheck any you want to keep as-is.</p>';
    renames.forEach((r, idx) => {
      const original = r.original || getOriginalText(r.type, r.id);
      html += '<div class="review-item ai-config-rename-item"><label class="review-checkbox">' +
        '<input type="checkbox" checked data-ai-type="rename" data-rename-idx="' + idx + '">' +
        '<div class="review-item-content">' +
          '<div class="ai-config-rename-header">' +
            '<span class="ai-config-badge ai-config-badge-rename">' + escapeHtml(r.type.toUpperCase()) + '</span>' +
            '<span class="review-item-id">' + escapeHtml(r.id) + '</span>' +
          '</div>' +
          '<div class="ai-config-rename-row">' +
            '<span class="ai-config-rename-from">' + escapeHtml(original || '(unknown)') + '</span>' +
            '<span class="ai-config-rename-arrow">&rarr;</span>' +
            '<span class="ai-config-rename-to">' + escapeHtml(r.proposed) + '</span>' +
          '</div>' +
          (r.rationale ? '<div class="ai-config-item-rationale">' + escapeHtml(r.rationale) + '</div>' : '') +
        '</div></label></div>';
    });
    html += '</div>';
  }

  body.innerHTML = html;
}

// ---- Apply helpers ----
// Robust ID lookup: trim whitespace, try exact match then case-insensitive
function findActivityById(itemId) {
  if (!itemId) return null;
  const id = itemId.trim();
  return state.activities.find(a => a.id === id)
    || state.activities.find(a => a.id?.trim() === id)
    || state.activities.find(a => a.id?.trim().toLowerCase() === id.toLowerCase());
}
function findTodoById(itemId) {
  if (!itemId) return null;
  const id = itemId.trim();
  return state.todos.find(t => t.id === id)
    || state.todos.find(t => t.id?.trim() === id)
    || state.todos.find(t => t.id?.trim().toLowerCase() === id.toLowerCase());
}
function findQuestionById(itemId) {
  if (!itemId) return null;
  const id = itemId.trim();
  return state.questions.find(q => q.id === id)
    || state.questions.find(q => q.id?.trim() === id)
    || state.questions.find(q => q.id?.trim().toLowerCase() === id.toLowerCase());
}

// Counters for summary
let aiConfigApplyStats = { deprioritised: 0, prioritised: 0, newActivities: 0, todosDeactivated: 0, questionsDeactivated: 0, renamed: 0, notFound: 0 };

function applyStep1FromModal() {
  const modal = document.getElementById('aiConfigModal');
  const configuration = aiWizard.step1Data;
  if (!configuration || !configuration.phases) return [];
  snapshotForUndo('AI Config: prioritise activities');

  const prioritisedIds = [];
  aiConfigApplyStats.deprioritised = 0;
  aiConfigApplyStats.prioritised = 0;
  aiConfigApplyStats.newActivities = 0;
  aiConfigApplyStats.notFound = 0;

  configuration.phases.forEach((phaseData, phaseIdx) => {
    const priList = modal.querySelector('.ai-config-prioritised[data-ai-phase="' + phaseIdx + '"]');
    if (priList) {
      priList.querySelectorAll('.ai-config-item').forEach((el, seqIdx) => {
        const cb = el.querySelector('input[type="checkbox"]');
        const itemId = el.dataset.aiItemId;
        const act = findActivityById(itemId);
        if (!act) { console.warn('[AI Config] Activity not found in state:', itemId); aiConfigApplyStats.notFound++; return; }
        if (cb && cb.checked) {
          act.sequence = seqIdx;
          act.deprioritised = false;
          act.pdca_phase = phaseData.phase; // supports cross-phase drag
          if (act.status === 'inactive') act.status = 'not_started';
          queueWrite('updateActivity', { id: act.id, sequence: seqIdx, deprioritised: false, status: act.status, pdca_phase: phaseData.phase });
          prioritisedIds.push(act.id);
          aiConfigApplyStats.prioritised++;
        } else {
          act.deprioritised = true;
          queueWrite('updateActivity', { id: act.id, deprioritised: true });
          aiConfigApplyStats.deprioritised++;
        }
      });
    }

    const depriList = modal.querySelector('.ai-config-deprioritised[data-ai-phase="' + phaseIdx + '"]');
    if (depriList) {
      depriList.querySelectorAll('.ai-config-item').forEach(el => {
        const cb = el.querySelector('input[type="checkbox"]');
        const itemId = el.dataset.aiItemId;
        const act = findActivityById(itemId);
        if (!act) { console.warn('[AI Config] Depri activity not found in state:', itemId); aiConfigApplyStats.notFound++; return; }
        if (cb && cb.checked) {
          act.deprioritised = false;
          if (act.status === 'inactive') act.status = 'not_started';
          queueWrite('updateActivity', { id: act.id, deprioritised: false, status: act.status });
          prioritisedIds.push(act.id);
          aiConfigApplyStats.prioritised++;
        } else {
          act.deprioritised = true;
          queueWrite('updateActivity', { id: act.id, deprioritised: true });
          aiConfigApplyStats.deprioritised++;
        }
      });
    }

    // New activities — prevent duplicates
    if (phaseData.new_activities) {
      modal.querySelectorAll('[data-ai-type="new"][data-ai-phase="' + phaseIdx + '"]').forEach(cb => {
        if (!cb.checked) return;
        const idx = parseInt(cb.dataset.aiIdx);
        const newAct = phaseData.new_activities[idx];
        if (!newAct) return;

        // Skip if activity with same title already exists in this phase
        const duplicate = state.activities.find(a => a.title?.trim().toLowerCase() === newAct.title?.trim().toLowerCase() && a.pdca_phase === phaseData.phase);
        if (duplicate) { console.log('[AI Config] Skipping duplicate new activity:', newAct.title); return; }

        const actId = generateId('A');
        const activity = {
          id: actId, title: newAct.title, intro_text: newAct.intro_text || '', full_description: '',
          pdca_phase: phaseData.phase, sequence: 999 + idx, status: 'not_started',
          due_date: '', depends_on: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          allocated_pct: '', actual_minutes: '', activity_type: '', deprioritised: false
        };
        state.activities.push(activity);
        queueWrite('addActivity', activity);
        prioritisedIds.push(actId);
        aiConfigApplyStats.newActivities++;

        if (newAct.todos) {
          newAct.todos.forEach((todoText, tIdx) => {
            const todo = { id: generateId('T'), activity_id: actId, text: todoText, is_done: false, sequence: tIdx, active: true, notes: '', created_at: new Date().toISOString() };
            state.todos.push(todo);
            queueWrite('addTodo', todo);
          });
        }
        if (newAct.questions) {
          newAct.questions.forEach((q, qIdx) => {
            const question = { id: generateId('Q'), activity_id: actId, question_text: q.question_text || q, sub_topic: q.sub_topic || '', ask_whom: q.ask_whom || '', is_answered: false, answer: '', sequence: qIdx, active: true, created_at: new Date().toISOString() };
            state.questions.push(question);
            queueWrite('addQuestion', question);
          });
        }
      });
    }
  });

  console.log('[AI Config] Step 1 applied:', aiConfigApplyStats.prioritised, 'prioritised,', aiConfigApplyStats.deprioritised, 'deprioritised,', aiConfigApplyStats.newActivities, 'new,', aiConfigApplyStats.notFound, 'not found');
  return prioritisedIds;
}

function applyStep2FromModal() {
  const modal = document.getElementById('aiConfigModal');
  const refinements = aiWizard.step2Data;
  if (!refinements) return;
  snapshotForUndo('AI Config: refine todos/questions');

  const deactTodos = refinements.deactivate_todos || [];
  const deactQuestions = refinements.deactivate_questions || [];
  aiConfigApplyStats.todosDeactivated = 0;
  aiConfigApplyStats.questionsDeactivated = 0;

  modal.querySelectorAll('[data-ai-type="deact-todo"]').forEach(cb => {
    if (!cb.checked) return;
    const idx = parseInt(cb.dataset.deactIdx);
    const item = deactTodos[idx];
    if (!item) return;
    const todo = findTodoById(item.id);
    if (todo) {
      state.todos = state.todos.filter(t => t.id !== todo.id);
      queueWrite('deleteTodo', { id: todo.id });
      aiConfigApplyStats.todosDeactivated++;
    } else {
      console.warn('[AI Config] Todo not found:', item.id);
    }
  });

  modal.querySelectorAll('[data-ai-type="deact-question"]').forEach(cb => {
    if (!cb.checked) return;
    const idx = parseInt(cb.dataset.deactIdx);
    const item = deactQuestions[idx];
    if (!item) return;
    const q = findQuestionById(item.id);
    if (q) {
      state.questions = state.questions.filter(x => x.id !== q.id);
      queueWrite('deleteQuestion', { id: q.id });
      aiConfigApplyStats.questionsDeactivated++;
    } else {
      console.warn('[AI Config] Question not found:', item.id);
    }
  });

  console.log('[AI Config] Step 2 applied:', aiConfigApplyStats.todosDeactivated, 'todos removed,', aiConfigApplyStats.questionsDeactivated, 'questions removed');
}

function applyStep3FromModal() {
  const modal = document.getElementById('aiConfigModal');
  const tailoring = aiWizard.step3Data;
  if (!tailoring) return;
  snapshotForUndo('AI Config: tailor names');

  const renames = tailoring.renames || [];
  aiConfigApplyStats.renamed = 0;

  modal.querySelectorAll('[data-ai-type="rename"]').forEach(cb => {
    if (!cb.checked) return;
    const idx = parseInt(cb.dataset.renameIdx);
    const rename = renames[idx];
    if (!rename) return;

    if (rename.type === 'activity') {
      const act = findActivityById(rename.id);
      if (act) { act.title = rename.proposed; queueWrite('updateActivity', { id: act.id, title: rename.proposed }); aiConfigApplyStats.renamed++; }
      else console.warn('[AI Config] Rename: activity not found:', rename.id);
    } else if (rename.type === 'todo') {
      const todo = findTodoById(rename.id);
      if (todo) { todo.text = rename.proposed; queueWrite('updateTodo', { id: todo.id, text: rename.proposed }); aiConfigApplyStats.renamed++; }
      else console.warn('[AI Config] Rename: todo not found:', rename.id);
    } else if (rename.type === 'question') {
      const q = findQuestionById(rename.id);
      if (q) { q.question_text = rename.proposed; queueWrite('updateQuestion', { id: q.id, question_text: rename.proposed }); aiConfigApplyStats.renamed++; }
      else console.warn('[AI Config] Rename: question not found:', rename.id);
    }
  });

  console.log('[AI Config] Step 3 applied:', aiConfigApplyStats.renamed, 'items renamed');
}

// ---- Wizard navigation ----
async function aiConfigNextStep() {
  if (aiWizard.step === 1) {
    // Apply step 1 and move to step 2
    aiWizard.prioritisedIds = applyStep1FromModal();
    aiWizard.step = 2;

    // Show in-modal loading
    document.getElementById('aiConfigStepper').innerHTML = renderAiConfigStepper(2);
    const body = document.getElementById('aiConfigModalBody');
    body.innerHTML = '<div class="ai-config-inline-loading">' + aiConfigLoadingHtml('Step 2 of 3: Reviewing todos and questions\u2026') + '</div>';
    document.getElementById('aiConfigModalFooter').innerHTML = '';

    try {
      const resp = await fetch(CONFIG.API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'aiConfigStep2', data: { activity_ids: aiWizard.prioritisedIds } }),
        redirect: 'follow'
      });
      const result = await resp.json();
      if (result.error) { alert('Step 2 failed: ' + result.error); aiConfigFinishEarly(); return; }

      aiWizard.step2Data = result.refinements;
      renderAiConfigStep2(result.refinements, result.prompt_source);
      updateAiConfigFooter(2);
    } catch (e) {
      alert('Step 2 failed: ' + e.message);
      aiConfigFinishEarly();
    }
  } else if (aiWizard.step === 2) {
    // Apply step 2 and move to step 3
    applyStep2FromModal();
    aiWizard.step = 3;

    document.getElementById('aiConfigStepper').innerHTML = renderAiConfigStepper(3);
    const body = document.getElementById('aiConfigModalBody');
    body.innerHTML = '<div class="ai-config-inline-loading">' + aiConfigLoadingHtml('Step 3 of 3: Tailoring wording to your SOW\u2026') + '</div>';
    document.getElementById('aiConfigModalFooter').innerHTML = '';

    try {
      const resp = await fetch(CONFIG.API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'aiConfigStep3', data: { activity_ids: aiWizard.prioritisedIds } }),
        redirect: 'follow'
      });
      const result = await resp.json();
      if (result.error) { alert('Step 3 failed: ' + result.error); aiConfigFinishEarly(); return; }

      aiWizard.step3Data = result.tailoring;
      renderAiConfigStep3(result.tailoring, result.prompt_source);
      updateAiConfigFooter(3);
    } catch (e) {
      alert('Step 3 failed: ' + e.message);
      aiConfigFinishEarly();
    }
  }
}

function aiConfigSkipRemaining() {
  // Apply the current step and close
  if (aiWizard.step === 1) {
    applyStep1FromModal();
  } else if (aiWizard.step === 2) {
    applyStep2FromModal();
  }
  aiConfigFinishEarly();
}

function aiConfigFinish() {
  // Apply step 3 (renames) and close
  applyStep3FromModal();
  aiConfigFinishEarly();
}

function aiConfigFinishEarly() {
  aiWizard = { step: 0, step1Data: null, step2Data: null, step3Data: null, prioritisedIds: [] };
  closeModal('aiConfigModal');
  saveToLocalCache();
  renderAll();
  attachExpandedEvents();

  // Show summary toast
  const s = aiConfigApplyStats;
  const parts = [];
  if (s.prioritised) parts.push(s.prioritised + ' prioritised');
  if (s.deprioritised) parts.push(s.deprioritised + ' deprioritised');
  if (s.newActivities) parts.push(s.newActivities + ' new activities');
  if (s.todosDeactivated) parts.push(s.todosDeactivated + ' todos removed');
  if (s.questionsDeactivated) parts.push(s.questionsDeactivated + ' questions removed');
  if (s.renamed) parts.push(s.renamed + ' items renamed');
  if (s.notFound) parts.push(s.notFound + ' items not found');

  if (parts.length > 0) {
    const toast = document.createElement('div');
    toast.className = 'ai-config-toast';
    toast.textContent = 'AI Configuration applied: ' + parts.join(', ');
    if (s.notFound > 0) toast.classList.add('ai-config-toast-warn');
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 6000);
  }
}

// ---- Shared helpers (unchanged) ----
function getOriginalText(type, id) {
  if (type === 'activity') { const a = state.activities.find(x => x.id === id); return a ? a.title : id; }
  if (type === 'todo') { const t = state.todos.find(x => x.id === id); return t ? t.text : id; }
  if (type === 'question') { const q = state.questions.find(x => x.id === id); return q ? q.question_text : id; }
  return id;
}

function renderAiConfigItem(item, phaseIdx, group, idx, checked) {
  return '<div class="ai-config-item" draggable="' + (group === 'prioritised') + '" data-ai-item-id="' + escapeHtml(item.id) + '" data-ai-phase="' + phaseIdx + '" data-ai-group="' + group + '" data-ai-idx="' + idx + '">' +
    '<label class="review-checkbox">' +
      '<input type="checkbox" ' + (checked ? 'checked' : '') + ' data-ai-type="' + group + '" data-ai-phase="' + phaseIdx + '" data-ai-idx="' + idx + '">' +
      '<div class="review-item-content">' +
        (group === 'prioritised' ? '<span class="ai-config-drag-handle">&#9776;</span>' : '') +
        '<div class="ai-config-item-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="review-item-id">' + escapeHtml(item.id) + '</div>' +
        '<div class="ai-config-item-rationale">' + escapeHtml(item.rationale || '') + '</div>' +
      '</div>' +
    '</label>' +
  '</div>';
}

function setupAiConfigDragDrop() {
  let draggedEl = null;
  const lists = document.querySelectorAll('.ai-config-prioritised');

  lists.forEach(list => {
    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.ai-config-item');
      if (!item) return;
      draggedEl = item;
      item.classList.add('ai-config-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.aiItemId);
    });

    list.addEventListener('dragend', (e) => {
      const item = e.target.closest('.ai-config-item');
      if (item) item.classList.remove('ai-config-dragging');
      draggedEl = null;
      document.querySelectorAll('.ai-config-drag-over').forEach(el => el.classList.remove('ai-config-drag-over'));
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Clear all previous indicators
      document.querySelectorAll('.ai-config-drag-over').forEach(el => el.classList.remove('ai-config-drag-over'));
      const afterEl = getDragAfterElement(list, e.clientY);
      if (afterEl) {
        afterEl.classList.add('ai-config-drag-over');
      } else {
        list.classList.add('ai-config-drag-over');
      }
    });

    list.addEventListener('dragleave', (e) => {
      const item = e.target.closest('.ai-config-item');
      if (item) item.classList.remove('ai-config-drag-over');
      if (e.target === list) list.classList.remove('ai-config-drag-over');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      document.querySelectorAll('.ai-config-drag-over').forEach(el => el.classList.remove('ai-config-drag-over'));
      list.classList.remove('ai-config-drag-over');
      if (!draggedEl) return;

      // Update phase attribute when dropped in a different phase's list
      const targetPhase = list.dataset.aiPhase;
      if (draggedEl.dataset.aiPhase !== targetPhase) {
        draggedEl.dataset.aiPhase = targetPhase;
        const cb = draggedEl.querySelector('input[type="checkbox"]');
        if (cb) cb.dataset.aiPhase = targetPhase;
      }

      const afterEl = getDragAfterElement(list, e.clientY);
      if (afterEl) { list.insertBefore(draggedEl, afterEl); } else { list.appendChild(draggedEl); }
    });
  });
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll('.ai-config-item:not(.ai-config-dragging)')];
  let closest = null, closestOffset = Number.NEGATIVE_INFINITY;
  items.forEach(child => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = child; }
  });
  return closest;
}

// Start
document.addEventListener('DOMContentLoaded', init);
