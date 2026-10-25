## Why

La Fase 1 (`add-notifications-core`) dejó la bandeja con lo que una persona le hace directamente a otra:
respuestas, seguimientos y moderación. Faltan las dos señales que el plan de notificaciones dejó para esta fase:
saber que un comentario propio está resonando (los likes son anónimos y hoy solo se ven al volver a la página) y
enterarse de que un artista seguido sacó o anunció un disco, que es para lo que existe "seguir artista"
(`content-hierarchy.md` lo difería: "notificaciones de lanzamiento, fuera de alcance; el esquema las deja
preparadas").

Es la **Fase 2** de tres. La Fase 3 (resumen por email y Web Push) sigue fuera.

## What Changes

- **Hitos de likes de un comentario propio**, sin nombres: 10, 25, 50, 100, 500, 1000 y luego 2500, 5000, 10000 y
  cada 10000. Un aviso por hito, nunca uno por like; si un comentario salta varios hitos de golpe, solo se avisa el
  más alto. Activado por defecto.
- **Hitos de guardados de una lista o un Camino propio**, sin nombres: 1, 5, 10, 25, 50, 100, 500, 1000… (la
  primera persona que guarda una lista ya es una señal). Desactivado por defecto.
- **Lanzamientos de artistas seguidos** (álbum y EP), desde el calendario de lanzamientos que ya se sincroniza a
  diario desde ListenBrainz (ADR 0029): "Salió *Título*, el nuevo álbum de *Artista*". Activado por defecto.
- **Discos anunciados** de artistas seguidos (fecha futura en el calendario): desactivado por defecto.
- **Sencillos** de artistas seguidos: un ajuste propio, desactivado por defecto. El riel de Inicio sigue sin
  sencillos.
- **Pestaña "Novedades"** en el panel de la campana y en `/me/notifications`, separada de "Para ti". Los lanzamientos
  van ahí y **no suman al contador** de la campana (el contador sigue contando solo lo dirigido a la persona): la
  pestaña lleva un punto cuando hay novedades sin ver.
- **Preferencias con valor por defecto por tipo** (algunos tipos nacen desactivados) y una sección "Novedades" en
  Ajustes → Notificaciones.
- Migración `0076`: columnas `milestone`, `list_id` y `release_group_id` en `notification`, `CHECK` y únicos
  rehechos para los tipos nuevos, tipos desactivables nuevos y `app_user.notifications_releases_seen_at`.
- **Descartado**: "tu lista fue destacada en Explorar". Solo se pueden destacar listas oficiales de la cuenta
  curadora `@exploracion` (`featureList`), así que no hay ninguna persona a quien avisarle.

## Goals / Non-Goals

**Goals:**

- Avisar que algo propio resuena sin convertirlo en métrica de vanidad: sin nombres, por hitos espaciados y nunca
  por cada interacción.
- Que seguir a un artista sirva para enterarse de sus discos nuevos, sin depender de visitar su página.
- Mantener la campana como bandeja de lo dirigido a la persona: las novedades no la llenan.

**Non-Goals:**

- Email y Web Push (Fase 3).
- Hitos de likes de reseñas o de valoraciones (no existen likes de reseña).
- Avisar de premios de artistas seguidos (Fase 3, junto con los canales que harían falta para avisar en lote).
- Lanzamientos fuera de la ventana del calendario (más de 90 días hacia adelante) o de artistas que ListenBrainz no
  publica en "Fresh Releases": esta fase usa solo esa fuente.
- Tiempo real: los lanzamientos llegan con la sincronización diaria del calendario.

## Capabilities

### New Capabilities

<!-- Ninguna: todo extiende `notifications`. -->

### Modified Capabilities

- `notifications`: tipos nuevos (hitos de likes, hitos de guardados, lanzamiento, anunciado, sencillo), reglas
  comunes de emisión con avisos sin actor, filtros de lectura para listas y discos, agrupación de hitos,
  contador que excluye las novedades, pestañas "Para ti" / "Novedades" en el panel y la página, preferencias con
  valores por defecto por tipo y la API con la pestaña.
- `home-release-calendar`: la sincronización avisa de los lanzamientos y anuncios de artistas seguidos, vincula
  primero los discos de artistas seguidos y, solo para quienes activaron sencillos, verifica y vincula también los
  sencillos de esos artistas sin que entren al riel.

## Impact

- **Base de datos**: `drizzle/0076_notification_milestones_and_releases.sql`, espejo en `src/db/schema.ts`,
  `docs/03-data/sql-model.md`.
- **Servicios**: `src/services/notifications/` (emisión de hitos y fan-out de lanzamientos, lectura por pestaña,
  preferencias con defectos), `src/services/social/comment-likes.ts` (`likeComment`),
  `src/services/lists/saved-lists.ts` (`saveList`, `setListTracking`), `src/services/home/release-calendar-sync.ts`
  y `release-calendar.ts` (sencillos solo para avisar).
- **API**: `GET /api/me/notifications?tab=`, `GET /api/me/notifications/count` (indicador de novedades),
  `PUT /api/me/notifications/seen?tab=`, `GET|PUT /api/me/notification-preferences` con las claves nuevas →
  `docs/04-api/contracts.md`.
- **UI**: pestañas en `NotificationPanel` y `NotificationsView`, filas de hito y de lanzamiento (carátula 250 px por
  `cover-art.ts`), `NotificationPreferencesForm`, mensajes `es` / `en`.
- **Docs**: ADR nuevo `0046` (lanzamientos desde el calendario, avisos sin actor), `docs/05-features/notifications.md`,
  `business-rules.md`, `domain-model.md`, `docs/05-features/home.md` (calendario), `content-hierarchy.md` (cierra el
  pendiente de "seguir artista").
- **Smoke**: `scripts/smoke-test-notifications.ts` (hitos, guardados, pestañas, defectos) y
  `scripts/smoke-test-release-calendar.ts` (avisos de lanzamientos con ListenBrainz simulado) + `AGENTS.md`.
- Sin dependencias nuevas.
