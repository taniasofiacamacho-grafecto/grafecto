// Helpers pequeños para crear elementos DOM sin plantillas ni frameworks.
// Todo envuelto en un IIFE para no ensuciar el scope global (scripts clásicos
// comparten un solo scope entre archivos, así que hay que aislar cada uno).

(function () {
  function crearEl(etiqueta, atributos = {}, hijos = []) {
    const el = document.createElement(etiqueta);

    for (const [clave, valor] of Object.entries(atributos)) {
      if (clave === 'texto') {
        el.textContent = valor;
      } else if (clave === 'html') {
        el.innerHTML = valor;
      } else if (clave.startsWith('on') && typeof valor === 'function') {
        el.addEventListener(clave.slice(2), valor);
      } else if (valor !== null && valor !== undefined && valor !== false) {
        el.setAttribute(clave, valor === true ? '' : valor);
      }
    }

    for (const hijo of [].concat(hijos)) {
      if (hijo) el.appendChild(hijo);
    }

    return el;
  }

  function iniciales(nombre) {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() || '')
      .join('');
  }

  let temporizadorMensaje = null;

  function mostrarMensaje(texto) {
    let el = document.getElementById('mensaje-flotante');
    if (!el) {
      el = crearEl('div', { id: 'mensaje-flotante', class: 'mensaje-flotante' });
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.add('visible');

    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
      el.classList.remove('visible');
    }, 2200);
  }

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  function formatearFechaLarga(fechaISO) {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return `${DIAS[fecha.getDay()]} ${dia} de ${MESES[mes - 1]}`;
  }

  function formatearHora12(horaISO) {
    const [horaStr, minutoStr] = horaISO.split(':');
    let hora = Number(horaStr);
    const periodo = hora >= 12 ? 'p.m.' : 'a.m.';
    hora = hora % 12 || 12;
    return `${hora}:${minutoStr} ${periodo}`;
  }

  function formatearDuracion(minutos) {
    if (!minutos) return '';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas === 0) return `${mins} min`;
    if (mins === 0) return horas === 1 ? '1 hora' : `${horas} horas`;
    return `${horas} h ${mins} min`;
  }

  function formatearMoneda(numero) {
    return '$' + Math.round(numero).toLocaleString('es-MX');
  }

  function fechaHoyISO() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  window.UI = {
    crearEl,
    iniciales,
    mostrarMensaje,
    formatearFechaLarga,
    formatearHora12,
    formatearDuracion,
    formatearMoneda,
    fechaHoyISO,
  };
})();
