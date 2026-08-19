// Cachea el "app shell" para que GRAFECTO funcione sin conexión.
// Sube CACHE_VERSION cuando cambien los archivos, para forzar la actualización del cache.

const CACHE_VERSION = 'grafecto-v22';

const ARCHIVOS_APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/componentes.css',
  './lib/supabase.js',
  './js/config.js',
  './js/auth.js',
  './js/ui.js',
  './js/whatsapp.js',
  './js/dictado.js',
  './js/db.js',
  './js/clientas.js',
  './js/cobro.js',
  './js/notas-visita.js',
  './js/tarjeta-cita.js',
  './js/agenda.js',
  './js/hoy.js',
  './js/horario.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo-grafecto.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_VERSION)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;

  const url = new URL(evento.request.url);

  // Nunca cachear llamadas a Supabase (datos en vivo, no "app shell").
  if (url.origin !== self.location.origin) {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;

      return fetch(evento.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(evento.request, copia));
          return respuestaRed;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
