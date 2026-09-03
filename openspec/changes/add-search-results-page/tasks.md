## 1. Cliente MusicBrainz: búsqueda de álbumes

- [x] 1.1 Extender `src/services/musicbrainz/types.ts`: tipar `score`, `type` y `disambiguation`
  en los resultados de `MBArtistSearchResponse`; añadir `MBReleaseGroupSearchItem`
  (`id`, `title`, `primary-type`, `secondary-types`, `first-release-date`, `artist-credit`,
  `score`) y `MBReleaseGroupSearchResponse`.
- [x] 1.2 Añadir `musicbrainz.searchReleaseGroup(query)` en `src/services/musicbrainz/client.ts`
  (`GET /release-group?query=&limit=25&inc=artist-credits`), reutilizando `mbFetch` y la cola de
  rate limiting existente.
- [x] 1.3 Añadir/ajustar tests en `src/services/musicbrainz/mappers.test.ts` o un test nuevo del
  cliente para la nueva respuesta (mapa de categoría y año parcial vía `normalizeReleaseDate`).

## 2. Stub de release-group

- [x] 2.1 Añadir `upsertReleaseGroupStub(mbid, title, category)` (nuevo archivo
  `src/services/catalog/ingest-release-group.ts` o junto a `ingest-discography.ts`), espejo de
  `upsertArtistStub`: `INSERT ... ON CONFLICT (mbid) DO NOTHING ... RETURNING`, devolviendo la
  fila existente si ya está.
- [x] 2.2 Ajustar `upsertArtistFromMb` / un helper nuevo para crear stubs de artista desde la
  búsqueda con `type` real (`mapArtistType`) y `bio = disambiguation`, sin llamar a MusicBrainz.
- [x] 2.3 Tests de ambos stub-upserts (creación, idempotencia por `mbid`, no sobrescribe una
  fila enriquecida).

## 3. Servicio de búsqueda del catálogo (sin ingesta)

- [x] 3.1 Crear `src/services/catalog/search-catalog.ts` con `searchCatalog(q)` que: consulta
  local (`ilike` sobre `artist.name` y `releaseGroup.title`, límite ~10 por tipo); consulta
  MusicBrainz una vez por tipo (`searchArtist`, `searchReleaseGroup`); persiste stubs en una
  operación por tipo; resuelve ids locales; deduplica por `mbid`.
- [x] 3.2 Implementar el orden determinista (cacheados → resto locales → solo-MusicBrainz por
  `score`; coincidencia exacta al tope de su grupo) y el cálculo del flag `cached`.
- [x] 3.3 Implementar la degradación parcial: si MusicBrainz falla y hay resultados locales,
  devolverlos; si falla y no hay locales, propagar un error que el handler mapee a
  `INTERNAL_ERROR`.
- [x] 3.4 Definir el tipo de dominio `CatalogSearchResult` y no depender de filas de Drizzle
  fuera de la capa de servicios.
- [x] 3.5 Tests de `search-catalog`: mezcla local + MB, dedupe por `mbid`, orden, `cached`,
  sin coincidencias (lista vacía), MusicBrainz caído con y sin datos locales, verificación de
  que NO se llama a `findOrIngestDiscography` ni a browse de release-groups.

## 4. Endpoint `GET /api/catalog/search`

- [x] 4.1 Reescribir `src/app/api/catalog/search/route.ts`: validar `q` (`400 VALIDATION_ERROR`
  si falta/vacío), delegar en `searchCatalog`, responder `200 { results }`; sin `404` ni
  `ARTIST_NOT_FOUND`.
- [x] 4.2 Mapear el fallo total de MusicBrainz a `INTERNAL_ERROR` vía `withErrorHandling`.
- [x] 4.3 Reescribir `src/app/api/catalog/search/route.test.ts` cubriendo los escenarios de la
  spec `catalog-search` (lista con homónimos, lista vacía `200`, `400` sin `q`, degradación).

## 5. Contrato y schemas de frontend

- [x] 5.1 Añadir `CatalogSearchResultSchema` y `CatalogSearchResponseSchema`
  (`{ results: [...] }`) en `src/lib/api/schemas.ts`; retirar el uso de `ArtistSearchSchema`
  para la búsqueda (conservarlo solo si algún otro consumidor lo necesita, si no, eliminarlo).
- [x] 5.2 Actualizar `searchCatalog` en `src/lib/api/catalog.ts` para devolver la nueva forma
  validada por Zod.
- [x] 5.3 Actualizar `src/lib/api/catalog.test.ts`.

## 6. Página `/search` y componentes

- [x] 6.1 Convertir `src/app/[locale]/(catalog)/search/page.tsx` en Server Component que lee
  `searchParams.q`, y si viene no vacío llama a `searchCatalog` (servicio) en el servidor y
  renderiza `SearchResults`; si no, solo `SearchForm` vacío.
- [x] 6.2 Reescribir `src/components/catalog/SearchForm.tsx`: campo + validación local de
  entrada vacía; al enviar `router.push('/search?q=<consulta>')`; quitar estados de
  carga/no-encontrado/error y la navegación a `/artist/<id>`; conservar `initialQuery` como
  prellenado del campo (sin autoejecución client-side).
- [x] 6.3 Crear `src/components/catalog/SearchResults.tsx` (Client Component solo para la
  pestaña activa con `useState`): pestañas Todo / Artistas / Álbumes con rol y estado ARIA;
  filas de artista (enlace a `/artist/<id>`, nombre + tipo + disambiguation) y de álbum (enlace
  a `/release-group/<id>`, título + artista + año + `LazyCoverImage`); estado vacío propio.
- [x] 6.4 Ajustar `src/app/[locale]/(catalog)/search/loading.tsx` al nuevo layout de lista.
- [x] 6.5 Tests: `SearchForm.test.tsx` (navega a `/search?q=`, valida vacío), nuevo
  `SearchResults.test.tsx` (pestañas, filtrado, enlaces, estado vacío, a11y de pestañas).

## 7. Header

- [x] 7.1 Simplificar `src/components/layout/HeaderSearch.tsx`: quitar `searchCatalog` y el
  `try/catch` que navega a `/artist/<id>`; validar entrada no vacía y `router.push('/search?q=<consulta>')`.
- [x] 7.2 Reescribir `src/components/layout/HeaderSearch.test.tsx` según la spec `header-search`.

## 8. i18n

- [x] 8.1 Añadir/actualizar mensajes en los archivos `es` y `en`: títulos y etiquetas de
  pestañas, estado vacío de resultados, subtítulos de fila (tipo de artista, categoría de
  álbum), textos de carga. Retirar los mensajes de "primera importación" que ya no use la
  página de búsqueda (si los usa alguna vista destino, dejarlos).

## 9. Documentación

- [x] 9.1 Actualizar `docs/04-api/contracts.md`: nueva forma de `GET /api/catalog/search`
  (lista de resultados, `200` con lista vacía, sin `404`).
- [x] 9.2 Actualizar `docs/04-api/errors.md` si corresponde (`ARTIST_NOT_FOUND` deja de aplicar
  a este endpoint).
- [x] 9.3 Actualizar `docs/05-features/catalog-browsing.md` sección 1 ("Buscar artista" →
  "Buscar en el catálogo": lista de resultados, la ingesta ocurre al abrir un resultado).
- [x] 9.4 Añadir en `docs/00-product/roadmap.md` la nota de diferidos (autocompletado en Fase 6
  con su precondición; búsqueda de canciones; paginación y ranking) enlazando a
  `design.md` → *Trabajo futuro diferido*.

## 10. Verificación

- [x] 10.1 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` en verde.
- [ ] 10.2 Verificación manual (dev server): "Poison" y "Sabrina" muestran varias opciones;
  un artista ya cacheado aparece al tope; abrir un resultado frío dispara la ingesta en la
  vista destino con su estado de carga; búsqueda sin coincidencias muestra estado vacío (no
  error); el campo del Header siempre lleva a `/search?q=`.
- [x] 10.3 `openspec validate add-search-results-page --strict` en verde.
