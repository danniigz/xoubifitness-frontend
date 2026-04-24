/* ============================================================
   XoubiFitness — dashboard.js
   Carga datos reales desde la API y pinta el dashboard
   ============================================================ */

'use strict';

const API_URL = 'https://fitness-backend-production-724a.up.railway.app/api';

function authHeaders() {
  const token = localStorage.getItem('xf_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function apiFetch(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`, { headers: authHeaders() });
  if (res.status === 401) {
    localStorage.removeItem('xf_token');
    window.location.href = 'login.html';
    return null;
  }
  return res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
});

async function loadDashboard() {
  try {
    const [user, weightLogs, meals, workouts] = await Promise.all([
      apiFetch('/user'),
      apiFetch('/weight-logs'),
      apiFetch('/meals'),
      apiFetch('/workouts'),
    ]);

    if (!user) return;

    renderGreeting(user);
    renderWeight(weightLogs);
    renderNutrition(meals, user);
    renderWorkout(workouts);
    initWeightChart(weightLogs);
    initKcalRing(meals, user);

  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

/* ── SALUDO ─────────────────────────────────────────────────── */
function renderGreeting(user) {
  const el = document.getElementById('greeting-name');
  if (el) el.textContent = (user.name || 'Tú').toUpperCase();
}

/* ── PESO ───────────────────────────────────────────────────── */
function renderWeight(logs) {
  const valEl = document.getElementById('weight-val');
  if (!valEl) return;

  if (!logs || logs.length === 0) {
    valEl.innerHTML = '—<span class="unit">kg</span>';
    const sub = valEl.closest('.stat-card')?.querySelector('.stat-card__sub');
    if (sub) sub.textContent = 'Sin registros aún';
    return;
  }

  // Ordenar por fecha descendente
  const sorted = [...logs].sort((a, b) => new Date(b.date || b.logged_at || b.created_at) - new Date(a.date || a.logged_at || a.created_at));
  const latest = sorted[0];
  const weight = parseFloat(latest.weight_kg ?? latest.weight);
  valEl.innerHTML = `${weight.toFixed(1)}<span class="unit">kg</span>`;

  // Diferencia semanal
  const sub = valEl.closest('.stat-card')?.querySelector('.stat-card__sub');
  if (sub && sorted.length > 1) {
    const weekAgo = sorted.find(l => {
      const d = new Date(l.date || l.logged_at || l.created_at);
      return (Date.now() - d.getTime()) >= 6 * 24 * 60 * 60 * 1000;
    });
    if (weekAgo) {
      const diff = (weight - parseFloat(weekAgo.weight_kg ?? weekAgo.weight)).toFixed(1);
      const sign = diff > 0 ? '+' : '';
      sub.style.color = diff <= 0 ? 'var(--success)' : 'var(--danger)';
      sub.innerHTML = `<i data-lucide="${diff <= 0 ? 'trending-down' : 'trending-up'}" width="12" height="12"></i> ${sign}${diff} kg esta semana`;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sub] });
    }
  } else if (sub) {
    sub.textContent = 'Sin datos previos';
  }
}

/* ── NUTRICIÓN ──────────────────────────────────────────────── */
function renderNutrition(meals, user) {
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = (meals || []).filter(m => (m.date || m.eaten_at || m.created_at || '').slice(0, 10) === today);

  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  todayMeals.forEach(meal => {
    (meal.items || [meal]).forEach(item => {
      kcal    += parseFloat(item.calories   ?? item.kcal ?? 0);
      protein += parseFloat(item.protein_g  ?? item.protein ?? 0);
      carbs   += parseFloat(item.carbs_g    ?? item.carbs ?? 0);
      fat     += parseFloat(item.fat_g      ?? item.fat ?? 0);
    });
  });

  const kcalGoal = parseInt(user.kcal_goal) || 2200;

  // Stat card calorías
  const kcalVal = document.getElementById('kcal-val');
  if (kcalVal) {
    kcalVal.innerHTML = `${Math.round(kcal)}<span class="unit">kcal</span>`;
    const sub = kcalVal.closest('.stat-card')?.querySelector('.stat-card__sub');
    if (sub) sub.innerHTML = `<i data-lucide="target" width="12" height="12"></i> Meta: ${kcalGoal.toLocaleString('es-ES')} kcal`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [kcalVal.closest('.stat-card')] });
  }

  // Macros
  const proteinGoal = Math.round(kcalGoal * 0.30 / 4);
  const carbsGoal   = Math.round(kcalGoal * 0.45 / 4);
  const fatGoal     = Math.round(kcalGoal * 0.25 / 9);

  setMacro('protein', protein, proteinGoal);
  setMacro('carbs',   carbs,   carbsGoal);
  setMacro('fat',     fat,     fatGoal);

  // Ring texto
  const ringInner = document.querySelector('.ring-wrap__inner');
  if (ringInner) {
    ringInner.innerHTML = `
      <span class="font-display" style="font-size:1.5rem;line-height:1;">${Math.round(kcal)}</span>
      <span class="text-xs text-muted">/ ${kcalGoal}</span>
    `;
  }
}

function setMacro(name, val, goal) {
  const row = document.querySelector(`.macro-bar-fill--${name}`)?.closest('.macro-row');
  if (!row) return;
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  row.querySelector(`.macro-bar-fill--${name}`).style.width = `${pct}%`;
  row.querySelector('.macro-val').textContent = `${Math.round(val)} g`;
}

/* ── ENTRENO ────────────────────────────────────────────────── */
function renderWorkout(workouts) {
  const card = document.querySelector('.card .section-title');
  const workoutCard = Array.from(document.querySelectorAll('.card')).find(c =>
      c.querySelector('.section-title')?.textContent.trim() === 'Entreno de hoy'
  );
  if (!workoutCard) return;

  const today = new Date().toISOString().slice(0, 10);
  const todayWorkout = (workouts || []).find(w => (w.date || w.created_at || '').slice(0, 10) === today);

  if (!todayWorkout) {
    const items = workoutCard.querySelectorAll('.exercise-item');
    items.forEach(i => i.remove());
    const badges = workoutCard.querySelector('.flex.gap-8');
    if (badges) badges.remove();
    const placeholder = document.createElement('p');
    placeholder.className = 'text-sm text-muted';
    placeholder.style.padding = '8px 0 4px';
    placeholder.textContent = 'No hay entreno registrado hoy';
    workoutCard.querySelector('.section-header').after(placeholder);
  }
  // Si hay entreno, los datos estáticos del HTML se mantienen por ahora
  // hasta que conectemos la página de entreno en Fase 3
}

/* ── GRÁFICA PESO ───────────────────────────────────────────── */
function initWeightChart(logs) {
  const canvas = document.getElementById('weightChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark  = document.documentElement.getAttribute('data-theme') !== 'light';
  const accent  = '#0066FF';

  let labels, data;

  if (!logs || logs.length === 0) {
    labels = ['Sin datos'];
    data   = [null];
  } else {
    const sorted = [...logs]
        .sort((a, b) => new Date(a.date || a.logged_at || a.created_at) - new Date(b.date || b.logged_at || b.created_at))
        .slice(-7);
    labels = sorted.map(l => {
      const d = new Date(l.date || l.logged_at || l.created_at);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    });
    data = sorted.map(l => parseFloat(l.weight_kg ?? l.weight));
  }

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: accent,
        backgroundColor: isDark ? 'rgba(0,102,255,0.12)' : 'rgba(0,102,255,0.08)',
        borderWidth: 2,
        pointBackgroundColor: accent,
        pointBorderColor: isDark ? '#090909' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 10 } } },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 10 }, callback: v => v + ' kg', maxTicksLimit: 4 },
          suggestedMin: data[0] ? Math.min(...data.filter(Boolean)) - 0.5 : 0,
          suggestedMax: data[0] ? Math.max(...data.filter(Boolean)) + 0.5 : 10,
        }
      },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} kg` } }
      }
    }
  });
}

/* ── RING CALORÍAS ──────────────────────────────────────────── */
function initKcalRing(meals, user) {
  const svg = document.getElementById('kcal-ring');
  if (!svg) return;

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = (meals || []).filter(m => (m.date || m.eaten_at || m.created_at || '').slice(0, 10) === today);
  let kcal = 0;
  todayMeals.forEach(meal => {
    (meal.items || [meal]).forEach(item => {
      kcal += parseFloat(item.calories ?? item.kcal ?? 0);
    });
  });

  const kcalGoal = parseInt(user?.kcal_goal) || 2200;
  const fill = svg.querySelector('.ring-fill');
  if (!fill) return;

  const r     = parseFloat(fill.getAttribute('r') || 42);
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(kcal / kcalGoal, 1);
  fill.style.strokeDasharray  = circ;
  fill.style.strokeDashoffset = circ * (1 - pct);
}