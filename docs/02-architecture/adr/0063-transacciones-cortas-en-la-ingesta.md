# ADR 0063 — Transacciones cortas en la ingesta: sin red ni segunda conexión dentro de una transacción

## Estado

Aceptado (cambio `fix-cold-ingest-pool-exhaustion`, 2026-11). Complementa la ADR 0011 sin reescribirla: las reglas de idempotencia
(`ON CONFLICT`, candado solo para reconciliación destructiva) siguen vigentes; esta ADR fija **qué puede pasar dentro** de esas
transacciones.

## Contexto

En la auditoría SEO del 2026-11-26 se pidieron como Googlebot seis páginas de artista sin sincronizar a la vez, contra la BD de scratch
con `next dev`. Una respondió 500 a los 48 s, las otras cinco no respondieron en 200 s y, durante más de cinco minutos, ninguna página
del sitio respondía, ni las ya cacheadas. Las cinco conexiones del pool (`max: 5`) quedaron *idle in transaction* más de 10 minutos.

Las sincronizaciones con candado por entidad (`pg_advisory_xact_lock`) hacían la llamada a MusicBrainz o Wikimedia **dentro** de la
transacción, para que la relectura del flag decidiera quién ingería sin duplicar la request. Eso tenía dos consecuencias:

1. **Conexiones retenidas esperando la red.** Cada request pasa por la cola de 1,1 s y puede tardar hasta ~33 s con reintentos. Con
   tantas visitas en frío como conexiones tiene el pool, el pool entero queda esperando a MusicBrainz y el resto del sitio espera.
2. **Deadlock del pool.** `syncArtistDiscography` y `syncPersonnelCredits` escribían, dentro de su transacción, con el cliente global
   (`saveDiscographyReleaseGroups` → `ingestCredits` → `upsertArtistStub`; `savePersonnelCredits`, `saveWorkCredits` y
   `completePersonnelSync`, que además iba a MusicBrainz por las pertenencias). Cada escritura pedía una **segunda** conexión mientras
   la transacción retenía la primera. Con cinco a la vez, las cinco esperaban una sexta que no llegaba nunca: `postgres-js` no tiene
   tiempo máximo de espera para obtener una conexión.

Un rastreador que sigue enlaces cae casi siempre en entidades sin sincronizar (en la BD de scratch, el 72 % de los artistas son stubs),
así que el patrón bloqueaba llevar el sitio a producción.

## Decisión

### Regla 1: una transacción no espera la red

Ninguna transacción queda abierta mientras se espera una respuesta de MusicBrainz, Wikimedia o ListenBrainz. Una sincronización con
candado tiene tres pasos:

1. **Leer** el estado con el cliente global, sin transacción, y decidir si hay algo que hacer.
2. **Pedir** a la API fuera de toda transacción.
3. **Escribir** con `withEntityLock(clave, fn)` (`src/db/entity-sync.ts`): una transacción corta que toma el mismo
   `pg_advisory_xact_lock`, **relee** la entidad, vuelve a evaluar la condición del paso 1 y escribe solo si sigue pendiente. Si otro
   proceso la completó mientras tanto, o cambió lo que hace válida la respuesta (el `mbid`, la entidad de Wikidata, el bloqueo de la
   foto), no escribe y devuelve `skipped`.

El candado sigue serializando las escrituras destructivas por entidad (ADR 0011, regla 2), pero ya no cubre la red. Lo que va a la red
después de escribir (por ejemplo, las pertenencias antes de marcar `personnel_synced_at`) corre después de cerrar la transacción.

### Regla 2: una transacción no pide otra conexión

Dentro de una transacción, toda lectura y escritura usa el ejecutor de la transacción. Las funciones de escritura que también se usan
desde una sincronización reciben el ejecutor como parámetro opcional (`upsertArtistStub`, `ingestCredits`, `savePersonnelCredits`,
`saveWorkCredits`); las que abren su propia transacción lo hacen con `inTransaction(tx, fn)`, que reutiliza la del llamador si existe.

### Regla 3: single-flight en el proceso

Sin el candado alrededor de la red, dos visitas simultáneas pedirían dos veces. `singleFlight(clave, task)` comparte la ejecución en
curso con las llamadas concurrentes de la misma clave (entidad + opciones) y la libera al terminar, con éxito o con error. Es el mismo
supuesto de proceso único que la cola de MusicBrainz. Entre procesos puede haber una request duplicada (el dogpile que la ADR 0011 ya
acepta); la relectura bajo el candado evita la escritura doble.

La ejecución compartida corre **desligada de la request** que llegó primero, en el contexto asíncrono de la carga del módulo
(`AsyncLocalStorage.snapshot()`): no le pertenece a ninguna request. Si naciera en el contexto de la primera, en `next dev` el rastreo de
I/O de React la atribuiría a esa request y la otra que la espera rompería el render (`Cannot read properties of undefined (reading
'run')` en `initializeFakeTask`). Medido con 8 visitas en frío concurrentes: 4 de 8 respondían 500 con la ejecución en el contexto de la
primera request y 0 de 16 desligada; en el build de producción no ocurría. Por eso la tarea compartida no puede usar `after()`,
`cookies()` ni `headers()`: solo lee y escribe la base y llama a las APIs. `singleFlight` comprueba la guardia de la regla 4 en el
contexto de quien llama, porque desligada ya no la vería.

### Regla 4: guardia en tiempo de ejecución

`src/db/index.ts` envuelve el cliente global con `guardDatabase` (`src/db/transaction-guard.ts`): `db.transaction` marca el contexto
asíncrono con `AsyncLocalStorage` mientras dura, y usar el cliente global (`select`, `insert`, `update`, `delete`, `execute`, `query`,
`transaction`…) con la marca puesta es una violación. Los clientes de MusicBrainz, Wikimedia y ListenBrainz llaman a
`assertNoOpenTransaction` antes de cada request. Fuera de producción (tests, smoke tests, `next dev`) la violación lanza
`TransactionGuardError`; en producción se registra con `console.error` y la request sigue, para que una violación desconocida no tumbe
una página. Una promesa creada dentro de la transacción que sobrevive a ella no cuenta.

### Regla 5: límite de transacción inactiva y pool configurable

Las conexiones de la app fijan `idle_in_transaction_session_timeout = 60 s`: con las reglas anteriores, 60 s sin sentencias solo puede
ser un error, y Postgres aborta la transacción y libera la conexión. El tamaño del pool sale de `DATABASE_POOL_MAX` (entero positivo,
5 por defecto); un valor inválido impide arrancar.

## Alternativas consideradas

- **Subir el pool y dejar la red dentro.** Solo mueve el umbral: con N conexiones, N visitas en frío vuelven a ocuparlo.
- **Candado de sesión (`pg_try_advisory_lock`) alrededor de la red.** También retiene una conexión durante la espera.
- **Regla de lint sobre el cuerpo de las transacciones.** No ve las llamadas indirectas, justo las que causaron el deadlock.
- **No ingerir para rastreadores.** Reduce la carga, pero no arregla el deadlock que una ráfaga de usuarios reales también provoca.
  Queda para el plan SEO.

## Consecuencias

- Toda sincronización nueva con candado usa `singleFlight` + leer → pedir → `withEntityLock` con relectura.
- Ninguna función que vaya a la red se llama dentro de una transacción; ninguna función que use el cliente global se llama dentro de
  una transacción sin recibir el ejecutor.
- Una respuesta pedida puede descartarse si otro proceso escribió primero: costo, una request.
- La guardia ya encontró un caso fuera del catálogo al correr `smoke:ci`: `linkOrCreateEntry` (conciertos compartidos) leía la
  audiencia por defecto del usuario con el cliente global dentro de su transacción. `resolveNewContentAudience` recibe el ejecutor.
- Las transacciones de escritura de la discografía son más largas (ahora incluyen release-groups y créditos), pero son sentencias
  seguidas, no esperas.
