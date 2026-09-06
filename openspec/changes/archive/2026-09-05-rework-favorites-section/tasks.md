## 1. Contrato: esquemas Zod

- [x] 1.1 `src/lib/api/schemas.ts`: `FavoritesListRequest` gana `q?`, `type?`
      (`artist`|`release-group`|`recording`), `audience?` (`private`|`followers`|`public`),
      `sort?` (`recent`|`alpha`) opcionales; `FavoritesListResponseSchema` gana
      `counts: { artist, "release-group", recording }` (enteros ≥ 0).
- [x] 1.2 `src/lib/api/schemas.ts`: `UpdateFavoriteAudienceRequestSchema` pasa a unión —
      `{ id: string, audience }` (retrocompat) **o** `{ ids: string[] (1..50), audience }`.
- [x] 1.3 `src/lib/query/keys.ts`: `queryKeys.myFavorites(filters)`.
- [x] 1.4 `tsc --noEmit` en verde tras los cambios de tipos.

## 2. Servicio: listado propio y de perfil

- [x] 2.1 `src/services/favorites/favorites.ts`: `FavoriteFilters { q?, type?, audience?,
      sort? }` normalizados y validados (`VALIDATION_ERROR` fuera de rango).
- [x] 2.2 `listMyFavorites(userId, page, pageSize, filters?)`: `ilike` sobre
      `coalesce(artist.name, release_group.title, recording.title)` para `q`; filtro por
      `type` y por `audience`; orden `recent` (default: `created_at` desc, `id` desc) /
      `alpha` (`lower(coalesce(...))` asc, `id` asc).
- [x] 2.3 `listMyFavorites`: ORDER BY por rango fijo de tipo (`artist` → `release-group` →
      `recording`), luego el `sort` pedido, luego `id`; una sola consulta paginada por offset
      (misma forma que hoy). El muro agrupa en el cliente.
- [x] 2.4 `listMyFavorites`: incluir `counts` por tipo con un agregado `group by` acotado a
      `favorite where user_id = :user` (con las mismas condiciones de `q`/`audience`, sin la
      de `type`).
- [x] 2.5 `listUserFavorites(username, viewerId, page, pageSize)`: mismo `counts` y mismo
      orden por rango de tipo; sin cambios en `audiencesForProfile` ni en la matriz de
      visibilidad.
- [x] 2.6 Tests en `src/services/favorites/favorites.test.ts`: `counts` (con y sin favoritos),
      `q` (parcial, sin distinguir mayúsculas), filtro por `type`, filtro por `audience`,
      `sort=alpha`, orden por rango de tipo, `type`/`audience`/`sort` inválidos →
      `VALIDATION_ERROR`.

## 3. Servicio: cambio de audiencia en lote

- [x] 3.1 `src/services/favorites/favorites.ts`: `updateFavoritesAudienceBulk(userId, ids,
      audience)` — un único `update favorite set audience where id = any(:ids) and user_id =
      :user returning *`.
- [x] 3.2 `returning` vacío → `ApiError("FAVORITE_NOT_FOUND", 404)`; ids ajenos/inexistentes
      del conjunto se ignoran sin error; idempotente (fijar la audiencia ya vigente no falla).
- [x] 3.3 Tests: cambio de varios, conjunto con id ajeno (se ignora), ningún id propio →
      `FAVORITE_NOT_FOUND`, idempotencia, sin efectos colaterales sobre escuchas/ratings/
      comentarios.

## 4. API: rutas

- [x] 4.1 `GET /api/me/favorites`: parsear y validar `q`/`type`/`audience`/`sort` opcionales;
      respuesta con `counts`. Retrocompatible sin params. `route.test.ts`.
- [x] 4.2 `PATCH /api/me/favorites`: aceptar la unión `{ id | ids, audience }`; el camino
      `ids` llama a `updateFavoritesAudienceBulk`; `AUTH_REQUIRED` sin sesión,
      `VALIDATION_ERROR` para lote vacío / excesivo / audiencia inválida. `route.test.ts`
      cubre ambos caminos y la retrocompatibilidad de `{ id, audience }`.
- [x] 4.3 `GET /api/users/[username]/favorites`: respuesta con `counts`; sin cambios de
      visibilidad. `route.test.ts`.
- [x] 4.4 `docs/04-api/contracts.md`: documentar los query params, `counts` y la unión de body
      del `PATCH` en la sección "Favoritos".

## 5. Capa de acceso cliente

- [x] 5.1 `src/lib/api/favorites.ts`: `getMyFavorites(page, pageSize, filters)` por `apiFetch`
      + esquema; `updateFavoritesAudienceBulk(ids, audience)`; conservar
      `updateFavoriteAudience(id, audience)` para el camino individual.
- [x] 5.2 `getUserFavorites(username, page, pageSize)` refleja `counts` en el tipo de
      respuesta.

## 6. UI: muro y toolbar

- [x] 6.1 `src/components/favorites/FavoriteTile.tsx` (server): tres tratamientos —
      **álbum** (`CoverThumb` + título + artista acreditado), **artista** (placa tipográfica
      en `font-display` sobre `ink-surface`, etiqueta `artista`), **canción**
      (`DiscPlaceholder` + título, etiqueta `canción`). `<article>` con enlace primario al
      objetivo, borde `amber` en `hover`/`focus-within`, imagen/placa `aria-hidden`, sin
      sombra.
- [x] 6.2 `src/components/favorites/FavoritesToolbar.tsx` (client): buscador con debounce
      (300ms) + `FilterSelect` de tipo + `FilterSelect` de audiencia + `FilterSelect` de orden
      + "Limpiar filtros"; misma disposición que `MyListsTab` / `DiaryActivityList`.
- [x] 6.3 `src/components/favorites/FavoritesWall.tsx` (client): encabezado con `counts` por
      tipo (`font-data`); `useInfiniteQuery` sembrado con `initialData`; agrupa la lista plana
      en sus tres secciones tituladas (o una sola cuando hay filtro `type`). Grid 1-col /
      2–3-col ≥`sm`.
- [x] 6.4 Estados: vacío real ("todavía no marcaste favoritos") con enlace al catálogo;
      "sin resultados" (con filtros) distinto; error inline reintentable; `aria-live` al
      cargar más.

## 7. UI: gestión de audiencia

- [x] 7.1 `FavoriteTile`: selector de audiencia en línea (`private`/`followers`/`public`) en
      modo propio; mutación optimista con rollback y `onSettled` que invalida
      `queryKeys.myFavorites`.
- [x] 7.2 `FavoritesWall`: modo selección (`selectionMode` + `selectedIds: Set` en `useState`)
      — casilla por ficha, barra de acción fija (bottom-sticky en mobile) con "N
      seleccionados" (`aria-live="polite"`), opciones de audiencia y "Listo" (+ `Escape`).
- [x] 7.3 Cambio en lote: mutación optimista sobre la caché para las N seleccionadas, rollback
      en error, invalidar al asentar; salir del modo selección al confirmar.

## 8. UI: páginas

- [x] 8.1 `src/app/[locale]/me/favorites/page.tsx`: leer y validar los filtros de
      `searchParams`; resolver la primera página con `listMyFavorites` en el servidor;
      renderizar encabezado + `FavoritesWall`.
- [x] 8.2 `src/app/[locale]/users/[username]/page.tsx`: la sección de favoritos pasa a
      `FavoritesWall` con `readOnly` (sin toolbar, sin selector de audiencia, sin selección,
      sin quitar); "cargar más" por tipo con `getUserFavorites`.
- [x] 8.3 Retirar `src/components/favorites/FavoritesList.tsx` (o reducirlo a lo que aún use
      el perfil) y actualizar sus importadores.
- [x] 8.4 `FavoriteButton` no se toca; verificar que sigue compilando y funcionando igual.

## 9. i18n

- [x] 9.1 `messages/{es,en}/favorites.json`: claves nuevas — encabezado con conteos por tipo,
      toolbar (placeholder de búsqueda, etiquetas de filtro de tipo / audiencia / orden,
      limpiar), etiquetas de las tres fichas (`artista` / `canción`), títulos de sección,
      modo selección ("Seleccionar", "N seleccionados", "Cambiar audiencia", "Listo"), estado
      vacío filtrado ("sin resultados"), errores accesibles del cambio de audiencia.

## 10. Componentes: tests

- [x] 10.1 `FavoriteTile` — los tres tratamientos (álbum con carátula, artista como placa,
      canción como disco), enlace al objetivo, imagen `aria-hidden`.
- [x] 10.2 `FavoritesWall` — agrupación en tres secciones (sin filtro) y una sola sección
      (con filtro `type`), encabezado con `counts`, vacío real vs. "sin resultados",
      `aria-live` al cargar más.
- [x] 10.3 `FavoritesToolbar` — búsqueda con debounce, filtros de tipo / audiencia / orden,
      "limpiar filtros", sincronización con la URL.
- [x] 10.4 Selector de audiencia por ficha — cambio optimista y rollback en error.
- [x] 10.5 Modo selección — activar/salir, contador `aria-live`, cambio en lote optimista y
      rollback, salida al confirmar.

## 11. Documentación y verificación final

- [x] 11.1 `docs/05-features/lists-and-favorites.md`: mover el plan de la sección de favoritos
      de "propuesto" a implementado; `docs/05-features/README.md` si aplica.
- [x] 11.2 `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build` — los
      cuatro en verde.
- [x] 11.3 Verificación manual en navegador (cuenta y datos reales): muro con los tres tipos,
      encabezado con conteos, toolbar (búsqueda / tipo / audiencia / orden / limpiar), "ver
      todos los N", selector de audiencia por ficha, modo selección + cambio en lote, estados
      vacío y "sin resultados", perfil ajeno en modo lectura; mobile 375px sin overflow; foco
      ámbar 2px visible; `prefers-reduced-motion` respetado.
- [x] 11.4 Detector de diseño de Impeccable sobre los componentes tocados
      (`node .claude/skills/impeccable/scripts/detect.mjs --json <archivos>`) — sin hallazgos.
- [x] 11.5 `openspec validate rework-favorites-section --strict` en verde.
