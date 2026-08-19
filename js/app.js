// Arranque de la app: decide si mostrar el login o la app según la sesión,
// conecta el formulario de inicio de sesión, el botón de salir, y la
// navegación por pestañas (Clientas / Agenda).

document.addEventListener('DOMContentLoaded', async () => {
  const pantallaLogin = document.getElementById('pantalla-login');
  const pantallaApp = document.getElementById('app');
  const formularioLogin = document.getElementById('formulario-login');
  const loginError = document.getElementById('login-error');
  const botonSalir = document.getElementById('boton-cerrar-sesion');
  const botonAgregar = document.getElementById('boton-agregar');
  const tabs = document.querySelectorAll('.tabs__boton');
  const vistas = {
    clientas: document.getElementById('vista-clientas'),
    hoy: document.getElementById('vista-hoy'),
    agenda: document.getElementById('vista-agenda'),
  };

  let appInicializada = false;
  let vistaActiva = 'clientas';

  function mostrarApp() {
    pantallaLogin.hidden = true;
    pantallaApp.hidden = false;
    if (!appInicializada) {
      window.inicializarClientas();
      window.AgendaUI.inicializar();
      window.CobroUI.inicializar();
      window.NotasVisitaUI.inicializar();
      window.GrafectoDB.asegurarTratamientosPorDefecto().catch((error) => {
        console.warn('No se pudieron crear los tratamientos por defecto:', error);
      });
      appInicializada = true;
    }
  }

  function mostrarLogin() {
    pantallaApp.hidden = true;
    pantallaLogin.hidden = false;
  }

  function cambiarVista(vista) {
    vistaActiva = vista;
    for (const [nombre, elemento] of Object.entries(vistas)) {
      elemento.hidden = nombre !== vista;
    }
    tabs.forEach((tab) => {
      tab.classList.toggle('tabs__boton--activo', tab.dataset.vista === vista);
    });

    if (vista === 'agenda') window.AgendaUI.mostrar();
    if (vista === 'hoy') window.HoyUI.mostrar();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => cambiarVista(tab.dataset.vista));
  });

  botonAgregar.addEventListener('click', () => {
    if (vistaActiva === 'clientas') window.ClientasUI.abrirNuevo();
    else window.AgendaUI.abrirNuevo();
  });

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
