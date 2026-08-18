// Genera enlaces wa.me con el mensaje de recordatorio ya armado.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

// Arma el número en formato internacional que espera wa.me.
// Si ya trae "+" se respeta tal cual; si no, se asume México (52).
function formatearTelefonoWhatsApp(telefono) {
  const limpio = (telefono || '').replace(/\D/g, '');
  if (!limpio) return null;
  if ((telefono || '').trim().startsWith('+')) return limpio;
  if (limpio.length === 10) return `52${limpio}`;
  return limpio;
}

function generarEnlaceRecordatorio(cita) {
  const numero = formatearTelefonoWhatsApp(cita.clientaTelefono);
  if (!numero) return null;

  const mensaje =
    `Hola ${cita.clientaNombre.split(' ')[0]}, te confirmo tu cita en GRAFECTO ` +
    `el ${UI.formatearFechaLarga(cita.fecha)} a las ${UI.formatearHora12(cita.hora)}, ` +
    `¡te esperamos! 💜`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

window.WhatsApp = {
  formatearTelefonoWhatsApp,
  generarEnlaceRecordatorio,
};

})();
