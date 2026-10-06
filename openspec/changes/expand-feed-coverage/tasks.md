## 1. Base de datos: audiencia de la wishlist

- [x] 1.1 Migración `drizzle/0061_wanted_entry_audience.sql`: `ADD COLUMN audience text NOT NULL DEFAULT 'private'`, `CHECK` del vocabulario, luego `SET DEFAULT 'followers'` (D5)
- [x] 1.2 Espejo en `src/db/schema.ts` (`wantedEntry.audience` + check) y `docs/03-data/sql-model.md`

## 2. Wishlist con audiencia (servicio, API, UI)

- [x] 2.1 `default-audience.ts`: tipo `wanted` con default `followers`
- [x] 2.2 `services/collection/wanted.ts` + `wanted-types.ts`: `audience` en alta en lote (una por lote, resuelta con `resolveNewContentAudience`), en `PATCH` y en la serialización; tests
- [x] 2.3 Schemas Zod (`WantedEntry`, `AddWantedEntriesRequest`, `UpdateWantedEntryRequest`) y validación en las rutas `/api/me/collection/wanted*`
- [x] 2.4 UI: audiencia visible en cada entrada (página de álbum y pestaña "Busco") y selector en la edición de la pestaña "Busco" (mismo patrón que `CollectionEntryForm`: el alta usa el default)

## 3. Feed: fuentes nuevas

- [x] 3.1 Tipos `FeedCollection`, `FeedWanted`, `FeedCamino` en `feed.ts` y schemas Zod; `FEED_KINDS` suma `collection`, `wanted`, `camino`
- [x] 3.2 Fuentes de colección y wishlist en `listFeed` (audiencia, bloqueo, búsqueda por título/artista)
- [x] 3.3 Fuente de Camino creado (audiencia, moderación, archivado, bloqueo, búsqueda por título) y de Camino completado con `CAMINO_COMPLETED_AT_SQL` (D2)
- [x] 3.4 Las listas ocultas por moderación dejan de generar eventos de lista
- [x] 3.5 `listMyRecentActivity` (rastro propio) suma colección, wishlist y Caminos; `RecentActivityEntrySchema`
- [x] 3.6 Tests de servicio actualizados (orden de fuentes) y nuevos casos

## 4. Feed: presentación

- [x] 4.1 Puntaje detallado: `showScore` + `ratingLabelScore` en la fila; `★ 86/100` en la corrida plegada (D1)
- [x] 4.2 `feedEntryTier`: colección y wishlist tier 3, Camino tier 1; `isGroupable` y verbos de grupo para colección y wishlist
- [x] 4.3 Fusión de opinión en `groupFeedRuns` (`FeedOpinionRow`, D6) y su render en `FeedActivityList` (ambas variantes)
- [x] 4.4 Filas de colección, wishlist (con formato) y Camino; glifos nuevos en `FeedKindIcons`; filtro de tipo en `FeedList`
- [x] 4.5 Retirar la franja ambiente: `ambient.ts`, `FeedAmbientStrip`, sus tests y su uso en `/me/feed`
- [x] 4.6 Traducciones `messages/{es,en}/feed.json`
- [x] 4.7 Tests de componentes y de agrupación

## 5. Documentación y cierre

- [x] 5.1 `docs/05-features/activity-feed.md`, `physical-collection.md`, `caminos.md`; `docs/04-api/contracts.md` (`/api/me/feed`, wishlist); `business-rules.md` si aplica
- [ ] 5.2 Al archivar: borrar `openspec/specs/feed-ambient-events/` (queda sin requisitos; `openspec archive` no acepta un spec vacío)
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 5.4 Verificar las queries nuevas contra Postgres (script `tsx --env-file=.env`) y aplicar `0061`
