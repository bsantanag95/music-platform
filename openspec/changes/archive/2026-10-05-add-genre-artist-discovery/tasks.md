## 1. Reglas y consultas de artistas (sin migración)

- [x] 1.1 En `src/services/genres/constants.ts` agregar `DISCOVER_MAX_ALBUMS` (5), `DISCOVER_MIN_AVG` (3,5), `DISCOVER_MIN_ARTISTS` (4) y `GENRE_DISCOGRAPHY_PREFETCH` (3); documentar en su comentario que se ajustan sin migración y que el umbral de 5 no se relaja para compensar la falta de datos
- [x] 1.2 Crear `src/services/genres/artist-known.ts` con `artistKnownCondition(readerId)`: un `EXISTS` por señal (sigue; valoró al artista o un álbum donde figura acreditado como principal o invitado; escucha del artista o de un álbum suyo; favorito o pendiente del artista o de un álbum suyo), correlacionado con `a.id`; sin lector devuelve `null`. Pruebas del SQL generado (cada señal presente, parámetros del lector, sin lector)
- [x] 1.3 En `src/services/genres/artists.ts` derivar por artista, con `LATERAL`, `own_albums` (créditos `primary` de categoría `studio`/`single_ep`), `discography_complete` (`artist.discography_complete_at IS NOT NULL`) y `debut_year` (el menor año, **solo** con discografía completa; si no, `NULL`); la discografía corta es `discography_complete AND own_albums BETWEEN 1 AND DISCOVER_MAX_ALBUMS`. Pruebas: las recopilaciones y los directos no cuentan; una discografía incompleta da debut `NULL` aunque tenga discos conocidos; **0 discos conocidos o discografía sin explorar no es corta**
- [x] 1.4 Agregar a `listGenreArtists` los filtros `country` (ISO-2), `debutDecade`, `shortOnly` y `hideKnown` (con `readerId`; sin lector se ignora) y los órdenes `recent` y `discover`, con la señal de comunidad solo como orden (álbum del género con ≥ `MIN_RATINGS_PER_ALBUM` valoraciones y media ≥ `DISCOVER_MIN_AVG`); validar país, década y orden con `VALIDATION_ERROR`; todos los órdenes con `a.id` de desempate
- [x] 1.5 Devolver en cada `GenreArtist` `discographyComplete`, el disco destacado (`featuredAlbum`: id, título, año) con una consulta `DISTINCT ON (artista)` solo para los artistas de la página (mayor media con ≥ 3 valoraciones o, si ninguno llega, el más reciente, entre sus álbumes `primary` `studio`/`single_ep` del subárbol) y, con lector, `known` y `following` calculados solo para esos artistas
- [x] 1.6 Pruebas de `listGenreArtists` (SQL renderizado): cada filtro y su combinación, cada orden nuevo, el filtro `conocidos=no` con y sin lector, que `known`/`following` no se devuelvan sin lector, el disco destacado y la paginación
- [x] 1.7 `listGenreArtistFacets(genreId)`: países (con conteo, de mayor a menor) y décadas de debut (solo artistas con debut conocido) presentes entre los artistas del género, en una consulta agrupada; pruebas

## 2. Completar discografías

- [x] 2.1 En `src/services/catalog/ingest-discography.ts` extraer el cuerpo del `after()` de `scheduleDiscographySync` a `runDiscographySync(artistId)` (sincronización completa y géneros de los álbumes, sin lanzar nunca) y exportarlo; el agendado existente lo usa sin cambiar su comportamiento y las pruebas existentes pasan sin modificarse
- [x] 2.2 Crear `src/services/genres/artist-prefetch.ts` con `scheduleGenreArtistsDiscographySync(artists)`: toma, en orden de aparición, hasta `GENRE_DISCOGRAPHY_PREFETCH` artistas con `discographyComplete` falso y `mbid` y los sincroniza uno tras otro en un solo `after()`, registrando el fallo de uno sin cortar a los demás; no hace nada si no hay candidatos. Pruebas: tope de 3, orden, sin candidatos, un fallo no corta, fuera de una request no lanza
- [x] 2.3 Llamar al agendado desde la pestaña Artistas y desde la sección «Artistas» del Resumen con los artistas mostrados (el riel «Para descubrir» solo tiene artistas con la discografía explorada: no tiene candidatos); la respuesta no espera

## 3. Riel «Para descubrir»

- [x] 3.1 Crear `src/services/genres/artist-discovery.ts` con `getGenreDiscoverArtists(genreId, readerId)`: elegibles (discografía corta y debut conocido, no conocidos si hay lector), orden `descubrir`, tope `GENRE_OVERVIEW_ARTISTS`, `[]` bajo `DISCOVER_MIN_ARTISTS`; pruebas de umbral, de la exclusión con y sin lector y de que el orden es el mismo para quien tiene las mismas acciones
- [x] 3.2 Medir con `EXPLAIN (ANALYZE)` la pestaña Artistas y el riel en `rock`, `electronic`, `progressive-rock` y `shoegaze` (scratch) contra el presupuesto de 800 ms; si se supera, aplicar las salidas del diseño en orden (CTE materializada del conjunto de artistas, luego limitar métricas a la página) y anotar la medición en `docs/05-features/genres.md`

## 4. Parámetros de URL y página

- [x] 4.1 En `src/services/genres/page-params.ts` leer y escribir `pais`, `debut`, `tam` y `conocidos`, y los valores `recientes` y `descubrir` de `orden` en la pestaña Artistas; lectura tolerante (valor inválido cae al predeterminado), solo se escribe lo no predeterminado, cambiar un filtro vuelve a la página 1; pruebas
- [x] 4.2 En `GenrePageSections.tsx` pasar el lector y los filtros a `listGenreArtists`, cargar las facetas para los selectores y agregar `GenreDiscoverSection` (riel); en `page.tsx` renderizar el riel en el Resumen, encima de «Artistas»

## 5. Interfaz

- [x] 5.1 `GenreFollowButton` (cliente): Seguir/Siguiendo con `followArtist`/`unfollowArtist`, actualización optimista y reversión si falla, `aria-pressed`; prueba (alternar, fallo, deshabilitado mientras guarda)
- [x] 5.2 Rediseñar `GenreArtistCard`: enlace al artista (foto, nombre, conteo), disco destacado como segundo enlace (título y año), «Ya lo conoces» como etiqueta de texto y el botón de seguir fuera de cualquier enlace; con la discografía sin explorar muestra «Discografía sin explorar» en lugar del conteo y sin disco destacado vacío; todo lo personal solo con sesión; pruebas con y sin sesión y con la discografía sin explorar
- [x] 5.3 Barra de filtros de la pestaña Artistas (`GenreArtistFilters`, cliente): país, debut, discografía corta, «que aún no conozco» (solo con sesión) y los órdenes nuevos; selectores solo con opciones reales; escribe en la URL con `router.replace` y degrada a formulario `GET` sin JavaScript; «Limpiar filtros»
- [x] 5.4 `GenreDiscoverRail` para el Resumen: tarjetas con las mismas marcas, subtítulo «Sin los artistas que ya conoces» solo con sesión, «Ver todo →» hacia `?tab=artists&orden=descubrir&tam=corta` (más `conocidos=no` con sesión); se omite sin elegibles; pruebas (con y sin sesión, subtítulo, enlace)
- [x] 5.5 Mensajes `catalog.genres.page.artists.*` en `messages/{es,en}/catalog.json` (filtros, órdenes, marcas, disco destacado, «Discografía sin explorar», riel y subtítulo) con paridad de claves
- [x] 5.6 Actualizar las pruebas existentes de `GenreArtistsView`, `GenreArtistCard` y `GenrePageSections` a las nuevas props

## 6. Documentación

- [x] 6.1 Actualizar `docs/05-features/genres.md`: parámetros nuevos, definición de «conocido», discografía explorada, corta y debut, riel «Para descubrir» con su umbral y subtítulo, disco destacado, completado en segundo plano, la distinción «exclusión por acciones explícitas ≠ afinidad inferida», las mediciones de 3.2 y el paso operativo del relleno
- [x] 6.2 Confirmar que no hay endpoints ni migraciones nuevos y que `docs/04-api/contracts.md` no necesita cambios (el botón usa los endpoints de `artist-following`)

## 7. Verificación y relleno

- [x] 7.1 Ampliar `scripts/smoke-test-genres.ts` contra Postgres real: artistas con discografía completa, parcial y sin sincronizar; debut y tamaño (el sin explorar no es corto), cada filtro y orden, «conocido» por cada señal (incluido un disco donde colabora), `conocidos=no`, disco destacado con y sin comunidad, el riel (umbral, exclusión, orden) y aislamiento entre personas; el agendado con `after()` simulado; limpiar los fixtures y documentar en `AGENTS.md`
- [x] 7.2 Agregar al relleno `scripts/backfill-artist-discography.ts` la opción `--genre-artists` (artistas con géneros semilla sin discografía completa, **incluidos los nunca sincronizados**, que hoy el script no toca); correrlo en scratch con `--limit 20` y luego completo; registrar cuántos artistas quedan con la discografía completa, cuánto tardó y cuánto creció `artist` (stubs de invitados) antes de repetirlo en la base real
- [x] 7.3 Verificación en navegador con el servidor de desarrollo del worktree (copiar `.env` con `DATABASE_URL` de scratch): pestaña Artistas anónimo y con sesión, seguir desde la tarjeta, «Discografía sin explorar», filtros en la URL, riel y subtítulo en el Resumen, móvil y escritorio
- [x] 7.4 `openspec validate add-genre-artist-discovery --strict` y `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` en verde

## 8. Ajustes tras la implementación

- [x] 8.1 Tarjeta estricta (D10): con `discographyComplete` falso dice siempre «Discografía sin explorar» (aunque `albumCount` > 0) y conserva el disco destacado si lo hay; actualizar `GenreArtistCard` y sus pruebas (el caso «sin explorar pero con álbumes conocidos» ahora muestra el rótulo)
- [x] 8.2 El riel completa su propia cobertura (D9.3): `getGenreDiscoverCompletionCandidates(genreId)` (artistas del género sin explorar y con MBID, por álbumes del género descendente, tope 3) y la sección `GenreDiscoverSection` programa su sincronización cuando el riel trae menos de 8 artistas; opción `unexploredOnly` en `listGenreArtists`; pruebas (riel lleno no programa, riel corto sí, sin candidatos, orden por álbumes del género)
- [x] 8.3 Escribir `docs/02-architecture/adr/0028-herencia-de-generos-materializada.md` (decisión D11, alternativas, consecuencias)
- [x] 8.4 Migración `drizzle/0060_inherited_genres.sql`: tabla `release_group_inherited_genre` (PK, índice por `genre_id`, FKs en cascada), función de recálculo idempotente, `rebuild_inherited_genres()`, relleno inicial desde la definición actual, triggers sobre `credit`, `artist_genre_seed` (por sentencia, con tablas de transición) y `genre` (cambio de `kind`), y la vista `release_group_effective_genre` redefinida con las mismas columnas y tipos; guardar la definición anterior de la vista en un comentario de reversión
- [x] 8.5 Espejo en `src/db/schema.ts` (tabla y tipo) y en `docs/03-data/sql-model.md` (tabla, triggers y vista)
- [x] 8.6 Aplicar `0060` en scratch y verificar equivalencia: la vista nueva contra la definición antigua (consulta con `EXCEPT` en ambos sentidos, vacía) sobre el catálogo ampliado de 58 mil release-groups
- [x] 8.7 Smoke: ampliar `scripts/smoke-test-genres.ts` con la herencia materializada (alta de crédito, baja, cambio de semillas del artista, cambio de `kind` de un género, álbum con semilla propia que reemplaza la herencia, voto que la reemplaza y su retiro) y la equivalencia con la definición antigua
- [x] 8.8 Re-medir los mismos cinco géneros (pestaña Artistas, riel, cifras, listado de álbumes) con el catálogo ampliado y anotar en `genres.md` y en D8 el resultado frente al presupuesto de 800 ms
- [x] 8.9 `openspec validate add-genre-artist-discovery --strict` y `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` en verde
