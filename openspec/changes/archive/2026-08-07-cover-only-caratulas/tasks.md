## 1. Esquema

- [x] 1.1 Crear migración `drizzle/0003_release_group_cover_thumb_url.sql` (ALTER `release_group` ADD `cover_thumb_url TEXT` + backfill desde `release.cover_thumb_url`)
- [x] 1.2 Espejar la columna en `src/db/schema.ts` (`releaseGroup.coverThumbUrl`) y actualizar `docs/03-data/sql-model.md`

## 2. Servicio de carátula

- [x] 2.1 Crear `src/services/catalog/cover.ts` con `findOrResolveCover(rg)`: cache hit si `rg.coverThumbUrl`, si no resuelve vía `resolveCoverThumbUrl` (CAA HEAD, 0 MB), persiste en `release_group` y devuelve; `mbid` null → null; re-resuelve si quedó null
- [x] 2.2 Escribir `cover.test.ts`: cache hit, resolución + persistencia, mbid null, HEAD 404 → null y persistido null, re-resolución self-heal

## 3. Convergencia de read/write

- [x] 3.1 `ingest-release.ts`: eliminar la resolución y self-heal de carátula sobre `release` (insertar `release` sin `coverThumbUrl`)
- [x] 3.2 `album-detail.ts`: resolver la carátula con `findOrResolveCover` y normalizar el response (`cover` = `release.coverThumbUrl` = `release_group.coverThumbUrl ?? release.coverThumbUrl` legado)
- [x] 3.3 Actualizar `ingest-release.test.ts` para el nuevo comportamiento (release sin resolución de carátula; el cover viene del RG)

## 4. Endpoint cover-only

- [x] 4.1 Crear `src/app/api/catalog/release-group/[id]/cover/route.ts` con `withErrorHandling` y `params: Promise` (Next 15): RG no existe → `ALBUM_NOT_FOUND`; existe → `{ cover }` vía `findOrResolveCover`
- [x] 4.2 Escribir `route.test.ts` del endpoint: 200 con cover, 200 cover null, 404 `ALBUM_NOT_FOUND`
- [x] 4.3 Actualizar `scripts/smoke-test-routes.ts` con un caso del endpoint nuevo

## 5. Frontend

- [x] 5.1 `src/lib/api/schemas.ts`: agregar `CoverSchema = { cover: string | null }`
- [x] 5.2 `src/lib/api/catalog.ts`: `getReleaseGroupCover(id)` vía `apiFetch`
- [x] 5.3 `src/lib/query/keys.ts`: query key `releaseGroupCover(id)`
- [x] 5.4 `LazyCoverImage.tsx`: usar `getReleaseGroupCover` en lugar de `getReleaseGroupDetail`
- [x] 5.5 Actualizar `LazyCoverImage.test.tsx` al mock del nuevo cliente

## 6. Docs

- [x] 6.1 `docs/04-api/contracts.md`: sección del endpoint cover-only + nota de que la carátula se resuelve sin ingestar tracklist
- [x] 6.2 `docs/02-architecture/code-walkthrough.md`: actualizar LazyCoverImage, `ingest-release`, `album-detail` y documentar las decisiones (single source + self-heal)

## 7. Validación

- [x] 7.1 Correr `pnpm run db:migrate` (aplica `0003`) contra Postgres real
- [x] 7.2 Correr `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 7.3 Correr `scripts/smoke-test-routes.ts` (y `smoke-test-ingestion.ts` primero) contra Postgres real
- [x] 7.4 Verificación manual con `pnpm dev`: artista frío muestra carátulas en paralelo sin bloquearse detrás del tracklist
