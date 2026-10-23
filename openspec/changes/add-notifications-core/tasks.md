## 1. Esquema

- [x] 1.1 Crear `drizzle/0075_notifications.sql`: `notification` (FK con `ON DELETE CASCADE` a `app_user` ×2, `comment`, `user_follow`, `moderation_action`; `CHECK` de `kind`, de coherencia tipo ↔ referencia, `actor_id` obligatorio salvo `moderation`, `actor_id <> recipient_id`), índices `(recipient_id, created_at DESC)`, parcial de no leídas y únicos parciales por `comment_id` / `follow_id`; `notification_preference` con `CHECK` de tipos desactivables; `app_user.notifications_seen_at`
- [x] 1.2 Espejo en `src/db/schema.ts` con tipos `NotificationRow` / `NotificationPreferenceRow` y constantes de tipos (`NOTIFICATION_KINDS`, `OPTIONAL_NOTIFICATION_KINDS`)
- [x] 1.3 Aplicar la migración en la BD de scratch y documentar las tablas en `docs/03-data/sql-model.md`

## 2. Servicio de emisión

- [x] 2.1 `src/services/notifications/emit.ts`: `emitNotifications(tx, events)` con las reglas de D3 (sin autoaviso, sin bloqueo, preferencias, `ON CONFLICT DO NOTHING`) y pruebas unitarias de cada regla
- [x] 2.2 `createReply`: pasar a transacción y emitir `comment_reply` (autor de la raíz) y `thread_reply` (participantes previos, sin raíz ni actor); pruebas de destinatarios y de la prioridad raíz > participante
- [x] 2.3 `followUser`: emitir `new_follower` o `follow_request` según el estado resultante, sin aviso extra al consolidar un mutuo; pruebas
- [x] 2.4 `approveRequest`: transacción que acepta, emite `follow_accepted` y borra la `follow_request` del dueño; pruebas
- [x] 2.5 Moderación: emitir `moderation` en ocultar / restaurar comentario, reseña y lista (pasar `hideList` / `restoreList` a transacción) y en suspender / revocar (resolver el destinatario desde `user_restriction`); pruebas
- [x] 2.6 Pruebas de retracción por cascada: dejar de seguir, quitar seguidor, rechazar, cancelar, bloquear y borrar la respuesta

## 3. Lectura y preferencias

- [x] 3.1 `src/services/notifications/read.ts`: `countUnseen`, `listNotificationGroups(cursor, tz)` con filtros de D4 (actor desactivado, bloqueo, respuesta o raíz oculta; `moderation` exenta) y agrupación de D5 (hilo, seguidores por día local, resto sin agrupar, hasta dos nombres + cifra)
- [x] 3.2 `markSeen`, `markRead(groupKeys | all)` acotados al destinatario, y la poda de D10 (leídas > 90 días, todas > 180)
- [x] 3.3 `src/services/notifications/preferences.ts`: lectura con defectos y escritura que rechaza tipos fijos con `VALIDATION_ERROR`
- [x] 3.4 Pruebas unitarias de filtros, agrupación, cursor, visto / leído y preferencias

## 4. API

- [x] 4.1 `GET /api/me/notifications`, `GET /api/me/notifications/count`, `PUT /api/me/notifications/seen`, `POST /api/me/notifications/read` con `withErrorHandling`, `AUTH_REQUIRED` y Zod; poda en `after()` desde el `GET` del listado
- [x] 4.2 `GET|PUT /api/me/notification-preferences`
- [x] 4.3 Schemas Zod de respuesta en `src/lib/api/schemas.ts` y pruebas de rutas (sin sesión, ajenas, tipo fijo)
- [x] 4.4 Documentar los endpoints en `docs/04-api/contracts.md` (y `errors.md` si cambia algún código)

## 5. Header y campana

- [x] 5.1 `src/components/notifications/NotificationBell.tsx`: contador "9+", etiqueta accesible, TanStack Query sobre `/count` cada 60 s sin refetch en segundo plano; en `lg`+ abre el panel, por debajo es enlace a `/me/notifications`
- [x] 5.2 `NotificationPanel` y `NotificationRow` (avatar o icono de moderación, texto con objeto enlazado, fecha relativa, punto de no leída, Aprobar / Rechazar en `follow_request`); `PUT /seen` al abrir, `Escape` y navegación cierran
- [x] 5.3 Integrar en `Header.tsx` (escritorio entre "Añadir" y el menú; fila superior móvil junto al botón del panel) y pasar el conteo inicial desde `src/app/[locale]/layout.tsx`
- [x] 5.4 Quitar el badge de solicitudes del menú de usuario y del panel móvil (`user-menu-items.ts`, `UserMenu.tsx`), conservándolo en la pantalla Red
- [x] 5.5 Pruebas de componentes (contador y tope, apertura y cierre, teclado, móvil como enlace, acciones de solicitud) y actualización de `Header.test.tsx` / `user-menu-items.test.ts`

## 6. Página y ajustes

- [x] 6.1 `src/app/[locale]/me/notifications/page.tsx`: carga inicial en Server Component, "Cargar más", "Marcar todas como leídas", estado vacío, enlace a ajustes, sin sesión → inicio de sesión
- [x] 6.2 Pantalla `src/app/[locale]/me/settings/notifications/page.tsx` en el menú lateral del área de ajustes, con interruptores por tipo y explicación de los fijos
- [x] 6.3 Incluir las preferencias de notificación en `src/services/profiles/data-export.ts` (sin notificaciones) y su prueba
- [x] 6.4 Mensajes `es` / `en` (plurales ICU para agrupaciones y contador) y pruebas de página

## 7. Documentación

- [x] 7.1 ADR `docs/02-architecture/adr/0045-notificaciones-in-app-materializadas.md` (D1, D3, D7; cierra el pendiente del ADR 0030 sin reescribirlo) y su entrada en `docs/README.md`
- [x] 7.2 `docs/05-features/notifications.md` (tipos, invasividad, Fases 2 y 3 con las decisiones ya tomadas) y su índice en `05-features/README.md`
- [x] 7.3 Reglas de notificación en `docs/01-domain/business-rules.md`, entidad en `docs/01-domain/domain-model.md` y cierre del pendiente "Ana te empezó a seguir" en `docs/05-features/activity-feed.md`

## 8. Verificación

- [x] 8.1 `scripts/smoke-test-notifications.ts` (usuarios `smoke_notif_*`, borrados al terminar también si falla, con `assert-smoke-allowed`): cada fuente contra Postgres real, `CHECK` de la migración, cascadas, filtros, agrupación por día con `tz`, preferencias y contador bajo 10 ms; entrada en `AGENTS.md` con su limpieza
- [x] 8.2 Correr el smoke en la BD de scratch
- [x] 8.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 8.4 Verificar en el navegador (escritorio y 375 px): campana, panel, página, aprobar desde la bandeja, ajustes
