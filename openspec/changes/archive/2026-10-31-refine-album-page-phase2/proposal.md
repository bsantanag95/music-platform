## Why

Segunda fase del refinamiento de la página de álbum (auditoría del 2026-10-31, maqueta en
https://claude.ai/artifact/LZtXMAPwngVjJPDS7WiNkM; la persona eligió las opciones recomendadas). La cabecera sigue
leyéndose distinta de la del artista y desaprovecha el móvil:

- **Comunidad en tres tarjetas sueltas** con borde y fondo propios. Con poca actividad son ruido ("—  Pocas
  valoraciones", "0 · Sin reseñas", "0 lo buscan"), y con 2 valoraciones la tarjeta Media dice "Pocas valoraciones"
  junto a otra que dice "2". En móvil se reduce a una línea en Plex Mono a 14 px que se parte en dos.
- **Panel "Tu relación" con otro patrón que el del artista**: estado y acción en la misma línea ("Ninguna + Registrar"),
  Favorito y Pendiente entre filas, la fila de listas sin etiqueta y las acciones de texto en ámbar.
- **Móvil**: la carátula de 160 px ocupa sola su fila, el título queda debajo y la ficha técnica está plegada tras un
  `<details>` con el triángulo del sistema, después del panel.
- **Franja de discografía**: un disco sin carátula muestra el vinilo genérico; la discografía del artista ya usa la
  carátula tipográfica.

## What Changes

- Comunidad como la franja del artista (una fila dividida, cifra arriba y etiqueta abajo), en todos los anchos. La
  Media solo aparece con media (umbral de 5); el detalle de reseñas y de "lo buscan" solo con cifra distinta de cero.
  El enlace de listas y el histograma no cambian.
- Panel con el patrón del artista: Favorito y Pendiente arriba; filas con la etiqueta y su acción en la primera línea
  y el estado debajo (Reseña, Escuchas, Colección, Listas, Géneros); acciones de texto en gris. La Nota conserva las
  estrellas en línea. El panel anónimo no cambia (es igual al del artista).
- Móvil: carátula de 96 px junto al tipo, título y artista; ficha técnica siempre visible bajo la identidad; luego la
  comunidad y el panel. La línea "Edición mostrada" de la pestaña Canciones desaparece: la ficha ya la muestra.
- Franja de discografía con la carátula tipográfica (`TitleTile`, ahora compartida) para los discos sin carátula.

### Non-Goals

- Reseñas, Ediciones y estados vacíos (Fase 3).
- La barra de desplazamiento de la franja: no hay flechas, así que con ratón es el único arrastre directo; los bordes
  ya se desvanecen.

## Capabilities

### Modified Capabilities

- `album-community-stats`: franja única, sin cifras vacías.
- `album-personal-panel`: filas con el patrón del artista.
- `album-page-layout`: orden y forma de la cabecera en móvil; carátula tipográfica en la franja.
- `catalog-album`: ficha técnica siempre visible; sin la línea de edición duplicada en Canciones.

## Impact

`AlbumHeader` (`CommunityStats`, `AlbumFacts`, `AlbumIdentity`), `AlbumRelationPanel`, el layout del álbum,
`TrackList`, `DiscographyStrip`, `ArtistDiscography` (usa el `TitleTile` compartido, sin cambio visible), nuevo
`src/components/catalog/TitleTile.tsx`, mensajes de `catalog.album.relation` y `catalog.album.community`, tests. Sin
cambios de esquema ni de API.
