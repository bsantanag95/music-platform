## Why

La plataforma no tiene ninguna superficie de aviso: quien abre un tema en la página de un artista no se entera de
las respuestas hasta volver a la página (ADR 0030 lo marca como el principal motivo para priorizarlas), un perfil
privado solo ve sus solicitudes en el badge del menú, nadie sabe que alguien empezó a seguirle (el feed omite a
propósito ese caso, `activity-feed.md`) y quien es moderado no recibe el motivo en ningún lado. Con respuestas,
seguimientos y moderación ya en producción, falta la bandeja que los cierre.

Esta es la **Fase 1** de tres (núcleo in-app). Las Fases 2 (hitos de likes, listas y Caminos, lanzamientos de
artistas seguidos) y 3 (email y Web Push) son cambios posteriores que se apoyan en la tabla y el servicio de este.

## What Changes

- **Campana en el Header** (zona de usuario, entre "Añadir" y el menú de usuario). En escritorio abre un panel con
  las últimas notificaciones agrupadas y un enlace "Ver todas"; por debajo de `lg` la campana queda en la fila
  superior junto al botón del panel y lleva directo a la página. Contador numérico con tope "9+".
- **Página `/me/notifications`**: lista paginada y agrupada, "Marcar todas como leídas" y acceso a los ajustes.
- **Tipos de la Fase 1** (todos dirigidos al usuario):
  - Respuesta a tu tema (raíz de comentario de artista), agrupada por hilo.
  - Respuesta en un hilo donde participaste (activada por defecto), agrupada por hilo.
  - Nuevo seguidor (perfil público), agrupado por día.
  - Solicitud de seguimiento (perfil privado), con Aprobar / Rechazar en la misma fila.
  - Tu solicitud fue aceptada.
  - Moderación: tu comentario, reseña o lista fue ocultado o restaurado (con el motivo) y tu suspensión social fue
    aplicada o levantada.
- **Invasividad mínima**: solo in-app; sin email, push, toasts, sonido ni contador en el título de la pestaña. El
  contador vuelve a cero al abrir la campana; cada notificación sigue sin leer hasta abrirla.
- **Preferencias** en una pantalla nueva **Notificaciones** del área de ajustes (`/me/settings/notifications`): un
  interruptor por tipo desactivable. Solicitudes de seguimiento y moderación no se pueden desactivar.
- **Tabla `notification`** (migración `0075`) más `notification_preference` y `app_user.notifications_seen_at`, un
  servicio único de emisión llamado dentro de la misma transacción que la acción y filtros de lectura (bloqueos,
  cuentas desactivadas, contenido moderado).
- El indicador de solicitudes pendientes **sale del menú de usuario** (la campana lo cubre; contar lo mismo en dos
  lugares es ruido). Se conserva en la pantalla Red del área de ajustes.
- **BREAKING (spec)**: se retira el requisito "Sin notificaciones en esta etapa" de `comment-replies`.

## Goals / Non-Goals

**Goals:**

- Que quien recibe una respuesta, un seguidor, una solicitud o una acción de moderación se entere sin volver a
  buscarlo, en una sola bandeja, sin presión ni gamificación.
- Que la bandeja respete las mismas reglas que el resto de las superficies sociales (bloqueos, cuentas
  desactivadas, moderación, borrado físico).
- Dejar la tabla, el servicio y la UI listos para que las Fases 2 y 3 solo agreguen tipos y canales.

**Non-Goals:**

- Likes de comentarios (hitos sin nombres 10 · 25 · 50 · 100 · 500 · 1000…), guardados de listas y Caminos, lista
  destacada, lanzamientos de artistas seguidos (álbum y EP; sencillos como ajuste) y la pestaña "Novedades": Fase 2.
- Email (resumen) y Web Push: Fase 3.
- Respuestas o likes en reseñas, menciones `@usuario`: no existen hoy; requieren su propio cambio.
- Tiempo real (websockets / SSE): se usa consulta periódica.
- Avisos de seguridad de la cuenta (inicio de sesión, cambio de email): siguen por email, donde ya están.

## Capabilities

### New Capabilities

- `notifications`: bandeja de notificaciones del usuario — tipos de la Fase 1, quién recibe cada uno, agrupación,
  contador y estado de visto / leído, retracción, filtros de privacidad, campana del Header, página
  `/me/notifications`, preferencias por tipo, retención y API `/api/me/notifications*`.

### Modified Capabilities

- `cross-view-navigation`: el Header incorpora la campana en la zona de usuario (escritorio y fila superior móvil)
  y el menú de usuario deja de mostrar el indicador de solicitudes pendientes.
- `comment-replies`: se retira "Sin notificaciones en esta etapa"; responder ahora notifica (definido en
  `notifications`).
- `owner-settings`: el área de ajustes suma la pantalla **Notificaciones** (`/me/settings/notifications`).
- `account-lifecycle`: la exportación de datos incluye las preferencias de notificación (no las notificaciones, que
  contienen datos de otras personas).

## Impact

- **Base de datos**: `drizzle/0075_notifications.sql` (tablas `notification`, `notification_preference`, columna
  `app_user.notifications_seen_at`, `CHECK` por tipo y referencia, índices), espejo en `src/db/schema.ts`,
  `docs/03-data/sql-model.md`.
- **Servicios**: nuevo `src/services/notifications/` (emisión, lectura, preferencias); llamadas de emisión en
  `src/services/social.ts` (`createReply`), `src/services/social/following.ts` (`followUser`, `approveRequest`) y
  `src/services/moderation.ts` (ocultar / restaurar, suspender / revocar); `src/services/profiles/data-export.ts`.
- **API**: `GET /api/me/notifications`, `GET /api/me/notifications/count`, `POST /api/me/notifications/read`,
  `PUT /api/me/notifications/seen`, `GET|PUT /api/me/notification-preferences` → `docs/04-api/contracts.md` y
  `errors.md`.
- **UI**: `src/components/notifications/` (campana, panel, fila, página), `Header.tsx`, `UserMenu.tsx`,
  `user-menu-items.ts`, `src/app/[locale]/layout.tsx` (conteo inicial), `src/app/[locale]/me/notifications/`,
  `src/app/[locale]/me/settings/notifications/`, mensajes `es` / `en`.
- **Docs**: ADR nuevo `0045` (notificaciones in-app materializadas), `docs/05-features/notifications.md`,
  `business-rules.md`, `domain-model.md`, cerrar los pendientes del ADR 0030 (sin reescribirlo: la nota va en el ADR
  nuevo) y de `activity-feed.md`.
- **Smoke test** nuevo `scripts/smoke-test-notifications.ts` (usuarios `smoke_notif_*`) + su entrada en `AGENTS.md`.
- Sin dependencias nuevas.
