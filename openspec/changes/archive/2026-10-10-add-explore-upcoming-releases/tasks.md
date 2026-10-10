## 1. Servicio

- [x] 1.1 Añadir `UPCOMING_WINDOW_DAYS = 180` en `src/services/discovery/constants.ts` con su comentario.
- [x] 1.2 En `discovery.ts`: `upcomingCondition()` (categorías `NEW_RELEASE_CATEGORIES`, `first_release_date >
  current_date` y `<= current_date + UPCOMING_WINDOW_DAYS`, `cover_thumb_url` no nulo; corte en SQL, sin `Date`).
- [x] 1.3 `listUpcomingReleases(limit = RAIL_SIZE)`: orden `first_release_date asc, id asc`, `[]` bajo
  `MIN_ALBUMS_FOR_SECTION`; sumarlo a `ExplorePage` y a `getExplorePage`.
- [x] 1.4 `listUpcomingAlbums(page, { category })`: consulta propia sin `rating`, mismo orden, con `paginate` y
  `toAlbumPage`, validando el tipo como `listAlbumsFiltered`; sin umbral.

## 2. Interfaz

- [x] 2.1 `AlbumCard`: prop opcional `releaseDateLabel` que reemplaza al año en la línea `año · tipo`.
- [x] 2.2 `AlbumRail` y `FilteredAlbumList`: prop opcional `dateLabels` (mapa id → fecha ya formateada, serializable) que se propaga a `AlbumCard`.
- [x] 2.3 `ExploreFilterBar`: prop `hideSort`; "Quitar filtros" solo por tipo cuando el orden está oculto.
- [x] 2.4 `explore/page.tsx`: riel "Próximos lanzamientos" tras Novedades con "Ver todo →"; corte `?proximos=1`
  (prioridad después de década > familia > género) con `FilteredAlbumList`; formateo de fecha por locale a partir
  de `firstReleaseDate` en UTC (con año si no es el actual).
- [x] 2.5 Cadenas es/en en `messages/{es,en}/catalog.json`: encabezado, descripción (con `{days}`), "Ver todo",
  kicker y título del listado, migas.

## 3. Pruebas

- [x] 3.1 Servicio: SQL del riel (límites `> hoy` / `<= hoy+180`, carátula, orden ascendente, sin `rating`),
  umbral, tope `RAIL_SIZE`; `listUpcomingAlbums` (paginación, tipo inválido → `VALIDATION_ERROR`, sin umbral).
- [x] 3.2 `AlbumCard` con y sin `releaseDateLabel` y formateo de la fecha (`releaseDateLabel()`); la propagación por `AlbumRail`/`FilteredAlbumList` se verificó en el navegador.
- [x] 3.3 `ExploreFilterBar` con y sin `hideSort`; el corte `?proximos=1` lo resuelve la página (no hay módulo de parámetros nuevo) y se verificó en el navegador.
- [x] 3.4 Verificar con una consulta de solo lectura contra la BD que la consulta corre y ordena como se espera.

## 4. Documentación

- [x] 4.1 `docs/05-features/explore.md`: filas del riel y del listado, umbrales y diferencia con Inicio.
- [x] 4.2 `docs/05-features/home.md`: nota de que el listado completo de futuros vive en Explorar.

## 5. Cierre

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
