## Context

La pestaña Canciones (`(tabs)/page.tsx`) monta `TrackList` (solo la usa el álbum) y `EditionExtraTracks`. Cada fila de `TrackList`
muestra número, título, marcas personales y de comunidad, artistas invitados («Créditos: …»), «Versión de …» y duración. El layout
ya carga, cacheados por request, `loadAlbumPersonnel` (`AlbumPersonnel`: `levels` por nivel —`members`, `guests`, `production`,
`other`— con roles por persona, y `byTrack.tracks[recordingId].songwriting` con los autores de cada obra) y `loadAlbumEditions`
(ediciones con `formats`). Créditos ya traduce roles e instrumentos (`useRoleFormatter`) y Ediciones agrupa formatos por familia
(`formatFamily`: vinyl, cd, digital, cassette, other).

El plan de tres fases está en el diseño archivado de `modernize-album-page-phase1`. La Fase 1 publicó la ficha en una línea pero no
actualizó el requisito «Ficha técnica del álbum» de `catalog-album`, que sigue hablando de filas etiqueta/valor; esta fase lo corrige.

## Goals / Non-Goals

**Goals:** compositores y formación a la vista en Canciones, sin consultas nuevas, sin alargar la lista en el teléfono más de lo
necesario.

**Non-Goals:** las pestañas Créditos y Ediciones, las acciones por pista, la Fase 3.

## Decisions

### Compositores bajo el título
`TrackList` recibe `songwriters?: Record<recordingId, { id: string; name: string }[]>` armado en la página desde
`personnel.byTrack.tracks[id].songwriting` (personas únicas, en el orden de los créditos; `creditedAs` si existe). La línea va debajo
del título, en `font-data text-xs text-paper-muted`, con cada nombre enlazado; un `sr-only` «Composición:» la abre. Va antes de la
línea de invitados («Créditos: …») y de «Versión de …». Sin autores, no hay línea. En el teléfono la línea se mantiene (es una línea
corta) y la fila crece ~16 px.
*Alternativa descartada:* una columna «Compositores» como la propuesta C: en el teléfono no cabe y obliga a dos maquetas.

### Columna «En este disco»
`AlbumOnThisRecord` (servidor) con tres bloques, en este orden, cada uno con título en mono mayúsculas y filas nombre ↔ rol:

1. **Formación:** `levels.members`, cada persona con sus roles de intérprete traducidos (`useRoleFormatter`, los mismos textos que
   Créditos), enlazada.
2. **Producción:** `levels.production` (productores primero, luego ingeniería y mezcla), hasta 4, con «Todos los créditos →» a la
   pestaña Créditos.
3. **Ediciones:** cantidad por familia de formato (`formatFamily` del primer formato de cada edición, orden CD, vinilo, casete,
   digital, otros; familias en 0 omitidas) y «Ver las N ediciones →» a la pestaña Ediciones. Solo con más de una edición.

La página pasa a una rejilla `lg:grid-cols-[minmax(0,1fr)_20rem]` con la lista (y las pistas adicionales) a la izquierda y la columna a
la derecha; por debajo de `lg` la columna va después de la lista. Sin ningún bloque con datos, no hay columna ni rejilla.

### Ficha técnica en la spec
El requisito «Ficha técnica del álbum» pasa a describir la línea publicada: géneros, lanzamiento, duración, sello, producción (hasta 2
productores enlazados) y edición con el acceso a Ediciones, cada dato con su rótulo para lectores de pantalla y solo con dato. Sus
escenarios se conservan.

## Risks / Trade-offs

- [La formación del disco puede incluir muchos músicos en discos con orquesta] → `levels.members` son solo integrantes del artista
  principal; los invitados quedan en Créditos.
- [Compositores con `creditedAs` distinto del nombre] → Se muestra `creditedAs` y se enlaza a la persona, igual que Créditos.
- [Filas más altas en el teléfono] → Una línea de 16 px por pista; la primera canción no se mueve.

## Migration Plan

Sin datos ni API; revertir el commit quita la línea de compositores y la columna.

## Open Questions

Ninguna bloqueante.
