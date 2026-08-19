// Horario base (se repite cada semana), excepciones puntuales, y bloqueos
// manuales de horas sin cita. Es la base para calcular disponibilidad.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12 } = window.UI;
const DB = window.GrafectoDB;

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]; // empieza en lunes, domingo al final

const listaHorario = document.getElementById('horario-semanal-lista');
const listaExcepciones = document.getElementById('excepciones-lista');
const listaBloqueos = document.getElementById('bloqueos-lista');

// ===== Horario semanal =====

function crearFilaDia(dia) {
  const toggle = crearEl('button', {
    type: 'button',
    class: dia.abierto ? 'pastilla-opcion pastilla-opcion--activa' : 'pastilla-opcion',
    texto: dia.abierto ? 'Abierto' : 'Cerrado',
  });

  const campoInicio = crearEl('input', { type: 'time', value: dia.horaInicio || '10:00' });
  const campoFin = crearEl('input', { type: 'time', value: dia.horaFin || '18:00' });
  const horas = crearEl('div', { class: 'horario-dia__horas', hidden: !dia.abierto }, [
    campoInicio,
    crearEl('span', { texto: 'a' }),
    campoFin,
  ]);

  async function guardar() {
    try {
      await DB.actualizarDiaHorario(dia.diaSemana, {
        abierto: toggle.classList.contains('pastilla-opcion--activa'),
        horaInicio: campoInicio.value,
        horaFin: campoFin.value,
      });
    } catch (error) {
      mostrarMensaje('No se pudo guardar el horario');
      console.error(error);
    }
  }

  toggle.addEventListener('click', () => {
    const activo = !toggle.classList.contains('pastilla-opcion--activa');
    toggle.classList.toggle('pastilla-opcion--activa', activo);
    toggle.textContent = activo ? 'Abierto' : 'Cerrado';
    horas.hidden = !activo;
    guardar();
  });
  campoInicio.addEventListener('change', guardar);
  campoFin.addEventListener('change', guardar);

  return crearEl('div', { class: 'horario-dia' }, [
    crearEl('div', { class: 'horario-dia__nombre', texto: NOMBRES_DIA[dia.diaSemana] }),
    toggle,
    horas,
  ]);
}

async function cargarHorarioSemanal() {
  listaHorario.innerHTML = '';
  try {
    await DB.asegurarHorarioPorDefecto();
    const dias = await DB.listarHorarioSemanal();
    const porDia = Object.fromEntries(dias.map((d) => [d.diaSemana, d]));
    for (const numeroDia of ORDEN_DIAS) {
      listaHorario.appendChild(crearFilaDia(porDia[numeroDia]));
    }
  } catch (error) {
    listaHorario.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar el horario.' }));
    console.error(error);
  }
}

// ===== Excepciones =====

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
    const excepciones = await DB.listarExcepciones();
    if (excepciones.length === 0) {
      listaExcepciones.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'No tienes excepciones próximas.' })
      );
      return;
    }
    for (const excepcion of excepciones) {
      const detalle = excepcion.abierto
        ? `${formatearHora12(excepcion.horaInicio)} a ${formatearHora12(excepcion.horaFin)}`
        : 'Cerrado todo el día';
      listaExcepciones.appendChild(
        crearItemLista(excepcion.fecha, detalle, async () => {
          try {
            await DB.eliminarExcepcion(excepcion.id);
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
const campoExcepcionInicio = document.getElementById('excepcion-hora-inicio');
const campoExcepcionFin = document.getElementById('excepcion-hora-fin');
let excepcionAbierta = false;

function abrirHojaExcepcion() {
  formExcepcion.reset();
  excepcionAbierta = false;
  botonesExcepcionTipo.forEach((b) =>
    b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'cerrado')
  );
  campoExcepcionHoras.hidden = true;
  fondoHojaExcepcion.classList.add('abierta');
}

function cerrarHojaExcepcion() {
  fondoHojaExcepcion.classList.remove('abierta');
}

async function manejarGuardarExcepcion(evento) {
  evento.preventDefault();
  if (!campoExcepcionFecha.value) return;

  try {
    await DB.agregarExcepcion({
      fecha: campoExcepcionFecha.value,
      abierto: excepcionAbierta,
      horaInicio: campoExcepcionInicio.value,
      horaFin: campoExcepcionFin.value,
    });
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
