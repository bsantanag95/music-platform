## Why

La dirección `redefine-content-hierarchy` establece el álbum como unidad de crítica del
producto, pero eso solo se sostiene si "el álbum" es un objeto canónico bien definido. Hoy
no lo es: `findOrIngestTracklist` elige la edición a mostrar con
`releases.find(status === "Official") ?? releases[0]` —la primera oficial, o la primera a
secas—, lo cual **no es determinista** (depende del orden que devuelva MusicBrainz), puede
caer en una deluxe, un remaster o una edición regional con bonus tracks, y **congela** esa
elección para siempre (`if (existing) return existing`). Además `editionLabel` se guarda
siempre como `"original"` sin importar qué se eligió, la fecha del álbum es la de esa
edición y no la del release-group (un reissue de 2015 hace que un disco de 1994 figure
como 2015), y `release_group.category` —que ya distingue `studio` de `compilation` /
`live_other` / `single_ep`— no se expone en el detalle de álbum, así que una recopilación
o un disco en vivo se presentan como si fueran un álbum de estudio.

La capa social ya es canónica: `rating`, `favorite`, `comment`, `listen_entry`,
`user_list_item`, `user_pinned_item` y `collection_entry` apuntan todos a
`release_group_id`. Esta corrección es de **catálogo e ingesta**, no de datos sociales.

## What Changes

- **Selección determinista de edición representativa** en `findOrIngestTracklist`: una
  función de ranking documentada sobre los `releases` del release-group que prefiere, en
  orden, estado `Official` → fecha más temprana → edición estándar (sin marcadores
  `deluxe` / `expanded` / `anniversary` / `remaster` en título o disambiguation) → país
  primario (`[Worldwide]` / `XW` / `US` / `GB` / `XE`) → empaquetado estándar → recuento
  de pistas cercano a la mediana del grupo. Desempate final por `mbid` para estabilidad
  entre ingestas.
- **`editionLabel` real**: derivado de la disambiguation / sufijo de título del release
  elegido; `"standard"` cuando es una edición corriente, en vez del `"original"` fijo
  actual.
- **Fecha de lanzamiento canónica en el release-group**: nuevas columnas
  `release_group.first_release_date` (DATE, nullable) y `release_group.first_release_year`
  (SMALLINT, nullable), pobladas desde `first-release-date` de MusicBrainz con la misma
  tolerancia a precisión parcial que `release-date-precision`. El detalle de álbum, la
  búsqueda y la discografía leen la fecha/año canónico del release-group; la edición
  ingerida conserva su propia `release_date` como dato de la edición. **Cierra el trabajo
  pendiente de `release_year` que `release-date-precision` dejó documentado.**
- **`category` expuesta y visible como tipo de obra**: el read-model de álbum
  (`getAlbumDetail`), la respuesta de `GET /api/catalog/release-group/{id}` y la página de
  álbum incluyen la categoría; la vista muestra una etiqueta de tipo localizada para
  `compilation`, `live_other` y `single_ep`, y no muestra nada extra para `studio`. Sin
  datos nuevos: `category` ya existe y ya se ingiere.
- **Camino de corrección / re-selección**: función de servicio + script
  (`scripts/recanonicalize-release-group.ts`) que reevalúa la edición representativa de un
  release-group y reemplaza sus filas `release` / `track` de forma idempotente **sin tocar
  ninguna fila social** (todas cuelgan del release-group). Para diagnóstico, un modo
  `--dry-run` que reporta qué edición elegiría sin escribir.
- **Discografía de artista ordenada por fecha canónica**: dentro de cada categoría, las
  tarjetas se ordenan por `first_release_year` ascendente (las sin año, al final) y
  muestran el año.
- **BREAKING (contrato REST)**: `GET /api/catalog/release-group/{id}` añade `category`,
  `firstReleaseDate` y `firstReleaseYear` al objeto de respuesta, y `release.editionLabel`
  puede devolver valores distintos de `"original"`. Es aditivo salvo por `editionLabel`;
  se actualiza la documentación del endpoint.

### Non-Goals

- **Ingesta de múltiples ediciones** por álbum ni un selector de edición en la UI. Se
  ingiere una sola edición representativa; el modelo queda preparado (la corrección
  reemplaza, no acumula) pero el multi-edición es un cambio posterior.
- Reseñas como entidad propia, descubrimiento de álbumes, "seguir artista" u otras piezas
  de `redefine-content-hierarchy`.
- Backfill histórico de `bio`, géneros o cualquier dato ajeno a fecha / edición /
  categoría.
- Cambiar cómo se resuelve la carátula (ya es canónica a nivel de release-group).

## Capabilities

### New Capabilities

- `album-edition-selection`: cómo se elige la edición representativa de un release-group
  (función de ranking determinista), cómo se deriva su `editionLabel`, y el camino de
  re-canonicalización que corrige la elección sin afectar datos sociales.

### Modified Capabilities

- `catalog-album`: el detalle expone `category`, `firstReleaseDate` y `firstReleaseYear`
  del release-group; la vista muestra la etiqueta de tipo de obra; la "edición
  seleccionada" pasa a estar definida por `album-edition-selection` en vez de "primera
  oficial o primera".
- `release-date-precision`: se implementa la evolución `release_year` pendiente, ubicada
  en el release-group (`first_release_year`) además de `first_release_date`; la interfaz
  muestra el año cuando no hay fecha exacta.
- `catalog-artist`: la discografía se ordena por la fecha canónica del release-group
  dentro de cada categoría y muestra el año en cada tarjeta.

## Impact

- **Migración SQL nueva**: `ALTER TABLE release_group ADD COLUMN first_release_date DATE`,
  `ADD COLUMN first_release_year SMALLINT` + índice para orden de discografía; espejo en
  `src/db/schema.ts`. Sin cambios en tablas sociales.
- **Servicios**: `src/services/catalog/ingest-release.ts` (ranking de edición,
  `editionLabel`), `src/services/catalog/ingest-release-group.ts` y
  `ingest-discography.ts` (poblar fecha/año canónico), `src/services/catalog/album-detail.ts`
  (exponer campos nuevos), `src/services/musicbrainz/types.ts` y `client.ts` (tipar
  `first-release-date` y campos de release necesarios para el ranking: `status`, `date`,
  `country`/`release-events`, `packaging`, `disambiguation`, `media.track-count`).
- **API / contrato**: `src/lib/api/schemas.ts` (`ReleaseGroupSchema`,
  `ReleaseWithTracksSchema`), ruta `GET /api/catalog/release-group/{id}` y documentación
  del endpoint en `docs/`.
- **UI**: página de álbum (`src/app/[locale]/(catalog)/album/[id]`), tarjetas de
  discografía (`src/components/catalog`), mensajes i18n (`album`, `artist` namespaces) para
  las etiquetas de tipo de obra y el año.
- **Script**: `scripts/recanonicalize-release-group.ts` (nuevo) y nota en `docs/` sobre
  cuándo correrlo; relación con el `scripts/backfill-release-credits.ts` existente.
- **Presupuesto MusicBrainz**: el ranking necesita más datos del release-group. Se amplía
  el `inc` de `getReleaseGroup` (`releases` → añadir campos de release / `release-events`);
  sigue siendo **una** llamada por álbum en la primera visita, dentro de la política de
  ingesta (fresco, no cacheado como búsqueda).
- **Riesgo**: álbumes ya ingeridos con una edición subóptima no cambian solos — requieren
  correr el script. Se documenta y se puede correr por lotes.
