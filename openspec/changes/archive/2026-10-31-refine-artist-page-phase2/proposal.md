## Why

Segunda fase del rediseño de la página de artista (auditoría del 2026-10-30, mockup aprobado con las respuestas
recomendadas). Principal mezcla 17 álbumes con 19 EP en Iron Maiden —varios con el mismo título que el álbum— y la obra
de estudio pierde protagonismo; 11 de los 36 discos son vinilos vacíos que no dicen qué disco son; con 36 discos en
grilla, las pestañas y las secciones quedan arriba y hay que volver a buscarlas.

## What Changes

- Principal en dos bloques, **Álbumes** y **EP** (más chico, debajo), cuando tiene los dos; en la tabla, un grupo por
  bloque.
- Disco sin carátula en la grilla: título y año en el cuadro en lugar del vinilo.
- Separadores por década en la grilla, desde 12 discos por bloque.
- Pestañas y barra de la discografía fijas al bajar; en móvil la barra va en una fila.
- Texto: "Búscalo en todo el catálogo" (corrige un voseo).

### Non-Goals

- Filtro "Sin valorar", resumen personal, premios y ficha de Biografía (Fase 3).
- Cambiar qué discos van en Principal (los EP siguen ahí, por decisión anterior del usuario).

## Capabilities

### Modified Capabilities

- `artist-discography-view`: bloques en Principal, relleno tipográfico, décadas y barra fija.
- `artist-page-layout`: pestañas fijas.

## Impact

`ArtistDiscography` (`discographyBlocks`, `TitleTile`, separadores, barra fija), `ArtistTabs`, el layout del
artista (alturas de las barras), mensajes `catalog.artist.discography.{blocks,noYear}`, tests y
`docs/05-features/catalog-browsing.md`. Sin cambios de API ni de esquema.
