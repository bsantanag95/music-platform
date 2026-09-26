## 1. Esquema

- [x] 1.1 Migración `0049_work_credits.sql`: `work`, `recording_work`, `work_credit`, `release.works_synced_at`, índices y trigger de `updated_at` (D2)
- [x] 1.2 Espejo en `src/db/schema.ts` (tipos `*Row`)
- [x] 1.3 `docs/03-data/sql-model.md`

## 2. Ingesta

- [x] 2.1 `getRelease` con `work-rels+work-level-rels`; tipos de obra en `types.ts` (D1)
- [x] 2.2 `mapWorkRelations` puro + tests (autores, obra compartida, obra sin autores, editorial ignorada, deduplicado) (D3)
- [x] 2.3 `saveWorkCredits` transaccional e idempotente; la ingesta de edición lo llama con la misma respuesta (D3)
- [x] 2.4 Sincronización y backfill con la condición unificada de pendiente (D4) + tests

## 3. Lectura

- [x] 3.1 `getAlbumPersonnel` con `songwriters` (por persona y por pista); `null` solo sin personal ni autoría; grupo `songwriting` en `groupCreditsByTrack` (D5) + tests
- [x] 3.2 `getRecordingSongwriters` para la página de canción (D5) + test

## 4. UI

- [x] 4.1 Sección Composición en la vista Por persona (D6)
- [x] 4.2 Grupo Composición primero en la vista Por canción (D6)
- [x] 4.3 Línea "Escrita por" en la página de canción (D6)
- [x] 4.4 i18n es/en de roles de autoría y rótulos
- [x] 4.5 Tests de `AlbumCredits` y de la página de canción

## 5. Smoke test, documentación y verificación

- [x] 5.1 `smoke-test-personnel-credits.ts` con obra y autores; limpieza por prefijo; `AGENTS.md` actualizado (D7)
- [x] 5.2 `docs/05-features/catalog-browsing.md` (Créditos y canción)
- [x] 5.3 `pnpm run db:migrate` en la BD local, `typecheck`, `lint`, `test`, `build` (con el servidor de desarrollo detenido)
- [x] 5.4 Sincronizar *Eyes Wide Open* y verificar en el navegador: Composición en ambas vistas y "Escrita por" en una canción
