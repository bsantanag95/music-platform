## 1. Agrupación

- [x] 1.1 `groupFeedRuns`: valoraciones y favoritos forman corrida aunque mezclen tier 2 y 3; el resto sigue exigiendo el mismo tier; `albumBoundary` se mantiene (D1)
- [x] 1.2 Tier del grupo = el mayor de sus entradas (D2)
- [x] 1.3 Tests en `feed-grouping.test.ts`: canción + canción + álbum se pliegan; favoritos mixtos; una escucha entre medio sigue cortando; valoraciones y favoritos no se mezclan; una valoración que abre una fila de opinión no se absorbe

## 2. Etiqueta

- [x] 2.1 `GroupRow`: desglose por tipo de objetivo para valoraciones con `Intl.ListFormat` y orden por cantidad (D3)
- [x] 2.2 `messages/{es,en}/feed.json`: `groupRatingsMixed` y `groupRatingParts.{album,song,artist}`; retirar `groupRatings` y `groupSongRatings`
- [x] 2.3 Tests en `FeedActivityList.test.tsx`: "valoró 2 canciones y 1 disco", "valoró 3 artistas", "valoró 3 discos", en es y en

## 3. Documentación y verificación

- [x] 3.1 `docs/05-features/activity-feed.md`: la regla de agrupación
- [x] 3.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.3 Navegador: `/activity`, `/me/feed` e Inicio con una corrida mixta real
