// Arranque de la app: decide si mostrar el login o la app según la sesión,
// y conecta el formulario de inicio de sesión y el botón de salir.

document.addEventListener('DOMContentLoaded', async () => {
  const pantallaLogin = document.getElementById('pantalla-login');
  const pantallaApp = document.getElementById('app');
  const formularioLogin = document.getElementById('formulario-login');
  const loginError = document.getElementById('login-error');
  const botonSalir = document.getElementById('boton-cerrar-sesion');

  let appInicializada = false;

  function mostrarApp() {
    pantallaLogin.hidden = true;
    pantallaApp.hidden = false;
    if (!appInicializada) {
      window.inicializarClientas();
      appInicializada = true;
    }
  }

  function mostrarLogin() {
    pantallaApp.hidden = true;
    pantallaLogin.hidden = false;
  }

  GrafectoAuth.alCambiarSesion((sesion) => {
    if (sesion) mostrarApp();
    else mostrarLogin();
  });

  const sesionInicial = await GrafectoAuth.obtenerSesion();
  if (sesionInicial) mostrarApp();
  else mostrarLogin();

  formularioLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    loginError.hidden = true;

    const correo = document.getElementById('login-correo').value.trim();
    const contrasena = document.getElementById('login-contrasena').value;

    try {
      await GrafectoAuth.iniciarSesion(correo, contrasena);
    } catch (error) {
      loginError.textContent = 'Correo o contraseña incorrectos.';
      loginError.hidden = false;
    }
  });

  botonSalir.addEventListener('click', () => {
    GrafectoAuth.cerrarSesion();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((error) => {
      console.warn('No se pudo registrar el service worker:', error);
    });
  }
});
