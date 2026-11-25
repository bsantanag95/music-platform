## Context

Tras la Fase 1, `SongPage` (`src/app/[locale]/(catalog)/song/[id]/page.tsx`) monta la tarjeta y, debajo, en una columna a todo el
ancho: `SongComposition` y `SongRecordingCredits` (`src/components/song/SongCredits.tsx`, cada uno con título `text-lg` y una caja
`rounded border bg-ink-surface`; dentro de Créditos, Intérpretes y el resto en dos columnas desde `lg`), `SongAppearances`,
`SongVersions` y `Comments`.

`getTrackStrip` (`src/services/catalog/recording-detail.ts`) ya lee todas las pistas de la edición representativa (disco, posición,
título) para calcular la anterior y la siguiente con `buildTrackStrip`, y descarta el resto. El plan de tres fases está en el diseño
de `modernize-song-page-phase1` (archivado).

## Goals / Non-Goals

**Goals:** el disco entero junto a los créditos; créditos y títulos en la familia visual del álbum; sin consultas nuevas.

**Non-Goals:** Fase 3 (apariciones, versiones, comentarios), la tarjeta, los datos de créditos.

## Decisions

### La lista sale de la consulta de la tira
`getTrackStrip` agrega `recording.durationSec` a su `select` y `buildTrackStrip` devuelve también `tracks` (la lista completa, ya
ordenada por disco y posición) con `durationSec`. La tira sigue usando `previous`/`next`; la columna usa `tracks`. Una sola consulta,
ya cacheada por request (`loadTrackStrip`).
*Alternativa descartada:* reutilizar la carga de la lista de canciones del álbum: trae variantes, autores y estado personal que la
columna no necesita.

### `SongOnDisc` (servidor)
`<aside aria-labelledby>` con el rótulo «En el disco · {año}» (año del disco principal) en mono, una `<ol>` y el pie «N pistas ·
mm:ss» (la suma de las duraciones conocidas; sin ninguna, solo «N pistas»).
- Fila: número (`trackNumber`, «1-3» en varios discos) · título · duración, en rejilla `22px 1fr auto`, con filete.
- La pista actual lleva `aria-current="page"`, fondo ámbar tenue y título en ámbar, sin enlace; las demás enlazan a su canción.
- Varios medios: antes de la primera pista de cada disco, un rótulo «Disco N» (solo si hay más de uno).
- Más de `ON_DISC_MAX = 20` pistas: se muestran las 5 anteriores y las 5 siguientes a la actual (sin cortar en los extremos: si la
  actual está al principio, se completan 11 desde el inicio), con «…» donde se recorta, y al pie «Ver las N pistas en el disco →»
  hacia la página del disco. Función pura `onDiscWindow(tracks, index)` con test de propiedades.

### Cuerpo en dos columnas
`page.tsx` envuelve Composición, Créditos y `SongOnDisc` en una rejilla `lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14`; sin tira, la
columna no se monta y la rejilla queda en una columna. En el teléfono y la tableta, `SongOnDisc` va después de los créditos (orden
del DOM). La columna no es fija (`sticky`): los créditos rara vez superan su alto.

### Créditos sin caja
`boxClass` deja de dibujar borde y superficie: Composición es un párrafo y Créditos una lista de grupos con filete inferior por fila
(como «En este disco» del álbum). Intérpretes y el resto de grupos van en dos columnas desde `xl` (antes `lg`): a 1024 px la columna
principal mide ~620 px y dos columnas de nombre + roles no caben.

### Títulos
`headingClass` pasa de `font-display text-lg` a `font-display text-2xl font-bold tracking-tight` (24 px), la escala de «Créditos de
esta grabación» en el mockup. Apariciones y Versiones cambian su título a la misma clase en esta fase (la spec exige que las
cuatro secciones compartan estilo); su contenido cambia en la Fase 3.

## Risks / Trade-offs

- [Discos muy largos (recopilaciones de 40 pistas, ediciones dobles)] → La ventana de 11 pistas y el enlace al disco acotan la
  columna.
- [Una canción sin créditos deja «En el disco» sola] → Sin Composición ni Créditos no hay rejilla: la lista se
  monta sola, con el ancho de la columna (`max-w-[20rem]`).
- [Duraciones desconocidas] → La fila no muestra duración y el total suma solo las conocidas; si falta alguna, el total va precedido
  de «≈».

## Migration Plan

Sin datos ni API; revertir el commit restaura el cuerpo anterior.

## Open Questions

Ninguna.
