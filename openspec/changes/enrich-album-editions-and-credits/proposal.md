## Why

El rediseño de la página de álbum (`redesign-album-page`) necesita datos que el catálogo
no guarda: todas las ediciones de un álbum con sello, formato y número de catálogo; las
pistas que agregan las ediciones ampliadas; y los créditos de personal (quién tocó, quién
produjo). Además, una verificación contra MusicBrainz (2026-09-24, *The Dark Side of the
Moon*) confirmó que el lookup que usa hoy la ingesta
(`/release-group/{id}?inc=releases+media`) devuelve **25 de 150 ediciones**: la edición
representativa se elige sobre un subconjunto. Hoy acierta porque ese subconjunto parece
venir ordenado por fecha, pero ese orden no está documentado.

## What Changes

**Parte A — Ediciones**

- La ingesta de un álbum reemplaza el lookup por el **browse paginado**
  `/release?release-group={mbid}&inc=labels+media+release-groups` (100 por página), que
  trae todas las ediciones con sello, número de catálogo, formato y cantidad de pistas
  por disco, país, estado, embalaje y desambiguación, y la `first-release-date` del grupo.
- La **edición representativa se elige entre todas las ediciones**, no entre 25.
- Nueva tabla de **resumen de ediciones** por release-group, más sellos (`label`) y la
  relación edición ↔ sello con número de catálogo.
- `release` pasa a admitir **varias ediciones por álbum**, con una marca de
  **representativa** garantizada en SQL (a lo sumo una por release-group). Todas las
  lecturas que hoy toman "el release del álbum" pasan a leer la representativa.
- **Variantes con pistas adicionales**: función pura que agrupa las ediciones oficiales
  por lista de pistas y detecta las que agregan pistas o son cajas. La lista de una
  variante se ingiere bajo demanda (la primera vez que alguien la despliega) como
  `release` no representativa.
- Álbumes ya ingeridos: sincronización en segundo plano (`after()`) en la próxima visita
  y script de backfill; ninguna de las dos cambia la edición representativa por su cuenta.
- **BREAKING (interno)**: `musicbrainz.getReleaseGroup` deja de usarse en la ingesta y en
  la re-canonicalización.

**Parte B — Créditos de personal**

- `musicbrainz.getRelease` agrega `artist-rels+recording-level-rels` a la misma request:
  sin requests extra. La verificación mostró que casi todo el personal vive a nivel
  grabación (instrumento, voz, producción, ingeniería, mezcla) y a nivel edición solo el
  arte.
- Nueva tabla de **créditos de personal** (tipo de relación, atributos como instrumentos,
  nombre acreditado, destino edición o grabación), separada de `credit`
  (`primary`/`featured`).
- Clasificación en los cuatro niveles del rediseño (Integrantes de la banda, Músicos
  invitados, Producción y sonido, Arte y otros) mediante una tabla fija en código; se
  guardan **todos** los tipos.
- La sincronización de créditos asegura también las pertenencias (`membership`) del
  artista principal, necesarias para distinguir integrantes de invitados.
- Álbumes ya ingeridos: sincronización en segundo plano y script de backfill.

## Capabilities

### New Capabilities

- `album-editions`: resumen de todas las ediciones de un álbum (sellos, catálogo,
  formato, pistas), su ingesta paginada, sincronización de álbumes existentes y detección
  de variantes con pistas adicionales, con ingesta bajo demanda de su lista.
- `personnel-credits`: créditos de personal por edición y por grabación, su ingesta dentro
  de la request existente, su clasificación en niveles y la sincronización de álbumes
  existentes.

### Modified Capabilities

- `album-edition-selection`: la selección opera sobre **todas** las ediciones (browse
  paginado); la edición representativa se marca en SQL y admite ediciones no
  representativas en el mismo release-group; la re-canonicalización solo reemplaza la
  representativa.

## Impact

- **Esquema**: migración nueva (`0048_…`): tabla de resumen de ediciones, `label`, relación
  edición ↔ sello, `release.is_representative` con índice único parcial, tabla de
  créditos de personal, marcas de sincronización. Espejo en `src/db/schema.ts` y
  `docs/03-data/sql-model.md`.
- **MusicBrainz** (`src/services/musicbrainz/`): método nuevo de browse de ediciones por
  release-group; `getRelease` con más `inc`; tipos y mappers nuevos.
- **Catálogo** (`src/services/catalog/`): `ingest-release.ts`, `recanonicalize.ts`,
  `representative-release.ts` (sin cambios de criterio), servicios nuevos de ediciones,
  variantes y créditos; lecturas de `release` en `recording-detail.ts`,
  `ingest-recording.ts` y `search-catalog.ts` revisadas.
- **API**: endpoint para la lista de una variante (desplegar una sección) →
  `docs/04-api/contracts.md` y `errors.md`.
- **Scripts**: backfill de ediciones y de créditos; `recanonicalize-release-group.ts`
  adaptado; smoke tests nuevos contra BD de scratch.
- **Docs**: ADR nuevo (varias ediciones por álbum con representativa marcada), actualizar
  `docs/03-data/data-licensing.md` (sellos y relaciones son datos centrales CC0 de
  MusicBrainz), `docs/06-operations/catalog-scripts.md`.
- **Costo de MusicBrainz**: primera visita de un álbum con ≤ 100 ediciones = mismas 2
  requests que hoy; con más ediciones, una request más por página. Desplegar una variante
  = 1 request la primera vez.
- **Fuera de alcance**: la interfaz (la hace `redesign-album-page`), créditos de
  composición (nivel obra), género, numeración de vinilo, páginas de sello.
