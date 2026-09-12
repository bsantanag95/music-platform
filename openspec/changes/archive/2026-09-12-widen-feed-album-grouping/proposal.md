## Why

`add-feed-album-sweep`/`add-feed-album-sweep-favorites` sintetizaban un tramo de actividad
del mismo álbum en una única fila "Álbum completo · N canciones" que mezclaba escuchas,
favoritos y valoraciones bajo un solo conteo. Verificado en vivo, ese diseño resultó frágil:
requería que TODO el tramo (sin importar el tipo) sumara 3 canciones distintas entre
valoración y favorito, así que un usuario que escuchó, favoriteó y valoró varias canciones
distintas de un álbum en una sesión real seguía viendo filas sueltas si ningún tipo por sí
solo llegaba al umbral combinado, y el resultado ("N canciones", sin distinguir qué se hizo)
era menos informativo que las filas de grupo por tipo que el feed ya usa en todos lados
("valoró N canciones", "marcó N favoritos", "registró N escuchas").

## What Changes

- Se retira la fila combinada "Álbum completo" y su umbral cruzado entre tipos.
- La agrupación **por tipo que ya existe** (`FeedEntryGroup` / `GroupRow`) deja de exigir que
  las entradas sean estrictamente consecutivas en la lista cruda: dentro de un tramo de
  actividad del mismo álbum (escuchas, favoritos y valoraciones intercaladas, mismo autor),
  cada tipo se evalúa contra el mismo álbum como si sus entradas fueran contiguas.
- Resultado: recorrer un álbum canción por canción (escuchar, favoritear, valorar) puede
  producir **hasta un grupo por tipo** ("valoró 6 canciones", "marcó 3 favoritos", "registró
  5 escuchas") en vez de una fila combinada o de filas sueltas.
- Sin cambios de presentación nuevos: se reusa la fila de grupo genérica ya existente, sin
  rótulo de álbum ni enlace al álbum.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`: el requirement "Barrido de álbum en el feed" (`add-feed-album-sweep`)
  reemplaza la síntesis combinada por la extensión de la agrupación por tipo ya existente a
  tramos de álbum no contiguos.

## Impact

- **Código**: `src/components/feed/feed-grouping.ts` (se retira `FeedAlbumSweep`/
  `ALBUM_SWEEP_MIN`/`albumSweepForRun`; `albumWindowRows` reparte el tramo en buckets por
  `kind` y reusa `FeedEntryGroup`/`rotationPeakForRun`), `FeedActivityList.tsx` (se retira
  `AlbumSweepRow`, sin fila nueva que renderizar).
- **i18n**: se retira `feed.albumSweep` (`messages/{es,en}/feed.json`), sin reemplazo — las
  claves `groupSongRatings`/`groupFavorites`/`groupListens` ya existentes cubren la
  presentación.
- **Sin migraciones.** `target.albumId`/`albumTitle` (`add-feed-artist-link`/
  `add-feed-album-sweep`) siguen poblándose igual; solo cambia cómo se usan en el cliente.
