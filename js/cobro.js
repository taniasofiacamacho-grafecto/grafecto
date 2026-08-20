// Hoja de cobro: se abre al hacer checkout de una cita. Guarda la visita
// (precio, longitud, promoción, quién atendió, notas) y marca la cita
// como "checkout".
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

// Los tratamientos que se cobran por largo usan pulgadas; hidratación usa
// una escala más simple. Siempre se agrega "Otro" al final.
const OPCIONES_LONGITUD_POR_TRATAMIENTO = {
  'Hair Therapy': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Retoque de crecimiento': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Tratamiento de hidratación': ['Corto', 'Mediano', 'Largo'],
};

const NOMBRES_ESTILISTA_CONOCIDOS = ['Alma', 'Betty', 'Isabel'];

let citaActual = null;
let visitaEnEdicion = null;
let callbackAlGuardar = null;
let promocionSeleccionada = 'ninguna';
let estilistaSeleccionada = '';

const fondoHoja = document.getElementById('fondo-hoja-cobro');
const tituloHoja = document.getElementById('cobro-titulo');
const resumen = document.getElementById('cobro-resumen');
const formulario = document.getElementById('formulario-cobro');
const botonGuardar = formulario.querySelector('button[type="submit"]');
const campoPrecio = document.getElementById('cobro-precio');
const campoLongitud = document.getElementById('cobro-longitud');
const campoNotas = document.getElementById('cobro-notas');
const botonDictado = document.getElementById('cobro-notas-dictado');
const botonesPromocion = document.querySelectorAll('#cobro-promocion .pastilla-opcion');
const botonesEstilista = document.querySelectorAll('#cobro-estilista .pastilla-opcion');
const campoEstilistaOtra = document.getElementById('cobro-estilista-otra');

function poblarLongitud(tratamientoNombre) {
  const opciones = [...(OPCIONES_LONGITUD_POR_TRATAMIENTO[tratamientoNombre] || []), 'Otro'];
  campoLongitud.innerHTML = '';
  campoLongitud.appendChild(crearEl('option', { value: '', texto: '(sin especificar)' }));
  for (const opcion of opciones) {
    campoLongitud.appendChild(crearEl('option', { value: opcion, texto: opcion }));
  }
}

async function abrir(cita, onGuardado) {
  citaActual = cita;
  visitaEnEdicion = null;
  callbackAlGuardar = onGuardado;
  promocionSeleccionada = 'ninguna';

  resumen.textContent =
    `${cita.clientaNombre} — ${formatearFechaLarga(cita.fecha)} ${formatearHora12(cita.hora)}` +
    (cita.tratamientoNombre ? ` — ${cita.tratamientoNombre}` : '');

  poblarLongitud(cita.tratamientoNombre);

  // Si la cita ya se había cobrado, se busca esa visita para poder editarla
  // (por ejemplo, si se equivocó de precio o de estilista) en vez de crear
  // un cobro duplicado.
  if (cita.estado === 'checkout') {
    try {
      visitaEnEdicion = await DB.obtenerVisitaDeCita(cita.id);
    } catch (error) {
      console.error(error);
    }
  }

  tituloHoja.textContent = visitaEnEdicion ? 'Editar cobro' : 'Cobro';
  botonGuardar.textContent = visitaEnEdicion ? 'Guardar cambios' : 'Guardar cobro';

  campoPrecio.value = visitaEnEdicion ? visitaEnEdicion.precio : '';
  // Si ya se capturaron notas durante la visita (botón "Notas y foto"), se
  // precargan aquí para no volver a escribirlas — solo se completan con precio/promo.
  // Al editar un cobro ya hecho, se precargan las notas que se guardaron ahí.
  campoNotas.value = visitaEnEdicion ? visitaEnEdicion.notas : (cita.notasVisita || '');
  campoLongitud.value = visitaEnEdicion ? visitaEnEdicion.longitud : '';

  const promocionPrevia = visitaEnEdicion ? visitaEnEdicion.promocion : 'ninguna';
  promocionSeleccionada = promocionPrevia;
  botonesPromocion.forEach((boton) => {
    boton.classList.toggle('pastilla-opcion--activa', boton.dataset.valor === promocionPrevia);
  });

  // Si ya se le asignó estilista mientras la cita estaba en proceso (o ya
  // se había capturado en un cobro previo), se precarga aquí para no tener
  // que volver a elegirla.
  estilistaSeleccionada = '';
  botonesEstilista.forEach((boton) => boton.classList.remove('pastilla-opcion--activa'));
  campoEstilistaOtra.hidden = true;
  campoEstilistaOtra.value = '';

  const estilistaPrevia = (visitaEnEdicion ? visitaEnEdicion.estilista : cita.estilista) || '';
  if (NOMBRES_ESTILISTA_CONOCIDOS.includes(estilistaPrevia)) {
    estilistaSeleccionada = estilistaPrevia;
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === estilistaPrevia));
  } else if (estilistaPrevia) {
    estilistaSeleccionada = 'otra';
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'otra'));
    campoEstilistaOtra.hidden = false;
    campoEstilistaOtra.value = estilistaPrevia;
  }

  fondoHoja.classList.add('abierta');
  setTimeout(() => campoPrecio.focus(), 250);
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  citaActual = null;
  visitaEnEdicion = null;
}

function manejarCancelar() {
  const hayContenido = campoPrecio.value || campoNotas.value.trim();
  if (hayContenido && !window.confirm('¿Descartar el cobro sin guardar?')) return;
  cerrar();
}

function resolverEstilista() {
  if (estilistaSeleccionada === 'otra') return campoEstilistaOtra.value.trim();
  return estilistaSeleccionada;
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
    if (visitaEnEdicion) {
      await DB.actualizarVisita(visitaEnEdicion.id, {
        tratamientoId: citaActual.tratamientoId,
        precio,
        longitud: campoLongitud.value,
        promocion: promocionSeleccionada,
        estilista: resolverEstilista(),
        notas: campoNotas.value,
      });
      mostrarMensaje('Cobro actualizado');
    } else {
      await DB.agregarVisita({
        clientaId: citaActual.clientaId,
        citaId: citaActual.id,
        tratamientoId: citaActual.tratamientoId,
        fecha: citaActual.fecha,
        precio,
        longitud: campoLongitud.value,
        promocion: promocionSeleccionada,
        estilista: resolverEstilista(),
        notas: campoNotas.value,
      });
      await DB.actualizarEstadoCita(citaActual.id, 'checkout');
      mostrarMensaje('Cobro guardado');
    }

    const cb = callbackAlGuardar;
    cerrar();
    if (cb) cb();
  } catch (error) {
    mostrarMensaje('No se pudo guardar el cobro: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-cerrar-hoja-cobro').addEventListener('click', manejarCancelar);
  formulario.addEventListener('submit', manejarGuardar);

  botonesPromocion.forEach((boton) => {
    boton.addEventListener('click', () => {
      promocionSeleccionada = boton.dataset.valor;
      botonesPromocion.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b === boton));
    });
  });

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

  Dictado.adjuntarA(campoNotas, botonDictado);
}

window.CobroUI = { inicializar, abrir };

})();
