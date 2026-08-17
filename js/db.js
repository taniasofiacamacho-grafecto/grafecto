// Capa de datos — todo el acceso a IndexedDB vive en este archivo.
// Cuando agreguemos citas, tratamientos, bitácora, etc. (fases futuras),
// se suman aquí como nuevos "object stores", subiendo NOMBRE_VERSION_DB.
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const NOMBRE_DB = 'grafecto-db';
const VERSION_DB = 1;

let dbPromise = null;

function abrirDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);

    solicitud.onupgradeneeded = (evento) => {
      const db = evento.target.result;

      if (!db.objectStoreNames.contains('clientas')) {
        const clientas = db.createObjectStore('clientas', {
          keyPath: 'id',
          autoIncrement: true,
        });
        clientas.createIndex('porNombre', 'nombreNormalizado', { unique: false });
      }
    };

    solicitud.onsuccess = (evento) => resolve(evento.target.result);
    solicitud.onerror = (evento) => reject(evento.target.error);
  });

  return dbPromise;
}

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

async function conAlmacen(nombreAlmacen, modo, callback) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(nombreAlmacen, modo);
    const almacen = transaccion.objectStore(nombreAlmacen);
    const resultado = callback(almacen);

    transaccion.oncomplete = () => resolve(resultado);
    transaccion.onerror = () => reject(transaccion.error);
    transaccion.onabort = () => reject(transaccion.error);
  });
}

function envolverSolicitud(solicitud) {
  return new Promise((resolve, reject) => {
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// ===== Clientas =====

async function listarClientas() {
  return conAlmacen('clientas', 'readonly', (almacen) => {
    return new Promise((resolve, reject) => {
      const resultado = [];
      const cursor = almacen.openCursor();
      cursor.onsuccess = (evento) => {
        const cur = evento.target.result;
        if (cur) {
          resultado.push(cur.value);
          cur.continue();
        } else {
          resolve(resultado);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });
  });
}

async function obtenerClienta(id) {
  return conAlmacen('clientas', 'readonly', (almacen) => {
    return envolverSolicitud(almacen.get(id));
  });
}

async function agregarClienta(datos) {
  const clienta = {
    nombre: datos.nombre.trim(),
    nombreNormalizado: normalizarTexto(datos.nombre),
    telefono: (datos.telefono || '').trim(),
    notas: (datos.notas || '').trim(),
    fechaAlta: new Date().toISOString(),
  };

  return conAlmacen('clientas', 'readwrite', (almacen) => {
    return envolverSolicitud(almacen.add(clienta));
  });
}

async function actualizarClienta(id, datos) {
  return conAlmacen('clientas', 'readwrite', async (almacen) => {
    const existente = await envolverSolicitud(almacen.get(id));
    if (!existente) throw new Error('Clienta no encontrada');

    const actualizada = {
      ...existente,
      nombre: datos.nombre.trim(),
      nombreNormalizado: normalizarTexto(datos.nombre),
      telefono: (datos.telefono || '').trim(),
      notas: (datos.notas || '').trim(),
    };

    return envolverSolicitud(almacen.put(actualizada));
  });
}

async function eliminarClienta(id) {
  return conAlmacen('clientas', 'readwrite', (almacen) => {
    return envolverSolicitud(almacen.delete(id));
  });
}

window.GrafectoDB = {
  listarClientas,
  obtenerClienta,
  agregarClienta,
  actualizarClienta,
  eliminarClienta,
  normalizarTexto,
};

})();
