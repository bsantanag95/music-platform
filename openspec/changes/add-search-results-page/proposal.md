## Why

Hoy `GET /api/catalog/search?q=` mezcla dos operaciones distintas: **busca** y además
**ingiere la discografía completa** del primer resultado de MusicBrainz (`results.artists[0]`).
Como consecuencia, una búsqueda ambigua resuelve la ambigüedad al azar: "Poison" puede llevar a
la banda de glam o a la de thrash; "Sabrina" lleva a una cantante registrada como `Sabrina` en
vez de a Sabrina Carpenter. El usuario nunca ve las alternativas ni elige. Además, cada búsqueda
paga la latencia de una ingesta completa aunque el usuario todavía no haya decidido qué abrir.

La búsqueda debe llevar siempre a una **página de resultados** que muestre todas las
coincidencias del texto ingresado y deje que la persona elija. La ingesta pesada se difiere al
momento en que se abre un resultado concreto — comportamiento que las vistas de artista y álbum
**ya implementan** bajo demanda.

## What Changes

- **BREAKING (contrato interno):** `GET /api/catalog/search?q=` deja de devolver
  `{ artist, releaseGroups }` y deja de ingerir discografías. Pasa a devolver una **lista de
  candidatos** (`{ results: [...] }`) combinando la base local y la búsqueda en vivo de
  MusicBrainz (`/artist?query=` y `/release-group?query=`), deduplicados por `mbid` y ordenados
  por relevancia (locales/cacheados primero). Una sola request a MusicBrainz por tipo; **cero**
  ingesta de discografía, tracklist o carátulas.
- Cada resultado de MusicBrainz que no exista localmente se persiste como **stub** en una única
  operación por tipo (`INSERT ... ON CONFLICT DO NOTHING`), reutilizando el patrón de stub que ya
  existe para artistas. Los stubs de artista se crean con su `type` real (la respuesta de
  búsqueda de MusicBrainz lo incluye), no como `unknown`. Se añade un stub-upsert equivalente
  para `release_group`. Así cada resultado enlaza directo a `/artist/<id>` o
  `/release-group/<id>` sin salto intermedio, y la base local se va poblando con cada búsqueda.
- La página `/search` deja de autonavegar al artista encontrado. Renderiza la **lista de
  resultados** con pestañas **Todo / Artistas / Álbumes**, más los estados ya definidos
  (validación, carga, sin resultados, error recuperable). `SearchForm` deja de resolver la
  navegación: envía a `/search?q=<consulta>` y la página server-side hace la búsqueda.
- `HeaderSearch` deja de intentar resolver la búsqueda y navegar a `/artist/<id>`: **siempre**
  navega a `/search?q=<consulta>`.
- Alcance explícitamente diferido (ver `design.md` → *Trabajo futuro diferido*):
  autocompletado / sugerencias en vivo, búsqueda de **canciones** (`recording`), paginación de
  resultados más allá de la primera página, y ranking de relevancia sofisticado. Cada uno se
  documenta con su motivo y su precondición.

## Capabilities

### New Capabilities

_Ninguna._ El cambio reformula requisitos de capacidades existentes.

### Modified Capabilities

- `catalog-search`: la búsqueda pública deja de resolver a un único artista y deja de disparar
  ingesta de discografía. Nuevo comportamiento del endpoint (lista de candidatos artista + álbum,
  stubs, orden por relevancia), de la página `/search` (lista de resultados con pestañas y
  estados) y de `SearchForm` (delega la búsqueda a la página, sin navegación propia).
- `header-search`: el campo del Header siempre navega a `/search?q=<consulta>`; se elimina el
  intento de resolver a `/artist/<id>` desde el propio Header.

## Impact

- **API:** `src/app/api/catalog/search/route.ts` (reescritura), `docs/04-api/contracts.md`
  (contrato de `GET /api/catalog/search`), `docs/04-api/errors.md` si cambian los códigos
  aplicables (`ARTIST_NOT_FOUND` deja de aplicar; una búsqueda sin coincidencias es lista vacía,
  no 404).
- **Servicios:** nuevo `src/services/catalog/search-catalog.ts` (resolver de búsqueda sin
  ingesta), `src/services/musicbrainz/client.ts` + `types.ts` (añadir `searchReleaseGroup` y
  tipar `score` / `disambiguation` / `type` en las respuestas de búsqueda),
  `src/services/catalog/ingest-artist.ts` y un nuevo stub-upsert de `release_group`.
- **Frontend:** `src/lib/api/catalog.ts` y `src/lib/api/schemas.ts` (`searchCatalog` devuelve
  lista; nuevo `CatalogSearchResultSchema`), `src/components/catalog/SearchForm.tsx` (reescritura),
  nuevo componente de lista de resultados en `src/components/catalog/`,
  `src/app/[locale]/(catalog)/search/page.tsx` y `loading.tsx`,
  `src/components/layout/HeaderSearch.tsx`, mensajes i18n (`es`/`en`).
- **Specs OpenSpec:** deltas de `catalog-search` y `header-search`.
- **Docs:** `docs/05-features/catalog-browsing.md` (sección "Buscar artista" → "Buscar en el
  catálogo"), `docs/00-product/roadmap.md` (nota de diferidos en Fase 3 / Fase 6).
- **Sin migración de base de datos:** `release_group` ya admite el stub (mbid único nullable,
  title, category). Los stubs de `recording` quedan fuera de alcance.
- **Pruebas:** `route.test.ts` del endpoint, tests de `SearchForm`, del componente de
  resultados y de `HeaderSearch` se reescriben.
