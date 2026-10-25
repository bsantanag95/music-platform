## 1. Esquema

- [x] 1.1 Crear `drizzle/0076_notification_milestones_and_releases.sql`: columnas `milestone`, `list_id` (FK `user_list` `ON DELETE CASCADE`) y `release_group_id` (FK `release_group` `ON DELETE CASCADE`); rehacer `chk_notification_kind`, `chk_notification_actor` y `chk_notification_target` con los cinco tipos nuevos (`milestone` obligatorio solo en los hitos, `milestone > 0`); reemplazar `uq_notification_recipient_comment_kind` por `(recipient_id, comment_id, kind, coalesce(milestone, 0))`; únicos parciales por `list_id` + `milestone` y por `release_group_id` + `kind`; ampliar `chk_notification_preference_kind`; `app_user.notifications_releases_seen_at`
- [x] 1.2 Espejo en `src/db/schema.ts` (tipos nuevos, `OPTIONAL_NOTIFICATION_KINDS` como mapa tipo → defecto, `NOTIFICATION_TABS`)
- [x] 1.3 Aplicar en la BD de scratch y documentar en `docs/03-data/sql-model.md`

## 2. Hitos

- [x] 2.1 `src/services/notifications/milestones.ts`: escalas de likes y de guardados y `highestMilestone(scale, count)`, con pruebas (bordes, saltos, después de 10000 / 1000)
- [x] 2.2 Preferencias con defecto por tipo (D5) en `emit.ts` y `preferences.ts`, con pruebas: ausencia de fila = defecto del tipo, guardar solo lo que difiere, filas de la Fase 1 sin cambio de significado
- [x] 2.3 `emitMilestoneNotification(tx, …)` en el emisor: sin actor, solo si no hay ya ese hito o uno mayor para el objeto, `ON CONFLICT DO NOTHING`; pruebas
- [x] 2.4 `likeComment`: transacción, emitir solo con fila nueva y con el conteo de `countLikes`; pruebas (décimo like, 11, unlike y relike, salto a 30, comentario propio imposible)
- [x] 2.5 `saveList` y `setListTracking`: transacción, emitir solo con guardado nuevo, conteo de personas distintas activas; pruebas (primer guardado, cambiar `following` / `tracking` no cuenta, Camino)

## 3. Lanzamientos

- [x] 3.1 `emitArtistReleaseNotifications(tx, entries, today)` en el emisor: `INSERT … SELECT` desde `credit` (primary) + `artist_follow` + cuentas activas + preferencia con defecto en SQL; `artist_release` (últimos 14 días), `artist_release_announced` (futuro), `artist_single`; deduplicado por persona y disco; pruebas
- [x] 3.2 `release-calendar-sync.ts`: vincular primero los discos de artistas seguidos (D6), llamar al emisor después del reemplazo de la ventana en una transacción propia y registrar sin relanzar un fallo; pruebas
- [x] 3.3 Sencillos: tomar del feed los `Single` de artistas seguidos por alguien con `artist_single` activado, verificarlos y vincularlos dentro del tope sin guardarlos en `release_calendar_entry` ni dejarlos en el riel; pruebas de que el riel no cambia

## 4. Lectura y API

- [x] 4.1 `read.ts`: `tab` en `listNotificationGroups`, filtros de D7 (comentario o raíz oculta, lista oculta, disco fuera de la discografía), hito más alto por grupo, `target` de comentario / lista / disco con la carátula por `cover-art.ts`; pruebas
- [x] 4.2 `countUnseen` solo "Para ti" + `hasNewReleases`; `markSeen(recipientId, tab)`; pruebas
- [x] 4.3 Rutas: `?tab=` en el listado y en `seen`, `newReleases` en `count`, claves nuevas en preferencias; schemas Zod en `src/lib/api/schemas.ts`; pruebas (sin `tab`, `tab` inválido)
- [x] 4.4 `docs/04-api/contracts.md`

## 5. UI

- [x] 5.1 Pestañas "Para ti" / "Novedades" (`tablist`) en `NotificationPanel` y `NotificationsView`, punto sin cifra en "Novedades", `PUT /seen?tab=releases` al abrirla, estado vacío propio
- [x] 5.2 `NotificationRow`: filas de hito (icono, objeto, hito, enlace al hilo o a la lista) y de lanzamiento (carátula 250 px o placeholder, tipo álbum / EP / sencillo, fecha del anunciado, enlace al disco)
- [x] 5.3 `NotificationPreferencesForm` con secciones "Para ti" y "Novedades" y los defectos de D1
- [x] 5.4 Mensajes `es` / `en` (plurales ICU, fechas) y pruebas de componentes (pestañas, punto, filas nuevas, preferencias)

## 6. Documentación

- [x] 6.1 ADR `docs/02-architecture/adr/0046-avisos-de-lanzamientos-e-hitos.md` (calendario como fuente, ventana de 14 días, avisos sin actor, hitos) y su entrada en `docs/README.md`
- [x] 6.2 `docs/05-features/notifications.md` (Fase 2), `docs/05-features/home.md` (el calendario avisa y vincula primero lo seguido), `business-rules.md`, `domain-model.md` y cierre del pendiente de `content-hierarchy.md`

## 7. Verificación

- [x] 7.1 `scripts/smoke-test-notifications.ts`: hitos de likes y de guardados contra Postgres real (escala, uno solo por hito, salto, cascada, oculto), defectos de preferencias, pestañas, contador sin novedades y `newReleases`; actualizar su entrada en `AGENTS.md`
- [x] 7.2 `scripts/smoke-test-release-calendar.ts`: avisos con ListenBrainz y MusicBrainz simulados (seguidor, colaboración, repetición, 14 días, anunciado, sencillo con y sin opción, reedición, riel sin sencillos, fan-out de 500 seguidores) y su entrada en `AGENTS.md`
- [x] 7.3 Correr los dos smoke en la BD de scratch
- [x] 7.4 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 7.5 Verificar en el navegador (escritorio y 375 px): pestañas, punto, filas de hito y de lanzamiento, ajustes


