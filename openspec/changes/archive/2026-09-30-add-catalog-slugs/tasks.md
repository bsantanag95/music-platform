## 1. Módulo de slug e id (`src/lib/slug.ts`)

- [x] 1.1 Implementar `encodeId(uuid)` / `decodeId(str)` en base58 sobre `BigInt`, relleno a 22 caracteres con `1`, rechazando longitud distinta, caracteres fuera del alfabeto y valores ≥ 2^128
- [x] 1.2 Implementar `slugify(text)` según el diseño (NFD → quitar U+0300–U+036F → NFC → minúsculas → mapa `ø đ ł æ œ ß þ` → apóstrofos sin separador → `-` para lo que no sea `\p{L}\p{N}\p{M}` → colapsar y recortar) y `truncateSlug(slug, max)` por puntos de código cortando en límite de palabra
- [x] 1.3 Implementar `buildSegment(slug, uuid)` (segmento solo con el id si el slug queda vacío) y `parseCatalogSegment(segment)` → `{ id, form: "encoded" | "legacy" } | null`
- [x] 1.4 Pruebas unitarias: ida y vuelta con UUID aleatorios, con ceros a la izquierda y con el máximo; ids inválidos (longitud, `0OIl`, valor ≥ 2^128); minúsculas de un id que dan 404 y nunca otra entidad; slugify con `Mötley Crüe`, `Guns N' Roses`, `AC/DC`, `Кино`, `宇多田ヒカル` (kana con dakuten íntegro), `방탄소년단` (hangul íntegro), un nombre solo de símbolos, tope de 30/60 y palabra única más larga que el tope; parseo con slug con guiones, solo id, UUID hexadecimal y segmentos inválidos

## 2. Helpers de enlace y artista principal

- [x] 2.1 Crear `src/lib/catalog-links.ts` con `artistHref`, `albumHref`, `songHref`, `listHref` y `reviewHref` (rutas sin locale para el `Link` de `@/i18n/navigation`) más la variante con locale para `redirect` de servidor; `artistName: string | null` obligatorio en álbum y canción; artista `various` o `null` produce slug solo de título
- [x] 2.2 Implementar el resolvedor por lotes `resolvePrimaryArtists` para `release_group` y `recording` en `src/services/catalog/` (primer crédito `primary` por `position`, `featured` fuera, tipo `various` marcado), una consulta por lote
- [x] 2.3 Pruebas: helpers (segmento canónico, `null`, `various`, colaboración con `featured`, título largo) y resolvedor (orden por posición, lote vacío, lote mixto)

## 3. Canonicalización en las páginas

- [x] 3.1 Crear `resolveCatalogRoute` (servidor): compara segmento decodificado y NFC contra el canónico y hace `permanentRedirect` a `/{locale}/{tipo}/{canónico}{subruta}?{query}` conservando locale, subruta y todo el query
- [x] 3.2 Verificar cómo entrega Next 15 el parámetro con caracteres no ASCII (percent-encoded) y fijarlo con una prueba con un nombre Unicode, para descartar bucles de redirección
- [x] 3.3 Artista: reemplazar `isValidUuid(id)` por `parseCatalogSegment` y canonicalizar en `(tabs)/page.tsx`, `biography`, `members`, `lists` y `layout.tsx` (el layout solo parsea)
- [x] 3.4 Álbum: ídem en `(tabs)/page.tsx`, `credits`, `editions`, `reviews`, `lists` y `layout.tsx`; el modal `@modal/(..)(..)review/[reviewId]` solo parsea, sin redirigir
- [x] 3.5 Canción: ídem en `song/[id]/page.tsx` y `lists/page.tsx`, incluida `generateMetadata`
- [x] 3.6 Actualizar las pruebas de páginas existentes (`artist-pages`, `album-pages`, `song/page.test`) para pasar segmentos con slug y cubrir el 308 desde UUID hexadecimal, desde slug viejo y desde id pelado, con pestaña y query conservados
- [x] 3.7 Prueba que recorre las páginas de catálogo y falla si alguna no llama a `resolveCatalogRoute` (o a `parseCatalogSegment` en el caso del layout y del modal)

## 4. Migración de enlaces de artista, álbum y canción

- [x] 4.1 Crear el test de cumplimiento `catalog-links.enforcement.test.ts` (regex que exige comilla o backtick antes de `/artist|album|song|review`, con o sin `/${locale}`; no confunde `/api/catalog/artist/${`) con una lista de excepciones inicial que contiene todos los sitios actuales
- [x] 4.2 Ampliar los servicios que alimentan tarjetas, resultados de búsqueda, discografía, camino, colecciones y feed para traer el artista principal (`search/albums.ts`, `camino.ts`, `artist-discography-view.ts`, `feed/ambient.ts`, etc.)
- [x] 4.3 Migrar los enlaces de artista a `artistHref` (cabecera, integrantes, "también en", tiles, búsqueda, seguidos, journeys, camino, favoritos)
- [x] 4.4 Migrar los enlaces de álbum a `albumHref` (`AlbumCard`, `AlbumResults`, `DiscographyStrip`, `ArtistDiscography`, `ReleaseRail`, colecciones, listas, camino, `WantedShelf`, breadcrumbs, cabeceras)
- [x] 4.5 Migrar los enlaces de canción a `songHref` (`TrackList`, `SongGroupPanel`, `SongVersions`, `SongTrackStrip`, `SongAppearances`, créditos, `EditionExtraTracks`)
- [x] 4.6 Migrar las redirecciones de servidor (`/search` por coincidencia exacta única a `artistHref`, `feed-target.ts`, `feed/ambient.ts`) y las rutas que arman `?from=search&q=`
- [x] 4.7 Ajustar las pruebas de componentes que aserten `href` con UUID (`AlbumCard`, `ArtistDiscography`, `ScopedSearchField`, etc.)

## 5. Listas y reseñas

- [x] 5.1 Localizar el nombre de la lista y el usuario en los ~9 sitios de enlace público (`CommunityListCard`, `DiscoverListsTab`, `PublicLists`, `CollectionRail`, `FeedActivityList`, `TrackedCaminosList`, …) y migrarlos a `listHref`; `/me/lists/[listId]` queda con UUID
- [x] 5.2 `users/[username]/lists/[listId]/page.tsx`: parsear el segmento, mantener `redirectIfRenamed` antes de canonicalizar, y pasar el UUID decodificado a la redirección del dueño hacia `/me/lists/{id}`; pruebas incluidas
- [x] 5.3 Reseñas: parsear y canonicalizar en `review/[reviewId]/page.tsx` (incluida `generateMetadata`) y migrar `ReviewComposer`, `ReviewIndex` y `ReviewModal` a `reviewHref`
- [x] 5.4 Ampliar el read-model de reseñas vecinas para devolver el segmento canónico de la anterior y la siguiente y usarlo en `ReviewModal`; el enlace "página completa" del modal usa `reviewHref` con locale
- [x] 5.5 Pruebas: `review/[reviewId]/page.test`, lista pública (segmento con slug, 308 desde UUID, usuario renombrado) y `ReviewModal`/`ReviewIndex`

## 6. Cierre del cumplimiento y documentación

- [x] 6.1 Vaciar la lista de excepciones del test de cumplimiento y confirmar que pasa sin ellas
- [x] 6.2 Escribir el ADR 0022 (formato `slug-<id>`, base58 de 22 caracteres, canonicalización 308, límites conocidos: mayúsculas y homónimos) sin reescribir el ADR 0007
- [x] 6.3 Actualizar `docs/02-architecture/conventions.md`, `docs/04-api/contracts.md` (la API sigue con UUID), `docs/05-features/*` y `docs/02-architecture/frontend-plan/*` que nombren `/artist/[id]` o el UUID como segmento; aclarar en `code-walkthrough.md` el nuevo parseo
- [x] 6.4 Ejecutar `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 6.5 Correr contra una BD de scratch (`DATABASE_URL` distinto + `ALLOW_SMOKE_ON_REAL_DB=1`) los smoke tests de rutas y de discografía por el resolvedor de artista principal, y resetear cualquier fixture si se usó la BD real
- [x] 6.6 Verificación manual en el navegador: artista, álbum, canción, una lista y una reseña (abierta como modal y recargada); UUID viejo, slug desactualizado, id en minúsculas (404), nombre cirílico y locale `en`
