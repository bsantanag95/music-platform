## 1. Preparación

- [x] 1.1 En la BD de scratch, medir la discografía guardada de un artista con más de 100 release-groups (por ejemplo Pink Floyd): cuántos hay, cuántos son `studio` y qué discos de estudio faltan contra MusicBrainz; anotar el resultado en el PR (2026-09-27: 101 guardados — 55 `live_other`, 32 `compilation`, 14 `studio`, 0 `single_ep` contra 51 sencillos/EP oficiales; faltan *More* y *Obscured by Clouds*; hay un *The Dark Side of the Moon* duplicado sin año con un MBID que MusicBrainz ya no devuelve)
- [x] 1.2 Guardar como fixtures de test respuestas reales recortadas del browse de release-groups con `release-group-status=website-default` (un artista de 2 o más páginas y uno de una sola página)

## 2. Esquema

- [x] 2.1 Crear la migración `drizzle/0053_artist_discography_sync.sql` (0052 queda para `redesign-song-page`): `artist.discography_complete_at`, `release_group.discography_unlisted_at`, `release_group.primary_type`, `release_group.secondary_types text[]`, todas nulas (design.md D3–D5)
- [x] 2.2 Espejar en `src/db/schema.ts`
- [x] 2.3 Actualizar `docs/03-data/sql-model.md`
- [x] 2.4 Aplicar la migración en la BD de scratch con `pnpm run db:migrate`

## 3. Cliente de MusicBrainz

- [x] 3.1 `browseReleaseGroupsByArtist(mbid, offset)` con `limit=100`, `offset` y `release-group-status=website-default`; tipar `release-group-count`
- [x] 3.2 Tests del cliente: parámetros, paginación y filtro de estado

## 4. Clasificación en secciones

- [x] 4.1 Función pura `discographySection({ primaryType, secondaryTypes, category, creditRole })` con el orden de reglas del spec y el respaldo desde `category`
- [x] 4.2 Tests con cada escenario del spec: estudio, EP, `Album+Soundtrack`, `featured`, remix, `Single+Live`, `Broadcast`, fila sin tipos

## 5. Ingesta paginada

- [x] 5.1 Recorrer las páginas del browse con tope de 20 y aviso en el log al alcanzarlo; guardar `primary_type` y `secondary_types` en el upsert sin cambiar el cálculo de `category`
- [x] 5.2 Primera sincronización: hasta 3 páginas síncronas y el resto con `after()` (design.md D2); `discography_complete_at` solo al recorrer todas las páginas
- [x] 5.3 Al completar, marcar y desmarcar `discography_unlisted_at` de los release-groups acreditados al artista en una sola transacción (design.md D4); una sincronización interrumpida no marca nada
- [x] 5.4 Resincronización en segundo plano cuando `discography_complete_at` es nulo o tiene más de 7 días, con `pg_advisory_xact_lock` por artista (design.md D7)
- [x] 5.5 `findOrIngestDiscography` y su lectura desde la base excluyen `discography_unlisted_at IS NOT NULL` y devuelven el rol del crédito del artista
- [x] 5.6 Tests: paginación de 3 páginas, tope, primera visita con más de 300, marca y desmarca, sincronización interrumpida, resincronización vencida, candado, exclusión en la lectura

## 6. Artistas existentes

- [x] 6.1 Script `scripts/backfill-artist-discography.ts` con `--limit` y `--dry-run` (informe de artistas y release-groups que cambiarían)
- [x] 6.2 Documentar el script en `docs/06-operations/catalog-scripts.md`

## 7. Contratos y documentación

- [x] 7.1 `docs/04-api/contracts.md`: `GET /api/catalog/artist/{id}` excluye los release-groups fuera de la discografía
- [x] 7.2 Actualizar `docs/02-architecture/code-walkthrough.md` (ingesta de discografía) y la regla de negocio correspondiente si `business-rules.md` describe la discografía

## 8. Verificación

- [x] 8.1 Smoke test `scripts/smoke-test-artist-discography.ts` con fixtures y MBID sintéticos: paginación, bootleg marcado, release-group que vuelve, secciones; limpieza al terminar (también si falla) y su nota en `AGENTS.md`
- [x] 8.2 Correr el smoke test contra la BD de scratch con `ALLOW_SMOKE_ON_REAL_DB=1`
- [x] 8.3 Correr el backfill en `--dry-run` y luego real sobre la BD de scratch; repetir la medición de 1.1 (2026-09-27: 80 artistas, 4.662 release-groups guardados, 310 fuera de la discografía; Pink Floyd queda con 219 y solo el duplicado de *The Dark Side of the Moon* fuera)
- [x] 8.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` (typecheck, lint sin avisos nuevos y build OK; tests 3524/3525: el único fallo es un timeout de 5 s del primer test de `album-pages.test.tsx` con la suite en paralelo, que pasa corrido solo)
