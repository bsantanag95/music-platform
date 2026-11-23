## Context

`GroupLineupView` (`src/components/artist/ArtistLineup.tsx`) pinta la pestaña Integrantes de un grupo: el filtro de sub-vistas
(Completa, Actual o Última alineación, Antiguos, Apoyo) y, debajo, una fila por persona con sus líneas de instrumentos y períodos
(`InstrumentLine`: instrumentos que comparten exactamente los mismos períodos, cada período `{ beginDate, endDate, ended }` con la
precisión de MusicBrainz), ★ fundador, † muerte y «También en». Los datos salen de `loadLineup` (`GroupLineup`: `current`, `past`,
`supportCurrent`, `supportPast`). Los años de formación y separación del grupo están en `profile.facts` (`lifeBegin`, `lifeEnd`,
`lifeEnded`).

El plan de tres fases está en el diseño de `modernize-artist-page-phase1` (archivado como `2026-11-23-modernize-artist-page-phase1`).
Al escribir esta fase se comprobó que la Biografía ya tiene la ficha lateral que el plan le asignaba, así que la Fase 2 queda en la
línea de tiempo.

## Goals / Non-Goals

**Goals:** una vista en el tiempo de la alineación, fiel a los datos (sin inventar fechas), accesible y sin desborde en 390 px.

**Non-Goals:** Biografía, Bandas de una persona, músicos de apoyo, la lista estilo Metal Archives.

## Decisions

### Una función pura arma las filas
`lineup-timeline.ts` exporta `lineupTimeline(lineup, group, nowYear)` → `{ from, to, ticks, rows } | null`:

- **Integrantes:** `current` y luego `past`, sin apoyo. Cada fila: id, nombre, si es actual, y sus tramos.
- **Tramos:** por cada período de cada `InstrumentLine`, un tramo de instrumento si la línea tiene algún instrumento que no sea voz
  (o ninguno) y un tramo de voz si alguno contiene «vocal» (MusicBrainz: `vocals`, `lead vocals`, `backing vocals`…): la voz se
  dibuja encima, más fina. Así el bajista que hace coros (Steve Harris: «Coros, bajo, teclados») sigue leyéndose como bajista.
- **Fechas desconocidas, sin inventar:** sin año de inicio, el tramo arranca en la formación del grupo con el extremo izquierdo
  desvanecido (`openStart`); terminado sin año de fin, se dibuja un año desde su inicio con el extremo derecho desvanecido
  (`openEnd`); abierto (sin fin y no terminado), llega hasta hoy o hasta la separación del grupo. Un período sin ningún año no
  produce tramo.
- **Eje:** de la formación del grupo (o el primer año de algún tramo si es anterior o falta) a la separación (o `nowYear`); marcas
  cada 10 años redondos, más el inicio, y «hoy» al final si el grupo sigue activo.
- **Cuándo aparece:** solo si al menos dos integrantes tienen un tramo con algún año; si no, `null` y la pestaña queda como hoy.
- **Orden:** actuales primero en su orden de la lista; antiguos por el primer año de su primer tramo (los que no tienen año, al
  final), para que la cascada se lea de arriba abajo.

Tests de propiedades: ningún tramo sale del eje, `from ≤ to` en cada tramo, las filas son exactamente actuales + antiguos con algún
año, y nunca hay tramo de un período sin años.

### Componente
`LineupTimeline.tsx` (servidor): una `figure` con título «La banda a lo largo del tiempo» y leyenda (Voz · Instrumentos). Rejilla
de dos columnas (nombre de 8–10rem enlazado a la persona, pista relativa), tramos con `left/width` en porcentaje del eje, ámbar
para la voz y papel atenuado para los instrumentos, extremos desvanecidos con `mask-image`. Cada fila lleva un texto `sr-only` con
los roles y años formateados con `formatInstrumentLine` (el mismo texto que la lista), y la pista es `aria-hidden`. Cabe en 390 px
sin desplazamiento horizontal: la columna del nombre baja a 6rem y el eje oculta las décadas impares y las marcas pegadas al inicio
o al final.

### Dónde va
Dentro de `GroupLineupView`, encima del filtro de sub-vistas, en Completa, Actual y Antiguos (es la historia del grupo, la misma
en las tres); no en Apoyo. `members/page.tsx` pasa los años del grupo desde `loadProfile` (cacheado por request; el layout ya lo
leyó).

## Risks / Trade-offs

- [Grupos con 30+ integrantes alargan la pestaña] → Filas de 22 px; Iron Maiden (24 filas) suma ~560 px, menos que la lista.
- [Precisión de MusicBrainz desigual] → Las fechas desconocidas se marcan como tales (extremos desvanecidos) y el texto accesible
  dice «?» igual que la lista.
- [Roles mezclados en una línea, «guitar, vocals»] → Se dibujan los dos: el instrumento y la voz encima.

## Migration Plan

Sin datos ni API; revertir el commit quita la línea de tiempo.

## Open Questions

Ninguna bloqueante.
