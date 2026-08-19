// Hoja de notas y foto durante la visita: se puede abrir desde que la cita
// está "Llegó" o "En proceso", sin esperar al cobro — para no olvidar la
// técnica ni de quién es la foto después de atender a varias clientas.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

let citaActual = null;
let callbackAlGuardar = null;
let archivoFotoNuevo = null;

const fondoHoja = document.getElementById('fondo-hoja-notas-visita');
const resumen = document.getElementById('notas-visita-resumen');
const formulario = document.getElementById('formulario-notas-visita');
const campoTexto = document.getElementById('notas-visita-texto');
const botonDictado = document.getElementById('notas-visita-dictado');
const campoFoto = document.getElementById('notas-visita-foto');
const previewFoto = document.getElementById('notas-visita-foto-preview');
const botonGuardar = formulario.querySelector('button[type="submit"]');

async function abrir(cita, onGuardado) {
  citaActual = cita;
  callbackAlGuardar = onGuardado;
  archivoFotoNuevo = null;

  resumen.textContent =
    `${cita.clientaNombre} — ${formatearFechaLarga(cita.fecha)} ${formatearHora12(cita.hora)}`;
  campoTexto.value = cita.notasVisita || '';
  campoFoto.value = '';
  previewFoto.hidden = true;
  previewFoto.src = '';

  fondoHoja.classList.add('abierta');
  setTimeout(() => campoTexto.focus(), 250);

  if (cita.fotoPath) {
    try {
      previewFoto.src = await DB.obtenerUrlFoto(cita.fotoPath);
      previewFoto.hidden = false;
    } catch (error) {
      console.error(error);
    }
  }
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  previewFoto.hidden = true;
  citaActual = null;
  archivoFotoNuevo = null;
}

async function manejarGuardar(evento) {
  evento.preventDefault();
  botonGuardar.disabled = true;

  try {
    let fotoPath;
    if (archivoFotoNuevo) {
      fotoPath = await DB.subirFotoVisita(citaActual.id, archivoFotoNuevo);
    }
    await DB.actualizarNotasVisita(citaActual.id, { notas: campoTexto.value, fotoPath });

    mostrarMensaje('Notas guardadas');
    const cb = callbackAlGuardar;
    cerrar();
    if (cb) cb();
  } catch (error) {
    mostrarMensaje('No se pudo guardar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  } finally {
    botonGuardar.disabled = false;
  }
}

function inicializar() {
  document.getElementById('boton-cerrar-hoja-notas-visita').addEventListener('click', cerrar);
  fondoHoja.addEventListener('click', (evento) => {
    if (evento.target === fondoHoja) cerrar();
  });
  formulario.addEventListener('submit', manejarGuardar);

  campoFoto.addEventListener('change', () => {
    const archivo = campoFoto.files[0];
    if (!archivo) return;
    archivoFotoNuevo = archivo;
    previewFoto.src = URL.createObjectURL(archivo);
    previewFoto.hidden = false;
  });

  Dictado.adjuntarA(campoTexto, botonDictado);
}

window.NotasVisitaUI = { inicializar, abrir };

})();
