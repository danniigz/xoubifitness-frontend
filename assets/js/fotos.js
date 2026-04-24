/* ============================================================
   XoubiFitness — fotos.js
   ============================================================ */

'use strict';

const API_URL = 'https://fitness-backend-production-724a.up.railway.app/api';

function authHeaders(isJson = true) {
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('xf_token')}`
    };
    if (isJson) headers['Content-Type'] = 'application/json';
    return headers;
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

let selectedPhotoB64 = null;

document.addEventListener('DOMContentLoaded', async () => {
    const dateInput = document.getElementById('photo-date');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    // Upload area
    const area  = document.getElementById('photo-upload-area');
    const input = document.getElementById('photo-input');
    if (area && input) {
        area.addEventListener('click', () => input.click());
        input.addEventListener('change', handlePhotoSelected);
    }

    // Botón subir
    document.addEventListener('click', e => {
        if (e.target.closest('#sheet-add-photo .btn--primary')) savePhoto();
    });

    await loadPhotos();
});

/* ── PREVIEW DE FOTO SELECCIONADA ───────────────────────────── */
function handlePhotoSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        selectedPhotoB64 = ev.target.result; // data:image/jpeg;base64,...
        const area = document.getElementById('photo-upload-area');
        if (area) {
            area.style.backgroundImage = `url(${selectedPhotoB64})`;
            area.style.backgroundSize = 'cover';
            area.style.backgroundPosition = 'center';
            area.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

/* ── CARGAR FOTOS ───────────────────────────────────────────── */
async function loadPhotos() {
    const photos = await apiFetch('/progress-photos');
    if (!photos) return;

    renderGallery(photos);
}

/* ── GALERÍA DINÁMICA ───────────────────────────────────────── */
function renderGallery(photos) {
    // Eliminar secciones estáticas
    document.querySelectorAll('.mb-16.stagger, .mb-24.stagger').forEach(el => {
        if (el.querySelector('.photo-grid')) el.remove();
    });

    const container = document.querySelector('main .container');
    const anchor = document.getElementById('photos-anchor');

    if (photos.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'mb-24';
        empty.innerHTML = `<p class="text-sm text-muted">No hay fotos aún. ¡Añade tu primera foto de progreso!</p>`;
        if (anchor) container.insertBefore(empty, anchor);
        else container.appendChild(empty);
        return;
    }

    // Agrupar por mes
    const byMonth = {};
    photos.forEach(p => {
        const d = new Date(p.date || p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(p);
    });

    Object.keys(byMonth).sort().reverse().forEach(key => {
        const [year, month] = key.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const items = byMonth[key];

        const section = document.createElement('div');
        section.className = 'mb-16';
        section.innerHTML = `
            <div class="flex items-center gap-8 mb-10">
                <span class="text-xs font-semibold text-muted" style="letter-spacing:.08em;text-transform:uppercase;">${monthName}</span>
                <div style="flex:1;height:1px;background:var(--border);"></div>
            </div>
            <div class="photo-grid" id="grid-${key}"></div>
        `;

        if (anchor) container.insertBefore(section, anchor);
        else container.appendChild(section);

        const grid = section.querySelector(`#grid-${key}`);
        items.forEach(p => {
            const item = document.createElement('div');
            item.className = 'photo-grid__item';
            const photoUrl = (p.photo_url || p.image_url || p.url || '').replace('http://', 'https://');
            if (photoUrl) {
                item.style.backgroundImage = `url(${photoUrl})`;
                item.style.backgroundSize = 'cover';
                item.style.backgroundPosition = 'center';
            } else {
                item.innerHTML = `<div style="width:100%;height:100%;background:var(--border);display:flex;align-items:center;justify-content:center;">
                    <i data-lucide="image" width="20" height="20" style="color:var(--text-muted);"></i>
                </div>`;
            }
            grid.appendChild(item);
        });

        // Botón añadir
        const addBtn = document.createElement('div');
        addBtn.className = 'photo-grid__item photo-grid__add';
        addBtn.setAttribute('data-sheet-open', 'sheet-add-photo');
        addBtn.innerHTML = `<i data-lucide="plus" width="20" height="20"></i><span>Añadir</span>`;
        addBtn.addEventListener('click', () => Sheet.open('sheet-add-photo'));
        grid.appendChild(addBtn);

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [section] });
    });
}

/* ── GUARDAR FOTO ───────────────────────────────────────────── */
async function savePhoto() {
    const fileInput = document.getElementById('photo-input');
    const file = fileInput?.files[0];

    if (!file) {
        Toast.show('Selecciona una foto primero', 'error');
        return;
    }

    const btn = document.querySelector('#sheet-add-photo .btn--primary');
    if (btn) btn.disabled = true;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('date', document.getElementById('photo-date')?.value || '');
    const notes = document.querySelector('#sheet-add-photo textarea')?.value;
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_URL}/progress-photos`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('xf_token')}`
        },
        body: formData
    });

    if (res.status === 401) {
        localStorage.removeItem('xf_token');
        window.location.href = '../login.html';
        return;
    }

    const data = await res.json();
    if (btn) btn.disabled = false;

    if (data.id) {
        Toast.show('Foto subida', 'success');
        Sheet.close('sheet-add-photo');
        selectedPhotoB64 = null;
        fileInput.value = '';
        const area = document.getElementById('photo-upload-area');
        if (area) {
            area.style.backgroundImage = '';
            area.innerHTML = `
    <i data-lucide="upload-cloud" width="32" height="32" style="margin:0 auto 10px;color:var(--text-muted);"></i>
    <p class="text-sm text-secondary">Toca para seleccionar foto</p>
    <p class="text-xs text-muted mt-4">JPG, PNG hasta 10 MB</p>
`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [area] });
        }
        await loadPhotos();
    } else {
        Toast.show(data.message || 'Error al subir la foto', 'error');
    }
}