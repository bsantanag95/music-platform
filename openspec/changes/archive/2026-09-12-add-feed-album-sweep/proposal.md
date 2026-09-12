## Why

Un usuario que valora todas las canciones de un álbum en poco tiempo genera una entrada de
feed por canción — con un álbum de 12 temas, eso son hasta 12 filas seguidas en el feed de
quien lo sigue. La agrupación por tipo existente (`groupFeedRuns`) ya colapsa una corrida de
3+ ratings consecutivos del mismo autor en una fila genérica ("valoró 12 canciones"), pero
solo si el `kind` es idéntico en toda la corrida. El flujo más común —escuchar y valorar
canción por canción, alternando `listen`/`rating`— no colapsa nada hoy: la corrida se corta
en cada cambio de tipo y termina como hasta 24 filas sueltas.

## What Changes

- Una corrida consecutiva de escuchas y/o valoraciones del mismo autor, todas de canciones
  del **mismo álbum** (`kind` alternando libremente entre `listen` y `rating`), donde al
  menos 3 canciones distintas fueron valoradas, se sintetiza en una única fila "Álbum
  completo · N canciones valoradas" con el álbum enlazado — en vez de una fila por
  escucha/rating o de un grupo genérico partido por tipo.
- Nueva fila subordinada `FeedAlbumSweep`, misma anatomía que el pico de rotación ya
  existente (sin celda, autor + rótulo + fecha arriba, objetivo enlazado debajo).
- El feed resuelve el álbum de una canción vía su edición ingerida (`track`/`release`/
  `release_group`), un dato que hoy no viaja en el payload.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`: nuevo requirement "Barrido de álbum en el feed", que refina la
  presentación de una corrida colapsable descrita en "Jerarquía de presentación del feed" —
  mismo patrón que ya usa "Pico de rotación en el feed" para no reabrir ese requirement.

## Impact

- **Código**: `src/services/feed/feed.ts` (`RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL`,
  sumadas a las fuentes `listen` y `rating`), `home.ts` (mismas dos fuentes),
  `src/lib/api/schemas.ts` (`albumId`/`albumTitle` opcionales en los esquemas de objetivo),
  `src/components/feed/feed-grouping.ts` (detección de barrido + corte de la agrupación
  genérica en un cambio de álbum conocido), `FeedActivityList.tsx` (`AlbumSweepRow`).
- **Superficies visuales**: `/me/feed`, el preview de feed y de rastro reciente de Inicio, y
  las pestañas "De la gente que seguís" / "Tu actividad" de `/activity` heredan el barrido
  por reusar `FeedActivityList`/`groupFeedRuns`.
- **Sin migraciones**: el álbum de una canción se deriva de `track`/`release`, ya existentes.
- **i18n**: nueva clave `feed.albumSweep` en `messages/{es,en}/feed.json`.
