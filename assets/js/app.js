/* ============================================================
   XoubiFitness — app.js
   Utilidades globales: tema, navegación, toast, helpers
   ============================================================ */

'use strict';

/* ── TEMA ──────────────────────────────────────────────────── */
const Theme = (() => {
  const KEY = 'xf_theme';
  let current = localStorage.getItem(KEY) || 'dark';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    current = theme;
    localStorage.setItem(KEY, theme);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const icon = btn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons({ nodes: [icon] });
      }
    });
  }

  function toggle() {
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    apply(current);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', toggle);
    });
  }

  return { init, toggle, get: () => current };
})();

/* ── TOAST ─────────────────────────────────────────────────── */
const Toast = (() => {
  let el = null;
  let timer = null;

  function getEl() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(msg, type = 'default', duration = 2400) {
    const t = getEl();
    t.textContent = msg;
    t.className = `toast${type !== 'default' ? ` toast--${type}` : ''}`;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => t.classList.remove('show'), duration);
  }

  return { show };
})();

/* ── OVERLAY / SHEET ────────────────────────────────────────── */
const Sheet = (() => {
  function open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }
  function close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }
  function init() {
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });
    document.querySelectorAll('[data-sheet-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sheet = btn.closest('.overlay');
        if (sheet) sheet.classList.remove('open');
      });
    });
    document.querySelectorAll('[data-sheet-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        open(btn.dataset.sheetOpen);
      });
    });
  }
  return { open, close, init };
})();

/* ── WATER TRACKER ──────────────────────────────────────────── */
const Water = (() => {
  const KEY = 'xf_water_';
  const GOAL_ML = 2500;
  const STEP_ML = 250;
  const DROPS = GOAL_ML / STEP_ML; // 10

  function todayKey() {
    return KEY + new Date().toISOString().slice(0, 10);
  }

  function get() {
    return parseInt(localStorage.getItem(todayKey()) || '0', 10);
  }

  function set(ml) {
    localStorage.setItem(todayKey(), Math.max(0, Math.min(ml, GOAL_ML)));
    render();
  }

  function render() {
    const current = get();
    const filled = current / STEP_ML;
    document.querySelectorAll('[data-water-drops]').forEach(container => {
      container.innerHTML = '';
      for (let i = 0; i < DROPS; i++) {
        const drop = document.createElement('div');
        drop.className = `drop${i < filled ? ' filled' : ''}`;
        drop.addEventListener('click', () => {
          const newVal = (i + 1) * STEP_ML;
          set(current === newVal ? newVal - STEP_ML : newVal);
        });
        container.appendChild(drop);
      }
    });
    document.querySelectorAll('[data-water-ml]').forEach(el => {
      el.textContent = current;
    });
    document.querySelectorAll('[data-water-bar]').forEach(bar => {
      bar.style.width = `${Math.min((current / GOAL_ML) * 100, 100)}%`;
    });
    document.querySelectorAll('[data-water-pct]').forEach(el => {
      el.textContent = Math.round((current / GOAL_ML) * 100);
    });
  }

  function init() {
    render();
  }

  return { init, get, set, GOAL_ML, STEP_ML };
})();

/* ── NAV ACTIVO ─────────────────────────────────────────────── */
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = (item.getAttribute('href') || '').split('/').pop();
    item.classList.toggle('active', href === path || (href === '' && path === 'index.html'));
  });
}

/* ── RING PROGRESS ──────────────────────────────────────────── */
function setRing(svgEl, pct) {
  const fill = svgEl.querySelector('.ring-fill');
  if (!fill) return;
  const r = parseFloat(fill.getAttribute('r') || 45);
  const circ = 2 * Math.PI * r;
  fill.style.strokeDasharray = circ;
  fill.style.strokeDashoffset = circ * (1 - Math.min(pct, 1));
}

/* ── FORMAT ─────────────────────────────────────────────────── */
function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── CHART.JS DEFAULTS ──────────────────────────────────────── */
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  const isDark = Theme.get() === 'dark';
  Chart.defaults.color = isDark ? '#8A8A8A' : '#555555';
  Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = isDark ? '#161616' : '#fff';
  Chart.defaults.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = isDark ? '#F5F5F5' : '#0D0D0D';
  Chart.defaults.plugins.tooltip.bodyColor = isDark ? '#8A8A8A' : '#555555';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

/* ── INIT GLOBAL ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  Theme.init();
  Sheet.init();
  Water.init();
  setActiveNav();
  applyChartDefaults();

  // fecha en elementos marcados
  document.querySelectorAll('[data-today]').forEach(el => {
    el.textContent = capitalize(formatDate(new Date()));
  });
});
