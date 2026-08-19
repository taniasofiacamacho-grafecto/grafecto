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
    consentimientoFecha: fila.consentimiento_fecha || null,
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

async function actualizarConsentimiento(id, fecha) {
  const { error } = await GrafectoAuth.cliente
    .from(TABLA_CLIENTAS)
    .update({ consentimiento_fecha: fecha })
    .eq('id', id);

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
    notasVisita: fila.notas_visita || '',
    fotoPath: fila.foto_path || null,
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

// Notas y foto capturadas durante la visita (antes del cobro). fotoPath puede
// ser null si no se cambió la foto (para no borrarla al solo editar notas).
async function actualizarNotasVisita(id, { notas, fotoPath }) {
  const cambios = { notas_visita: notas };
  if (fotoPath !== undefined) cambios.foto_path = fotoPath;

  const { error } = await GrafectoAuth.cliente.from(TABLA_CITAS).update(cambios).eq('id', id);
  if (error) throw error;
}

// ===== Fotos (Supabase Storage, bucket privado "fotos") =====

const BUCKET_FOTOS = 'fotos';

// Comprime la imagen en el navegador antes de subirla (máximo 1280px de lado,
// calidad 0.7) para no gastar espacio ni datos móviles.
function comprimirImagen(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      imagen.onload = () => {
        const maxLado = 1280;
        const escala = Math.min(1, maxLado / Math.max(imagen.width, imagen.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);
        canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

async function subirFotoVisita(citaId, archivo) {
  const sesion = await GrafectoAuth.obtenerSesion();
  const blob = await comprimirImagen(archivo);
  const ruta = `${sesion.user.id}/${citaId}-${Date.now()}.jpg`;

  const { error } = await GrafectoAuth.cliente.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, blob, { contentType: 'image/jpeg' });

  if (error) throw error;
  return ruta;
}

async function obtenerUrlFoto(ruta) {
  const { data, error } = await GrafectoAuth.cliente.storage
    .from(BUCKET_FOTOS)
    .createSignedUrl(ruta, 3600);

  if (error) throw error;
  return data.signedUrl;
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

// ===== Horario base y excepciones (disponibilidad) =====

const TABLA_HORARIO_SEMANAL = 'horario_semanal';
const TABLA_HORARIO_EXCEPCIONES = 'horario_excepciones';

function filaAHorarioDia(fila) {
  return {
    id: fila.id,
    diaSemana: fila.dia_semana,
    abierto: fila.abierto,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
  };
}

async function listarHorarioSemanal() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_SEMANAL)
    .select('*')
    .order('dia_semana', { ascending: true });

  if (error) throw error;
  return data.map(filaAHorarioDia);
}

// La primera vez, crea los 7 días (todos cerrados por defecto) para que
// siempre haya algo que editar, sin necesitar un insert manual por SQL.
async function asegurarHorarioPorDefecto() {
  const { count, error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_SEMANAL)
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if (count > 0) return;

  const filas = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
    dia_semana: dia,
    abierto: false,
    hora_inicio: '10:00',
    hora_fin: '18:00',
  }));

  const { error: errorInsertar } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_SEMANAL)
    .insert(filas);

  if (errorInsertar) throw errorInsertar;
}

async function actualizarDiaHorario(diaSemana, { abierto, horaInicio, horaFin }) {
  const { error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_SEMANAL)
    .update({ abierto, hora_inicio: horaInicio, hora_fin: horaFin })
    .eq('dia_semana', diaSemana);

  if (error) throw error;
}

function filaAExcepcion(fila) {
  return {
    id: fila.id,
    fecha: fila.fecha,
    abierto: fila.abierto,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
  };
}

async function listarExcepciones() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_EXCEPCIONES)
    .select('*')
    .gte('fecha', UI.fechaHoyISO())
    .order('fecha', { ascending: true });

  if (error) throw error;
  return data.map(filaAExcepcion);
}

async function agregarExcepcion(datos) {
  const { error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_EXCEPCIONES)
    .upsert(
      {
        fecha: datos.fecha,
        abierto: datos.abierto,
        hora_inicio: datos.abierto ? datos.horaInicio : null,
        hora_fin: datos.abierto ? datos.horaFin : null,
      },
      { onConflict: 'user_id,fecha' }
    );

  if (error) throw error;
}

async function eliminarExcepcion(id) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_HORARIO_EXCEPCIONES).delete().eq('id', id);
  if (error) throw error;
}

// Bloqueos manuales: una hora que la usuaria aparta sin que haya una cita
// (comida, algo personal, etc.) — cuenta como "ocupado" igual que una cita.
const TABLA_HORARIO_BLOQUEOS = 'horario_bloqueos';

function filaABloqueo(fila) {
  return {
    id: fila.id,
    fecha: fila.fecha,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
    motivo: fila.motivo || '',
  };
}

async function listarBloqueos() {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA_HORARIO_BLOQUEOS)
    .select('*')
    .gte('fecha', UI.fechaHoyISO())
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data.map(filaABloqueo);
}

async function agregarBloqueo(datos) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_HORARIO_BLOQUEOS).insert({
    fecha: datos.fecha,
    hora_inicio: datos.horaInicio,
    hora_fin: datos.horaFin,
    motivo: (datos.motivo || '').trim(),
  });

  if (error) throw error;
}

async function eliminarBloqueo(id) {
  const { error } = await GrafectoAuth.cliente.from(TABLA_HORARIO_BLOQUEOS).delete().eq('id', id);
  if (error) throw error;
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
    longitud: fila.longitud || '',
    estilista: fila.estilista || '',
    notas: fila.notas || '',
    fotoPath: fila.cita?.foto_path || null,
  };
}

const SELECT_VISITA_CON_TRATAMIENTO = '*, tratamiento:tratamientos(nombre), cita:citas(foto_path)';

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
      longitud: datos.longitud || null,
      estilista: datos.estilista || null,
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
  actualizarConsentimiento,
  listarCitas,
  agregarCita,
  actualizarCita,
  eliminarCita,
  actualizarEstadoCita,
  actualizarNotasVisita,
  subirFotoVisita,
  obtenerUrlFoto,
  listarTratamientos,
  asegurarTratamientosPorDefecto,
  listarHorarioSemanal,
  asegurarHorarioPorDefecto,
  actualizarDiaHorario,
  listarExcepciones,
  agregarExcepcion,
  eliminarExcepcion,
  listarBloqueos,
  agregarBloqueo,
  eliminarBloqueo,
  agregarVisita,
  listarVisitasDeClienta,
  listarVisitasEnRango,
  normalizarTexto,
};

})();
