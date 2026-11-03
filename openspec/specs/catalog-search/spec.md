# catalog-search

## Purpose

Búsqueda pública del catálogo navegable, por tipo (Artistas, Álbumes y Canciones; ver `search-scopes`): endpoint, página de resultados, presupuesto de MusicBrainz por tipo, degradación visible y resolución de canciones hacia los álbumes que las contienen.
## Requirements
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

### Requirement: Estados de búsqueda
La interfaz SHALL mostrar un estado de carga mientras la página resuelve la búsqueda y SHALL
deshabilitar el envío del formulario mientras la navegación está en curso. Esto vale para los tres
puntos de envío: el campo de `/search`, el buscador compacto del Header y el formulario de
`/search/advanced`. Mientras una búsqueda nueva se resuelve en la misma página (cambio de URL sin
cambio de ruta), los resultados anteriores SHALL quedar marcados como pendientes (atenuados y con
`aria-busy="true"`) hasta que lleguen los nuevos. La página de resultados SHALL NOT mostrar un aviso
de "primera importación": la búsqueda ya no ingiere discografías, y ese aviso pertenece a las vistas
de artista y álbum cuando ingieren su contenido en la primera visita.

#### Scenario: Búsqueda en progreso
- **WHEN** la página está resolviendo la búsqueda para el `q` recibido
- **THEN** la interfaz muestra un estado de carga neutro y el botón de búsqueda queda
  deshabilitado

#### Scenario: La página de resultados nunca afirma una primera importación
- **WHEN** la página muestra resultados o un estado vacío
- **THEN** en ningún caso aparece el aviso de "primera importación"

#### Scenario: Envío desde el formulario avanzado
- **WHEN** una persona envía el formulario de `/search/advanced` con resultados ya en pantalla
- **THEN** el botón Buscar queda deshabilitado, los resultados anteriores se atenúan con
  `aria-busy="true"` y, al llegar la página nueva, se reemplazan y el botón vuelve a habilitarse

#### Scenario: Envío desde el Header
- **WHEN** una persona envía una búsqueda desde el buscador compacto del Header
- **THEN** el botón de envío del Header queda deshabilitado y muestra que la búsqueda está en
  curso hasta que la navegación termina

### Requirement: Error recuperable
La interfaz SHALL mostrar un estado de error recuperable para `INTERNAL_ERROR` y otros fallos
inesperados, con una acción para reintentar la búsqueda. Cuando falla la consulta a MusicBrainz y no hay
coincidencias locales, el estado SHALL decir que no se pudo consultar MusicBrainz, que el texto todavía no está
en el catálogo y que suele resolverse en segundos, en lugar del error genérico. Con MusicBrainz caído y
coincidencias locales, el aviso SHALL decir que se muestra solo lo que ya está en el catálogo.

#### Scenario: Fallo del servicio
- **WHEN** la búsqueda falla con `INTERNAL_ERROR`
- **THEN** se muestra un estado de error con un mensaje propio y una acción de reintento

#### Scenario: MusicBrainz no responde

- **WHEN** MusicBrainz no responde y no hay coincidencias locales para `xyz`
- **THEN** la página dice "No pudimos consultar MusicBrainz" con un texto que nombra `xyz` y ofrece reintentar

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
que ofrezca buscar el mismo texto en los otros tipos. El estado vacío SHALL decir qué no coincidió
("Ningún álbum coincide con «x»"), dar consejos (ortografía; en Álbumes y Canciones, «Artista - Título»),
enlazar a la búsqueda avanzada del tipo (salvo en Usuarios) y, si el catálogo propio tiene un nombre o un
título parecido (similitud de trigramas ≥ 0,45, sin consultar MusicBrainz), ofrecer "¿Quisiste decir …?"
con la misma búsqueda sobre ese texto. La misma sugerencia SHALL mostrarse sobre una lista "débil", en la que
ningún resultado cubre todas las palabras de la consulta (MusicBrainz devuelve coincidencias parciales para un error
de tipeo en lugar de una lista vacía). Sin resultados y sin filtro activo, las pastillas de filtro SHALL NOT
mostrarse. Con un filtro activo (tipo de artista, categoría o década), el estado vacío SHALL decir que no hay
nada con esos filtros y ofrecer "Quitar filtros", sin sugerencias. El endpoint SHALL NOT responder `404` ni
emitir `ARTIST_NOT_FOUND` para una búsqueda sin resultados.

#### Scenario: Texto sin coincidencias
- **WHEN** una persona busca una cadena que no corresponde a ningún artista
- **THEN** el endpoint responde `200` con `{ "type": "artist", "results": [] }` y la página
  ofrece buscar el texto en Álbumes, Canciones y Usuarios

#### Scenario: Error de tipeo

- **WHEN** una persona busca `pink floid` en Álbumes y MusicBrainz solo devuelve discos llamados "Pink" de otros
  artistas
- **THEN** sobre la lista aparece "¿Quisiste decir Pink Floyd?" con un enlace a esa búsqueda

#### Scenario: Sin coincidencias

- **WHEN** una persona busca `xqzvqzzq` en Álbumes y nada coincide
- **THEN** el estado vacío dice "Ningún álbum coincide con «xqzvqzzq»", da consejos, ofrece los otros tipos y la
  búsqueda avanzada, y no muestra pastillas de filtro

#### Scenario: Filtro que vacía la lista

- **WHEN** una persona busca `the wall` en Álbumes con la década 1960s y nada coincide
- **THEN** el estado vacío dice "Nada con estos filtros" y ofrece "Quitar filtros" hacia la misma búsqueda sin ellos

### Requirement: Persistencia de stubs desde la búsqueda

Por cada resultado de MusicBrainz que no exista aún en la base local, el endpoint SHALL
persistir un stub en una única operación por tipo (`INSERT ... ON CONFLICT (mbid) DO NOTHING`),
de modo que cada elemento de la lista tenga un `id` local. Los stubs de artista SHALL guardarse
con su `type` real derivado de la respuesta de búsqueda de MusicBrainz; si MusicBrainz no informa
el tipo, el stub SHALL guardarse como `unknown` (nunca como `various`, reservado a Various
Artists), para que el enriquecimiento de stubs lo resuelva en la primera visita. Los stubs de
álbum SHALL guardarse con su `category` derivada de `primary-type` / `secondary-types`. Los
créditos que trae la búsqueda de release-groups SHALL guardarse solo para los álbumes que aún no
tienen créditos, en lote: una operación para los artistas acreditados y una para los créditos,
sin importar cuántos resultados traiga MusicBrainz. Repetir una búsqueda cuyos álbumes ya tienen
créditos SHALL NOT escribir créditos ni artistas.

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

#### Scenario: Álbumes nuevos con créditos
- **WHEN** una búsqueda de Álbumes trae de MusicBrainz 20 álbumes que no estaban en la base
- **THEN** sus artistas acreditados y sus créditos se guardan en dos operaciones en total y cada
  álbum queda con su artista principal

#### Scenario: Búsqueda de álbumes repetida
- **WHEN** la misma búsqueda de Álbumes se repite y todos sus álbumes ya tienen créditos
- **THEN** no se escribe ningún crédito ni artista

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
sistema SHALL tomar los primeros cuatro candidatos y leer sus apariciones de las ediciones
(`releases`, con su release-group embebido) que trae la **propia respuesta de la búsqueda de
recordings**, sin ninguna solicitud adicional a MusicBrainz, y SHALL unirlas con las de las
`recording` locales del grupo que tengan tracks ingeridos; la identidad del grupo (`recordingId`,
`mbid`, `title`, `artistName`) SHALL ser la contribución con más ediciones y SHALL ser la única
grabación ingestionada por búsqueda. Los release-groups de las apariciones de los cuatro candidatos
SHALL persistirse como stubs en una sola operación. La deduplicación de la unión SHALL ser por
`release_group`, propagando el año mínimo entre fuentes. Cada álbum SHALL incluir `id` local,
`mbid`, título, categoría y año (año del release más antiguo del grupo, si se conoce), ordenados por
categoría (`studio` → `single_ep` → `compilation` → `live_other`), luego año ascendente, luego
título, con un máximo de 12. Si la resolución falla o no produce candidato aceptable, el tipo
Canciones SHALL responder con una lista vacía (o con la marca `remoteFailed` si falló MusicBrainz),
sin afectar a ningún otro tipo.

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
- **THEN** se leen las ediciones de los primeros 4 candidatos del grupo (en orden de score) desde
  la respuesta de la búsqueda, el grupo muestra la UNIÓN de sus álbumes, y la identidad
  (`recordingId`/`title`) corresponde a la de más ediciones — la única grabación que se ingesta

#### Scenario: La sección no encoge cuando se abre un álbum
- **WHEN** una canción ya tiene una aparición local (el usuario abrió uno de sus álbumes y el
  tracklist quedó ingerido) y MusicBrainz conoce además otras apariciones (compilaciones, lives)
- **THEN** el grupo fusiona ambas fuentes y lista MÁS álbumes que con la sola fuente local,
  nunca menos; la pata de MusicBrainz corre en toda búsqueda de Canciones (la búsqueda de
  recordings, cacheada por consulta)

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

#### Scenario: Apariciones sin solicitudes extra
- **WHEN** una persona busca `radiohead - creep` en Canciones con la caché fría
- **THEN** no se emite ningún browse de apariciones (`/release?recording=`) y el primer grupo lista
  los álbumes de las ediciones que trae la búsqueda de recordings, incluidas las que pasan de 100
  en una misma grabación

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
responder `400` con `code: VALIDATION_ERROR`. `q` SHALL ser opcional cuando la solicitud trae al menos
otro criterio del tipo (ver `advanced-search-filters`); sin `q` y sin ningún criterio SHALL responder
`400` con `code: VALIDATION_ERROR`. El endpoint SHALL NOT ingerir discografía,
tracklist ni carátula de ningún resultado, y SHALL NOT ingerir releases ni tracks de las
apariciones de una canción (ver `catalog-recording-ingestion`). La respuesta SHALL incluir
`type`, `results` (con `id` local, `mbid`, nombre/título, subtítulo, los campos propios del tipo
y `cached`), `remoteFailed` y, en los tres tipos, `total` de MusicBrainz y `nextOffset`
cuando hay más páginas; en Canciones, cada resultado SHALL ser un grupo (canción, artista) con
sus álbumes y la respuesta SHALL incluir la interpretación usada y sus alternativas. Parámetros
opcionales: `offset`; en Artistas `exact`, `artistType`, `country` (repetible), `area`, `beginFrom`, `beginTo` y
`ended`; en Álbumes `exact`, `artist`, `artistExact`, `category` (repetible), `decade`, `yearFrom` y `yearTo`; en
Canciones `exact`, `artist`, `artistExact`, `album`, `albumExact`, `category` (repetible), `durMin` y `durMax`. Los
criterios siguen las reglas de `advanced-search-filters` (valores inválidos o de otro tipo se ignoran sin error) y
`nextOffset` SHALL corresponder a la consulta filtrada.

#### Scenario: Búsqueda de artistas
- **WHEN** una persona busca `Poison` en Artistas
- **THEN** el endpoint responde `200` con `type: "artist"` y artistas locales y de MusicBrainz
  deduplicados por `mbid`, sin álbumes ni canciones y sin haber ingerido ninguna discografía

#### Scenario: Homónimos preservados
- **WHEN** una persona busca `Poison` y MusicBrainz devuelve una banda de glam y otra de thrash
- **THEN** ambas aparecen como elementos separados, cada una con su `disambiguation`

#### Scenario: Falta el parámetro q o type
- **WHEN** la solicitud no trae `q` (o llega vacío tras normalizar) ni ningún otro criterio, o `type` falta o no es
  válido
- **THEN** el endpoint responde `400` con `code: VALIDATION_ERROR`

#### Scenario: Paginación
- **WHEN** una búsqueda de álbumes o de artistas tiene más coincidencias en MusicBrainz que las devueltas
- **THEN** la respuesta incluye `total` y `nextOffset`, y una solicitud con ese `offset` devuelve
  la página siguiente

#### Scenario: Filtros en el endpoint
- **WHEN** una solicitud pide `type=album&q=iron%20maiden&yearFrom=1983&yearTo=1986`
- **THEN** el endpoint responde `200` solo con álbumes cuyo primer lanzamiento cae entre 1983 y 1986, y una
  solicitud con `country=XYZ` en Artistas responde `200` ignorando ese filtro

#### Scenario: Criterios sin texto
- **WHEN** una solicitud pide `type=artist&country=CL&artistType=group` sin `q`
- **THEN** el endpoint responde `200` con grupos de Chile, `total` y `nextOffset`

### Requirement: Presupuesto de MusicBrainz por tipo

Cada búsqueda SHALL limitar sus solicitudes a MusicBrainz según el tipo: **Artistas**, una
búsqueda de artistas; **Álbumes**, una búsqueda de release-groups; **Usuarios**, ninguna;
**Canciones**, una búsqueda de artistas para detectar la interpretación, como máximo un browse de
discografía por interpretación probada (solo si no hay créditos locales) y como máximo dos
búsquedas de recordings (una por interpretación). Ninguna búsqueda SHALL hacer browse de
apariciones de una grabación (`/release?recording=`), tampoco en **Canciones con `purpose=pick`**.
"Cargar más" SHALL costar una solicitud. Todas las búsquedas SHALL compartir la caché TTL del
cliente de MusicBrainz.

#### Scenario: Buscar un artista
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas con la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz

#### Scenario: Consulta repetida
- **WHEN** la misma búsqueda de álbumes se repite dentro de la TTL
- **THEN** no se emite ninguna solicitud a MusicBrainz

#### Scenario: Canciones en modo de elección
- **WHEN** se busca `megadeth rust in peace` en Canciones con `purpose=pick` y la caché fría
- **THEN** no se emite ningún browse de apariciones (`/release?recording=`) y el total de solicitudes a
  MusicBrainz es como mucho cuatro (artistas, un browse de discografía, dos búsquedas de recordings)

#### Scenario: Canciones sin modo de elección
- **WHEN** se busca `pink floyd time` en Canciones (sin `purpose`) con la caché fría
- **THEN** el total de solicitudes a MusicBrainz es como mucho cuatro (artistas, un browse de
  discografía, dos búsquedas de recordings) y ninguna es un browse de apariciones

### Requirement: Resultados locales sin esperar a MusicBrainz

En los tipos Artistas, Álbumes y Canciones, tanto en `/search` como en `/search/advanced`, la página
SHALL renderizar primero las coincidencias locales y SHALL transmitir por streaming las de
MusicBrainz cuando lleguen, con un indicador de carga en la zona pendiente: debajo de las filas locales, donde
aparecerán las nuevas, con dos filas de esqueleto. En el tipo Artistas de
`/search`, la redirección por coincidencia exacta única SHALL decidirse en la parte transmitida, con
la respuesta de MusicBrainz (la misma regla que sin streaming): si corresponde, la página redirige
al perfil aunque la lista local ya se haya mostrado. El resultado final SHALL ser el mismo orden
determinista que sin streaming.

#### Scenario: Álbum ya conocido
- **WHEN** una persona busca `kiss destroyer` en Álbumes y *Destroyer* existe localmente
- **THEN** *Destroyer* se ve de inmediato y los resultados de MusicBrainz aparecen después sin
  desplazar el orden final

#### Scenario: Artista ya conocido con homónimos
- **WHEN** una persona busca `kiss` en Artistas, Kiss existe localmente y MusicBrainz conoce otros
  artistas llamados Kiss
- **THEN** Kiss se ve sin esperar a MusicBrainz y, al llegar su respuesta, la lista final incluye
  los homónimos sin redirigir

#### Scenario: Artista exacto único
- **WHEN** una persona busca `the cure` en Artistas desde el Header y MusicBrainz confirma que es
  la única coincidencia exacta
- **THEN** la página muestra primero lo local y, al llegar la respuesta de MusicBrainz, redirige al
  perfil de The Cure, tanto en la navegación desde el Header como abriendo la URL directamente

#### Scenario: Artistas sin nombre en la búsqueda avanzada
- **WHEN** una persona busca grupos de Chile de 1980 a 1989 en `/search/advanced`
- **THEN** las coincidencias locales se ven sin esperar a MusicBrainz y la lista final con
  "Cargar más" llega después

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

### Requirement: Acceso directo a la canción resuelta

En el tipo Canciones, el grupo resuelto (el que expone `recordingId`) SHALL ofrecer un enlace
directo a `/song/<id>` además de listar los álbumes que la contienen. El enlace SHALL mostrarse
solo cuando `recordingId` no sea `null`; sin identidad resuelta, el panel SHALL conservar la lista
de álbumes como único destino. Los grupos no resueltos SHALL seguir abriendo su propia búsqueda. El
título de la canción es dato del catálogo y SHALL NOT traducirse; el texto del enlace sí.

#### Scenario: Búsqueda exacta de canción

- **WHEN** una persona busca `dokken kiss of death` en Canciones y el grupo resuelto es
  "Kiss of Death — Dokken" con `recordingId`
- **THEN** el panel muestra "Ver canción" enlazando a `/song/<recordingId>` junto a los álbumes
  que contienen la canción

#### Scenario: Enlace en el primer render local

- **WHEN** el grupo resuelto tiene apariciones locales y la página pinta primero las coincidencias
  locales antes de la respuesta de MusicBrainz
- **THEN** el enlace directo a `/song/<id>` ya está visible y se mantiene tras llegar el resto

#### Scenario: Grupo sin identidad resuelta

- **WHEN** un grupo no logra una grabación identidad (`recordingId` es `null`)
- **THEN** el panel no muestra el enlace directo y solo lista sus álbumes

#### Scenario: Grupos no resueltos

- **WHEN** la respuesta incluye "Otras canciones con ese título"
- **THEN** esas filas siguen abriendo su propia búsqueda y no enlazan a `/song/<id>`

### Requirement: Modo de elección en Canciones

`GET /api/catalog/search?type=song` SHALL aceptar el parámetro opcional `purpose`. Con `purpose=pick` (usado
por los buscadores que eligen un objetivo, como el diálogo de acciones rápidas), la búsqueda de Canciones SHALL
seguir la misma detección de interpretación, filtro de relevancia, agrupación por (canción, artista) y orden que
sin el parámetro, pero:

- SHALL NOT browséar apariciones; todos los grupos SHALL devolver `albums: []`;
- **cada** grupo devuelto SHALL tener grabación identidad (`recordingId` y `mbid` no nulos): la contribución
  local con más apariciones si el grupo tiene alguna; si no, la primera grabación de MusicBrainz del grupo en
  orden de score que no tenga `disambiguation` (versión de estudio) y, si todas la tienen, la primera;
- las grabaciones identidad que no existan en la base SHALL registrarse con sus créditos a partir de los datos
  de la búsqueda de recordings, sin solicitudes adicionales a MusicBrainz;
- la respuesta SHALL incluir como máximo 10 grupos, sin `nextOffset`.

Sin `purpose`, o con otro valor, el comportamiento SHALL ser el descrito en "Resolución de canciones hacia
álbumes que las contienen". El parámetro SHALL ignorarse en Artistas y Álbumes.

#### Scenario: Varias canciones elegibles

- **WHEN** se busca `megadeth` en Canciones con `purpose=pick` y MusicBrainz devuelve grabaciones de cinco
  canciones distintas de Megadeth
- **THEN** la respuesta tiene cinco grupos, todos con `recordingId` no nulo y `albums: []`

#### Scenario: Prefiere la versión de estudio

- **WHEN** un grupo tiene, en orden de score, una grabación con `disambiguation` "live" y luego una sin
  `disambiguation`
- **THEN** la identidad del grupo es la grabación sin `disambiguation`

#### Scenario: Prefiere la grabación local

- **WHEN** un grupo tiene una grabación local con apariciones ingeridas
- **THEN** su identidad es esa grabación local y no se registra ninguna grabación nueva para el grupo

#### Scenario: Sin purpose no cambia /search

- **WHEN** se busca `megadeth` en Canciones sin `purpose`
- **THEN** solo el primer grupo tiene `recordingId` y sus álbumes, como antes

### Requirement: Cancelación de búsquedas abandonadas

Cuando quien hizo una solicitud a `GET /api/catalog/search` la abandona (la conexión se aborta), el servidor
SHALL dejar de emitir las solicitudes a MusicBrainz de esa búsqueda que aún esperan turno en la cola de rate
limit, y SHALL NOT encolar nuevas. Una solicitud a MusicBrainz ya en curso SHALL completarse. Una solicitud en
espera compartida por varias búsquedas idénticas (la misma clave de la caché TTL) SHALL descartarse solo cuando
**todas** las búsquedas que la esperan fueron abandonadas. Una solicitud descartada SHALL NOT quedar en la
caché TTL. Las escrituras que dependan de una solicitud descartada (stubs, grabaciones) SHALL NOT hacerse.

#### Scenario: Escritura rápida

- **WHEN** el diálogo pide `megadeth` y la aborta mientras su búsqueda de recordings espera turno en la cola
- **THEN** esa búsqueda de recordings nunca se envía a MusicBrainz y la búsqueda siguiente no espera por ella

#### Scenario: Búsqueda compartida

- **WHEN** dos personas buscan `slayer` en Álbumes a la vez y una de ellas abandona su solicitud
- **THEN** la solicitud a MusicBrainz se emite igual y la otra persona recibe sus resultados

#### Scenario: Solicitud descartada no se cachea

- **WHEN** una búsqueda se descartó por abandono y otra persona busca lo mismo después
- **THEN** la nueva búsqueda emite la solicitud a MusicBrainz en vez de recibir el error de cancelación

### Requirement: Título de la pestaña por búsqueda

La página `/search` SHALL titularse "Buscar" sin consulta y "«texto» en tipo · Buscar" con ella ("«the wall» en
álbumes · Buscar"), para distinguir varias búsquedas abiertas. El esqueleto de carga SHALL tener el mismo ancho que la
página resuelta.

#### Scenario: Varias búsquedas abiertas

- **WHEN** una persona abre `/search?type=album&q=the wall`
- **THEN** la pestaña del navegador dice "«the wall» en álbumes · Buscar"

### Requirement: Encabezado compacto con resultados

Con una consulta, `/search` SHALL dejar el título "Buscar" y la etiqueta del campo solo para lectores de pantalla,
mostrar el campo y el botón en una sola fila también en móvil y el resumen como "Resultados para «texto»" con la cifra.
La cifra SHALL ser exacta hasta 1.000 y "más de 1.000" por encima (el total de MusicBrainz no es lo que se recorre). La sugerencia para acotar una consulta genérica SHALL usar la
misma cifra ("Más de 1.000 álbumes coinciden…").
En móvil, las pastillas de categoría y década de Álbumes SHALL plegarse tras un botón **Filtros** que indica cuántos hay
activos; en escritorio se ven siempre. El primer resultado SHALL quedar en la primera pantalla de un móvil de 375 × 812.

#### Scenario: Álbumes en móvil
- **WHEN** una persona abre `/search?type=album&q=the wall` en 375 px
- **THEN** ve el campo en una fila, las pestañas, "Filtros", el resumen con "más de 1.000" y los primeros resultados
  sin desplazarse

#### Scenario: Filtro activo en móvil
- **WHEN** la búsqueda tiene la década 1970s
- **THEN** el botón dice "Filtros · 1" y al pulsarlo muestra las pastillas con 1970s marcada

### Requirement: Portada sin consulta

Sin consulta, `/search` SHALL mostrar bajo el campo: las búsquedas recientes del navegador como pastillas (cada una con
su tipo y un botón para quitarla); "Prueba con", hasta cuatro artistas y cuatro discos con más personas distintas que
los siguieron, valoraron o escucharon en público en los últimos 7 días (o 30 si la semana no alcanza), sin cifras y
sin contar escuchas privadas ni cuentas desactivadas, y solo si hay al menos dos; y un consejo sobre «Artista - Título». Cada disco
sugerido SHALL mostrar su artista y su año.

#### Scenario: Plataforma con actividad
- **WHEN** una persona abre `/search` y esta semana varias personas valoraron *BRAT*
- **THEN** "Prueba con" muestra *BRAT* de Charli xcx entre sus sugerencias, sin cifras

#### Scenario: Sin actividad
- **WHEN** nadie siguió, valoró ni escuchó nada en 30 días
- **THEN** la portada muestra recientes (si hay) y el consejo, sin "Prueba con"

