## Context

`groupFeedRuns` (`src/components/feed/feed-grouping.ts`) recorre las entradas ya ordenadas y pliega corridas del
mismo `kind`, tier y autor. El tier sale de `feedEntryTier`: una valoración o favorito de álbum es tier 2, de
canción o artista es tier 3. `GroupRow` (`FeedActivityList.tsx`) elige la etiqueta con `group.tier === 2 ?
"groupRatings" : "groupSongRatings"`, así que cualquier grupo tier 3 de valoraciones se rotula como canciones.

## Goals / Non-Goals

**Goals:** mezclar tiers solo en valoraciones y favoritos, y una etiqueta que desglosa por tipo de objetivo.

**Non-Goals:** ver `proposal.md`.

## Decisions

### D1. La condición de tier se relaja solo para `rating` y `favorite`

En el bucle de corrida genérica, la condición `feedEntryTier(next) === tier` pasa a ser
`mixesTiers(entry.kind) || feedEntryTier(next) === tier`, con `mixesTiers` verdadero para `rating` y `favorite`.
Escuchas, colección, wishlist y seguimientos no cambian: o tienen un solo tier o, como seguir a un usuario y a un
artista, ya son `kind` distintos. `albumBoundary` se mantiene, así que dos canciones de álbumes conocidos distintos
siguen cortando la corrida.

*Alternativa descartada:* subir valoraciones de canción a tier 2. Cambiaría el peso visual de cada entrada suelta y
el preview de Inicio, que es justamente lo que el sistema de tiers protege.

### D1b. Una corrida no absorbe la valoración que abre una fila de opinión

Al extender una corrida se comprueba `opinionRowAt(entries, j)`: si la entrada siguiente abre una fila fusionada
(valoración + reseña o comentario del mismo autor sobre el mismo objetivo), la corrida termina ahí. Antes no hacía
falta porque esa valoración, de álbum, cortaba la corrida de canciones por tier; al mezclar tiers, el test existente
"la fila fusionada corta una corrida de valoraciones de canción" mostró que la corrida se la llevaba.

### D2. El tier del grupo mixto es el mayor de sus entradas

`FeedEntryGroup.tier` se calcula como 2 si alguna entrada es tier 2, si no 3. Hoy el tier del grupo solo alimenta la
etiqueta, que pasa a depender del desglose (D3), pero el campo sigue siendo coherente para el render.

### D3. Etiqueta desglosada con `Intl.ListFormat`

Para valoraciones, `GroupRow` cuenta las entradas por `target.type` (`release-group` → discos, `recording` →
canciones, `artist` → artistas). Ordena las partes por cantidad descendente y, a igualdad, discos, canciones,
artistas. Cada parte es un plural de ICU (`groupRatingParts.album`, etc.) y se unen con `Intl.ListFormat` del locale
("2 canciones y 1 disco" / "2 songs and 1 album"). La frase completa es `groupRatingsMixed` ("valoró {parts}"). Con
una sola parte da lo mismo que hoy ("valoró 3 discos"). `groupRatings` y `groupSongRatings` dejan de usarse y se
retiran.

*Por qué `Intl.ListFormat`:* ya está en el runtime (sin dependencia nueva) y resuelve la conjunción y el orden de
la coma por idioma.

### D4. Los favoritos conservan su etiqueta

"marcó 3 favoritos" no nombra el tipo, así que mezclar álbum y canción no la vuelve falsa. Desglosarla sería un
cambio de texto sin pedido.

## Risks / Trade-offs

- [Un grupo mixto mezcla una señal de opinión (tier 2) con presencia cotidiana (tier 3)] → Cada título conserva su
  nota en la fila plegada ("Currents (★ 65/100)"), así que la opinión sobre el álbum sigue a la vista.
- [Las tres superficies cambian a la vez] → Es la misma función y el mismo componente; se verifican `/activity`,
  `/me/feed` e Inicio.
