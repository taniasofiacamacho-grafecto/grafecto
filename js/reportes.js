// Reportes: resumen de ventas (hoy/semana/mes) con gráfica de ventas por día
// de la semana actual, y registro de ventas pasadas (sin necesidad de una
// cita) para poder capturar historial de días anteriores.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, fechaHoyISO, formatearMoneda } = window.UI;
const DB = window.GrafectoDB;

const MAX_RESULTADOS_BUSQUEDA = 20;
const ETIQUETAS_DIA_CORTA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const OPCIONES_LONGITUD_POR_TRATAMIENTO = {
  'Hair Therapy': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Retoque de crecimiento': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Tratamiento de hidratación': ['Corto', 'Mediano', 'Largo'],
};

let clientasCache = [];
let tratamientosCache = [];
let promocionSeleccionada = 'ninguna';
let estilistaSeleccionada = '';
let temporizadorOcultarResultados = null;

const fondoHoja = document.getElementById('fondo-hoja-venta-pasada');
const formulario = document.getElementById('formulario-venta-pasada');
const campoClientaBuscar = document.getElementById('venta-clienta-buscar');
const campoClienta = document.getElementById('venta-clienta');
const resultadosClienta = document.getElementById('venta-clienta-resultados');
const campoFecha = document.getElementById('venta-fecha');
const campoTratamiento = document.getElementById('venta-tratamiento');
const campoPrecio = document.getElementById('venta-precio');
const campoLongitud = document.getElementById('venta-longitud');
const campoNotas = document.getElementById('venta-notas');
const botonDictado = document.getElementById('venta-notas-dictado');
const botonesPromocion = document.querySelectorAll('#venta-promocion .pastilla-opcion');
const botonesEstilista = document.querySelectorAll('#venta-estilista .pastilla-opcion');
const campoEstilistaOtra = document.getElementById('venta-estilista-otra');
const resumenEl = document.getElementById('reportes-resumen');
const graficaEl = document.getElementById('reportes-grafica');
const estilistaListaEl = document.getElementById('reportes-estilista-lista');
const botonesEstilistaPeriodo = document.querySelectorAll('#reportes-estilista-periodo .pastilla-opcion');

let periodoEstilistaActivo = 'hoy';
let visitasPorPeriodo = { hoy: [], semana: [], mes: [] };

// ===== Resumen de ventas (día / semana / mes) + gráfica de la semana =====

function fechaISODesdeDate(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function sumarDiasISO(fechaISO, delta) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setDate(fecha.getDate() + delta);
  return fechaISODesdeDate(fecha);
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
  return sumarDiasISO(inicioSemanaISO(fechaISO), 6);
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

function crearColumnaGrafica(fecha, monto, maxMonto, esHoy) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);
  const pctAltura = maxMonto > 0 ? Math.max(4, Math.round((monto / maxMonto) * 100)) : 2;

  return crearEl(
    'div',
    { class: 'grafica-barras__columna' + (esHoy ? ' grafica-barras__columna--hoy' : '') },
    [
      crearEl('div', { class: 'grafica-barras__monto', texto: monto > 0 ? formatearMoneda(monto) : '' }),
      crearEl('div', { class: 'grafica-barras__barra', style: `height: ${pctAltura}%` }),
      crearEl('div', {
        class: 'grafica-barras__etiqueta',
        texto: `${ETIQUETAS_DIA_CORTA[fechaObj.getDay()]} ${dia}`,
      }),
    ]
  );
}

function renderizarGraficaSemana(visitasSemana, inicioSemana, hoy) {
  const montosPorFecha = {};
  for (const visita of visitasSemana) {
    montosPorFecha[visita.fecha] = (montosPorFecha[visita.fecha] || 0) + visita.precio;
  }
  const maxMonto = Math.max(0, ...Object.values(montosPorFecha));

  graficaEl.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDiasISO(inicioSemana, i);
    const monto = montosPorFecha[fecha] || 0;
    graficaEl.appendChild(crearColumnaGrafica(fecha, monto, maxMonto, fecha === hoy));
  }
}

// Cuenta servicios por estilista dentro de un conjunto de visitas, ordenado
// de mayor a menor cantidad. Las visitas sin estilista capturado se agrupan
// aparte para no perderlas del conteo.
function agruparPorEstilista(visitas) {
  const conteos = {};
  for (const visita of visitas) {
    const nombre = visita.estilista || '(sin especificar)';
    conteos[nombre] = (conteos[nombre] || 0) + 1;
  }
  return Object.entries(conteos)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

function renderizarEstilistas(periodo) {
  periodoEstilistaActivo = periodo;
  botonesEstilistaPeriodo.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.periodo === periodo));

  const grupos = agruparPorEstilista(visitasPorPeriodo[periodo]);
  estilistaListaEl.innerHTML = '';

  if (grupos.length === 0) {
    estilistaListaEl.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'Sin servicios registrados en este periodo.' })
    );
    return;
  }

  for (const grupo of grupos) {
    estilistaListaEl.appendChild(
      crearEl('div', { class: 'reportes-estilista-fila' }, [
        crearEl('div', { class: 'reportes-estilista-nombre', texto: grupo.nombre }),
        crearEl('div', {
          class: 'reportes-estilista-cantidad',
          texto: `${grupo.cantidad} ${grupo.cantidad === 1 ? 'servicio' : 'servicios'}`,
        }),
      ])
    );
  }
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

    renderizarGraficaSemana(visitasSemana, inicioSemanaISO(hoy), hoy);

    visitasPorPeriodo = { hoy: visitasHoy, semana: visitasSemana, mes: visitasMes };
    renderizarEstilistas(periodoEstilistaActivo);
  } catch (error) {
    resumenEl.innerHTML = '';
    resumenEl.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar el resumen.' }));
    graficaEl.innerHTML = '';
    estilistaListaEl.innerHTML = '';
    console.error(error);
  }
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

  if (coincidencias.length === 0) {
    resultadosClienta.appendChild(
      crearEl('div', { class: 'buscador-resultados__vacio', texto: 'No se encontraron clientas' })
    );
  } else {
    for (const clienta of coincidencias) {
      resultadosClienta.appendChild(
        crearEl('div', {
          class: 'buscador-resultados__item',
          texto: clienta.nombre,
          onclick: () => {
            campoClienta.value = clienta.id;
            campoClientaBuscar.value = clienta.nombre;
            ocultarResultadosClienta();
          },
        })
      );
    }
  }

  resultadosClienta.hidden = false;
}

function poblarLongitud(tratamientoNombre) {
  const opciones = [...(OPCIONES_LONGITUD_POR_TRATAMIENTO[tratamientoNombre] || []), 'Otro'];
  campoLongitud.innerHTML = '';
  campoLongitud.appendChild(crearEl('option', { value: '', texto: '(sin especificar)' }));
  for (const opcion of opciones) {
    campoLongitud.appendChild(crearEl('option', { value: opcion, texto: opcion }));
  }
}

async function abrir() {
  clientasCache = await DB.listarClientas();
  tratamientosCache = await DB.listarTratamientos();

  formulario.reset();
  campoClienta.value = '';
  ocultarResultadosClienta();

  campoTratamiento.innerHTML = '';
  campoTratamiento.appendChild(crearEl('option', { value: '', texto: '(sin especificar)' }));
  for (const tratamiento of tratamientosCache) {
    campoTratamiento.appendChild(crearEl('option', { value: tratamiento.id, texto: tratamiento.nombre }));
  }
  poblarLongitud('');

  promocionSeleccionada = 'ninguna';
  botonesPromocion.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'ninguna'));

  estilistaSeleccionada = '';
  botonesEstilista.forEach((b) => b.classList.remove('pastilla-opcion--activa'));
  campoEstilistaOtra.hidden = true;

  fondoHoja.classList.add('abierta');
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
}

function manejarCancelar() {
  const hayContenido = campoClientaBuscar.value.trim() || campoPrecio.value;
  if (hayContenido && !window.confirm('¿Descartar sin guardar?')) return;
  cerrar();
}

function resolverEstilista() {
  if (estilistaSeleccionada === 'otra') return campoEstilistaOtra.value.trim();
  return estilistaSeleccionada;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  const clientaValida = clientasCache.find((c) => c.id === campoClienta.value);
  if (!clientaValida) {
    mostrarMensaje('Selecciona una clienta de la lista');
    campoClientaBuscar.focus();
    return;
  }

  const precio = Number(campoPrecio.value);
  if (!campoPrecio.value || Number.isNaN(precio) || precio < 0) {
    mostrarMensaje('Escribe el precio cobrado');
    return;
  }

  if (!campoFecha.value) {
    mostrarMensaje('Elige la fecha');
    return;
  }

  try {
    await DB.agregarVisita({
      clientaId: campoClienta.value,
      citaId: null,
      tratamientoId: campoTratamiento.value || null,
      fecha: campoFecha.value,
      precio,
      longitud: campoLongitud.value,
      promocion: promocionSeleccionada,
      estilista: resolverEstilista(),
      notas: campoNotas.value,
    });

    mostrarMensaje('Venta registrada');
    cerrar();
    await cargarResumen();
  } catch (error) {
    mostrarMensaje('No se pudo guardar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-registrar-venta-pasada').addEventListener('click', abrir);
  document.getElementById('boton-cerrar-hoja-venta-pasada').addEventListener('click', manejarCancelar);
  formulario.addEventListener('submit', manejarGuardar);

  campoTratamiento.addEventListener('change', () => {
    const tratamiento = tratamientosCache.find((t) => t.id === campoTratamiento.value);
    poblarLongitud(tratamiento ? tratamiento.nombre : '');
  });

  campoClientaBuscar.addEventListener('input', () => {
    campoClienta.value = '';
    mostrarResultadosClienta(campoClientaBuscar.value);
  });
  campoClientaBuscar.addEventListener('focus', () => {
    mostrarResultadosClienta(campoClientaBuscar.value);
  });
  campoClientaBuscar.addEventListener('blur', () => {
    temporizadorOcultarResultados = setTimeout(ocultarResultadosClienta, 200);
  });
  resultadosClienta.addEventListener('mousedown', (evento) => {
    evento.preventDefault();
    clearTimeout(temporizadorOcultarResultados);
  });

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

  botonesEstilistaPeriodo.forEach((boton) => {
    boton.addEventListener('click', () => renderizarEstilistas(boton.dataset.periodo));
  });
}

async function mostrar() {
  await cargarResumen();
}

window.ReportesUI = { inicializar, mostrar };

})();
