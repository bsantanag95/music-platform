## 1. Álbum de una canción en el payload del feed

- [x] 1.1 `src/services/feed/feed.ts`: `RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL`,
      subqueries escalares hermanas sobre `track`/`release`/`release_group`, sumadas como
      `recordingAlbumId`/`recordingAlbumTitle` a las fuentes `listen` y `rating` de
      `listFeed`, mapeadas a `target.albumId`/`target.albumTitle`.
- [x] 1.2 `src/services/home/home.ts`: mismo campo en las fuentes `listen` y `rating` de
      `listMyRecentActivity`.
- [x] 1.3 `src/lib/api/schemas.ts`: `albumId`/`albumTitle` opcionales en
      `ListenTargetInfoSchema` y `FeedTargetInfoSchema` — mismo criterio de opcionalidad
      que `artistName`/`artistId`.
- [x] 1.4 `src/services/activity/community-activity.ts`: `albumId`/`albumTitle: null`
      explícitos junto a los ya existentes (esa fuente no alimenta el barrido).
- [x] 1.5 Tests de `feed.ts`/`home.ts`: una canción con álbum resuelto expone
      `albumId`/`albumTitle`; un objetivo de artista expone ambos en `null`.

## 2. Detección del barrido

- [x] 2.1 `feed-grouping.ts`: `FeedAlbumSweep` (`kind: "album-sweep"`, `album: {id, title,
      artistName, artistId}`, `count`, `author`, `createdAt`), `ALBUM_SWEEP_MIN = 3`,
      `isAlbumSweepCandidate`/`continuesAlbumSweep`/`albumSweepForRun`.
- [x] 2.2 `groupFeedRuns`: evalúa el barrido antes de la agrupación por tipo en cada
      posición; si no alcanza el umbral, cae al camino normal sin consumir nada.
- [x] 2.3 `albumBoundary`: corta también la agrupación genérica por tipo en un cambio de
      álbum conocido, para no fundir dos álbumes distintos en un solo grupo genérico y
      robarle al segundo la chance de formar su propio barrido.
- [x] 2.4 Tests de `feed-grouping.test.ts`: barrido con solo ratings, con escucha+rating
      intercalados, umbral no alcanzado, álbumes distintos no se mezclan, autores distintos
      no se mezclan, un tier 1 corta el barrido.

## 3. Presentación

- [x] 3.1 `FeedActivityList.tsx`: rama de render para `kind === "album-sweep"` →
      `AlbumSweepRow`, misma anatomía subordinada que `RotationPeakRow` (sin celda, autor +
      rótulo + fecha arriba, álbum enlazado + artista acreditado debajo).
- [x] 3.2 i18n: nueva clave `feed.albumSweep` (`{count, plural, ...}`) en
      `messages/{es,en}/feed.json`.
- [x] 3.3 Tests de `FeedActivityList.test.tsx`: barrido renderizado con el álbum enlazado;
      escucha+rating intercalados también se sintetizan; sin alcanzar el umbral se muestran
      filas normales; `variant="self"` omite el autor y conserva el álbum enlazado.

## 4. Verificación

- [x] 4.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build` en verde.
- [x] 4.2 No verificable en vivo (requiere sesión autenticada y datos de catálogo reales con
      varias canciones de un mismo álbum ingeridas, que este entorno no puede crear) —
      cubierto por los tests automatizados de `feed-grouping` y `FeedActivityList`.
