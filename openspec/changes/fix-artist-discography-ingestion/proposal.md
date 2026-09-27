## Why

La discografía que guarda el catálogo está incompleta y mezclada, y el rediseño de la página
de artista (`redesign-artist-page`) no puede ordenarla en secciones sin datos correctos. Una
verificación contra MusicBrainz (2026-09-27) mostró que la ingesta hace **un solo browse de
100 release-groups, sin paginar y sin filtrar bootlegs**: Pink Floyd tiene 651 en
MusicBrainz (219 sin los que solo existen como bootleg) y guardamos 100 en un orden no
documentado, así que pueden faltar discos de estudio. Además, una discografía sincronizada
no se vuelve a consultar nunca (los discos nuevos no aparecen) y la ingesta descarta los
tipos de MusicBrainz, de modo que un EP no se distingue de un sencillo ni una banda sonora
de un disco en vivo.

## What Changes

- La ingesta de discografía pasa a un **browse paginado** (100 por página) con el filtro de
  estado que usa el sitio de MusicBrainz (`release-group-status=website-default`), que
  excluye los release-groups que solo tienen ediciones bootleg.
- Los release-groups **no oficiales** que ya estaban guardados y acreditados al artista se
  marcan como **fuera de la discografía** (no se borran: pueden tener escuchas, notas o
  colecciones de usuarios, y su página de álbum sigue funcionando).
- Se guardan los **tipos originales** de MusicBrainz (primario y secundarios) de cada
  release-group. La columna `category` y su `CHECK` no cambian: la siguen usando recorridos,
  la franja de discografía del álbum, la búsqueda y el descubrimiento.
- Nueva **clasificación en secciones de discografía**, derivada en código de los tipos
  originales y del rol del crédito: Principal (estudio y EP), En vivo, Recopilatorios,
  Sencillos, Otros y Apariciones.
- **Actualización periódica**: una discografía completa se vuelve a sincronizar en segundo
  plano cuando tiene más de 7 días, sin bloquear la página.
- **Artistas ya sincronizados** con el tope de 100: se completan en segundo plano en la
  próxima visita y con un script de backfill.
- Todas las lecturas de discografía (página de artista, API de artista, recorridos)
  **excluyen** los release-groups fuera de la discografía.

## Capabilities

### New Capabilities

- `artist-discography`: ingesta completa y paginada de la discografía de un artista sin
  bootlegs, tipos originales de MusicBrainz, clasificación en secciones, marca de
  release-groups fuera de la discografía y actualización periódica.

### Modified Capabilities

(ninguna: la presentación de la discografía cambia en `redesign-artist-page`)

## Impact

- **Esquema**: migración nueva (`0052_…`): tipos originales en `release_group`, marca de
  fuera de la discografía, marca de discografía completa en `artist`. Espejo en
  `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- **MusicBrainz** (`src/services/musicbrainz/client.ts`): el browse de release-groups por
  artista acepta `offset` y el filtro de estado.
- **Catálogo** (`src/services/catalog/ingest-discography.ts`): paginación, marca de no
  oficiales, sincronización en segundo plano, lectura con rol del crédito; función pura de
  secciones.
- **API**: `GET /api/catalog/artist/{id}` deja de devolver release-groups fuera de la
  discografía → `docs/04-api/contracts.md`.
- **Scripts**: backfill de discografías; smoke test contra BD de scratch.
- **Costo de MusicBrainz**: una request por cada 100 release-groups oficiales (Pink Floyd 3,
  Sabrina Carpenter 1, Los Bunkers 1), más la resincronización semanal en segundo plano.
- **Fuera de alcance**: la interfaz de la discografía (secciones, grilla, tabla) y dejar de
  mezclar la discografía de las bandas en la página de un solista, que hace
  `redesign-artist-page`; los recorridos siguen preseleccionando la categoría `studio`.
