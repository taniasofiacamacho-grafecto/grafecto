// Hoja de cobro: se abre al hacer checkout de una cita. Guarda la visita
// (precio, promoción, notas) y marca la cita como "checkout".
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

let citaActual = null;
let callbackAlGuardar = null;
let promocionSeleccionada = 'ninguna';

const fondoHoja = document.getElementById('fondo-hoja-cobro');
const resumen = document.getElementById('cobro-resumen');
const formulario = document.getElementById('formulario-cobro');
const campoPrecio = document.getElementById('cobro-precio');
const campoNotas = document.getElementById('cobro-notas');
const botonesPromocion = document.querySelectorAll('#cobro-promocion .pastilla-opcion');

function abrir(cita, onGuardado) {
  citaActual = cita;
  callbackAlGuardar = onGuardado;
  promocionSeleccionada = 'ninguna';

  resumen.textContent =
    `${cita.clientaNombre} — ${formatearFechaLarga(cita.fecha)} ${formatearHora12(cita.hora)}` +
    (cita.tratamientoNombre ? ` — ${cita.tratamientoNombre}` : '');

  campoPrecio.value = '';
  campoNotas.value = '';
  botonesPromocion.forEach((boton) => {
    boton.classList.toggle('pastilla-opcion--activa', boton.dataset.valor === 'ninguna');
  });

  fondoHoja.classList.add('abierta');
  setTimeout(() => campoPrecio.focus(), 250);
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  citaActual = null;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  const precio = Number(campoPrecio.value);
  if (!campoPrecio.value || Number.isNaN(precio) || precio < 0) {
    mostrarMensaje('Escribe el precio cobrado');
    campoPrecio.focus();
    return;
  }

  try {
    await DB.agregarVisita({
      clientaId: citaActual.clientaId,
      citaId: citaActual.id,
      tratamientoId: citaActual.tratamientoId,
      fecha: citaActual.fecha,
      precio,
      promocion: promocionSeleccionada,
      notas: campoNotas.value,
    });
    await DB.actualizarEstadoCita(citaActual.id, 'checkout');

    mostrarMensaje('Cobro guardado');
    const cb = callbackAlGuardar;
    cerrar();
    if (cb) cb();
  } catch (error) {
    mostrarMensaje('No se pudo guardar el cobro: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-cerrar-hoja-cobro').addEventListener('click', cerrar);
  fondoHoja.addEventListener('click', (evento) => {
    if (evento.target === fondoHoja) cerrar();
  });
  formulario.addEventListener('submit', manejarGuardar);

  botonesPromocion.forEach((boton) => {
    boton.addEventListener('click', () => {
      promocionSeleccionada = boton.dataset.valor;
      botonesPromocion.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b === boton));
    });
  });
}

window.CobroUI = { inicializar, abrir };

})();
