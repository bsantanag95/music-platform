## Context

Verificando `add-feed-album-sweep-favorites` en vivo (capturas de un feed real con escuchas,
favoritos y valoraciones de varias canciones del mismo álbum, `Prueba Testing`), la fila
combinada nunca se formó: el usuario recorrió el álbum canción por canción, pero cada tipo
por separado no siempre llegaba a las 3 canciones que exigía el umbral **combinado** entre
valoración y favorito, y el feedback directo fue "mejor que se agrupen según sus tipos y no
todo junto" — con el ejemplo explícito de tres filas de grupo, una por tipo.

El feed ya tenía exactamente ese mecanismo (`FeedEntryGroup`/`GroupRow`, con las claves
`groupSongRatings`/`groupFavorites`/`groupListens`) para corridas **contiguas** del mismo
`kind`. El problema real nunca fue la falta de una síntesis por álbum: fue que ese mecanismo
exige contigüidad estricta, y el flujo real de "escuchar, favoritear y valorar" alterna
`kind` en cada canción, así que 3 valoraciones reales del mismo álbum casi nunca terminan
una al lado de la otra en la lista cruda.

## Goals / Non-Goals

**Goals:**

- Recorrer un álbum canción por canción sigue produciendo, para cada tipo con al menos 3
  canciones distintas, la misma fila de grupo que ya existe en cualquier otra parte del feed
  — sin inventar una presentación nueva.
- Un favorito de paso (agregado y quitado) no le cuesta a las valoraciones (ni viceversa) la
  chance de alcanzar su propio umbral.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- No se reintroduce ninguna mención al álbum en la presentación (ni rótulo, ni enlace) — las
  filas de grupo por tipo nunca lo tuvieron y no se pidió sumarlo.
- Un umbral combinado entre tipos (ej. "3 canciones entre valoración y favorito, sumadas")
  queda descartado: cada tipo compite por su propio umbral, de forma independiente.

## Decisions

### 1. Reusar `FeedEntryGroup`/`GroupRow`, no una fila nueva

En vez de una síntesis con su propio tipo (`FeedAlbumSweep`) y componente (`AlbumSweepRow`),
`albumWindowRows` bucketiza el tramo de álbum por `kind` y emite, para cada bucket que
alcanza `GROUP_MIN`, el mismo `FeedEntryGroup` que ya renderiza `GroupRow` en cualquier otra
corrida contigua. Cero UI nueva, cero i18n nueva — las claves `groupSongRatings`/
`groupFavorites`/`groupListens` ya existían y ya decían exactamente lo pedido.

### 2. Los buckets son independientes: una canción puede aportar a más de uno

Una canción favoriteada Y valorada dentro del mismo tramo participa en el bucket de
favoritos y en el de valoraciones por separado — no hay un conteo cruzado entre tipos. Es
más simple que el diseño anterior (que sí cruzaba favorito+valoración hacia un umbral común)
y evita la pregunta ambigua de "¿esta canción cuenta como valorada o como favoriteada?" — no
hace falta elegir, cuenta para ambas si corresponde.

### 3. El pico de rotación sigue teniendo prioridad dentro del bucket de escuchas

Si el bucket de escuchas de un tramo de álbum resulta ser todo del MISMO tema (relisten),
`albumWindowRows` sigue evaluando `rotationPeakForRun` antes de la agrupación genérica —
mismo criterio de precedencia que ya usa la agrupación contigua fuera de un tramo de álbum.

### 4. Tramos de un solo elemento no toman este camino

Si el tramo de candidatas de álbum tiene un solo elemento, se deja seguir el camino normal
(`isGroupable`) en vez de bucketizarlo — así conserva la chance de fusionarse con una
entrada siguiente del mismo `kind` sin álbum resuelto (ej. una valoración de artista), que
el camino de bucketización no contempla.

## Risks / Trade-offs

- [Dos canciones distintas favoriteadas y valoradas (4 entradas), ninguna alcanza 3 en su
  propio tipo] → Aceptado: es exactamente el caso "ninguno de los dos tipos llega al
  umbral", ahora evaluado por separado en vez de sumado — más estricto que el diseño
  anterior, pero también más simple y predecible.
- [Retirar `FeedAlbumSweep`/`feed.albumSweep` es una regresión de una fila que nunca llegó a
  verificarse funcionando en un feed real] → Aceptado: se corrige dentro de la misma sesión
  en la que se introdujo, antes de que dependa de ella ninguna otra superficie.

## Migration Plan

No aplica migración de datos ni de esquema. Rollback = revertir el cambio de código.
