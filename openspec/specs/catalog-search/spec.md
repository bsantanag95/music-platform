# catalog-search

Búsqueda pública de artistas y álbumes en el catálogo navegable.

## Requirements

### Requirement: Búsqueda pública de artistas
La aplicación SHALL permitir que una persona busque en el catálogo por texto desde `/search` y
SHALL ejecutar la búsqueda únicamente cuando la entrada contenga texto no vacío después de
quitar espacios extremos. La búsqueda SHALL cubrir artistas y álbumes, y SHALL presentar todas
las coincidencias en una lista para que la persona elija, sin resolver a un único resultado.

#### Scenario: Búsqueda válida
- **WHEN** la persona introduce `Pink Floyd` y envía el formulario
- **THEN** la aplicación navega a `/search?q=Pink%20Floyd` y la página ejecuta la búsqueda del
  catálogo con el texto normalizado

#### Scenario: Entrada vacía
- **WHEN** la persona envía el formulario sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación y muestra validación local

### Requirement: Estados de búsqueda
La interfaz SHALL mostrar un estado de carga mientras la página resuelve la búsqueda y SHALL
deshabilitar el envío del formulario mientras la navegación está en curso. La página de
resultados SHALL NOT mostrar un aviso de "primera importación": la búsqueda ya no ingiere
discografías, y ese aviso pertenece a las vistas de artista y álbum cuando ingieren su contenido
en la primera visita.

#### Scenario: Búsqueda en progreso
- **WHEN** la página está resolviendo la búsqueda para el `q` recibido
- **THEN** la interfaz muestra un estado de carga neutro y el botón de búsqueda queda
  deshabilitado

#### Scenario: La página de resultados nunca afirma una primera importación
- **WHEN** la página muestra resultados o un estado vacío
- **THEN** en ningún caso aparece el aviso de "primera importación"

### Requirement: Error recuperable
La interfaz SHALL mostrar un estado de error recuperable para `INTERNAL_ERROR` y otros fallos
inesperados, con una acción para reintentar la búsqueda.

#### Scenario: Fallo del servicio
- **WHEN** la búsqueda falla con `INTERNAL_ERROR`
- **THEN** se muestra un estado de error con un mensaje propio y una acción de reintento

### Requirement: Accesibilidad del formulario
El formulario SHALL exponer un label asociado al campo y estados de validación mediante
atributos ARIA. La lista de resultados SHALL ser navegable por teclado, las pestañas SHALL
exponer su rol y su estado (activa/inactiva) a tecnologías asistivas, y el estado de carga o el
estado vacío SHALL poder ser percibido por un lector de pantalla.

#### Scenario: Campo etiquetado
- **WHEN** una persona navega el formulario con teclado o lector de pantalla
- **THEN** el campo de búsqueda tiene un label asociado y el mensaje de validación se relaciona
  con él

#### Scenario: Pestañas anunciables
- **WHEN** una persona con lector de pantalla recorre las pestañas de resultados
- **THEN** cada pestaña anuncia su nombre y si está activa

### Requirement: Autoejecución de búsqueda a partir de un query param

`/search` SHALL leer un parámetro de consulta `q` opcional. Si `q` está presente y no vacío tras
normalizarlo, la página SHALL ejecutar la búsqueda del catálogo en el servidor y renderizar la
lista de resultados, y `SearchForm` SHALL iniciar con el campo prellenado con ese valor. Si `q`
está ausente o vacío, la página SHALL mostrar solo el formulario vacío, sin ejecutar ninguna
búsqueda.

#### Scenario: Llega con una consulta en la URL
- **WHEN** una persona abre `/search?q=Radiohead`
- **THEN** la página ejecuta la búsqueda de `Radiohead`, renderiza los resultados y el campo del
  formulario aparece prellenado con `Radiohead`

#### Scenario: Sin consulta en la URL
- **WHEN** una persona abre `/search` sin parámetro `q`
- **THEN** se muestra el formulario con el campo vacío y no se ejecuta ninguna búsqueda

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

### Requirement: Sin coincidencias es una lista vacía, no un error

Cuando ni la base local ni MusicBrainz devuelven coincidencias para el texto buscado, el
endpoint SHALL responder `200` con una lista vacía. El endpoint SHALL NOT responder `404` ni
emitir `ARTIST_NOT_FOUND` para una búsqueda sin resultados.

#### Scenario: Texto sin coincidencias
- **WHEN** una persona busca una cadena que no corresponde a ningún artista ni álbum
- **THEN** el endpoint responde `200` con `{ "results": [] }`

### Requirement: Persistencia de stubs desde la búsqueda

Por cada resultado de MusicBrainz que no exista aún en la base local, el endpoint SHALL
persistir un stub en una única operación por tipo (`INSERT ... ON CONFLICT (mbid) DO NOTHING`),
de modo que cada elemento de la lista tenga un `id` local. Los stubs de artista SHALL guardarse
con su `type` real derivado de la respuesta de búsqueda de MusicBrainz (no `unknown`). Los stubs
de álbum SHALL guardarse con su `category` derivada de `primary-type` / `secondary-types`.

#### Scenario: Resultado nuevo de MusicBrainz
- **WHEN** la búsqueda devuelve un artista que no estaba en la base local
- **THEN** se crea un stub de ese artista con su `type` y el elemento de la lista lo referencia
  por su `id` local

#### Scenario: Resultado ya conocido
- **WHEN** la búsqueda devuelve un artista cuyo `mbid` ya existe en la base local
- **THEN** no se crea un duplicado y el elemento referencia la fila existente

### Requirement: Degradación parcial ante fallo de MusicBrainz

Si la búsqueda en MusicBrainz falla de forma no recuperable pero la base local tiene
coincidencias, el endpoint SHALL responder `200` con las coincidencias locales. Si MusicBrainz
falla y no hay ninguna coincidencia local, el endpoint SHALL responder con un error recuperable
(`code: INTERNAL_ERROR`).

#### Scenario: MusicBrainz caído con datos locales
- **WHEN** MusicBrainz no responde y la base local tiene coincidencias para el texto
- **THEN** el endpoint responde `200` con los resultados locales

#### Scenario: MusicBrainz caído sin datos locales
- **WHEN** MusicBrainz no responde y la base local no tiene ninguna coincidencia
- **THEN** el endpoint responde con `code: INTERNAL_ERROR`

### Requirement: Página de resultados con pestañas por tipo

`/search` SHALL renderizar la lista de resultados agrupada en pestañas: **Todo**, **Artistas** y
**Álbumes**. Cada resultado de artista SHALL enlazar a `/artist/<id>` y mostrar nombre, tipo y
disambiguation. Cada resultado de álbum SHALL enlazar a `/release-group/<id>` y mostrar título,
artista principal, año (si se conoce) y su carátula mediante carga progresiva. La página SHALL
NOT incluir una pestaña de canciones en esta versión.

#### Scenario: Resultados mixtos
- **WHEN** la búsqueda devuelve artistas y álbumes
- **THEN** la pestaña **Todo** muestra ambos tipos y las pestañas **Artistas** y **Álbumes**
  filtran por su tipo

#### Scenario: Navegación desde un resultado
- **WHEN** una persona hace clic en un resultado de artista
- **THEN** la aplicación navega a `/artist/<id>` de ese artista

#### Scenario: Abrir un resultado frío
- **WHEN** una persona abre un artista o álbum que aún no tiene su contenido cacheado
- **THEN** la ingesta ocurre en la vista destino, con el estado de carga propio de esa vista, y
  no durante la búsqueda

### Requirement: Orden de resultados determinista

Dentro de cada pestaña, la aplicación SHALL ordenar los resultados de forma determinista:
primero las coincidencias locales que ya tienen contenido cacheado, luego el resto de
coincidencias locales, y por último las coincidencias solo de MusicBrainz en el orden de `score`
que entrega MusicBrainz. Una coincidencia exacta de nombre o título (sin distinguir
mayúsculas/minúsculas) SHALL ubicarse al inicio de su grupo.

#### Scenario: Artista ya cacheado sube al tope
- **WHEN** una persona busca un artista que ya visitó antes y también aparece en MusicBrainz
- **THEN** la fila local cacheada aparece antes que cualquier coincidencia solo de MusicBrainz

#### Scenario: Coincidencia exacta priorizada
- **WHEN** el texto buscado coincide exactamente con el nombre de un resultado
- **THEN** ese resultado aparece al inicio de su grupo

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
