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
// prorratea, porque el mes nace debiendo la renta y la nómina. El material,
// los gastos extras y los productos (regalo/venta) sí se van acumulando
// según la fecha real de cada uno.
function calcularSerieDiaria(visitas, gastosExtras, productosVisitas, gastoBaseDelMes, costoMaterialActual, hoy) {
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

  // Productos regalo no suman ingreso (precio = 0 siempre), solo costo; los
  // vendidos suman ambos.
  const productosGastoPorDia = {};
  for (const item of productosVisitas) {
    const dia = Number(item.fecha.split('-')[2]);
    productosGastoPorDia[dia] = (productosGastoPorDia[dia] || 0) + item.costo;
    if (item.tipo === 'venta') {
      ingresoPorDia[dia] = (ingresoPorDia[dia] || 0) + item.precio;
    }
  }

  let ingresoAcum = 0;
  let materialAcum = 0;
  let extrasAcum = 0;
  let productosAcum = 0;
  const serie = [];

  for (let dia = 1; dia <= diaHoy; dia++) {
    ingresoAcum += ingresoPorDia[dia] || 0;
    materialAcum += materialPorDia[dia] || 0;
    extrasAcum += extrasPorDia[dia] || 0;
    productosAcum += productosGastoPorDia[dia] || 0;
    serie.push({ dia, ingresoAcum, gastoAcum: gastoBaseDelMes + materialAcum + extrasAcum + productosAcum });
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

// ----- Barra de progreso de tratamientos hacia el equilibrio -----

const peBarraRelleno = document.getElementById('pe-barra-relleno');
const peBarraMarca = document.getElementById('pe-barra-marca');
const peBarraMarcaEtiqueta = document.getElementById('pe-barra-marca-etiqueta');
const peProgresoCaption = document.getElementById('pe-progreso-caption');

function renderizarBarraProgreso(numServicios, serviciosParaEquilibrio, margenPorServicio) {
  if (serviciosParaEquilibrio === null) {
    peBarraRelleno.style.width = '0%';
    peBarraMarcaEtiqueta.textContent = '';
    peProgresoCaption.textContent =
      'El ticket promedio todavía no cubre el costo de material — no se puede calcular cuántos tratamientos hacen falta.';
    return;
  }

  const maxEscala = Math.max(serviciosParaEquilibrio, numServicios) * 1.15;
  const pctRelleno = Math.min(100, (numServicios / maxEscala) * 100);
  const pctMarca = Math.min(100, (serviciosParaEquilibrio / maxEscala) * 100);
  const logrado = numServicios >= serviciosParaEquilibrio;

  peBarraRelleno.style.width = `${pctRelleno}%`;
  peBarraRelleno.className = logrado
    ? 'barra-progreso__relleno barra-progreso__relleno--logrado'
    : 'barra-progreso__relleno';
  peBarraMarca.style.left = `${pctMarca}%`;
  peBarraMarcaEtiqueta.textContent = `${serviciosParaEquilibrio} · equilibrio`;

  peProgresoCaption.textContent =
    `${numServicios} tratamientos hechos de ${serviciosParaEquilibrio} necesarios. ` +
    `Cada tratamiento adicional deja ${formatearMoneda(margenPorServicio)} limpios.`;
}

// ----- Ticket promedio y margen por tratamiento -----

const peDosTarjetas = document.getElementById('pe-dos-tarjetas');

function renderizarDosTarjetas(ticketPromedio, numServicios, margenPorServicio) {
  peDosTarjetas.innerHTML = '';
  peDosTarjetas.append(
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Ticket promedio' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(ticketPromedio) }),
      crearEl('div', {
        class: 'resumen-ingresos__cantidad',
        texto: `${numServicios} ${numServicios === 1 ? 'tratamiento' : 'tratamientos'}`,
      }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Margen por tratamiento' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(margenPorServicio) }),
    ])
  );
}

// ----- Ingreso por semana (semanas del mes: días 1-7, 8-14, ...) -----

const peGraficaSemanal = document.getElementById('pe-grafica-semanal');

function renderizarGraficaSemanal(visitas, diaHoy) {
  const ingresoPorSemana = {};
  for (const visita of visitas) {
    const dia = Number(visita.fecha.split('-')[2]);
    const semana = Math.ceil(dia / 7);
    ingresoPorSemana[semana] = (ingresoPorSemana[semana] || 0) + visita.precio;
  }

  const semanaActual = Math.ceil(diaHoy / 7);
  const maxMonto = Math.max(1, ...Object.values(ingresoPorSemana));

  peGraficaSemanal.innerHTML = '';
  for (let semana = 1; semana <= semanaActual; semana++) {
    const monto = ingresoPorSemana[semana] || 0;
    const pct = Math.max(2, Math.round((monto / maxMonto) * 100));
    const esActual = semana === semanaActual;

    peGraficaSemanal.appendChild(
      crearEl('div', { class: esActual ? 'grafica-barras__columna grafica-barras__columna--hoy' : 'grafica-barras__columna' }, [
        crearEl('div', { class: 'grafica-barras__monto', texto: formatearMoneda(monto) }),
        crearEl('div', { class: 'grafica-barras__barra', style: `height: ${pct}%` }),
        crearEl('div', { class: 'grafica-barras__etiqueta', texto: `Sem ${semana}${esActual ? '*' : ''}` }),
      ])
    );
  }
}

// ----- Desglose de gastos: barras horizontales + tabla -----

const peDesgloseBarras = document.getElementById('pe-desglose-barras');
const peDesgloseTabla = document.getElementById('pe-desglose-tabla');

function tagRealEstimado(esReal) {
  return crearEl('span', {
    class: esReal ? 'chip chip--real' : 'chip chip--estimado',
    texto: esReal ? 'Real' : 'Estimado',
  });
}

function renderizarDesgloseGastos(gastosFijos, nomina, gastosExtras, gastoMaterialMes, gastoProductosRegaloMes, costoProductosVentaMes) {
  const renglones = gastosFijos.map((fila) => ({
    nombre: fila.concepto,
    monto: montoEfectivo(fila),
    esReal: fila.montoReal != null,
  }));

  const nominaTotal = nomina.reduce((suma, fila) => suma + montoEfectivo(fila), 0);
  const nominaEsReal = nomina.length > 0 && nomina.every((fila) => fila.montoReal != null);
  renglones.push({ nombre: 'Nómina', monto: nominaTotal, esReal: nominaEsReal });

  renglones.push({ nombre: 'Material', monto: gastoMaterialMes, esReal: true });

  const extrasTotal = gastosExtras.reduce((suma, fila) => suma + fila.monto, 0);
  if (extrasTotal > 0) {
    renglones.push({ nombre: 'Extras', monto: extrasTotal, esReal: true });
  }

  if (gastoProductosRegaloMes > 0) {
    renglones.push({ nombre: 'Productos regalo', monto: gastoProductosRegaloMes, esReal: true });
  }
  if (costoProductosVentaMes > 0) {
    renglones.push({ nombre: 'Costo productos vendidos', monto: costoProductosVentaMes, esReal: true });
  }

  renglones.sort((a, b) => b.monto - a.monto);
  const maxMonto = Math.max(1, ...renglones.map((r) => r.monto));

  peDesgloseBarras.innerHTML = '';
  for (const renglon of renglones) {
    const pct = Math.max(1, Math.round((renglon.monto / maxMonto) * 100));
    peDesgloseBarras.appendChild(
      crearEl('div', { class: 'gasto-desglose-fila' }, [
        crearEl('div', { class: 'gasto-desglose-fila__nombre', texto: renglon.nombre }),
        crearEl('div', { class: 'gasto-desglose-fila__pista' }, [crearEl('i', { style: `width: ${pct}%` })]),
        crearEl('div', { class: 'gasto-desglose-fila__monto', texto: formatearMoneda(renglon.monto) }),
      ])
    );
  }

  peDesgloseTabla.innerHTML = '';
  peDesgloseTabla.appendChild(
    crearEl('tr', {}, [crearEl('th', { texto: 'Concepto' }), crearEl('th', { texto: '' }), crearEl('th', { texto: 'Monto' })])
  );
  for (const renglon of renglones) {
    peDesgloseTabla.appendChild(
      crearEl('tr', {}, [
        crearEl('td', { texto: renglon.nombre }),
        crearEl('td', {}, [tagRealEstimado(renglon.esReal)]),
        crearEl('td', { texto: formatearMoneda(renglon.monto) }),
      ])
    );
  }
}

// ----- Productos: cuántos se regalaron y cuántos se vendieron este mes -----

const peProductosLista = document.getElementById('pe-productos-lista');

function renderizarProductos(regalos, ventasProducto) {
  peProductosLista.innerHTML = '';

  if (regalos.length === 0 && ventasProducto.length === 0) {
    peProductosLista.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'Sin productos regalados o vendidos este mes.' })
    );
    return;
  }

  if (regalos.length > 0) {
    const conteoRegalos = {};
    for (const item of regalos) conteoRegalos[item.nombre] = (conteoRegalos[item.nombre] || 0) + 1;

    peProductosLista.appendChild(crearEl('div', { class: 'reportes-subtitulo', texto: 'Regalados' }));
    for (const [nombre, cantidad] of Object.entries(conteoRegalos).sort((a, b) => b[1] - a[1])) {
      peProductosLista.appendChild(
        crearEl('div', { class: 'reportes-estilista-fila' }, [
          crearEl('div', { class: 'reportes-estilista-nombre', texto: nombre }),
          crearEl('div', {
            class: 'reportes-estilista-cantidad',
            texto: `${cantidad} ${cantidad === 1 ? 'vez' : 'veces'}`,
          }),
        ])
      );
    }
  }

  if (ventasProducto.length > 0) {
    const conteoVentas = {};
    for (const item of ventasProducto) {
      if (!conteoVentas[item.nombre]) conteoVentas[item.nombre] = { cantidad: 0, ingreso: 0 };
      conteoVentas[item.nombre].cantidad += 1;
      conteoVentas[item.nombre].ingreso += item.precio;
    }

    peProductosLista.appendChild(crearEl('div', { class: 'reportes-subtitulo', texto: 'Vendidos' }));
    for (const [nombre, datos] of Object.entries(conteoVentas).sort((a, b) => b[1].cantidad - a[1].cantidad)) {
      peProductosLista.appendChild(
        crearEl('div', { class: 'reportes-estilista-fila' }, [
          crearEl('div', { class: 'reportes-estilista-nombre', texto: nombre }),
          crearEl('div', {
            class: 'reportes-estilista-cantidad',
            texto: `${datos.cantidad} · ${formatearMoneda(datos.ingreso)}`,
          }),
        ])
      );
    }

    const ingresoTotal = ventasProducto.reduce((suma, item) => suma + item.precio, 0);
    const costoTotal = ventasProducto.reduce((suma, item) => suma + item.costo, 0);
    peProductosLista.appendChild(
      crearEl('p', {
        class: 'campo__ayuda',
        style: 'margin-top: 10px; font-weight: 600;',
        texto: `Ganancia de productos vendidos: ${formatearMoneda(ingresoTotal - costoTotal)}`,
      })
    );
  }
}

// ----- Comparativo mes contra mes (todavía sin historial: llega con el cierre de mes) -----

const peComparativo = document.getElementById('pe-comparativo');
const MESES_CORTOS_PE = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function renderizarEstadoVacioComparativo() {
  peComparativo.innerHTML = '';
  peComparativo.appendChild(
    crearEl('div', { class: 'estado-vacio' }, [
      crearEl('p', { texto: 'Aún no hay historial de meses anteriores.' }),
      crearEl('p', { texto: 'Este comparativo se empieza a llenar el próximo mes, al cerrar el actual.' }),
    ])
  );
}

async function renderizarComparativo(mesActual) {
  try {
    const historial = await DB.listarResumenMensualUltimos12(mesActual);
    if (historial.length === 0) {
      renderizarEstadoVacioComparativo();
      return;
    }

    const maxMonto = Math.max(1, ...historial.map((m) => Math.max(m.ingreso, m.gasto, Math.abs(m.ganancia))));

    peComparativo.innerHTML = '';
    peComparativo.appendChild(
      crearEl('div', { class: 'comparativo-leyenda' }, [
        crearEl('span', {}, [crearEl('i', { style: 'background:var(--color-magenta)' }), crearEl('span', { texto: 'Ingreso' })]),
        crearEl('span', {}, [crearEl('i', { style: 'background:var(--color-azul-grisaceo-claro)' }), crearEl('span', { texto: 'Gasto' })]),
        crearEl('span', {}, [crearEl('i', { style: 'background:var(--color-exito)' }), crearEl('span', { texto: 'Ganancia' })]),
      ])
    );

    const lista = crearEl('div', { class: 'comparativo-lista' });
    for (const registro of historial) {
      const [anio, mesNum] = registro.mes.split('-').map(Number);
      const etiqueta = `${MESES_CORTOS_PE[mesNum - 1]} ${String(anio).slice(2)}`;
      const gananciaPositiva = registro.ganancia >= 0;

      lista.appendChild(
        crearEl('div', { class: 'comparativo-mes' }, [
          crearEl('div', { class: 'comparativo-mes__barras' }, [
            crearEl('div', {
              class: 'comparativo-mes__barra comparativo-mes__barra--ingreso',
              style: `height: ${Math.max(2, Math.round((registro.ingreso / maxMonto) * 100))}%`,
            }),
            crearEl('div', {
              class: 'comparativo-mes__barra comparativo-mes__barra--gasto',
              style: `height: ${Math.max(2, Math.round((registro.gasto / maxMonto) * 100))}%`,
            }),
            crearEl('div', {
              class: `comparativo-mes__barra ${gananciaPositiva ? 'comparativo-mes__barra--ganancia-positiva' : 'comparativo-mes__barra--ganancia-negativa'}`,
              style: `height: ${Math.max(2, Math.round((Math.abs(registro.ganancia) / maxMonto) * 100))}%`,
            }),
          ]),
          crearEl('div', { class: 'comparativo-mes__etiqueta', texto: etiqueta }),
        ])
      );
    }
    peComparativo.appendChild(lista);
  } catch (error) {
    renderizarEstadoVacioComparativo();
    console.error(error);
  }
}

// ----- Cálculo puro, reutilizable tanto para el mes en curso como para
// cerrar un mes anterior (diaCorte = último día cuando ya terminó) -----

function mesAnteriorISOLocal(mes) {
  const [anio, mesNum] = mes.split('-').map(Number);
  const fecha = new Date(anio, mesNum - 2, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;
}

async function calcularResumenMes(mes, diaCorte) {
  const [anio, mesNum] = mes.split('-').map(Number);
  const diasMes = new Date(anio, mesNum, 0).getDate();
  const finMes = `${mes.slice(0, 8)}${String(diasMes).padStart(2, '0')}`;

  const [config, gastosFijos, nomina, gastosExtras, visitas, productosVisitas] = await Promise.all([
    DB.obtenerConfig(),
    DB.asegurarGastosFijosDelMes(mes),
    DB.asegurarNominaDelMes(mes),
    DB.listarGastosExtrasDelMes(mes),
    DB.listarVisitasEnRango(mes, finMes),
    DB.listarProductosDeVisitasEnRango(mes, finMes),
  ]);

  const totalFijos = gastosFijos.reduce((suma, fila) => suma + montoEfectivo(fila), 0);
  const totalNomina = nomina.reduce((suma, fila) => suma + montoEfectivo(fila), 0);
  const totalExtras = gastosExtras.reduce((suma, fila) => suma + fila.monto, 0);
  const gastoBaseDelMes = totalFijos + totalNomina;

  // Regalo de la promoción de "producto gratis" (sin ingreso, solo costo) y
  // venta aparte de producto (ingreso y costo) — ver js/productos.js.
  const regalos = productosVisitas.filter((item) => item.tipo === 'regalo');
  const ventasProducto = productosVisitas.filter((item) => item.tipo === 'venta');
  const gastoProductosRegaloMes = regalos.reduce((suma, item) => suma + item.costo, 0);
  const ingresoProductosMes = ventasProducto.reduce((suma, item) => suma + item.precio, 0);
  const costoProductosVentaMes = ventasProducto.reduce((suma, item) => suma + item.costo, 0);

  const gastoFijoMes = gastoBaseDelMes + totalExtras + gastoProductosRegaloMes + costoProductosVentaMes;

  const costoMaterialActual = config.costoMaterialPorTratamiento;
  const gastoMaterialMes = visitas.reduce(
    (suma, visita) => suma + (visita.costoMaterial != null ? visita.costoMaterial : costoMaterialActual),
    0
  );
  const gastoTotalMes = gastoFijoMes + gastoMaterialMes;

  // El ingreso de productos se suma al total, pero NO al ticket promedio ni
  // al margen por tratamiento — esos son solo del servicio, para no mezclar
  // peras con manzanas al calcular cuántos tratamientos hacen falta.
  const ingresoServiciosMes = visitas.reduce((suma, visita) => suma + visita.precio, 0);
  const ingresoMes = ingresoServiciosMes + ingresoProductosMes;
  const gananciaMes = ingresoMes - gastoTotalMes;

  const numServicios = visitas.length;
  const ticketPromedio = numServicios > 0 ? ingresoServiciosMes / numServicios : 0;
  const margenPorServicio = ticketPromedio - costoMaterialActual;
  const serviciosParaEquilibrio = margenPorServicio > 0 ? Math.ceil(gastoFijoMes / margenPorServicio) : null;

  const diaCorteISO = `${mes.slice(0, 8)}${String(diaCorte).padStart(2, '0')}`;
  const serie = calcularSerieDiaria(visitas, gastosExtras, productosVisitas, gastoBaseDelMes, costoMaterialActual, diaCorteISO);

  let diaCruce = null;
  for (const punto of serie) {
    if (punto.ingresoAcum >= punto.gastoAcum) {
      diaCruce = punto.dia;
      break;
    }
  }

  return {
    mes, diasMes, diaCorte, config, gastosFijos, nomina, gastosExtras, visitas,
    productosVisitas, regalos, ventasProducto,
    gastoBaseDelMes, gastoFijoMes, costoMaterialActual, gastoMaterialMes, gastoTotalMes,
    gastoProductosRegaloMes, ingresoProductosMes, costoProductosVentaMes,
    ingresoServiciosMes, ingresoMes, gananciaMes, numServicios, ticketPromedio, margenPorServicio,
    serviciosParaEquilibrio, serie, diaCruce,
  };
}

// El primer mes con datos capturados nunca se cierra solo (nunca hay un
// "mes anterior" real que cerrar); a partir de ahí, cada vez que entra a
// Reportes en un mes nuevo, se guarda el resumen del mes que acaba de
// terminar — así se alimenta el comparativo sin que la usuaria tenga que
// acordarse de hacerlo.
async function cerrarMesAnteriorSiHaceFalta(mesActual) {
  try {
    const mesPrevio = mesAnteriorISOLocal(mesActual);

    const yaExiste = await DB.obtenerResumenMensual(mesPrevio);
    if (yaExiste) return;

    const gastosPrevios = await DB.listarGastosFijosDelMes(mesPrevio);
    if (gastosPrevios.length === 0) return;

    const [anioPrevio, mesNumPrevio] = mesPrevio.split('-').map(Number);
    const diasMesPrevio = new Date(anioPrevio, mesNumPrevio, 0).getDate();
    const r = await calcularResumenMes(mesPrevio, diasMesPrevio);

    await DB.guardarResumenMensual(mesPrevio, {
      ingreso: r.ingresoMes,
      gasto: r.gastoTotalMes,
      ganancia: r.gananciaMes,
      ticketPromedio: r.ticketPromedio,
      numServicios: r.numServicios,
      diaCruce: r.diaCruce,
    });
  } catch (error) {
    console.error(error);
  }
}

// ----- Tabs Hoy / Semana / Mes -----

const peTabs = document.querySelectorAll('#pe-tabs .pastilla-opcion');
const peContenidoReducido = document.getElementById('pe-contenido-reducido');
const peContenidoMes = document.getElementById('pe-contenido-mes');
const peSeccionesMes = document.getElementById('pe-secciones-mes');

let periodoPeActivo = 'mes';
let ultimoResumenPe = null;

// La "semana" aquí es la misma que en la gráfica de ingreso semanal: días
// 1-7, 8-14, etc. del mes (no semana calendario) — para que ambas coincidan.
function filtrarVisitasPeriodo(visitas, periodo, hoy) {
  if (periodo === 'hoy') {
    return visitas.filter((visita) => visita.fecha === hoy);
  }
  const diaHoy = Number(hoy.split('-')[2]);
  const semanaActual = Math.ceil(diaHoy / 7);
  return visitas.filter((visita) => Math.ceil(Number(visita.fecha.split('-')[2]) / 7) === semanaActual);
}

function renderizarContenidoReducido(ingreso, numServicios, ticketPromedio, costoMaterialActual) {
  const quedaTrasMaterial = ingreso - numServicios * costoMaterialActual;

  peContenidoReducido.innerHTML = '';
  peContenidoReducido.append(
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Ingreso' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(ingreso) }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Servicios' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: String(numServicios) }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Ticket promedio' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(ticketPromedio) }),
    ]),
    crearEl('div', { class: 'resumen-ingresos__tarjeta' }, [
      crearEl('div', { class: 'resumen-ingresos__etiqueta', texto: 'Queda tras material' }),
      crearEl('div', { class: 'resumen-ingresos__monto', texto: formatearMoneda(quedaTrasMaterial) }),
    ])
  );
}

function cambiarPeriodoPe(periodo) {
  periodoPeActivo = periodo;
  peTabs.forEach((boton) => boton.classList.toggle('pastilla-opcion--activa', boton.dataset.periodo === periodo));

  const esMes = periodo === 'mes';
  peContenidoMes.hidden = !esMes;
  peSeccionesMes.hidden = !esMes;
  peContenidoReducido.hidden = esMes;

  if (!esMes && ultimoResumenPe) {
    const visitasPeriodo = filtrarVisitasPeriodo(ultimoResumenPe.visitas, periodo, ultimoResumenPe.hoy);
    const ingreso = visitasPeriodo.reduce((suma, visita) => suma + visita.precio, 0);
    const numServicios = visitasPeriodo.length;
    const ticketPromedio = numServicios > 0 ? ingreso / numServicios : 0;
    renderizarContenidoReducido(ingreso, numServicios, ticketPromedio, ultimoResumenPe.costoMaterialActual);
  }
}

async function cargarPuntoEquilibrio() {
  const mes = mesActualISO();
  const hoy = fechaHoyISO();
  peMesTitulo.textContent = formatearMesLargo(mes);

  try {
    const r = await calcularResumenMes(mes, Number(hoy.split('-')[2]));
    ultimoResumenPe = { visitas: r.visitas, hoy, costoMaterialActual: r.costoMaterialActual };

    renderizarTiraCifras(r.ingresoMes, r.gastoTotalMes, r.gananciaMes);
    renderizarGraficaEquilibrio(r.serie, r.diasMes);
    renderizarBarraProgreso(r.numServicios, r.serviciosParaEquilibrio, r.margenPorServicio);
    renderizarDosTarjetas(r.ticketPromedio, r.numServicios, r.margenPorServicio);
    renderizarGraficaSemanal(r.visitas, Number(hoy.split('-')[2]));
    renderizarProductos(r.regalos, r.ventasProducto);
    renderizarDesgloseGastos(r.gastosFijos, r.nomina, r.gastosExtras, r.gastoMaterialMes, r.gastoProductosRegaloMes, r.costoProductosVentaMes);

    if (periodoPeActivo !== 'mes') cambiarPeriodoPe(periodoPeActivo);

    await cerrarMesAnteriorSiHaceFalta(mes);
    await renderizarComparativo(mes);
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

  peTabs.forEach((boton) => {
    boton.addEventListener('click', () => cambiarPeriodoPe(boton.dataset.periodo));
  });
}

async function mostrar() {
  cambiarPeriodoPe('mes');
  await cargarPuntoEquilibrio();
}

window.FinanzasUI = { inicializar, mostrar };

})();
