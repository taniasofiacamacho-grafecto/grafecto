// Lista de clientas: render, buscador y alta/edición vía la hoja modal.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, iniciales, mostrarMensaje, formatearFechaLarga, formatearMoneda } = window.UI;
const DB = window.GrafectoDB;

let todasLasClientas = [];
let idEnEdicion = null;

const listaEl = document.getElementById('lista-clientas');
const buscadorInput = document.getElementById('buscador-input');
const fondoHoja = document.getElementById('fondo-hoja');
const hojaTitulo = document.getElementById('hoja-titulo');
const formulario = document.getElementById('formulario-clienta');
const campoNombre = document.getElementById('campo-nombre');
const campoTelefono = document.getElementById('campo-telefono');
const campoNotas = document.getElementById('campo-notas');
const botonEliminar = document.getElementById('boton-eliminar');
const historialContenedor = document.getElementById('clienta-historial');
const historialLista = document.getElementById('clienta-historial-lista');

async function cargarClientas() {
  todasLasClientas = await DB.listarClientas();
  todasLasClientas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  renderizarLista(todasLasClientas);
}

function renderizarLista(clientas) {
  listaEl.innerHTML = '';

  if (clientas.length === 0) {
    const vacio = crearEl('div', { class: 'estado-vacio' }, [
      crearEl('div', { class: 'estado-vacio__titulo', texto: todasLasClientas.length === 0
        ? 'Aún no tienes clientas registradas'
        : 'No se encontraron clientas' }),
      crearEl('p', { texto: todasLasClientas.length === 0
        ? 'Toca el botón + para agregar la primera.'
        : 'Prueba con otro nombre.' }),
    ]);
    listaEl.appendChild(vacio);
    return;
  }

  for (const clienta of clientas) {
    const tarjeta = crearEl('div', { class: 'tarjeta-clienta', onclick: () => abrirHoja(clienta) }, [
      crearEl('div', { class: 'tarjeta-clienta__avatar', texto: iniciales(clienta.nombre) }),
      crearEl('div', { class: 'tarjeta-clienta__info' }, [
        crearEl('div', { class: 'tarjeta-clienta__nombre', texto: clienta.nombre }),
        clienta.telefono
          ? crearEl('div', { class: 'tarjeta-clienta__detalle', texto: clienta.telefono })
          : null,
      ]),
      crearEl('div', { class: 'tarjeta-clienta__flecha', texto: '›' }),
    ]);
    listaEl.appendChild(tarjeta);
  }
}

function filtrarClientas() {
  const texto = DB.normalizarTexto(buscadorInput.value);
  if (!texto) {
    renderizarLista(todasLasClientas);
    return;
  }
  const filtradas = todasLasClientas.filter((c) => c.nombreNormalizado.includes(texto));
  renderizarLista(filtradas);
}

async function mostrarHistorial(clientaId) {
  historialContenedor.hidden = false;
  historialLista.innerHTML = '';
  historialLista.appendChild(crearEl('div', { class: 'campo__ayuda', texto: 'Cargando…' }));

  try {
    const visitas = await DB.listarVisitasDeClienta(clientaId);
    historialLista.innerHTML = '';

    if (visitas.length === 0) {
      historialLista.appendChild(
        crearEl('div', { class: 'campo__ayuda', texto: 'Todavía no tiene visitas registradas.' })
      );
      return;
    }

    for (const visita of visitas) {
      const detalle = [visita.tratamientoNombre, visita.estilista].filter(Boolean).join(' · ');
      historialLista.appendChild(
        crearEl('div', { class: 'historial-item' }, [
          crearEl('div', { class: 'historial-item__info' }, [
            crearEl('div', { class: 'historial-item__fecha', texto: formatearFechaLarga(visita.fecha) }),
            detalle ? crearEl('div', { class: 'historial-item__detalle', texto: detalle }) : null,
          ]),
          crearEl('div', { class: 'historial-item__precio', texto: formatearMoneda(visita.precio) }),
        ])
      );
    }
  } catch (error) {
    historialLista.innerHTML = '';
    historialLista.appendChild(
      crearEl('div', { class: 'campo__ayuda', texto: 'No se pudo cargar el historial.' })
    );
    console.error(error);
  }
}

async function abrirHoja(clienta = null) {
  idEnEdicion = clienta ? clienta.id : null;
  hojaTitulo.textContent = clienta ? 'Editar clienta' : 'Nueva clienta';
  campoNombre.value = clienta ? clienta.nombre : '';
  campoTelefono.value = clienta ? clienta.telefono : '';
  campoNotas.value = clienta ? clienta.notas : '';
  botonEliminar.hidden = !clienta;

  if (clienta) {
    await mostrarHistorial(clienta.id);
  } else {
    historialContenedor.hidden = true;
  }

  fondoHoja.classList.add('abierta');
  setTimeout(() => campoNombre.focus(), 250);
}

function cerrarHoja() {
  fondoHoja.classList.remove('abierta');
  formulario.reset();
  idEnEdicion = null;
}

async function manejarGuardar(evento) {
  evento.preventDefault();

  const nombre = campoNombre.value.trim();
  if (!nombre) {
    campoNombre.focus();
    return;
  }

  const datos = {
    nombre,
    telefono: campoTelefono.value,
    notas: campoNotas.value,
  };

  if (idEnEdicion) {
    await DB.actualizarClienta(idEnEdicion, datos);
    mostrarMensaje('Clienta actualizada');
  } else {
    await DB.agregarClienta(datos);
    mostrarMensaje('Clienta guardada');
  }

  cerrarHoja();
  await cargarClientas();
}

async function manejarEliminar() {
  if (!idEnEdicion) return;
  const confirmar = window.confirm('¿Eliminar esta clienta? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  await DB.eliminarClienta(idEnEdicion);
  mostrarMensaje('Clienta eliminada');
  cerrarHoja();
  await cargarClientas();
}

function inicializarClientas() {
  buscadorInput.addEventListener('input', filtrarClientas);
  document.getElementById('boton-cerrar-hoja').addEventListener('click', cerrarHoja);
  fondoHoja.addEventListener('click', (evento) => {
    if (evento.target === fondoHoja) cerrarHoja();
  });
  formulario.addEventListener('submit', manejarGuardar);
  botonEliminar.addEventListener('click', manejarEliminar);

  cargarClientas();
}

window.inicializarClientas = inicializarClientas;
window.ClientasUI = { abrirNuevo: () => abrirHoja(null) };

})();
