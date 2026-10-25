## Context

La Fase 1 dejó una tabla `notification` con una fila por evento, escrita solo por
`src/services/notifications/emit.ts` dentro de la transacción de la acción (ADR 0045), filtros de privacidad al
leer, agrupación por `group_key`, contador "visto vs. leído" sobre `app_user.notifications_seen_at` y preferencias que
solo guardan lo que difiere del defecto (todo activado).

Las fuentes de esta fase ya existen:

- **Likes**: `likeComment` (`src/services/social/comment-likes.ts`) inserta en `comment_like`; la cifra pública se
  muestra desde 3 y `countLikes` excluye cuentas desactivadas (`add-comment-likes`). Los likes son anónimos.
- **Guardados**: `saveList` y `setListTracking` (`src/services/lists/saved-lists.ts`) insertan en `list_save`; el
  tracking de un Camino crea el guardado si no existía.
- **Lanzamientos**: `syncReleaseCalendar` (`src/services/home/release-calendar-sync.ts`, ADR 0029) baja una vez por
  día la ventana de "Fresh Releases" de ListenBrainz (30 días hacia atrás, 90 hacia adelante), filtra álbum y EP,
  verifica en MusicBrainz, vincula al catálogo (stub + créditos) hasta 150 discos de artistas con los que alguien
  tiene relación y reemplaza `release_calendar_entry`. La dispara la primera visita a Inicio con el calendario
  vencido (`ensureReleaseCalendarFresh`, `after()`) o `scripts/sync-release-calendar.ts`.

Decisiones de producto ya tomadas con el usuario (2026-10-23): hitos sin nombres y crecientes (10, 25, 50, 100, 500,
1000…); lanzamientos de álbum y EP, sencillos como ajuste; las novedades en una pestaña aparte que no suma al
contador.

## Goals / Non-Goals

**Goals:**

- Tres familias nuevas (hitos de likes, hitos de guardados, lanzamientos) sin abrir un segundo camino de escritura:
  todo sigue pasando por el emisor.
- Fan-out de lanzamientos en SQL (un `INSERT … SELECT` por lote), no una fila por seguidor en memoria.
- Que la bandeja "Para ti" no cambie de comportamiento: su contador, agrupación y filtros siguen iguales.

**Non-Goals:**

- Email, push, premios (Fase 3).
- Una fuente de lanzamientos distinta del calendario (ver D6, alternativa descartada).

## Decisions

### D1. Tipos nuevos y defectos

| Tipo | Destinatario | Referencia | `group_key` | Pestaña | Defecto |
|---|---|---|---|---|---|
| `comment_like_milestone` | autor del comentario | `comment_id` + `milestone` | `likes:<commentId>` | Para ti | activado |
| `list_save_milestone` | dueño de la lista | `list_id` + `milestone` | `saves:<listId>` | Para ti | desactivado |
| `artist_release` | seguidores de un artista acreditado | `release_group_id` | `release:<rgId>` | Novedades | activado |
| `artist_release_announced` | ídem | `release_group_id` | `announced:<rgId>` | Novedades | desactivado |
| `artist_single` | ídem | `release_group_id` | `release:<rgId>` | Novedades | desactivado |

Los cinco son desactivables. Ninguno lleva actor: los hitos son anónimos (los likes y los guardados no exponen
quién) y un lanzamiento no tiene una persona detrás.

**Descartado — "tu lista fue destacada"**: `featureList` solo acepta listas oficiales de `@exploracion`; no hay una
persona a quien avisar. Si algún día se pueden destacar listas de la comunidad, se agrega entonces.

### D2. Escalas de hitos

- Likes: `10, 25, 50, 100, 500, 1000, 2500, 5000, 10000` y luego cada `10000`.
- Guardados: `1, 5, 10, 25, 50, 100, 500, 1000` y luego cada `1000`. Empieza en 1 porque una lista guardada es
  mucho más rara que un like; el tipo nace desactivado, así que solo lo recibe quien lo pide.

Viven en `src/services/notifications/milestones.ts` como funciones puras (`highestMilestone(scale, count)`), con
pruebas unitarias. La escala de likes empieza en 10 y no en el umbral público de 3 (`add-comment-likes`): 3 es
cuándo se muestra la cifra, no cuándo vale la pena interrumpir.

### D3. Emisión de hitos

En la misma transacción que el `INSERT` en `comment_like` / `list_save` (las dos fuentes pasan a transacción):

1. Solo si la fila es nueva (`ON CONFLICT DO NOTHING … RETURNING`; un re-guardado que solo cambia `following` o
   `tracking` no cuenta).
2. Contar con la misma regla que la cifra pública (likes: `countLikes`, sin cuentas desactivadas; guardados: personas
   distintas con cuenta activa).
3. `crossedMilestone(scale, count)`: el hito que **cruza** este like o guardado (el de `count` si es distinto del de
   `count - 1`). Si existe y no hay ya una notificación de ese hito o de uno mayor para ese objeto, se emite. Un
   objeto que ya había pasado un hito sin aviso (antes del despliegue, o con el tipo apagado) no lo recibe con
   retraso: su próximo aviso es el siguiente hito. (Revisión 2026-10-25: la primera implementación usaba
   `highestMilestone` y avisaba el 10 con el like 16 de un comentario viejo.)
4. El único parcial `(recipient_id, kind, comment_id|list_id, milestone)` absorbe carreras: dos likes simultáneos
   que cruzan el mismo hito escriben una fila.

Un unlike no retira el hito (ya ocurrió) y volver a likear no lo repite. Borrar el comentario o la lista lo retira
por cascada, como el resto.

**Alternativa descartada — contador en la fila y una sola notificación que se reescribe**: rompe la regla "una fila
por evento" y el estado visto / leído (un hito nuevo tiene que volver a contar como no visto).

### D4. Esquema (migración `0076`)

```
ALTER TABLE notification
  ADD COLUMN milestone integer,                                   -- solo hitos, > 0
  ADD COLUMN list_id uuid REFERENCES user_list(id) ON DELETE CASCADE,
  ADD COLUMN release_group_id uuid REFERENCES release_group(id) ON DELETE CASCADE;
```

- `chk_notification_kind`, `chk_notification_actor` (sin actor: `moderation` y los cinco nuevos) y
  `chk_notification_target` se rehacen con los tipos nuevos: cada tipo exige su referencia y prohíbe las otras;
  `milestone` es obligatorio en los dos hitos y nulo en el resto.
- El único `uq_notification_recipient_comment_kind` se reemplaza por
  `(recipient_id, comment_id, kind, coalesce(milestone, 0))`; nuevos únicos parciales por `list_id` y por
  `release_group_id` (`(recipient_id, release_group_id, kind)`).
- `notification_preference.chk_notification_preference_kind` suma los cinco tipos.
- `app_user.notifications_releases_seen_at timestamptz` para el punto de "Novedades".
- Índice parcial `(recipient_id) WHERE read_at IS NULL` ya existe y sirve para las dos pestañas.

Aditiva salvo los `CHECK` y el único rehechos (mismo nombre, regla más amplia): ninguna fila existente los viola.

### D5. Preferencias con defecto por tipo

`OPTIONAL_NOTIFICATION_KINDS` pasa a un mapa `kind → defecto`. La ausencia de fila significa "el defecto del tipo"
(antes: "activado"); se guarda fila solo cuando difiere del defecto. El emisor y la lectura de preferencias usan el
mismo mapa. Para el fan-out (D6) el filtro va en SQL: `coalesce(p.enabled, <defecto>)`.

Las filas que ya existen siguen significando lo mismo: en la Fase 1 todos los defectos eran `true` y solo se
guardaban desactivaciones.

### D6. Lanzamientos desde el calendario

Al final de `runSync`, después del reemplazo de la ventana (paso 7) y fuera de él, una transacción propia llama a
`emitArtistReleaseNotifications(tx, entries, today)`:

- **Qué entra**: entradas vinculadas (`release_group_id`), sin `exclusion` y con fecha verificada.
  - `artist_release`: fecha entre `today - 14` y `today` (14 días y no los 30 de la ventana: el primer día que se
    activa la función no debe llegar un mes de discos de golpe, y una sincronización atrasada unos días todavía
    avisa).
  - `artist_release_announced`: fecha posterior a `today`.
- **A quién**: seguidores (`artist_follow`) de cualquier artista con crédito `primary` en el release-group, con
  cuenta activa, deduplicados por persona, con la preferencia resuelta en SQL (D5). Un `INSERT … SELECT … ON CONFLICT
  DO NOTHING` por lote de entradas.
- **Idempotente**: el único `(recipient_id, release_group_id, kind)` hace que la sincronización diaria siguiente no
  repita nada; un anunciado que sale emite además `artist_release` (otro tipo).
- **Prioridad en el vínculo**: hoy se vinculan hasta 150 discos de artistas con relación, ordenados por fecha. Se
  ordena primero lo de artistas **seguidos** y después el resto, para que el tope no deje sin aviso a quien sigue.
- **Sin carátula**: el aviso no la exige (el riel personal ya muestra lo seguido sin carátula).
- **Sencillos** (`artist_single`): `filterFeed` sigue sin dejarlos como candidatos del calendario. Aparte, la
  sincronización toma del mismo feed los `Single` de artistas seguidos por al menos una persona con `artist_single`
  activado, los verifica y vincula con las mismas funciones (respetando el tope) y emite. No se guardan en
  `release_calendar_entry`: el riel de Inicio no cambia.

Fallar aquí no falla la sincronización: el calendario ya quedó reemplazado; el error se registra y la próxima
sincronización lo reintenta (los únicos evitan duplicados).

**Alternativa descartada — avisar desde la ingesta de discografía** (`saveDiscographyReleaseGroups`): solo corre al
visitar la página del artista o cuando el calendario pide una resincronización, así que el aviso llegaría tarde o
nunca para el artista que nadie visita; además la primera sincronización de una discografía traería cientos de
discos "nuevos". El calendario ya es la fuente diaria de "qué salió", verificada y con vínculo.

### D7. Lectura por pestaña

- `listNotificationGroups(recipientId, { tab })` con `tab ∈ for_you | releases`. "Para ti" = los tipos de la Fase 1
  más los dos hitos; "Novedades" = los tres de lanzamiento.
- Filtros nuevos en `visibleNotifications`: un hito de comentario sigue la regla del comentario (oculto o raíz
  oculta → fuera); un hito de lista sale si la lista está oculta por moderación; un lanzamiento sale si el
  release-group fue retirado de la discografía (`discography_unlisted_at`) o bloqueado (`cover_blocked_at` no lo
  esconde: solo esconde la carátula).
- **Agrupación**: `likes:<commentId>` y `saves:<listId>` muestran el hito más alto del grupo ("Tu comentario sobre
  Pink Floyd llegó a 25 me gusta"). Los lanzamientos no se agrupan.
- **Contador** (`countUnseen`): solo "Para ti" (sin cambio de reglas). `GET /count` suma `newReleases: boolean` =
  hay novedades no leídas posteriores a `notifications_releases_seen_at`. `PUT /seen?tab=releases` mueve esa marca.

### D8. UI

- Panel de la campana y `/me/notifications` con dos pestañas, "Para ti" (por defecto) y "Novedades", con
  `role="tablist"`. "Novedades" lleva un punto ámbar (sin cifra) cuando `newReleases`. Abrir la pestaña marca vistas
  las novedades. La campana en sí no muestra nada por las novedades.
- Fila de hito: icono (corazón / marcador) en lugar de avatar, texto con el objeto ("Tu comentario sobre *Artista*
  llegó a 25 me gusta", "Tu lista *Título* ya la guardaron 10 personas"), enlace al hilo o a la lista.
- Fila de lanzamiento: carátula de 250 px del release-group por `cover-art.ts` (placeholder si no hay), "Salió
  *Título*, el nuevo álbum de *Artista*" / "EP" / "sencillo"; anunciado: "*Artista* anunció *Título* para el 14 de
  noviembre". Enlace a la página del disco.
- Ajustes → Notificaciones: dos secciones, "Para ti" y "Novedades", con los defectos de D1.

### D9. API

- `GET /api/me/notifications?tab=for_you|releases&cursor=&tz=` (sin `tab` = `for_you`, compatible con la Fase 1).
- `GET /api/me/notifications/count` → `{ count, newReleases }`.
- `PUT /api/me/notifications/seen?tab=for_you|releases`.
- `POST /api/me/notifications/read` sin cambios (las claves nuevas son únicas por objeto).
- `GET|PUT /api/me/notification-preferences` con las cinco claves nuevas.
- Los tipos nuevos en `NotificationGroup.kind` y `target` suma `{ type: "comment", artistId, artistName, rootId,
  milestone }`, `{ type: "list", listId, title, isCamino, milestone }` y `{ type: "release", releaseGroupId, title,
  artistName, category, releaseDate, coverUrl }`.

## Risks / Trade-offs

- [El calendario depende de que alguien visite Inicio para sincronizarse] → aceptado: es el mismo disparador que ya
  usa el riel; la ventana de 14 días absorbe días sin visitas. `scripts/sync-release-calendar.ts` sigue disponible.
- [ListenBrainz no publica todos los lanzamientos] → aceptado y documentado: el aviso cubre lo que la plataforma ya
  muestra; no se avisa lo que tampoco aparecería en el riel.
- [Fan-out grande para un artista con muchos seguidores] → un `INSERT … SELECT` indexado por
  `idx_artist_follow_artist`; el smoke mide uno con 500 seguidores.
- [Avalancha el primer día] → ventana de 14 días para `artist_release`; anunciados nacen desactivados.
- [Sencillos agregan verificaciones a MusicBrainz] → solo para artistas seguidos por alguien con la opción activada
  y dentro del mismo tope de vínculo; la cola de rate limit no cambia.
- [Un hito se siente como métrica de vanidad] → sin nombres, escalas espaciadas, desactivable; guardados nace
  apagado.

## Migration Plan

1. `drizzle/0076_notification_milestones_and_releases.sql` (rehace `CHECK` y un único; aditiva para los datos). Sin
   backfill: no se emiten hitos ni lanzamientos de eventos anteriores. Los comentarios que ya pasaron un hito lo
   avisarán al cruzar el siguiente.
2. Desplegar el código. La próxima sincronización del calendario empieza a avisar.
3. Rollback: revertir el código; la migración puede quedarse (las filas nuevas no rompen la Fase 1, que filtra por
   pestaña). Si hace falta, un `0077` que borre las filas de los tipos nuevos y restaure los `CHECK`.

## Open Questions

- Ninguna bloqueante.
