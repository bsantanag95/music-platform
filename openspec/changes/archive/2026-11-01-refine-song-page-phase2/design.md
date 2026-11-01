## Context

`refine-album-page-phase2` dejó en `AlbumHeader` una franja de comunidad (`Stat` + `<dl>` dividido) y en
`AlbumRelationPanel` el patrón `Field` / `Value` con los conmutadores arriba. La canción sigue con `StatTile` y su
propio panel de filas `Row`.

## Decisions

### D1. `CommunityStrip` compartido

`CommunityStrip({ label, cells })` dibuja la `<dl>` dividida con 1 a 4 celdas (cifra arriba, etiqueta debajo, detalle
opcional) y elige las columnas por la cantidad de celdas. `CommunityStats` del álbum pasa a usarlo sin cambio visible.

### D2. Celdas de la canción

Valoraciones siempre (es la cifra que justifica la franja); Media con media (umbral de 5 ya aplicado por el servicio);
Reacción con reacción predominante (detalle: cuántas reacciones); Favorita con algún favorito ("<5" con umbral). Con
pocas valoraciones no hay celda de Media: la cifra real ya está en Valoraciones, así que no se esconde nada. Sin media,
reacción predominante ni favoritas, se conserva la línea de "poca actividad" / "sin actividad": una franja de una
celda no aporta nada.

### D3. Favorita arriba, a todo el ancho

La canción no tiene Pendiente: el conmutador va solo, a todo el ancho del panel, como la fila de conmutadores del
álbum. Reemplaza la decisión de `polish-song-header` (fila compacta), por la decisión D2 de la auditoría.

### D4. Escuchas con `Field`

Etiqueta y "+ Registrar" arriba; debajo el historial y, a la derecha, "Ver en tu diario". Sin escuchas, "Sin
escuchas" (la misma palabra que el álbum) en lugar de "Ninguna".

## Risks / Trade-offs

- **Exportar `Field` y `Value` desde el panel del álbum**: crea una dependencia de la canción hacia el álbum, como ya
  pasa con `HeartIcon`, `ToggleChip` y `RatingDetailDialog`.
