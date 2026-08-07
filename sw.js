// Versión de la app cacheada. Súbela en cada release: es lo único que hace
// que el navegador note que sw.js cambió y arranque el ciclo de actualización
// (instala en segundo plano, se queda "en espera" y js/pwa.js avisa al
// jugador con una barra en vez de recargar la página a medio nivel).
const APP_VERSION = 'v12';
const CACHE_NAME = 'nero-pwa-' + APP_VERSION;
const ASSETS = [
  './',
  './index.html',
  './2d.html',
  './prototype3d.html',
  './editor.html',
  './styles/main.css',
  './manifest.webmanifest',
  './js/polyfills.js',
  './js/core.js',
  './js/actions.js',
  './js/physics.js',
  './js/renderer.js',
  './js/renderer3d.js',
  './js/input.js',
  './js/ui.js',
  './js/editor.js',
  './js/levelEditor.js',
  './js/assetLoader.js',
  './js/pwa.js',
  './js/vendor/three.module.min.js',
  './js/vendor/three.core.min.js',
  './js/vendor/RoundedBoxGeometry.js',
  './js/vendor/GLTFLoader.js',
  './js/vendor/utils/BufferGeometryUtils.js',
  './js/vendor/utils/SkeletonUtils.js',
  './assets/nero.glb',
  './data/scenes.json',
  './data/stories.json',
  './data/story_origins.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  // Sin skipWaiting aquí: si ya hay una versión sirviendo la página, esta se
  // queda "en espera" hasta que el jugador confirme la barra de actualización
  // (o cierre todas las pestañas). La primera instalación no tiene a quién
  // esperar, así que el navegador la activa igual en cuanto termina.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Red primero, caché como respaldo (para jugar sin conexión una vez visitado).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((match) => match || caches.match('./index.html')))
  );
});
