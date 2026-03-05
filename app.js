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

// Default time allocation percentages (based on 20-day / 160-hour baseline)
const DEFAULT_ALLOCATED_PCT = {
  A00: 5, A01: 3, A02: 4, A03: 4, A04: 3, A05: 2, A06: 2, A12: 2, A07: 2,
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
  timesheet: [],
  config: {},
  expandedActivityId: null,
  activeTab: {},
  searchQuery: '',
  filterStatus: '',
  editingMilestoneId: null,
  showInactive: {},
  showInactiveTodos: {},
  showInactiveQuestions: {},
  timeEntryOpen: false
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
    timesheet: state.timesheet,
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
        timesheet: data.timesheet || [],
        config: data.config || {}
      });
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
        state.timesheet = data.timesheet || [];
        state.config = data.config || {};
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
      state.timesheet = data.timesheet || [];
      state.config = data.config || {};
      saveToLocalCache();
      return true;
    }

    return loadFromLocalCache();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(CONFIG.API_URL + '?action=getAll', { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    state.activities = data.activities || [];
    state.todos = data.todos || [];
    state.questions = data.questions || [];
    state.notes = data.notes || [];
    state.milestones = data.milestones || [];
    state.timesheet = data.timesheet || [];
    state.config = typeof data.config === 'object' && !Array.isArray(data.config) ? data.config : {};
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
      state.timesheet = data.timesheet || [];
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

function getActivityTodos(actId) {
  return state.todos.filter(t => t.activity_id === actId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

function getActivityQuestions(actId) {
  return state.questions.filter(q => q.activity_id === actId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

function getActivityNotes(actId) {
  return state.notes.filter(n => n.activity_id === actId);
}

function getPhaseActivities(phase) {
  return state.activities
    .filter(a => a.pdca_phase === phase)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
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
        const incompleteTodos = todos.filter(t => !t.is_done).length;
        const unansweredQs = questions.filter(q => !q.answer && !q.is_answered).length;

        // Get unique "ask whom" for unanswered questions
        const askWhom = [...new Set(questions.filter(q => !q.answer && !q.is_answered && q.ask_whom).map(q => q.ask_whom))];

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
    const dep = state.activities.find(a => a.id === depId);
    if (dep && dep.status !== 'completed') {
      incomplete.push(dep);
    }
  }
  return incomplete;
}

// ---- Renderers ----

function renderAll() {
  renderNav();
  renderTimeline();
  renderStatusBar();
  renderNowDoing();
  renderWhatsNext();
  renderPhases();
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

  nav.querySelectorAll('.nav-phase').forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = btn.dataset.phase;
      const section = document.querySelector(`[data-phase-section="${phase}"]`);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderTimeline() {
  const technicalMs = state.milestones.filter(m => m.timeline_type !== 'acm');
  const acmMs = state.milestones.filter(m => m.timeline_type === 'acm');

  // Compute global date range across BOTH timelines for alignment
  const allDated = state.milestones.filter(m => m.date);
  let globalMin, globalMax;

  if (allDated.length >= 2) {
    const dates = allDated.map(m => new Date(m.date).getTime());
    globalMin = Math.min(...dates);
    globalMax = Math.max(...dates);
    const padding = (globalMax - globalMin) * 0.05 || (86400000 * 7);
    globalMin -= padding;
    globalMax += padding;
  } else if (allDated.length === 1) {
    const d = new Date(allDated[0].date).getTime();
    globalMin = d - 86400000 * 30;
    globalMax = d + 86400000 * 30;
  } else {
    globalMin = null;
    globalMax = null;
  }

  renderSingleTimeline('timelineBarTechnical', technicalMs, globalMin, globalMax);
  renderSingleTimeline('timelineBarAcm', acmMs, globalMin, globalMax);

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

function renderSingleTimeline(barId, milestones, globalMin, globalMax) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  if (milestones.length === 0) {
    bar.innerHTML = '<div class="timeline-line"></div>' +
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

  let html = '<div class="timeline-line"></div>';
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
      ${m.date ? `<span class="milestone-date">${escapeHtml(m.date)}</span>` : '<span class="milestone-date" style="font-style:italic;">(no date)</span>'}
    </div>`;
  });

  bar.innerHTML = html;

  bar.querySelectorAll('.timeline-milestone').forEach(el => {
    el.addEventListener('click', () => openMilestoneModal(el.dataset.milestoneId));
  });
}

// ---- Time Tracking Helpers ----
function getTotalBilledMinutes() {
  return state.timesheet.reduce((sum, e) => sum + (parseInt(e.billed_minutes) || 0), 0);
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
  const act = state.activities.find(a => a.id === actId);
  if (!act || act.status === 'inactive') return 0;
  const rawPct = getActivityAllocatedPct(act);
  const sumActive = state.activities
    .filter(a => a.status !== 'inactive')
    .reduce((sum, a) => sum + getActivityAllocatedPct(a), 0);
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

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addTimesheetEntry(activityId, billedMinutes, note) {
  const entry = {
    id: generateId('TS'),
    activity_id: activityId,
    date: new Date().toISOString().split('T')[0],
    billed_minutes: billedMinutes,
    note: note || '',
    created_at: new Date().toISOString()
  };
  state.timesheet.push(entry);
  queueWrite('addTimesheetEntry', entry);
  saveToLocalCache();
  renderStatusBar();
}

function renderStatusBar() {
  const bar = document.getElementById('statusBar');
  const activeActivities = state.activities.filter(a => a.status !== 'inactive');
  const total = activeActivities.length;
  const completed = activeActivities.filter(a => a.status === 'completed').length;
  const activeTodos = state.todos.filter(t => t.active !== false);
  const allTodos = activeTodos.length;
  const doneTodos = activeTodos.filter(t => t.is_done).length;
  const activeQs = state.questions.filter(q => q.active !== false);
  const allQs = activeQs.length;
  const answeredQs = activeQs.filter(q => q.answer || q.is_answered).length;
  const currentPhase = state.config.current_phase || getPhases()[0] || '';

  const unit = state.config.duration_unit || 'hours';
  const budgetMins = getTotalBudgetMinutes();
  const billedMins = getTotalBilledMinutes();
  const pct = budgetMins > 0 ? Math.min((billedMins / budgetMins) * 100, 100) : 0;
  const barColor = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e';

  const budgetLabel = budgetMins > 0
    ? `<strong>${formatMinutes(billedMins, unit)}</strong> / ${formatMinutes(budgetMins, unit)}`
    : `<strong>${formatMinutes(billedMins, unit)}</strong> billed`;
  const budgetHtml = `
    <span class="status-item budget-item">
      <span class="budget-bar" title="${budgetMins > 0 ? formatMinutes(billedMins, unit) + ' of ' + formatMinutes(budgetMins, unit) + ' billed' : 'No budget set'}">
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

  // Time entry button handler
  const teBtn = document.getElementById('timeEntryBtn');
  if (teBtn) {
    teBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTimeEntry();
    });
  }
}

function toggleTimeEntry() {
  state.timeEntryOpen = !state.timeEntryOpen;
  renderTimeEntryPopover();
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
    addTimesheetEntry(actId, mins, note);

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
}

function renderPhases() {
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

  // Event: add activity
  container.querySelectorAll('.phase-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addNewActivity(btn.dataset.phase);
    });
  });

  // Event: rename phase
  container.querySelectorAll('.phase-title').forEach(el => {
    el.addEventListener('blur', () => {
      const oldPhase = el.dataset.phase;
      const newPhase = el.textContent.trim();
      if (newPhase && newPhase !== oldPhase) {
        renamePhase(oldPhase, newPhase);
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    });
  });

  // Event: toggle inactive cards
  container.querySelectorAll('.btn-inactive-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const phase = btn.dataset.phase;
      if (!state.showInactive) state.showInactive = {};
      state.showInactive[phase] = !state.showInactive[phase];
      renderPhases();
      attachExpandedEvents();
    });
  });

  // Event: move card arrows
  container.querySelectorAll('.card-move-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveCard(btn.dataset.moveId, parseInt(btn.dataset.moveDir));
    });
  });

  // Event: card clicks
  container.querySelectorAll('.activity-card:not(.expanded)').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't expand when clicking move arrows
      if (e.target.closest('.card-move-btn')) return;
      expandActivity(card.dataset.activityId);
    });
  });
}

function renderCard(act) {
  const todos = getActivityTodos(act.id).filter(t => t.active !== false);
  const questions = getActivityQuestions(act.id).filter(q => q.active !== false);
  const doneTodos = todos.filter(t => t.is_done).length;
  const answeredQs = questions.filter(q => q.answer || q.is_answered).length;
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

  let html = `<div class="activity-card status-${escapeHtml(act.status || 'not_started')}${isExpanded ? ' expanded' : ''}${fillClass}" data-activity-id="${escapeHtml(act.id)}" style="--fill-pct: ${fillPct}">
    <div class="card-header">
      <span class="card-status-dot dot-${escapeHtml(act.status || 'not_started')}"></span>
      <span class="card-title">${isExpanded ? escapeHtml(act.title) : highlightText(act.title)}</span>
      <span class="card-id">${escapeHtml(act.id)}</span>
      ${isExpanded ? `<button class="card-close-btn" data-close-id="${escapeHtml(act.id)}" title="Close">&times;</button>` : ''}
    </div>`;

  if (!isExpanded) {
    html += `<div class="card-intro">${highlightText(act.intro_text || act.title)}</div>
    <div class="card-meta">
      ${todos.length > 0 ? `<span class="card-meta-item">&#9745; ${doneTodos}/${todos.length}</span>` : ''}
      ${questions.length > 0 ? `<span class="card-meta-item">&#128172; ${answeredQs}/${questions.length}</span>` : ''}
      ${hasNotes ? '<span class="card-meta-item card-indicator" title="Has notes">✏️</span>' : ''}
      ${hasLinks ? '<span class="card-meta-item card-indicator" title="Has links">🔗</span>' : ''}
      ${act.due_date ? `<span class="card-meta-item card-due">${escapeHtml(act.due_date)}</span>` : ''}
      <span class="card-move-arrows">
        <button class="card-move-btn" data-move-id="${escapeHtml(act.id)}" data-move-dir="-1" title="Move left">&#9664;</button>
        <button class="card-move-btn" data-move-id="${escapeHtml(act.id)}" data-move-dir="1" title="Move right">&#9654;</button>
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
    </div>
    <div class="tab-content${activeTab === 'overview' ? ' active' : ''}" data-tab-content="overview">${renderOverviewTab(act)}</div>
    <div class="tab-content${activeTab === 'todos' ? ' active' : ''}" data-tab-content="todos">${renderTodosTab(act)}</div>
    <div class="tab-content${activeTab === 'questions' ? ' active' : ''}" data-tab-content="questions">${renderQuestionsTab(act)}</div>
    <div class="tab-content${activeTab === 'notes' ? ' active' : ''}" data-tab-content="notes">${renderNotesTab(act)}</div>
  </div>`;
}

function renderTimeAllocationField(act) {
  const effectivePct = getEffectiveAllocatedPct(act.id);
  const allocMins = getAllocatedMinutes(act.id);
  const budgetMins = getTotalBudgetMinutes();
  const actualMins = parseInt(act.actual_minutes) || 0;
  const actualH = Math.floor(actualMins / 60);
  const actualM = actualMins % 60;

  // Comparison
  let comparisonHtml = '';
  if (allocMins > 0 && actualMins > 0) {
    const diff = actualMins - allocMins;
    const diffPct = Math.round(Math.abs(diff) / allocMins * 100);
    if (diff > 0) {
      comparisonHtml = `<span class="time-comparison-badge over">${diffPct}% over</span>`;
    } else if (diff < 0) {
      comparisonHtml = `<span class="time-comparison-badge under">${diffPct}% under</span>`;
    } else {
      comparisonHtml = `<span class="time-comparison-badge on-track">On track</span>`;
    }
  }

  // Hours options for actual time (0-99)
  let hoursOpts = '';
  for (let i = 0; i <= 99; i++) {
    hoursOpts += `<option value="${i}"${i === actualH ? ' selected' : ''}>${i}</option>`;
  }

  // Minutes options (5-min granularity)
  let minsOpts = '';
  for (let i = 0; i < 60; i += 5) {
    const padded = String(i).padStart(2, '0');
    minsOpts += `<option value="${i}"${i === actualM ? ' selected' : ''}>${padded}</option>`;
  }

  return `<div class="overview-field time-allocation-section">
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
      <div class="time-spent-inputs">
        <select class="time-spent-hours" data-act-id="${act.id}">${hoursOpts}</select>
        <span>h</span>
        <select class="time-spent-mins" data-act-id="${act.id}">${minsOpts}</select>
        <span>m</span>
        ${comparisonHtml}
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
          const dep = state.activities.find(a => a.id === d);
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

  if (act.status === 'inactive') {
    html += `<div class="overview-field"><button class="btn-small btn-reactivate" data-reactivate-id="${escapeHtml(act.id)}">&#9654; Reactivate this activity</button></div>`;
  } else {
    html += `<div class="overview-field"><button class="btn-small btn-deactivate" data-deactivate-id="${escapeHtml(act.id)}">&#10005; Make this card inactive</button></div>`;
  }

  html += '</div>';
  return html;
}

function renderTodosTab(act) {
  const allTodos = getActivityTodos(act.id);
  const activeTodos = allTodos.filter(t => t.active !== false);
  const inactiveTodos = allTodos.filter(t => t.active === false);
  const done = activeTodos.filter(t => t.is_done === true || t.is_done === 'TRUE' || t.is_done === 'true').length;
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
    const isDone = t.is_done === true || t.is_done === 'TRUE' || t.is_done === 'true';
    html += `<li class="todo-item${isDone ? ' done' : ''}${t.is_project_specific ? ' todo-project-specific' : ''}">
      <input type="checkbox" ${isDone ? 'checked' : ''} data-todo-id="${escapeHtml(t.id)}">
      <span class="todo-text" contenteditable="true" data-todo-id="${escapeHtml(t.id)}" data-field="text">${highlightText(t.text)}</span>
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
  const answered = activeQuestions.filter(q => q.answer || q.is_answered).length;
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
      const isAnswered = (q.answer && String(q.answer).trim()) || q.is_answered === true || q.is_answered === 'TRUE';
      html += `<div class="question-item${isAnswered ? ' answered' : ''}">
        <button class="question-delete" data-question-id="${escapeHtml(q.id)}" title="Make inactive">&times;</button>
        <div class="question-text" contenteditable="true" data-question-id="${escapeHtml(q.id)}" data-field="question_text">${highlightText(q.question_text)}</div>
        ${q.ask_whom ? `<span class="ask-whom-badge" contenteditable="true" data-question-id="${escapeHtml(q.id)}" data-field="ask_whom">Ask: ${escapeHtml(q.ask_whom)}</span>` : ''}
        <textarea class="answer-field" data-question-id="${escapeHtml(q.id)}" placeholder="Answer...">${escapeHtml(q.answer || '')}</textarea>
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
      const act = state.activities.find(a => a.id === actId);
      if (act) {
        act[field] = value;
        queueWrite('updateActivity', { id: actId, [field]: value });
        saveToLocalCache();
        renderAll();
        attachExpandedEvents();
      }
    });
  });

  // Time spent hours/minutes selects
  container.querySelectorAll('.time-spent-hours, .time-spent-mins').forEach(el => {
    el.addEventListener('change', () => {
      const actId = el.dataset.actId;
      const act = state.activities.find(a => a.id === actId);
      if (!act) return;
      const hoursEl = container.querySelector(`.time-spent-hours[data-act-id="${actId}"]`);
      const minsEl = container.querySelector(`.time-spent-mins[data-act-id="${actId}"]`);
      const totalMins = (parseInt(hoursEl.value) || 0) * 60 + (parseInt(minsEl.value) || 0);
      act.actual_minutes = totalMins;
      queueWrite('updateActivity', { id: actId, actual_minutes: totalMins });
      saveToLocalCache();
      renderAll();
      attachExpandedEvents();
    });
  });

  // Editable text fields (description, particularisation)
  container.querySelectorAll('.editable-text[data-act-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const actId = el.dataset.actId;
      const field = el.dataset.field;
      const value = el.textContent.trim();
      const act = state.activities.find(a => a.id === actId);
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
        const act = state.activities.find(a => a.id === actId);
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

  // Todo checkbox
  container.querySelectorAll('.todo-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const todoId = cb.dataset.todoId;
      const todo = state.todos.find(t => t.id === todoId);
      if (todo) {
        todo.is_done = cb.checked;
        queueWrite('updateTodo', { id: todoId, is_done: cb.checked });
        renderAll();
        attachExpandedEvents();
      }
    });
  });

  // Todo text edit
  container.querySelectorAll('.todo-text[data-todo-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const todoId = el.dataset.todoId;
      const text = el.textContent.trim();
      const todo = state.todos.find(t => t.id === todoId);
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
      const todo = state.todos.find(t => t.id === todoId);
      if (todo) {
        todo.active = false;
        queueWrite('updateTodo', { id: todoId, active: false });
        saveToLocalCache();
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
      const todo = state.todos.find(t => t.id === todoId);
      if (todo) {
        todo.active = true;
        queueWrite('updateTodo', { id: todoId, active: true });
        saveToLocalCache();
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

  // Question answer
  container.querySelectorAll('.answer-field').forEach(ta => {
    let timer;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const qId = ta.dataset.questionId;
        const answer = ta.value;
        const q = state.questions.find(x => x.id === qId);
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
  });

  // Question text edit
  container.querySelectorAll('.question-text[data-question-id]').forEach(el => {
    el.addEventListener('blur', () => {
      const qId = el.dataset.questionId;
      const text = el.textContent.trim();
      const q = state.questions.find(x => x.id === qId);
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
      const q = state.questions.find(x => x.id === qId);
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
      const question = state.questions.find(q => q.id === qId);
      if (question) {
        question.active = false;
        queueWrite('updateQuestion', { id: qId, active: false });
        saveToLocalCache();
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
      const question = state.questions.find(q => q.id === qId);
      if (question) {
        question.active = true;
        queueWrite('updateQuestion', { id: qId, active: true });
        saveToLocalCache();
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

  // Note field edit
  container.querySelectorAll('[data-note-id][data-field]').forEach(el => {
    el.addEventListener('blur', () => {
      const noteId = el.dataset.noteId;
      const field = el.dataset.field;
      const value = el.textContent.trim();
      const note = state.notes.find(n => n.id === noteId);
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
  const act = state.activities.find(a => a.id === actId);
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
  const act = state.activities.find(a => a.id === actId);
  if (!act) return;
  act.status = newStatus;
  queueWrite('updateActivity', { id: act.id, status: newStatus });
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
    particularisation_guidance: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.activities.push(act);
  queueWrite('addActivity', act);
  renderAll();
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
  renderAll();
  attachExpandedEvents();
}

// ---- Milestone Modal ----

function openMilestoneModal(msId, timelineType) {
  const modal = document.getElementById('milestoneModal');
  state.editingMilestoneId = msId || null;

  if (msId) {
    const ms = state.milestones.find(m => m.id === msId);
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
    const ms = state.milestones.find(m => m.id === state.editingMilestoneId);
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
    duration_unit: document.getElementById('cfgDurationUnit').value
  };

  Object.assign(state.config, newConfig);
  queueWrite('updateConfig', newConfig);

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

  // Show cached data instantly while fetching fresh data
  const hasCached = loadFromLocalCache();
  if (hasCached && state.activities.length > 0) {
    loading.classList.add('hidden');
    renderAll();
    attachExpandedEvents();
    // Refresh from API in background (non-blocking)
    if (CONFIG.API_URL) {
      fetchAll().then(ok => {
        if (ok) { renderAll(); attachExpandedEvents(); }
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

  loading.classList.add('hidden');
  renderAll();
  attachExpandedEvents();
}

// Start
document.addEventListener('DOMContentLoaded', init);
