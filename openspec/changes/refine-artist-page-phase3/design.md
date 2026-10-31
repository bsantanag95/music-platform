## Context

Los premios viven en `award_*` (ADR 0032, 0044) con la nominación ligada a un artista, un disco o una grabación. "Los
más premiados" (`listMostAwardedArtists`) ya define quién recibe un premio: el artista nominado o los artistas
principales del disco o la grabación, solo en categorías `honors = 'performer'`.

## Decisions

### D1. `getArtistAwards` con el criterio de "Los más premiados"

Una CTE une las nominaciones por las tres vías (`UNION` deduplica) y las cruza con categoría, ceremonia y premio; el
disco mostrado es el nominado o, para una grabación, su disco ancla. El agrupado por ceremonia y las cifras se hacen en
`groupArtistAwards` (puro, testeable). Los salones de la fama entran como "incorporaciones", aparte de ganados y
nominaciones, igual que en el hub (un salón no es una competencia). La lectura va en el layout (para la pestaña y la
fila) con `cache()`; la pestaña la reutiliza. Medido en la BD de scratch: ~25 ms en frío.

### D2. Pestaña propia en lugar de un bloque

Hay artistas con 50+ nominaciones en 16 ceremonias: un bloque bajo la discografía alargaría todas las visitas. La
pestaña se enlaza desde la ficha.

### D3. Filtro que atenúa, con evento desde el panel

El filtro vive en `ArtistDiscography` (estado local, no en la URL salvo como entrada `?filter=unrated`). Atenúa con
`opacity` y conserva el orden y la forma de la grilla. El panel está en el layout, fuera del componente: "Ver sin
valorar" emite `artist-discography-filter` si la discografía está en la página o navega con `?filter=unrated` desde
otra pestaña. Solo se ofrece con alguna marca: sin datos propios no filtra nada.

### D4. Ficha de Biografía con lecturas existentes

`biographyFacts` deriva primer y último álbum (Principal sin EP, con año), cuántos y la alineación de las mismas
lecturas que el layout (`loadDiscography`, `loadLineup`, deduplicadas por `cache()`): no hay consultas nuevas.

### D5. Valoraciones sin total

`getArtistPersonalState` suma `rated` (count y `avg(stars)` sobre los discos propios) en la misma tanda de
consultas. Se muestra la cantidad y la media, nunca contra el total de la discografía.
