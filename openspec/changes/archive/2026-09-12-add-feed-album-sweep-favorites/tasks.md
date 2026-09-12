## 1. Álbum de una canción también en el favorito

- [x] 1.1 `src/services/feed/feed.ts`: `RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL`
      sumadas a la fuente `favorite` de `listFeed`, mapeadas a `target.albumId`/
      `target.albumTitle`.
- [x] 1.2 `src/lib/api/schemas.ts`: `albumId`/`albumTitle` opcionales en
      `FavoriteTargetInfoSchema`.
- [x] 1.3 Test de `feed.ts`: un favorito de canción expone `albumId`/`albumTitle`.

## 2. El favorito cuenta para el barrido

- [x] 2.1 `feed-grouping.ts`: `SweepCandidate`/`isAlbumSweepCandidate`/`albumIdOf` suman
      `favorite`. `albumSweepForRun` cuenta canciones distintas con rating O favorito hacia
      `ALBUM_SWEEP_MIN` (una sola vez por canción si tiene ambos).
- [x] 2.2 i18n: `feed.albumSweep` pierde "valoradas" (`messages/{es,en}/feed.json`).
- [x] 2.3 Tests de `feed-grouping.test.ts`: 3 favoritos sin rating forman barrido; un
      favorito de paso entre ratings no rompe un barrido que calificaría; favorito+rating de
      la misma canción cuenta una sola vez.
- [x] 2.4 Tests de `FeedActivityList.test.tsx`: barrido solo con favoritos; favorito
      intercalado no rompe un barrido de ratings.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build` en verde.
