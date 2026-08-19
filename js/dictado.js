// Dictado por voz reutilizable: conecta un botón de micrófono a cualquier
// textarea, usando el reconocimiento de voz nativo del navegador.
// Si el navegador no lo soporta, el botón se queda oculto (no todos los
// navegadores lo tienen, sobre todo en computadora).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const ReconocimientoVoz = window.SpeechRecognition || window.webkitSpeechRecognition;

function soportado() {
  return !!ReconocimientoVoz;
}

// Conecta un botón de micrófono a un textarea: al tocarlo, empieza a
// escuchar y va agregando lo que se dice al final del texto ya escrito.
function adjuntarA(textarea, boton) {
  if (!soportado()) {
    boton.hidden = true;
    return;
  }

  boton.hidden = false;

  const reconocimiento = new ReconocimientoVoz();
  reconocimiento.lang = 'es-MX';
  reconocimiento.continuous = true;
  reconocimiento.interimResults = false;

  let escuchando = false;

  reconocimiento.onresult = (evento) => {
    let textoNuevo = '';
    for (let i = evento.resultIndex; i < evento.results.length; i++) {
      if (evento.results[i].isFinal) {
        textoNuevo += evento.results[i][0].transcript;
      }
    }
    if (textoNuevo) {
      const separador = textarea.value && !textarea.value.endsWith(' ') ? ' ' : '';
      textarea.value += separador + textoNuevo.trim();
    }
  };

  reconocimiento.onerror = () => {
    escuchando = false;
    boton.classList.remove('boton-dictado--activo');
  };

  reconocimiento.onend = () => {
    escuchando = false;
    boton.classList.remove('boton-dictado--activo');
  };

  boton.addEventListener('click', () => {
    if (escuchando) {
      reconocimiento.stop();
    } else {
      reconocimiento.start();
      escuchando = true;
      boton.classList.add('boton-dictado--activo');
    }
  });
}

window.Dictado = { soportado, adjuntarA };

})();
