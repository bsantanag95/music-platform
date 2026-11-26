## ADDED Requirements

### Requirement: Las transacciones de la ingesta no esperan la red

Ninguna transacción de base de datos SHALL quedar abierta mientras se espera una respuesta de MusicBrainz, Wikimedia (Wikidata,
Wikipedia, Commons) o ListenBrainz. Las sincronizaciones con candado por entidad (pertenencias, discografía, ficha y Wikimedia del
artista, ediciones, personal y autoría de una edición, texto del género y semillas de género de los álbumes) SHALL leer el estado sin
transacción, pedir los datos fuera de toda transacción y escribir en una transacción corta que toma el candado de la entidad, relee su
estado y escribe solo si la sincronización sigue pendiente.

#### Scenario: La request sale antes de abrir la transacción

- **WHEN** se abre en frío la página de un artista cuya discografía nunca se sincronizó
- **THEN** el browse de MusicBrainz se hace sin ninguna transacción abierta, y la transacción que guarda los release-groups y marca
  `discography_synced_at` empieza después de recibir la respuesta

#### Scenario: Otro proceso escribió mientras tanto

- **WHEN** dos procesos sincronizan las pertenencias del mismo artista y el primero guarda y marca `memberships_synced_at` mientras el
  segundo espera la respuesta de MusicBrainz
- **THEN** el segundo, al tomar el candado y releer el artista, no escribe nada y la sincronización devuelve que se omitió

### Requirement: Una transacción no pide otra conexión del pool

Dentro de una transacción, toda lectura y escritura SHALL usar el ejecutor de esa transacción (o un savepoint suyo), nunca el cliente
global, de modo que una transacción retenga como máximo una conexión del pool.

#### Scenario: Visitas en frío concurrentes

- **WHEN** llegan a la vez más visitas en frío a artistas distintos que conexiones tiene el pool
- **THEN** todas terminan (con la página o con un error de la API), y mientras tanto una página que no ingiere nada sigue respondiendo

#### Scenario: Créditos de la discografía

- **WHEN** la sincronización de la discografía guarda los release-groups, sus créditos y los artistas acreditados
- **THEN** todas esas escrituras van por la transacción de la sincronización

### Requirement: Una sola request por sincronización concurrente en el proceso

Las llamadas concurrentes a la misma sincronización con las mismas opciones, dentro de un proceso, SHALL compartir una única ejecución
y su resultado, de modo que hagan una sola serie de requests a la API externa. Al terminar, con éxito o con error, la siguiente llamada
SHALL ejecutar de nuevo. La ejecución compartida SHALL correr fuera del contexto asíncrono de la request que la inició.

#### Scenario: Visitas en frío concurrentes en desarrollo

- **WHEN** en `next dev` llegan a la vez ocho visitas en frío a artistas distintos
- **THEN** todas responden sin error de render (la ejecución compartida no queda atribuida a la request que llegó primero)

#### Scenario: Dos visitas simultáneas al mismo artista

- **WHEN** dos requests abren a la vez la página de un artista cuyas pertenencias no están sincronizadas
- **THEN** MusicBrainz recibe una sola request de `getArtistWithRelations` para ese artista

#### Scenario: Error de la API

- **WHEN** la sincronización compartida falla porque MusicBrainz no respondió
- **THEN** ambas llamadas reciben el error y la siguiente visita vuelve a intentarlo

### Requirement: Guardia de transacciones en tiempo de ejecución

La aplicación SHALL detectar, mientras una transacción abierta con el cliente global está en curso en el mismo contexto asíncrono, una
request a MusicBrainz, Wikimedia o ListenBrainz y cualquier uso del cliente global de base de datos. Fuera de producción la violación
SHALL lanzar un error; en producción SHALL registrarse como error sin interrumpir la request.

#### Scenario: Request externa dentro de una transacción en un smoke test

- **WHEN** un código ejecutado por un smoke test llama a MusicBrainz dentro de `db.transaction`
- **THEN** la llamada lanza un error que nombra el origen (`musicbrainz`) antes de emitir la request

#### Scenario: Promesa que sobrevive a la transacción

- **WHEN** una promesa creada dentro de una transacción sigue ejecutándose después de que la transacción terminó
- **THEN** su uso del cliente global no cuenta como violación

### Requirement: Límite de transacción inactiva y pool configurable

Las conexiones de la aplicación SHALL fijar `idle_in_transaction_session_timeout` en 60 segundos, de modo que Postgres aborte una
transacción sin sentencias durante ese tiempo y libere su conexión. El tamaño del pool SHALL leerse de `DATABASE_POOL_MAX` (entero
positivo, 5 por defecto); un valor inválido SHALL impedir el arranque con un error que nombre la variable.

#### Scenario: Valor inválido

- **WHEN** `DATABASE_POOL_MAX` vale `0` o `abc`
- **THEN** cargar el cliente de base de datos lanza un error que nombra `DATABASE_POOL_MAX`
