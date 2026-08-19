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
   - [ ] Foto "antes" en la visita (queda para cuando construyamos fotos, junto
     con el consentimiento informado — necesitan almacenamiento de archivos)
3. [x] Historial de visitas en la ficha de la clienta (fecha, tratamiento, quién
   atendió, precio) — 2026-08-18, pendiente de confirmar por la usuaria
4. [ ] Consentimiento informado por clienta (Firmado/Pendiente + foto del documento
   firmado) — aparece como recordatorio al marcar "Llegó"

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
11. [ ] Calendario visual de disponibilidad (semana/mes)
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
