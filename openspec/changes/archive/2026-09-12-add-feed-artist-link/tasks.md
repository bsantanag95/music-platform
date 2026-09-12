## 1. Id del artista acreditado en el payload del feed

- [x] 1.1 `src/services/feed/feed.ts`: nueva subquery `PRIMARY_ARTIST_ID_SQL`, hermana de
      `PRIMARY_ARTIST_SQL`, sumada como `creditedArtistId` a las cinco fuentes con objetivo
      de catálogo (`listen`, `favorite`, `rating`, `comment`, `review`) en `listFeed`, y
      mapeada a `target.artistId`.
- [x] 1.2 `src/services/home/home.ts`: mismo campo en las cuatro fuentes de
      `listMyRecentActivity` que aplican (`listen`, `rating`, `comment`, `review`).
- [x] 1.3 `src/lib/api/schemas.ts`: `artistId: z.uuid().nullable().optional()` en
      `ListenTargetInfoSchema`, `FavoriteTargetInfoSchema` y `FeedTargetInfoSchema` — mismo
      criterio de opcionalidad que `artistName`.
- [x] 1.4 `src/services/activity/community-activity.ts`: `artistId: null` explícito junto al
      `artistName: null` ya existente (esa fuente no lo puebla, `CompactActivityRow` no lo
      usa).
- [x] 1.5 Test de `feed.ts`: el objetivo de un favorito de álbum expone `artistId`; el de un
      favorito de artista expone `artistId: null`.

## 2. Enlace en la presentación

- [x] 2.1 `feed-row-parts.tsx`: `TargetTitle` gana `artistHref?: string | null` — cuando
      existe, envuelve el nombre del artista en un `Link`; si no, sigue como texto plano
      (compatible con `DiaryActivityList`, que no lo pasa).
- [x] 2.2 `FeedActivityList.tsx`: `targetLink()` computa `artistHref` a partir de
      `target.artistId` (`targetHref("artist", artistId)`); ambos call-sites de
      `TargetTitle` ya lo reciben vía spread.
- [x] 2.3 Tests de `FeedActivityList.test.tsx`: el nombre del artista es un enlace cuando hay
      `artistId`; sigue siendo texto plano sin él; un objetivo de tipo artista no duplica el
      enlace del título.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build` en verde.
- [x] 3.2 Verificación manual en el navegador de `/activity` (anónimo, `CompactActivityRow`)
      sin regresiones — esa superficie no cambia. No verificable en vivo `/me/feed` (requiere
      sesión autenticada, que este entorno no puede crear) — cubierto por los tests
      automatizados de `feed.ts`, `home.ts` y `FeedActivityList`.
