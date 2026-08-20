// Vista de agenda: lista de citas agrupadas por día, alta/edición vía hoja modal,
// y el enlace de recordatorio de WhatsApp por cita.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearDuracion, formatearHora12, fechaHoyISO } = window.UI;
const DB = window.GrafectoDB;

const MAX_RESULTADOS_BUSQUEDA = 20;

// Compara solo hora:minuto — citas.hora y horario_slots.hora pueden venir
// con o sin segundos según cómo los haya guardado Postgres.
function horaCorta(hora) {
  return (hora || '').slice(0, 5);
}

let idEnEdicion = null;
let citasCargadas = false;
let tratamientosCache = [];
let clientasCache = [];
let temporizadorOcultarResultados = null;

const listaEl = document.getElementById('lista-agenda');
const fondoHoja = document.getElementById('fondo-hoja-cita');
const hojaTitulo = document.getElementById('hoja-cita-titulo');
const formulario = document.getElementById('formulario-cita');
const campoClientaBuscar = document.getElementById('cita-clienta-buscar');
const campoClienta = document.getElementById('cita-clienta');
const resultadosClienta = document.getElementById('cita-clienta-resultados');
const campoTratamiento = document.getElementById('cita-tratamiento');
const campoTratamientoDuracion = document.getElementById('cita-tratamiento-duracion');
const campoFecha = document.getElementById('cita-fecha');
const campoHora = document.getElementById('cita-hora');
const campoHorasDisponibles = document.getElementById('cita-horas-disponibles');
const campoNotas = document.getElementById('cita-notas');
const botonEliminar = document.getElementById('boton-eliminar-cita');
const postGuardado = document.getElementById('cita-post-guardado');
const postGuardadoTexto = document.getElementById('cita-post-guardado-texto');
const postGuardadoBotones = document.getElementById('cita-post-guardado-botones');
const botonPostGuardadoListo = document.getElementById('boton-cita-post-guardado-listo');

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
  const hoy = fechaHoyISO();

  for (const cita of citas) {
    if (cita.fecha !== fechaAnterior) {
      const esHoy = cita.fecha === hoy;
      listaEl.appendChild(
        crearEl('div', {
          class: esHoy ? 'agenda-fecha agenda-fecha--hoy' : 'agenda-fecha',
          texto: esHoy ? `Hoy · ${formatearFechaLarga(cita.fecha)}` : formatearFechaLarga(cita.fecha),
        })
      );
      fechaAnterior = cita.fecha;
    }

    listaEl.appendChild(
      TarjetaCita.crear(cita, { onEditar: abrirHojaCita, onCambio: cargarCitas })
    );
  }
}

async function cargarClientasCache() {
  clientasCache = await DB.listarClientas();
}

function ocultarResultadosClienta() {
  resultadosClienta.hidden = true;
  resultadosClienta.innerHTML = '';
}

function mostrarResultadosClienta(texto) {
  const filtro = DB.normalizarTexto(texto);
  const coincidencias = filtro
    ? clientasCache.filter((c) => c.nombreNormalizado.includes(filtro)).slice(0, MAX_RESULTADOS_BUSQUEDA)
    : clientasCache.slice(0, MAX_RESULTADOS_BUSQUEDA);

  resultadosClienta.innerHTML = '';

  if (clientasCache.length === 0) {
    resultadosClienta.appendChild(
      crearEl('div', { class: 'buscador-resultados__vacio', texto: 'Primero agrega una clienta' })
    );
  } else if (coincidencias.length === 0) {
    resultadosClienta.appendChild(
      crearEl('div', { class: 'buscador-resultados__vacio', texto: 'No se encontraron clientas' })
    );
  } else {
    for (const clienta of coincidencias) {
      resultadosClienta.appendChild(
        crearEl('div', {
          class: 'buscador-resultados__item',
          texto: clienta.nombre,
          onclick: () => seleccionarClienta(clienta),
        })
      );
    }
  }

  resultadosClienta.hidden = false;
}

function seleccionarClienta(clienta) {
  campoClienta.value = clienta.id;
  campoClientaBuscar.value = clienta.nombre;
  ocultarResultadosClienta();
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

// Cruza "fechas habilitadas" contra las citas ya agendadas (igual que en
// Horario) para ofrecer solo las horas realmente libres de ese día, con un
// botón "Otro horario" para seguir pudiendo escribirlo a mano.
function seleccionarHoraDisponible(hora, botonActivo) {
  campoHorasDisponibles.querySelectorAll('.pastilla-opcion').forEach((b) => b.classList.remove('pastilla-opcion--activa'));
  botonActivo.classList.add('pastilla-opcion--activa');

  if (hora === null) {
    campoHora.hidden = false;
    campoHora.value = '';
    campoHora.focus();
  } else {
    campoHora.value = horaCorta(hora);
    campoHora.hidden = true;
  }
}

async function cargarHorasDisponibles(fecha, horaActual) {
  campoHorasDisponibles.innerHTML = '';
  campoHorasDisponibles.hidden = true;
  campoHora.hidden = false;

  if (!fecha) return;

  let slots = [];
  try {
    const [slotsCrudos, citas] = await Promise.all([DB.listarSlotsFechas(), DB.listarCitas()]);
    const ocupadas = new Set(
      citas.filter((c) => c.id !== idEnEdicion).map((c) => `${c.fecha}|${horaCorta(c.hora)}`)
    );
    slots = slotsCrudos
      .filter((s) => s.fecha === fecha && !ocupadas.has(`${s.fecha}|${horaCorta(s.hora)}`))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  } catch (error) {
    console.error(error);
    return;
  }

  if (slots.length === 0) return;

  const horaActualCorta = horaCorta(horaActual);
  let coincide = false;

  for (const slot of slots) {
    const boton = crearEl('button', { type: 'button', class: 'pastilla-opcion', texto: formatearHora12(slot.hora) });
    if (horaCorta(slot.hora) === horaActualCorta) {
      boton.classList.add('pastilla-opcion--activa');
      coincide = true;
    }
    boton.addEventListener('click', () => seleccionarHoraDisponible(slot.hora, boton));
    campoHorasDisponibles.appendChild(boton);
  }

  const botonOtro = crearEl('button', { type: 'button', class: 'pastilla-opcion', texto: 'Otro horario' });
  if (!coincide && horaActualCorta) botonOtro.classList.add('pastilla-opcion--activa');
  botonOtro.addEventListener('click', () => seleccionarHoraDisponible(null, botonOtro));
  campoHorasDisponibles.appendChild(botonOtro);

  campoHorasDisponibles.hidden = false;
  campoHora.hidden = coincide;
}

async function abrirHojaCita(cita = null) {
  idEnEdicion = cita ? cita.id : null;
  hojaTitulo.textContent = cita ? 'Editar cita' : 'Nueva cita';

  await cargarClientasCache();
  await llenarSelectTratamientos(cita ? cita.tratamientoId : null);

  campoClientaBuscar.value = cita ? cita.clientaNombre : '';
  campoClienta.value = cita ? cita.clientaId : '';
  ocultarResultadosClienta();

  campoFecha.value = cita ? cita.fecha : '';
  campoHora.value = cita ? cita.hora : '';
  campoNotas.value = cita ? cita.notas : '';
  botonEliminar.hidden = !cita;

  await cargarHorasDisponibles(campoFecha.value, campoHora.value);

  fondoHoja.classList.add('abierta');
}

function cerrarHojaCita() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  formulario.hidden = false;
  postGuardado.hidden = true;
  ocultarResultadosClienta();
  idEnEdicion = null;
}

// Tras agendar una cita nueva (no al editar), ofrece mandar de una vez los
// mensajes de WhatsApp de esa cita, sin tener que ir a buscarla después en
// la agenda — a petición de la usuaria.
function mostrarPostGuardado(cita) {
  hojaTitulo.textContent = '¡Cita guardada!';
  formulario.hidden = true;

  postGuardadoBotones.innerHTML = '';

  if (!cita.clientaTelefono) {
    postGuardadoTexto.textContent = `${cita.clientaNombre} no tiene teléfono capturado, así que no se le puede mandar WhatsApp.`;
  } else {
    postGuardadoTexto.textContent = `¿Le mandamos los mensajes de WhatsApp a ${cita.clientaNombre.split(' ')[0]}?`;

    const botones = [
      ['Confirmación', WhatsApp.generarEnlaceConfirmacion(cita)],
      WhatsApp.debeSugerirDeepCleanse(cita.fecha)
        ? ['Deep cleanse', WhatsApp.generarEnlaceDeepCleanse(cita)]
        : null,
      ['Recordatorio', WhatsApp.generarEnlaceRecordatorio(cita)],
    ].filter(Boolean);

    postGuardadoBotones.append(
      ...botones.map(([etiqueta, enlace]) =>
        crearEl('a', {
          class: 'cita-post-guardado__boton',
          href: enlace,
          target: '_blank',
          rel: 'noopener',
          texto: etiqueta,
        })
      )
    );
  }

  postGuardado.hidden = false;
}

function manejarCancelarCita() {
  const hayContenido = campoClientaBuscar.value.trim() || campoFecha.value || campoHora.value || campoNotas.value.trim();
  if (hayContenido && !window.confirm('¿Descartar los cambios sin guardar?')) return;
  cerrarHojaCita();
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  const clientaValida = clientasCache.find((c) => c.id === campoClienta.value);
  if (!clientaValida) {
    mostrarMensaje('Selecciona una clienta de la lista');
    campoClientaBuscar.focus();
    return;
  }

  const datos = {
    clientaId: campoClienta.value,
    tratamientoId: campoTratamiento.value || null,
    fecha: campoFecha.value,
    hora: campoHora.value,
    notas: campoNotas.value,
  };

  try {
    if (idEnEdicion) {
      await DB.actualizarCita(idEnEdicion, datos);
      mostrarMensaje('Cita actualizada');
      cerrarHojaCita();
    } else {
      const citaNueva = await DB.agregarCita(datos);
      mostrarPostGuardado(citaNueva);
    }

    await cargarCitas();
  } catch (error) {
    mostrarMensaje('No se pudo guardar la cita: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

async function manejarEliminar() {
  if (!idEnEdicion) return;
  const confirmar = window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  try {
    await DB.eliminarCita(idEnEdicion);
    mostrarMensaje('Cita eliminada');
    cerrarHojaCita();
    await cargarCitas();
  } catch (error) {
    mostrarMensaje('No se pudo eliminar la cita: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializarAgenda() {
  document.getElementById('boton-cerrar-hoja-cita').addEventListener('click', manejarCancelarCita);
  formulario.addEventListener('submit', manejarGuardar);
  botonEliminar.addEventListener('click', manejarEliminar);
  botonPostGuardadoListo.addEventListener('click', cerrarHojaCita);
  campoTratamiento.addEventListener('change', actualizarAyudaDuracion);
  campoFecha.addEventListener('change', () => cargarHorasDisponibles(campoFecha.value, ''));

  campoClientaBuscar.addEventListener('input', () => {
    campoClienta.value = '';
    mostrarResultadosClienta(campoClientaBuscar.value);
  });
  campoClientaBuscar.addEventListener('focus', () => {
    mostrarResultadosClienta(campoClientaBuscar.value);
  });
  campoClientaBuscar.addEventListener('blur', () => {
    // Retraso para que el clic en un resultado alcance a registrarse antes de ocultarlo.
    temporizadorOcultarResultados = setTimeout(ocultarResultadosClienta, 200);
  });
  resultadosClienta.addEventListener('mousedown', (evento) => {
    evento.preventDefault();
    clearTimeout(temporizadorOcultarResultados);
  });
}

window.AgendaUI = {
  inicializar: inicializarAgenda,
  abrirNuevo: () => abrirHojaCita(null),
  editar: (cita) => abrirHojaCita(cita),
  mostrar: () => cargarCitas(),
};

})();
