## Context

`ArtistDiscography` recibe las secciones completas; Principal ya trae `isEp` por disco y los discos vienen ordenados
por año. Las pestañas viven en el layout y la barra de secciones en la página.

## Decisions

### D1. Bloques calculados en el cliente

`discographyBlocks(section, items)` parte Principal por `isEp` solo si hay de los dos tipos. La grilla rinde un
`DiscographyGrid` por bloque (cada uno con su "Mostrar más") y la tabla usa los grupos con título que ya existían para
la búsqueda, así que el orden se aplica dentro de cada bloque. La etiqueta "EP" se omite en un bloque que ya se llama EP.
Se descartó una columna Tipo en la tabla: los grupos dicen lo mismo sin una columna más.

### D2. Relleno tipográfico solo en la grilla

`Cover` recibe `titleTile`: con ausencia confirmada (`coverResolved` sin URL) pinta `TitleTile`; sin resolver, se
lo pasa como `fallback` a `LazyCoverImage`, que ya lo admitía. `DiscPlaceholder` no cambia: lo usan el feed, las
listas y la tabla, donde el título está al lado.

### D3. Décadas desde 12 discos

Un separador `<li class="col-span-full">` cada vez que cambia la década entre discos consecutivos (los discos llegan
ordenados por año). El nombre sale de `decadeLabel`, el mismo de Explorar ("Años 80", "Años 2000"). Con menos de 12 discos
los separadores fragmentan más de lo que ordenan.

### D4. Barras fijas con alturas en variables CSS

El contenedor de pestañas define `--site-header-h` (3,625 rem, el encabezado mide ~58–61 px: se solapa un poco, nunca
deja hueco), `--artist-tabs-h` (2,375 rem, alto fijado en la barra) y `--artist-sticky-top` (la suma). Las pestañas son
`sticky` a `--site-header-h` y la barra de la discografía a `--artist-sticky-top`; los `scroll-mt` de la sección,
los títulos de bloque y los grupos de búsqueda usan la misma variable. Al cambiar de sección con la barra pegada,
`scrollIntoView` lleva la sección nueva bajo la barra.

## Risks / Trade-offs

- Si el encabezado del sitio cambia de alto, hay que ajustar `--site-header-h`; un desfase de unos px solo solapa.
