## 1. Constantes y servicio

- [x] 1.1 Añadir `NEW_RELEASE_WINDOW_DAYS = 90` en `src/services/discovery/constants.ts` con su comentario.
- [x] 1.2 Renombrar la lógica actual de `listNewReleases` a `listRecentByYear(limit, condition?)` en
  `src/services/discovery/discovery.ts` (sin cambiar su comportamiento) y apuntar `getGenreNewReleases`
  (`src/services/genres/rails.ts`) a ella.
- [x] 1.3 Reescribir `listNewReleases(limit = RAIL_SIZE)` para Explorar: categorías `NEW_RELEASE_CATEGORIES`,
  `first_release_date` entre `current_date - NEW_RELEASE_WINDOW_DAYS` y `current_date` (corte calculado en SQL, sin
  `Date` de JS), `cover_thumb_url` no nulo, orden `first_release_date desc, id asc`, y `[]` si hay menos de
  `MIN_ALBUMS_FOR_SECTION`.

## 2. Interfaz

- [x] 2.1 Actualizar `newReleasesDescription` en `messages/es/catalog.json` y `messages/en/catalog.json` para
  reflejar "lanzados en los últimos 90 días".

## 3. Pruebas

- [x] 3.1 Pruebas de `listNewReleases`: ventana (dentro/fuera), futuro excluido, fecha parcial excluida, sin
  carátula excluido, orden por fecha dentro del mismo año, omisión bajo `MIN_ALBUMS_FOR_SECTION`.
- [x] 3.2 Actualizar `src/services/genres/rails.test.ts` para que verifique que género usa `listRecentByYear`.
- [x] 3.3 Verificar contra una BD de scratch (`DATABASE_URL` distinto) que la consulta corre y devuelve el orden
  esperado; no dejar fixtures en la BD real.

## 4. Documentación

- [x] 4.1 Actualizar `docs/05-features/explore.md` (fila de Novedades y umbrales).
- [x] 4.2 Aclarar en `docs/05-features/genres.md` que el riel Novedades de género sigue ordenando por año y no
  usa la ventana de Explorar.

## 5. Cierre

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
