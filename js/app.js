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
    calendario: document.getElementById('vista-calendario'),
    reportes: document.getElementById('vista-reportes'),
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
      window.EstilistaCitaUI.inicializar();
      window.HorarioUI.inicializar();
      window.ReportesUI.inicializar();
      window.FinanzasUI.inicializar();
      window.ProductosUI.inicializar();
      window.GrafectoDB.asegurarTratamientosPorDefecto().catch((error) => {
        console.warn('No se pudieron crear los tratamientos por defecto:', error);
      });
      window.GrafectoDB.asegurarProductosPorDefecto().catch((error) => {
        console.warn('No se pudieron crear los productos por defecto:', error);
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
    if (vista === 'calendario') window.HorarioUI.mostrar();
    if (vista === 'reportes') {
      window.ReportesUI.mostrar();
      window.FinanzasUI.mostrar();
    }

    botonAgregar.hidden = vista === 'calendario' || vista === 'reportes';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => cambiarVista(tab.dataset.vista));
  });

  botonAgregar.addEventListener('click', () => {
    if (vistaActiva === 'clientas') window.ClientasUI.abrirNuevo();
    else if (vistaActiva === 'agenda' || vistaActiva === 'hoy') window.AgendaUI.abrirNuevo();
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
    // updateViaCache: 'none' evita que el navegador use una copia guardada
    // del propio service-worker.js al revisar si hay versión nueva — sin
    // esto, a veces ni se daba cuenta de que había una actualización.
    navigator.serviceWorker
      .register('service-worker.js', { updateViaCache: 'none' })
      .then((registro) => {
        registro.update();

        registro.addEventListener('updatefound', () => {
          const nuevoWorker = registro.installing;
          if (!nuevoWorker) return;

          nuevoWorker.addEventListener('statechange', () => {
            // "installed" + ya había un controlador = es una actualización
            // (no la primera instalación) — recargamos para tomarla ya.
            if (nuevoWorker.state === 'installed' && navigator.serviceWorker.controller) {
              mostrarMensajeActualizacion();
              setTimeout(() => window.location.reload(), 1500);
            }
          });
        });

        // Revisa de nuevo cada vez que regresas a la app, por si se quedó
        // abierta en segundo plano mientras se publicaba una versión nueva.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registro.update();
        });
      })
      .catch((error) => {
        console.warn('No se pudo registrar el service worker:', error);
      });
  }

  function mostrarMensajeActualizacion() {
    const aviso = document.createElement('div');
    aviso.className = 'mensaje-flotante visible';
    aviso.textContent = 'Hay una versión nueva, actualizando…';
    document.body.appendChild(aviso);
  }
});
