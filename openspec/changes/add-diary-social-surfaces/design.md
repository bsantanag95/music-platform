# add-diary-social-surfaces — Design

## Context

El diario (`listen_entry`) está implementado con lectura restringida al dueño: `listMyDiary`
(`src/services/diary/diary.ts`) filtra siempre por `userId` del actor, y la API solo expone
`/api/me/diary`. La base social ya existe: `getProfileByUsername` devuelve `relation`
(`none|following|requested|incoming|blocked|self`) y `blockedByMe`; `user_follow` guarda la
relación `accepted`; `user_block` representa bloqueos. `listen_entry.audience` ya se persiste
(`private|followers|public`, default `followers`) y el índice `idx_listen_entry_user_created
(user_id, created_at)` cubre las lecturas nuevas — **no se necesita migración**.

El contrato actual de `listen_entry` se documenta en `docs/04-api/contracts.md` y declara
explícitamente que "perfil y feed quedan para cambios posteriores".

## Goals / Non-Goals

**Goals:**

- Un único helper de visibilidad de entradas ajenas, puro y testeable, compartido por perfil y feed.
- Leer el diario de otro usuario desde su perfil (`GET /api/users/[username]/diary`).
- Feed v1 autenticado (`GET /api/me/feed`) con las escuchas visibles de los seguidos aceptados.
- Reutilizar `selectEntries`/`serializeEntry` y la UI del diario en modo lectura.
- Cerrar en `phase-5-design.md` §14 la decisión de actividad pública de perfil privado.

**Non-Goals:**

- Ratings, comentarios, favoritos o listas en el feed (incrementos posteriores).
- Tabla materializada de eventos de feed.
- Modificar el contrato ni la gestión del diario propio.
- Cambios de schema.

## Decisions

### D1. Regla de visibilidad como función pura `audiencesForProfile(profile)`

La matriz queda en una función pura que recibe el `PublicProfile` resuelto por
`getProfileByUsername` y devuelve el conjunto de audiencias permitidas al lector:

- `blockedByMe` o `relation === "blocked"` → `[]` (nada).
- `relation === "self"` → todas (`private`, `followers`, `public`).
- Perfil privado (`profileVisibility === "private"`) y `relation` !== `"following"` → `[]`, excepto el caso self, que se resuelve previamente como acceso del dueño (decisión cerrada: ni las públicas). Nota: `incoming` (el dueño D solicitó seguir a V) es la dirección inversa del grafo y no otorga acceso — que D quiera seguir a V no implica que V sea seguidor aprobado de D.
- `relation === "following"` (seguidor aprobado) → `["followers", "public"]`.
- Resto (perfil público sin relación aprobada, visitante anónimo) → `["public"]`.

Por qué: centraliza la única fuente de verdad de la matriz (también la usará el feed), evita
duplicar la lógica de relación que ya vive en `social/relations.ts`, y es directamente testeable
sin BD. Se ubica en un módulo nuevo `src/services/diary/visibility.ts`.

### D2. `listUserDiary(username, viewerId, page, pageSize)`

Resuelve el perfil con `getProfileByUsername` (404 `USER_NOT_FOUND` si no existe), calcula las
audiencias con `audiencesForProfile` y, si el conjunto está vacío, devuelve `{ entries: [],
page, pageSize, hasNext: false }` **sin consultar** `listen_entry` — la ausencia de permiso no
revela si el usuario tiene diario (criterio "no revelar" del proyecto, consistente con
`LISTEN_ENTRY_NOT_FOUND`). Con acceso, consulta `WHERE user_id = :ownerId AND audience IN (...)`
`ORDER BY created_at DESC, id DESC`, paginación `limit+1` como el resto del código.

### D3. `listFeed(viewerId, page, pageSize)`

El feed consulta los `followed_id` aceptados del lector y sus entradas con
`audience IN ('followers','public')`. Una relación `accepted` implica que el lector es seguidor
aprobado del autor, y un bloqueo en cualquier dirección elimina la relación (regla existente de
`PUT /api/users/[username]/block`), por lo que `IN (accepted)` + exclusión de `private` ya
materializa la misma matriz D1 sin consultas por autor. Como defensa barata se añade un
`NOT EXISTS` sobre `user_block` por par lector/autor. La respuesta incluye el autor
(`id`, `username`, `displayName`) para enlazar al perfil.

Contrato del que depende esta optimización: `PUT /api/users/[username]/block` crea el bloqueo y elimina, en una transacción, las relaciones y solicitudes `user_follow` entre ambas cuentas. La eliminación es bidireccional y no se revierten al desbloquear (`DELETE /block`). Por lo tanto, una relación `accepted` o `pending` preexistente no puede sobrevivir al bloqueo, y D3 puede asumir que un bloqueo no deja una relación de seguimiento válida que requiera recalcular la matriz por autor.

Por qué no resolver audiencias por cada seguido (N subconsultas): la relación `accepted` ya
garantiza la condición, y paginar sobre un `IN` es una sola query con el índice existente.

### D4. API

- `GET /api/users/[username]/diary?page=&pageSize=` — lectura **pública** (anónimo incluido):
  la sesión es opcional y se resuelve con `resolveSession` (no `requireUser`). Misma forma de
  respuesta que el diario propio (`DiaryListResponse`). `404 USER_NOT_FOUND`, `400 VALIDATION_ERROR`.
- `GET /api/me/feed?page=&pageSize=` — **requiere sesión** (`requireUser`); `401 AUTH_REQUIRED`.
  Respuesta `FeedResponseSchema` (`entries: FeedEntry[]`, `page`, `pageSize`, `hasNext`).

Ambos bajo `withErrorHandling` y `parsePagination`, como `src/app/api/me/diary/route.ts`.

### D5. UI reutilizando `DiaryList` con props de modo lectura

Se extiende `DiaryList` con props opcionales: `readOnly` (oculta expandir/borrar/editar y la
etiqueta de audiencia), `showAuthor` (muestra autor + enlace al perfil), `loadMore` (reemplaza la
llamada a `getMyDiary` cuando la fuente es el perfil ajeno o el feed) y `empty` (textos del estado
vacío localizados). La página de perfil (`users/[username]/page.tsx`) renderiza la sección cuando
`profile.accessible || isOwn`; la nueva página `me/feed` usa `listFeed` como fuente. El enlace
"Feed" se agrega al `Header` cuando hay sesión, junto a "Diario".

### D6. Cliente API y schemas

En `src/lib/api/schemas.ts`: `AuthorSummarySchema`, `FeedEntrySchema` (extiende `ListenEntrySchema`
con `author`) y `FeedResponseSchema`. En `src/lib/api/diary.ts` o módulo nuevo
`src/lib/api/feed.ts`: `getUserDiary(username, page, pageSize)` y `getFeed(page, pageSize)`, ambos
vía `apiFetch` con validación Zod (convención del proyecto).

### D7. Docs en el mismo cambio

- `04-api/contracts.md`: dos endpoints nuevos + forma de `entry` con `author`.
- `05-features/phase-5-design.md` §14: cerrar la decisión de actividad pública de perfil privado.
- `05-features/activity-feed.md`: estado ⚪→🟡, v1 solo diario.
- `docs/README.md`: estado de `05-features`.
- `errors.md`: verificar que no hacen falta códigos nuevos (se reutilizan `VALIDATION_ERROR`,
  `USER_NOT_FOUND`, `AUTH_REQUIRED`).

## Risks / Trade-offs

- [`DiaryList` asume dueño (acciones de edición/borrado)] → Mitigación: prop `readOnly`; el
  componente queda más complejo, se cubre con tests de componentes para ambos modos.
- [Consulta del feed crece con el `IN` de seguidos] → Mitigación: aceptable para v1; el diseño
  maestro (`activity-feed.md`) ya documenta cuándo materializar el feed.
- [Cambio de relación en caliente (unfollow/bloqueo) durante la paginación del feed] → Mitigación:
  cada página se calcula bajo demanda; una fila puede moverse entre páginas, comportamiento
  aceptado para v1 (no se promete consistencia transaccional del feed).
- [No hay migración: decidir no tocar schema] → Mitigación: documentado en el proposal y
  verificado en `sql-model.md` que los índices existentes cubren las queries.

## Migration Plan

No requiere migración. Rollback: eliminar los dos endpoints y las props nuevas de `DiaryList`
(revertir el change en OpenSpec y `git`); no hay datos nuevos que limpiar.

## Open Questions

- Orden exacto del feed frente a empates de `created_at`: se resuelve con `id DESC` como tiebreaker
  (igual que el diario propio). Decisión cerrada en este diseño.
- Paginación del perfil ajeno: reutiliza `page`/`pageSize` (offset) como el diario propio; keyset se
  evalúa cuando haya volumen real.
