## 1. Servicio: la reseña como fuente del feed

- [x] 1.1 `src/services/feed/feed.ts` — `FeedReview` interface (`kind: "review"`, `id`, `title: string | null`, `body`, `createdAt` = `updatedAt` ISO, `target` release-group con `artistName`/`coverThumbUrl`, `author`); sumar a la unión `FeedEntry` y a `FEED_KINDS` (`"review"`)
- [x] 1.2 Nueva fuente `review` en el `Promise.all` de `listFeed`, patrón idéntico a `comment`: `select` de `review` join `appUser` + `releaseGroup`, `where` con `inArray(review.userId, authorIds)` + `BLOCKED_SQL(viewerId, review.userId)` + `titleSearchCondition(searchPattern, review.releaseGroupId, review.recordingId)`; `orderBy(desc(review.updatedAt), desc(review.id))`; `limit(perSource)`; gateado por `includeKind("review")`
- [x] 1.3 Serializar las filas de `review` a `FeedReview` y sumarlas al `merged` (mismo `.sort` por `createdAt`)
- [x] 1.4 `listMyRecentActivity` — sumar `review` propio (tier 1) a las fuentes (`listen` / `rating` / `comment` → + `review`)
- [x] 1.5 Tests de `feed.ts`: la reseña aparece en el feed con su `updatedAt`; `kind=review` acota solo reseñas; una reseña editada sigue siendo una sola entrada; bloqueo y perfil privado sin relación aceptada la excluyen; `q` sobre el título del álbum la encuentra pero `q` sobre el cuerpo de la reseña no

## 2. Zod

- [x] 2.1 `src/lib/api/schemas.ts` — `FeedReviewSchema` (`kind: z.literal("review")`, `id`, `title: z.string().nullable()`, `body: z.string()`, `createdAt`, `target: FeedTargetInfoSchema`, `author: AuthorSummarySchema`); sumarlo a `FeedEntrySchema` y a `RecentActivityEntrySchema`
- [x] 2.2 Verificar que el `parseKind` de `src/app/api/me/feed/route.ts` acepta `review` vía `FEED_KINDS` (sin cambio de código, solo confirmación + test)

## 3. Clasificación por tier

- [x] 3.1 Renombrar `src/components/feed/feed-entry-weight.ts` → `feed-entry-tier.ts`: `feedEntryTier(entry): 1 | 2 | 3 | 4` (review/comment/list → 1; listen con nota → 1, sin nota → 3; rating/favorite sobre `release-group` → 2, sobre `recording`/`artist` → 3). Conservar `isFeedEntryQuote(entry)` = tier 1 y kind ∈ {comment, review, listen-con-nota}
- [x] 3.2 Actualizar todos los imports de `isFeedEntryWithText` (buscar en `src/components/feed/` y tests)
- [x] 3.3 Tests de `feed-entry-tier.ts`: cada combinación (kind × target type × nota) → tier esperado; `isFeedEntryQuote` true solo para las tres citas

## 4. Agrupación por tier

- [x] 4.1 `src/components/feed/feed-grouping.ts` — `groupAmbientRuns` → `groupFeedRuns`: una corrida es 3+ consecutivas del mismo tier (2 o 3), mismo `kind`, mismo autor; tier 1 nunca agrupa y corta la corrida. `GROUP_MIN = 3`
- [x] 4.2 El tipo `FeedEntryGroup` gana `tier: 2 | 3` (para que el render distinga la fila agrupada leve de tier 2 de la de tier 3)
- [x] 4.3 Tests de `feed-grouping.ts`: 3 ratings de canción → grupo tier 3; 2 ratings de álbum → sin grupo; 3 favoritos de álbum → grupo tier 2; una reseña corta la corrida; un rating de álbum entre ratings de canción corta la corrida (distinto tier)

## 5. Presentación en `FeedActivityList`

- [x] 5.1 `src/components/feed/FeedActivityList.tsx` — reemplazar la bifurcación por `isFeedEntryWithText` por `feedEntryTier`:
  - tier 1 cita (comment / review / listen-con-nota): la cita actual; la reseña en redonda como el comentario, con `title` como metadato secundario cuando existe
  - tier 1 no-cita (list event): fila de título actual
  - tier 2 (rating/favorito de álbum): fila con carátula + marca de opinión; agrupación leve
  - tier 3: fila mínima actual
  - tier 4: no se renderiza (no llega)
- [x] 5.2 `GroupRow` — distinguir el render del grupo tier 2 vs tier 3 (`group.tier`); tier 2 usa el verbo de álbumes (`groupRatings`), tier 3 el de canciones (`groupSongRatings`)
- [x] 5.3 Fila de reseña: verbo "reseñó" (i18n), cuerpo como cita, `title` opcional en la línea de metadato
- [x] 5.4 `src/components/feed/FeedList.tsx` (clamp de 6 líneas) — que el clamp aplique también al cuerpo de la reseña (mismo camino que comment/nota, vía `proseBody` + `heavy`)
- [x] 5.5 i18n `messages/{es,en}/feed.json` — `reviewVerb` / `reviewVerbTitled`, `groupSongRatings`, `kind.review`; `messages/{es,en}/home.json` — `lastTouchReview`

## 6. Regresión y verificación

- [x] 6.1 Ajustar `FeedActivityList.test.tsx` / `feed-grouping.test.ts` / `feed-entry-tier.test.ts` / `feed.test.ts` / `home.test.ts` / `route.test.ts` para el modelo de tiers y la fuente de reseñas
- [x] 6.2 Confirmar sin regresión: el preview de feed de Inicio y el rastro reciente siguen renderizando; `q` / `authorId` / paginación intactos; `redesign-feed` (cita, anatomía de fila, fecha, solo lectura) se conserva — suites `src/components/feed`, `src/components/home`, `src/services/feed`, `src/services/home`, `src/app/api/me/feed` en verde
- [x] 6.3 Verificación en el navegador: feed con una reseña (cita en redonda + título como metadato), racha de ratings de canción colapsada, racha de favoritos de álbum colapsada como tier 2, un comentario/reseña cortando una corrida; `kind=review` en `/me/feed`; consola sin errores

## 7. Docs

- [x] 7.1 `docs/05-features/activity-feed.md` — el modelo de 4 tiers, la reseña como fuente, el tier 4 reservado
- [x] 7.2 Nota sobre `add-feed-rotation-peak` / `add-network-convergence` / eventos ambiente como cambios siguientes

## 8. Cierre

- [x] 8.1 `openspec validate rework-feed-tiers --strict` pasa
- [x] 8.2 `typecheck`, `lint`, `test` (1156 pasan), `build` en verde
- [ ] 8.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
