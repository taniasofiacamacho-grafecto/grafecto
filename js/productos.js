// Catálogo de productos: se usa desde el cobro para marcar qué se regaló
// en la promoción de "producto gratis" o qué se vendió aparte (champú,
// acondicionador, kits, secadora, etc.). No lleva inventario — solo cuenta
// cuántos se regalaron/vendieron y su costo, para el punto de equilibrio.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje } = window.UI;
const DB = window.GrafectoDB;

const fondoHoja = document.getElementById('fondo-hoja-catalogo-productos');
const lista = document.getElementById('catalogo-productos-lista');

// Cada campo se guarda solo al perder el foco, igual que en los gastos
// fijos — son pocos productos, no hace falta un botón de "Guardar" general.
function crearFilaProducto(producto) {
  const campoNombre = crearEl('input', {
    type: 'text',
    class: 'gasto-fila-editable__nombre-input',
    value: producto.nombre,
    autocapitalize: 'sentences',
  });
  campoNombre.addEventListener('change', async () => {
    const valor = campoNombre.value.trim();
    if (!valor) {
      campoNombre.value = producto.nombre;
      return;
    }
    try {
      await DB.actualizarProducto(producto.id, { nombre: valor });
      producto.nombre = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoPrecio = crearEl('input', {
    type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: producto.precio,
  });
  campoPrecio.addEventListener('change', async () => {
    const valor = Number(campoPrecio.value) || 0;
    try {
      await DB.actualizarProducto(producto.id, { precio: valor });
      producto.precio = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const campoCosto = crearEl('input', {
    type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: producto.costo,
  });
  campoCosto.addEventListener('change', async () => {
    const valor = Number(campoCosto.value) || 0;
    try {
      await DB.actualizarProducto(producto.id, { costo: valor });
      producto.costo = valor;
    } catch (error) {
      mostrarMensaje('No se pudo guardar');
      console.error(error);
    }
  });

  const botonEliminar = crearEl('button', {
    type: 'button',
    class: 'gasto-extra-fila__eliminar',
    texto: '✕',
    'aria-label': 'Eliminar producto',
    onclick: async () => {
      if (!window.confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return;
      try {
        await DB.eliminarProducto(producto.id);
        filaEl.remove();
      } catch (error) {
        mostrarMensaje('No se pudo eliminar');
        console.error(error);
      }
    },
  });

  const filaEl = crearEl('div', { class: 'gasto-fila-editable' }, [
    crearEl('div', { class: 'gasto-fila-editable__encabezado' }, [campoNombre, botonEliminar]),
    crearEl('div', { class: 'gasto-fila-editable__campos' }, [
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Precio' }), campoPrecio]),
      crearEl('div', { class: 'gasto-fila-editable__campo' }, [crearEl('label', { texto: 'Costo' }), campoCosto]),
    ]),
  ]);

  return filaEl;
}

async function abrir() {
  lista.innerHTML = '';
  lista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'Cargando…' }));
  fondoHoja.classList.add('abierta');

  try {
    await DB.asegurarProductosPorDefecto();
    const productos = await DB.listarProductos();
    lista.innerHTML = '';
    for (const producto of productos) {
      lista.appendChild(crearFilaProducto(producto));
    }
  } catch (error) {
    lista.innerHTML = '';
    lista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar.' }));
    console.error(error);
  }
}

function cerrar() {
  fondoHoja.classList.remove('abierta');
}

async function manejarAgregar() {
  try {
    const nuevo = await DB.agregarProducto({ nombre: 'Nuevo producto', categoria: 'individual', precio: 0, costo: 0 });
    lista.appendChild(crearFilaProducto(nuevo));
  } catch (error) {
    mostrarMensaje('No se pudo agregar: ' + (error.message || 'intenta de nuevo'));
    console.error(error);
  }
}

function inicializar() {
  document.getElementById('boton-abrir-catalogo-productos').addEventListener('click', abrir);
  document.getElementById('boton-cerrar-hoja-catalogo-productos').addEventListener('click', cerrar);
  document.getElementById('boton-agregar-producto-catalogo').addEventListener('click', manejarAgregar);
}

window.ProductosUI = { inicializar };

})();
