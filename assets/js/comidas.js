/* ============================================================
   XoubiFitness — comidas.js
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

const MEAL_TYPES = [
    { key: 'breakfast', label: 'Desayuno', color: '#F59E0B' },
    { key: 'lunch',     label: 'Comida',   color: '#0066FF' },
    { key: 'snack',     label: 'Merienda', color: '#00C853' },
    { key: 'dinner',    label: 'Cena',     color: '#EF4444' },
];

let currentMeals = [];
let currentUser  = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadComidas();
});

document.addEventListener('click', e => {
    if (e.target.closest('#sheet-add-food .btn--primary')) {
        saveFood();
    }
});

async function loadComidas() {
    const [meals, user] = await Promise.all([
        apiFetch('/meals'),
        apiFetch('/user'),
    ]);
    if (!meals || !user) return;

    currentMeals = meals;
    currentUser  = user;

    const today = new Date().toISOString().slice(0, 10);
    const todayMeals = meals.filter(m => (m.date || m.created_at || '').slice(0, 10) === today);

    renderSummary(todayMeals, user);
    renderMealCards(todayMeals);
}

function renderSummary(meals, user) {
    let kcal = 0, protein = 0, carbs = 0, fat = 0;
    meals.forEach(meal => {
        (meal.items || []).forEach(item => {
            kcal    += parseFloat(item.calories  ?? item.kcal    ?? 0);
            protein += parseFloat(item.protein_g ?? item.protein ?? 0);
            carbs   += parseFloat(item.carbs_g   ?? item.carbs   ?? 0);
            fat     += parseFloat(item.fat_g     ?? item.fat     ?? 0);
        });
    });

    const kcalGoal    = parseInt(user.kcal_goal) || 2200;
    const proteinGoal = Math.round(kcalGoal * 0.30 / 4);
    const carbsGoal   = Math.round(kcalGoal * 0.45 / 4);
    const fatGoal     = Math.round(kcalGoal * 0.25 / 9);
    const remaining   = Math.max(kcalGoal - Math.round(kcal), 0);
    const pct         = Math.min(kcal / kcalGoal, 1);

    const ringFill = document.querySelector('.ring-fill');
    if (ringFill) {
        const circ = 2 * Math.PI * 40;
        ringFill.style.strokeDasharray  = circ;
        ringFill.style.strokeDashoffset = circ * (1 - pct);
    }
    const ringInner = document.querySelector('.ring-wrap__inner');
    if (ringInner) ringInner.innerHTML = `
        <span class="font-display" style="font-size:1.4rem;line-height:1;">${Math.round(kcal)}</span>
        <span class="text-xs text-muted">kcal</span>
    `;

    const nums = document.querySelectorAll('.flex.justify-between span.text-sm');
    if (nums[0]) nums[0].textContent = `${Math.round(kcal).toLocaleString('es-ES')} kcal`;
    if (nums[1]) nums[1].textContent = `${kcalGoal.toLocaleString('es-ES')} kcal`;
    const remEl = document.querySelector('.flex.justify-between span.text-sm.font-bold');
    if (remEl) remEl.textContent = `${remaining.toLocaleString('es-ES')} kcal`;

    setMacroRow('protein', protein, proteinGoal);
    setMacroRow('carbs',   carbs,   carbsGoal);
    setMacroRow('fat',     fat,     fatGoal);
}

function setMacroRow(name, val, goal) {
    const fill = document.querySelector(`.macro-bar-fill--${name}`);
    if (!fill) return;
    fill.style.width = `${goal > 0 ? Math.min((val / goal) * 100, 100) : 0}%`;
    const row = fill.closest('.macro-row');
    if (row) row.querySelector('.macro-val').textContent = `${Math.round(val)} / ${goal} g`;
}

function renderMealCards(todayMeals) {
    document.querySelectorAll('.card[data-meal-type]').forEach(c => c.remove());

    const main = document.querySelector('main .container');

    MEAL_TYPES.forEach(type => {
        const meal  = todayMeals.find(m => m.type === type.key || m.meal_type === type.key);
        const items = meal?.items || [];
        const kcal  = items.reduce((s, i) => s + parseFloat(i.calories ?? i.kcal ?? 0), 0);

        const card = document.createElement('div');
        card.className = 'card mb-10';
        card.dataset.mealType = type.key;
        card.innerHTML = `
            <div class="meal-type-header">
                <div class="meal-type-dot" style="background:${type.color};"></div>
                <span class="meal-type-name">${type.label}</span>
                <span class="meal-type-kcal">${Math.round(kcal)} kcal</span>
                <button class="btn--icon" style="width:28px;height:28px;margin-left:8px;"
                    onclick="openAddFood('${type.key}')">
                    <i data-lucide="plus" width="13" height="13"></i>
                </button>
            </div>
            ${items.length === 0
            ? `<p class="text-xs text-muted" style="padding:4px 0 2px;">Sin alimentos registrados</p>`
            : items.map((item, i) => `
                    <div class="meal-food-row"${i === items.length - 1 ? ' style="border:none;"' : ''}>
                        <span class="meal-food-row__name">${item.food_name ?? item.name ?? 'Alimento'}</span>
                        <span class="meal-food-row__qty">${item.quantity_g ?? item.quantity ?? '—'} g</span>
                        <span class="meal-food-row__kcal">${Math.round(item.calories ?? item.kcal ?? 0)} kcal</span>
                    </div>
                `).join('')
        }
        `;

        const anchor = document.getElementById('meals-anchor');
        if (anchor) {
            main.insertBefore(card, anchor);
        } else {
            main.appendChild(card);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [card] });
    });
}

function openAddFood(mealType) {
    const select = document.querySelector('#sheet-add-food select');
    if (select) select.value = mealType;
    Sheet.open('sheet-add-food');
}

async function saveFood() {
    const foodName = document.getElementById('food-name')?.value.trim();
    if (!foodName) { Toast.show('Introduce el nombre del alimento', 'error'); return; }

    const mealType = document.querySelector('#sheet-add-food select')?.value;
    const today = new Date().toISOString().slice(0, 10);

    const btn = document.querySelector('#sheet-add-food .btn--primary');
    if (btn) btn.disabled = true;

    // Primero buscar o crear la meal del tipo seleccionado para hoy
    let meal = currentMeals.find(m =>
        (m.type === mealType) &&
        (m.date || m.created_at || '').slice(0, 10) === today
    );

    if (!meal) {
        meal = await apiFetch('/meals', {
            method: 'POST',
            body: JSON.stringify({ type: mealType, date: today })
        });
    }

    if (!meal?.id) {
        Toast.show('Error al crear la comida', 'error');
        if (btn) btn.disabled = false;
        return;
    }

    // Luego añadir el item a esa meal
    const payload = {
        meal_id:    meal.id,
        food_name:  foodName,
        quantity_g: parseFloat(document.getElementById('food-qty')?.value)     || null,
        calories:   parseFloat(document.getElementById('food-kcal')?.value)    || null,
        protein_g:  parseFloat(document.getElementById('food-protein')?.value) || null,
        carbs_g:    parseFloat(document.getElementById('food-carbs')?.value)   || null,
        fat_g:      parseFloat(document.getElementById('food-fat')?.value)     || null,
    };

    const data = await apiFetch('/meal-items', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (btn) btn.disabled = false;
    if (!data) return;

    if (data.id || data.meal_item_id) {
        Toast.show('Alimento añadido', 'success');
        Sheet.close('sheet-add-food');
        ['food-name','food-qty','food-kcal','food-protein','food-carbs','food-fat']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        await loadComidas();
    } else {
        Toast.show(data.message || 'Error al guardar', 'error');
    }
}