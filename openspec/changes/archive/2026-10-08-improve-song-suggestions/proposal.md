## Why

Las sugerencias de canción del buscador (`GET /api/search/suggest?type=song`, usadas por el buscador del Header, la
página `/search` y la fase local del diálogo "Añadir") ordenan mal. Medido sobre la base de scratch (21.886
grabaciones, 2026-10-08):

- **Duplicados**: cada toma, remaster o directo es una grabación distinta; «One — Metallica» ocupa 5 de los 6
  lugares para `one`, «Taste — Sabrina Carpenter» 4 para `taste` y «Stairway to Heaven — Led Zeppelin» 4 para
  `stairway`. Hay 2.656 títulos repetidos en el catálogo.
- **Sin "artista + canción"**: solo se compara el título. `metallica one` sugiere «String Metallica» y «Metall»;
  `oasis wonderw` sugiere «Oasis» de Dokken. Es la forma más común de buscar una canción.
- **Desempate arbitrario**: entre títulos iguales decide la similitud de texto (la actividad casi siempre es 0:
  45 valoraciones y 37 escuchas de canciones). Una versión de un cuarteto de cuerdas va antes que la de Metallica
  y un cover antes que Black Sabbath.
- **Coincidencias difusas que no son la canción**: `hey jude` sugiere «Hey Joe» y «Hey You».

## What Changes

- Las sugerencias de canción se **agrupan por canción** (título base + artista principal, el mismo criterio que la
  búsqueda completa); cada grupo se representa por la grabación con más álbumes.
- **Puente artista + canción**: si un artista local ocupa un extremo de la consulta, se sugieren sus canciones
  cuyo título empieza por el resto, antes que el resto de sugerencias.
- **Orden** dentro del mismo nivel de coincidencia: actividad en la plataforma del grupo → número de álbumes en
  que aparece la canción → artista explorado o con seguidores → similitud.
- **Cobertura de la consulta**: primero las sugerencias en las que cada palabra de la consulta está en el título o
  el artista (la última como prefijo); las coincidencias difusas solo rellenan los lugares libres, para conservar
  la tolerancia a erratas.
- Límite de tiempo explícito: con 3 caracteres o más, la mediana no debe superar 40 ms en scratch; con 2 caracteres,
  no debe empeorar respecto de hoy.

Sin cambios en la forma de la respuesta ni en la navegación: `id` sigue siendo una grabación local y la sugerencia
de canción sigue abriendo `/search?type=song&q=<artista> - <título>`.

## Goals

- Seis sugerencias de canción **distintas** por consulta, con la versión canónica de cada una.
- Que "artista + canción" sugiera la canción de ese artista.
- Un orden razonable entre versiones de artistas distintos sin depender de la actividad, que hoy es escasa.
- Mantener las sugerencias en decenas de milisegundos.

## Non-Goals

- Cambiar las sugerencias de artistas, álbumes o usuarios.
- Cambiar la búsqueda completa de Canciones (`/api/catalog/search`) o su orden.
- Acelerar las consultas de 2 caracteres (hoy ~160 ms por el filtro de trigramas sobre miles de títulos); necesita
  un índice nuevo y queda como cambio aparte.
- Consultar MusicBrainz o añadir tablas, vistas o columnas.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `search-typeahead`: se añaden los requisitos de agrupación, puente artista + canción, orden, cobertura y tiempo
  de respuesta de las sugerencias de canción.

## Impact

- **Servicio**: `src/services/catalog/search/suggest.ts` (sugerencias de canción) y
  `src/services/catalog/search/local-match.ts` (candidatos del puente y señales en lote); reutiliza
  `baseSongTitle` de `songs.ts`.
- **Pruebas**: `suggest.test.ts`; un sondeo de tiempos antes/después sobre scratch.
- **Docs**: `docs/04-api/contracts.md` (orden de `GET /api/search/suggest` para canciones).
- Sin migraciones, sin dependencias nuevas, sin cambios de contrato. El diálogo "Añadir" mantiene su filtro de
  cobertura en el cliente (queda redundante pero inocuo).
