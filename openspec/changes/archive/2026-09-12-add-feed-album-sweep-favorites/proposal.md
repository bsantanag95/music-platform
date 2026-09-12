## Why

`add-feed-album-sweep` sintetiza una corrida de escuchas/valoraciones del mismo álbum en una
sola fila, pero deja el favorito completamente afuera: no es candidata y no cuenta para el
umbral. En uso real, marcar canciones como favorito es una señal tan válida de "recorrer el
álbum" como valorarlas — y, más grave, un solo favorito intercalado (agregado y quitado de
paso) corta la corrida de valoraciones en dos mitades que por separado no alcanzan el umbral,
haciendo desaparecer un barrido que debería haberse formado.

## What Changes

- El favorito de una canción pasa a ser candidata del barrido de álbum (igual que escucha y
  valoración) y a contar hacia el umbral de 3 canciones distintas, junto con las valoradas.
- Favorito + valoración de la misma canción cuentan una sola vez (por canción, no por
  entrada).
- El rótulo de la fila pasa de "N canciones valoradas" a "N canciones" — ya no es exclusivo
  de valoración.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`: el requirement "Barrido de álbum en el feed" (`add-feed-album-sweep`)
  suma el favorito como fuente del barrido, tanto para no cortar la corrida como para el
  conteo del umbral.

## Impact

- **Código**: `src/services/feed/feed.ts` (`RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL`
  sumadas a la fuente `favorite`), `src/lib/api/schemas.ts` (`albumId`/`albumTitle` en
  `FavoriteTargetInfoSchema`), `src/components/feed/feed-grouping.ts` (`favorite` sumado a
  `SweepCandidate`/`isAlbumSweepCandidate`/`albumIdOf`, umbral contado sobre
  rating-o-favorito).
- **i18n**: `feed.albumSweep` pierde la palabra "valoradas" en `messages/{es,en}/feed.json`
  (el rótulo ya no es exclusivo de valoración).
- **Sin migraciones.**
