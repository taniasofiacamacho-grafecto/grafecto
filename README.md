# GRAFECTO — Organic Hair Science

App de gestión de clientas para tratamientos capilares. Es una app web (PWA)
sin build step: HTML/CSS/JS que cualquier navegador entiende directamente.

**Publicada en:** https://taniasofiacamacho-grafecto.github.io/grafecto/

## Cómo se guardan los datos

Los datos viven en una base de datos en la nube ([Supabase](https://supabase.com)),
protegidos con tu usuario y contraseña. Así se sincronizan entre tu laptop, tu
Samsung y tu iPad — todos ven la misma información, actualizada.

La seguridad no depende de mantener nada en secreto en el código: la llave que
aparece en `js/config.js` es pública a propósito (es como la dirección de la
casa, no la llave de la puerta). El acceso real está protegido por **Row Level
Security** en la base de datos — solo tu usuario autenticado puede leer o
escribir sus propias filas. Nunca compartas la llave "service_role" de
Supabase (esa sí es la llave maestra) — no se usa en este proyecto.

## Qué hace cada archivo

```
index.html              Página única de la app: pantalla de login + pantalla principal.
manifest.json           Metadata de la PWA: nombre, iconos, colores, para instalarla.
service-worker.js       Cachea los archivos de la app (no los datos) para abrir sin internet.
PENDIENTES.md           Lista viva de funciones por construir.

css/variables.css       Paleta de marca GRAFECTO (ciruela, magenta, grises) como variables.
css/base.css            Reset y estructura base, pensada para celular.
css/componentes.css     Botones, tarjetas, buscador, formulario, hoja modal, pantalla de login.

lib/supabase.js         Librería de Supabase, copiada localmente (sin depender de un CDN).
js/config.js            URL y llave pública del proyecto de Supabase.
js/auth.js              Iniciar/cerrar sesión, y detectar si hay sesión activa.
js/db.js                Toda la comunicación con la base de datos (guardar/leer/editar/borrar clientas).
js/ui.js                Funciones pequeñas para crear elementos de pantalla desde JavaScript.
js/clientas.js          Lógica de la lista de clientas: buscador, alta, edición, eliminar.
js/app.js               Decide si mostrar login o la app, y arranca todo.

icons/                  Iconos de la app (marcador de posición — se puede reemplazar por el logo real).
```

## Cómo probarla en tu computadora

Los navegadores bloquean varias cosas (login, IndexedDB) si abres `index.html`
directamente con doble clic. Hay que servirla con un mini servidor local:

```bash
cd grafecto
python3 -m http.server 8000
```

Y abres `http://localhost:8000` en el navegador.

## Cómo comprobar que los datos sí persisten y se sincronizan

1. Inicia sesión y agrega una clienta de prueba desde un dispositivo.
2. Ciérralo por completo (no solo minimizar) o cierra sesión y vuelve a entrar.
3. La clienta debe seguir ahí.
4. Ábrelo desde **otro** dispositivo, inicia sesión con el mismo usuario — la
   misma clienta debe aparecer ahí también.

## Notas técnicas

- Requiere conexión a internet para leer/guardar clientas (los datos viven en
  la nube). El "cascarón" de la app (diseño, botones) sí abre sin internet
  gracias al service worker, pero mostrará la pantalla de login hasta que
  haya señal para poder validar la sesión.
- Panel de administración de la base de datos: https://supabase.com/dashboard
  (ahí puedes ver/editar clientas directamente si algún día lo necesitas, o
  crear más usuarios si en el futuro trabaja alguien más contigo).
