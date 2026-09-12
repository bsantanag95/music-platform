## Context

`groupFeedRuns` (`src/components/feed/feed-grouping.ts`) pliega corridas consecutivas del
mismo `kind` + tier + autor; ya tiene un precedente de "sintetizar en vez de enumerar" con
`FeedRotationPeak` (`add-feed-rotation-peak`), que reconoce una corrida de escuchas del
**mismo objetivo** dentro de una ventana de 7 días. El caso pedido ahora es distinto en dos
sentidos: (1) el objetivo común es el **álbum**, no la canción exacta — cada entrada es de
una canción *distinta* del mismo disco; y (2) el `kind` no es uniforme — el flujo real
alterna escucha y valoración canción por canción, algo que la agrupación por-tipo no puede
atravesar (exige `kind` idéntico en toda la corrida).

No existe hoy ningún dato de "a qué álbum pertenece esta canción" en el payload del feed: el
target de una escucha/rating de canción trae `artistName` (el artista acreditado de la
canción, vía `PRIMARY_ARTIST_SQL`) pero no el álbum contenedor. Una grabación se vincula a su
álbum vía `track.release_id → release.release_group_id`; como la ingesta solo trae la edición
representativa de cada álbum (`representative-release.ts`), esa cadena resuelve a un único
álbum en el caso común.

## Goals / Non-Goals

**Goals:**

- Sintetizar una corrida de escuchas/valoraciones de canciones del mismo álbum, con al menos
  3 canciones distintas valoradas, en una sola fila "Álbum completo".
- Que el `kind` pueda alternar libremente dentro de esa corrida (escucha y valoración
  intercaladas cuentan para el mismo barrido).
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- Favoritos y comentarios/reseñas NO alimentan el barrido — el caso pedido es
  específicamente "escuchar/valorar canción por canción", no cualquier actividad sobre el
  álbum. Sumarlos es una extensión futura, no pedida.
- El barrido NO tiene ventana temporal (a diferencia del pico de rotación, que exige que los
  registros caigan dentro de 7 días) — es puramente sobre la corrida consecutiva cargada,
  igual que la agrupación genérica de la que deriva.
- Un umbral proporcional al tamaño real del álbum (ej. "80% de las canciones") queda fuera:
  3 canciones distintas es un umbral absoluto, más simple y consistente con `GROUP_MIN`.

## Decisions

### 1. Subqueries hermanas para el álbum, mismo patrón que el artista acreditado

`RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL` (`feed.ts`) son subqueries escalares
sobre `track`/`release`/`release_group`, mismo patrón ya aceptado para
`PRIMARY_ARTIST_SQL`/`PRIMARY_ARTIST_ID_SQL` (dos subqueries casi idénticas en vez de una
fila compuesta — ver `add-feed-artist-link`, decisión 1). Solo se suman a las fuentes
`listen` y `rating` de `listFeed`/`listMyRecentActivity`: son las únicas que alimentan el
barrido.

### 2. El barrido se evalúa ANTES de la agrupación por tipo, no reemplaza su corte

`groupFeedRuns` intenta un barrido de álbum en cada posición antes de intentar la agrupación
por tipo. Si la corrida de candidatas (escucha/rating del mismo álbum) no alcanza el umbral,
el algoritmo cae al camino normal sin consumir nada — la posición no avanza, así que la
agrupación por tipo sigue evaluando esa misma entrada como siempre.

### 3. Cambio de álbum conocido corta también la agrupación genérica

Sin este ajuste, una corrida de 5 ratings de canción donde las primeras 2 son de un álbum y
las últimas 3 de otro se fundía en un único grupo genérico "valoró 5 canciones" (la
agrupación por tipo no distingue álbumes). Eso le robaba a las últimas 3 la chance de
formar su propio barrido. Se agrega un corte adicional a la corrida genérica: si dos
entradas consecutivas son escucha/rating de canción con álbum **conocido y distinto**, la
corrida se corta ahí. Sin dato de álbum en cualquiera de las dos (el caso común hoy para
listas/favoritos/artistas), no corta nada — preserva el comportamiento anterior.

### 4. Umbral sobre canciones VALORADAS, no sobre entradas totales

Una escucha de una canción del álbum sin el rating correspondiente **no cuenta** para el
umbral de 3, pero tampoco corta la corrida — queda absorbida como "de paso" dentro del
barrido si hay valoraciones alrededor. Esto refleja que la señal real que motivó el pedido
es "valoró el álbum", no "tocó el álbum".

### 5. Sin celda de carátula, mismo criterio que pico de rotación y grupo genérico

`AlbumSweepRow` reusa la anatomía subordinada ya establecida: sin `FeedCell`, autor + rótulo
+ fecha arriba, álbum enlazado (con el artista acreditado de la canción, reusado tal cual —
no se pide el artista del álbum por separado) debajo.

## Risks / Trade-offs

- [Un umbral absoluto de 3 no distingue un álbum de 4 canciones de uno de 20] → Aceptado:
  mismo criterio que `GROUP_MIN`/`ROTATION_PEAK_MIN_SONG`, ya usados sin ponderar por
  tamaño real del objetivo.
- [Cortar la agrupación genérica en un cambio de álbum conocido cambia un comportamiento
  existente, aunque sea un caso raro (dos álbumes distintos espalda con espalda, ninguno
  alcanza el umbral)] → Aceptado: sin el corte, el segundo álbum nunca podría formar su
  propio barrido; con datos de álbum ausentes (mayoría de casos hoy) el corte no aplica.

## Migration Plan

No aplica migración de datos ni de esquema — `track`/`release`/`release_group` ya existen.
Rollback = revertir el cambio de código.
