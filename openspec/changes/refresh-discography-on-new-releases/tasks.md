## 1. Esquema

- [x] 1.1 Crear `drizzle/0064_artist_discography_refresh.sql` (aditiva): `discography_mb_total INTEGER NULL` con
      `CHECK (>= 0)`, `discography_checked_at TIMESTAMPTZ NULL` y `discography_refresh_requested_at TIMESTAMPTZ NULL`
      en `artist`, con comentario de cabecera (openspec, propósito de cada columna)
- [x] 1.2 Espejo en `src/db/schema.ts` (`discographyMbTotal`, `discographyCheckedAt`, `discographyRefreshRequestedAt`)
- [x] 1.3 Aplicar la migración en la BD de scratch (`pnpm run db:migrate` con el `DATABASE_URL` de scratch)

## 2. Frescura y recorrido forzado

- [x] 2.1 `needsDiscographyRefresh`: medir desde `coalesce(checked_at, complete_at)` y sumar la solicitud posterior
      a la verificación (decisión 2); actualizar su tipo `Pick<ArtistRow, …>`
- [x] 2.2 Función pura `needsFullWalk(artist, now)`: total desconocido, solicitud pendiente o recorrido completo de
      más de 30 días (constante `DISCOGRAPHY_FULL_WALK_MS`)
- [x] 2.3 Tests unitarios de ambas funciones en `ingest-discography.test.ts` (límites de 7 y 30 días, solicitud
      anterior y posterior a la verificación, artista existente sin columnas nuevas)

## 3. Verificación barata en `syncArtistDiscography`

- [x] 3.1 Dividir `fetchDiscographyPages` para pedir la primera página y continuar desde ella sin repetirla
      (`refreshReleaseGroupWikidataIds` y el backfill siguen usando el recorrido entero)
- [x] 3.2 En `mode: "full"`: con total > 100, total igual a `discography_mb_total` y sin recorrido forzado → upsert de
      la página 1, `discography_checked_at = now`, estado `verified`; sin marcas y sin tocar `discography_complete_at`
- [x] 3.3 Camino completo: además fijar `discography_checked_at = now` y `discography_mb_total = total` (este último
      solo si no se truncó); el modo `initial` también guarda el total cuando completa
- [x] 3.4 Opción `forceFullWalk` del sync (salta el atajo) y usarla en `scripts/backfill-artist-discography.ts`
- [x] 3.5 Tests unitarios: atajo con total igual (1 request), total distinto (continúa desde la página 2, sin repetir
      la 1), una sola página (marcas como hoy), recorrido vencido, solicitud pendiente, total desconocido, truncado

## 4. Marca desde el calendario

- [x] 4.1 En `src/services/home/release-calendar-sync.ts`, al final de una sincronización exitosa, la sentencia de la
      decisión 4 (entrada no excluida, artista con discografía guardada, disco no acreditado, verificación de más de
      24 h); un fallo se registra con `console.error` y no cambia el resultado del calendario
- [x] 4.2 Sumar la cantidad de artistas marcados al resultado de `syncReleaseCalendar` y mostrarla en
      `scripts/sync-release-calendar.ts`
- [x] 4.3 Sentencia en un módulo propio (`src/services/catalog/discography-refresh-requests.ts`), con test en
      `discography-refresh-requests.test.ts`: cuenta los artistas marcados y un fallo no se propaga (el SQL lo cubre el smoke)

## 5. Smoke test contra Postgres real (scratch)

- [x] 5.1 Extender `scripts/smoke-test-artist-discography.ts`: atajo de un artista de más de 100 discos sin cambios
      (una sola request mockeada), total distinto que sigue con el resto, recorrido forzado a los 30 días
- [x] 5.2 Calendario → solicitud: entrada de un disco no acreditado marca al artista; disco ya acreditado, entrada
      excluida, artista sin discografía y verificación de menos de 24 h no lo marcan; la siguiente lectura programa
      la resincronización y la solicitud se consume
- [x] 5.3 Correr el smoke en la BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`) y documentar en `AGENTS.md` lo nuevo que
      verifica y la migración `0064` que necesita

## 6. Documentación

- [x] 6.1 `docs/03-data/sql-model.md`: las tres columnas de `artist`, cuándo se escriben y por qué
      `discography_complete_at` conserva su significado
- [x] 6.2 `docs/04-api/contracts.md`: comportamiento de la resincronización en los dos lugares que mencionan los 7 días
      (verificación barata, recorrido de 30 días, solicitud del calendario)
- [x] 6.3 `docs/02-architecture/code-walkthrough.md` y la sección del calendario en `docs/05-features/home.md`, si
      describen el ciclo de la discografía

## 7. Verificación

- [x] 7.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en el worktree
- [x] 7.2 `npx tsx --env-file=.env scripts/backfill-artist-discography.ts --dry-run --limit 20` contra scratch: recorre
      completo (sin atajo) y no escribe
