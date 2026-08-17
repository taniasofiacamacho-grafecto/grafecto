# GRAFECTO — Organic Hair Science

App de gestión de clientas para tratamientos capilares. Es una app web estática:
sin backend, sin cuentas, sin servidor. Todos los datos se guardan **solo en tu
dispositivo**, dentro del navegador, usando IndexedDB.

## Qué hace cada archivo

```
index.html              Página única de la app (toda la interfaz vive aquí).
manifest.json           Metadata de la PWA: nombre, iconos, colores, para instalarla.
service-worker.js       Guarda copia de los archivos de la app para que funcione sin internet.
PENDIENTES.md           Lista viva de funciones por construir.

css/variables.css       Paleta de marca GRAFECTO (ciruela, magenta, grises) como variables.
css/base.css            Reset y estructura base, pensada para celular.
css/componentes.css     Botones, tarjetas de clienta, buscador, formulario, hoja modal.

js/db.js                Toda la comunicación con IndexedDB (guardar/leer/editar/borrar clientas).
js/ui.js                Funciones pequeñas para crear elementos de pantalla desde JavaScript.
js/clientas.js          Lógica de la lista de clientas: buscador, alta, edición, eliminar.
js/app.js               Arranca la app y registra el service worker.

icons/                  Iconos de la app (por ahora son un marcador de posición —
                         se pueden reemplazar por el logo real cuando lo tengas listo).
```

No hay build step: es HTML/CSS/JS que cualquier navegador entiende directamente.

## Cómo probarla en tu computadora

Los navegadores no permiten que IndexedDB funcione bien si abres el archivo
`index.html` directamente con doble clic (protocolo `file://`). Hay que servirla
con un mini servidor local. Si tienes Python instalado (Mac lo trae de fábrica):

```bash
cd grafecto
python3 -m http.server 8000
```

Y abres `http://localhost:8000` en el navegador.

## Cómo comprobar que los datos sí persisten

1. Agrega una clienta de prueba (nombre y teléfono).
2. Cierra por completo la pestaña o la app (no solo minimizar).
3. Vuelve a abrir `http://localhost:8000` (o la app instalada).
4. La clienta debe seguir ahí.

Esto confirma que los datos quedan guardados en IndexedDB del dispositivo, no
en memoria temporal — el problema que teníamos antes con los artifacts de Claude.

## Próximos pasos

Cuando esta base esté confirmada y funcionando en tu iPhone, se sube a GitHub
y se deja instalada como PWA. Los pasos exactos se documentarán en este README
en cuanto lleguemos a esa parte.
