/* ============================================================
   XoubiFitness — dashboard.js
   Lógica específica del dashboard: gráfica de peso
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initWeightChart();
  initKcalRing();
});

function initWeightChart() {
  const canvas = document.getElementById('weightChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Datos de prueba — se sustituirán por datos de la API en Fase 3
  const labels = ['14 abr', '16 abr', '18 abr', '20 abr', '22 abr', '24 abr', '26 abr'];
  const data   = [63.2, 63.0, 62.9, 62.7, 62.8, 62.5, 62.4];

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const accent = '#0066FF';

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: accent,
        backgroundColor: isDark
          ? 'rgba(0,102,255,0.12)'
          : 'rgba(0,102,255,0.08)',
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
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, font: { size: 10 } }
        },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 10 },
            callback: v => v + ' kg',
            maxTicksLimit: 4
          },
          suggestedMin: Math.min(...data) - 0.5,
          suggestedMax: Math.max(...data) + 0.5,
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} kg`
          }
        }
      }
    }
  });
}

function initKcalRing() {
  const svg = document.getElementById('kcal-ring');
  if (!svg) return;
  // Ring ya está dibujado en el HTML con valores estáticos de ejemplo
  // En Fase 3 se calculará dinámicamente desde la API
}
