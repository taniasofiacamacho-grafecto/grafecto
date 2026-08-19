// Construye la tarjeta visual de una cita (usada en Agenda y en Hoy),
// con su pastilla de estado y los botones de WhatsApp. Compartido para que
// el comportamiento de avanzar estado / abrir cobro sea idéntico en ambas vistas.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const { crearEl, mostrarMensaje, formatearHora12, estadoConsentimiento, fechaHoyISO } = window.UI;
const DB = window.GrafectoDB;

const ESTADOS = [
  { valor: 'agendada', etiqueta: 'Agendada' },
  { valor: 'llego', etiqueta: 'Llegó' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'checkout', etiqueta: 'Checkout' },
];

function siguienteEstado(actual) {
  const indice = ESTADOS.findIndex((e) => e.valor === actual);
  return ESTADOS[(indice + 1) % ESTADOS.length].valor;
}

function etiquetaEstado(valor) {
  return ESTADOS.find((e) => e.valor === valor)?.etiqueta || valor;
}

function crearBotonesWhatsApp(cita) {
  const botones = [
    ['Confirmación', WhatsApp.generarEnlaceConfirmacion(cita)],
    WhatsApp.debeSugerirDeepCleanse(cita.fecha)
      ? ['Deep cleanse', WhatsApp.generarEnlaceDeepCleanse(cita)]
      : null,
    ['Recordatorio', WhatsApp.generarEnlaceRecordatorio(cita)],
  ].filter(Boolean);

  if (!botones[0][1]) {
    return crearEl('div', { class: 'tarjeta-cita__sin-telefono', texto: 'Sin teléfono' });
  }

  return crearEl(
    'div',
    { class: 'tarjeta-cita__pie' },
    botones.map(([etiqueta, enlace]) =>
      crearEl('a', {
        class: 'tarjeta-cita__whatsapp',
        href: enlace,
        target: '_blank',
        rel: 'noopener',
        texto: etiqueta,
      })
    )
  );
}

// onCambio se llama después de actualizar el estado (o de guardar el cobro),
// para que quien mandó a construir la tarjeta vuelva a cargar su lista.
function crearPastillaEstado(cita, onCambio) {
  return crearEl('button', {
    type: 'button',
    class: `pastilla-estado pastilla-estado--${cita.estado}`,
    texto: etiquetaEstado(cita.estado),
    onclick: async (evento) => {
      evento.stopPropagation();
      const nuevo = siguienteEstado(cita.estado);

      // Al llegar a "Checkout" se abre el cobro; el estado se marca solo
      // hasta que se guarde el cobro (así no se pierde el paso de cobrar).
      if (nuevo === 'checkout') {
        window.CobroUI.abrir(cita, onCambio);
        return;
      }

      try {
        await DB.actualizarEstadoCita(cita.id, nuevo);
        onCambio();
      } catch (error) {
        mostrarMensaje('No se pudo actualizar el estado');
        console.error(error);
      }
    },
  });
}

// Disponible desde que la clienta llega (no hace falta esperar al cobro).
function crearBotonNotas(cita, onCambio) {
  if (cita.estado === 'agendada') return null;

  const tieneContenido = Boolean(cita.notasVisita || cita.fotoPath);
  return crearEl('button', {
    type: 'button',
    class: tieneContenido ? 'boton-notas-visita boton-notas-visita--con-datos' : 'boton-notas-visita',
    texto: tieneContenido ? '📝 Notas' : '📝 Agregar notas',
    onclick: (evento) => {
      evento.stopPropagation();
      window.NotasVisitaUI.abrir(cita, onCambio);
    },
  });
}

// Se firma solo una vez al año, así que aquí se ve de un vistazo si a esta
// clienta ya le toca — y si le falta, se marca sin tener que abrir su ficha.
function crearBadgeConsentimiento(cita, onCambio) {
  const estado = estadoConsentimiento(cita.clientaConsentimientoFecha);

  return crearEl('button', {
    type: 'button',
    class: `badge-consentimiento badge-consentimiento--${estado.clase}`,
    texto: estado.vigente ? '✓ Consentimiento' : `⚠ Consentimiento: ${estado.texto}`,
    onclick: async (evento) => {
      evento.stopPropagation();
      if (estado.vigente) return;

      const confirmar = window.confirm(
        `¿Marcar el consentimiento informado de ${cita.clientaNombre} como firmado hoy?`
      );
      if (!confirmar) return;

      try {
        await DB.actualizarConsentimiento(cita.clientaId, fechaHoyISO());
        onCambio();
      } catch (error) {
        mostrarMensaje('No se pudo actualizar el consentimiento');
        console.error(error);
      }
    },
  });
}

// opciones: { colorFondo: boolean, onEditar: (cita) => void, onCambio: () => void }
function crear(cita, opciones = {}) {
  const clases = ['tarjeta-cita'];
  if (opciones.colorFondo) clases.push(`tarjeta-cita--${cita.estado}`);

  const onCambio = opciones.onCambio || (() => {});
  const onEditar = opciones.onEditar || (() => {});

  return crearEl('div', { class: clases.join(' ') }, [
    crearEl('div', { class: 'tarjeta-cita__cuerpo', onclick: () => onEditar(cita) }, [
      crearEl('div', { class: 'tarjeta-cita__hora', texto: formatearHora12(cita.hora) }),
      crearEl('div', { class: 'tarjeta-cita__info' }, [
        crearEl('div', { class: 'tarjeta-cita__nombre', texto: cita.clientaNombre }),
        crearBadgeConsentimiento(cita, onCambio),
        cita.tratamientoNombre
          ? crearEl('div', { class: 'tarjeta-cita__detalle', texto: cita.tratamientoNombre })
          : null,
        cita.notas
          ? crearEl('div', { class: 'tarjeta-cita__detalle', texto: cita.notas })
          : null,
      ]),
    ]),
    crearEl('div', { class: 'tarjeta-cita__estado' }, [
      crearPastillaEstado(cita, onCambio),
      crearBotonNotas(cita, onCambio),
    ]),
    crearBotonesWhatsApp(cita),
  ]);
}

window.TarjetaCita = { crear, etiquetaEstado, ESTADOS };

})();
