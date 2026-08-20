// Finanzas: captura de gastos fijos, nómina y gastos extras del mes, y el
// costo de material por tratamiento — la base para calcular el punto de
// equilibrio (el tablero con las gráficas se agrega en un siguiente paso).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearMoneda, fechaHoyISO } = window.UI;
const DB = window.GrafectoDB;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function mesActualISO() {
  return `${fechaHoyISO().slice(0, 7)}-01`;
}

function formatearMesLargo(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const nombre = MESES[mes - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return 'Sin fecha';
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return `${dia} ${MESES[mes - 1].slice(0, 3)} ${anio}`;
}

// ===== Configuración: costo de material por tratamiento =====

const campoCostoMaterial = document.getElementById('config-costo-material');

async function cargarConfig() {
  try {
    const config = await DB.obtenerConfig();
    campoCostoMaterial.value = config.costoMaterialPorTratamiento;
  } catch (error) {
    console.error(error);
  }
}

async function manejarGuardarCostoMaterial() {
  const valor = Number(campoCostoMaterial.value);
  if (!campoCostoMaterial.value || Number.isNaN(valor) || valor < 0) return;

  try {
    await DB.actualizarCostoMaterial(valor);
    mostrarMensaje('Costo de material actualizado');
    cargarPuntoEquilibrio();
  } catch (error) {
    mostrarMensaje('No se pudo guardar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

// ===== Gastos fijos del mes =====

const fondoGastosFijos = document.getElementById('fondo-hoja-gastos-fijos');
const gastosFijosMesTitulo = document.getElementById('gastos-fijos-mes-titulo');
const gastosFijosLista = document.getElementById('gastos-fijos-lista');

let mesGastosFijos = null;

// Cada campo se guarda solo (al perder el foco), sin un botón de "Guardar"
// general — son muchos renglones cortos, mejor que cada uno se vaya
// guardando por su cuenta. La etiqueta Real/Estimado se actualiza sola
// según si ya se capturó el monto real.
function crearFilaGastoFijo(fila) {
  const tag = crearEl('span', {
    class: fila.montoReal !== null ? 'chip chip--real' : 'chip chip--estimado',
    texto: fila.montoReal !== null ? 'Real' : 'Estimado',
  });

  const campoNombre = crearEl('input', {
    type: 'text',
    class: 'gasto-fila-editable__nombre-input',
    value: fila.concepto,
    autocapitalize: 'sentences',
  });
  campoNombre.addEventListener('change', async () => {
    const valor = campoNombre.value.trim();
    if (!valor) {
      campoNombre.value = fila.concepto;
      return;
    }
    try {
      await DB.actualizarGastoFijo(fila.id, { concepto: valor });
      fila.concepto = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoEstimado = crearEl('input', {
    type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: fila.montoEstimado,
  });
  campoEstimado.addEventListener('change', async () => {
    const valor = Number(campoEstimado.value) || 0;
    try {
      await DB.actualizarGastoFijo(fila.id, { montoEstimado: valor });
      fila.montoEstimado = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoReal = crearEl('input', {
    type: 'number',
    inputmode: 'decimal',
    min: '0',
    step: '0.01',
    value: fila.montoReal !== null ? fila.montoReal : '',
    placeholder: '—',
  });
  campoReal.addEventListener('change', async () => {
    const valor = campoReal.value === '' ? null : Number(campoReal.value) || 0;
    try {
      await DB.actualizarGastoFijo(fila.id, { montoReal: valor });
      fila.montoReal = valor;
      tag.className = valor !== null ? 'chip chip--real' : 'chip chip--estimado';
      tag.textContent = valor !== null ? 'Real' : 'Estimado';
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const botonPagado = crearEl('button', {
    type: 'button',
    class: fila.pagado
      ? 'gasto-fila-editable__pagado gasto-fila-editable__pagado--activo'
      : 'gasto-fila-editable__pagado',
    texto: fila.pagado ? '✓ Pagado' : 'Marcar pagado',
    onclick: async () => {
      const nuevo = !fila.pagado;
      try {
        await DB.actualizarGastoFijo(fila.id, { pagado: nuevo });
        fila.pagado = nuevo;
        botonPagado.className = nuevo
          ? 'gasto-fila-editable__pagado gasto-fila-editable__pagado--activo'
          : 'gasto-fila-editable__pagado';
        botonPagado.textContent = nuevo ? '✓ Pagado' : 'Marcar pagado';
      } catch (error) {
        mostrarMensaje('No se pudo guardar');
        console.error(error);
      }
    },
  });

  const campoFecha = crearEl('input', {
    type: 'date', class: 'gasto-fila-editable__fecha', value: fila.fechaPago || '',
  });
  campoFecha.addEventListener('change', async () => {
    try {
      await DB.actualizarGastoFijo(fila.id, { fechaPago: campoFecha.value || null });
      fila.fechaPago = campoFecha.value || null;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const botonEliminar = crearEl('button', {
    type: 'button',
    class: 'gasto-extra-fila__eliminar',
    texto: '✕',
    'aria-label': 'Eliminar gasto',
    onclick: async () => {
      if (!window.confirm(`¿Eliminar "${fila.concepto}" de este mes?`)) return;
      try {
        await DB.eliminarGastoFijo(fila.id);
        filaEl.remove();
      } catch (error) {
        mostrarMensaje('No se pudo eliminar');
        console.error(error);
      }
    },
  });

  const filaEl = crearEl('div', { class: 'gasto-fila-editable' }, [
    crearEl('div', { class: 'gasto-fila-editable__encabezado' }, [campoNombre, tag, botonEliminar]),
    crearEl('div', { class: 'gasto-fila-editable__campos' }, [
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Estimado' }), campoEstimado]),
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Real' }), campoReal]),
    ]),
    crearEl('div', { class: 'gasto-fila-editable__pie' }, [botonPagado, campoFecha]),
  ]);

  return filaEl;
}

async function abrirGastosFijos() {
  mesGastosFijos = mesActualISO();
  gastosFijosMesTitulo.textContent = formatearMesLargo(mesGastosFijos);
  gastosFijosLista.innerHTML = '';
  gastosFijosLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'Cargando…' }));
  fondoGastosFijos.classList.add('abierta');

  try {
    const filas = await DB.asegurarGastosFijosDelMes(mesGastosFijos);
    gastosFijosLista.innerHTML = '';
    for (const fila of filas) {
      gastosFijosLista.appendChild(crearFilaGastoFijo(fila));
    }
  } catch (error) {
    gastosFijosLista.innerHTML = '';
    gastosFijosLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar.' }));
    console.error(error);
  }
}

function cerrarGastosFijos() {
  fondoGastosFijos.classList.remove('abierta');
  cargarPuntoEquilibrio();
}

async function manejarAgregarGastoFijo() {
  try {
    const nueva = await DB.agregarGastoFijo(mesGastosFijos, 'Nuevo gasto');
    gastosFijosLista.appendChild(crearFilaGastoFijo(nueva));
  } catch (error) {
    mostrarMensaje('No se pudo agregar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

// ===== Nómina del mes =====

const fondoNomina = document.getElementById('fondo-hoja-nomina');
const nominaMesTitulo = document.getElementById('nomina-mes-titulo');
const nominaLista = document.getElementById('nomina-lista');

let mesNomina = null;

function crearFilaNomina(fila) {
  const tag = crearEl('span', {
    class: fila.montoReal !== null ? 'chip chip--real' : 'chip chip--estimado',
    texto: fila.montoReal !== null ? 'Real' : 'Estimado',
  });

  const campoFecha = crearEl('input', {
    type: 'date', class: 'gasto-fila-editable__fecha', value: fila.fecha || '',
  });
  campoFecha.addEventListener('change', async () => {
    try {
      await DB.actualizarNomina(fila.id, { fecha: campoFecha.value || null });
      fila.fecha = campoFecha.value || null;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoEstimado = crearEl('input', {
    type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: fila.montoEstimado,
  });
  campoEstimado.addEventListener('change', async () => {
    const valor = Number(campoEstimado.value) || 0;
    try {
      await DB.actualizarNomina(fila.id, { montoEstimado: valor });
      fila.montoEstimado = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoReal = crearEl('input', {
    type: 'number',
    inputmode: 'decimal',
    min: '0',
    step: '0.01',
    value: fila.montoReal !== null ? fila.montoReal : '',
    placeholder: '—',
  });
  campoReal.addEventListener('change', async () => {
    const valor = campoReal.value === '' ? null : Number(campoReal.value) || 0;
    try {
      await DB.actualizarNomina(fila.id, { montoReal: valor });
      fila.montoReal = valor;
      tag.className = valor !== null ? 'chip chip--real' : 'chip chip--estimado';
      tag.textContent = valor !== null ? 'Real' : 'Estimado';
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const botonEliminar = crearEl('button', {
    type: 'button',
    class: 'gasto-extra-fila__eliminar',
    texto: '✕',
    'aria-label': 'Eliminar semana',
    onclick: async () => {
      if (!window.confirm(`¿Eliminar la semana ${fila.semana}?`)) return;
      try {
        await DB.eliminarNomina(fila.id);
        filaEl.remove();
      } catch (error) {
        mostrarMensaje('No se pudo eliminar');
        console.error(error);
      }
    },
  });

  const filaEl = crearEl('div', { class: 'gasto-fila-editable' }, [
    crearEl('div', { class: 'gasto-fila-editable__encabezado' }, [
      crearEl('div', { class: 'gasto-fila-editable__nombre', texto: `Semana ${fila.semana}` }),
      tag,
      botonEliminar,
    ]),
    crearEl('div', { class: 'gasto-fila-editable__campos' }, [
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Estimado' }), campoEstimado]),
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Real' }), campoReal]),
    ]),
    crearEl('div', { class: 'gasto-fila-editable__pie' }, [
      crearEl('span', { class: 'campo__ayuda', texto: 'Fecha de pago' }),
      campoFecha,
    ]),
  ]);

  return filaEl;
}

async function abrirNomina() {
  mesNomina = mesActualISO();
  nominaMesTitulo.textContent = formatearMesLargo(mesNomina);
  nominaLista.innerHTML = '';
  nominaLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'Cargando…' }));
  fondoNomina.classList.add('abierta');

  try {
    const filas = await DB.asegurarNominaDelMes(mesNomina);
    nominaLista.innerHTML = '';
    for (const fila of filas) {
      nominaLista.appendChild(crearFilaNomina(fila));
    }
  } catch (error) {
    nominaLista.innerHTML = '';
    nominaLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar.' }));
    console.error(error);
  }
}

function cerrarNomina() {
  fondoNomina.classList.remove('abierta');
  cargarPuntoEquilibrio();
}

async function manejarAgregarSemanaNomina() {
  try {
    const nueva = await DB.agregarSemanaNomina(mesNomina);
    nominaLista.appendChild(crearFilaNomina(nueva));
  } catch (error) {
    mostrarMensaje('No se pudo agregar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

// ===== Gastos extras del mes =====

const fondoGastosExtras = document.getElementById('fondo-hoja-gastos-extras');
const gastosExtrasMesTitulo = document.getElementById('gastos-extras-mes-titulo');
const gastosExtrasLista = document.getElementById('gastos-extras-lista');
const campoGastoExtraFecha = document.getElementById('gasto-extra-fecha');
const campoGastoExtraConcepto = document.getElementById('gasto-extra-concepto');
const campoGastoExtraMonto = document.getElementById('gasto-extra-monto');

let mesGastosExtras = null;

function crearFilaGastoExtra(fila) {
  const filaEl = crearEl('div', { class: 'gasto-extra-fila' }, [
    crearEl('div', { class: 'gasto-extra-fila__info' }, [
      crearEl('div', { class: 'gasto-extra-fila__concepto', texto: fila.concepto }),
      crearEl('div', { class: 'gasto-extra-fila__fecha', texto: formatearFechaCorta(fila.fecha) }),
    ]),
    crearEl('div', { class: 'gasto-extra-fila__monto', texto: formatearMoneda(fila.monto) }),
    crearEl('button', {
      type: 'button',
      class: 'gasto-extra-fila__eliminar',
      texto: '✕',
      'aria-label': 'Eliminar gasto',
      onclick: async () => {
        if (!window.confirm(`¿Eliminar "${fila.concepto}"?`)) return;
        try {
          await DB.eliminarGastoExtra(fila.id);
          filaEl.remove();
        } catch (error) {
          mostrarMensaje('No se pudo eliminar');
          console.error(error);
        }
      },
    }),
  ]);

  return filaEl;
}

async function cargarListaGastosExtras() {
  gastosExtrasLista.innerHTML = '';
  gastosExtrasLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'Cargando…' }));

  try {
    const filas = await DB.listarGastosExtrasDelMes(mesGastosExtras);
    gastosExtrasLista.innerHTML = '';

    if (filas.length === 0) {
      gastosExtrasLista.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'Sin gastos extras este mes.' })
      );
      return;
    }

    for (const fila of filas) {
      gastosExtrasLista.appendChild(crearFilaGastoExtra(fila));
    }
  } catch (error) {
    gastosExtrasLista.innerHTML = '';
    gastosExtrasLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar.' }));
    console.error(error);
  }
}

async function abrirGastosExtras() {
  mesGastosExtras = mesActualISO();
  gastosExtrasMesTitulo.textContent = formatearMesLargo(mesGastosExtras);
  campoGastoExtraFecha.value = fechaHoyISO();
  campoGastoExtraConcepto.value = '';
  campoGastoExtraMonto.value = '';
  fondoGastosExtras.classList.add('abierta');
  await cargarListaGastosExtras();
}

function cerrarGastosExtras() {
  fondoGastosExtras.classList.remove('abierta');
  cargarPuntoEquilibrio();
}

async function manejarAgregarGastoExtra() {
  const concepto = campoGastoExtraConcepto.value.trim();
  const monto = Number(campoGastoExtraMonto.value);

  if (!concepto) {
    mostrarMensaje('Escribe el concepto');
    return;
  }
  if (!campoGastoExtraMonto.value || Number.isNaN(monto) || monto < 0) {
    mostrarMensaje('Escribe el monto');
    return;
  }
  if (!campoGastoExtraFecha.value) {
    mostrarMensaje('Elige la fecha');
    return;
  }

  try {
    await DB.agregarGastoExtra({ fecha: campoGastoExtraFecha.value, concepto, monto });
    campoGastoExtraConcepto.value = '';
    campoGastoExtraMonto.value = '';
    mostrarMensaje('Gasto agregado');
    await cargarListaGastosExtras();
  } catch (error) {
    mostrarMensaje('No se pudo agregar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

// ===== Punto de equilibrio: tira de cifras + gráfica de la vista de Mes =====
// El resto del tablero (barra de progreso, tarjetas, gráfica semanal,
// desglose de gastos, comparativo) se agrega en un siguiente paso.

const peMesTitulo = document.getElementById('pe-mes-titulo');
const peTiraCifras = document.getElementById('pe-tira-cifras');
const peGraficaSvg = document.getElementById('pe-grafica');
const peCaption = document.getElementById('pe-caption');

function montoEfectivo(fila) {
  return fila.montoReal != null ? fila.montoReal : fila.montoEstimado;
}

function renderizarTiraCifras(ingreso, gasto, ganancia) {
  peTiraCifras.innerHTML = '';
  peTiraCifras.append(
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Ingreso' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(ingreso) }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Gasto' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(gasto) }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Ganancia' }),
      crearEl('div', {
        class: 'resumen-ingresos__monto ' + (ganancia >= 0 ? 'monto--positivo' : 'monto--negativo'),
        texto: formatearMoneda(ganancia),
      }),
    ])
  );
}

// Gasto fijo (renta + nómina) se carga completo desde el día 1 — no se
// prorratea, porque el mes nace debiendo la renta y la nómina. El material
// y los gastos extras sí se van acumulando según la fecha real de cada uno.
function calcularSerieDiaria(visitas, gastosExtras, gastoBaseDelMes, costoMaterialActual, hoy) {
  const diaHoy = Number(hoy.split('-')[2]);

  const ingresoPorDia = {};
  const materialPorDia = {};
  for (const visita of visitas) {
    const dia = Number(visita.fecha.split('-')[2]);
    ingresoPorDia[dia] = (ingresoPorDia[dia] || 0) + visita.precio;
    const costo = visita.costoMaterial != null ? visita.costoMaterial : costoMaterialActual;
    materialPorDia[dia] = (materialPorDia[dia] || 0) + costo;
  }

  const extrasPorDia = {};
  for (const gasto of gastosExtras) {
    const dia = Number(gasto.fecha.split('-')[2]);
    extrasPorDia[dia] = (extrasPorDia[dia] || 0) + gasto.monto;
  }

  let ingresoAcum = 0;
  let materialAcum = 0;
  let extrasAcum = 0;
  const serie = [];

  for (let dia = 1; dia <= diaHoy; dia++) {
    ingresoAcum += ingresoPorDia[dia] || 0;
    materialAcum += materialPorDia[dia] || 0;
    extrasAcum += extrasPorDia[dia] || 0;
    serie.push({ dia, ingresoAcum, gastoAcum: gastoBaseDelMes + materialAcum + extrasAcum });
  }

  return serie;
}

function renderizarGraficaEquilibrio(serie, diasMes) {
  const w = 320;
  const h = 150;
  const maxValor = Math.max(1, ...serie.map((p) => Math.max(p.ingresoAcum, p.gastoAcum))) * 1.08;

  function x(dia) {
    return ((dia - 1) / (diasMes - 1)) * w;
  }
  function y(valor) {
    return h - (valor / maxValor) * h;
  }

  const puntosIngreso = serie.map((p) => `${x(p.dia).toFixed(1)},${y(p.ingresoAcum).toFixed(1)}`).join(' ');
  const puntosGasto = serie.map((p) => `${x(p.dia).toFixed(1)},${y(p.gastoAcum).toFixed(1)}`).join(' ');

  let diaCruce = null;
  for (const punto of serie) {
    if (punto.ingresoAcum >= punto.gastoAcum) {
      diaCruce = punto;
      break;
    }
  }

  const marcaCruce = diaCruce
    ? `
      <line x1="${x(diaCruce.dia).toFixed(1)}" y1="0" x2="${x(diaCruce.dia).toFixed(1)}" y2="${h}"
        stroke="var(--color-primario)" stroke-width="1.5" stroke-dasharray="3 3"></line>
      <circle cx="${x(diaCruce.dia).toFixed(1)}" cy="${y(diaCruce.ingresoAcum).toFixed(1)}" r="4" fill="var(--color-primario)"></circle>
      <text x="${x(diaCruce.dia).toFixed(1)}" y="${h + 14}" font-size="11" font-weight="700"
        fill="var(--color-primario)" text-anchor="middle">Día ${diaCruce.dia}</text>
    `
    : '';

  peGraficaSvg.innerHTML = `
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="var(--color-borde)" stroke-width="1"></line>
    <polyline points="${puntosGasto}" fill="none" stroke="var(--color-azul-grisaceo-claro)"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polyline points="${puntosIngreso}" fill="none" stroke="var(--color-magenta)"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${marcaCruce}
  `;

  if (diaCruce) {
    peCaption.textContent = `Cruzaste el punto de equilibrio el día ${diaCruce.dia} — el resto del mes ya es ganancia.`;
  } else {
    const ultimo = serie[serie.length - 1];
    const faltante = ultimo ? Math.max(0, ultimo.gastoAcum - ultimo.ingresoAcum) : 0;
    peCaption.textContent = `Aún no llegas al punto de equilibrio — faltan ${formatearMoneda(faltante)} en ingresos.`;
  }
}

async function cargarPuntoEquilibrio() {
  const mes = mesActualISO();
  const hoy = fechaHoyISO();
  peMesTitulo.textContent = formatearMesLargo(mes);

  const [anio, mesNum] = mes.split('-').map(Number);
  const diasMes = new Date(anio, mesNum, 0).getDate();
  const finMes = `${mes.slice(0, 8)}${String(diasMes).padStart(2, '0')}`;

  try {
    const [config, gastosFijos, nomina, gastosExtras, visitas] = await Promise.all([
      DB.obtenerConfig(),
      DB.asegurarGastosFijosDelMes(mes),
      DB.asegurarNominaDelMes(mes),
      DB.listarGastosExtrasDelMes(mes),
      DB.listarVisitasEnRango(mes, finMes),
    ]);

    const totalFijos = gastosFijos.reduce((suma, fila) => suma + montoEfectivo(fila), 0);
    const totalNomina = nomina.reduce((suma, fila) => suma + montoEfectivo(fila), 0);
    const totalExtras = gastosExtras.reduce((suma, fila) => suma + fila.monto, 0);
    const gastoBaseDelMes = totalFijos + totalNomina;
    const gastoFijoMes = gastoBaseDelMes + totalExtras;

    const costoMaterialActual = config.costoMaterialPorTratamiento;
    const gastoMaterialMes = visitas.reduce(
      (suma, visita) => suma + (visita.costoMaterial != null ? visita.costoMaterial : costoMaterialActual),
      0
    );
    const gastoTotalMes = gastoFijoMes + gastoMaterialMes;
    const ingresoMes = visitas.reduce((suma, visita) => suma + visita.precio, 0);
    const gananciaMes = ingresoMes - gastoTotalMes;

    renderizarTiraCifras(ingresoMes, gastoTotalMes, gananciaMes);

    const serie = calcularSerieDiaria(visitas, gastosExtras, gastoBaseDelMes, costoMaterialActual, hoy);
    renderizarGraficaEquilibrio(serie, diasMes);
  } catch (error) {
    peCaption.textContent = 'No se pudo cargar el punto de equilibrio.';
    console.error(error);
  }
}

function inicializar() {
  campoCostoMaterial.addEventListener('change', manejarGuardarCostoMaterial);
  cargarConfig();

  document.getElementById('boton-abrir-gastos-fijos').addEventListener('click', abrirGastosFijos);
  document.getElementById('boton-cerrar-hoja-gastos-fijos').addEventListener('click', cerrarGastosFijos);
  document.getElementById('boton-agregar-gasto-fijo').addEventListener('click', manejarAgregarGastoFijo);

  document.getElementById('boton-abrir-nomina').addEventListener('click', abrirNomina);
  document.getElementById('boton-cerrar-hoja-nomina').addEventListener('click', cerrarNomina);
  document.getElementById('boton-agregar-semana-nomina').addEventListener('click', manejarAgregarSemanaNomina);

  document.getElementById('boton-abrir-gastos-extras').addEventListener('click', abrirGastosExtras);
  document.getElementById('boton-cerrar-hoja-gastos-extras').addEventListener('click', cerrarGastosExtras);
  document.getElementById('boton-agregar-gasto-extra').addEventListener('click', manejarAgregarGastoExtra);
}

async function mostrar() {
  await cargarPuntoEquilibrio();
}

window.FinanzasUI = { inicializar, mostrar };

})();
