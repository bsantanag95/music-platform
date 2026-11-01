## Why

Segunda fase del refinamiento de la página de canción (auditoría del 2026-10-31, maqueta en
https://claude.ai/artifact/QKZiK8m9SEb4oWfoSCc1NU; la persona eligió las opciones recomendadas). La cabecera sigue
el patrón que el álbum acaba de dejar atrás:

- **Comunidad en tres tarjetas** con "—" como valor ("Media — 1 valoración", "Reacción común — Sin reacciones
  públicas") y, en móvil, una línea de Plex Mono a 14 px que se parte en dos. El álbum y el artista usan una franja
  dividida sin celdas vacías.
- **Panel "Tu relación"** con acciones en ámbar, Favorita como fila con un corazón suelto y la fila de listas sin
  etiqueta.
- **Móvil**: la carátula de 128 px sola en su fila y la ficha técnica después del panel.

## What Changes

- **Franja de comunidad compartida** (`src/components/catalog/CommunityStrip.tsx`), usada por el álbum y la canción.
  En la canción: Valoraciones siempre; Media, Reacción y Favorita solo con dato. Sin ninguna señal, la línea actual
  ("Todavía hay poca actividad…" / "Todavía sin actividad…") se mantiene. En todos los anchos.
- **Panel**: Favorita como conmutador arriba, a todo el ancho; filas Escuchas y Listas con etiqueta y acción arriba y
  estado debajo ("Sin escuchas", "En ninguna de tus listas"); acciones en gris. Mismas piezas que el panel del álbum
  (`Field`, `Value`, `ToggleChip`, ahora exportadas).
- **Cabecera en móvil** como la del álbum: carátula de 96 px junto a la identidad, ficha abierta, comunidad y panel.

### Non-Goals

- Créditos largos plegados (Fase 3).

## Capabilities

### Modified Capabilities

- `song-community-stats`: franja en lugar de tarjetas, sin celdas vacías, también en móvil.
- `song-personal-panel`: Favorita arriba a todo el ancho; filas con estado.
- `song-page-layout`: orden de la cabecera en móvil.
- `album-community-stats`: la franja pasa a un componente compartido (sin cambio visible).

## Impact

`SongHeader` (`SongCommunity`, `SongIdentity`), `SongRelationPanel`, `AlbumHeader` (`CommunityStats`),
`AlbumRelationPanel` (exporta `Field`, `Value`), la página de canción, nuevo `CommunityStrip`, mensajes de
`catalog.song.community` y `catalog.song.relation`, tests. Sin cambios de esquema ni de API.
