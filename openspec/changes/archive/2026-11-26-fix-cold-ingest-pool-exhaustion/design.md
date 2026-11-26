## Context

El patrón de ingesta es "cacheo bajo demanda" (ADR 0011): la página lee la base y, si falta algo, lo pide a MusicBrainz dentro de la
misma request; el resto se completa con `after()`. Las sincronizaciones que reemplazan datos (DELETE + INSERT) usan
`pg_advisory_xact_lock` por entidad, y el comentario de `ensureArtistMemberships` lo explica: "el lock cubre también la llamada
externa: la relectura del flag decide dentro de la misma transacción quién es el único proceso que ingiere".

Funciones con candado y red dentro de la transacción:

| Función | Archivo | Red dentro | Segunda conexión dentro |
|---|---|---|---|
| `ensureArtistMemberships` | `catalog/ingest-artist.ts` | MB `getArtistWithRelations` | no |
| `syncArtistDiscography` | `catalog/ingest-discography.ts` | MB browse (hasta 20 páginas) | **sí**: `saveDiscographyReleaseGroups`, `ingestCredits`, `upsertArtistStub` con `db` |
| `syncArtistProfileFacts` | `catalog/artist-profile.ts` | MB `getArtistWithRelations` | no |
| `enrichArtistFromWikimedia` | `catalog/artist-wikimedia.ts` | Wikidata, Wikipedia, Commons (hasta ~6) | no |
| `syncReleaseEditions` | `catalog/release-editions.ts` | MB browse de ediciones | no |
| `syncPersonnelCredits` | `catalog/personnel-credits.ts` | MB `getRelease` | **sí**: `savePersonnelCredits`, `completePersonnelSync`, `saveWorkCredits` abren `db.transaction` / `db.select` |
| `enrichGenreFromWikimedia` | `genres/about-sync.ts` | Wikidata, Wikipedia | no |
| `syncAlbumGenreSeeds` | `genres/album-seeds.ts` | Wikidata por lotes de 50 | no |

El pool es de 5 conexiones (`src/db/index.ts`), sin tiempo máximo de espera para obtener una.

## Goals / Non-Goals

**Goals:**

- Que ninguna combinación de visitas concurrentes pueda dejar al pool sin conexiones de forma indefinida.
- Que una visita en frío retenga una conexión solo mientras escribe, no mientras espera a MusicBrainz o Wikimedia.
- Conservar las garantías actuales: una sola request a la API por sincronización concurrente dentro del proceso y escrituras
  serializadas por entidad entre procesos.
- Impedir que el patrón vuelva a aparecer: una guardia que falla en tests y smoke tests.

**Non-Goals:**

- Cambiar qué se ingiere de forma síncrona en la request (por ejemplo, no ingerir para rastreadores). Eso va en el plan SEO.
- Una cola distribuida o un rate limiter compartido entre procesos (riesgo #10 de `04-risks.md`, sigue aceptado).
- Revisar transacciones fuera del catálogo que no esperan red de estas APIs.

## Decisions

### D1. Leer → pedir fuera → escribir corto, con relectura bajo el candado

Cada sincronización queda en tres pasos:

1. **Leer** el estado con `db`, sin transacción, y decidir si hay algo que hacer (mismas condiciones de hoy: flags, vigencia, `force`).
2. **Pedir** a la API fuera de toda transacción.
3. **Escribir** en una transacción corta que toma el mismo `pg_advisory_xact_lock`, **relee** la fila y vuelve a evaluar la condición
   del paso 1. Si otro proceso ya la completó mientras tanto, no escribe y devuelve `skipped`. Todas las escrituras usan el ejecutor
   de esa transacción.

El candado sigue serializando las escrituras destructivas por entidad (la razón de la ADR 0011), pero ya no cubre la red.

*Alternativa descartada:* mantener la red dentro y subir el pool. Solo mueve el umbral: con N conexiones, N visitas en frío vuelven a
ocupar el pool esperando a la cola de 1,1 s.

*Alternativa descartada:* `pg_try_advisory_lock` de sesión alrededor de la red. Sigue reteniendo una conexión durante la espera.

### D2. Single-flight en el proceso

Sin el candado alrededor de la red, dos visitas simultáneas al mismo artista harían dos requests. Un helper `singleFlight(key, task)`
(`src/db/entity-sync.ts`) guarda en un `Map` la promesa en curso por clave y la entrega a quien llegue mientras tanto;
al terminar (bien o mal) la clave se borra. La clave incluye la entidad y las opciones que cambian el resultado (`mode`, `force`,
`dryRun`…). Es el mismo supuesto de proceso único que ya usan la cola y la caché de búsquedas de `musicbrainz/client.ts`. Entre
procesos puede haber una request duplicada; la relectura bajo el candado (D1) evita la escritura doble.

La tarea compartida corre desligada de la request que llegó primero, en el contexto asíncrono de la carga del módulo
(`AsyncLocalStorage.snapshot()`). Hallazgo de la implementación: con la tarea en el contexto de la primera request, 4 de 8 visitas en
frío concurrentes respondían 500 en `next dev` (`Cannot read properties of undefined (reading 'run')` en `initializeFakeTask` del
cliente Flight: el rastreo de I/O de React atribuía la promesa a otra request). Desligada, 0 de 16; en producción no ocurría en ningún
caso. Consecuencia: la tarea no usa `after()`, `cookies()` ni `headers()` (las sincronizaciones no los usan; los `after()` de la
discografía los programa el llamador), y `singleFlight` comprueba la guardia de D4 en el contexto de quien llama.

### D3. Escrituras anidadas con el ejecutor de la transacción

`saveDiscographyReleaseGroups`, `ingestCredits`, `upsertArtistStub`, `savePersonnelCredits` y `saveWorkCredits` reciben un ejecutor
opcional (por defecto `db`, para los demás llamadores). Las que hoy abren su propia `db.transaction` usan `inTransaction(tx, fn)`: con
la transacción del llamador corren dentro de ella (ya es atómica) y sin ella abren una propia. `completePersonnelSync` va a MusicBrainz
(pertenencias), así que sale de la transacción: se llama después de escribir, y recién entonces marca `personnel_synced_at`.

### D4. Guardia con `AsyncLocalStorage`

`src/db/index.ts` exporta `db` envuelto en un `Proxy`:

- `db.transaction(fn)` corre `fn` dentro de un contexto `{ open: true }` de `AsyncLocalStorage`, que se marca `open: false` al
  terminar (las promesas lanzadas dentro y que sobreviven a la transacción no quedan marcadas).
- Usar el `db` global (`select`, `insert`, `update`, `delete`, `execute`, `transaction`, `query`…) mientras el contexto está abierto
  llama a `reportTransactionViolation`.
- `assertNoOpenTransaction(origen)`, exportada, la llaman `mbFetch`, el cliente de Wikimedia y el de ListenBrainz antes de cada request.

`reportTransactionViolation` lanza un error cuando `NODE_ENV !== "production"` (vitest, smoke tests, `next dev`) y en producción
escribe `console.error` y deja seguir: una violación no conocida no debe tumbar una página en producción, pero sí romper los tests y
los smoke tests que la ejercitan. Los objetos `tx` que crea Drizzle no pasan por el `Proxy`.

*Alternativa descartada:* una regla de lint sobre el cuerpo de las transacciones. No ve las llamadas indirectas, que son justo las que
causaron el deadlock (`saveDiscographyReleaseGroups` → `ingestCredits` → `upsertArtistStub`).

### D5. Límite de transacción inactiva y pool configurable

`postgres(..., { max, connection: { idle_in_transaction_session_timeout: 60_000 } })`. Con D1 ninguna transacción espera la red, así
que 60 s sin sentencias solo puede ser un error, y Postgres la aborta y libera la conexión. `max` sale de `DATABASE_POOL_MAX` (entero
positivo; por defecto 5, el valor actual, pensado para desarrollo con varias worktrees contra el mismo Postgres). Un valor inválido
lanza un error al arrancar, como `DATABASE_URL`.

## Risks / Trade-offs

- **Request duplicada entre procesos** (dos instancias visitan el mismo artista a la vez) → se acepta, como el dogpile de la ADR 0011;
  la escritura no se duplica por la relectura bajo el candado.
- **Datos pedidos y descartados**: si otro proceso escribe primero, la respuesta pedida se descarta. Costo: una request.
- **Transacciones de escritura más largas** en la discografía (ahora los release-groups y créditos van dentro de la transacción) →
  son sentencias seguidas, no esperas; quedan lejos de los 60 s. Una discografía de 2.000 release-groups se mide en el smoke test.
- **El `Proxy` de `db`** podría romper un uso de `db` que dependa de la identidad del objeto → los métodos se enlazan al objeto real;
  se cubre con la suite completa y los smoke tests.
- **Violaciones desconocidas en producción** solo se registran → se mitiga corriendo la suite, `smoke:ci` y la prueba de carga con la
  guardia lanzando.

## Migration Plan

Sin migraciones. Desplegar el código; `DATABASE_POOL_MAX` es opcional. Rollback: revertir el commit.
