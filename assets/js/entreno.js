/* ============================================================
   XoubiFitness — entreno.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Fecha de hoy por defecto en el input
  const dateInput = document.getElementById('new-workout-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('add-exercise-btn')?.addEventListener('click', addExerciseRow);
  document.getElementById('save-workout-btn')?.addEventListener('click', saveWorkout);
});

let exerciseCount = 0;

function addExerciseRow() {
  exerciseCount++;
  const list = document.getElementById('exercises-list');
  const row = document.createElement('div');
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
      <input type="text" class="form-input" placeholder="Nombre del ejercicio" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
    <div class="form-row">
      <input type="number" class="form-input" placeholder="Series" style="font-size:.85rem;padding:8px 12px;"/>
      <input type="number" class="form-input" placeholder="Reps" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
    <div class="mt-8">
      <input type="number" class="form-input w-full" placeholder="Peso (kg) — deja vacío si es peso corporal" style="font-size:.85rem;padding:8px 12px;"/>
    </div>
  `;
  list.appendChild(row);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [row] });
}

function toggleWorkout(header) {
  const entry  = header.closest('.workout-entry');
  const detail = entry.querySelector('.workout-detail');
  const icon   = header.querySelector('.chevron-icon');
  if (!detail) return;
  const open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : 'block';
  if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

function saveWorkout() {
  const name = document.getElementById('new-workout-name')?.value.trim();
  if (!name) { Toast.show('Ponle un nombre al entreno', 'error'); return; }
  Toast.show('Entreno guardado', 'success');
  Sheet.close('sheet-nuevo-entreno');
  // En Fase 3: POST a la API Laravel
}
