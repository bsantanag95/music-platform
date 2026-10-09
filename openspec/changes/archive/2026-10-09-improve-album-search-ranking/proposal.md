## Why

La búsqueda de Álbumes (`GET /api/catalog/search?type=album`) no pone primero el disco conocido cuando hay muchos homónimos. Medido sobre scratch (2026-10-09): «dark side of the moon» devolvía 33 sencillos y versiones de desconocidos y el disco de Pink Floyd no estaba entre ellos; «pink floyd» devolvía discos *titulados* «Pink Floyd» de otros artistas en vez de la discografía de la banda. La causa es doble: MusicBrainz puntúa 100 a todos los títulos exactos y los devuelve en un orden arbitrario, y «The Dark Side of the Moon» (91) cae a nivel 3 por el artículo inicial; además, cuando la consulta completa es un artista, nada lo trata como búsqueda de su discografía.

## What Changes

- **Notoriedad como señal de orden**: se usa el número de ediciones del álbum que MusicBrainz ya devuelve en la búsqueda (`count`: Abbey Road de The Beatles 73, un sencillo suelto 1) para desempatar dentro de un mismo nivel, después de la actividad en la plataforma y antes de «cacheado». Sin solicitudes adicionales.
- **Artículo inicial**: «dark side of the moon» coincide exactamente (nivel 2) con «The Dark Side of the Moon» (artículos en, es, fr, de).
- **Consulta = nombre de un artista**: el nivel 1 incluye los discos cuyo artista acreditado es toda la consulta («pink floyd» → su discografía; el autotitulado también), y los discos locales de ese artista (estudio primero, por año) se suman a los candidatos. Un álbum de otro artista que solo se llama como la consulta queda en el nivel 2.
- Contrato y spec `search-query-matching`; sin cambios de esquema ni de forma de la respuesta.

## Capabilities

### Modified Capabilities

- `search-query-matching`: el nivel 1 incluye la consulta que es el nombre del artista, el nivel 2 ignora un artículo inicial y la notoriedad del álbum entra en el orden de Álbumes.

## Impact

- `src/services/catalog/search/{rank,coverage,albums,local-match}.ts`, `src/services/musicbrainz/types.ts` (campo `count`), pruebas.
- `docs/04-api/contracts.md` (orden de `type=album`).

## Non-Goals

- Páginas siguientes de MusicBrainz: el disco conocido sigue dependiendo de que MusicBrainz lo traiga en la página que se pide (con `category=studio` casi siempre llega).
- El orden de Canciones y Artistas, salvo el efecto del nivel 1 por nombre de artista, que comparten (`coverageLevel`).
- Un grupo de MusicBrainz con el artista y el título intercambiados («Radiohead» de «In Rainbows») sigue coincidiendo por nombre de artista: es un dato erróneo de origen.
