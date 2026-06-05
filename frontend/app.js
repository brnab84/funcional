// Functional WOD - Frontend App

const API = '';
let currentWorkouts = []; // 3 variants for today
let activeVariant = 1;
let historyPage = 1;

// ── UTILS ──────────────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function modalityBadgeClass(modality) {
  const m = (modality || '').toUpperCase();
  if (m.includes('EMOM')) return 'badge-emom';
  if (m.includes('OTM')) return 'badge-otm';
  if (m.includes('AMRAP') && !m.includes('MINI')) return 'badge-amrap';
  if (m.includes('FOR TIME') || m.includes('COMPLETAR')) return 'badge-fortime';
  if (m.includes('ROUNDS')) return 'badge-rounds';
  if (m.includes('TABATA')) return 'badge-tabata';
  if (m.includes('DESCENDING')) return 'badge-descending';
  if (m.includes('ZONES')) return 'badge-zones';
  if (m.includes('MINI')) return 'badge-miniamrap';
  return 'badge-rounds';
}

function catDot(cat) {
  return `<span class="ex-category-dot dot-${cat || 'lower'}"></span>`;
}

function showAiStatus(msg, isError = false) {
  const el = document.getElementById('ai-status');
  el.textContent = msg;
  el.className = `ai-status${isError ? ' error' : ''}`;
}

function hideAiStatus() {
  document.getElementById('ai-status').className = 'ai-status hidden';
}

// ── RENDER WORKOUT ──────────────────────────────────────
function renderWorkout(workout) {
  if (!workout) {
    return `<div class="loading-state"><p>No workout found</p></div>`;
  }

  let html = `<div class="workout-card">`;

  // Warmup block
  if (workout.warmup && workout.warmup.exercises && workout.warmup.exercises.length) {
    html += `
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-badge badge-warmup">E.C.</span>
          <span class="card-config">${workout.warmup.rounds || 3} Rounds</span>
        </div>
      </div>
      <div class="exercise-table">
        ${workout.warmup.exercises.map((ex, i) => `
          <div class="ex-row">
            <span class="ex-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="ex-name">${catDot(ex.category)}${ex.name}</span>
            <span class="ex-reps">${ex.reps || ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Main blocks
  if (workout.blocks && workout.blocks.length) {
    workout.blocks.forEach(block => {
      const badgeClass = modalityBadgeClass(block.modality);
      const isAi = workout.source === 'ai';
      
      html += `
        <div class="section-label">Block ${block.label}</div>
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-badge ${badgeClass}">${block.modality}</span>
            <span class="card-config">${block.config || ''}</span>
          </div>
          ${isAi ? `<span class="card-source-ai">AI</span>` : ''}
        </div>
        <div class="exercise-table">
          ${block.exercises.map((ex, i) => `
            <div class="ex-row">
              <span class="ex-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="ex-name">${catDot(ex.category)}${ex.name}</span>
              <span class="ex-reps">${ex.reps || ''}</span>
            </div>
          `).join('')}
        </div>
      `;
    });
  }

  html += `</div>`;
  return html;
}

// ── LOAD TODAY ──────────────────────────────────────────
async function loadToday(force = false) {
  const display = document.getElementById('workout-display');
  display.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Generating workouts...</p></div>`;

  try {
    let url = `${API}/api/workouts/today`;
    if (force) {
      // Force regeneration by deleting today first
      await fetch(`${API}/api/workouts/today/regenerate`, { method: 'POST' }).catch(() => {});
    }

    const res = await fetch(url);
    const data = await res.json();
    currentWorkouts = data.workouts || [];

    if (currentWorkouts.length === 0) {
      display.innerHTML = `<div class="empty-state"><h3>No workouts</h3><p>Seed the exercise library first</p></div>`;
      return;
    }

    updateVariantTabs();
    showVariant(1);
  } catch (err) {
    display.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function updateVariantTabs() {
  document.querySelectorAll('.vtab').forEach((tab, i) => {
    const v = i + 1;
    const workout = currentWorkouts.find(w => w.variant === v);
    tab.classList.remove('active', 'approved');
    if (workout?.status === 'approved') tab.classList.add('approved');
  });
}

function showVariant(v) {
  activeVariant = v;
  
  document.querySelectorAll('.vtab').forEach((tab, i) => {
    tab.classList.toggle('active', i + 1 === v);
  });

  const workout = currentWorkouts.find(w => w.variant === v);
  const display = document.getElementById('workout-display');
  display.innerHTML = renderWorkout(workout);

  const approveBtn = document.getElementById('btn-approve');
  if (workout?.status === 'approved') {
    approveBtn.textContent = '✓ Approved';
    approveBtn.disabled = true;
  } else {
    approveBtn.textContent = '✓ Approve this workout';
    approveBtn.disabled = false;
  }
}

// ── APPROVE ─────────────────────────────────────────────
async function approveWorkout() {
  const workout = currentWorkouts.find(w => w.variant === activeVariant);
  if (!workout) return;

  const btn = document.getElementById('btn-approve');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API}/api/workouts/${workout._id}/approve`, { method: 'PUT' });
    const data = await res.json();

    // Update local state
    currentWorkouts = currentWorkouts.map(w => {
      if (w._id === workout._id) return { ...w, status: 'approved' };
      return { ...w, status: w.status === 'approved' ? 'rejected' : w.status };
    });

    updateVariantTabs();
    btn.textContent = '✓ Approved';
    showAiStatus('Workout saved to history!');
    setTimeout(hideAiStatus, 3000);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '✓ Approve this workout';
    showAiStatus('Error saving: ' + err.message, true);
  }
}

// ── AI VARIANT ──────────────────────────────────────────
async function generateAiVariant() {
  const btn = document.getElementById('btn-ai');
  btn.disabled = true;
  showAiStatus('Asking AI coach...');

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${API}/api/workouts/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, variant: 3 })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    // Replace variant 3
    const idx = currentWorkouts.findIndex(w => w.variant === 3);
    if (idx >= 0) currentWorkouts[idx] = data.workout;
    else currentWorkouts.push(data.workout);

    // Switch to variant 3
    document.querySelectorAll('.vtab')[2].textContent = 'AI Option';
    showVariant(3);
    showAiStatus('AI workout ready! Review and approve if you like it.');
    setTimeout(hideAiStatus, 5000);
  } catch (err) {
    showAiStatus('AI error: ' + err.message + '. Using local generation.', true);
    setTimeout(hideAiStatus, 5000);
  } finally {
    btn.disabled = false;
  }
}

// ── HISTORY ─────────────────────────────────────────────
async function loadHistory(page = 1) {
  historyPage = page;
  const list = document.getElementById('history-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  try {
    const [histRes, statsRes] = await Promise.all([
      fetch(`${API}/api/workouts/history?page=${page}&limit=20`),
      fetch(`${API}/api/workouts/stats`)
    ]);
    const histData = await histRes.json();
    const statsData = await statsRes.json();

    // Stats
    const statsEl = document.getElementById('history-stats');
    statsEl.innerHTML = `
      <span class="stat-chip">Total: <span>${statsData.total || 0}</span></span>
      <span class="stat-chip">This month: <span>${statsData.lastMonth || 0}</span></span>
    `;

    // List
    if (!histData.workouts?.length) {
      list.innerHTML = `<div class="empty-state"><h3>No History Yet</h3><p>Approve today's workout to start building your log</p></div>`;
      return;
    }

    list.innerHTML = histData.workouts.map(w => `
      <button class="history-item" onclick="openHistoryModal('${w._id}')">
        <span class="hist-date">${w.date}</span>
        <div class="hist-modalities">
          ${w.blocks.map(b => `<span class="hist-badge">${b.modality}</span>`).join('')}
          ${w.source === 'ai' ? '<span class="hist-badge" style="color:var(--blue)">AI</span>' : ''}
        </div>
        <span class="hist-arrow">›</span>
      </button>
    `).join('');

    // Pagination
    const pag = document.getElementById('history-pagination');
    if (histData.pages > 1) {
      let pHtml = '';
      for (let p = 1; p <= histData.pages; p++) {
        pHtml += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="loadHistory(${p})">${p}</button>`;
      }
      pag.innerHTML = pHtml;
    } else {
      pag.innerHTML = '';
    }
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// History modal
const _historyCache = {};

async function openHistoryModal(id) {
  let workout = _historyCache[id];
  if (!workout) {
    // Find from current history DOM or fetch
    const res = await fetch(`${API}/api/workouts/history?limit=100`);
    const data = await res.json();
    workout = data.workouts.find(w => w._id === id);
    if (workout) _historyCache[id] = workout;
  }
  if (!workout) return;

  document.getElementById('modal-content').innerHTML = `
    <p class="eyebrow" style="margin-bottom:12px">${workout.date}</p>
    ${renderWorkout(workout)}
  `;
  document.getElementById('modal').classList.remove('hidden');
}

// ── LIBRARY ─────────────────────────────────────────────
async function loadLibrary() {
  const list = document.getElementById('exercise-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`${API}/api/exercises`);
    const data = await res.json();
    const exercises = data.exercises || [];

    if (!exercises.length) {
      list.innerHTML = `<div class="empty-state"><h3>Empty Library</h3><p>Click "Seed defaults" to load exercises</p></div>`;
      return;
    }

    list.innerHTML = exercises.map(ex => `
      <div class="ex-pill" id="ex-${ex._id}">
        <span class="ex-pill-name">
          <span class="ex-category-dot dot-${ex.category}"></span>
          ${ex.name}
        </span>
        <button class="ex-pill-delete" onclick="deleteExercise('${ex._id}')" title="Remove">×</button>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function addExercise() {
  const name = document.getElementById('ex-name').value.trim();
  const category = document.getElementById('ex-category').value;
  if (!name) return;

  try {
    const res = await fetch(`${API}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category })
    });
    if (!res.ok) throw new Error('Failed');
    document.getElementById('ex-name').value = '';
    loadLibrary();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteExercise(id) {
  await fetch(`${API}/api/exercises/${id}`, { method: 'DELETE' });
  document.getElementById(`ex-${id}`)?.remove();
}

async function seedDefaults() {
  const btn = document.getElementById('btn-seed');
  btn.textContent = 'Seeding...';
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/api/exercises/seed`, { method: 'POST' });
    const data = await res.json();
    loadLibrary();
    btn.textContent = data.message === 'Already seeded' ? 'Already seeded' : `✓ Seeded ${data.count} exercises`;
  } catch (err) {
    btn.textContent = 'Error';
  }
  setTimeout(() => { btn.textContent = 'Seed defaults'; btn.disabled = false; }, 2000);
}

// ── NAVIGATION ───────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');

  if (name === 'history') loadHistory();
  if (name === 'library') loadLibrary();
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Date display
  document.getElementById('today-date').textContent = todayStr();

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Variant tabs
  document.querySelectorAll('.vtab').forEach((tab, i) => {
    tab.addEventListener('click', () => showVariant(i + 1));
  });

  // Approve
  document.getElementById('btn-approve').addEventListener('click', approveWorkout);

  // Regenerate
  document.getElementById('btn-regenerate').addEventListener('click', async () => {
    const today = new Date().toISOString().split('T')[0];
    // Delete today's workouts first
    await Promise.all(
      currentWorkouts.map(w => fetch(`${API}/api/workouts/${w._id}/reject`, { method: 'PUT' }))
    );
    currentWorkouts = [];
    loadToday();
  });

  // AI
  document.getElementById('btn-ai').addEventListener('click', generateAiVariant);

  // Library
  document.getElementById('btn-add-ex').addEventListener('click', addExercise);
  document.getElementById('ex-name').addEventListener('keydown', e => { if (e.key === 'Enter') addExercise(); });
  document.getElementById('btn-seed').addEventListener('click', seedDefaults);

  // Modal
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
  });
  document.getElementById('modal-overlay').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
  });

  // Load today
  loadToday();
});
