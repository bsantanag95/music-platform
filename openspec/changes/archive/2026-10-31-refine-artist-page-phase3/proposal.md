## Why

Tercera fase del rediseño de la página de artista (auditoría del 2026-10-30, respuestas recomendadas). La página no
cuenta dos cosas que el producto ya sabe: los premios (hay 4.748 nominaciones cargadas y ninguna aparece en la página
del artista; Bad Bunny tiene 54) y la relación del usuario con la discografía (con 5 discos valorados el panel decía
"Sin empezar" y no había forma de ver qué falta valorar). La Biografía, además, deja vacía la mitad derecha.

## What Changes

- Nueva pestaña **Premios** (`/artist/[id]/awards`), agrupada por ceremonia, y fila "Premios" en la ficha.
- Filtro **Todo · Sin valorar · Tuyos** en la barra de la discografía: atenúa, no esconde.
- Panel: fila **Valoraciones** ("5 discos · media 4,3") con "Ver sin valorar →".
- Biografía: tarjeta lateral con primer y último álbum, cuántos y la alineación.

### Non-Goals

- Totales de la discografía en el panel (regla de recorridos).
- Premios como compositor (las categorías `songwriter` premian a los autores).

## Capabilities

### New Capabilities

- `artist-awards-tab`: pestaña y fila de premios del artista.

### Modified Capabilities

- `artist-discography-view`: filtro personal.
- `artist-personal-panel`: fila Valoraciones.
- `artist-biography`: datos de la discografía al lado.
- `artist-page-layout`: pestaña Premios en la barra.

## Impact

`src/services/awards/artist-awards.ts` (nuevo), `src/services/catalog/artist-personal.ts` (`rated`), la página
`(tabs)/awards`, `ArtistAwards`, `ArtistTabs`, `ArtistHeader` (fila Premios), `ArtistDiscography` (filtro),
`discography-filter.ts`, `ArtistRelationPanel`, `ArtistBiography` y `biography-facts.ts`, el layout, mensajes
`catalog.artist.{awards,tabs.awards,facts.awards,relation.rated*,discography.filter,biography.facts}`, tests y docs. Sin
cambios de esquema ni de API.
