## 1. Ranking

- [x] 1.1 `MBReleaseGroupSearchItem.count` y campo opcional `popularity` en `RankKey` (entre actividad y cacheado)
- [x] 1.2 `coverageLevel`: artículo inicial ignorado en el nivel 2; consulta = nombre de un artista acreditado → nivel 1
- [x] 1.3 `releaseGroupsByArtists` y su uso en `albums.ts` cuando la consulta completa es un artista local; `popularity` desde `count`
- [x] 1.4 Pruebas: coverage (artista, autotitulado, artículo), albums (notoriedad, artículo, discografía local)

## 2. Documentación y verificación

- [x] 2.1 `docs/04-api/contracts.md`: orden de `type=album`
- [x] 2.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 2.3 Servidor real sobre scratch: `dark side of the moon`, `pink floyd`, `abbey road`, `in rainbows`, `kiss destroyer` (antes/después en el diseño); corregido un 500 por `SELECT DISTINCT` + `ORDER BY` detectado en esta verificación
