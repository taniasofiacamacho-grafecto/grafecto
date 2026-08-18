// Genera enlaces wa.me con los mensajes de la cita ya armados.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const DIRECCION_SALON =
  'Río Grijalva 151, Local 5, Torre Palmas (entre Río Mississippi y Río de la Plata), ' +
  'Col. del Valle, San Pedro Garza García, N.L. — 2do piso, atrás del elevador.';

// Arma el número en formato internacional que espera wa.me.
// Si ya trae "+" se respeta tal cual; si no, se asume México (52).
function formatearTelefonoWhatsApp(telefono) {
  const limpio = (telefono || '').replace(/\D/g, '');
  if (!limpio) return null;
  if ((telefono || '').trim().startsWith('+')) return limpio;
  if (limpio.length === 10) return `52${limpio}`;
  return limpio;
}

function enlaceWa(telefono, mensaje) {
  const numero = formatearTelefonoWhatsApp(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function diasHastaFecha(fechaISO) {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const msPorDia = 24 * 60 * 60 * 1000;
  const [a1, m1, d1] = hoyISO.split('-').map(Number);
  const [a2, m2, d2] = fechaISO.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / msPorDia);
}

// Solo tiene sentido sugerir el detox capilar si hay tiempo de hacerlo
// antes de la cita (se usa 3 a 6 días antes).
function debeSugerirDeepCleanse(fechaISO) {
  return diasHastaFecha(fechaISO) > 2;
}

// ===== Mensaje de confirmación (al agendar) =====

function generarEnlaceConfirmacion(cita) {
  const nombre = cita.clientaNombre.split(' ')[0];
  // Evita doble punto: formatearHora12 ya termina en "a.m."/"p.m.", así que solo
  // agregamos punto final cuando sí hay texto de tratamiento después.
  const cierreLinea = cita.tratamientoNombre ? ` para tu ${cita.tratamientoNombre}.` : '';

  const mensaje =
    `Hola ${nombre}, confirmamos tu cita en GRAFECTO el ${UI.formatearFechaLarga(cita.fecha)} ` +
    `a las ${UI.formatearHora12(cita.hora)}${cierreLinea}\n\n` +
    `📍 ${DIRECCION_SALON}\n\n` +
    `Para garantizar los mejores resultados de tu tratamiento, te recomendamos que, preferentemente, ` +
    `no utilices acondicionador ni crema de peinar en la última lavada antes de tu cita con nosotros. ` +
    `Esto nos permite realizar un diagnóstico más preciso y asegurar la efectividad del tratamiento.\n` +
    `*POR FAVOR PRESÉNTATE CON EL CABELLO LIMPIO Y SECO.*\n\n` +
    `Además, si estás pensando en pintar o teñir tu cabello, es preferible realizar el tratamiento ` +
    `antes del retoque de tinte o diseño de color, ya que el proceso de aplicación deslava el tinte. ` +
    `¡No te preocupes! Puedes programar tu tinte inmediatamente después o al día siguiente de la ` +
    `aplicación del tratamiento.\n\n` +
    `Un día antes de tu cita te enviaremos un mensaje para confirmarla — es necesario contestar esa ` +
    `confirmación, de lo contrario el horario podría quedar disponible para alguien más.\n\n` +
    `Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos. ` +
    `¡Esperamos verte pronto! 💜`;

  return enlaceWa(cita.clientaTelefono, mensaje);
}

// ===== Recomendación de deep cleanse (solo si hay tiempo antes de la cita) =====

function generarEnlaceDeepCleanse(cita) {
  const nombre = cita.clientaNombre.split(' ')[0];

  const mensaje =
    `Hola ${nombre}, *sugerimos ampliamente seguir esta recomendación previa a tu cita* ` +
    `para mejorar los resultados del tratamiento.\n\n` +
    `Por el tipo de agua que tenemos en Monterrey, es muy común que el cabello acumule sarro, ` +
    `metales y cosméticos, sobre todo en personas que dejan que el cabello se seque al natural. ` +
    `Esta acumulación puede reducir la eficacia de los productos capilares y limitar los beneficios ` +
    `del tratamiento.\n\n` +
    `Una forma sencilla de prevenir esto es hacer un detox capilar con un shampoo quelante o ` +
    `clarificante, que ayuda a eliminar esos residuos y dejar el cabello limpio y receptivo.\n\n` +
    `Recomendaciones:\n` +
    `• Úsalo durante 3 a 6 días antes del tratamiento.\n` +
    `• Haz doble lavado: aplica el shampoo dos veces seguidas en la misma lavada para una limpieza ` +
    `más profunda.\n` +
    `• Puedes seguir usando acondicionador, pero reduce en la medida de lo posible la cantidad de ` +
    `producto y mantenlo de medios a puntas (no uses acondicionador en la última lavada antes de ` +
    `acudir a tu cita).\n\n` +
    `Aquí te dejamos algunas sugerencias de shampoos que nos han funcionado muy bien. Los puedes ` +
    `conseguir fácilmente en Amazon:\n\n` +
    `KUUL Clean Me Shampoo Deep Cleansing\n` +
    `https://a.co/d/0gxcWCEJ\n\n` +
    `Neutrogena Champú Healthy Scalp Clarify\n` +
    `https://a.co/d/5Hb6LUa\n\n` +
    `Tec Italy Profundo Shampoo\n` +
    `https://a.co/d/057HLQg9`;

  return enlaceWa(cita.clientaTelefono, mensaje);
}

// ===== Recordatorio del día antes (pide confirmar asistencia) =====

function generarEnlaceRecordatorio(cita) {
  const nombre = cita.clientaNombre.split(' ')[0];

  const mensaje =
    `¡Hola ${nombre}!\n\n` +
    `Esperamos que estés teniendo un excelente día.\n` +
    `Queremos recordarte que tienes una cita con nosotros programada para mañana, ` +
    `${UI.formatearFechaLarga(cita.fecha)} a las ${UI.formatearHora12(cita.hora)}, ` +
    `¡estamos emocionados de verte!\n\n` +
    `Por favor, tómate un momento para confirmar tu asistencia. Si por alguna razón necesitas ` +
    `reprogramar o cancelar la cita, agradecemos que nos lo hagas saber con anticipación para poder ` +
    `ajustar nuestro horario y atender a otros clientes.\n\n` +
    `Estamos aquí para cuidarte y brindarte la mejor experiencia posible. Si tienes alguna pregunta ` +
    `o necesitas más información sobre tu cita, no dudes en contactarnos. Tu satisfacción es nuestra ` +
    `prioridad.`;

  return enlaceWa(cita.clientaTelefono, mensaje);
}

window.WhatsApp = {
  formatearTelefonoWhatsApp,
  debeSugerirDeepCleanse,
  generarEnlaceConfirmacion,
  generarEnlaceDeepCleanse,
  generarEnlaceRecordatorio,
};

})();
