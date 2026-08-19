// Capa de datos — todo el acceso a la base de datos vive en este archivo.
// Usa Supabase (Postgres en la nube) para que los datos se sincronicen entre
// todos tus dispositivos. El acceso está protegido por Row Level Security:
// cada quien solo puede ver/editar sus propias filas (ver auth.js).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const TABLA_CLIENTAS = 'clientas';
const TABLA_CITAS = 'citas';
const TABLA_TRATAMIENTOS = 'tratamientos';
const TABLA_VISITAS = 'visitas';

const TRATAMIENTOS_POR_DEFECTO = [
  { nombre: 'Hair Therapy', duracion_minutos: 180 },
  { nombre: 'Tratamiento de hidratación', duracion_minutos: 90 },
  { nombre: 'Retoque de crecimiento', duracion_minutos: 180 },
];

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
    tratamientoId: fila.tratamiento_id,
    tratamientoNombre: fila.tratamiento?.nombre || '',
    duracionMinutos: fila.tratamiento?.duracion_minutos || null,
    fecha: fila.fecha,
    hora: fila.hora,
    notas: fila.notas || '',
    estado: fila.estado || 'agendada',
  };
}

const SELECT_CITA_CON_CLIENTA =
  '*, clienta:clientas(nombre, telefono), tratamiento:tratamientos(nombre, duracion_minutos)';

// Solo trae de hoy en adelante — el historial de citas pasadas no se necesita
// para el trabajo del día a día (se puede agregar una vista aparte si hace falta).
async function listarCitas() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_CITAS)
    .select(SELECT_CITA_CON_CLIENTA)
    .gte('fecha', UI.fechaHoyISO())
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
      tratamiento_id: datos.tratamientoId || null,
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
      tratamiento_id: datos.tratamientoId || null,
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

async function actualizarEstadoCita(id, estado) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_CITAS).update({ estado }).eq('id', id);
  if (error) throw error;
}

// ===== Tratamientos =====

function filaATratamiento(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    duracionMinutos: fila.duracion_minutos,
  };
}

async function listarTratamientos() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_TRATAMIENTOS)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(filaATratamiento);
}

// La primera vez que la usuaria entra, crea los 3 tratamientos base
// si todavía no tiene ninguno (no se siembran por SQL para que respeten RLS).
async function asegurarTratamientosPorDefecto() {
  const { count, error } = await GrafectoAuth.cliente
    .from(TABLA_TRATAMIENTOS)
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if (count > 0) return;

  const { error: errorInsertar } = await GrafectoAuth.cliente
    .from(TABLA_TRATAMIENTOS)
    .insert(TRATAMIENTOS_POR_DEFECTO);

  if (errorInsertar) throw errorInsertar;
}

// ===== Visitas (bitácora / cobro) =====

function filaAVisita(fila) {
  return {
    id: fila.id,
    clientaId: fila.clienta_id,
    citaId: fila.cita_id,
    tratamientoId: fila.tratamiento_id,
    tratamientoNombre: fila.tratamiento?.nombre || '',
    fecha: fila.fecha,
    precio: Number(fila.precio),
    promocion: fila.promocion,
    notas: fila.notas || '',
  };
}

const SELECT_VISITA_CON_TRATAMIENTO = '*, tratamiento:tratamientos(nombre)';

async function agregarVisita(datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_VISITAS)
    .insert({
      clienta_id: datos.clientaId,
      cita_id: datos.citaId || null,
      tratamiento_id: datos.tratamientoId || null,
      fecha: datos.fecha,
      precio: datos.precio,
      promocion: datos.promocion || 'ninguna',
      notas: (datos.notas || '').trim(),
    })
    .select(SELECT_VISITA_CON_TRATAMIENTO)
    .single();

  if (error) throw error;
  return filaAVisita(data);
}

async function listarVisitasDeClienta(clientaId) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_VISITAS)
    .select(SELECT_VISITA_CON_TRATAMIENTO)
    .eq('clienta_id', clientaId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data.map(filaAVisita);
}

async function listarVisitasEnRango(fechaInicio, fechaFin) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_VISITAS)
    .select(SELECT_VISITA_CON_TRATAMIENTO)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data.map(filaAVisita);
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
  actualizarEstadoCita,
  listarTratamientos,
  asegurarTratamientosPorDefecto,
  agregarVisita,
  listarVisitasDeClienta,
  listarVisitasEnRango,
  normalizarTexto,
};

})();
