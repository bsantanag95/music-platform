## Why

El feed pliega una corrida de 3 o más entradas del mismo autor solo si comparten tipo **y tier**. Una valoración
de álbum es tier 2 y una de canción o artista es tier 3, así que una persona que valora "canción, canción, álbum"
seguido queda en tres filas sueltas: ningún tramo llega al mínimo de 3. Pasa lo mismo con los favoritos. En
`/activity` esto hace que la actividad ambiente de una sola persona ocupe media pantalla (caso real: tres
valoraciones seguidas de la misma persona, tres filas completas).

Además, un grupo de valoraciones que no es tier 2 se rotula siempre "valoró N canciones", también cuando son
artistas.

## What Changes

- Las **valoraciones** consecutivas del mismo autor forman una sola corrida aunque mezclen álbum, canción y artista.
  Lo mismo los **favoritos**. Los demás tipos siguen exigiendo el mismo tier. Un cambio de álbum conocido entre dos
  canciones sigue cortando la corrida, como hoy.
- La fila plegada de valoraciones nombra la cantidad **desglosada por tipo de objetivo**: "valoró 2 canciones y 1
  disco", "valoró 3 artistas". Con un solo tipo, la etiqueta es la de hoy ("valoró 3 discos").
- La fila plegada de favoritos conserva su etiqueta ("marcó 3 favoritos"), que ya no nombra el tipo.
- Aplica en las tres superficies que comparten la agrupación: `/me/feed`, el feed y el rastro de Inicio, y
  `/activity`.

## Capabilities

### New Capabilities

<!-- ninguna -->

### Modified Capabilities

- `activity-feed`: el párrafo "Agrupación de actividad" del requisito de tiers deja mezclar tiers en valoraciones y
  favoritos y exige el desglose por tipo en la etiqueta; un escenario se ajusta y se suman tres.

## Goals

- Que la actividad de valorar o marcar favoritos seguido se lea como una sola cosa, sin importar el tipo de objetivo.
- Que la etiqueta diga exactamente qué se valoró.

## Non-Goals

- Mezclar tipos distintos (valoraciones con favoritos, o escuchas con valoraciones) en una misma fila.
- Cambiar el umbral de 3, el tramo de álbum (`add-feed-album-sweep`), el pico de rotación o la fila fusionada de
  opinión.
- Desglosar por tipo la etiqueta de favoritos.

## Impact

- **Código**: `src/components/feed/feed-grouping.ts` (regla de corrida), `src/components/feed/FeedActivityList.tsx`
  (etiqueta de `GroupRow`), `messages/{es,en}/feed.json` (partes del desglose).
- **API y esquema**: sin cambios.
- **Docs**: `docs/05-features/activity-feed.md` (agrupación).
