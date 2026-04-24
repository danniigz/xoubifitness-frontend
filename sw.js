/* ============================================================
   XoubiFitness — sw.js
   Service Worker (Fase 4 — PWA)
   Estrategia: Cache First para assets, Network First para API
   ============================================================ */

const CACHE_NAME    = 'xoubifitness-v1';
const CACHE_STATIC  = 'xoubifitness-static-v1';
const CACHE_DYNAMIC = 'xoubifitness-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/entreno.html',
  '/pages/comidas.html',
  '/pages/progreso.html',
  '/pages/perfil.html',
  '/pages/fotos.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/dashboard.js',
  '/assets/js/entreno.js',
  '/assets/js/progreso.js',
  '/manifest.json',
];

/* ── INSTALL ──────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ─────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* ── FETCH ────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Recursos estáticos → Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
