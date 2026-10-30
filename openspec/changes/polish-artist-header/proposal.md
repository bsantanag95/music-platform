## Why

La cabecera del artista tenía unos once elementos en ámbar a la vez, las cifras de comunidad lejos de su etiqueta, el
umbral escrito de dos formas ("<5" y "menos de 5"), la franja de comunidad escalonada respecto del panel, "Actividad:
desde 2014" en un solista (cuando solo se sabe el año de su primer disco) y un crédito de foto con el mismo peso que la
ficha.

## What Changes

- Enlaces externos en texto claro con subrayado punteado y `↗`; acciones de texto del panel en gris.
- Comunidad: cifra primero y etiqueta debajo; "Seguidores" con "N lo tienen de favorito", también con "<5".
- El panel "Tu relación" se estira hasta el final de la cabecera en escritorio.
- Solista: "Primer disco: 2014" en lugar de "Actividad: desde 2014".
- Crédito de la foto más chico y tenue.

## Capabilities

### Modified Capabilities
- `artist-header`: fila "Primer disco" y enlaces externos marcados.
- `artist-community-stats`: cifra primero y "<5" en favoritos.

## Impact

`src/components/artist/{ArtistHeader,ArtistCommunity,ArtistRelationPanel}.tsx`, el layout del artista, mensajes
`catalog.artist.{community,facts}`, tests y `docs/05-features/catalog-browsing.md`. Sin cambios de API ni de esquema.
