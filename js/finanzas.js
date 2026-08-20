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

window.FinanzasUI = { inicializar };

})();
