// Capa de datos — todo el acceso a la base de datos vive en este archivo.
// Usa Supabase (Postgres en la nube) para que los datos se sincronicen entre
// todos tus dispositivos. El acceso está protegido por Row Level Security:
// cada quien solo puede ver/editar sus propias filas (ver auth.js).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const TABLA_CLIENTAS = 'clientas';
const TABLA_CITAS = 'citas';

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// La base de datos usa snake_case; la app usa camelCase.
function filaAClienta(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    nombreNormalizado: fila.nombre_normalizado,
    telefono: fila.telefono || '',
    notas: fila.notas || '',
    fechaAlta: fila.fecha_alta,
  };
}

async function listarClientas() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CLIENTAS)
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data.map(filaAClienta);
}

async function obtenerClienta(id) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CLIENTAS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return filaAClienta(data);
}

async function agregarClienta(datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CLIENTAS)
    .insert({
      nombre: datos.nombre.trim(),
      nombre_normalizado: normalizarTexto(datos.nombre),
      telefono: (datos.telefono || '').trim(),
      notas: (datos.notas || '').trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return filaAClienta(data);
}

async function actualizarClienta(id, datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CLIENTAS)
    .update({
      nombre: datos.nombre.trim(),
      nombre_normalizado: normalizarTexto(datos.nombre),
      telefono: (datos.telefono || '').trim(),
      notas: (datos.notas || '').trim(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return filaAClienta(data);
}

async function eliminarClienta(id) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_CLIENTAS).delete().eq('id', id);
  if (error) throw error;
}

// ===== Citas =====
// Cada cita trae los datos de su clienta (nombre, teléfono) en un solo viaje,
// usando el join automático que arma Supabase a partir de la relación clienta_id.

function filaACita(fila) {
  return {
    id: fila.id,
    clientaId: fila.clienta_id,
    clientaNombre: fila.clienta?.nombre || '(clienta eliminada)',
    clientaTelefono: fila.clienta?.telefono || '',
    fecha: fila.fecha,
    hora: fila.hora,
    notas: fila.notas || '',
  };
}

const SELECT_CITA_CON_CLIENTA = '*, clienta:clientas(nombre, telefono)';

async function listarCitas() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CITAS)
    .select(SELECT_CITA_CON_CLIENTA)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (error) throw error;
  return data.map(filaACita);
}

async function agregarCita(datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CITAS)
    .insert({
      clienta_id: datos.clientaId,
      fecha: datos.fecha,
      hora: datos.hora,
      notas: (datos.notas || '').trim(),
    })
    .select(SELECT_CITA_CON_CLIENTA)
    .single();

  if (error) throw error;
  return filaACita(data);
}

async function actualizarCita(id, datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CITAS)
    .update({
      clienta_id: datos.clientaId,
      fecha: datos.fecha,
      hora: datos.hora,
      notas: (datos.notas || '').trim(),
    })
    .eq('id', id)
    .select(SELECT_CITA_CON_CLIENTA)
    .single();

  if (error) throw error;
  return filaACita(data);
}

async function eliminarCita(id) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_CITAS).delete().eq('id', id);
  if (error) throw error;
}

window.GrafectoDB = {
  listarClientas,
  obtenerClienta,
  agregarClienta,
  actualizarClienta,
  eliminarClienta,
  listarCitas,
  agregarCita,
  actualizarCita,
  eliminarCita,
  normalizarTexto,
};

})();
