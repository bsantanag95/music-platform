## REMOVED Requirements

### Requirement: Accesibilidad del formulario
**Reason**: Las pestañas Todo/Artistas/Álbumes desaparecen; la accesibilidad pasa a cubrir el
selector de tipo y el combobox de sugerencias.
**Migration**: Ver "Accesibilidad del buscador por tipo" en esta capacidad y la capacidad
`search-typeahead`.

### Requirement: Endpoint de búsqueda devuelve una lista de candidatos sin ingerir discografía
**Reason**: El endpoint deja de mezclar tipos y de ejecutar la pata de canciones en toda búsqueda.
**Migration**: Ver "Endpoint de búsqueda por tipo sin ingerir discografía"; los clientes pasan
`type` y leen el payload del tipo pedido.

### Requirement: Página de resultados con pestañas por tipo
**Reason**: El tipo se elige antes de buscar (capacidad `search-scopes`); las pestañas sobre una
respuesta mezclada ya no existen.
**Migration**: Ver "Página de resultados por tipo"; los enlaces con `?type=artists|albums|all`
se mapean a los tipos nuevos.

### Requirement: La canción no es un resultado navegable
**Reason**: Las canciones pasan a ser el resultado del tipo Canciones.
**Migration**: Ver "Resultado de canción sin página propia": la canción sigue sin enlazar a
`/song/<id>` y la navegación es hacia sus álbumes.

## MODIFIED Requirements

### Requirement: Búsqueda pública de artistas
La aplicación SHALL permitir que una persona busque en el catálogo por texto desde `/search` y
SHALL ejecutar la búsqueda únicamente cuando la entrada contenga texto no vacío después de
quitar espacios extremos. Cada búsqueda SHALL ejecutarse en **un solo tipo** (Artistas, Álbumes,
Canciones o Usuarios; ver capacidad `search-scopes`) y SHALL presentar las coincidencias de ese
tipo para que la persona elija, salvo la redirección por coincidencia exacta única definida en
`search-scopes`.

#### Scenario: Búsqueda válida
- **WHEN** la persona introduce `Pink Floyd` con el tipo Artistas y envía el formulario
- **THEN** la aplicación navega a `/search?type=artist&q=Pink%20Floyd` y la página ejecuta solo
  la búsqueda de artistas con el texto normalizado

#### Scenario: Entrada vacía
- **WHEN** la persona envía el formulario sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación y muestra validación local

### Requirement: Autoejecución de búsqueda a partir de un query param

`/search` SHALL leer los parámetros `q` y `type` opcionales. Si `q` está presente y no vacío tras
normalizarlo, la página SHALL ejecutar en el servidor la búsqueda del tipo indicado (Artistas si
falta) y renderizar sus resultados, y el campo SHALL iniciar prellenado con ese valor y con ese
tipo seleccionado. Si `q` está ausente o vacío, la página SHALL mostrar solo el campo vacío, con
el tipo de la URL o Artistas, y las búsquedas recientes, sin ejecutar ninguna búsqueda.

#### Scenario: Llega con una consulta en la URL
- **WHEN** una persona abre `/search?type=artist&q=Radiohead`
- **THEN** la página ejecuta la búsqueda de artistas para `Radiohead`, renderiza los resultados y
  el campo aparece prellenado con `Radiohead` y el tipo Artistas

#### Scenario: Sin consulta en la URL
- **WHEN** una persona abre `/search` sin parámetro `q`
- **THEN** se muestra el campo vacío con el tipo Artistas y no se ejecuta ninguna búsqueda

### Requirement: Sin coincidencias es una lista vacía, no un error

Cuando ni la base local ni MusicBrainz devuelven coincidencias para el texto en el tipo pedido,
el endpoint SHALL responder `200` con una lista vacía y la página SHALL mostrar un estado vacío
que ofrezca buscar el mismo texto en los otros tipos. El endpoint SHALL NOT responder `404` ni
emitir `ARTIST_NOT_FOUND` para una búsqueda sin resultados.

#### Scenario: Texto sin coincidencias
- **WHEN** una persona busca una cadena que no corresponde a ningún artista
- **THEN** el endpoint responde `200` con `{ "type": "artist", "results": [] }` y la página
  ofrece buscar el texto en Álbumes, Canciones y Usuarios

### Requirement: Persistencia de stubs desde la búsqueda

Por cada resultado de MusicBrainz que no exista aún en la base local, el endpoint SHALL
persistir un stub en una única operación por tipo (`INSERT ... ON CONFLICT (mbid) DO NOTHING`),
de modo que cada elemento de la lista tenga un `id` local. Los stubs de artista SHALL guardarse
con su `type` real derivado de la respuesta de búsqueda de MusicBrainz; si MusicBrainz no informa
el tipo, el stub SHALL guardarse como `unknown` (nunca como `various`, reservado a Various
Artists), para que el enriquecimiento de stubs lo resuelva en la primera visita. Los stubs de
álbum SHALL guardarse con su `category` derivada de `primary-type` / `secondary-types`.

#### Scenario: Resultado nuevo de MusicBrainz
- **WHEN** la búsqueda devuelve un artista que no estaba en la base local
- **THEN** se crea un stub de ese artista con su `type` y el elemento de la lista lo referencia
  por su `id` local

#### Scenario: Resultado ya conocido
- **WHEN** la búsqueda devuelve un artista cuyo `mbid` ya existe en la base local
- **THEN** no se crea un duplicado y el elemento referencia la fila existente

#### Scenario: Artista sin tipo en MusicBrainz
- **WHEN** la búsqueda devuelve un artista nuevo sin campo `type` (p. ej. un "Icon" de trance)
- **THEN** el stub se guarda con `type = 'unknown'` y la lista lo muestra sin etiqueta de tipo

### Requirement: Degradación parcial ante fallo de MusicBrainz

Si la búsqueda en MusicBrainz del tipo pedido falla de forma no recuperable pero la base local
tiene coincidencias, el endpoint SHALL responder `200` con las coincidencias locales y la marca
`remoteFailed: true`, y la página SHALL avisar que faltan resultados de MusicBrainz con una acción
para reintentar. Si MusicBrainz falla y no hay ninguna coincidencia local, el endpoint SHALL
responder con un error recuperable (`code: INTERNAL_ERROR`). El tipo Usuarios no depende de
MusicBrainz.

#### Scenario: MusicBrainz caído con datos locales
- **WHEN** MusicBrainz no responde y la base local tiene coincidencias para el texto
- **THEN** el endpoint responde `200` con los resultados locales y `remoteFailed: true`

#### Scenario: MusicBrainz caído sin datos locales
- **WHEN** MusicBrainz no responde y la base local no tiene ninguna coincidencia
- **THEN** el endpoint responde con `code: INTERNAL_ERROR`

#### Scenario: Aviso de resultados incompletos
- **WHEN** la página recibe resultados con `remoteFailed: true`
- **THEN** muestra los resultados locales junto con un aviso "Faltan resultados de MusicBrainz" y
  una acción "Reintentar", en lugar de presentarlos como la lista completa

### Requirement: Orden de resultados determinista

Dentro de cada tipo, la aplicación SHALL ordenar los resultados de forma determinista. En
Artistas: coincidencias exactas primero, luego por palabra completa, luego el resto; dentro de
cada nivel, primero las que tienen actividad en la plataforma, luego las locales con contenido
cacheado, y el resto en el orden de relevancia (`score`) de MusicBrainz — sea o no ya un stub
local —, con las coincidencias locales que MusicBrainz no devolvió al final del nivel. Estar en la
base local no es señal de relevancia: cada búsqueda persiste sus candidatos como stub.
Las coincidencias locales SHALL obtenerse ordenadas por similitud antes de aplicar su tope, de
modo que una subcadena a mitad de palabra no desplace a una coincidencia exacta. En Álbumes y
Canciones el orden SHALL seguir los niveles de cobertura de la capacidad `search-query-matching`.

#### Scenario: Artista ya cacheado sube al tope
- **WHEN** una persona busca un artista que ya visitó antes y también aparece en MusicBrainz
- **THEN** la fila local cacheada aparece antes que cualquier coincidencia no cacheada del mismo
  nivel

#### Scenario: Coincidencia exacta priorizada
- **WHEN** el texto buscado coincide exactamente con el nombre de un resultado
- **THEN** ese resultado aparece antes que las coincidencias no exactas

#### Scenario: Homónimos ya persistidos
- **WHEN** los tres "KISS" ya existen como stubs locales sin contenido cacheado
- **THEN** se ordenan según la relevancia de MusicBrainz (la banda de rock estadounidense
  primero), no según la similitud de la base

#### Scenario: Subcadena a mitad de palabra
- **WHEN** una persona busca `icon` en Artistas y la base local tiene más de diez nombres que
  contienen "icon"
- **THEN** los tope locales incluyen primero a los artistas llamados "Icon" y no a "Ennio
  Morricone"

### Requirement: Resolución de canciones hacia álbumes que las contienen

En el tipo **Canciones** (y solo en él), la búsqueda SHALL detectar grabaciones (`recording`) que
coinciden con la consulta —en la base local, en MusicBrainz o en ambas— y SHALL exponer, por
cada grupo (canción, artista) de la capacidad `search-query-matching`, los álbumes
(`release_group`) que la contienen, calculados como **unión** de las dos fuentes dentro del
grupo (ninguna grabación individual de MusicBrainz tiene todas las apariciones de una canción).
Cualquier versión de la canción (estudio, en vivo, remix) cuenta como aparición de la misma
canción. Cuando la interpretación elegida tiene artista (ver "Detección del artista en
Canciones" en `search-query-matching`), la búsqueda de recordings SHALL acotarse a los
release-groups propios de ese artista mediante la cláusula de campos
`"<canción>" AND (rgid:… OR rgid:…)`, con la lista de rgids ordenada por categoría de álbum
(estudio primero) antes de aplicar el tope de la cláusula: el texto libre y la búsqueda por
nombre de artista están contaminados por bootlegs y covers, y hay grabaciones canónicas sin
artist-credit que ninguna consulta por artista encuentra. Sin lista de rgids disponible se
degradará a `"<canción>" AND artist:"<artista>"`. Todo candidato SHALL pasar el filtro de
relevancia de título: contención mutua (normalizada) entre el título y la parte de canción,
tolerando como máximo 2 tokens extra en el título. Del primer grupo, en orden de score, el
sistema SHALL browséar los primeros cuatro candidatos (cada browse cacheado por mbid) y unir sus
apariciones con las de las `recording` locales del grupo que tengan tracks ingeridos; la
identidad del grupo (`recordingId`, `mbid`, `title`, `artistName`) SHALL ser la contribución con
mayor `release-count` y SHALL ser la única grabación ingestionada por búsqueda. La
deduplicación de la unión SHALL ser por `release_group`, propagando el año mínimo entre fuentes.
Cada álbum SHALL incluir `id` local, `mbid`, título, categoría y año (año del release más antiguo
del grupo, si se conoce), ordenados por categoría (`studio` → `single_ep` → `compilation` →
`live_other`), luego año ascendente, luego título, con un máximo de 12. Si la resolución falla o
no produce candidato aceptable, el tipo Canciones SHALL responder con una lista vacía (o con la
marca `remoteFailed` si falló MusicBrainz), sin afectar a ningún otro tipo.

#### Scenario: Artista más canción con discografía ingerida
- **WHEN** una persona busca `Sabrina Carpenter taste` en Canciones y los release-groups de
  Sabrina Carpenter ya existen en la base local (créditos ingeridos)
- **THEN** la búsqueda de recordings se ejecuta con cláusula `"taste" AND (rgid:… OR rgid:…)`
  sobre sus álbumes propios (ordenados por categoría, sin browse de discografía) y el primer
  grupo muestra "Taste" con los álbumes que la contienen (entre ellos *Short n' Sweet*)

#### Scenario: Grabación canónica sin artist-credit
- **WHEN** la grabación canónica de la canción no tiene artist-credit en MusicBrainz (defecto de
  datos, como el *Stairway to Heaven* de estudio) y por tanto ninguna consulta por artista la
  encuentra
- **THEN** la cláusula `rgid` sobre el álbum del artista interpretado sí la encuentra y el grupo
  lista ese álbum (p. ej. `[Led Zeppelin IV]` para `Led Zeppelin Stairway to Heaven`)

#### Scenario: Bootleg homónimo desplazado
- **WHEN** el primer candidato de recordings tiene un título que contiene la consulta más de 2
  tokens extra (ej. `sabrina carpenter - taste (dudda bootleg)` para `taste`)
- **THEN** el candidato es descartado y la selección continúa con el siguiente que sí pasa el
  filtro

#### Scenario: Grabaciones duplicadas, identidad canónica y unión de versiones
- **WHEN** la búsqueda de recordings devuelve varias grabaciones de la misma canción y el mismo
  artista (tomas de estudio, lives, remixes, malvinculaciones) y ninguna individual tiene todas
  las apariciones
- **THEN** se browséan los primeros 4 candidatos del grupo (en orden de score), el grupo muestra
  la UNIÓN de sus álbumes, y la identidad (`recordingId`/`title`) corresponde a la de mayor
  `release-count` — la única grabación que se ingesta

#### Scenario: La sección no encoge cuando se abre un álbum
- **WHEN** una canción ya tiene una aparición local (el usuario abrió uno de sus álbumes y el
  tracklist quedó ingerido) y MusicBrainz conoce además otras apariciones (compilaciones, lives)
- **THEN** el grupo fusiona ambas fuentes y lista MÁS álbumes que con la sola fuente local,
  nunca menos; la pata de MusicBrainz corre en toda búsqueda de Canciones (cada browse cacheado
  por mbid)

#### Scenario: Canción cacheada localmente con MusicBrainz caído
- **WHEN** la consulta coincide con una `recording` local que tiene apariciones ingeridas pero la
  pata de recordings de MusicBrainz falla
- **THEN** el grupo se construye desde la base local (degradación explícita) y la respuesta lleva
  `remoteFailed: true`

#### Scenario: Consulta que no es una canción
- **WHEN** una persona busca `xyzzyplugh 123` en Canciones y ningún candidato de recordings pasa
  el filtro de relevancia
- **THEN** la respuesta es una lista vacía y la página ofrece buscar el texto en los otros tipos

#### Scenario: Fallo de la pata de grabaciones sin fuente local
- **WHEN** la búsqueda de recordings o la resolución de apariciones falla y no hay apariciones
  locales
- **THEN** el endpoint responde con `code: INTERNAL_ERROR` para el tipo Canciones, y las
  búsquedas de Artistas y Álbumes no se ven afectadas

## ADDED Requirements

### Requirement: Accesibilidad del buscador por tipo
El campo de búsqueda SHALL exponer un label asociado y estados de validación mediante atributos
ARIA. El selector de tipo SHALL anunciar su función y el tipo activo. La lista de resultados
SHALL ser navegable por teclado, los filtros (Persona/Grupo, categoría, década) SHALL exponer su
estado seleccionado, y el estado de carga, el aviso de resultados incompletos y el estado vacío
SHALL poder ser percibidos por un lector de pantalla.

#### Scenario: Campo etiquetado
- **WHEN** una persona navega el formulario con teclado o lector de pantalla
- **THEN** el campo de búsqueda tiene un label asociado y el mensaje de validación se relaciona
  con él

#### Scenario: Filtros anunciables
- **WHEN** una persona con lector de pantalla recorre el filtro Persona/Grupo
- **THEN** cada opción anuncia su nombre y si está seleccionada

### Requirement: Endpoint de búsqueda por tipo sin ingerir discografía

`GET /api/catalog/search?type=<artist|album|song>&q=<texto>` SHALL devolver las coincidencias del
tipo pedido combinando la base local y la búsqueda en vivo de MusicBrainz, dentro del presupuesto
de "Presupuesto de MusicBrainz por tipo". Un `type` ausente o distinto de esos valores SHALL
responder `400` con `code: VALIDATION_ERROR`. El endpoint SHALL NOT ingerir discografía,
tracklist ni carátula de ningún resultado, y SHALL NOT ingerir releases ni tracks de las
apariciones de una canción (ver `catalog-recording-ingestion`). La respuesta SHALL incluir
`type`, `results` (con `id` local, `mbid`, nombre/título, subtítulo, los campos propios del tipo
y `cached`), `remoteFailed` y, para Álbumes y Canciones, `total` de MusicBrainz y `nextOffset`
cuando hay más páginas; en Canciones, cada resultado SHALL ser un grupo (canción, artista) con
sus álbumes y la respuesta SHALL incluir la interpretación usada y sus alternativas. Parámetros
opcionales: `offset`, `artistType` (Artistas), `category` y `decade` (Álbumes).

#### Scenario: Búsqueda de artistas
- **WHEN** una persona busca `Poison` en Artistas
- **THEN** el endpoint responde `200` con `type: "artist"` y artistas locales y de MusicBrainz
  deduplicados por `mbid`, sin álbumes ni canciones y sin haber ingerido ninguna discografía

#### Scenario: Homónimos preservados
- **WHEN** una persona busca `Poison` y MusicBrainz devuelve una banda de glam y otra de thrash
- **THEN** ambas aparecen como elementos separados, cada una con su `disambiguation`

#### Scenario: Falta el parámetro q o type
- **WHEN** la solicitud no incluye `q`, llega vacío tras normalizar, o `type` falta o no es válido
- **THEN** el endpoint responde `400` con `code: VALIDATION_ERROR`

#### Scenario: Paginación
- **WHEN** una búsqueda de álbumes tiene más coincidencias en MusicBrainz que las devueltas
- **THEN** la respuesta incluye `total` y `nextOffset`, y una solicitud con ese `offset` devuelve
  la página siguiente

### Requirement: Presupuesto de MusicBrainz por tipo

Cada búsqueda SHALL limitar sus solicitudes a MusicBrainz según el tipo: **Artistas**, una
búsqueda de artistas; **Álbumes**, una búsqueda de release-groups; **Usuarios**, ninguna;
**Canciones**, una búsqueda de artistas para detectar la interpretación, como máximo un browse de
discografía por interpretación probada (solo si no hay créditos locales), como máximo dos
búsquedas de recordings (una por interpretación) y como máximo cuatro browse de apariciones del
primer grupo. "Cargar más" SHALL costar una solicitud. Todas las búsquedas SHALL compartir la
caché TTL del cliente de MusicBrainz.

#### Scenario: Buscar un artista
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas con la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz

#### Scenario: Consulta repetida
- **WHEN** la misma búsqueda de álbumes se repite dentro de la TTL
- **THEN** no se emite ninguna solicitud a MusicBrainz

### Requirement: Resultados locales sin esperar a MusicBrainz

En los tipos Álbumes y Canciones, la página SHALL renderizar primero las coincidencias locales y
SHALL transmitir por streaming las de MusicBrainz cuando lleguen, con un indicador de carga en la
zona pendiente. En el tipo Artistas la página SHALL esperar la única solicitud a MusicBrainz antes
de renderizar, porque de ella depende la redirección por coincidencia exacta única. El resultado
final SHALL ser el mismo orden determinista que sin streaming.

#### Scenario: Álbum ya conocido
- **WHEN** una persona busca `kiss destroyer` en Álbumes y *Destroyer* existe localmente
- **THEN** *Destroyer* se ve de inmediato y los resultados de MusicBrainz aparecen después sin
  desplazar el orden final

### Requirement: Página de resultados por tipo

`/search` SHALL renderizar los resultados del tipo activo con la presentación propia del tipo.
Cada artista SHALL enlazar a `/artist/<id>` y mostrar nombre, tipo y desambiguación. Cada álbum
SHALL enlazar a `/album/<id>` y mostrar título, artista principal, categoría, año y su carátula
mediante carga progresiva. Cada grupo de canción SHALL mostrar título, artista y sus álbumes. Cada
usuario SHALL mostrar su tarjeta de perfil con la acción social.

#### Scenario: Navegación desde un resultado
- **WHEN** una persona hace clic en un resultado de artista
- **THEN** la aplicación navega a `/artist/<id>` de ese artista

#### Scenario: Abrir un resultado frío
- **WHEN** una persona abre un artista o álbum que aún no tiene su contenido cacheado
- **THEN** la ingesta ocurre en la vista destino, con el estado de carga propio de esa vista, y
  no durante la búsqueda

### Requirement: Resultado de canción sin página propia

Los resultados del tipo Canciones SHALL presentarse como grupos "<título> — <artista>" con los
álbumes que los contienen como destino de navegación, y SHALL NOT enlazar a la página de canción
(`/song/<id>`) desde la búsqueda. El título de la canción es dato del catálogo y SHALL NOT
traducirse.

#### Scenario: Navegar desde una canción
- **WHEN** una persona busca `taste` en Canciones
- **THEN** el grupo "Taste — Sabrina Carpenter" enlaza a sus álbumes y no a `/song/<id>`
