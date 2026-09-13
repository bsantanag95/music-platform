## Why

Hoy el sistema solo permite registrar música que ya se escuchó (`listen-diary`) o marcar
interés genérico (`favorites`), pero no hay forma de guardar la intención de escuchar algo
en el futuro. Sitios de referencia (Letterboxd, Trakt) resuelven esto con un Watchlist;
en música, el equivalente es una lista "Want to Listen": una señal prospectiva de "quiero
escuchar esto" que se retira sola cuando el usuario efectivamente lo consume. Sin este
concepto, el usuario no tiene dónde anotar artistas o álbumes que descubre y quiere escuchar
después, y termina usando Lists o Favorites para un propósito que no fue diseñado para eso.

## What Changes

- Nueva señal **Want to Listen**: marca/desmarca (toggle) un artista o un álbum (release
  group) como "quiero escuchar", exclusiva por usuario y objetivo (a lo sumo una entrada por
  usuario y objetivo).
- Alcance limitado a **artista y álbum**: las canciones (recording) quedan explícitamente
  fuera — no se ofrece la acción de want-to-listen en páginas de canción.
- **Auto-remoción por consumo**: registrar una escucha (`listen-diary`) sobre un artista o
  álbum que está en la lista Want to Listen del usuario elimina automáticamente esa entrada,
  sin acción manual adicional.
- Superficie propia de listado (`/<locale>/me/want-to-listen`) con paginación, para ver y
  quitar entradas.
- Acción de alternar Want to Listen en las páginas de catálogo de artista y álbum.
- Nueva tabla `wantToListenEntry` en el esquema, siguiendo el patrón de objetivo polimórfico
  ya usado por `favorite` (pero sin columna de `recordingId`, dado el alcance).

## Capabilities

### New Capabilities
- `want-to-listen`: señal de intención prospectiva ("quiero escuchar") sobre artista o álbum,
  con toggle idempotente, listado propio paginado, acción en páginas de catálogo y
  auto-remoción al registrarse una escucha del mismo objetivo.

### Modified Capabilities
_(ninguna — `listen-diary` no cambia sus propios requisitos; want-to-listen reacciona a la
creación de una escucha existente, no le agrega comportamiento nuevo a esa capability)_

## Impact

- **Esquema de datos**: nueva tabla `want_to_listen_entry` (migración SQL + espejo en
  `src/db/schema.ts`), con `userId`, `artistId` nullable, `releaseGroupId` nullable,
  `CHECK num_nonnulls(artist_id, release_group_id) = 1`, `createdAt`, y una unicidad por
  `(userId, artistId, releaseGroupId)`.
- **API**: nuevos endpoints bajo `src/app/api/me/want-to-listen/` (crear/quitar/listar) y
  esquemas Zod nuevos en `src/lib/api/schemas.ts`.
- **Diary API**: el endpoint de creación de escucha (`src/app/api/me/diary/...`) gana un
  efecto colateral (borrar la entrada de Want to Listen coincidente, si existe).
- **UI**: nuevo componente de acción (toggle) reutilizable para páginas de artista y álbum;
  nueva página de listado propio; sin cambios en páginas de canción.
- **Sin impacto** en `lists`, `favorites` ni `userListItem`.
