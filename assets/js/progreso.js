/* ============================================================
   XoubiFitness — progreso.js
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

let weightChart = null;
let allLogs = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('new-weight-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('save-weight-btn')?.addEventListener('click', saveWeight);

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChart(btn.dataset.period);
    });
  });

  await loadProgreso();
});

async function loadProgreso() {
  const [logs, user] = await Promise.all([
    apiFetch('/weight-logs'),
    apiFetch('/user'),
  ]);
  if (!logs || !user) return;

  allLogs = logs.sort((a, b) =>
      new Date(a.date || a.created_at) - new Date(b.date || b.created_at)
  );
  currentUser = user;

  renderStats(allLogs, user);
  renderHistory(allLogs);
  renderIMC(allLogs, user);
  initWeightChartBig('week');
}

/* ── STATS ──────────────────────────────────────────────────── */
function renderStats(logs, user) {
  const cards = document.querySelectorAll('.grid-3 .stat-card');
  if (!cards.length) return;

  if (logs.length === 0) {
    cards[0].querySelector('.stat-card__value').innerHTML = '—<span class="unit" style="font-size:.8rem;">kg</span>';
    cards[1].querySelector('.stat-card__value').innerHTML = '—<span class="unit" style="font-size:.8rem;">kg</span>';
    cards[2].querySelector('.stat-card__value').innerHTML = '—<span class="unit" style="font-size:.8rem;">kg</span>';
    return;
  }

  const current = parseFloat(logs[0].weight_kg ?? logs[0].weight);
  const first   = parseFloat(logs[logs.length - 1].weight_kg ?? logs[logs.length - 1].weight);
  const diff    = (current - first).toFixed(1);
  const sign    = diff > 0 ? '+' : '';

  cards[0].querySelector('.stat-card__value').innerHTML =
      `${first.toFixed(1)}<span class="unit" style="font-size:.8rem;">kg</span>`;
  cards[1].querySelector('.stat-card__value').innerHTML =
      `${current.toFixed(1)}<span class="unit" style="font-size:.8rem;">kg</span>`;
  cards[2].querySelector('.stat-card__value').innerHTML =
      `${sign}${diff}<span class="unit" style="font-size:.8rem;">kg</span>`;
  cards[2].querySelector('.stat-card__value').style.color =
      diff <= 0 ? 'var(--success)' : 'var(--danger)';
}

/* ── IMC ────────────────────────────────────────────────────── */
function renderIMC(logs, user) {
  if (!logs.length || !user.height_cm) return;

  const weight  = parseFloat(logs[logs.length - 1].weight_kg ?? logs[logs.length - 1].weight);
  const heightM = user.height_cm / 100;
  const bmi     = (weight / (heightM * heightM)).toFixed(1);

  let label = 'Normal', badgeClass = 'badge--success', color = 'var(--success)';
  if (bmi < 18.5)      { label = 'Bajo peso';  badgeClass = 'badge--warning'; color = 'var(--warning)'; }
  else if (bmi >= 25)  { label = 'Sobrepeso';  badgeClass = 'badge--warning'; color = 'var(--warning)'; }
  else if (bmi >= 30)  { label = 'Obesidad';   badgeClass = 'badge--danger';  color = 'var(--danger)'; }

  const bmiVal = document.querySelector('.font-display[style*="2.8rem"]');
  if (bmiVal) { bmiVal.textContent = bmi; bmiVal.style.color = color; }

  const badge = document.querySelector('.card .badge');
  if (badge) { badge.textContent = label; badge.className = `badge ${badgeClass}`; }

  // Barra IMC (escala 15-35)
  const pct = Math.min(Math.max(((bmi - 15) / 20) * 100, 0), 100);
  const bar = document.querySelector('.progress-bar__fill--success');
  if (bar) bar.style.width = `${pct}%`;
}

/* ── HISTORIAL ──────────────────────────────────────────────── */
function renderHistory(logs) {
  const container = document.getElementById('weight-history');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted">Sin registros de peso aún</p>';
    return;
  }

  const recent = [...logs].reverse().slice(0, 10);

  container.innerHTML = recent.map((log, i) => {
    const weight = parseFloat(log.weight_kg ?? log.weight);
    const prev   = recent[i + 1] ? parseFloat(recent[i + 1].weight_kg ?? recent[i + 1].weight) : null;
    const diff   = prev !== null ? (weight - prev).toFixed(1) : null;

    let badgeClass = 'badge--neutral', diffText = '–';
    if (diff !== null) {
      const n = parseFloat(diff);
      if (n < 0)      { badgeClass = 'badge--success'; diffText = diff; }
      else if (n > 0) { badgeClass = 'badge--warning';  diffText = `+${diff}`; }
      else            { diffText = '0.0'; }
    }

    const date    = new Date(log.date || log.created_at);
    const dateStr = relativeDate(date);
    const isLast  = i === recent.length - 1;

    return `
            <div class="exercise-item"${isLast ? ' style="border:none;"' : ''}>
                <div class="exercise-item__icon" style="background:var(--accent-dim);">
                    <i data-lucide="scale" width="16" height="16"></i>
                </div>
                <div class="exercise-item__info">
                    <div class="exercise-item__name">${weight.toFixed(1)} kg</div>
                    <div class="exercise-item__detail">${dateStr}</div>
                </div>
                <span class="badge ${badgeClass}">${diffText}</span>
            </div>
        `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

function relativeDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 0)  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `Hace ${diff} días`;
}

/* ── GRÁFICA ────────────────────────────────────────────────── */
function filterByPeriod(logs, period) {
  const now = new Date();
  const cutoffs = { week: 7, month: 30, '3m': 90 };
  if (period === 'all') return logs;
  const days = cutoffs[period] || 7;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return logs.filter(l => new Date(l.date || l.created_at) >= cutoff);
}

function initWeightChartBig(period) {
  const canvas = document.getElementById('weightChartBig');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const filtered = filterByPeriod(allLogs, period);

  let labels, data;
  if (filtered.length === 0) {
    labels = ['Sin datos'];
    data   = [null];
  } else {
    labels = filtered.map(l => {
      const d = new Date(l.date || l.created_at);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    });
    data = filtered.map(l => parseFloat(l.weight_kg ?? l.weight));
  }

  if (weightChart) weightChart.destroy();

  weightChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#0066FF',
        backgroundColor: isDark ? 'rgba(0,102,255,0.1)' : 'rgba(0,102,255,0.06)',
        borderWidth: 2.5,
        pointBackgroundColor: '#0066FF',
        pointBorderColor: isDark ? '#090909' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 10 }, callback: v => v + ' kg', maxTicksLimit: 5 },
          suggestedMin: data[0] ? Math.min(...data.filter(Boolean)) - 0.8 : 0,
          suggestedMax: data[0] ? Math.max(...data.filter(Boolean)) + 0.8 : 10,
        }
      },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} kg` } }
      }
    }
  });
}

function updateChart(period) {
  initWeightChartBig(period);
}

/* ── GUARDAR PESO ───────────────────────────────────────────── */
async function saveWeight() {
  const val = document.getElementById('new-weight-val')?.value;
  if (!val) { Toast.show('Introduce tu peso', 'error'); return; }

  const payload = {
    weight_kg: parseFloat(val),
    date:      document.getElementById('new-weight-date')?.value,
  };

  const btn = document.getElementById('save-weight-btn');
  if (btn) btn.disabled = true;

  const data = await apiFetch('/weight-logs', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (btn) btn.disabled = false;
  if (!data) return;

  if (data.id) {
    Toast.show(`${val} kg guardado`, 'success');
    Sheet.close('sheet-add-weight');
    document.getElementById('new-weight-val').value = '';
    await loadProgreso();
  } else {
    Toast.show(data.message || 'Error al guardar', 'error');
  }
}