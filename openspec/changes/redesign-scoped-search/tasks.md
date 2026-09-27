## 1. Base de datos

- [x] 1.1 Crear `drizzle/0050_search_trigram_indexes.sql`: extensiones `pg_trgm` y `unaccent`, función inmutable `search_normalize(text)`, índices GIN trigram sobre `artist.name`, `release_group.title`, `recording.title`, `app_user.username` y `app_user.display_name`
- [x] 1.2 En la misma migración, corregir `artist.type = 'various'` → `'unknown'` para todo `mbid` distinto de Various Artists
- [x] 1.3 Reflejar la función e índices en `src/db/schema.ts` (índices de expresión) y documentarlos en `docs/03-data/sql-model.md`, incluido el requisito de extensiones
- [x] 1.5 (surgida en la implementación) `drizzle/0051_artist_search_key.sql`: función `search_key` (misma regla de puntuación que `normalizeSearchText`) e índice B-tree sobre `search_key(artist.name)` para la detección de artista en extremos; llama a `public.search_normalize` calificado (PostgreSQL 17+ evalúa funciones de índice con `search_path` restringido)
- [x] 1.4 Aplicar con `pnpm run db:migrate` en local y verificar con `EXPLAIN` que las consultas de D2 usan los índices

## 2. Utilidades de coincidencia

- [x] 2.1 `src/services/catalog/search/normalize.ts`: `normalizeSearchText` y tokenización, con tests de tabla (Motörhead, AC/DC, Guns N' Roses, espacios)
- [x] 2.2 `local-match.ts`: consulta local por columna con filtro trigram/contención y orden exacta → palabra completa → prefijo → similitud antes del `LIMIT`; test de integración del caso "icon" (Icon antes que Despised Icon antes que Ennio Morricone)
- [x] 2.3 `coverage.ts`: `rankByCoverage` con los cuatro niveles y desempates, tests para `kiss destroyer`, `destroyer kiss`, `dokken kiss of death` (Dokken antes que New Order) y separador ` - `
- [x] 2.4 `activity.ts`: `activityScores` por tipo (álbum, artista, canción) en una consulta por tipo, con tests
- [x] 2.5 Explorar con un script en el scratchpad la sintaxis real de MusicBrainz para `type:`, `primarytype`/`secondarytype`, `firstreleasedate` y campos con separador; fijar las consultas en tests unitarios del constructor de queries

## 3. Cliente de MusicBrainz y stubs

- [x] 3.1 Agregar `offset` y `limit` opcionales a `searchArtist`, `searchReleaseGroup` y `searchRecording` en `src/services/musicbrainz/client.ts`, incluidos en la clave de caché; tests
- [x] 3.2 `upsertArtistStubsFromSearch`: guardar `unknown` cuando MusicBrainz no trae `type`; test del caso sin tipo

## 4. Servicios por tipo

- [x] 4.1 `search/artists.ts`: `searchLocal`, `searchRemote` (1 solicitud, filtro `artistType`), `merge` con orden del spec y cálculo de coincidencias exactas; tests de orden, homónimos (KISS) y degradación `remoteFailed`
- [x] 4.2 `search/albums.ts`: local + 1 solicitud remota, cobertura, filtros `category`/`decade`, `total`/`nextOffset`, créditos de stubs como hoy; tests
- [x] 4.3 `search/songs.ts`: detección de interpretaciones en extremos (máx. 2, orden por relevancia), reutilizar el mecanismo `rgid:` y la unión de apariciones existentes, agrupación por (canción, artista), `interpretation` y `alternatives`; tests para Dokken, Sabrina Carpenter taste, Stairway to Heaven, bootleg y consulta sin canción
- [x] 4.4 Presupuesto: tests que cuentan solicitudes al cliente mockeado por tipo (Artistas 1, Álbumes 1, Usuarios 0, Canciones ≤ tope) y que Artistas nunca resuelve grabaciones
- [x] 4.5 Retirar `searchCatalog`, `interleave` y `deriveSongQuery` de `search-catalog.ts` una vez migrados todos los consumidores

## 5. API

- [x] 5.1 Reescribir `GET /api/catalog/search` con validación de `type`, `q`, `offset` y filtros (400 `VALIDATION_ERROR`), envuelto en `withErrorHandling`; actualizar `route.test.ts`
- [x] 5.2 Nuevo `GET /api/search/suggest` (local, máx. 6, puente artista + título, usuarios activos, `Cache-Control` privado); tests incluido "no llama a MusicBrainz"
- [x] 5.3 Esquemas Zod (unión discriminada por `type` y sugerencias) en `src/lib/api/schemas.ts` y funciones en `src/lib/api/catalog.ts`
- [x] 5.4 Actualizar `docs/04-api/contracts.md` (nuevo contrato y endpoint de sugerencias) y `docs/04-api/errors.md` si cambia la validación

## 6. Campo de búsqueda con tipo y sugerencias

- [x] 6.1 `src/components/catalog/search-types.ts`: `SearchType`, `parseSearchType` con mapeo de valores heredados; tests
- [x] 6.2 `ScopedSearchField` (variantes compacta y completa): selector de tipo accesible, placeholder por tipo, combobox ARIA, teclado (flechas, Enter, Escape, Tab sin reasignar), acciones "Ver todos" y "Buscar en otro tipo", falla silenciosa de sugerencias; tests de Testing Library
- [x] 6.3 `HeaderSearch` usa la variante compacta: arranca y vuelve a Artistas, se vacía tras navegar, sugerencia navega a la entidad; actualizar `HeaderSearch.test.tsx`
- [x] 6.4 `SearchForm` usa la variante completa con el tipo de la URL; `recent-searches` guarda `{ q, type }` y lee entradas antiguas como Artistas; actualizar tests

## 7. Página de resultados

- [x] 7.1 `/search/page.tsx`: leer `type`, `q`, `all`, `offset` y filtros; ejecutar solo el tipo pedido; redirección por coincidencia exacta única (Artistas) y username exacto (Usuarios)
- [x] 7.2 Reemplazar pestañas por el resumen con accesos "Buscar en otro tipo" y estado vacío con esos accesos; eliminar `search-tabs.ts`
- [x] 7.3 Artistas: tarjeta "Mejor coincidencia", sección "Otros artistas llamados «q»", filtro Todos/Persona/Grupo en la URL
- [x] 7.4 Álbumes: streaming local → fusionado con `Suspense`, filtros categoría/década, sugerencia para acotar con atajos de artista, "Cargar más" con `useInfiniteQuery`
- [x] 7.5 Canciones: grupos (canción, artista) reutilizando la presentación de `SongContextSection`, primer grupo expandido, interpretación visible con alternativas, "Cargar más"
- [x] 7.6 Usuarios: resultados con las tarjetas y acciones sociales de `UserSearch` (reutilizar componentes, sin duplicar la lógica)
- [x] 7.7 Aviso "Faltan resultados de MusicBrainz" con "Reintentar" cuando `remoteFailed`
- [x] 7.8 `SearchOriginNotice` en la página de artista cuando llega `from=search` ("¿No era este?" → `all=1`)
- [x] 7.9 Actualizar `SearchResults.test.tsx` y tests de la página para cada tipo

## 8. Consumidores e i18n

- [x] 8.1 `useCatalogSearch` recibe el tipo; `AlbumIdentityPicker` y `NowPlayingPicker` piden `album`/`artist` según corresponda; actualizar sus tests
- [x] 8.3 (surgida en la implementación) `RegisterListenDialog` (registrar escucha desde el Header) también consumía la búsqueda mezclada: conmutador de tipo Álbum/Canción/Artista (`SearchTypeToggle`), álbum por defecto; de Canciones solo es registrable la canción resuelta
- [x] 8.2 Mensajes nuevos en `messages/es` y `messages/en` (tipos, placeholders, acciones, mejor coincidencia, interpretación, aviso remoto, sugerencia para acotar, "¿No era este?"); eliminar claves de pestañas sin uso

## 9. Documentación y verificación

- [x] 9.1 Actualizar `docs/02-architecture/code-walkthrough.md` (flujo de búsqueda por tipo) y la mención de búsqueda en `docs/00-product/roadmap.md` si corresponde
- [x] 9.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 9.3 Smoke tests de `catalog/` relevantes contra una BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1` + otro `DATABASE_URL`); si se usó la BD real, resetear artistas tocados y borrar fixtures
- [x] 9.4 Verificación manual en el navegador: `icon`, `KISS`, `Sabrina Carpenter` (redirección + "¿No era este?"), `kiss destroyer`, `destroyer`, `dokken kiss of death`, un username exacto, sugerencias con teclado, viewport móvil, y conteo de solicitudes a MusicBrainz en los logs
