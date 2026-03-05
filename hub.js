// =============================================================
// ACM Project Hub — Application Logic
// =============================================================

const HUB = {
  MASTER_URL_KEY: 'acm_master_url',
  PW_HASH_KEY: 'acm_pw_hash',
  SESSION_PROJECT_KEY: 'acm_current_project',
  LEGACY_API_KEY: 'acm_api_url',
  LEGACY_CACHE_KEY: 'acm_dashboard_cache'
};

const hubState = {
  authenticated: false,
  projects: [],
  masterConfig: {}
};

// ---- Crypto ----

async function hashPassword(plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Screen Management ----

function showScreen(screenId) {
  document.querySelectorAll('.hub-screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

function showLoading(show) {
  document.getElementById('hubLoading').classList.toggle('active', show);
}

// ---- Initialize ----

async function initHub() {
  // Check if Web Crypto is available
  if (!window.crypto || !window.crypto.subtle) {
    document.getElementById('setupError').textContent =
      'This app requires HTTPS or localhost. Please use a web server.';
    showScreen('setupScreen');
    return;
  }

  const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);

  if (!masterUrl) {
    // First-time setup
    showScreen('setupScreen');
    checkLegacyMigration();
    document.getElementById('setupMasterUrl').focus();
  } else {
    // Show password prompt
    showScreen('passwordScreen');
    document.getElementById('passwordInput').focus();
  }
}

// ---- First-Time Setup ----

function checkLegacyMigration() {
  const legacyUrl = localStorage.getItem(HUB.LEGACY_API_KEY);
  if (legacyUrl) {
    const notice = document.getElementById('migrationNotice');
    if (notice) {
      notice.style.display = 'block';
      notice.textContent = 'We detected an existing project. It will be imported automatically after setup.';
    }
  }
}

async function handleSetup(e) {
  e.preventDefault();
  const errorEl = document.getElementById('setupError');
  errorEl.textContent = '';

  const masterUrl = document.getElementById('setupMasterUrl').value.trim();
  const pw1 = document.getElementById('setupPassword').value;
  const pw2 = document.getElementById('setupPasswordConfirm').value;

  if (!masterUrl) {
    errorEl.textContent = 'Please enter the Master Sheet API URL.';
    return;
  }
  if (!pw1 || pw1.length < 4) {
    errorEl.textContent = 'Password must be at least 4 characters.';
    return;
  }
  if (pw1 !== pw2) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  const btn = document.getElementById('setupBtn');
  btn.disabled = true;
  btn.textContent = 'Setting up...';

  try {
    // Test the master URL
    const testResp = await fetch(masterUrl + '?action=getConfig', { redirect: 'follow' });
    const testData = await testResp.json();
    if (testData.error) throw new Error(testData.error);

    // Hash the password and store it
    const hash = await hashPassword(pw1);

    // Save to master sheet
    await fetch(masterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setConfig', data: { key: 'password_hash', value: hash } })
    });

    // Save locally
    localStorage.setItem(HUB.MASTER_URL_KEY, masterUrl);
    localStorage.setItem(HUB.PW_HASH_KEY, hash);

    // Handle legacy migration
    await migrateLegacyProject(masterUrl);

    // Proceed to project list
    hubState.authenticated = true;
    await loadAndShowProjects();

  } catch (err) {
    errorEl.textContent = 'Could not connect to the Master Sheet. Check the URL and try again.';
    btn.disabled = false;
    btn.textContent = 'Save & Continue';
  }
}

async function migrateLegacyProject(masterUrl) {
  const legacyUrl = localStorage.getItem(HUB.LEGACY_API_KEY);
  if (!legacyUrl) return;

  let projectName = 'My Project';
  let clientName = '';

  try {
    const cached = JSON.parse(localStorage.getItem(HUB.LEGACY_CACHE_KEY) || '{}');
    if (cached.config) {
      projectName = cached.config.project_name || projectName;
      clientName = cached.config.client_name || clientName;
    }
  } catch {}

  const project = {
    id: 'proj_migrated',
    name: projectName,
    client_name: clientName,
    api_url: legacyUrl,
    created_at: new Date().toISOString()
  };

  try {
    await fetch(masterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addProject', data: project })
    });

    // Copy legacy cache to the new namespaced key
    const legacyCache = localStorage.getItem(HUB.LEGACY_CACHE_KEY);
    if (legacyCache) {
      localStorage.setItem('acm_cache_' + project.id, legacyCache);
    }
  } catch {}
}

// ---- Password Check ----

async function handlePasswordSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('passwordError');
  errorEl.textContent = '';

  const pw = document.getElementById('passwordInput').value;
  if (!pw) {
    errorEl.textContent = 'Please enter your password.';
    return;
  }

  const btn = document.getElementById('passwordBtn');
  btn.disabled = true;
  btn.textContent = 'Checking...';

  try {
    const hash = await hashPassword(pw);
    let storedHash = localStorage.getItem(HUB.PW_HASH_KEY);

    // If no local hash, try fetching from master sheet
    if (!storedHash) {
      const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);
      const resp = await fetch(masterUrl + '?action=getConfig', { redirect: 'follow' });
      const config = await resp.json();
      storedHash = config.password_hash || '';
      if (storedHash) {
        localStorage.setItem(HUB.PW_HASH_KEY, storedHash);
      }
    }

    if (hash === storedHash) {
      hubState.authenticated = true;
      await loadAndShowProjects();
    } else {
      errorEl.textContent = 'Incorrect password.';
      btn.disabled = false;
      btn.textContent = 'Unlock';
      // Shake animation
      const card = document.querySelector('#passwordScreen .auth-card');
      card.style.animation = 'shake 0.3s';
      setTimeout(() => card.style.animation = '', 300);
    }
  } catch (err) {
    errorEl.textContent = 'Could not verify password. Check your connection.';
    btn.disabled = false;
    btn.textContent = 'Unlock';
  }
}

// ---- Project List ----

async function loadAndShowProjects() {
  showScreen('hubScreen');
  showLoading(true);

  try {
    const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);
    const resp = await fetch(masterUrl + '?action=getProjects', { redirect: 'follow' });
    const projects = await resp.json();
    hubState.projects = Array.isArray(projects) ? projects : [];
  } catch {
    // Try to show empty state rather than failing
    hubState.projects = [];
  }

  showLoading(false);
  renderProjects();
}

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  if (hubState.projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <h3>No projects yet</h3>
        <p>Create your first project to get started. Follow the instructions below.</p>
      </div>`;
    return;
  }

  grid.innerHTML = hubState.projects.map(p => {
    const date = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
    const hasApi = !!p.api_url;
    return `
      <div class="project-card" data-project-id="${escapeAttr(p.id)}" onclick="selectProject('${escapeAttr(p.id)}')">
        <div class="project-card-name">${escapeHtml(p.name)}</div>
        <div class="project-card-client">${escapeHtml(p.client_name || '')}</div>
        <div class="project-card-meta">
          <span>${date}</span>
          <span class="project-card-status${hasApi ? ' connected' : ''}">${hasApi ? 'Connected' : 'Not connected'}</span>
          <button class="project-card-delete" onclick="event.stopPropagation(); deleteProject('${escapeAttr(p.id)}')" title="Remove project">&times;</button>
        </div>
      </div>`;
  }).join('');
}

function selectProject(projectId) {
  const project = hubState.projects.find(p => p.id === projectId);
  if (!project) return;

  sessionStorage.setItem(HUB.SESSION_PROJECT_KEY, JSON.stringify({
    id: project.id,
    name: project.name,
    client_name: project.client_name,
    api_url: project.api_url || ''
  }));

  window.location.href = 'dashboard.html';
}

// ---- Create Project ----

function openCreateModal() {
  document.getElementById('newProjectName').value = '';
  document.getElementById('newProjectClient').value = '';
  document.getElementById('createError').textContent = '';
  document.getElementById('createProjectModal').style.display = 'flex';
  document.getElementById('newProjectName').focus();
}

function closeCreateModal() {
  document.getElementById('createProjectModal').style.display = 'none';
}

async function handleCreateProject(e) {
  e.preventDefault();
  const errorEl = document.getElementById('createError');
  errorEl.textContent = '';

  const name = document.getElementById('newProjectName').value.trim();
  const client = document.getElementById('newProjectClient').value.trim();

  if (!name) {
    errorEl.textContent = 'Project name is required.';
    return;
  }
  if (!client) {
    errorEl.textContent = 'Client name is required.';
    return;
  }

  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  const project = {
    id: 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    client_name: client,
    api_url: '',
    created_at: new Date().toISOString()
  };

  try {
    const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);
    const resp = await fetch(masterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addProject', data: project })
    });
    const result = await resp.json();
    if (result.error) throw new Error(result.error);

    hubState.projects.push(project);
    renderProjects();
    closeCreateModal();

  } catch (err) {
    errorEl.textContent = 'Failed to create project. Check your connection.';
  }

  btn.disabled = false;
  btn.textContent = 'Create Project';
}

// ---- Delete Project ----

async function deleteProject(projectId) {
  if (!confirm('Remove this project from the hub? (The Google Sheet will not be deleted.)')) return;

  try {
    const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);
    await fetch(masterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteProject', data: { id: projectId } })
    });

    hubState.projects = hubState.projects.filter(p => p.id !== projectId);
    renderProjects();
  } catch {
    alert('Failed to delete project. Check your connection.');
  }
}

// ---- Hub Settings ----

function openHubSettings() {
  document.getElementById('hubSettingsModal').style.display = 'flex';
  document.getElementById('settingsMasterUrl').value = localStorage.getItem(HUB.MASTER_URL_KEY) || '';
  document.getElementById('settingsError').textContent = '';
}

function closeHubSettings() {
  document.getElementById('hubSettingsModal').style.display = 'none';
}

async function handleChangePassword(e) {
  e.preventDefault();
  const errorEl = document.getElementById('settingsError');
  errorEl.textContent = '';

  const newPw = document.getElementById('settingsNewPassword').value;
  const confirmPw = document.getElementById('settingsConfirmPassword').value;

  if (!newPw || newPw.length < 4) {
    errorEl.textContent = 'Password must be at least 4 characters.';
    return;
  }
  if (newPw !== confirmPw) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  try {
    const hash = await hashPassword(newPw);
    const masterUrl = localStorage.getItem(HUB.MASTER_URL_KEY);

    await fetch(masterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setConfig', data: { key: 'password_hash', value: hash } })
    });

    localStorage.setItem(HUB.PW_HASH_KEY, hash);
    errorEl.style.color = '#16a34a';
    errorEl.textContent = 'Password updated successfully.';
    document.getElementById('settingsNewPassword').value = '';
    document.getElementById('settingsConfirmPassword').value = '';
    setTimeout(() => {
      errorEl.textContent = '';
      errorEl.style.color = '';
    }, 2000);
  } catch {
    errorEl.textContent = 'Failed to update password. Check your connection.';
  }
}

// ---- Reset ----

function handleReset() {
  if (!confirm('This will clear all local data and return to the setup screen. Your Google Sheets data will NOT be deleted. Continue?')) return;
  localStorage.removeItem(HUB.MASTER_URL_KEY);
  localStorage.removeItem(HUB.PW_HASH_KEY);
  sessionStorage.removeItem(HUB.SESSION_PROJECT_KEY);
  location.reload();
}

// ---- Utilities ----

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

// ---- Boot ----

document.addEventListener('DOMContentLoaded', initHub);

// Add shake animation
const style = document.createElement('style');
style.textContent = '@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }';
document.head.appendChild(style);
