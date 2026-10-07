## 1. Esquema

- [x] 1.1 Crear `drizzle/0063_release_calendar.sql` con `release_calendar_entry` (columnas, `CHECK` de `exclusion`, FK `ON DELETE SET NULL`, índices por `release_date` y GIN por `artist_mbids`) y `release_calendar_sync`
- [x] 1.2 Espejar ambas tablas y sus tipos `*Row` en `src/db/schema.ts`
- [x] 1.3 Aplicar la migración en la BD de scratch y verificar con `pnpm run typecheck`

## 2. Cliente de ListenBrainz

- [x] 2.1 Crear `src/services/listenbrainz/client.ts`: exige `LISTENBRAINZ_USER_AGENT`, serializa requests, `freshReleases()` y `artistPopularity()` en lotes de 500, tipos de respuesta
- [x] 2.2 Agregar `LISTENBRAINZ_USER_AGENT` a `.env.example`
- [x] 2.3 Tests unitarios del cliente (fetch mockeado): error sin User-Agent, parámetros, lotes de popularidad, error HTTP

## 3. Verificación en MusicBrainz

- [x] 3.1 Agregar al cliente de MusicBrainz la búsqueda por lote `rgid:(…)` (hasta 50 MBID) que devuelve tipo, tipos secundarios y `first-release-date`
- [x] 3.2 Función de verificación que clasifica cada finalista (válido, `secondary_type`, `reissue`, no encontrado) y su test

## 4. Sincronización del calendario

- [x] 4.1 `src/services/home/release-calendar-sync.ts`: descarga, filtro local, popularidad, reemplazo transaccional conservando verificación y vínculo, registro en `release_calendar_sync`
- [x] 4.2 Lock con `pg_try_advisory_xact_lock('release-calendar')`: una sola sincronización a la vez
- [x] 4.3 Cálculo de la selección anónima (score, un disco por artista, tope por familia de géneros, ampliación a 90 días) y guardado de `anonymous_rank`
- [x] 4.4 Verificación de finalistas (top anónimo + artistas con relación de algún usuario) e iteración si las exclusiones dejan un lado corto
- [x] 4.5 Vinculación al catálogo de lo mostrado: `upsertReleaseGroupStubs` + `ingestCredits`, resolución de carátula con el pipeline existente, `release_group_id`
- [x] 4.6 `ensureReleaseCalendarFresh()` (umbral 24 h) y `scripts/sync-release-calendar.ts`
- [x] 4.7 Tests unitarios: reemplazo de ventana, fallo externo conserva el calendario, selección anónima (orden, un disco por artista, tope de familia, ampliación)

## 5. Selección personal y lectura en Inicio

- [x] 5.1 Reemplazar la maqueta de `listHomeReleases` por la lectura de la selección anónima (`anonymous_rank`)
- [x] 5.2 `listPersonalHomeReleases(userId)`: artistas en relación con peso, cruce con calendario y con `first_release_date` futura hasta 180 días, regla de carátula y "Anunciado", relleno "Destacado" bajo 6
- [x] 5.3 Disparar `ensureReleaseCalendarFresh()` en `after()` desde `AnonymousHome` y `AuthenticatedHome`; `AuthenticatedHome` usa la selección personal
- [x] 5.4 Tests de la selección personal (cada tipo de relación, orden, relleno, cuenta sin relaciones)

## 6. UI

- [x] 6.1 `HomeRelease.badge` y chip "Anunciado" / "Destacado" en `ReleaseRail`; textos en los mensajes i18n
- [x] 6.2 `/album/[id]`: "Sale el …" y estado vacío de tracklist para discos futuros sin ediciones con pistas
- [x] 6.3 Verificar en el navegador Inicio anónimo y autenticado, y la página de un disco anunciado

## 7. Smoke test

- [x] 7.1 `scripts/smoke-test-release-calendar.ts` (con `assert-smoke-allowed`): mockea ListenBrainz y MusicBrainz, crea artistas/álbumes con MBID `5e0ce000-0000-4000-8000-*` y un usuario `smoke_cal_*`; verifica reemplazo de ventana, exclusiones, stubs solo de lo mostrado, selección personal y lock; limpia al terminar (también si falla)
- [x] 7.2 Correrlo contra la BD de scratch y documentar la limpieza en `AGENTS.md`

## 8. Documentación y cierre

- [x] 8.1 ADR `docs/02-architecture/adr/0029-calendario-de-lanzamientos-desde-listenbrainz.md` (fuente, tabla aparte, Principio 4)
- [x] 8.2 Actualizar `docs/05-features/home.md` (resolver "Lo que falta analizar"), `docs/03-data/sql-model.md` y `docs/03-data/data-licensing.md` (ListenBrainz CC0)
- [x] 8.3 Mencionar el cliente de ListenBrainz en la sección de arquitectura de `AGENTS.md`
- [x] 8.4 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
