# Pendientes — GRAFECTO

Lista viva de funciones futuras. Se construyen una por una, en este orden aproximado,
solo cuando se pida explícitamente. Marca `[x]` al completarse y agrega la fecha.

## Fase 1 — Base funcional (completa: 2026-08-17)

- [x] Estructura de archivos
- [x] Capa de datos IndexedDB (`js/db.js`)
- [x] Lista de clientas + buscador
- [x] Alta / edición / eliminación de clienta
- [x] PWA instalable (manifest + service worker)
- [x] Deploy en GitHub Pages: https://taniasofiacamacho-grafecto.github.io/grafecto/
- [x] Confirmado por la usuaria: persistencia probada cerrando/reabriendo Chrome en Samsung Android (2026-08-17)

## Decisión de arquitectura (2026-08-17)

Se cambió de "solo local en el dispositivo" a **Supabase** (base de datos en
la nube con login), para poder usar la app desde laptop, Samsung y iPad con
la misma información sincronizada. Esto reemplaza la regla original de
"los datos nunca salen del dispositivo" — ahora viven en la nube, protegidos
por usuario/contraseña y Row Level Security. Ver README.md para detalles.

**Pendiente relacionado:** hoy la app necesita internet para leer/guardar
clientas (no hay modo sin conexión con sincronización posterior). Si esto
se vuelve un problema real en el día a día, se puede agregar como función
futura (más compleja: requiere manejar conflictos entre lo local y lo remoto).

**Confirmado por la usuaria (2026-08-18):** sincronización probada entre
Samsung y laptop (misma clienta visible en ambos), y sesión persiste
correctamente tras cerrar/abrir sesión.

## Fase 2 en adelante (pendientes, sin construir todavía)

1. [x] Agenda de citas con generación de mensaje de recordatorio para WhatsApp (links `wa.me`) — 2026-08-18, confirmado por la usuaria
2. [x] Catálogo de tratamientos — solo 3 servicios, **sin precio fijo**, enlazados a citas — 2026-08-18, confirmado por la usuaria (agenda, selección de tratamiento y recordatorio de WhatsApp probados):
   - Hair Therapy (bloqueo ~3 horas)
   - Tratamiento de hidratación (bloqueo ~1.5 horas)
   - Retoque de crecimiento (bloqueo ~3 horas)

**Flujo de check-in del día (decidido 2026-08-18, se construye en este orden):**
1. [x] Estado de la cita con color: Agendada → Llegó → En proceso → Checkout (pastilla
   que avanza al tocarla), encabezado "Hoy" resaltado en la agenda, y la agenda ya
   solo muestra de hoy en adelante — 2026-08-18, confirmado por la usuaria
2. [x] Cobro / Bitácora de visita — **reordenado antes que el consentimiento, a
   petición de la usuaria (2026-08-18)**, por ser más prioritario para el negocio.
   Se abre al tocar "Checkout": precio cobrado (a mano, no se calcula solo),
   promoción aplicada (*Ninguna / Descuento / Producto gratis*, para poder contar
   cuántas visitas usaron cada una y descontar el costo de productos regalados a
   fin de mes — ver #12 y #13 abajo), longitud (pulgadas para Hair Therapy/Retoque,
   Corto-Mediano-Largo para hidratación, siempre con opción Otro), quién atendió
   (Alma/Betty/Isabel/Otra) y notas de técnica **con dictado por voz**. Queda
   guardado como "visita" ligada a la clienta y a la cita — 2026-08-18, pendiente
   de confirmar por la usuaria.
   - [ ] Foto "antes" en la visita — ver nueva sección de "Notas y foto durante
     la visita" más abajo (2026-08-19), necesita almacenamiento de archivos
3. [x] Historial de visitas en la ficha de la clienta (fecha, tratamiento, quién
   atendió, precio; toca cada registro para desplegar longitud/promoción/notas
   completas) — 2026-08-18, confirmado por la usuaria
4. [x] Consentimiento informado — **simplificado (2026-08-19):** la usuaria
   guarda el documento firmado en papel, no hace falta foto. Solo una casilla
   en la ficha de la clienta con la fecha en que se marcó como firmado; si pasa
   más de un año se muestra como **vencido** (la vigencia real es de 1 año) —
   confirmado por la usuaria

**Notas y foto durante la visita (2026-08-19, a petición de la usuaria):**
Antes solo se podían capturar notas/foto hasta el checkout, y para entonces ya
había atendido a varias clientas y se le olvidaba. Se necesita poder abrir una
ficha rápida desde que la cita está en "Llegó" o "En proceso" para anotar la
técnica (con dictado) y subir una foto desde la galería del celular, en el
momento — sin esperar al cobro. Botón "📝 Agregar notas" en cada tarjeta de
cita (visible desde "Llegó"), foto comprimida automáticamente antes de subirse
a Supabase Storage (bucket privado "fotos"). El cobro precarga esas notas para
no volver a escribirlas, y la foto se puede ver después en el historial de la
clienta (se toca el registro para desplegarla) — 2026-08-19, confirmado por
la usuaria

5. [x] Dictado por voz (Web Speech API) — 2026-08-18: módulo reutilizable
   (`js/dictado.js`), conectado por ahora a las notas de técnica del cobro;
   se puede conectar a cualquier otro campo de notas más adelante
6. [ ] Indicador de uso de almacenamiento del dispositivo
7. [ ] Exportar/respaldar datos (JSON descargable + importar) — **crítico, red de seguridad**
8. [x] Tres mensajes de WhatsApp por cita — 2026-08-18, confirmado por la usuaria:
   - **Confirmación** (al agendar): fecha/hora, dirección del salón, instrucciones de
     preparación (cabello limpio y seco, sin acondicionador, nota sobre tinte)
   - **Deep cleanse** (solo si la cita se agendó con más de 2 días de anticipación):
     recomendación de shampoo clarificante con links de Amazon
   - **Recordatorio** (un día antes): pide confirmar asistencia o reprogramar
9. [ ] Lista automática de recordatorios del día anterior (vista/aviso automático de
   a quién le falta enviar el recordatorio de mañana — hoy el botón existe pero se manda
   uno por uno, a mano)
10. [ ] Marcar cita como confirmada manualmente
11. Calendario visual de disponibilidad (semana/mes) — reemplaza la lista aparte
    en Notes que llevaba antes (~3 semanas con copy-paste manual). Se construye
    en partes:
    - [x] **Fechas habilitadas + bloqueos manuales** (2026-08-19, rehecho dos
      veces el mismo día tras aclarar el diseño): nueva pestaña "Horario". La
      usuaria **no tiene patrón semanal fijo** — cada semana es distinta (ej.
      esta semana lunes/miércoles/viernes, la siguiente lunes/miércoles/jueves).
      Por eso no hay "horario recurrente": ella habilita **fechas puntuales**
      con sus horas exactas (ej. Viernes 21: 10:00, 11:00 — Lunes 24: 9:00,
      10:00, 11:00…), normalmente 3-4 semanas adelante, agregando una fecha más
      conforme pasa el tiempo. Cada hora se agrega/quita al instante. Bloqueos
      manuales de una hora sin necesidad de cita (comida, personal, etc.) —
      pendiente de confirmar por la usuaria
    - [ ] Calendario visual de semana (ver de un vistazo qué está libre/ocupado)
    - [ ] Vista de mes
    - [x] **Botón "Compartir por WhatsApp"** (2026-08-19): arma el mensaje con
      las fechas habilitadas y sus horas (fecha en negritas, horas debajo) y
      abre WhatsApp para elegir a quién mandárselo — reemplaza el copy-paste
      manual que salía mal formateado. La clienta contesta y ella agenda a
      mano — **sin auto-reservación por ahora**, esa se evaluará aparte más
      adelante — pendiente de confirmar por la usuaria
12. [x] Resumen de ingresos diario y mensual — 2026-08-18: nueva pestaña **"Hoy"**
    con resumen de Hoy/Semana/Mes (monto y cantidad de servicios), y las citas
    del día en tarjetas con **fondo de color completo según su estado**
    (Agendada/Llegó/En proceso/Checkout, a petición de la usuaria) — pendiente
    de confirmar por la usuaria
13. [ ] Catálogo de gastos fijos mensuales + gráfica de fin de mes
14. [ ] Campo de método de pago (efectivo/tarjeta) + campo de fórmula con dictado por voz
15. [ ] Catálogo de hallazgos de tricoscopía ligado a recomendaciones de producto (links Amazon)
16. [ ] Lectura de QR de reportes del tricoscopio + resumen asistido por IA en lenguaje sencillo

## Ideas que surjan sobre la marcha

- [ ] Pestaña de **Finanzas** aparte (2026-08-18): más completa que el resumen
  chiquito de la pestaña Hoy — ligada a #13 (gastos fijos) y #14 (método de
  pago) para tener panorama completo de ingresos y egresos, no solo ingresos.

## Correcciones y ajustes de uso real

Cosas que se notan al usar la app de verdad (no son funciones nuevas del plan
original) — se corrigen en cuanto se detectan, no hay que esperar su turno.

- [x] 2026-08-18: Selector de clienta en el formulario de cita cambiado de lista
  desplegable a buscador con autocompletado (no escala a miles de clientas) —
  confirmado por la usuaria, además ya instaló la PWA en Samsung y Mac
- [x] 2026-08-18: Historial de visitas ahora es expandible — al tocar un
  registro se despliega longitud, promoción y notas (antes solo se veía
  fecha, tratamiento y precio)
- [x] 2026-08-18: Logo real de la marca aplicado (login y encabezado) usando
  el archivo oficial `Grafectologousocorrecto-02.png` — en blanco sobre el
  encabezado ciruela (con filtro CSS), a color en la pantalla de login.
  Subtítulo corregido a "Organic Hair Care" (el del logo real, no "Science"
  del brief original). **Pendiente:** el manual de marca real dice que los
  colores son Magenta/Lila suave/Gris claro/Rosa pálido/Blanco, no
  "ciruela/berenjena" — la usuaria decidió dejar ciruela por ahora y revisar
  la paleta completa en una pasada de diseño dedicada más adelante.
- [x] 2026-08-19: Formato del mensaje de disponibilidad corregido a una hora
  por renglón (antes iban separadas por comas en una sola línea). Se probó
  cambiar de "abrir WhatsApp directo" a "copiar mensaje" porque el enlace sin
  número específico lo manda marcado como reenviado, pero la usuaria pidió
  regresarlo a abrir WhatsApp directo pese a esa limitación
- [x] 2026-08-19: Las horas habilitadas ahora se cruzan con las citas ya
  agendadas — en cuanto una hora tiene cita, desaparece sola de "Fechas
  habilitadas" y del mensaje de disponibilidad (antes eran dos listas
  independientes)
- [x] 2026-08-19: Corregido de raíz por qué las actualizaciones no llegaban
  solas al celular/laptop (`updateViaCache: 'none'` + revisión automática al
  volver a la app) — antes había que desinstalar y reinstalar la PWA cada vez
- [x] 2026-08-19: Badge de consentimiento informado agregado directo en cada
  tarjeta de cita (Hoy y Agenda), junto al nombre de la clienta — verde si
  está firmado y vigente, en aviso si falta o venció, y se puede marcar como
  firmado ahí mismo sin abrir la ficha completa de la clienta
- [x] 2026-08-19: Nueva pestaña **"Reportes"** (5ª pestaña). Primer contenido:
  botón **"+ Registrar venta pasada"**, para capturar ventas de días
  anteriores sin necesidad de una cita — la Agenda solo muestra citas de hoy
  en adelante, así que una cita con fecha pasada desaparecía sola y nunca se
  podía cobrar. El formulario reutiliza los mismos campos del Cobro (clienta,
  tratamiento, precio, longitud, promoción, estilista, notas) pero con fecha
  libre y sin ligar a una cita. También se agregó poder **eliminar un
  registro de visita** desde el historial de la clienta (se necesitaba para
  borrar dos capturas de prueba) — confirmado por la usuaria, ambas funciones
  probadas.
- [x] 2026-08-19: Dentro de Reportes, resumen de ventas **Hoy / Semana / Mes**
  (monto y cantidad de servicios) y una gráfica de barras sencilla con las
  ventas de cada día de la semana actual (lunes a domingo), resaltando el día
  de hoy. Se actualiza sola al registrar una venta pasada, sin salir de la
  pestaña — confirmado por la usuaria.
- [x] 2026-08-19: **Servicios por estilista** dentro de Reportes: nombre de
  cada estilista y cuántos servicios hizo, con pastillas para alternar entre
  Hoy / Semana / Mes (mismos periodos que las tarjetas de arriba — el mes
  siempre va del día 1 al último día del mes calendario). Las visitas sin
  estilista capturado se agrupan bajo "(sin especificar)" — pendiente de
  confirmar por la usuaria.
