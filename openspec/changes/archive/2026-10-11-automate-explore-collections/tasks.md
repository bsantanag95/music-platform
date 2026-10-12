## 1. Esquema

- [x] 1.1 Migración `0069_explore_collection_generation.sql`: columnas `source`, `template_key`, `period_key`, `starts_at`, `expires_at`, `weight` en `user_list_featured`; `CHECK`s; eliminar `uq_user_list_featured_rank`; índice único parcial `(template_key, period_key) WHERE source='template'`; backfill de las dos filas sembradas
- [x] 1.2 Misma migración: tabla `explore_collection_sync` con `CHECK` de estado e índice por plantilla/fin
- [x] 1.3 Espejo en `src/db/schema.ts` (tipos `*Row`) y actualizar `docs/03-data/sql-model.md`

## 2. Plantillas y orquestador

- [x] 2.1 Constantes en `constants.ts`: `COLLECTION_REFRESH_DAYS=7`, `FEATURED_RAIL_LIMIT=6`, lock de 15 min
- [x] 2.2 `collections/templates.ts`: `new-releases`, `top-rated-quarter`, `one-per-decade`, `most-reviewed-month` con `periodKey`, `title`, `select`
- [x] 2.3 `collections/generate.ts`: upsert de lista por (plantilla, período), reemplazo completo de ítems en transacción sin tocar `user_list`, mínimo de álbumes, vencimiento del período anterior
- [x] 2.4 `collections/sync.ts`: lock con `pg_advisory_xact_lock` + fila `running`, estados, aislamiento por plantilla, `scheduleStaleCollectionSync()`
- [x] 2.5 Pruebas unitarias de plantillas, generación (idempotencia, reemplazo, mínimo, rotación) y sync (vencida, concurrente, fallo)

## 3. Integración

- [x] 3.1 `explore/page.tsx`: programar `scheduleStaleCollectionSync()` con `after()`
- [x] 3.2 `listFeaturedCollections()`: vigencia, orden `weight`/`rank`, tope 6; actualizar `discovery.test.ts`
- [x] 3.3 `listEditorialLists()` excluye listas `source='template'`; verificar el feed y excluirlas si hace falta
- [x] 3.4 `scripts/sync-explore-collections.ts [--template]` y refactor de `seed-discovery.ts` para delegar (sin `COLLECTIONS`)

## 4. Verificación y documentación

- [x] 4.1 `scripts/smoke-test-explore-collections.ts` (fixtures sintéticos, limpieza, `assertSmokeAllowed`) y entrada en `AGENTS.md`
- [x] 4.2 ADR 0033, `docs/05-features/explore.md` (sección, seed y rieles) y revisar `home.md`/`contracts.md` si aplica
- [x] 4.3 Medir en scratch el tiempo de una corrida completa
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
