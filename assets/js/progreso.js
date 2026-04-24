/* ============================================================
   XoubiFitness — progreso.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('new-weight-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('save-weight-btn')?.addEventListener('click', saveWeight);

  // Period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChart(btn.dataset.period);
    });
  });

  initWeightChartBig('week');
});

const DATASETS = {
  week:  { labels: ['20 abr','21 abr','22 abr','23 abr','24 abr','25 abr','26 abr'], data: [62.9,62.8,62.7,62.8,62.5,62.4,62.4] },
  month: { labels: ['1 abr','5 abr','10 abr','15 abr','20 abr','26 abr'], data: [63.8,63.5,63.2,63.0,62.7,62.4] },
  '3m':  { labels: ['Ene','Feb','Mar','Abr'], data: [66.0,64.8,63.5,62.4] },
  all:   { labels: ['Oct','Nov','Dic','Ene','Feb','Mar','Abr'], data: [68.0,67.2,66.1,66.0,64.8,63.5,62.4] },
};

let weightChart = null;

function initWeightChartBig(period) {
  const canvas = document.getElementById('weightChartBig');
  if (!canvas || typeof Chart === 'undefined') return;
  const { labels, data } = DATASETS[period];
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

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
          suggestedMin: Math.min(...data) - 0.8,
          suggestedMax: Math.max(...data) + 0.8,
        }
      },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} kg` } }
      }
    }
  });
}

function updateChart(period) {
  if (!weightChart) { initWeightChartBig(period); return; }
  const { labels, data } = DATASETS[period];
  weightChart.data.labels = labels;
  weightChart.data.datasets[0].data = data;
  weightChart.options.scales.y.suggestedMin = Math.min(...data) - 0.8;
  weightChart.options.scales.y.suggestedMax = Math.max(...data) + 0.8;
  weightChart.update();
}

function saveWeight() {
  const val = document.getElementById('new-weight-val')?.value;
  if (!val) { Toast.show('Introduce tu peso', 'error'); return; }
  Toast.show(`${val} kg guardado`, 'success');
  Sheet.close('sheet-add-weight');
  // Fase 3: POST /api/weight-logs
}
