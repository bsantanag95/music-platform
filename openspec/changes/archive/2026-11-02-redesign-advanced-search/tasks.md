## 1. Criterios y lectura de parámetros

- [x] 1.1 En `src/services/catalog/search/filters.ts`, pasar de `AdvancedFilters` a criterios por tipo (`SearchCriteria`): `exact`, `artistType`, `country[]`, `area`, `beginFrom`/`beginTo`, `ended` (Artistas); `exact`, `artist`, `artistExact`, `yearFrom`/`yearTo`, `category[]` (Álbumes); `exact`, `artist`, `artistExact`, `album`, `albumExact`, `category[]`, `durMin`/`durMax` (Canciones)
- [x] 1.2 Lectura tolerante con parámetros repetidos (mayúsculas, sin repetidos, tope 10), banderas exactas sin su campo ignoradas, rangos invertidos intercambiados
- [x] 1.3 Helpers: `hasCriteria(type, q, criteria)`, `criteriaToParams` (repetidos), `criteriaForTab(target, criteria)` (D8) y `isQuickSearchParams` (lo que `/search` acepta sin redirigir, D7)
- [x] 1.4 `params.ts`: `q` opcional con criterios en `parseCatalogSearchParams`; `400` solo sin `q` ni criterios
- [x] 1.5 Pruebas en `filters.test.ts` y del endpoint para listas, exactos, tope, otro tipo y sin criterios

## 2. Cláusulas de MusicBrainz

- [x] 2.1 `mb-query.ts`: consultas sin texto libre (solo cláusulas); `exact` como frase en el campo (`artist:`, `releasegroup:`, `recording:`)
- [x] 2.2 `country:(A OR B)`, `beginarea:"…"` sin acentos, varias categorías como `OR` de `CATEGORY_CLAUSE` en release-groups y recordings, `release:"…"` en recordings
- [x] 2.3 Pruebas en `mb-query.test.ts` por campo, sin texto, escapes y combinaciones

## 3. Coincidencias locales y servicios

- [x] 3.1 `local-match.ts`: candidatos por criterios sin texto (orden: discografía sincronizada, nombre/título; tope `LOCAL_LIMIT`), `exact` por igualdad de `search_key`, `country IN`, `area` por palabras completas, `category IN`, artista exacto acreditado
- [x] 3.2 `searchArtists`: `q` opcional, `offset`/`total`/`nextOffset`, filtro exacto sobre lo fusionado, sin redirección con criterios
- [x] 3.3 `searchAlbums`: `q` opcional, título y artista exactos, varias categorías (reaplicadas sobre la categoría mapeada)
- [x] 3.4 `searchSongs`: `q` opcional (sin filtro de relevancia del título), `album`/`albumExact` local y remoto, categorías sobre las apariciones, título y artista exactos
- [x] 3.5 Pruebas de servicio: sin texto, exactos, listas, fusión de la ciudad, paginación de Artistas y número de solicitudes a MusicBrainz

## 4. Endpoint y cliente

- [x] 4.1 `route.ts` y `src/lib/api/catalog.ts` con los criterios nuevos (repetidos) y `offset` en Artistas; `schemas.ts` con `total`/`nextOffset` en Artistas
- [x] 4.2 `LoadMoreResults` con `kind: "artist"`
- [x] 4.3 `route.test.ts`: `q` vacío con criterios → `200`; sin nada → `400`

## 5. Página `/search/advanced`

- [x] 5.1 `src/app/[locale]/(catalog)/search/advanced/page.tsx` y `loading.tsx`: pestañas como enlaces con `aria-current="page"` y `criteriaForTab`, formulario del tipo y resultados (reutilizando `ArtistResults`, `AlbumList`, `SongResults`, `LoadMoreResults` y el streaming local primero); sin criterios, solo el formulario
- [x] 5.2 Formularios por pestaña en `src/components/catalog/advanced-search/` (`GET`, dos columnas en escritorio y una en móvil, Buscar y Limpiar, valores desde la URL, envío sin campos vacíos)
- [x] 5.3 Selector de varios países (sobre `SearchablePicker`, con etiquetas que se quitan e inputs ocultos repetidos) y casillas de tipo de lanzamiento
- [x] 5.4 Aviso de consulta amplia sin nombre (total sobre 500)
- [x] 5.5 Breadcrumbs, título de la página y metadatos; `withClientMessages`
- [x] 5.6 Pruebas de componentes: pestañas y campos equivalentes, URL con repetidos y sin vacíos, Limpiar, sin JavaScript (nombres de campos), selector de países

## 6. Buscador rápido y Header

- [x] 6.1 `/search`: retirar `AdvancedSearchPanel`, `AdvancedSearchToggle`, `ActiveFilterChips` y `persistParams`; enlace "Búsqueda avanzada" junto al campo; redirección a `/search/advanced` con criterios avanzados (`isQuickSearchParams`)
- [x] 6.2 `ScopedSearchField`: "Búsqueda avanzada" del desplegable hacia `/search/advanced?type=<tipo>&q=<texto>`
- [x] 6.3 Actualizar las pruebas de `/search`, `SearchForm`, `SearchChrome` y `ScopedSearchField`; borrar las del panel y los chips

## 7. Textos y documentación

- [x] 7.1 Mensajes `es`/`en` (pestañas, etiquetas como en Metal Archives, ayudas, Limpiar, avisos) y retirar los del panel y los chips; `pnpm run i18n:client-messages`
- [x] 7.2 `docs/04-api/contracts.md` (`q` opcional, parámetros nuevos, paginación de Artistas)
- [x] 7.3 `docs/05-features/catalog-browsing.md` (búsqueda avanzada como página) y `docs/00-product/roadmap.md`
- [x] 7.4 Tras archivar: actualizar el `## Purpose` de `openspec/specs/advanced-search-filters/spec.md` (ya no es un panel)

## 8. Verificación

- [x] 8.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 8.2 Verificar con `next dev` desde el worktree: grupos chilenos de los 80, ciudad La Plata, Iron Maiden estudio 1983–1986 sin título, canciones de *Grace*, Kiss exacto, redirección de un enlace de la Fase 1, Header, pestañas, móvil y teclado
