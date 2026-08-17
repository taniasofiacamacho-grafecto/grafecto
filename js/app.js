// Arranque de la app. Por ahora solo hay una vista (clientas);
// cuando agreguemos agenda/catálogo/bitácora, aquí se decidirá qué vista mostrar.

document.addEventListener('DOMContentLoaded', () => {
  window.inicializarClientas();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((error) => {
      console.warn('No se pudo registrar el service worker:', error);
    });
  }
});
