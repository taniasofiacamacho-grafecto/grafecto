// Horario: lista exacta de horas en que se recibe clienta, por día de la
// semana (se repite), más excepciones puntuales (cerrar un día, u horario
// distinto solo para una fecha) y bloqueos manuales de horas sin cita.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]; // empieza en lunes, domingo al final

const listaHorario = document.getElementById('horario-semanal-lista');
const listaExcepciones = document.getElementById('excepciones-lista');
const listaBloqueos = document.getElementById('bloqueos-lista');

function crearChipHora(hora, onEliminar) {
  return crearEl('span', { class: 'chip-hora' }, [
    crearEl('span', { texto: formatearHora12(hora) }),
    crearEl('button', { type: 'button', texto: '✕', 'aria-label': 'Quitar hora', onclick: onEliminar }),
  ]);
}

// ===== Horario semanal (recurrente) =====

function crearFilaDia(diaSemana, slots) {
  const chips = crearEl('div', { class: 'chips-horas' });
  const campoHora = crearEl('input', { type: 'time' });
  const botonAgregar = crearEl('button', { type: 'button', class: 'boton boton--secundario', texto: '+ Agregar' });

  function pintarChips(lista) {
    chips.innerHTML = '';
    if (lista.length === 0) {
      chips.appendChild(crearEl('span', { class: 'campo__ayuda', texto: 'Sin horas — este día queda cerrado.' }));
      return;
    }
    for (const slot of lista) {
      chips.appendChild(
        crearChipHora(slot.hora, async () => {
          try {
            await DB.eliminarSlot(slot.id);
            await recargar();
          } catch (error) {
            mostrarMensaje('No se pudo quitar la hora');
            console.error(error);
          }
        })
      );
    }
  }

  let slotsActuales = slots;
  async function recargar() {
    const todos = await DB.listarSlotsSemanales();
    slotsActuales = todos.filter((s) => s.diaSemana === diaSemana);
    pintarChips(slotsActuales);
  }

  botonAgregar.addEventListener('click', async () => {
    if (!campoHora.value) return;
    try {
      await DB.agregarSlotSemanal(diaSemana, campoHora.value);
      campoHora.value = '';
      await recargar();
    } catch (error) {
      mostrarMensaje('No se pudo agregar la hora');
      console.error(error);
    }
  });

  pintarChips(slotsActuales);

  return crearEl('div', { class: 'horario-dia' }, [
    crearEl('div', { class: 'horario-dia__nombre', texto: NOMBRES_DIA[diaSemana] }),
    chips,
    crearEl('div', { class: 'fila-agregar-hora' }, [campoHora, botonAgregar]),
  ]);
}

async function cargarHorarioSemanal() {
  listaHorario.innerHTML = '';
  try {
    const slots = await DB.listarSlotsSemanales();
    for (const diaSemana of ORDEN_DIAS) {
      listaHorario.appendChild(crearFilaDia(diaSemana, slots.filter((s) => s.diaSemana === diaSemana)));
    }
  } catch (error) {
    listaHorario.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar el horario.' }));
    console.error(error);
  }
}

// ===== Excepciones (días cerrados puntuales + horarios distintos puntuales) =====

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

async function cargarExcepciones() {
  listaExcepciones.innerHTML = '';
  try {
    const [diasCerrados, slotsExcepcion] = await Promise.all([
      DB.listarDiasCerrados(),
      DB.listarSlotsDeExcepciones(),
    ]);

    if (diasCerrados.length === 0 && slotsExcepcion.length === 0) {
      listaExcepciones.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'No tienes excepciones próximas.' })
      );
      return;
    }

    for (const dia of diasCerrados) {
      listaExcepciones.appendChild(
        crearItemLista(dia.fecha, 'Cerrado todo el día', async () => {
          try {
            await DB.eliminarDiaCerrado(dia.id);
            await cargarExcepciones();
          } catch (error) {
            mostrarMensaje('No se pudo eliminar');
            console.error(error);
          }
        })
      );
    }

    // Agrupa las horas puntuales por fecha para mostrar una tarjeta por día.
    const porFecha = {};
    for (const slot of slotsExcepcion) {
      (porFecha[slot.fecha] ||= []).push(slot);
    }
    for (const [fecha, slots] of Object.entries(porFecha)) {
      const detalle = slots.map((s) => formatearHora12(s.hora)).join(', ');
      listaExcepciones.appendChild(
        crearItemLista(fecha, `Horario distinto: ${detalle}`, async () => {
          try {
            await Promise.all(slots.map((s) => DB.eliminarSlot(s.id)));
            await cargarExcepciones();
          } catch (error) {
            mostrarMensaje('No se pudo eliminar');
            console.error(error);
          }
        })
      );
    }
  } catch (error) {
    listaExcepciones.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'No se pudieron cargar las excepciones.' })
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

// ===== Hoja: nueva excepción =====

const fondoHojaExcepcion = document.getElementById('fondo-hoja-excepcion');
const formExcepcion = document.getElementById('formulario-excepcion');
const campoExcepcionFecha = document.getElementById('excepcion-fecha');
const botonesExcepcionTipo = document.querySelectorAll('#excepcion-tipo .pastilla-opcion');
const campoExcepcionHoras = document.getElementById('excepcion-horas');
const chipsExcepcionHoras = document.getElementById('excepcion-horas-chips');
const campoExcepcionNuevaHora = document.getElementById('excepcion-nueva-hora');
const botonExcepcionAgregarHora = document.getElementById('excepcion-agregar-hora');
let excepcionAbierta = false;
let horasAgregadasEnSesion = [];

function pintarChipsExcepcion() {
  chipsExcepcionHoras.innerHTML = '';
  if (horasAgregadasEnSesion.length === 0) {
    chipsExcepcionHoras.appendChild(
      crearEl('span', { class: 'campo__ayuda', texto: 'Agrega al menos una hora.' })
    );
    return;
  }
  for (const slot of horasAgregadasEnSesion) {
    chipsExcepcionHoras.appendChild(
      crearChipHora(slot.hora, async () => {
        try {
          await DB.eliminarSlot(slot.id);
          horasAgregadasEnSesion = horasAgregadasEnSesion.filter((s) => s.id !== slot.id);
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
  formExcepcion.reset();
  excepcionAbierta = false;
  horasAgregadasEnSesion = [];
  botonesExcepcionTipo.forEach((b) =>
    b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'cerrado')
  );
  campoExcepcionHoras.hidden = true;
  pintarChipsExcepcion();
  fondoHojaExcepcion.classList.add('abierta');
}

function cerrarHojaExcepcion() {
  fondoHojaExcepcion.classList.remove('abierta');
}

async function manejarAgregarHoraExcepcion() {
  if (!campoExcepcionFecha.value) {
    mostrarMensaje('Elige primero la fecha');
    return;
  }
  if (!campoExcepcionNuevaHora.value) return;

  try {
    await DB.agregarSlotExcepcion(campoExcepcionFecha.value, campoExcepcionNuevaHora.value);
    // Volvemos a leer para tener el id real del slot recién creado.
    const todas = await DB.listarSlotsDeExcepciones();
    horasAgregadasEnSesion = todas.filter((s) => s.fecha === campoExcepcionFecha.value);
    campoExcepcionNuevaHora.value = '';
    pintarChipsExcepcion();
  } catch (error) {
    mostrarMensaje('No se pudo agregar la hora');
    console.error(error);
  }
}

async function manejarGuardarExcepcion(evento) {
  evento.preventDefault();
  if (!campoExcepcionFecha.value) return;

  try {
    if (!excepcionAbierta) {
      await DB.agregarDiaCerrado(campoExcepcionFecha.value);
    }
    mostrarMensaje('Excepción guardada');
    cerrarHojaExcepcion();
    await cargarExcepciones();
  } catch (error) {
    mostrarMensaje('No se pudo guardar la excepción');
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
  formExcepcion.addEventListener('submit', manejarGuardarExcepcion);
  botonExcepcionAgregarHora.addEventListener('click', manejarAgregarHoraExcepcion);
  botonesExcepcionTipo.forEach((boton) => {
    boton.addEventListener('click', () => {
      botonesExcepcionTipo.forEach((b) => b.classList.remove('pastilla-opcion--activa'));
      boton.classList.add('pastilla-opcion--activa');
      excepcionAbierta = boton.dataset.valor === 'abierto';
      campoExcepcionHoras.hidden = !excepcionAbierta;
    });
  });

  document.getElementById('boton-agregar-bloqueo').addEventListener('click', abrirHojaBloqueo);
  document.getElementById('boton-cerrar-hoja-bloqueo').addEventListener('click', cerrarHojaBloqueo);
  formBloqueo.addEventListener('submit', manejarGuardarBloqueo);
}

async function mostrar() {
  await cargarHorarioSemanal();
  await cargarExcepciones();
  await cargarBloqueos();
}

window.HorarioUI = { inicializar, mostrar };

})();
