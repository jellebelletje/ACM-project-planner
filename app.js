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
  expandedTranscriptId: null
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
        config: data.config || {}
      });
      normalizePhaseNames();
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

// ---- Data Fetching ----
async function fetchAll() {
  if (!CONFIG.API_URL) {
    // Try loading from local seed-data.json for demo
    // Try fetch first (works with http:// but not file://)
    try {
      const resp = await fetch('seed-data.json');
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
        state.config = data.config || {};
        normalizePhaseNames();
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
      state.config = data.config || {};
      normalizePhaseNames();
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
    state.config = typeof data.config === 'object' && !Array.isArray(data.config) ? data.config : {};
    if (localConfig) {
      Object.assign(state.config, localConfig);
    }
    normalizePhaseNames();
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

function isMetaActivity(act) {
  return act.activity_type === 'meta';
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

  // Check if all non-inactive activities in the current phase are completed
  const acts = getPhaseActivities(current);
  const activeActs = acts.filter(a => a.status !== 'inactive');
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
    const acts = getPhaseActivities(phase).filter(a => a.status !== 'inactive');
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
  if (!act || act.status === 'inactive') return 0;
  const rawPct = getActivityAllocatedPct(act);
  if (_cache.sumActivePct === undefined) {
    _cache.sumActivePct = state.activities
      .filter(a => a.status !== 'inactive')
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
  const activeActivities = state.activities.filter(a => a.status !== 'inactive');
  const total = activeActivities.length;
  const completed = activeActivities.filter(a => a.status === 'completed').length;
  const activeTodos = state.todos.filter(t => t.active !== false);
  const allTodos = activeTodos.length;
  const doneTodos = activeTodos.filter(t => isTodoDone(t)).length;
  const activeQs = state.questions.filter(q => q.active !== false);
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
  const activeActs = state.activities.filter(a => a.status !== 'inactive');
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

  if (inProgress.length === 0) {
    row.style.display = 'none';
    updateMainOffset();
    return;
  }

  row.style.display = 'flex';
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
    const activeActs = acts.filter(a => a.status !== 'inactive');
    const inactiveActs = acts.filter(a => a.status === 'inactive');
    const showInactive = state.showInactive && state.showInactive[phase];
    const visibleActs = (showInactive ? acts : activeActs).filter(a => activityMatchesSearch(a) && activityMatchesFilter(a));
    const completed = activeActs.filter(a => a.status === 'completed').length;

    const phaseLower = phase.toLowerCase();
    const pdcaType = phaseLower.startsWith('plan') ? 'plan'
      : phaseLower.startsWith('do') ? 'do'
      : phaseLower.startsWith('check') ? 'check'
      : phaseLower.startsWith('act') ? 'act' : 'default';

    return `<section class="phase-section phase-${pdcaType}" data-phase-section="${escapeHtml(phase)}" data-phase-idx="${idx}">
      <div class="phase-header">
        <span class="phase-title" contenteditable="true" data-phase="${escapeHtml(phase)}">${escapeHtml(phase)}</span>
        <span class="phase-count">${completed}/${activeActs.length} done</span>
        ${inactiveActs.length > 0 ? `<button class="btn-small btn-inactive-toggle" data-phase="${escapeHtml(phase)}">${showInactive ? 'Hide' : 'Show'} ${inactiveActs.length} inactive</button>` : ''}
        <button class="btn-small phase-add-btn" data-phase="${escapeHtml(phase)}">+ Activity</button>
      </div>
      <div class="cards-grid">
        ${visibleActs.map(a => renderCard(a)).join('')}
      </div>
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
      const card = title.closest('.activity-card');
      if (card) expandActivity(card.dataset.activityId);
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

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const tab = btn.dataset.tab;
      state.activeTab[actId] = tab;
      // Re-render just the expanded card
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
        act[field] = value;
        queueWrite('updateActivity', { id: actId, [field]: value });
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
      clearCache();
      renderPhases();
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
        act[field] = value;
        queueWrite('updateActivity', { id: actId, [field]: value });
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
          act.particularisation_guidance = newValue;
          queueWrite('updateActivity', { id: actId, particularisation_guidance: newValue });
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
        todo.is_done = cb.checked;
        queueWrite('updateTodo', { id: todoId, is_done: cb.checked });
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
        todo.text = text;
        queueWrite('updateTodo', { id: todoId, text: text });
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
      state.todos.push(todo);
      queueWrite('addTodo', todo);
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
      timer = setTimeout(() => {
        const qId = ta.dataset.questionId;
        const answer = ta.value;
        const q = getQuestion(qId);
        if (q) {
          q.answer = answer;
          q.is_answered = !!answer.trim();
          queueWrite('updateQuestion', { id: qId, answer: answer, is_answered: q.is_answered });
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
        q.question_text = text;
        queueWrite('updateQuestion', { id: qId, question_text: text });
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
        q.ask_whom = text;
        queueWrite('updateQuestion', { id: qId, ask_whom: text });
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
      state.questions.push(q);
      queueWrite('addQuestion', q);
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
      clearCache();
      renderPhases();
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

  // Swap sequences
  const mySeq = act.sequence;
  const otherAct = phaseActs[swapIdx];
  act.sequence = otherAct.sequence;
  otherAct.sequence = mySeq;

  queueWrite('updateActivity', { id: act.id, sequence: act.sequence });
  queueWrite('updateActivity', { id: otherAct.id, sequence: otherAct.sequence });
  renderPhases();
  attachExpandedEvents();
}

function setActivityStatus(actId, newStatus) {
  const act = getActivity(actId);
  if (!act) return;
  act.status = newStatus;
  queueWrite('updateActivity', { id: act.id, status: newStatus });
  checkPhaseAdvance();
  state.expandedActivityId = null;
  renderAll();
  attachExpandedEvents();
}

function deleteActivity(actId) {
  state.activities = state.activities.filter(a => a.id !== actId);
  state.todos = state.todos.filter(t => t.activity_id !== actId);
  state.questions = state.questions.filter(q => q.activity_id !== actId);
  state.notes = state.notes.filter(n => n.activity_id !== actId);
  queueWrite('deleteActivity', { id: actId });
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

  state.activities.push(act);
  queueWrite('addActivity', act);
  renderPhases();
  renderNav();
  renderStatusBar();
  renderWhatsNext();
  attachExpandedEvents();
}

function renamePhase(oldName, newName) {
  state.activities.forEach(a => {
    if (a.pdca_phase === oldName) {
      a.pdca_phase = newName;
      queueWrite('updateActivity', { id: a.id, pdca_phase: newName });
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
  const textarea = document.getElementById('sowContent');
  const remarks = document.getElementById('sowRemarks');
  const status = document.getElementById('sowStatus');
  // Load latest SOW entry
  if (state.sow.length > 0) {
    const latest = state.sow.reduce((a, b) => (a.date_added || '') >= (b.date_added || '') ? a : b);
    textarea.value = latest.content || '';
    remarks.value = latest.remarks || '';
    status.textContent = latest.date_added ? 'Last saved: ' + latest.date_added : '';
  } else {
    textarea.value = '';
    remarks.value = '';
    status.textContent = '';
  }
  document.getElementById('sowModal').style.display = 'flex';
}

function saveSow() {
  const content = document.getElementById('sowContent').value.trim();
  const remarks = document.getElementById('sowRemarks').value.trim();
  const status = document.getElementById('sowStatus');
  if (!content) {
    status.textContent = 'Please enter the Statement of Work content.';
    return;
  }
  const now = new Date();
  const dateAdded = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const entry = { date_added: dateAdded, content: content, remarks: remarks };
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
        <span class="transcript-type-badge ${convType}">${convType === 'internal' ? 'Internal' : 'External'}</span>
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
  setTranscriptType('external'); // default to external
  document.getElementById('transcriptUploadModal').style.display = 'flex';
}

function setTranscriptType(type) {
  document.getElementById('trTypeExternal').classList.toggle('active', type === 'external');
  document.getElementById('trTypeInternal').classList.toggle('active', type === 'internal');
  // Store on the modal so saveTranscriptEntry() can read it
  document.getElementById('transcriptUploadModal').dataset.meetingType = type;
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

  const entry = {
    id: generateId('TR'),
    date: document.getElementById('trUploadDate').value,
    participants: document.getElementById('trUploadParticipants').value.trim(),
    context: document.getElementById('trUploadContext').value.trim(),
    meeting_type: document.getElementById('transcriptUploadModal').dataset.meetingType || 'external',
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

  if (!proposals.answered_questions?.length && !proposals.completed_todos?.length) {
    html += `<div class="review-section">
      <p class="review-empty">No specific question answers or todo completions were identified. The entries will still be marked as processed.</p>
    </div>`;
  }

  body.innerHTML = html;
  document.getElementById('reviewModal').style.display = 'flex';
}

function applySelectedProposals() {
  if (!pendingProposals || !pendingEntryIds) return;

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
          queueWrite('updateQuestion', { id: aq.id, answer: fullAnswer, is_answered: true });
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
          queueWrite('updateTodo', { id: ct.id, is_done: true, notes: noteText });
          if (t.activity_id) aiUpdatedIds.add(t.activity_id);
        }
      }
    });
  }

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
  document.getElementById('settingsModal').style.display = 'flex';
}

function updateDurationHint() {
  const hint = document.getElementById('durationHint');
  if (hint) hint.style.display = document.getElementById('cfgDurationUnit').value === 'days' ? 'block' : 'none';
}

async function saveSettings() {
  const newConfig = {
    project_name: document.getElementById('cfgProjectName').value.trim(),
    client_name: document.getElementById('cfgClientName').value.trim(),
    consultant_name: document.getElementById('cfgConsultantName').value.trim(),
    start_date: document.getElementById('cfgStartDate').value,
    end_date: document.getElementById('cfgEndDate').value,
    total_duration_value: document.getElementById('cfgDurationValue').value.trim(),
    duration_unit: document.getElementById('cfgDurationUnit').value,
    master_sheet_id: document.getElementById('cfgMasterSheetId').value.trim()
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
      state.config.project_name = newName.trim();
      queueWrite('updateConfig', { project_name: newName.trim() });
      updateProjectHeader();
    }
  });

  clientEl.addEventListener('click', () => {
    const current = state.config.client_name || '';
    const newName = prompt('Client name:', current);
    if (newName !== null) {
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
      const resp = await fetch('seed-data.json');
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
      const section = document.getElementById('rawDataStore');
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

    // Inactive toggle
    const inactiveBtn = target.closest('.btn-inactive-toggle');
    if (inactiveBtn) {
      e.stopPropagation();
      const phase = inactiveBtn.dataset.phase;
      if (!state.showInactive) state.showInactive = {};
      state.showInactive[phase] = !state.showInactive[phase];
      renderPhases();
      attachExpandedEvents();
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

// Start
document.addEventListener('DOMContentLoaded', init);
