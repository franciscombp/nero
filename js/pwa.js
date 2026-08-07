// Registro del service worker + aviso de nueva versión.
//
// El service worker sirve "red primero, caché como respaldo": si hay
// conexión, siempre se pide la copia más nueva de cada archivo y esa copia
// reemplaza a la de caché. Eso ya te deja jugar sin conexión con lo último
// que se cargó. Lo que faltaba es decírtelo cuando cambia de verdad: cuando
// hay una versión nueva del propio service worker (bump de CACHE_NAME en
// sw.js), este módulo la deja "en espera" y avisa con una barra discreta en
// vez de recargar la página sola a medio juego.
export function initPWA() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js').then(reg => {
    // ya había una versión nueva esperando desde antes de abrir esta pestaña
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const fresh = reg.installing;
      if (!fresh) return;
      fresh.addEventListener('statechange', () => {
        // "installed" + ya había un controlador = no es la primera instalación,
        // es una versión nueva sustituyendo a una que ya estabas jugando
        if (fresh.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBar(fresh);
        }
      });
    });

    // al volver a la pestaña (o reconectar), comprobar si hay versión nueva
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('online', check);
  }).catch(() => {});
}

function showUpdateBar(worker) {
  if (document.getElementById('updateBar')) return;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.innerHTML = `<span>Hay una versión nueva de Nero</span><button type="button">Actualizar</button>`;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('show'));
  bar.querySelector('button').addEventListener('click', () => {
    worker.postMessage('SKIP_WAITING');
    bar.classList.remove('show');
  });
}
