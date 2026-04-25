/* ============================================================
   XoubiFitness — entreno.js
   ============================================================ */

'use strict';

const API_URL = 'https://fitness-backend-production-724a.up.railway.app/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('xf_token')}`
  };
}

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: authHeaders(),
    ...options
  });
  if (res.status === 401) {
    localStorage.removeItem('xf_token');
    window.location.href = '../login.html';
    return null;
  }
  return res.json();
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('new-workout-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('add-exercise-btn')?.addEventListener('click', addExerciseRow);
  document.getElementById('save-workout-btn')?.addEventListener('click', saveWorkout);

  await loadWorkouts();
});

/* ── CARGAR HISTORIAL ───────────────────────────────────────── */
async function loadWorkouts() {
  const workouts = await apiFetch('/workouts');
  if (!workouts) return;

  renderStats(workouts);
  renderList(workouts);
}

function renderStats(workouts) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // lunes
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = workouts.filter(w => new Date(w.date || w.created_at) >= weekStart);
  const totalMin = thisWeek.reduce((acc, w) => acc + (parseInt(w.duration_min) || 0), 0);

  // Racha — días consecutivos con entreno
  const dates = [...new Set(workouts.map(w => (w.date || w.created_at || '').slice(0, 10)))].sort().reverse();
  let streak = 0;
  let check = new Date();
  check.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const checkStr = check.toISOString().slice(0, 10);
    if (d === checkStr) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else break;
  }

  const cards = document.querySelectorAll('.grid-3 .stat-card');
  if (cards[0]) cards[0].querySelector('.stat-card__value').innerHTML =
      `${thisWeek.length}<span class="unit" style="font-size:.85rem;">entrenos</span>`;
  if (cards[1]) cards[1].querySelector('.stat-card__value').innerHTML =
      `${totalMin}<span class="unit" style="font-size:.85rem;">min</span>`;
  if (cards[2]) cards[2].querySelector('.stat-card__value').innerHTML =
      `${streak}<span class="unit" style="font-size:.85rem;">días</span>`;
}

function renderList(workouts) {
  const container = document.getElementById('workout-list');
  if (!container) return;

  // Últimos 7 días
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const recent = workouts
      .filter(w => new Date(w.date || w.created_at) >= cutoff)
      .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  if (recent.length === 0) {
    container.innerHTML = `<p class="text-sm text-muted" style="padding:8px 0;">No hay entrenos en los últimos 7 días</p>`;
    return;
  }

  container.innerHTML = recent.map((w, i) => {
    const date     = new Date(w.date || w.created_at);
    const dateStr  = relativeDate(date);
    const dur = w.duration_min ? `· ${w.duration_min} min` : '';
    const exercises = (w.exercises || []);
    const isFirst  = i === 0;

    const exerciseRows = exercises.map((ex, j) => `
      <div class="exercise-item"${j === exercises.length - 1 ? ' style="border:none;"' : ''}>
        <div class="exercise-item__icon"><i data-lucide="dumbbell" width="16" height="16"></i></div>
        <div class="exercise-item__info">
          <div class="exercise-item__name">${ex.exercise_name || ex.name || 'Ejercicio'}</div>
          <div class="exercise-item__detail">${ex.sets ?? '—'} × ${ex.reps ?? '—'}${ex.weight_kg ? ` @ ${ex.weight_kg} kg` : ''}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="workout-entry">
        <div class="flex items-center justify-between mb-12" style="cursor:pointer;" onclick="toggleWorkout(this)">
          <div>
            <div class="font-semibold" style="font-size:.95rem;">${w.name || 'Entreno'}</div>
            <div class="text-xs text-secondary mt-4">${dateStr} ${dur}</div>
          </div>
          <div class="flex items-center gap-8">
            <span class="badge badge--success">
              <i data-lucide="check" width="10" height="10"></i>
              Completado
            </span>
            <i data-lucide="chevron-down" width="16" height="16" class="chevron-icon" style="color:var(--text-muted);transition:transform .2s;"></i>
          </div>
        </div>
        <div class="workout-detail"${isFirst ? '' : ' style="display:none;"'}>
          ${exerciseRows || '<p class="text-xs text-muted">Sin ejercicios registrados</p>'}
        </div>
        ${i < recent.length - 1 ? '<div class="divider" style="margin:12px 0;"></div>' : ''}
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

function relativeDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d     = new Date(date); d.setHours(0,0,0,0);
  const diff  = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

/* ── AÑADIR FILA DE EJERCICIO ───────────────────────────────── */
let exerciseCount = 0;

function addExerciseRow() {
  exerciseCount++;
  const list = document.getElementById('exercises-list');
  const row  = document.createElement('div');
  row.className = 'card mb-8';
  row.style.padding = '12px';
  row.innerHTML = `
    <div class="flex items-center justify-between mb-8">
      <span class="text-xs font-semibold text-muted" style="letter-spacing:.06em;text-transform:uppercase;">Ejercicio ${exerciseCount}</span>
      <button onclick="this.closest('.card').remove()" style="color:var(--text-muted);">
        <i data-lucide="x" width="14" height="14"></i>
      </button>
    </div>
    <div class="form-group" style="margin-bottom:8px;">
      <input type="text" class="form-input ex-name" placeholder="Nombre del ejercicio" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
    <div class="form-row">
      <input type="number" class="form-input ex-sets" placeholder="Series" style="font-size:.85rem;padding:8px 12px;"/>
      <input type="number" class="form-input ex-reps" placeholder="Reps" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
    <div class="mt-8">
      <input type="number" class="form-input ex-weight" placeholder="Peso (kg) — deja vacío si es peso corporal" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
  `;
  list.appendChild(row);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [row] });
}

/* ── GUARDAR ENTRENO ────────────────────────────────────────── */
async function saveWorkout() {
  const name = document.getElementById('new-workout-name')?.value.trim();
  if (!name) { Toast.show('Ponle un nombre al entreno', 'error'); return; }

  const exercises = [...document.querySelectorAll('#exercises-list .card')].map(row => ({
    exercise_name:      row.querySelector('.ex-name')?.value.trim() || 'Ejercicio',
    sets:      parseInt(row.querySelector('.ex-sets')?.value) || null,
    reps:      parseInt(row.querySelector('.ex-reps')?.value) || null,
    weight_kg: parseFloat(row.querySelector('.ex-weight')?.value) || null,
  }));

  const payload = {
    name,
    date:               document.getElementById('new-workout-date')?.value,
    duration_min: parseInt(document.getElementById('new-workout-dur')?.value) || null,
    exercises,
  };

  const btn = document.getElementById('save-workout-btn');
  btn.disabled = true;

  const data = await apiFetch('/workouts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  btn.disabled = false;

  if (!data) return;

  if (data.id) {
    Toast.show('Entreno guardado', 'success');
    Sheet.close('sheet-nuevo-entreno');
    document.getElementById('new-workout-name').value = '';
    document.getElementById('exercises-list').innerHTML = '';
    exerciseCount = 0;
    await loadWorkouts();
  } else {
    Toast.show(data.message || 'Error al guardar', 'error');
  }
}

/* ── TOGGLE EXPAND ──────────────────────────────────────────── */
function toggleWorkout(header) {
  const entry  = header.closest('.workout-entry');
  const detail = entry.querySelector('.workout-detail');
  const icon   = header.querySelector('.chevron-icon');
  if (!detail) return;
  const open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : 'block';
  if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}