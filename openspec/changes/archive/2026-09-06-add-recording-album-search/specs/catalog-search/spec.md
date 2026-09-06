# catalog-search — delta

## ADDED Requirements

### Requirement: Resolución de canciones hacia álbumes que las contienen

La búsqueda del catálogo SHALL detectar cuando la consulta coincide con una grabación
(`recording`) — en la base local, en MusicBrainz, o en ambas — y SHALL exponer los álbumes
(`release_group`) que contienen esa canción como contexto adicional de la respuesta, calculados
como **unión** de las dos fuentes (ninguna grabación individual de MusicBrainz tiene todas las
apariciones de una canción). Cualquier versión de la canción (estudio, en vivo, remix) cuenta
como aparición de la misma canción a efectos de esta sección. Cuando un candidato de artista de
la propia búsqueda (local o de MusicBrainz) esté
contenido literalmente en la consulta dejando resto, la búsqueda de recordings SHALL acotarse a
los release-groups propios de ese artista mediante la cláusula de campos
`"<canción>" AND (rgid:… OR rgid:…)`, con la lista de rgids ordenada por categoría de álbum
(estudio primero) antes de aplicar el tope de la cláusula: el texto libre y la búsqueda por
nombre de artista están contaminados por bootlegs y covers, y hay grabaciones canónicas sin
artist-credit que ninguna consulta por artista encuentra. Sin lista de rgids disponible se
degradará a `"<canción>" AND artist:"<artista>"`. Todo
candidato SHALL pasar el filtro de relevancia de título: contención mutua (normalizada) entre el
título y la parte de canción, tolerando como máximo 2 tokens extra en el título. De los
candidatos que pasen el filtro, en orden de score, el sistema SHALL browséar los primeros cuatro
(cada browse cacheado por mbid) y unir sus apariciones con las de las `recording` locales que
tengan tracks ingeridos; la identidad del contexto (`recordingId`, `mbid`, `title`,
`artistName`) SHALL ser la contribución con mayor `release-count` y SHALL ser la única
grabación ingestionada (una sola por búsqueda). La deduplicación de la unión SHALL ser por
`release_group`, propagando el año mínimo entre fuentes. Cada álbum de este contexto SHALL incluir `id`
local, `mbid`, título, categoría y año (año del release más antiguo del grupo, si se conoce),
deduplicados por `release_group`, ordenados por categoría (`studio` → `single_ep` →
`compilation` → `live_other`), luego año ascendente, luego título, con un máximo de 12. Los
álbumes SHALL EXCLUIRSE si ya figuran entre las coincidencias de `results`. Si la pata de
grabaciones falla o no produce candidato aceptable, la búsqueda SHALL responder con los
resultados de artistas y álbumes exactamente como hasta ahora, omitiendo el contexto de canción.

#### Scenario: Artista más canción con discografía ingerida
- **WHEN** una persona busca `Sabrina Carpenter taste` y los release-groups de Sabrina Carpenter
  ya existen en la base local (créditos ingeridos)
- **THEN** la búsqueda de recordings se ejecuta con cláusula `"taste" AND (rgid:… OR rgid:…)`
  sobre sus álbumes propios (ordenados por categoría, sin browse de discografía) y el contexto
  muestra "Taste" con los álbumes que la contienen (entre ellos *Short n' Sweet*)

#### Scenario: Grabación canónica sin artist-credit
- **WHEN** la grabación canónica de la canción no tiene artist-credit en MusicBrainz (defecto de
  datos, como el *Stairway to Heaven* de estudio) y por tanto ninguna consulta por artista la
  encuentra
- **THEN** la cláusula `rgid` sobre el álbum del artista hint sí la encuentra y el contexto lista
  ese álbum (p. ej. `[Led Zeppelin IV]` para `Led Zeppelin Stairway to Heaven`)

#### Scenario: Bootleg homónimo desplazado
- **WHEN** el primer candidato de recordings tiene un título que contiene la consulta más de 2
  tokens extra (ej. `sabrina carpenter - taste (dudda bootleg)` para `taste`)
- **THEN** el candidato es descartado y la selección continúa con el siguiente que sí pasa el
  filtro

#### Scenario: Grabaciones duplicadas, identidad canónica y unión de versiones
- **WHEN** la búsqueda de recordings devuelve varias grabaciones para la misma canción (tomas de
  estudio, lives, remixes, malvinculaciones) y ninguna individual tiene todas las apariciones
- **THEN** se browséan los primeros 4 candidatos (en orden de score), el contexto muestra la
  UNIÓN de sus álbumes, y la identidad (`recordingId`/`title`) corresponde a la de mayor
  `release-count` — la única grabación que se ingesta

#### Scenario: La sección no encoge cuando se abre un álbum
- **WHEN** una canción ya tiene una aparición local (el usuario abrió uno de sus álbumes y el
  tracklist quedó ingerido) y MusicBrainz conoce además otras apariciones (compilaciones, lives)
- **THEN** el contexto fusiona ambas fuentes y lista MÁS álbumes que con la sola fuente local,
  nunca menos; la pata de MusicBrainz corre en toda búsqueda (cada browse cacheado por mbid)

#### Scenario: Canción cacheada localmente con MusicBrainz caído
- **WHEN** la consulta coincide con una `recording` local que tiene apariciones ingeridas pero la
  pata de recordings de MusicBrainz falla
- **THEN** el contexto se construye desde la base local (degradación explícita)

#### Scenario: Consulta que no es una canción
- **WHEN** una persona busca `xyzzyplugh 123` y ningún candidato de recordings pasa el filtro de
  relevancia
- **THEN** la respuesta no incluye contexto de canción y los resultados de artistas y álbumes se
  comportan como antes

#### Scenario: Fallo de la pata de grabaciones sin fuente local
- **WHEN** la búsqueda de recordings o la resolución de apariciones falla, no hay apariciones
  locales, y la pata de artistas/álbumes funciona
- **THEN** el endpoint responde `200` con `results` completo y sin contexto de canción, sin
  degradar el resto de la búsqueda

### Requirement: La canción no es un resultado navegable

El contexto de canción SHALL presentarse como sección contextual ("álbumes que contienen
«<canción>»") y NO como un elemento de `results`: `kind` SHALL seguir limitado a `artist` y
`release-group`, SHALL NOT existir una pestaña de canciones, y SHALL NOT generarse enlaces a la
página de canción desde la búsqueda.

#### Scenario: Pestañas sin cambios
- **WHEN** una persona abre la página de resultados de cualquier búsqueda, incluso con contexto
  de canción
- **THEN** solo se ofrecen las pestañas **Todo**, **Artistas** y **Álbumes**, y el contexto de
  canción aparece como sección aparte sin filtrarse por pestaña

## MODIFIED Requirements

### Requirement: Endpoint de búsqueda devuelve una lista de candidatos sin ingerir discografía

`GET /api/catalog/search?q=<texto>` SHALL devolver una lista de candidatos que coinciden con el
texto, combinando la base local y la búsqueda en vivo de MusicBrainz. El endpoint SHALL realizar
como máximo **una** solicitud a MusicBrainz por tipo de entidad (artista, álbum y grabación) y,
para una grabación aún no existente localmente, **una** solicitud de browse de sus apariciones.
El endpoint SHALL NOT ingerir discografía, tracklist ni carátula de ningún resultado de artistas o
álbumes, y SHALL NOT ingerir releases ni tracks de las apariciones de la canción (ver capacidad
`catalog-recording-ingestion`). Cada elemento SHALL incluir el `id` local de la entidad, su `kind`
(`artist` o `release-group`), `mbid`, nombre/título, subtítulo (disambiguation del artista o
artista principal del álbum), y los campos propios de su tipo (`artistType`, o `category` y
`year`). La respuesta SHALL poder incluir una clave opcional `songContext` con la canción detectada
y los álbumes que la contienen; los clientes SHALL tratarla como dato adicional no esencial.

#### Scenario: Búsqueda con coincidencias en varias fuentes
- **WHEN** una persona busca `Poison` y existen coincidencias locales y en MusicBrainz
- **THEN** el endpoint responde `200` con una lista que incluye todas las coincidencias de
  artista y de álbum, deduplicadas por `mbid`, sin haber ingerido la discografía de ninguna

#### Scenario: Homónimos preservados
- **WHEN** una persona busca `Poison` y MusicBrainz devuelve una banda de glam y otra de thrash
- **THEN** ambas aparecen como elementos separados en la lista, cada una con su `disambiguation`

#### Scenario: Falta el parámetro q
- **WHEN** la solicitud no incluye `q` o llega vacío tras normalizar
- **THEN** el endpoint responde `400` con `code: VALIDATION_ERROR`

#### Scenario: Respuesta con contexto de canción
- **WHEN** la búsqueda detecta una canción relevante para la consulta
- **THEN** el endpoint responde `200` con `results` sin cambios de forma y una clave
  `songContext` con `recordingId`, `mbid`, `title`, `artistName` y `albums`

## REMOVED Requirements

### Requirement: Búsqueda de canciones fuera de alcance en esta versión

**Reason**: la consulta "artista + canción" (o solo canción) es una necesidad real y resoluble: el
usuario que busca una canción quiere llegar al álbum que la contiene. La precondición técnica que
motivó el diferimiento (D2 de `add-search-results-page`: inexistencia de `findOrIngestRecording`)
se construye en este mismo cambio.

**Migration**: la limitación de producto subsistente — no exponer canciones como resultados ni
pestaña **Canciones** — queda cubierta por la requirement añadida "La canción no es un resultado
navegable". La pestaña de canciones sigue diferida, ahora por decisión de producto (falta definir
qué muestra la página de canción abierta en frío), no por falta de ingesta.
