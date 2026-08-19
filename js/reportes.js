// Reportes: por ahora, registrar una venta pasada (sin necesidad de una
// cita) para poder capturar historial de días anteriores. Los reportes de
// ventas por día/semana/mes se agregan en un siguiente paso.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje } = window.UI;
const DB = window.GrafectoDB;

const MAX_RESULTADOS_BUSQUEDA = 20;

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
}

async function mostrar() {
  // Nada que cargar todavía — cuando se agreguen las gráficas, van aquí.
}

window.ReportesUI = { inicializar, mostrar };

})();
