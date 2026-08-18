// Capa de datos — todo el acceso a la base de datos vive en este archivo.
// Usa Supabase (Postgres en la nube) para que los datos se sincronicen entre
// todos tus dispositivos. El acceso está protegido por Row Level Security:
// cada quien solo puede ver/editar sus propias filas (ver auth.js).
// Todo envuelto en un IIFE para no ensuciar el scope global.

(function () {

const TABLA = 'clientas';

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
    .from(TABLA)
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data.map(filaAClienta);
}

async function obtenerClienta(id) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return filaAClienta(data);
}

async function agregarClienta(datos) {
  const { data, error } = await GrafectoAuth.cliente
    .from(TABLA)
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
    .from(TABLA)
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
  const { error } = await GrafectoAuth.cliente.from(TABLA).delete().eq('id', id);
  if (error) throw error;
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
