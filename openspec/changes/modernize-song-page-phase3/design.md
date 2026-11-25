## Context

`SongAppearances` (cliente, `src/components/song/SongAppearances.tsx`) recibe `groupAppearances(detail.containingAlbums)` (grupos por
tipo en orden fijo, `originalReleaseGroupId`) y los años por disco; dibuja los grupos del artista en una columna y Recopilaciones en
otra, 3 discos por grupo con «+N». `SongVersions` (cliente) agrupa por disco con `groupByDisc` y, por cada grabación, un enlace con
`variantLabel` o «Ver versión»/«Grabación N». `Comments` (compartido por artista, álbum y canción) titula con `font-display text-xl`.
La franja de discografía del álbum (`DiscographyStrip` + `DiscographyScroller`) ya resolvió una franja desplazable de carátulas de
128 px con bordes desvanecidos.

## Goals / Non-Goals

**Goals:** carátulas y duraciones a la vista; mismas piezas que la franja del álbum; sin datos nuevos.

**Non-Goals:** línea de vida de B, agrupación de versiones, comentarios de álbum y artista.

## Decisions

### Franja de apariciones con el desplazador del álbum
`SongAppearances` aplana los grupos en su orden (estudio, singles y EP, recopilaciones, en vivo y otros; por fecha dentro de cada uno)
y los pinta dentro de `DiscographyScroller` (no hay elemento `data-current`, así que empieza a la izquierda). Cada disco: carátula
`w-28 sm:w-32` (`CoverThumb` o `LazyCoverImage`), título en dos líneas reservadas, fecha (mes y año o año) y, si no es de estudio, el
tipo en minúscula («recopilación»); «Primer lanzamiento» con la fecha completa como ayuda, como hoy. Junto al título de la sección, el
resumen por tipo con las cantidades («1 álbum de estudio · 7 recopilaciones»). Sin «+N»: la franja muestra todos.
*Alternativa descartada:* mantener las columnas con carátulas más grandes: con 11 recopilaciones el bloque se hace más alto que la
franja y sigue necesitando «+N».

`SongAppearances` deja de necesitar estado (no hay «+N») y pasa a componente de servidor; el desplazador sigue siendo de cliente.

### Fila de versión sin «Ver versión»
En `DiscRow`, si el disco tiene una sola grabación y `variantLabel` es `null`, el título del disco enlaza a la página de esa grabación
(no al disco) y la celda muestra su duración y sus atributos extra; el enlace al disco sigue en la página de la versión. Una grabación
sin disco va sola en su fila con «Sin disco» enlazado a la versión. Con varias grabaciones o variantes con nombre, la fila no cambia.
El encabezado de la columna pasa de «Grabaciones» a «Duración y variantes».

### Título de comentarios
`Comments` gana `headingClassName?: string` (por defecto la clase actual). La canción pasa la de sus secciones
(`font-display text-2xl font-bold tracking-tight text-paper`). Álbum y artista no la pasan.

## Risks / Trade-offs

- [Muchas apariciones (un éxito con 60 recopilaciones)] → La franja se desplaza; las carátulas se cargan perezosamente.
- [El disco de una versión única ya no enlaza al disco] → Se llega desde la versión; la fila es más corta y sin «Ver versión».
- [Cambiar un componente compartido] → Solo una prop opcional; sin ella, el resultado es idéntico.

## Migration Plan

Sin datos ni API; revertir el commit restaura las secciones anteriores.

## Open Questions

Ninguna.
