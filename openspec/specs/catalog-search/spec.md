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
como máximo **una** solicitud a MusicBrainz por tipo de entidad (artista y álbum) y SHALL NOT
ingerir discografía, tracklist ni carátula de ningún resultado. Cada elemento SHALL incluir el
`id` local de la entidad, su `kind` (`artist` o `release-group`), `mbid`, nombre/título,
subtítulo (disambiguation del artista o artista principal del álbum), y los campos propios de su
tipo (`artistType`, o `category` y `year`).

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

### Requirement: Búsqueda de canciones fuera de alcance en esta versión

La búsqueda del catálogo SHALL cubrir únicamente artistas y álbumes. La búsqueda de canciones
(`recording`) queda diferida hasta que exista un camino de ingesta de una grabación suelta; la
interfaz de resultados SHALL NOT ofrecer una pestaña de canciones hasta entonces. El detalle del
diferido y su precondición viven en `design.md` (sección *Trabajo futuro diferido*, D2).

#### Scenario: Sin pestaña de canciones
- **WHEN** una persona abre la página de resultados de cualquier búsqueda
- **THEN** solo se ofrecen las pestañas **Todo**, **Artistas** y **Álbumes**
