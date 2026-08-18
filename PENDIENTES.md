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
2. [x] Catálogo de tratamientos — solo 3 servicios, **sin precio fijo**, enlazados a citas — 2026-08-18:
   - Hair Therapy (bloqueo ~3 horas)
   - Tratamiento de hidratación (bloqueo ~1.5 horas)
   - Retoque de crecimiento (bloqueo ~3 horas)

**Flujo de check-in del día (decidido 2026-08-18, se construye en este orden):**
1. [ ] Estado de la cita con color: Agendada → Llegó → En proceso → Checkout, más una
   sección "Hoy" arriba de la agenda para ver solo las citas del día (sirve igual en
   laptop que en celular, misma página)
2. [ ] Consentimiento informado por clienta (Firmado/Pendiente + foto del documento
   firmado) — aparece como recordatorio al marcar "Llegó"
3. [ ] Cobro / Bitácora de visita, se abre al tocar "Checkout": notas de técnica, foto
   "antes", y captura de precio + promoción:
   - **Precio cobrado**: lo escribe ella a mano (varía por largo/densidad, no se calcula solo)
   - **Promoción aplicada**: selector simple — *Ninguna / Descuento / Producto gratis* (categoría,
     no monto automático) — para poder contar cuántas visitas usaron cada una y, a fin de mes,
     descontar el costo de los productos regalados (ver #11 y #12 abajo)

4. [ ] Dictado por voz para notas clínicas (Web Speech API)
5. [ ] Indicador de uso de almacenamiento del dispositivo
6. [ ] Exportar/respaldar datos (JSON descargable + importar) — **crítico, red de seguridad**
7. [ ] Plantilla de mensaje de confirmación con instrucciones de preparación del cabello
8. [ ] Lista automática de recordatorios del día anterior
9. [ ] Marcar cita como confirmada manualmente
10. [ ] Calendario visual de disponibilidad (semana/mes)
11. [ ] Resumen de ingresos diario y mensual
12. [ ] Catálogo de gastos fijos mensuales + gráfica de fin de mes
13. [ ] Campo de método de pago (efectivo/tarjeta) + campo de fórmula con dictado por voz
14. [ ] Catálogo de hallazgos de tricoscopía ligado a recomendaciones de producto (links Amazon)
15. [ ] Lectura de QR de reportes del tricoscopio + resumen asistido por IA en lenguaje sencillo

## Ideas que surjan sobre la marcha

_(se agregan aquí según aparezcan, sin interrumpir lo que se esté construyendo)_
