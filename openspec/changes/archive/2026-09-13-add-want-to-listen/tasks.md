## 1. Esquema de datos

- [x] 1.1 Crear migración SQL cruda `drizzle/0026_want_to_listen.sql`: tabla
      `want_to_listen_entry` (`id` uuid PK, `user_id` FK a `app_user` con `ON DELETE CASCADE`,
      `artist_id` FK nullable a `artist`, `release_group_id` FK nullable a `release_group`,
      `created_at` timestamptz default now).
- [x] 1.2 Agregar `CHECK num_nonnulls(artist_id, release_group_id) = 1` en la misma migración.
- [x] 1.3 Agregar índices: `idx_want_to_listen_entry_user_created (user_id, created_at)`,
      `idx_want_to_listen_entry_artist (artist_id)`, `idx_want_to_listen_entry_release_group
      (release_group_id)`.
- [x] 1.4 Agregar dos índices únicos parciales (uno por columna de objetivo no nula) para
      garantizar a lo sumo una entrada por `(user_id, artist_id)` y por
      `(user_id, release_group_id)`.
- [x] 1.5 Espejar la tabla en `src/db/schema.ts` como `export const wantToListenEntry =
      pgTable("want_to_listen_entry", ...)`, siguiendo la forma exacta de `favorite`
      (`schema.ts:483`), y exportar `WantToListenEntryRow`.
- [x] 1.6 Correr la migración localmente y confirmar que `drizzle-kit` no detecta drift contra
      el schema espejado.

## 2. Contrato API (Zod)

- [x] 2.1 En `src/lib/api/schemas.ts`, agregar `WantToListenTargetTypeSchema = z.enum(["artist",
      "release-group"])`.
- [x] 2.2 Agregar `WantToListenTargetSchema` (`{ type: WantToListenTargetTypeSchema, id:
      z.uuid() }`) y `WantToListenTargetInfoSchema` (id, título, `coverThumbUrl` nullable —
      sin `artistName` ni `albumId`, ya que no aplica a artista/álbum de nivel superior salvo
      el álbum mismo).
- [x] 2.3 Agregar `WantToListenEntrySchema` (`id`, `targetType`, `createdAt`, `target`).
- [x] 2.4 Agregar `CreateWantToListenRequestSchema` (`{ target: WantToListenTargetSchema }`) y
      `RemoveWantToListenRequestSchema` (mismo shape).
- [x] 2.5 Agregar `WantToListenListResponseSchema` (`{ items: WantToListenEntrySchema[], page,
      pageSize, hasNext }`), siguiendo la forma de paginación ya usada por favoritos.

## 3. Servicio de dominio

- [x] 3.1 Crear `src/services/want-to-listen/types.ts`: `WANT_TO_LISTEN_TARGET_TYPES =
      ["artist", "release-group"] as const`, `WantToListenTargetType`, `WantToListenTarget`.
- [x] 3.2 Crear `src/services/want-to-listen/want-to-listen.ts` con
      `resolveWantToListenTarget(type, id)` (valida existencia contra `artist`/`releaseGroup`,
      lanza `WANT_TO_LISTEN_TARGET_INVALID` 404 si no existe).
- [x] 3.3 Implementar `toggleWantToListen(target, userId)`: idempotente, calcado de
      `toggleFavorite` (`src/services/favorites/favorites.ts:113`) pero sin `audience`.
- [x] 3.4 Implementar `isWantToListen(target, userId)` para hidratar el estado inicial del
      botón en las páginas de catálogo.
- [x] 3.5 Implementar `removeWantToListenEntry(target, userId)` (quitar por objetivo,
      idempotente) y `removeWantToListenEntryForTarget(target, userId)` de uso interno (mismo
      comportamiento, pensado para invocarse desde el diario).
- [x] 3.6 Implementar `listMyWantToListen(userId, page, pageSize)`: paginado, orden
      cronológico descendente, cada fila con objetivo, título y carátula (solo si es álbum),
      siguiendo la forma de `listMyFavorites`.
- [x] 3.7 Escribir `src/services/want-to-listen/want-to-listen.test.ts` cubriendo: toggle
      idempotente (crear/quitar), rechazo de objetivo inexistente, listado paginado, listado
      vacío.

## 4. Integración con el diario (auto-remoción)

- [x] 4.1 En `src/services/diary/diary.ts`, dentro de `createListenEntry` (línea ~102),
      después de crear la escucha exitosamente y solo cuando `target.type` es `artist` o
      `release-group`, invocar `removeWantToListenEntryForTarget` del nuevo servicio.
- [x] 4.2 Agregar prueba en `src/services/diary/diary.test.ts` (o archivo equivalente):
      registrar una escucha de un objetivo que está en la lista Want to Listen del usuario
      elimina esa entrada; registrar una escucha de un objetivo sin entrada previa no falla ni
      crea nada; la entrada de otro usuario no se ve afectada.

## 5. Endpoints API

- [x] 5.1 Crear `src/app/api/me/want-to-listen/route.ts` con `GET` (listar, paginado, requiere
      sesión → `401 AUTH_REQUIRED`), `POST` (toggle vía `CreateWantToListenRequestSchema`,
      requiere sesión, `404 WANT_TO_LISTEN_TARGET_INVALID` si el objetivo no existe, `400
      VALIDATION_ERROR` si el tipo no es `artist`/`release-group`), `DELETE` (quitar vía
      `RemoveWantToListenRequestSchema`, requiere sesión).
- [x] 5.2 Escribir `src/app/api/me/want-to-listen/route.test.ts` cubriendo los escenarios de
      la spec: crear, toggle idempotente, quitar, sesión requerida, objetivo inválido (canción
      o inexistente), listado vacío y paginado.

## 6. Cliente HTTP y helpers de frontend

- [x] 6.1 Agregar `toggleWantToListen`, `removeFromWantToListen`, `listMyWantToListen` en
      `src/lib/api/want-to-listen.ts` (nuevo archivo), usando `src/lib/api/client.ts` — sin
      `fetch` directo, siguiendo el patrón de `src/lib/api/favorites.ts`.

## 7. UI: acción en páginas de catálogo

- [x] 7.1 Crear `src/components/want-to-listen/WantToListenButton.tsx` (client component),
      calcado de `FavoriteButton.tsx`: props `target`, `authenticated`, `initialActive`;
      estados de carga/error; enlace a login si no hay sesión.
- [x] 7.2 Agregar textos de i18n (`wantToListen.add`, `wantToListen.remove`,
      `wantToListen.signInToAdd`, `wantToListen.saving`, `wantToListen.saveError`, etc.) en
      los archivos de `messages/` (es y en) — rótulo visible en español: "Quiero escuchar" /
      "En tu lista".
- [x] 7.3 Integrar `WantToListenButton` en `src/app/[locale]/(catalog)/artist/[id]/page.tsx` y
      `src/app/[locale]/(catalog)/album/[id]/page.tsx`, hidratando `initialActive` con
      `isWantToListen` en el server component, igual que ya hace `FavoriteButton`.
- [x] 7.4 Confirmar explícitamente que `src/app/[locale]/(catalog)/song/[id]/page.tsx` NO
      recibe ninguna acción de Want to Listen.

## 8. UI: listado propio

- [x] 8.1 Crear la ruta `src/app/[locale]/me/want-to-listen/page.tsx` (server component),
      siguiendo la estructura de `src/app/[locale]/me/favorites/`: requiere sesión, carga la
      primera página vía el servicio de dominio.
- [x] 8.2 Crear `src/components/want-to-listen/WantToListenList.tsx` con estado vacío
      localizado, ficha de artista (placa tipográfica) y de álbum (carátula cuadrada), y
      acción de quitar por entrada.
- [x] 8.3 Agregar el enlace a `/me/want-to-listen` en la navegación de `/me/*` donde ya están
      Favoritos/Listas/Diario.

## 9. Verificación final

- [x] 9.1 Correr typecheck, lint, tests y build completos.
- [x] 9.2 Probar manualmente en el navegador: agregar/quitar de Want to Listen desde artista y
      álbum, confirmar ausencia del control en canción, registrar una escucha de un objetivo
      en la lista y verificar que desaparece del listado propio.
- [x] 9.3 Actualizar `docs/` si existe un índice de rutas o de capabilities que liste
      favoritos/listas/diario, agregando Want to Listen.

## 10. UI: secciones por tipo y modos de visualización (ajuste post-implementación)

- [x] 10.1 Crear `want-to-listen-view-mode.ts` (vocabulario de modos, calcado de
      `list-view-mode.ts`) y `use-want-to-listen-view-mode.ts` (preferencia en `localStorage`,
      calcado de `use-list-view-mode.ts`), con su test.
- [x] 10.2 Crear `want-to-listen-shared.ts` con `groupWantToListenByType` (artistas → álbumes,
      filtrando secciones vacías) y `wantToListenHref`, calcados de `favorites-shared.tsx`.
- [x] 10.3 Crear `WantToListenModeSwitcher.tsx` (radiogroup con navegación por flechas, calcado
      de `ListModeSwitcher.tsx`) y `WantToListenSection.tsx` (encabezado con conteo + renderer
      del modo elegido).
- [x] 10.4 Crear los tres renderers `EntriesDetailed.tsx`, `EntriesIndex.tsx` y
      `EntriesGraphic.tsx` (sin reordenamiento, solo acción de quitar) y `RemoveEntryButton.tsx`
      (confirmación en dos pasos, calcado de `RemoveItemButton.tsx`) y `ArtistPlate.tsx`
      compartido entre los tres modos.
- [x] 10.5 Reescribir `WantToListenList.tsx` para orquestar: agrupar por tipo, un único
      conmutador de modo para ambas secciones, paginación/"cargar más" y quitar por entrada.
- [x] 10.6 Agregar claves de i18n (`sectionArtists`, `sectionAlbums`, `viewModeLabel`,
      `viewMode.*`, `removeItem*`) en `messages/{es,en}/wantToListen.json`.
- [x] 10.7 Escribir `WantToListenList.test.tsx` cubriendo: secciones separadas, cambio de modo,
      quitar en dos pasos y estado vacío.
- [x] 10.8 Verificar manualmente en el navegador: dos secciones con datos mixtos, los tres
      modos de visualización, y que quitar la única entrada de una sección la hace desaparecer.
