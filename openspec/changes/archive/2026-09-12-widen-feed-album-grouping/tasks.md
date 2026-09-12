## 1. Reemplazar la fila combinada por agrupación por tipo

- [x] 1.1 `feed-grouping.ts`: retirar `FeedAlbumSweep`, `ALBUM_SWEEP_MIN`,
      `albumSweepForRun`; `isAlbumSweepCandidate` excluye tier 1 (nota de escucha).
- [x] 1.2 Nueva `albumWindowRows(window, now)`: reparte el tramo por `kind` en 3 buckets
      (rating/favorite/listen); cada bucket con `>= GROUP_MIN` emite un `FeedEntryGroup`
      (reusando el tipo y el render ya existentes); el bucket de escuchas evalúa
      `rotationPeakForRun` antes de la agrupación genérica; buckets por debajo del umbral
      quedan como entradas sueltas; si ningún bucket alcanza el umbral, el tramo se
      devuelve intacto.
- [x] 1.3 `groupFeedRuns`: solo toma el camino de `albumWindowRows` cuando el tramo tiene
      más de un elemento (un tramo de 1 sigue el camino normal, para no perder la chance de
      fusionarse con una entrada siguiente del mismo `kind` sin álbum resuelto).
- [x] 1.4 `FeedActivityList.tsx`: retirar la rama de render `"album-sweep"` y el componente
      `AlbumSweepRow` (sin reemplazo — se reusa `GroupRow`).
- [x] 1.5 i18n: retirar `feed.albumSweep` (`messages/{es,en}/feed.json`), sin reemplazo.

## 2. Tests

- [x] 2.1 Reescribir el describe de `feed-grouping.test.ts` para el nuevo comportamiento:
      escucha+rating intercalados producen 2 grupos separados; favorito de paso no le quita
      al grupo de ratings la chance de formarse; favorito+rating de menos de 3 canciones no
      forma ningún grupo (cada bucket es independiente); álbumes/autores distintos no se
      mezclan; un comentario corta el tramo.
- [x] 2.2 Reescribir el describe de `FeedActivityList.test.tsx` en línea con lo anterior,
      verificando que se renderizan las filas de grupo ya existentes
      ("valoró N canciones", "marcó N favoritos", "registró N escuchas").

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build` en verde.
