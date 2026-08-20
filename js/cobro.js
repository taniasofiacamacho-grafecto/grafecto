// Hoja de cobro: se abre al hacer checkout de una cita. Guarda la visita
// (precio, longitud, promoción, quién atendió, notas) y marca la cita
// como "checkout".
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearFechaLarga, formatearHora12, formatearMoneda } = window.UI;
const DB = window.GrafectoDB;

// Los tratamientos que se cobran por largo usan pulgadas; hidratación usa
// una escala más simple. Siempre se agrega "Otro" al final.
const OPCIONES_LONGITUD_POR_TRATAMIENTO = {
  'Hair Therapy': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Retoque de crecimiento': ['8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  'Tratamiento de hidratación': ['Corto', 'Mediano', 'Largo'],
};

const NOMBRES_ESTILISTA_CONOCIDOS = ['Alma', 'Betty', 'Isabel'];

let citaActual = null;
let visitaEnEdicion = null;
let callbackAlGuardar = null;
let promocionSeleccionada = 'ninguna';
let estilistaSeleccionada = '';
let catalogoProductos = [];
let regaloSeleccionados = new Set();
let ventaItems = [];

const fondoHoja = document.getElementById('fondo-hoja-cobro');
const tituloHoja = document.getElementById('cobro-titulo');
const resumen = document.getElementById('cobro-resumen');
const formulario = document.getElementById('formulario-cobro');
const botonGuardar = formulario.querySelector('button[type="submit"]');
const campoPrecio = document.getElementById('cobro-precio');
const campoLongitud = document.getElementById('cobro-longitud');
const campoNotas = document.getElementById('cobro-notas');
const botonDictado = document.getElementById('cobro-notas-dictado');
const botonesPromocion = document.querySelectorAll('#cobro-promocion .pastilla-opcion');
const botonesEstilista = document.querySelectorAll('#cobro-estilista .pastilla-opcion');
const campoEstilistaOtra = document.getElementById('cobro-estilista-otra');
const campoRegaloCampo = document.getElementById('cobro-regalo-campo');
const campoRegaloProductos = document.getElementById('cobro-regalo-productos');
const campoVentaLista = document.getElementById('cobro-venta-lista');
const selectVentaProducto = document.getElementById('cobro-venta-select');
const botonVentaAgregar = document.getElementById('cobro-venta-agregar');

function poblarLongitud(tratamientoNombre) {
  const opciones = [...(OPCIONES_LONGITUD_POR_TRATAMIENTO[tratamientoNombre] || []), 'Otro'];
  campoLongitud.innerHTML = '';
  campoLongitud.appendChild(crearEl('option', { value: '', texto: '(sin especificar)' }));
  for (const opcion of opciones) {
    campoLongitud.appendChild(crearEl('option', { value: opcion, texto: opcion }));
  }
}

// ===== Productos: regalo de la promoción y venta aparte =====
// Sin inventario — solo se cuenta cuántos se regalaron/vendieron y su costo,
// para descontarlo en el punto de equilibrio.

function actualizarVisibilidadRegalo() {
  campoRegaloCampo.hidden = promocionSeleccionada !== 'producto';
}

function renderizarRegaloOpciones() {
  campoRegaloProductos.innerHTML = '';
  const individuales = catalogoProductos.filter((p) => p.categoria === 'individual');
  for (const producto of individuales) {
    const boton = crearEl('button', {
      type: 'button',
      class: regaloSeleccionados.has(producto.id) ? 'pastilla-opcion pastilla-opcion--activa' : 'pastilla-opcion',
      texto: producto.nombre,
    });
    boton.addEventListener('click', () => {
      if (regaloSeleccionados.has(producto.id)) regaloSeleccionados.delete(producto.id);
      else regaloSeleccionados.add(producto.id);
      boton.classList.toggle('pastilla-opcion--activa');
    });
    campoRegaloProductos.appendChild(boton);
  }
}

function poblarSelectVenta() {
  selectVentaProducto.innerHTML = '';
  selectVentaProducto.appendChild(crearEl('option', { value: '', texto: 'Elige un producto…' }));
  for (const producto of catalogoProductos) {
    selectVentaProducto.appendChild(
      crearEl('option', { value: producto.id, texto: `${producto.nombre} — ${formatearMoneda(producto.precio)}` })
    );
  }
}

function renderizarVentaLista() {
  campoVentaLista.innerHTML = '';
  for (const item of ventaItems) {
    const campoPrecioItem = crearEl('input', {
      type: 'number', inputmode: 'decimal', min: '0', step: '0.01',
      class: 'producto-venta-fila__precio', value: item.precio,
    });
    campoPrecioItem.addEventListener('change', () => {
      item.precio = Number(campoPrecioItem.value) || 0;
    });

    campoVentaLista.appendChild(
      crearEl('div', { class: 'producto-venta-fila' }, [
        crearEl('div', { class: 'producto-venta-fila__nombre', texto: item.nombre }),
        campoPrecioItem,
        crearEl('button', {
          type: 'button',
          class: 'gasto-extra-fila__eliminar',
          texto: '✕',
          'aria-label': 'Quitar producto',
          onclick: () => {
            ventaItems = ventaItems.filter((i) => i !== item);
            renderizarVentaLista();
          },
        }),
      ])
    );
  }
}

function manejarAgregarVenta() {
  const productoId = selectVentaProducto.value;
  if (!productoId) return;
  const producto = catalogoProductos.find((p) => p.id === productoId);
  if (!producto) return;

  ventaItems.push({ productoId: producto.id, nombre: producto.nombre, precio: producto.precio, costo: producto.costo });
  selectVentaProducto.value = '';
  renderizarVentaLista();
}

function resolverProductosParaGuardar() {
  const regalos = [...regaloSeleccionados]
    .map((id) => catalogoProductos.find((p) => p.id === id))
    .filter(Boolean)
    .map((producto) => ({
      productoId: producto.id,
      tipo: 'regalo',
      nombre: producto.nombre,
      precio: 0,
      costo: producto.costo,
    }));

  const ventas = ventaItems.map((item) => ({
    productoId: item.productoId,
    tipo: 'venta',
    nombre: item.nombre,
    precio: item.precio,
    costo: item.costo,
  }));

  return [...regalos, ...ventas];
}

async function abrir(cita, onGuardado) {
  citaActual = cita;
  visitaEnEdicion = null;
  callbackAlGuardar = onGuardado;
  promocionSeleccionada = 'ninguna';

  resumen.textContent =
    `${cita.clientaNombre} — ${formatearFechaLarga(cita.fecha)} ${formatearHora12(cita.hora)}` +
    (cita.tratamientoNombre ? ` — ${cita.tratamientoNombre}` : '');

  poblarLongitud(cita.tratamientoNombre);

  // Se busca si ya existe una visita para esta cita sin importar el estado
  // en el que esté marcada la cita — puede haber quedado "atorada" en un
  // estado anterior (por ejemplo, si se canceló un cobro duplicado sin
  // guardar) aunque ya se le hubiera cobrado antes. Así nunca se crea un
  // cobro duplicado por accidente.
  try {
    visitaEnEdicion = await DB.obtenerVisitaDeCita(cita.id);
  } catch (error) {
    mostrarMensaje('No se pudo revisar si esta cita ya se había cobrado');
    console.error(error);
  }

  // Si ya existe la visita pero la cita no está marcada como "Checkout", se
  // corrige sola para que la tarjeta lo refleje bien de una vez.
  if (visitaEnEdicion && cita.estado !== 'checkout') {
    try {
      await DB.actualizarEstadoCita(cita.id, 'checkout');
      citaActual.estado = 'checkout';
      mostrarMensaje('Esta cita ya se había cobrado — se corrigió a Checkout');
      if (callbackAlGuardar) callbackAlGuardar();
    } catch (error) {
      console.error(error);
    }
  }

  tituloHoja.textContent = visitaEnEdicion ? 'Editar cobro' : 'Cobro';
  botonGuardar.textContent = visitaEnEdicion ? 'Guardar cambios' : 'Guardar cobro';

  campoPrecio.value = visitaEnEdicion ? visitaEnEdicion.precio : '';
  // Si ya se capturaron notas durante la visita (botón "Notas y foto"), se
  // precargan aquí para no volver a escribirlas — solo se completan con precio/promo.
  // Al editar un cobro ya hecho, se precargan las notas que se guardaron ahí.
  campoNotas.value = visitaEnEdicion ? visitaEnEdicion.notas : (cita.notasVisita || '');
  campoLongitud.value = visitaEnEdicion ? visitaEnEdicion.longitud : '';

  const promocionPrevia = visitaEnEdicion ? visitaEnEdicion.promocion : 'ninguna';
  promocionSeleccionada = promocionPrevia;
  botonesPromocion.forEach((boton) => {
    boton.classList.toggle('pastilla-opcion--activa', boton.dataset.valor === promocionPrevia);
  });

  // Si ya se le asignó estilista mientras la cita estaba en proceso (o ya
  // se había capturado en un cobro previo), se precarga aquí para no tener
  // que volver a elegirla.
  estilistaSeleccionada = '';
  botonesEstilista.forEach((boton) => boton.classList.remove('pastilla-opcion--activa'));
  campoEstilistaOtra.hidden = true;
  campoEstilistaOtra.value = '';

  const estilistaPrevia = (visitaEnEdicion ? visitaEnEdicion.estilista : cita.estilista) || '';
  if (NOMBRES_ESTILISTA_CONOCIDOS.includes(estilistaPrevia)) {
    estilistaSeleccionada = estilistaPrevia;
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === estilistaPrevia));
  } else if (estilistaPrevia) {
    estilistaSeleccionada = 'otra';
    botonesEstilista.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b.dataset.valor === 'otra'));
    campoEstilistaOtra.hidden = false;
    campoEstilistaOtra.value = estilistaPrevia;
  }

  try {
    catalogoProductos = await DB.listarProductos();
  } catch (error) {
    catalogoProductos = [];
    console.error(error);
  }
  poblarSelectVenta();

  regaloSeleccionados = new Set();
  ventaItems = [];
  if (visitaEnEdicion) {
    try {
      const productosPrevios = await DB.listarProductosDeVisita(visitaEnEdicion.id);
      for (const item of productosPrevios) {
        if (item.tipo === 'regalo' && item.productoId) {
          regaloSeleccionados.add(item.productoId);
        } else if (item.tipo === 'venta') {
          ventaItems.push({ productoId: item.productoId, nombre: item.nombre, precio: item.precio, costo: item.costo });
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  renderizarRegaloOpciones();
  renderizarVentaLista();
  actualizarVisibilidadRegalo();

  fondoHoja.classList.add('abierta');
  setTimeout(() => campoPrecio.focus(), 250);
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  citaActual = null;
  visitaEnEdicion = null;
}

function manejarCancelar() {
  const hayContenido = campoPrecio.value || campoNotas.value.trim();
  if (hayContenido && !window.confirm('¿Descartar el cobro sin guardar?')) return;
  cerrar();
}

function resolverEstilista() {
  if (estilistaSeleccionada === 'otra') return campoEstilistaOtra.value.trim();
  return estilistaSeleccionada;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  const precio = Number(campoPrecio.value);
  if (!campoPrecio.value || Number.isNaN(precio) || precio < 0) {
    mostrarMensaje('Escribe el precio cobrado');
    campoPrecio.focus();
    return;
  }

  try {
    let visitaId;
    if (visitaEnEdicion) {
      await DB.actualizarVisita(visitaEnEdicion.id, {
        clientaId: citaActual.clientaId,
        tratamientoId: citaActual.tratamientoId,
        fecha: citaActual.fecha,
        precio,
        longitud: campoLongitud.value,
        promocion: promocionSeleccionada,
        estilista: resolverEstilista(),
        notas: campoNotas.value,
      });
      visitaId = visitaEnEdicion.id;
      mostrarMensaje('Cobro actualizado');
    } else {
      const nueva = await DB.agregarVisita({
        clientaId: citaActual.clientaId,
        citaId: citaActual.id,
        tratamientoId: citaActual.tratamientoId,
        fecha: citaActual.fecha,
        precio,
        longitud: campoLongitud.value,
        promocion: promocionSeleccionada,
        estilista: resolverEstilista(),
        notas: campoNotas.value,
      });
      visitaId = nueva.id;
      await DB.actualizarEstadoCita(citaActual.id, 'checkout');
      mostrarMensaje('Cobro guardado');
    }

    await DB.guardarProductosDeVisita(visitaId, citaActual.fecha, resolverProductosParaGuardar());

    const cb = callbackAlGuardar;
    cerrar();
    if (cb) cb();
  } catch (error) {
    mostrarMensaje('No se pudo guardar el cobro: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-cerrar-hoja-cobro').addEventListener('click', manejarCancelar);
  formulario.addEventListener('submit', manejarGuardar);

  botonesPromocion.forEach((boton) => {
    boton.addEventListener('click', () => {
      promocionSeleccionada = boton.dataset.valor;
      botonesPromocion.forEach((b) => b.classList.toggle('pastilla-opcion--activa', b === boton));
      actualizarVisibilidadRegalo();
    });
  });

  botonVentaAgregar.addEventListener('click', manejarAgregarVenta);

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
}

window.CobroUI = { inicializar, abrir };

})();
