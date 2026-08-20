// Hoja para asignar la estilista que atiende una cita: se puede usar desde
// que la cita está "Llegó" o "En proceso", sin esperar al cobro — así queda
// registrado desde el momento en que empieza a atenderla, y se ve de una
// vez en la tarjeta de la cita (Agenda y Hoy).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

const NOMBRES_CONOCIDOS = ['Alma', 'Betty', 'Isabel'];

let citaActual = null;
let callbackAlGuardar = null;
let estilistaSeleccionada = '';

const fondoHoja = document.getElementById('fondo-hoja-estilista-cita');
const resumen = document.getElementById('estilista-cita-resumen');
const formulario = document.getElementById('formulario-estilista-cita');
const botonesEstilista = document.querySelectorAll('#estilista-cita-opciones .pastilla-opcion');
const campoEstilistaOtra = document.getElementById('estilista-cita-otra');

function abrir(cita, onGuardado) {
  citaActual = cita;
  callbackAlGuardar = onGuardado;

  resumen.textContent =
    `${cita.clientaNombre} — ${formatearFechaLarga(cita.fecha)} ${formatearHora12(cita.hora)}`;

  estilistaSeleccionada = '';
  botonesEstilista.forEach((b) => b.classList.remove('pastilla-opcion--activa'));
  campoEstilistaOtra.hidden = true;
  campoEstilistaOtra.value = '';

  const yaAsignada = cita.estilista || '';
  if (NOMBRES_CONOCIDOS.includes(yaAsignada)) {
    estilistaSeleccionada = yaAsignada;
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === yaAsignada));
  } else if (yaAsignada) {
    estilistaSeleccionada = 'otra';
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'otra'));
    campoEstilistaOtra.hidden = false;
    campoEstilistaOtra.value = yaAsignada;
  }

  fondoHoja.classList.add('abierta');
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  citaActual = null;
}

function resolverEstilista() {
  if (estilistaSeleccionada === 'otra') return campoEstilistaOtra.value.trim();
  return estilistaSeleccionada;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  try {
    await DB.actualizarEstilistaCita(citaActual.id, resolverEstilista());
    mostrarMensaje('Estilista asignada');
    const cb = callbackAlGuardar;
    cerrar();
    if (cb) cb();
  } catch (error) {
    mostrarMensaje('No se pudo guardar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-cerrar-hoja-estilista-cita').addEventListener('click', cerrar);
  formulario.addEventListener('submit', manejarGuardar);

  botonesEstilista.forEach((boton) => {
    boton.addEventListener('click', () => {
      const yaActiva = boton.classList.contains('pastilla-opcion--activa');
      botonesEstilista.forEach((b) => b.classList.remove('pastilla-opcion--activa'));

      if (yaActiva) {
        estilistaSeleccionada = '';
        campoEstilistaOtra.hidden = true;
        return;
      }

      boton.classList.add('pastilla-opcion--activa');
      estilistaSeleccionada = boton.dataset.valor;
      campoEstilistaOtra.hidden = boton.dataset.valor !== 'otra';
      if (boton.dataset.valor === 'otra') campoEstilistaOtra.focus();
    });
  });
}

window.EstilistaCitaUI = { inicializar, abrir };

})();
