## Why

En la auditoría SEO (2026-11-26) se pidieron como Googlebot seis páginas de artista sin sincronizar a la vez, sobre la BD de
scratch y `next dev`. Una respondió 500 a los 48 s y las otras cinco no respondieron en 200 s. Durante más de cinco minutos
**ninguna** página respondía, ni la home ni una página ya cacheada. Las cinco conexiones del pool (`postgres(..., { max: 5 })`) quedaron
más de 10 minutos *idle in transaction*.

La causa es doble:

1. **Deadlock del pool.** `syncArtistDiscography` abre una transacción con `pg_advisory_xact_lock` y, dentro, guarda los release-groups
   y sus créditos con el `db` global (`saveDiscographyReleaseGroups`, `ingestCredits`, `upsertArtistStub`). Cada escritura pide una
   **segunda** conexión mientras la transacción retiene la primera. Con cinco sincronizaciones concurrentes, las cinco conexiones
   esperan una sexta que nunca llega; `postgres-js` no tiene tiempo máximo de espera. `syncPersonnelCredits` repite el patrón: abre
   transacciones con `db` dentro de la suya.
2. **Conexiones retenidas mientras se espera la red.** Ocho sincronizaciones hacen la llamada a MusicBrainz o Wikimedia dentro de la
   transacción del candado, para que dos visitas simultáneas no pidan dos veces. Cada llamada pasa por la cola de 1,1 s y puede tardar
   hasta ~33 s con reintentos: con cinco visitas en frío el pool entero queda ocupado esperando red y el resto del sitio espera.

En la BD de scratch el 72 % de los artistas son stubs y solo el 2,9 % tiene la discografía sincronizada: casi cualquier enlace que siga
un rastreador cae en una página que ingiere. Es un bloqueante para llevar el sitio a producción.

## What Changes

- **Ninguna transacción espera la red ni pide otra conexión del pool.** Las ocho sincronizaciones con candado (pertenencias,
  discografía, ficha, Wikimedia del artista, ediciones, personal y autoría, texto del género y semillas de género de los álbumes)
  pasan a: leer el estado sin transacción → pedir a la API fuera de toda transacción → transacción corta con el mismo
  `pg_advisory_xact_lock`, que relee el estado y escribe solo si sigue pendiente, siempre con el ejecutor de la transacción.
- **Single-flight en el proceso:** las llamadas concurrentes a la misma sincronización comparten una sola promesa, de modo que dos
  visitas simultáneas siguen haciendo una sola request (lo que antes garantizaba el candado alrededor de la red).
- **Guardia en tiempo de ejecución:** `src/db` marca con `AsyncLocalStorage` cuándo hay una transacción abierta. Llamar a MusicBrainz,
  Wikimedia o ListenBrainz, o usar el `db` global dentro de una transacción, lanza un error fuera de producción (tests, smoke, dev) y
  se registra en producción.
- **Red de seguridad en Postgres:** las conexiones de la app fijan `idle_in_transaction_session_timeout` (60 s), así que una transacción
  olvidada se aborta en vez de ocupar una conexión para siempre. El tamaño del pool se puede configurar con `DATABASE_POOL_MAX`
  (por defecto sigue en 5).
- ADR nuevo (0063) que complementa la ADR 0011 con la regla de transacciones cortas.

## Capabilities

### New Capabilities

- `catalog-ingestion-transactions`: transacciones de la ingesta sin red ni segunda conexión, single-flight por sincronización, guardia
  en tiempo de ejecución y límite de transacción inactiva.

### Modified Capabilities

_(ninguna: las specs existentes piden "un candado por entidad que evite sincronizaciones concurrentes", y eso se mantiene)_

## Impact

`src/db/index.ts` (guardia, pool, timeout); `src/services/catalog/{ingest-artist,ingest-discography,artist-profile,artist-wikimedia,
release-editions,personnel-credits,work-credits,artist-upsert}.ts`; `src/services/genres/{about-sync,album-seeds}.ts`; los clientes de
`musicbrainz`, `wikimedia` y `listenbrainz` (llaman a la guardia); un helper nuevo `src/db/entity-sync.ts`; `src/services/social/default-audience.ts` y `src/services/concerts/shared.ts` (la guardia encontró
otra lectura con el cliente global dentro de una transacción, en los conciertos compartidos); sus tests;
`.env.example`; `docs/02-architecture/adr/0063-*.md`, `docs/03-data/sql-model.md`, `docs/02-architecture/code-walkthrough.md`. Sin
migraciones ni cambios de API.
