## 1. Base

- [x] 1.1 `src/db/index.ts`: `DATABASE_POOL_MAX`, `idle_in_transaction_session_timeout`, `Proxy` de `db` con `AsyncLocalStorage`, `assertNoOpenTransaction` y `reportTransactionViolation`; tests
- [x] 1.2 Clientes de MusicBrainz, Wikimedia y ListenBrainz llaman a `assertNoOpenTransaction` antes de cada request
- [x] 1.3 `src/db/entity-sync.ts` (`singleFlight`, `withEntityLock`, `inTransaction`); tests

## 2. Sincronizaciones

- [x] 2.1 `ensureArtistMemberships` (leer → pedir → escribir corto, single-flight)
- [x] 2.2 `syncArtistDiscography` + ejecutor en `saveDiscographyReleaseGroups`, `ingestCredits`, `upsertArtistStub`
- [x] 2.3 `syncArtistProfileFacts`
- [x] 2.4 `enrichArtistFromWikimedia`
- [x] 2.5 `syncReleaseEditions`
- [x] 2.6 `syncPersonnelCredits` + ejecutor en `savePersonnelCredits`, `completePersonnelSync`, `saveWorkCredits`
- [x] 2.7 `enrichGenreFromWikimedia`
- [x] 2.8 `syncAlbumGenreSeeds`
- [x] 2.9 Tests de cada una: la request sale sin transacción abierta y la relectura bajo el candado omite la escritura
- [x] 2.10 Hallazgo de la guardia en `smoke:ci`: `linkOrCreateEntry` (conciertos compartidos) leía la audiencia por defecto con el cliente global dentro de su transacción; `resolveNewContentAudience` recibe el ejecutor

## 3. Documentación y verificación

- [x] 3.1 ADR 0063; `docs/03-data/sql-model.md` (pertenencias y discografía), `code-walkthrough.md`, `04-risks.md`, `.env.example`
- [x] 3.2 `pnpm run verify` (review, typecheck, lint, 3.585 tests relacionados); `smoke:ci` contra una BD virgen desechable (33/33 tras 2.10)
- [x] 3.3 Prueba de carga: 6 artistas en frío en paralelo + una página ya cacheada, antes y después
