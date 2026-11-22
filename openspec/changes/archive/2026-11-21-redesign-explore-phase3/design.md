## Context

Fase 3 del plan de `redesign-explore-phase1`.

**Cómo está hoy la segunda mitad de la portada de `/explore`:**

- **Novedades y Próximos:** dos `AlbumRail layout="scroll"`. Próximos lleva la cuenta regresiva (`countdownsFor`) sobre la carátula.
- **Premios:** `AwardsExploreSection`, con una `AwardTileGrid` de 5 tarjetas con la carátula del ganador.
- **Salones:** `HallOfFameExploreSection`, con `HallOfFameTileGrid`. Con 2 o menos salones usa dos tarjetas anchas de 8 carátulas.
- **Mejor valorados:** un `AlbumRail` con «★ 4,3» sobre cada carátula, al final de la página.

**Piezas que ya existen:**

- `ReleaseTimetable` (Inicio sin sesión): horario de dos partes con columnas fijas y `<details>` nativo, sobre `HomeRelease`.
- `LatestCeremony.headline`, con categoría y ganador.
- `tileCovers` y `coverUrl` de los salones.

## Goals / Non-Goals

**Goals:**

- Que Lanzamientos, Premios y Salones tengan cada uno una forma distinta.
- Mejor valorados junto a Popular.
- Barra de pasillos de 8 entradas.

**Non-Goals:**

- Los listados completos, el hub, el índice de salones y los datos.
- El aspecto del riel de Mejor valorados.

## Decisions

### Lanzamientos: el horario de Inicio, compartido
`ReleaseTimetable` pasa a `src/components/discovery/ReleaseTimetable.tsx`, con su test y `release-dates.ts` si solo lo usa él. Inicio
actualiza el import. Gana tres opciones; sin ellas, Inicio queda igual:

- **`status?: (release) => { label: string; tone: "upcoming" | "published" }`:** Explorar pasa la cuenta regresiva (`t("countdown")`) en
  los próximos y «Publicado» en las novedades. Por defecto se mantienen los rótulos actuales.
- **`seeAll?: { recent?: Link; upcoming?: Link }`:** el «Ver todo →» de cada parte reemplaza a la cifra de filas en su encabezado. Esa
  cifra contaba las filas traídas (tope 12), no lanzamientos, así que en Explorar no aporta.
- **`partIds?: { recent: string; upcoming: string }`:** `id` de cada parte (`novedades`, `proximos`), para que los enlaces viejos con esas
  anclas sigan llegando. Las partes ya son `<section>` con `aria-labelledby`.

En la página, `explore.newReleases` y `explore.upcoming` (`ReleaseGroup`) se adaptan a `HomeRelease`: el artista sale de
`railArtistNames`, la fecha de `firstReleaseDate` y la sección según la lista. La sección exterior (`id="lanzamientos"`) usa
`SectionHeading` con «Lanzamientos» y una descripción con las dos ventanas (90 y 180 días).

*Alternativa descartada:* un horario nuevo solo de Explorar. Duplicaría columnas, filas y el `<details>`.

### Premios: `CeremonyRow`, texto en lugar de carátulas
Es un componente nuevo de servidor en `src/components/awards/CeremonyRow.tsx`: un `<ul>` con una columna por premio, en el mismo orden que
hoy (ceremonia más reciente primero).

- **Contenido de cada columna:** es un enlace a la ceremonia con, de arriba abajo:
  - el nombre del premio, apagado;
  - el año en `font-display` 30 px;
  - la edición en mono;
  - un filete;
  - la categoría del destacado en ámbar, con el trofeo;
  - el título (dos líneas como mucho) y el artista.
- **Columnas:** van separadas por un filete vertical (`divide-x`), sin tarjeta ni carátula. Desde `lg` son tantas columnas como premios
  (`grid-flow-col auto-cols-fr`). Por debajo, una fila deslizable con columnas al 72 %.
- **Título y crédito:** salen de una función compartida con `AwardTile`, `headlineText(ceremony)`, que se extrae de la que ya hay dentro
  de `AwardTile` para no duplicar la lógica de álbum resuelto o texto curado.

*Por qué sin carátula:* la auditoría encontró la misma carátula en tres de cinco tarjetas. Lo que distingue una ceremonia de otra es el
premio y el año; el ganador es el dato, no la imagen.

### Salones: `HallOfFameTile compact`
`HallOfFameTile` gana `compact`: la tarjeta pasa a horizontal, con la tira de 4 carátulas (`size-14` cada una) a la izquierda y, a la
derecha, el nombre y el año en grande. Conserva el fondo teñido y el número de incorporaciones. En el teléfono la tira va arriba y el texto debajo: lado a lado, el nombre del salón se cortaba a 390 px.

`HallOfFameTileGrid` gana `compact` y pone `grid-cols-1 md:grid-cols-2`. Solo la usa `HallOfFameExploreSection`. El índice
`/hall-of-fame` sigue con la tarjeta normal.

### Orden y pasillos
La página reordena sus secciones: Colecciones, Popular, Mejor valorados, Géneros, Décadas, Lanzamientos, Premios y Salones.

`jumpItems` sigue el mismo orden. «Novedades» y «Próximos» se funden en «Lanzamientos» (`catalog.explore.jump.releases`), visible si
hay alguna de las dos partes. Se retiran los mensajes `jump.newReleases` y `jump.upcoming` si nadie más los usa.

### Especificación al día
El requisito de superficie decía que las décadas cierran la página. El código las puso justo después de los géneros en
`redesign-explore-decades` y nadie corrigió la lista. Este cambio reescribe el orden completo.

## Risks / Trade-offs

- **Seis filas por parte frente a 12 carátulas en el riel.**
  - *Riesgo:* el horario muestra menos discos a primera vista.
  - *Mitigación:* el resto está a un «Ver N más» en la misma página, y los listados completos siguen a un clic.
- **Premios sin imagen.**
  - *Riesgo:* la sección se ve más sobria.
  - *Mitigación:* es deliberado, tras la sección Lanzamientos, que ya tiene carátulas. El hub conserva las tarjetas con carátula.
- **Anclas `novedades` y `proximos`.**
  - *Riesgo:* los enlaces viejos dejen de llegar.
  - *Mitigación:* se conservan en las partes, así que siguen llegando, aunque la barra marque «Lanzamientos».

## Migration Plan

No hay datos ni API que migrar. Revertir el commit restaura los rieles y las tarjetas.

## Open Questions

Ninguna bloqueante.
