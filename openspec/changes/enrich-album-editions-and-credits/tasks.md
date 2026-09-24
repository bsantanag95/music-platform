## 1. Preparación

- [ ] 1.1 En la BD de scratch, verificar que ningún `release_group` tiene más de una fila `release` (consulta agrupada) y anotar el resultado en el PR
- [ ] 1.2 Guardar como fixtures de test las respuestas reales de MusicBrainz ya verificadas (browse de ediciones de DSOTM, 2 páginas; `getRelease` con relaciones de la edición LP GB 1973), recortadas a lo necesario

## 2. Esquema (parte A y B en una migración)

- [ ] 2.1 Crear `drizzle/0048_album_editions_and_personnel.sql`: tablas `release_edition`, `label`, `release_edition_label`, `personnel_credit`; columnas `release_group.editions_synced_at`, `release.is_representative`, `release.personnel_synced_at`; `CHECK`s, índices únicos parciales y triggers de `updated_at` según design.md D2, D3 y D7
- [ ] 2.2 En la misma migración: verificar que no hay release-groups con más de una `release` (falla con mensaje explícito si los hay), marcar las existentes como representativas y crear el índice único parcial
- [ ] 2.3 Espejar el esquema en `src/db/schema.ts` con los tipos `*Row` nuevos
- [ ] 2.4 Actualizar `docs/03-data/sql-model.md` con las tablas, columnas y restricciones nuevas
- [ ] 2.5 Aplicar la migración en la BD de scratch con `pnpm run db:migrate`

## 3. Cliente de MusicBrainz

- [ ] 3.1 Agregar `browseReleasesByReleaseGroup(mbid, offset)` (`inc=labels+media+release-groups`, `limit=100`) con sus tipos (`label-info`, `media[].format`, `release-group.first-release-date`)
- [ ] 3.2 Ampliar `getRelease` a `inc=recordings+artist-credits+artist-rels+recording-level-rels` y tipar las relaciones (`type`, `target-type`, `attributes`, `target-credit`, `artist`)
- [ ] 3.3 Tests del cliente: URL, parámetros y paginación del browse; `inc` ampliado de `getRelease`

## 4. Parte A — Ediciones: ingesta y selección

- [ ] 4.1 Servicio que pide todas las páginas del browse con tope de 5 y aviso en el log al excederlo, y mapea cada edición a `release_edition` (fecha completa + año, formatos por disco, cantidad de pistas, sellos con catálogo)
- [ ] 4.2 Upsert idempotente de ediciones, sellos (por `mbid`) y relación edición ↔ sello; marca `editions_synced_at` al final
- [ ] 4.3 `findOrIngestTracklist`: usar el browse en lugar de `getReleaseGroup`, tomar `first-release-date` del release-group embebido, elegir la representativa entre todas las ediciones, guardar el resumen y marcar `is_representative`; leer la existente filtrando `is_representative`
- [ ] 4.4 Extraer la ingesta de tracklist de una edición a una función parametrizada por `representative: boolean`, reutilizada por la representativa y por las variantes
- [ ] 4.5 `recanonicalize.ts`: evaluar sobre todas las ediciones; intercambiar la marca si la nueva representativa ya está ingerida; si no, ingerirla y desmarcar la anterior sin borrarla; mantener `--dry-run`
- [ ] 4.6 Revisar las lecturas de `release` en `recording-detail.ts`, `ingest-recording.ts` y `search-catalog.ts` (design.md D3) y cubrir con tests el caso "álbum con variante ingerida"
- [ ] 4.7 Tests: selección con la original fuera de las primeras 25; tope de páginas; upsert idempotente; fecha parcial; catálogo sin sello; índice único rechaza una segunda representativa

## 5. Parte A — Ediciones: sincronización de álbumes existentes

- [ ] 5.1 Sincronización con `after()` desde la página de álbum cuando `editions_synced_at` es nulo, con `pg_advisory_xact_lock` por release-group; nunca cambia la representativa y registra en el log cuando cambiaría
- [ ] 5.2 Script `scripts/backfill-release-editions.ts` con `--dry-run`, `--limit` y `--report-representative`
- [ ] 5.3 Tests: la página responde aunque la sincronización falle; visitas concurrentes llaman una sola vez; el reporte lista álbumes cuya representativa cambiaría

## 6. Parte A — Variantes y pistas adicionales

- [ ] 6.1 Función pura `detectEditionVariants` (design.md D5) con adaptador de `release_edition` al ranking de `pickRepresentativeRelease`
- [ ] 6.2 Tests de `detectEditionVariants` con la distribución real de DSOTM (9/10/20/30/74/152/193), agrupación de "Experience Edition" en tres países, orden indiferente y nombre de fallback
- [ ] 6.3 Normalización de títulos que solo quita marcas de remasterización, minúsculas y acentos, con tests ("Money - 2011 Remaster" coincide; "Money (Live)" no)
- [ ] 6.4 Servicio de pistas adicionales: ingesta bajo demanda como no representativa, diferencia por grabación y por título normalizado, error de caja sin llamar a MusicBrainz
- [ ] 6.5 Endpoint `GET /api/catalog/release-group/[id]/editions/[editionId]/extra-tracks` con `withErrorHandling`, `await params`, validación de UUIDs y de pertenencia de la edición al release-group; schema Zod de la respuesta en `src/lib/api/schemas.ts` y función en `src/lib/api/catalog.ts`
- [ ] 6.6 Tests del endpoint: primera apertura (1 request), segunda (0 requests), caja, edición de otro álbum, UUID inválido
- [ ] 6.7 Documentar el contrato y los códigos de error nuevos en `docs/04-api/contracts.md` y `docs/04-api/errors.md`

## 7. Parte B — Créditos de personal

- [ ] 7.1 Mapeo de relaciones con destino artista de la edición y de cada grabación a `personnel_credit` (tipo tal cual, atributos ordenados, nombre acreditado), creando stubs de artistas desconocidos
- [ ] 7.2 Integrar la ingesta de créditos de personal en la función de ingesta de tracklist (4.4), en la misma request; marcar `personnel_synced_at`
- [ ] 7.3 Asegurar `ensureArtistMemberships` de los artistas principales antes de marcar la sincronización
- [ ] 7.4 `src/services/catalog/personnel-levels.ts`: tabla fija tipo → nivel (design.md D8) y lectura agrupada por persona con nivel más alto, roles y pistas ("todas")
- [ ] 7.5 Tests de la clasificación: integrante con producción, invitada en una pista, ingeniero, tipo desconocido en Arte y otros, miembro sin créditos ausente, álbum de solista
- [ ] 7.6 Sincronización con `after()` para representativas con `personnel_synced_at` nulo, con lock por edición y reemplazo en transacción
- [ ] 7.7 Script `scripts/backfill-personnel-credits.ts` con `--dry-run` y `--limit`
- [ ] 7.8 Tests: reingesta idempotente; fallo a mitad revierte y deja el álbum pendiente

## 8. Smoke tests e integración

- [ ] 8.1 `scripts/smoke-test-album-editions.ts` (usa `assert-smoke-allowed.ts`, mockea `global.fetch` con los fixtures): ingesta paginada, sellos, variantes, pistas adicionales, re-canonicalización con intercambio de marca; limpia sus fixtures al terminar
- [ ] 8.2 `scripts/smoke-test-personnel-credits.ts`: ingesta de créditos, pertenencias y clasificación contra Postgres real; limpia sus fixtures
- [ ] 8.3 Correr ambos contra la BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1` + `DATABASE_URL` de scratch)
- [ ] 8.4 Documentar los smoke tests nuevos y su limpieza en `AGENTS.md`

## 9. Documentación

- [ ] 9.1 ADR nuevo (`docs/02-architecture/adr/0019-…`): varias ediciones por álbum con representativa marcada en SQL; browse paginado en lugar del lookup
- [ ] 9.2 `docs/03-data/data-licensing.md`: sellos, números de catálogo y relaciones son datos centrales CC0 de MusicBrainz
- [ ] 9.3 `docs/06-operations/catalog-scripts.md`: backfills nuevos y cambios de `recanonicalize-release-group.ts`
- [ ] 9.4 `docs/02-architecture/code-walkthrough.md` / `architecture.md`: flujo de ingesta con browse, variantes bajo demanda y sincronización en segundo plano

## 10. Verificación final

- [ ] 10.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [ ] 10.2 Backfill en la BD de scratch con `--limit` pequeño y revisión del reporte de representativas
