// Horario: fechas habilitadas con sus horas exactas (no hay patrón semanal,
// cada semana es distinta — la usuaria habilita fechas puntuales con
// anticipación), más bloqueos manuales de horas sin cita.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

const listaFechas = document.getElementById('excepciones-lista');
const listaBloqueos = document.getElementById('bloqueos-lista');

function crearChipHora(hora, onEliminar) {
  return crearEl('span', { class: 'chip-hora' }, [
    crearEl('span', { texto: formatearHora12(hora) }),
    crearEl('button', { type: 'button', texto: '✕', 'aria-label': 'Quitar hora', onclick: onEliminar }),
  ]);
}

function crearItemLista(fecha, detalle, onEliminar) {
  return crearEl('div', { class: 'horario-item' }, [
    crearEl('div', { class: 'horario-item__info' }, [
      crearEl('div', { class: 'horario-item__fecha', texto: formatearFechaLarga(fecha) }),
      crearEl('div', { class: 'horario-item__detalle', texto: detalle }),
    ]),
    crearEl('button', {
      type: 'button',
      class: 'horario-item__eliminar',
      texto: '✕',
      'aria-label': 'Eliminar',
      onclick: onEliminar,
    }),
  ]);
}

// Cada hora se puede quitar suelta (chip con su propia ✕), y también queda
// el botón para quitar el día completo de una vez.
function crearItemFecha(fecha, slotsDia, onCambio) {
  const chips = crearEl('div', { class: 'chips-horas', style: 'margin-bottom: 0;' });
  for (const slot of slotsDia) {
    chips.appendChild(
      crearChipHora(slot.hora, async () => {
        try {
          await DB.eliminarSlot(slot.id);
          await onCambio();
        } catch (error) {
          mostrarMensaje('No se pudo quitar la hora');
          console.error(error);
        }
      })
    );
  }

  return crearEl('div', { class: 'horario-item' }, [
    crearEl('div', { class: 'horario-item__info' }, [
      crearEl('div', { class: 'horario-item__fecha', texto: formatearFechaLarga(fecha) }),
      chips,
    ]),
    crearEl('button', {
      type: 'button',
      class: 'horario-item__eliminar',
      texto: '✕',
      'aria-label': 'Quitar todo el día',
      onclick: async () => {
        if (!window.confirm('¿Quitar todas las horas de este día?')) return;
        try {
          await Promise.all(slotsDia.map((s) => DB.eliminarSlot(s.id)));
          await onCambio();
        } catch (error) {
          mostrarMensaje('No se pudo eliminar');
          console.error(error);
        }
      },
    }),
  ]);
}

// ===== Fechas habilitadas =====

const botonCompartirDisponibilidad = document.getElementById('boton-compartir-disponibilidad');

function actualizarBotonCompartir(gruposPorFecha) {
  const enlace = WhatsApp.generarEnlaceDisponibilidad(gruposPorFecha);
  botonCompartirDisponibilidad.hidden = !enlace;
  if (enlace) botonCompartirDisponibilidad.href = enlace;
}

// Compara solo hora:minuto — citas.hora y horario_slots.hora pueden venir
// con o sin segundos según cómo los haya guardado Postgres.
function horaCorta(hora) {
  return (hora || '').slice(0, 5);
}

async function cargarFechas() {
  listaFechas.innerHTML = '';
  try {
    const [slotsCrudos, citas] = await Promise.all([DB.listarSlotsFechas(), DB.listarCitas()]);

    const ocupadas = new Set(citas.map((c) => `${c.fecha}|${horaCorta(c.hora)}`));
    const slots = slotsCrudos.filter((s) => !ocupadas.has(`${s.fecha}|${horaCorta(s.hora)}`));

    if (slots.length === 0) {
      listaFechas.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'No tienes fechas habilitadas próximas.' })
      );
      actualizarBotonCompartir([]);
      return;
    }

    const porFecha = {};
    for (const slot of slots) {
      (porFecha[slot.fecha] ||= []).push(slot);
    }

    for (const [fecha, slotsDia] of Object.entries(porFecha)) {
      listaFechas.appendChild(crearItemFecha(fecha, slotsDia, cargarFechas));
    }

    actualizarBotonCompartir(
      Object.entries(porFecha).map(([fecha, slotsDia]) => ({
        fecha,
        horas: slotsDia.map((s) => s.hora),
      }))
    );
  } catch (error) {
    listaFechas.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'No se pudieron cargar las fechas.' })
    );
    console.error(error);
  }
}

// ===== Bloqueos manuales =====

async function cargarBloqueos() {
  listaBloqueos.innerHTML = '';
  try {
    const bloqueos = await DB.listarBloqueos();
    if (bloqueos.length === 0) {
      listaBloqueos.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'No tienes bloqueos próximos.' })
      );
      return;
    }
    for (const bloqueo of bloqueos) {
      const detalle =
        `${formatearHora12(bloqueo.horaInicio)} a ${formatearHora12(bloqueo.horaFin)}` +
        (bloqueo.motivo ? ` — ${bloqueo.motivo}` : '');
      listaBloqueos.appendChild(
        crearItemLista(bloqueo.fecha, detalle, async () => {
          try {
            await DB.eliminarBloqueo(bloqueo.id);
            await cargarBloqueos();
          } catch (error) {
            mostrarMensaje('No se pudo eliminar');
            console.error(error);
          }
        })
      );
    }
  } catch (error) {
    listaBloqueos.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'No se pudieron cargar los bloqueos.' })
    );
    console.error(error);
  }
}

// ===== Hoja: habilitar un día =====

const fondoHojaExcepcion = document.getElementById('fondo-hoja-excepcion');
const campoExcepcionFecha = document.getElementById('excepcion-fecha');
const chipsExcepcionHoras = document.getElementById('excepcion-horas-chips');
const campoExcepcionNuevaHora = document.getElementById('excepcion-nueva-hora');
const botonExcepcionAgregarHora = document.getElementById('excepcion-agregar-hora');
let horasDelDia = [];

function pintarChipsExcepcion() {
  chipsExcepcionHoras.innerHTML = '';
  if (horasDelDia.length === 0) {
    chipsExcepcionHoras.appendChild(
      crearEl('span', { class: 'campo__ayuda', texto: 'Agrega las horas de este día.' })
    );
    return;
  }
  for (const slot of horasDelDia) {
    chipsExcepcionHoras.appendChild(
      crearChipHora(slot.hora, async () => {
        try {
          await DB.eliminarSlot(slot.id);
          horasDelDia = horasDelDia.filter((s) => s.id !== slot.id);
          pintarChipsExcepcion();
        } catch (error) {
          mostrarMensaje('No se pudo quitar la hora');
          console.error(error);
        }
      })
    );
  }
}

function abrirHojaExcepcion() {
  campoExcepcionFecha.value = '';
  campoExcepcionNuevaHora.value = '';
  horasDelDia = [];
  pintarChipsExcepcion();
  fondoHojaExcepcion.classList.add('abierta');
}

async function cerrarHojaExcepcion() {
  fondoHojaExcepcion.classList.remove('abierta');
  await cargarFechas();
}

async function manejarAgregarHoraExcepcion() {
  if (!campoExcepcionFecha.value) {
    mostrarMensaje('Elige primero la fecha');
    return;
  }
  if (!campoExcepcionNuevaHora.value) return;

  try {
    const nuevo = await DB.agregarSlotFecha(campoExcepcionFecha.value, campoExcepcionNuevaHora.value);
    horasDelDia.push(nuevo);
    horasDelDia.sort((a, b) => a.hora.localeCompare(b.hora));
    campoExcepcionNuevaHora.value = '';
    pintarChipsExcepcion();
  } catch (error) {
    mostrarMensaje('No se pudo agregar la hora');
    console.error(error);
  }
}

// ===== Hoja: nuevo bloqueo =====

const fondoHojaBloqueo = document.getElementById('fondo-hoja-bloqueo');
const formBloqueo = document.getElementById('formulario-bloqueo');
const campoBloqueoFecha = document.getElementById('bloqueo-fecha');
const campoBloqueoInicio = document.getElementById('bloqueo-hora-inicio');
const campoBloqueoFin = document.getElementById('bloqueo-hora-fin');
const campoBloqueoMotivo = document.getElementById('bloqueo-motivo');

function abrirHojaBloqueo() {
  formBloqueo.reset();
  fondoHojaBloqueo.classList.add('abierta');
}

function cerrarHojaBloqueo() {
  fondoHojaBloqueo.classList.remove('abierta');
}

async function manejarGuardarBloqueo(evento) {
  evento.preventDefault();
  if (!campoBloqueoFecha.value || !campoBloqueoInicio.value || !campoBloqueoFin.value) return;

  try {
    await DB.agregarBloqueo({
      fecha: campoBloqueoFecha.value,
      horaInicio: campoBloqueoInicio.value,
      horaFin: campoBloqueoFin.value,
      motivo: campoBloqueoMotivo.value,
    });
    mostrarMensaje('Bloqueo guardado');
    cerrarHojaBloqueo();
    await cargarBloqueos();
  } catch (error) {
    mostrarMensaje('No se pudo guardar el bloqueo');
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-agregar-excepcion').addEventListener('click', abrirHojaExcepcion);
  document.getElementById('boton-cerrar-hoja-excepcion').addEventListener('click', cerrarHojaExcepcion);
  botonExcepcionAgregarHora.addEventListener('click', manejarAgregarHoraExcepcion);

  document.getElementById('boton-agregar-bloqueo').addEventListener('click', abrirHojaBloqueo);
  document.getElementById('boton-cerrar-hoja-bloqueo').addEventListener('click', cerrarHojaBloqueo);
  formBloqueo.addEventListener('submit', manejarGuardarBloqueo);
}

async function mostrar() {
  await cargarFechas();
  await cargarBloqueos();
}

window.HorarioUI = { inicializar, mostrar };

})();
