## Why

Auditoría de la página de canción (2026-10-31, Money y My Man on Willpower en 1280 y 375 px, sin sesión y con una
cuenta de prueba; maqueta en https://claude.ai/artifact/QKZiK8m9SEb4oWfoSCc1NU). La persona aceptó las opciones
recomendadas. Esta primera fase corrige los errores visuales y las diferencias con la página de álbum, que acaba de
cerrar su refinamiento y dejó piezas compartidas (control segmentado, enlace secundario, chevron):

- **Pestañas de versiones**: un cuarto estilo de selector (cajas sueltas con borde ámbar en la activa).
- **Tira de pistas**: flechas tipográficas "← Anterior" / "Siguiente →" y el disco del centro en ámbar en reposo.
- **Ámbar en reposo**: los autores de "Escrita por" (también en la Composición del álbum, mismo componente), la
  primera aparición, la versión original, "+N asistentes", "+N" de roles, "Ver más", el enlace a los créditos del
  disco, "Aparece en N listas" y la etiqueta "Primer lanzamiento".
- **"[unknown]"**: el artista comodín de MusicBrainz aparece tal cual en la tabla de versiones.
- **Títulos**: "Créditos de esta grabación" y "Composición" son etiquetas en mayúsculas dentro de una caja; las otras
  secciones usan un título en la fuente de títulos.
- **Comentarios a ancho completo**; en álbum y artista se limitan a `max-w-3xl`.

## What Changes

- Pestañas de versiones con el control segmentado común (`SEGMENT_GROUP` / `SEGMENT_OPTION`, que ahora también marca
  `aria-selected`), conservando `tablist`, `aria-selected` y las flechas del teclado. La cifra va tras el nombre.
- Tira de pistas con el chevron común y el disco como enlace secundario.
- Enlaces y etiquetas secundarios neutros en reposo, ámbar al pasar el cursor (`SECONDARY_LINK`).
- "Artista desconocido" en lugar de "[unknown]", sin enlace.
- Composición y Créditos de esta grabación con título de sección fuera de la caja, como Apariciones y Versiones.
- Comentarios a `max-w-3xl`.

### Non-Goals

- Comunidad, panel "Tu relación" y cabecera en móvil (Fase 2).
- Plegado de grupos de créditos largos y chevron de asistentes (Fase 3).

## Capabilities

### Modified Capabilities

- `song-page-layout`: tira con chevron; títulos de sección uniformes; comentarios con ancho de lectura; ámbar solo en
  reposo donde importa.
- `song-versions`: pestañas con el control común; artista comodín traducido.

## Impact

`SongVersions`, `SongTrackStrip`, `SongHeader` (`SongFacts`, `SongCommunity`), `SongCredits`, `ExpandableRoles`,
`SongAppearances`, `SongwriterNames` (compartido con los créditos del álbum), `src/components/ui/segmented.ts`, la
página de canción, mensajes `catalog.song.versions.unknownArtist`, tests. Sin cambios de esquema ni de API.
