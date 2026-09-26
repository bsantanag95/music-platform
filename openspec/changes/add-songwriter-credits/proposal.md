## Why

Compositores y letristas son probablemente el crédito que más busca la gente, sobre todo en
pop, y hoy no existen en la plataforma: solo se ingieren créditos de **grabación**
(producción, instrumentos, voces, mezcla). En MusicBrainz la autoría cuelga de la **obra**
(*work*), no de la grabación. Una sonda contra la API confirmó que la request de edición que
ya hacemos devuelve obras y autores si se agrega `work-rels+work-level-rels` (*Eyes Wide
Open*, pista 1 → `writer`: Jerrod Bettis, Meghan Kabir, Audra Mae), así que traerlos **no
cuesta requests extra** ni presión sobre el límite de 1 request por segundo.

## What Changes

- **Ingesta**: `getRelease` suma `work-rels+work-level-rels`; se guardan obras (por MBID),
  el vínculo grabación ↔ obra y los créditos de autoría de cada obra (tabla propia).
- **Sincronización**: marca nueva `release.works_synced_at`; la sincronización diferida y
  el backfill existentes cubren también la autoría (misma request).
- **Pestaña Créditos**: sección **Composición** en la vista Por persona y grupo
  **Composición** primero en la vista Por canción.
- **Página de canción**: línea "Escrita por" bajo el artista.

## Goals

- Mostrar quién escribió cada canción, con una sola request por álbum.
- Modelar la obra como entidad propia (compartida entre versiones), para usos futuros.

## Non-Goals

- Editoriales (`publishing`), ISWC o derechos.
- Página propia de obra o listado "canciones escritas por" en el artista.
- Cambiar la clasificación de niveles de personal.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `personnel-credits`: ingesta, sincronización y lectura de autoría de obras.
- `catalog-album`: pestaña Créditos (disponible con autoría), grupo Composición en la vista
  por canción y sección Composición en la vista por persona.
- `catalog-song`: línea "Escrita por".

## Impact

- **Esquema**: migración nueva `0049_work_credits.sql` (tablas `work`, `recording_work`,
  `work_credit`; columna `release.works_synced_at`) + espejo en `src/db/schema.ts` +
  `docs/03-data/sql-model.md`.
- **MusicBrainz**: `src/services/musicbrainz/client.ts` (`inc` de `getRelease`) y `types.ts`.
- **Servicios**: `personnel-credits.ts` (mapeo y guardado de obras, sincronización),
  `personnel-levels.ts` (lectura), servicio de canción (autores de una grabación).
- **UI**: `AlbumCredits.tsx`, página de canción; i18n es/en.
- **Scripts**: `backfill-personnel-credits.ts`, `smoke-test-personnel-credits.ts` y sus
  instrucciones de limpieza en `AGENTS.md`.
- Sin endpoints REST nuevos ni cambios de contrato.
