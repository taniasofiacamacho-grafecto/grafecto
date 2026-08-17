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

  window.UI = { crearEl, iniciales, mostrarMensaje };
})();
