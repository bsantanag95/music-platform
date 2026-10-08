## Context

`songSuggestions` (`src/services/catalog/search/suggest.ts`) hoy:

1. `matchLocalRecordings(text, 40)`: trigramas o subcadena sobre `search_normalize(recording.title)` (índice GIN de
   la migración `0050`), ordenado por similitud, reordenado por `matchTier`;
2. `rankSuggestionRows`: nivel de coincidencia → actividad → similitud;
3. corta a 6 y resuelve el artista de cada una con `localRecordingArtistName` (**una consulta por fila**).

Mediciones sobre scratch (21.886 grabaciones, 2.656 títulos repetidos; mediana de 7 ejecuciones en caliente,
2026-10-08):

| Consulta | `suggest('song')` hoy | Pool de 40 | Pool de 80 |
|---|---|---|---|
| `on` | 163 ms | 156 ms | 267 ms (peor 523) |
| `one` | 27 ms | 24 ms | 27 ms |
| `stairway` | 13 ms | 7 ms | 9 ms |
| `bohemian rh` | 10 ms | 5 ms | 4 ms |
| `taste` | 27 ms | 14 ms | 19 ms |

Consultas en lote sobre 80 candidatos: artista principal 2–3 ms, álbumes por grabación 2–5 ms, actividad 2–4 ms,
seguidores de los artistas 1–3 ms. Puente: artistas en un extremo (`search_key`, índice de `0051`) ~1 ms;
grabaciones de un artista con prefijo: Metallica «one» 3 ms, el peor caso (Fleetwood Mac, 1.325 grabaciones, prefijo
«a») 16 ms.

Los índices necesarios ya existen: `track(recording_id)`, `release(release_group_id)`, `credit(artist_id)`,
trigramas sobre el título y `search_key(artist.name)`.

## Goals / Non-Goals

**Goals:** agrupar por canción, puente artista + canción, orden con señales locales, cobertura de la consulta, todo
dentro de 40 ms de mediana con 3+ caracteres.

**Non-Goals:** acelerar las consultas de 2 caracteres (el costo está en el filtro de trigramas, no en este cambio;
necesitaría un índice de prefijo y una migración), tocar los otros tipos o la búsqueda completa.

## Decisions

### D1. Pool de candidatos según la longitud

80 candidatos con 3+ caracteres normalizados, 40 con 2. Con 2 caracteres el pool más grande cuesta +100 ms de
mediana (y picos de 500 ms) porque el filtro casa miles de títulos; con 3+ cuesta entre −1 y +5 ms. El pool más
grande hace falta porque, al agrupar, varias filas colapsan en una y la versión canónica de una canción con muchos
homónimos («One») puede quedar fuera de los 40 primeros por similitud, que entre títulos iguales es arbitraria.

*Alternativa*: ordenar en SQL por similitud y después por número de álbumes. Descartada: obliga a contar pistas de
todas las filas que pasan el filtro, no solo de las candidatas.

### D2. Señales en lote y en paralelo

Tras el pool (y en paralelo con el puente), una sola tanda `Promise.all` sobre los ids candidatos:

- artista principal de cada grabación (`credit.role = 'primary'`, menor `position`), con `discography_synced_at`;
- álbumes por grabación: `count(DISTINCT release.release_group_id)` vía `track`;
- actividad: la consulta existente de `activityScores("recording", …)`;
- seguidores por artista: `count(*)` de `artist_follow` de los artistas principales.

Reemplaza las 6 consultas secuenciales de `localRecordingArtistName`, así que el número de idas a la base baja de
~8 secuenciales a 1 + 4 en paralelo. Las funciones nuevas viven en `local-match.ts` (solo lecturas).

### D3. Agrupación

Clave `search_normalize(baseSongTitle(title)) | search_normalize(artista)` con `baseSongTitle` exportado de
`songs.ts` (mismo criterio que la búsqueda completa). Representante: la grabación con más álbumes; a igualdad, la de
mejor nivel de coincidencia y luego la primera por similitud. Las señales del grupo: suma de actividad, máximo de
álbumes. Grabaciones sin artista principal forman grupo por título con artista vacío.

### D4. Puente artista + canción

Mismo mecanismo que `bridgeAlbums`: `edgeSplits` + `findArtistsByKeys` + `restAfterEdgeArtist`. Solo si el resto
normalizado tiene 2+ caracteres (evita el peor caso de un prefijo de una letra sobre miles de grabaciones). Consulta
nueva `recordingsByArtistsAndTitlePrefix(artistIds, rest, limit)`: grabaciones con crédito principal de esos
artistas cuyo `search_normalize(title)` empieza por el resto, `LIMIT 40`. Corre en paralelo con el pool. Sus
grabaciones entran en la misma agrupación, marcadas como puente.

### D5. Orden y cobertura

Bloques: puente → cubre la consulta → difusa. Cobertura en TypeScript con la normalización de `normalize.ts`: cada
palabra de la consulta está entre las palabras de título ∪ artista; la última, como prefijo de alguna. Dentro de
cada bloque: palabras de la consulta cubiertas (solo distingue entre difusas) → `matchTier` del título base →
actividad → álbumes → seguidores → artista explorado → índice de similitud del pool.

El conteo de palabras cubiertas se agregó al implementar: sin él, con `oasis wonderw` las otras «Wonderwall» (que
cubren "wonderw" pero no "oasis") quedaban detrás de «I Wonder Why», que no cubre ninguna pero aparece en más
álbumes. La lógica vive en `song-suggestions.ts` para no inflar `suggest.ts`.

`matchTier` se calcula contra el **resto** de la consulta en el bloque del puente (la parte de canción) y contra la
consulta completa en los demás.

### D6. El diálogo "Añadir" no cambia

Su filtro de cobertura en el cliente (cambio `speed-up-quick-actions-search`) queda redundante para las filas que
cubren y sigue descartando el relleno difuso, que en el diálogo reemplaza la búsqueda completa. No se toca.

## Risks / Trade-offs

- [El número de álbumes favorece canciones muy compiladas] → es una señal de desempate, detrás del nivel de
  coincidencia y de la actividad propia; nunca adelanta a una coincidencia exacta.
- [Pool de 80 con 3 caracteres en un catálogo mucho mayor] → el límite de 40 ms queda como requisito y se mide en
  la verificación; si se supera, se baja el pool antes que el criterio de orden.
- [Grupos con artista vacío] → hoy hay 1 grabación sin crédito principal en scratch; se agrupan por título y quedan
  detrás por no tener artista explorado.

## Migration Plan

Sin migraciones. Despliegue normal; rollback revirtiendo el commit.

## Open Questions

Ninguna.

## Resultados medidos (2026-10-08)

`suggest('song')` sobre scratch, mediana de 7 ejecuciones en caliente:

| Consulta | Antes | Después | Primeras sugerencias después |
|---|---|---|---|
| `on` | 172,9 ms | 171,5 ms | Ramble On — Led Zeppelin, Blood on Blood — Bon Jovi, … |
| `one` | 22,5 ms | 25,4 ms | **One — Metallica**, One — Dokken, One — Ride 'Em All, … (antes: cuarteto + 5× Metallica) |
| `stairway` | 11,4 ms | 15,1 ms | **Stairway to Heaven — Led Zeppelin** (una vez), Rolf Harris, Dread Zeppelin, … |
| `bohemian rh` | 9,3 ms | 10,8 ms | **Bohemian Rhapsody — Queen**, Glee Cast, … (antes: 6 covers) |
| `taste` | 13,5 ms | 13,3 ms | **Taste — Sabrina Carpenter** (una vez), Ana Done, Stark, … |
| `metallica one` | 7,1 ms | 9,4 ms | **One — Metallica**, String Metallica, Metall |
| `oasis wonderw` | 9,3 ms | 6,9 ms | **Wonderwall — Oasis**, Oasis — Dokken, Wonderwall — Metome, … |
| `paranoid` | 12,4 ms | 8,5 ms | **Paranoid — Black Sabbath**, Ryan Preston, Paranoid Android — Radiohead, … |
| `bohemian rapsody` | 8,2 ms | 10,7 ms | Bohemian Rhapsody — Queen, … (relleno difuso) |
| `hey jude` | 7,8 ms | 8,0 ms | Hey God, Hey - Hey, Hey Joe… (no hay «Hey Jude» local: solo relleno difuso) |

Todas las consultas de 3+ caracteres quedan por debajo de 40 ms de mediana y `on` no empeora.
