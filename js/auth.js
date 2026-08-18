// Autenticación: inicio/cierre de sesión con Supabase.
// El cliente de Supabase guarda la sesión sola en localStorage, así que
// una vez que inicias sesión no te la vuelve a pedir hasta que cierres sesión.

(function () {
  const cliente = supabase.createClient(
    window.GRAFECTO_CONFIG.supabaseUrl,
    window.GRAFECTO_CONFIG.supabaseKey
  );

  async function obtenerSesion() {
    const { data } = await cliente.auth.getSession();
    return data.session;
  }

  async function iniciarSesion(correo, contrasena) {
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) throw error;
    return data.session;
  }

  async function cerrarSesion() {
    await cliente.auth.signOut();
  }

  function alCambiarSesion(callback) {
    cliente.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  }

  window.GrafectoAuth = {
    cliente,
    obtenerSesion,
    iniciarSesion,
    cerrarSesion,
    alCambiarSesion,
  };
})();
