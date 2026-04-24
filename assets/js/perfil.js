/* ============================================================
   XoubiFitness — perfil.js
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

const GOAL_LABELS = {
    lose_weight: 'Perder peso',
    gain_muscle: 'Ganar músculo',
    maintain:    'Mantenimiento',
    endurance:   'Mejorar resistencia',
};

document.addEventListener('DOMContentLoaded', async () => {
    const [user, weightLogs, workouts] = await Promise.all([
        apiFetch('/user'),
        apiFetch('/weight-logs'),
        apiFetch('/workouts'),
    ]);
    if (!user) return;

    renderProfile(user);
    renderStats(user, weightLogs, workouts);
    prefillEditForm(user);

    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
});

/* ── PERFIL ─────────────────────────────────────────────────── */
function renderProfile(user) {
    const initial = (user.name || '?')[0].toUpperCase();

    // Avatar inicial
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = initial;

    // Nombre y email
    const nameEl = document.querySelector('.font-display[style*="1.6rem"]');
    if (nameEl) nameEl.textContent = (user.name || '').toUpperCase();

    const emailEl = document.querySelector('.text-xs.text-secondary.mt-4');
    if (emailEl) emailEl.textContent = user.email || '';

    // Badge objetivo
    const badge = document.querySelector('.badge.badge--accent.mt-8');
    if (badge) badge.textContent = `Objetivo: ${GOAL_LABELS[user.goal] || '—'}`;

    // Card datos
    const details = document.querySelectorAll('.exercise-item__detail');
    if (details[0]) details[0].textContent = user.name || '—';
    if (details[1]) details[1].textContent = user.email || '—';
    if (details[2]) details[2].textContent = user.height_cm ? `${user.height_cm} cm` : '—';
    if (details[3]) details[3].textContent = GOAL_LABELS[user.goal] || '—';
}

/* ── STATS ──────────────────────────────────────────────────── */
function renderStats(user, weightLogs, workouts) {
    const logs = (weightLogs || []).sort((a, b) =>
        new Date(a.date || a.created_at) - new Date(b.date || b.created_at)
    );

    // Edad
    let age = '—';
    if (user.birth_date) {
        const birth = new Date(user.birth_date);
        const today = new Date();
        age = today.getFullYear() - birth.getFullYear() -
            (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    }

    // Peso meta
    const weightGoal = user.weight_goal ? `${user.weight_goal}` : '—';

    const cards = document.querySelectorAll('.grid-3:first-of-type .stat-card');
    if (cards[0]) cards[0].querySelector('.stat-card__value').innerHTML =
        `${user.height_cm || '—'}<span class="unit" style="font-size:.8rem;">cm</span>`;
    if (cards[1]) cards[1].querySelector('.stat-card__value').innerHTML =
        `${age}<span class="unit" style="font-size:.8rem;">años</span>`;
    if (cards[2]) cards[2].querySelector('.stat-card__value').innerHTML =
        `${weightGoal}<span class="unit" style="font-size:.8rem;">kg</span>`;

    // Logros
    const first   = logs.length > 0 ? parseFloat(logs[0].weight_kg ?? logs[0].weight) : null;
    const current = logs.length > 0 ? parseFloat(logs[logs.length - 1].weight_kg ?? logs[logs.length - 1].weight) : null;
    const lost    = first && current ? (first - current).toFixed(1) : '—';

    // Racha
    const dates = [...new Set((workouts || []).map(w =>
        (w.date || w.created_at || '').slice(0, 10)
    ))].sort().reverse();
    let streak = 0;
    let check = new Date(); check.setHours(0,0,0,0);
    for (const d of dates) {
        if (d === check.toISOString().slice(0, 10)) {
            streak++;
            check.setDate(check.getDate() - 1);
        } else break;
    }

    const achievementCards = document.querySelectorAll('.grid-3:last-of-type .stat-card');
    if (achievementCards[0]) achievementCards[0].querySelector('.stat-card__value').innerHTML =
        `${streak}<span class="unit" style="font-size:.7rem;">días</span>`;
    if (achievementCards[1]) achievementCards[1].querySelector('.stat-card__value').textContent =
        (workouts || []).length;
    if (achievementCards[2]) achievementCards[2].querySelector('.stat-card__value').innerHTML =
        `${lost}<span class="unit" style="font-size:.7rem;">kg</span>`;
}

/* ── PREFILL FORMULARIO ─────────────────────────────────────── */
function prefillEditForm(user) {
    const sheet = document.getElementById('sheet-edit-profile');
    if (!sheet) return;

    const inputs = sheet.querySelectorAll('input');
    // nombre, altura, fecha, peso_meta, kcal
    if (inputs[0]) inputs[0].value = user.name || '';
    if (inputs[1]) inputs[1].value = user.height_cm || '';
    if (inputs[2]) inputs[2].value = user.birth_date ? user.birth_date.slice(0, 10) : '';
    if (inputs[3]) inputs[3].value = user.weight_goal || '';
    if (inputs[4]) inputs[4].value = user.kcal_goal || '';

    // Select objetivo
    const select = sheet.querySelector('select');
    if (select && user.goal) {
        const optMap = {
            lose_weight: 'Perder peso',
            gain_muscle: 'Ganar músculo',
            maintain:    'Mantenimiento',
            endurance:   'Mejorar resistencia',
        };
        [...select.options].forEach(opt => {
            opt.selected = opt.text === optMap[user.goal];
        });
    }

    // Cambiar botón guardar para tener id
    const saveBtn = sheet.querySelector('.btn--primary');
    if (saveBtn) saveBtn.id = 'save-profile-btn';
}

/* ── GUARDAR PERFIL ─────────────────────────────────────────── */
async function saveProfile() {
    const sheet = document.getElementById('sheet-edit-profile');
    const inputs = sheet.querySelectorAll('input');
    const select = sheet.querySelector('select');

    const goalMap = {
        'Perder peso':         'lose_weight',
        'Ganar músculo':       'gain_muscle',
        'Mantenimiento':       'maintain',
        'Mejorar resistencia': 'endurance',
    };

    const payload = {
        name:        inputs[0]?.value.trim() || undefined,
        height_cm:   parseInt(inputs[1]?.value) || undefined,
        birth_date:  inputs[2]?.value || undefined,
        weight_goal: parseFloat(inputs[3]?.value) || undefined,
        kcal_goal:   parseInt(inputs[4]?.value) || undefined,
        goal:        goalMap[select?.value] || undefined,
    };

    const btn = document.getElementById('save-profile-btn');
    if (btn) btn.disabled = true;

    const data = await apiFetch('/user', {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    if (btn) btn.disabled = false;

    if (data && (data.id || data.name)) {
        Toast.show('Perfil actualizado', 'success');
        Sheet.close('sheet-edit-profile');
        renderProfile(data);
        renderStats(data, null, null);
        prefillEditForm(data);
    } else {
        Toast.show(data?.message || 'Error al guardar', 'error');
    }
}