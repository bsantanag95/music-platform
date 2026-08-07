## 1. Resolución de carátula en `cover-art.ts`

- [ ] 1.1 Cambiar `coverThumbUrl` para construir la URL a nivel de release-group (`https://coverartarchive.org/release-group/{releaseGroupMbid}/front-250`)
- [ ] 1.2 Implementar `resolveCoverThumbUrl(releaseGroupMbid): Promise<string | null>` con `fetch(method: "HEAD", redirect: "manual")`; devolver la URL si `status` está en `[200,400)`, `null` ante 404/5xx/error de red (try/catch)

## 2. Cacheo en la ingesta

- [ ] 2.1 En `findOrIngestTracklist`, resolver la carátula con `resolveCoverThumbUrl(releaseGroupMbid)` e incluirla como `coverThumbUrl` en `insert().values()` y en el `set` del `onConflictDoUpdate`
- [ ] 2.2 Añadir self-heal: si ya existe una release con `coverThumbUrl` nulo, resolver y actualizar la fila antes de devolverla

## 3. Read-model

- [ ] 3.1 En `album-detail.ts`, devolver `cover: releaseRow.coverThumbUrl` (en vez de armar la URL desde `releaseRow.mbid`) y quitar el import de `coverThumbUrl` si queda sin uso

## 4. Tests

- [ ] 4.1 En `ingest-release.test.ts`, mockear `resolveCoverThumbUrl` y verificar que `coverThumbUrl` entra en `values` y en el `set` del upsert (incluido el caso carátula nula)
- [ ] 4.2 Actualizar fixtures de URLs a `/release-group/...` en `route.test.ts`, `album/[id]/page.test.tsx`, `AlbumCover.test.tsx` y `LazyCoverImage.test.tsx`
- [ ] 4.3 Actualizar `scripts/smoke-test-ingestion.ts`: añadir mocks de `coverartarchive.org` en `global.fetch` (DSOTM → 200, Icon → 404) y usar `release.coverThumbUrl` en el log de carátula

## 5. Documentación (mismo cambio)

- [ ] 5.1 Actualizar la nota de `cover` en `docs/04-api/contracts.md` (resolución a nivel de release-group, cacheada en `cover_thumb_url`, null sin carátula)
- [ ] 5.2 Documentar la columna `cover_thumb_url` en `docs/03-data/sql-model.md` (sección `release`)
- [ ] 5.3 Actualizar `docs/02-architecture/code-walkthrough.md` (descripción de `cover-art.ts` y `ingest-release.ts`)

## 6. Verificación

- [ ] 6.1 `pnpm run typecheck && pnpm run lint && pnpm run build` pasan
- [ ] 6.2 `pnpm test` pasa (tests unitarios actualizados)
- [ ] 6.3 `npx tsx --env-file=.env scripts/smoke-test-ingestion.ts` contra Postgres real valida la ingesta con carátula (200) y sin carátula (404 → null)
