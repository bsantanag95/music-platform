## 1. Lectura de parámetros

- [x] 1.1 En `src/services/catalog/search/params.ts`, agregar `AdvancedFilters` (por tipo) y `parseAdvancedFilters(type, params)`: país en mayúsculas `^[A-Z]{2}$`, años 1000–2100 (Artistas) / 1900–2100 (Álbumes), duración 0–7200 s, `ended` `0|1`, `artist` recortado de 1 a 200 caracteres, rangos invertidos intercambiados, vacíos y filtros de otro tipo ignorados
- [x] 1.2 Regla rango > década: con `yearFrom`/`yearTo`, `decade` queda `undefined`
- [x] 1.3 Sumar los filtros a `CatalogSearchParams` / `parseCatalogSearchParams` (tolerantes, sin `400`)
- [x] 1.4 Helper `activeFilterCount` y `filtersForType(target, filters)` (solo los compatibles: `artist` entre Álbumes y Canciones)
- [x] 1.5 Pruebas unitarias de `params.test.ts` para cada valor válido, inválido, invertido, vacío y de otro tipo

## 2. Cláusulas de MusicBrainz

- [x] 2.1 En `mb-query.ts`, `artistQuery` con `country:XX`, `begin:[A TO B-12-31]` (extremo abierto `*`) y `ended:true|false`
- [x] 2.2 `releaseGroupQuery` con rango `firstreleasedate:[A TO B-12-31]` y `artist:"…"` escapado con `escapeLucenePhrase`
- [x] 2.3 Consulta de recordings con `dur:[ms TO ms]` y artista explícito
- [x] 2.4 Pruebas en `mb-query.test.ts`: cada cláusula, extremos abiertos, escape de `AC/DC` y comillas, combinación con categoría

## 3. Condiciones locales y servicios

- [x] 3.1 `matchLocalArtists`: `country`, año de `life_begin` (`substr(…,1,4)`) y `life_ended`; fila sin el dato no coincide
- [x] 3.2 `searchArtists`: aplicar el filtro sobre la entrada fusionada local + MusicBrainz (dato local o, si falta, remoto) y desactivar `uniqueExactArtist` con cualquier filtro activo
- [x] 3.3 `matchLocalReleaseGroups` / `searchAlbums`: rango de años y existencia de un crédito principal cuyo artista coincide con `artist` (mismo `fuzzyMatch`)
- [x] 3.4 `searchSongs`: con `artist`, interpretación fija (texto = título, artista resuelto con `findArtistsByKeys`), sin `artistCandidates` y con una sola búsqueda de recordings; `durMin`/`durMax` sobre cada grabación antes de agrupar (sin duración conocida no pasa)
- [x] 3.5 Pruebas de servicio (`artists.test.ts`, `albums.test.ts`, `songs.test.ts`): filtros en ambas fuentes, dato faltante, fusión, sin redirección, número de solicitudes a MusicBrainz (una en Artistas con `country`; ninguna búsqueda de artistas con `artist` en Canciones)

## 4. Endpoint

- [x] 4.1 `src/app/api/catalog/search/route.ts`: pasar los filtros a cada búsqueda y conservarlos en `nextOffset`
- [x] 4.2 `route.test.ts`: filtros válidos aplicados, inválidos ignorados con `200`

## 5. Página y panel

- [x] 5.1 `page.tsx` / `sections.tsx`: leer los filtros, pasarlos a cada sección y extender `searchHref` (Cargar más y pastillas conservan los filtros; la pastilla de década quita el rango)
- [x] 5.2 Componente cliente `AdvancedSearchPanel`: botón **Filtros · n** con `aria-expanded`/`aria-controls`, panel desplegable debajo del campo, `<form method="get">` con `type` y `q` ocultos, campos por tipo (selector de país con `Intl.DisplayNames`, años, estado, artista, duración `m:ss`), envío que quita campos vacíos y quita `decade`; abierto con `filters=1` o filtros activos; oculto en Usuarios
- [x] 5.3 `SearchForm`: ubicar el botón a la derecha del campo `full`, también en móvil
- [x] 5.4 `ActiveFilterChips` debajo del resumen: un chip por filtro con enlace que lo quita y **Quitar filtros**; estado vacío con **Quitar filtros**
- [x] 5.5 Accesos "Buscar en otro tipo" (resumen y estado vacío) con `filtersForType`
- [x] 5.6 Pruebas de componentes (`search-results.test.tsx`, nuevo `AdvancedSearchPanel.test.tsx`): contador, apertura, URL sin vacíos, chips, cambio de tipo

## 6. Header

- [x] 6.1 `ScopedSearchField`: acción **Búsqueda avanzada** en el desplegable (Artistas, Álbumes, Canciones) hacia `/search?type=<tipo>&q=<texto>&filters=1`, con navegación por teclado igual que las demás acciones
- [x] 6.2 Prueba en `ScopedSearchField.test.tsx` / `HeaderSearch.test.tsx`

## 7. Textos y documentación

- [x] 7.1 Mensajes `es`/`en` (panel, etiquetas con la aclaración de nacimiento/formación y separados/fallecidos, chips, Quitar filtros, Búsqueda avanzada) y `pnpm run i18n:client-messages`
- [x] 7.2 `docs/04-api/contracts.md`: parámetros nuevos de `GET /api/catalog/search`
- [x] 7.3 `docs/05-features/catalog-browsing.md` (sección de búsqueda) y `docs/00-product/roadmap.md` (Fase 1 de búsqueda avanzada resuelta; Fases 2 y 3 pendientes)

## 8. Verificación

- [x] 8.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 8.2 Verificar en el navegador con `next dev` desde el worktree: los escenarios de la spec (Soda Stereo con `country=AR` y los 80, Iron Maiden 1983–1986, Hallelujah de Jeff Buckley ≤ 7:00), panel en móvil, teclado y lector de pantalla del botón, acción del Header
