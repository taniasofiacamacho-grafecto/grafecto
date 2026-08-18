// Vista de agenda: lista de citas agrupadas por día, alta/edición vía hoja modal,
// y el enlace de recordatorio de WhatsApp por cita.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12, formatearDuracion } = window.UI;
const DB = window.GrafectoDB;

let idEnEdicion = null;
let citasCargadas = false;
let tratamientosCache = [];

const listaEl = document.getElementById('lista-agenda');
const fondoHoja = document.getElementById('fondo-hoja-cita');
const hojaTitulo = document.getElementById('hoja-cita-titulo');
const formulario = document.getElementById('formulario-cita');
const campoClienta = document.getElementById('cita-clienta');
const campoTratamiento = document.getElementById('cita-tratamiento');
const campoTratamientoDuracion = document.getElementById('cita-tratamiento-duracion');
const campoFecha = document.getElementById('cita-fecha');
const campoHora = document.getElementById('cita-hora');
const campoNotas = document.getElementById('cita-notas');
const botonEliminar = document.getElementById('boton-eliminar-cita');

async function cargarCitas() {
  try {
    const citas = await DB.listarCitas();
    renderizarLista(citas);
    citasCargadas = true;
  } catch (error) {
    mostrarMensaje('No se pudo cargar la agenda. Intenta de nuevo.');
    console.error(error);
  }
}

function crearBotonesWhatsApp(cita) {
  const botones = [
    ['Confirmación', WhatsApp.generarEnlaceConfirmacion(cita)],
    WhatsApp.debeSugerirDeepCleanse(cita.fecha)
      ? ['Deep cleanse', WhatsApp.generarEnlaceDeepCleanse(cita)]
      : null,
    ['Recordatorio', WhatsApp.generarEnlaceRecordatorio(cita)],
  ].filter(Boolean);

  if (!botones[0][1]) {
    return crearEl('div', { class: 'tarjeta-cita__sin-telefono', texto: 'Sin teléfono' });
  }

  return crearEl(
    'div',
    { class: 'tarjeta-cita__pie' },
    botones.map(([etiqueta, enlace]) =>
      crearEl('a', {
        class: 'tarjeta-cita__whatsapp',
        href: enlace,
        target: '_blank',
        rel: 'noopener',
        texto: etiqueta,
      })
    )
  );
}

function renderizarLista(citas) {
  listaEl.innerHTML = '';

  if (citas.length === 0) {
    const vacio = crearEl('div', { class: 'estado-vacio' }, [
      crearEl('div', { class: 'estado-vacio__titulo', texto: 'No tienes citas agendadas' }),
      crearEl('p', { texto: 'Toca el botón + para agregar la primera.' }),
    ]);
    listaEl.appendChild(vacio);
    return;
  }

  let fechaAnterior = null;

  for (const cita of citas) {
    if (cita.fecha !== fechaAnterior) {
      listaEl.appendChild(
        crearEl('div', { class: 'agenda-fecha', texto: formatearFechaLarga(cita.fecha) })
      );
      fechaAnterior = cita.fecha;
    }

    const tarjeta = crearEl('div', { class: 'tarjeta-cita' }, [
      crearEl('div', { class: 'tarjeta-cita__cuerpo', onclick: () => abrirHojaCita(cita) }, [
        crearEl('div', { class: 'tarjeta-cita__hora', texto: formatearHora12(cita.hora) }),
        crearEl('div', { class: 'tarjeta-cita__info' }, [
          crearEl('div', { class: 'tarjeta-cita__nombre', texto: cita.clientaNombre }),
          cita.tratamientoNombre
            ? crearEl('div', { class: 'tarjeta-cita__detalle', texto: cita.tratamientoNombre })
            : null,
          cita.notas
            ? crearEl('div', { class: 'tarjeta-cita__detalle', texto: cita.notas })
            : null,
        ]),
      ]),
      crearBotonesWhatsApp(cita),
    ]);

    listaEl.appendChild(tarjeta);
  }
}

async function llenarSelectClientas(clientaIdSeleccionada) {
  const clientas = await DB.listarClientas();
  campoClienta.innerHTML = '';

  if (clientas.length === 0) {
    campoClienta.appendChild(crearEl('option', { value: '', texto: 'Primero agrega una clienta' }));
    campoClienta.disabled = true;
    return;
  }

  campoClienta.disabled = false;
  for (const clienta of clientas) {
    campoClienta.appendChild(crearEl('option', { value: clienta.id, texto: clienta.nombre }));
  }
  if (clientaIdSeleccionada) campoClienta.value = clientaIdSeleccionada;
}

async function llenarSelectTratamientos(tratamientoIdSeleccionado) {
  tratamientosCache = await DB.listarTratamientos();
  campoTratamiento.innerHTML = '';
  campoTratamiento.appendChild(crearEl('option', { value: '', texto: '(sin especificar)' }));

  for (const tratamiento of tratamientosCache) {
    campoTratamiento.appendChild(
      crearEl('option', { value: tratamiento.id, texto: tratamiento.nombre })
    );
  }
  campoTratamiento.value = tratamientoIdSeleccionado || '';
  actualizarAyudaDuracion();
}

function actualizarAyudaDuracion() {
  const tratamiento = tratamientosCache.find((t) => t.id === campoTratamiento.value);
  campoTratamientoDuracion.textContent = tratamiento
    ? `Bloqueo aproximado: ${formatearDuracion(tratamiento.duracionMinutos)}`
    : '';
}

async function abrirHojaCita(cita = null) {
  idEnEdicion = cita ? cita.id : null;
  hojaTitulo.textContent = cita ? 'Editar cita' : 'Nueva cita';

  await llenarSelectClientas(cita ? cita.clientaId : null);
  await llenarSelectTratamientos(cita ? cita.tratamientoId : null);

  campoFecha.value = cita ? cita.fecha : '';
  campoHora.value = cita ? cita.hora : '';
  campoNotas.value = cita ? cita.notas : '';
  botonEliminar.hidden = !cita;

  fondoHoja.classList.add('abierta');
}

function cerrarHojaCita() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  idEnEdicion = null;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  if (!campoClienta.value) {
    mostrarMensaje('Agrega primero una clienta');
    return;
  }

  const datos = {
    clientaId: campoClienta.value,
    tratamientoId: campoTratamiento.value || null,
    fecha: campoFecha.value,
    hora: campoHora.value,
    notas: campoNotas.value,
  };

  if (idEnEdicion) {
    await DB.actualizarCita(idEnEdicion, datos);
    mostrarMensaje('Cita actualizada');
  } else {
    await DB.agregarCita(datos);
    mostrarMensaje('Cita guardada');
  }

  cerrarHojaCita();
  await cargarCitas();
}

async function manejarEliminar() {
  if (!idEnEdicion) return;
  const confirmar = window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  await DB.eliminarCita(idEnEdicion);
  mostrarMensaje('Cita eliminada');
  cerrarHojaCita();
  await cargarCitas();
}

function inicializarAgenda() {
  document.getElementById('boton-cerrar-hoja-cita').addEventListener('click', cerrarHojaCita);
  fondoHoja.addEventListener('click', (evento) => {
    if (evento.target === fondoHoja) cerrarHojaCita();
  });
  formulario.addEventListener('submit', manejarGuardar);
  botonEliminar.addEventListener('click', manejarEliminar);
  campoTratamiento.addEventListener('change', actualizarAyudaDuracion);
}

window.AgendaUI = {
  inicializar: inicializarAgenda,
  abrirNuevo: () => abrirHojaCita(null),
  mostrar: () => cargarCitas(),
};

})();
