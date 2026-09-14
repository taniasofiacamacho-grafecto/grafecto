// Vista "Hoy": resumen de lo cobrado (día/semana/mes) y las citas de hoy
// en tarjetas coloreadas según su estado, para usarse como pantalla de
// trabajo del día (en el local, desde laptop o celular).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, fechaHoyISO, formatearFechaLarga, formatearHora12, formatearMoneda } = window.UI;
const DB = window.GrafectoDB;

const listaEl = document.getElementById('lista-hoy');
const resumenEl = document.getElementById('resumen-hoy');
const rebooksSeccion = document.getElementById('rebooks-seccion');
const rebooksLista = document.getElementById('rebooks-lista');

function fechaISODesdeDate(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// La semana empieza en lunes.
function inicioSemanaISO(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay();
  const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana;
  fecha.setDate(fecha.getDate() + diferencia);
  return fechaISODesdeDate(fecha);
}

function finSemanaISO(fechaISO) {
  const [anio, mes, dia] = inicioSemanaISO(fechaISO).split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setDate(fecha.getDate() + 6);
  return fechaISODesdeDate(fecha);
}

function inicioMesISO(fechaISO) {
  const [anio, mes] = fechaISO.split('-');
  return `${anio}-${mes}-01`;
}

function finMesISO(fechaISO) {
  const [anio, mes] = fechaISO.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
}

function crearTarjetaResumen(etiqueta, visitas) {
  const total = visitas.reduce((acumulado, visita) => acumulado + visita.precio, 0);
  return crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
    crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: etiqueta }),
    crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(total) }),
    crearEl('div', {
      class: 'resumen-ingresos__cantidad',
      texto: `${visitas.length} ${visitas.length === 1 ? 'servicio' : 'servicios'}`,
    }),
  ]);
}

async function cargarResumen() {
  const hoy = fechaHoyISO();
  try {
    const [visitasHoy, visitasSemana, visitasMes] = await Promise.all([
      DB.listarVisitasEnRango(hoy, hoy),
      DB.listarVisitasEnRango(inicioSemanaISO(hoy), finSemanaISO(hoy)),
      DB.listarVisitasEnRango(inicioMesISO(hoy), finMesISO(hoy)),
    ]);

    resumenEl.innerHTML = '';
    resumenEl.append(
      crearTarjetaResumen('Hoy', visitasHoy),
      crearTarjetaResumen('Semana', visitasSemana),
      crearTarjetaResumen('Mes', visitasMes)
    );
  } catch (error) {
    console.error(error);
  }
}

// Se queda en la lista hasta que se marquen las dos cosas — mensaje enviado
// y confirmado — lo que pase después, no basta con una sola.
function crearFilaRebook(cita) {
  const textoFecha = `${formatearFechaLarga(cita.fecha)} · ${formatearHora12(cita.hora)}` +
    (cita.tratamientoNombre ? ` · ${cita.tratamientoNombre}` : '');

  const enlaceWhats = WhatsApp.generarEnlaceRecordatorioRebook(cita);

  const botonEnviar = cita.rebookRecordatorioEnviado
    ? crearEl('span', { class: 'campo__ayuda', texto: '✓ Recordatorio enviado' })
    : crearEl('a', {
        class: 'boton boton--secundario',
        href: enlaceWhats || undefined,
        target: '_blank',
        rel: 'noopener',
        texto: enlaceWhats ? 'Enviar recordatorio' : 'Sin teléfono',
        onclick: async (evento) => {
          if (!enlaceWhats) { evento.preventDefault(); return; }
          try {
            await DB.actualizarRebookRecordatorioEnviado(cita.id, true);
            await cargarRecordatoriosRebook();
          } catch (error) {
            console.error(error);
          }
        },
      });

  const botonConfirmar = cita.rebookConfirmado
    ? crearEl('span', { class: 'campo__ayuda', texto: '✓ Confirmado' })
    : crearEl('button', {
        type: 'button',
        class: 'boton boton--secundario',
        texto: 'Marcar como confirmado',
        onclick: async () => {
          try {
            await DB.actualizarRebookConfirmado(cita.id, true);
            await cargarRecordatoriosRebook();
          } catch (error) {
            console.error(error);
          }
        },
      });

  return crearEl('div', { class: 'reportes-dia-detalle__fila', style: 'flex-direction: column; align-items: stretch; gap: 6px; cursor: default;' }, [
    crearEl('div', {}, [
      crearEl('div', { class: 'reportes-dia-detalle__nombre', texto: cita.clientaNombre }),
      crearEl('div', { class: 'reportes-dia-detalle__extra', texto: textoFecha }),
    ]),
    crearEl('div', { class: 'fila-botones' }, [botonEnviar, botonConfirmar]),
  ]);
}

async function cargarRecordatoriosRebook() {
  try {
    const rebooks = await DB.listarRebooksPendientes();
    rebooksLista.innerHTML = '';

    if (rebooks.length === 0) {
      rebooksSeccion.hidden = true;
      return;
    }

    for (const cita of rebooks) {
      rebooksLista.appendChild(crearFilaRebook(cita));
    }
    rebooksSeccion.hidden = false;
  } catch (error) {
    console.error(error);
  }
}

function renderizarCitasHoy(citas) {
  listaEl.innerHTML = '';

  if (citas.length === 0) {
    listaEl.appendChild(
      crearEl('div', { class: 'estado-vacio' }, [
        crearEl('div', { class: 'estado-vacio__titulo', texto: 'No tienes citas para hoy' }),
      ])
    );
    return;
  }

  for (const cita of citas) {
    listaEl.appendChild(
      TarjetaCita.crear(cita, {
        colorFondo: true,
        mostrarMensajeSalida: true,
        onEditar: (c) => window.AgendaUI.editar(c),
        onCambio: () => mostrar(),
      })
    );
  }
}

async function mostrar() {
  await cargarResumen();
  await cargarRecordatoriosRebook();
  try {
    const todas = await DB.listarCitas();
    const hoy = fechaHoyISO();
    renderizarCitasHoy(todas.filter((cita) => cita.fecha === hoy));
  } catch (error) {
    mostrarMensaje('No se pudo cargar el resumen de hoy.');
    console.error(error);
  }
}

window.HoyUI = { mostrar };

})();
