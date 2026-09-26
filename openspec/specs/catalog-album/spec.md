# catalog-album

## Purpose

Detalle público de álbum en el catálogo navegable, con tracklist agrupado por disco, carátula y créditos visibles.
## Requirements
### Requirement: Detalle localizado de álbum

La aplicación SHALL exponer una vista pública en `/{locale}/album/{id}` para los locales soportados y SHALL mostrar la carátula, la edición seleccionada y el tracklist del `release_group` identificado por el id propio.

#### Scenario: Álbum válido en español

- **WHEN** una persona visita `/es/album/<id-válido>`
- **THEN** la aplicación muestra la información musical del álbum y las etiquetas de interfaz en español

#### Scenario: Álbum válido en inglés

- **WHEN** una persona visita `/en/album/<id-válido>`
- **THEN** la aplicación muestra la misma información musical y las etiquetas de interfaz en inglés

### Requirement: Read-model compartido de detalle

El sistema SHALL construir un read-model interno que contenga el `release_group` (incluida
su `category` y su fecha de lanzamiento canónica: `first_release_date` cuando exista y
`first_release_year` en todos los casos en que se conozca el año), la **edición
representativa** resuelta según la capacidad `album-edition-selection`, la carátula, los
tracks, sus créditos y **todos los artistas principales** asociados al `release_group`
(créditos con rol `primary`, en su orden y con su `joinPhrase`) cuando existan, y SHALL
reutilizarlo desde el Server Component y el endpoint REST sin duplicar la lógica de
lectura o ingesta.

La fecha/año que el read-model presenta como fecha del álbum SHALL ser la del
`release_group`, no la de la edición ingerida; la `release_date` de la edición SHALL
seguir disponible como dato de la edición.

#### Scenario: Reutilización por página y endpoint

- **WHEN** la página o `GET /api/catalog/release-group/{id}` solicita un álbum
- **THEN** ambos consumidores obtienen el detalle mediante el mismo servicio de catálogo y
  la respuesta incluye `category`, `firstReleaseDate` y `firstReleaseYear` del
  release-group además del `release` con su `editionLabel` y tracklist

#### Scenario: Fecha del álbum frente a fecha de la edición

- **WHEN** un `release_group` de 1994 tiene como edición representativa una reedición
  fechada en 2015
- **THEN** el detalle presenta 1994 como año del álbum y expone 2015 solo como fecha de la
  edición

#### Scenario: Álbum inexistente

- **WHEN** el id no corresponde a ningún `release_group`
- **THEN** la página muestra un 404 localizado y el endpoint responde con `ALBUM_NOT_FOUND`

#### Scenario: Álbum sin ediciones ingeribles

- **WHEN** el `release_group` existe pero MusicBrainz no entrega una edición utilizable
- **THEN** la página muestra un estado vacío localizado y el endpoint responde con
  `NO_EDITIONS_FOUND`

#### Scenario: Álbum sin artista principal

- **WHEN** el `release_group` no tiene un crédito primario de artista identificable
- **THEN** el read-model devuelve el detalle sin artistas principales y la página puede
  renderizar el álbum sin un enlace de artista roto

#### Scenario: Álbum sin fecha canónica conocida

- **WHEN** MusicBrainz no aporta `first-release-date` para el `release_group`, ni siquiera
  con precisión anual
- **THEN** `firstReleaseDate` y `firstReleaseYear` son `null` y la vista omite la fecha
  sin romper el layout

#### Scenario: Álbum colaborativo

- **WHEN** el `release_group` tiene dos créditos `primary` ("Artista A" con `joinPhrase`
  " & " y "Artista B")
- **THEN** el read-model devuelve ambos artistas en orden y la vista muestra
  "Artista A & Artista B", cada nombre enlazado a su página

### Requirement: Tracklist ordenado y agrupado por disco

La aplicación SHALL ordenar los tracks por número de disco y posición en la consulta de datos, y SHALL agruparlos visualmente por disco en la vista de álbum.

#### Scenario: Álbum multidisco

- **WHEN** el álbum contiene tracks de más de un disco
- **THEN** la vista muestra una sección por disco y dentro de cada sección los tracks aparecen en orden ascendente de posición

#### Scenario: Álbum de un solo disco

- **WHEN** el álbum contiene tracks de un único disco
- **THEN** la vista muestra el tracklist ordenado sin crear secciones vacías o adicionales

### Requirement: Información de cada track

Cada track SHALL conservar `recordingId`, posición, número de disco, título y duración opcional. La vista SHALL formatear las duraciones conocidas como `mm:ss` y SHALL mostrar una etiqueta localizada cuando la duración sea nula.

#### Scenario: Track con duración

- **WHEN** un track tiene una duración válida en segundos
- **THEN** la vista la muestra formateada como minutos y segundos

#### Scenario: Track sin duración

- **WHEN** un track tiene `durationSec` nulo
- **THEN** la vista muestra el texto localizado para duración no disponible y mantiene el track visible

### Requirement: Créditos destacados visibles

La vista SHALL mostrar como enlaces locale-aware los créditos destacados de cada track cuando
existan, respetando el nombre, `artistId` y `joinPhrase` entregados por el catálogo. Los créditos
sin rol `featured` no SHALL convertirse en enlaces de colaboración. Cuando los créditos
`primary` de un track difieren de los artistas principales del álbum, la vista SHALL
mostrar además el artista principal del track, enlazado, como autoría de la pista (no como
colaboración).

#### Scenario: Track con colaboración

- **WHEN** un track contiene un crédito con rol `featured`
- **THEN** la vista muestra la colaboración correspondiente y el nombre de cada artista enlaza a
  su perfil con el locale activo

#### Scenario: Track sin colaboración destacada

- **WHEN** un track no contiene créditos destacados
- **THEN** la vista no muestra una etiqueta de colaboración adicional

#### Scenario: Pista de otro artista en una recopilación

- **WHEN** una recopilación contiene un track cuyo crédito `primary` es un artista distinto
  de los artistas principales del álbum
- **THEN** la fila muestra ese artista enlazado bajo el título, sin presentarlo como
  "feat."

#### Scenario: Pista del mismo artista del álbum

- **WHEN** los créditos `primary` del track coinciden con los artistas principales del
  álbum
- **THEN** la fila no repite el nombre del artista

### Requirement: Carátula y fallback

La vista SHALL usar únicamente la carátula miniatura proporcionada por el backend y SHALL mostrar
un fallback visual localizado cuando no exista o cuando la carga de la imagen falle después de
un máximo de dos reintentos con backoff. La carátula proviene de la resolución cacheada a nivel
de release-group (`cover_thumb_url`), no se arma desde el MBID de una release concreta, por lo
que un álbum oficial con portada la muestra sin importar qué edición se ingirió. Un fallo de
carátula no SHALL impedir mostrar el tracklist ni la navegación.

#### Scenario: Carátula disponible

- **WHEN** el detalle devuelve una URL de carátula del release-group y la imagen carga
- **THEN** la vista muestra la imagen mediante el componente centralizado de carátulas

#### Scenario: Carátula ausente

- **WHEN** el detalle no devuelve carátula
- **THEN** la vista muestra un placeholder accesible y el tracklist permanece disponible

#### Scenario: Error transitorio de imagen

- **WHEN** la imagen de carátula falla durante la carga
- **THEN** la vista conserva un estado accesible, reintenta como máximo dos veces con backoff y no
  repite requests indefinidamente

#### Scenario: Fallo definitivo de imagen

- **WHEN** la imagen falla después de agotar los reintentos
- **THEN** la vista muestra el placeholder localizado y mantiene visible el tracklist completo

#### Scenario: Álbum oficial cuya edición ingerida no porta la carátula

- **WHEN** el álbum tiene carátula en Cover Art Archive pero la edición ingerida no es la que carga el arte
- **THEN** la vista muestra la carátula del release-group, sin 404 en el navegador

### Requirement: Interfaz localizada sin traducir datos musicales

Los textos de interfaz, estados, etiquetas y textos alternativos SHALL provenir del namespace `album` de los catálogos de mensajes, mientras que los nombres de álbumes, canciones, artistas y créditos SHALL conservarse tal como llegan del catálogo musical.

#### Scenario: Cambio de locale

- **WHEN** una persona visita el mismo álbum en dos locales soportados
- **THEN** cambian las etiquetas de interfaz y permanecen iguales los datos musicales

### Requirement: Enlaces de tracks a canciones

Cada track del detalle de álbum SHALL enlazar su `recordingId` a `/{locale}/song/{id}` y SHALL conservar créditos, duración y posición visibles.

#### Scenario: Track navegable

- **WHEN** una persona selecciona un track del álbum
- **THEN** la navegación llega al detalle de la grabación con el mismo locale y el UUID interno correcto

### Requirement: Acciones sociales del álbum

El detalle de álbum SHALL presentar la lectura pública de reseñas, rating y comentarios y
los controles de escritura únicamente a usuarios autenticados, repartidos por zona: el
rating propio en el panel "Tu relación" (capacidad `album-personal-panel`), el rating
agregado en el bloque de comunidad (capacidad `album-community-stats`), las reseñas en la
pestaña Reseñas y los comentarios al final de la página, fuera de las pestañas. La
pestaña Reseñas SHALL presentar las reseñas de la comunidad como un **índice** con, por
fila, el título de la reseña (o, cuando no tiene título, un extracto del inicio del
cuerpo), las estrellas vigentes del autor, el autor y la fecha, ordenable por más
recientes, mejor nota y peor nota; cada fila SHALL abrir la reseña según la capacidad
`review-detail`. Las reseñas SHALL diferenciarse visual y estructuralmente de los
comentarios: la reseña lleva rating y es la postura crítica del autor sobre la obra, el
comentario es una nota conversacional corta. El editor de reseña propia SHALL pedir el
cuerpo, un título opcional y —solo cuando el usuario aún no valoró el álbum— las
estrellas, en el mismo formulario.

#### Scenario: Usuario anónimo en álbum

- **WHEN** una persona sin sesión visita un álbum
- **THEN** puede leer las reseñas, los ratings y los comentarios públicos y recibe una
  acción para iniciar sesión antes de escribir

#### Scenario: Usuario autenticado en álbum

- **WHEN** un usuario autenticado visita un álbum
- **THEN** puede consultar y modificar su reseña, su rating y sus comentarios sin que el
  tracklist se vuelva a ingerir

#### Scenario: Reseña y comentario se distinguen en la vista

- **WHEN** un álbum tiene reseñas y comentarios
- **THEN** las reseñas aparecen como índice dentro de la pestaña Reseñas y los comentarios
  aparecen al final de la página, fuera de las pestañas, como notas cortas sin título ni
  rating

#### Scenario: Reseña sin título en la vista

- **WHEN** una reseña de la comunidad no tiene título
- **THEN** su fila en el índice muestra un extracto del inicio del cuerpo, sin dejar un
  hueco donde iría el título

#### Scenario: Ordenar el índice

- **WHEN** una persona elige ordenar las reseñas por mejor nota
- **THEN** el índice se ordena por las estrellas vigentes de cada autor, de mayor a menor

### Requirement: Tipo de obra visible en el detalle de álbum

La vista de álbum SHALL mostrar siempre una etiqueta de tipo de obra localizada, tomada
del namespace `album` de los catálogos de mensajes, como antetítulo de la cabecera, para
todas las `category` (`studio`, `compilation`, `live_other`, `single_ep`). La etiqueta
SHALL ser texto de interfaz: no altera el título del álbum ni ningún dato musical.

#### Scenario: Recopilación

- **WHEN** una persona abre un álbum cuya `category` es `compilation`
- **THEN** la vista muestra la etiqueta localizada de recopilación como antetítulo, sin
  modificar el título

#### Scenario: Álbum de estudio

- **WHEN** una persona abre un álbum cuya `category` es `studio`
- **THEN** la vista muestra la etiqueta localizada "Álbum de estudio" como antetítulo

#### Scenario: Cambio de locale

- **WHEN** una persona abre el mismo álbum en dos locales soportados
- **THEN** la etiqueta de tipo de obra cambia de idioma y los datos musicales permanecen
  iguales

### Requirement: Ficha técnica del álbum

La cabecera SHALL mostrar una ficha técnica en forma de pares etiqueta/valor con, en este
orden: lanzamiento (con la precisión conocida: día, mes o solo año), duración (cantidad de
pistas y duración total), edición (la edición representativa con su etiqueta y un acceso
a la pestaña Ediciones) y sello (el de la edición representativa, cuando el catálogo lo
conoce). La ficha SHALL renderizar únicamente las filas con dato: una fila
sin valor SHALL omitirse, nunca mostrarse con un guion o un texto de relleno.

#### Scenario: Ficha completa

- **WHEN** un álbum tiene fecha canónica, tracklist con duraciones y edición representativa
- **THEN** la ficha muestra las filas Lanzamiento, Duración y Edición con sus valores

#### Scenario: Álbum sin fecha

- **WHEN** el álbum no tiene fecha canónica conocida
- **THEN** la ficha omite la fila Lanzamiento y el resto conserva su orden

#### Scenario: Precisión anual

- **WHEN** el álbum solo tiene `first_release_year`
- **THEN** la fila Lanzamiento muestra solo el año

### Requirement: Títulos de pista completos

La tracklist SHALL mostrar el título completo de cada pista, con salto de línea cuando no
entra en una línea, y SHALL NOT truncarlo. Duración, marcas y menú de la pista SHALL
ocupar columnas fijas alineadas a la derecha en escritorio; en viewport móvil SHALL
mostrarse bajo el título. Las marcas SHALL ser íconos de tamaño fijo, de modo que todas las
filas tengan el mismo alto con o sin marcas. En escritorio la fila completa SHALL
resaltarse al pasar el cursor o al contener el foco, para guiar la lectura del título a la
duración.

#### Scenario: Título largo

- **WHEN** una pista se titula "The Great Gig in the Sky (Instrumental Version With Vocal
  Improvisation, 2011 Remaster)"
- **THEN** la fila muestra el título completo en varias líneas y la duración queda alineada
  con la de las demás filas

#### Scenario: Alto uniforme

- **WHEN** la pista 1 está marcada como escuchada y la pista 3 no tiene marcas
- **THEN** ambas filas tienen el mismo alto

### Requirement: Subtotales por disco y total del álbum

La tracklist SHALL mostrar en la cabecera de cada disco (cuando hay más de uno) la
cantidad de pistas y la duración del disco, y al pie la cantidad total de pistas y la
duración total. En un álbum de un solo disco la tracklist SHALL NOT repetir al pie el total,
que ya muestra la ficha técnica. Cuando al menos una pista del conjunto no tiene duración conocida, la
duración SHALL mostrarse precedida de "≥" y SHALL NOT presentarse como exacta.

#### Scenario: Todas las duraciones conocidas

- **WHEN** todas las pistas de un disco tienen duración
- **THEN** el subtotal muestra la suma exacta en formato `mm:ss` o `h:mm:ss`

#### Scenario: Duración faltante

- **WHEN** una pista del álbum tiene `durationSec` nulo
- **THEN** el total del álbum se muestra como "≥ " seguido de la suma de las duraciones
  conocidas

#### Scenario: Un solo disco

- **WHEN** el álbum tiene un único disco de 12 pistas
- **THEN** la tracklist no muestra pie de total y la ficha técnica sigue mostrando
  "12 pistas · 38:24"

### Requirement: Variantes de grabación en la tracklist

Cuando una pista corresponde a una grabación con `variant_type` distinto de `original`, la
fila SHALL mostrar una etiqueta localizada de variante (en vivo, remix, regrabación) y,
cuando exista `variant_of_id`, un enlace locale-aware a la grabación original.

#### Scenario: Pista en vivo con original conocida

- **WHEN** una pista es una grabación `live` con `variant_of_id` apuntando a "Money"
- **THEN** la fila muestra la etiqueta "En vivo" y un enlace "versión de Money" a la
  página de esa canción

#### Scenario: Pista original

- **WHEN** una pista es una grabación `original`
- **THEN** la fila no muestra etiqueta de variante

### Requirement: Favoritas de la comunidad en la tracklist

La tracklist SHALL marcar como "favorita de la comunidad" las pistas con más reacciones
fuertes (`loved` y `obsessed`) en entradas de diario públicas sobre su grabación, hasta un
máximo de 3 pistas por álbum, y solo las pistas con al menos 5 reacciones fuertes. Cuando
alguna pista lleva la marca, la tracklist SHALL mostrar sobre la lista una leyenda visible
que explique su significado. La tracklist SHALL NOT mostrar una media de estrellas de la
comunidad por pista.

#### Scenario: Pistas destacadas

- **WHEN** dos pistas de un álbum superan el umbral de reacciones fuertes
- **THEN** ambas muestran la marca de favorita de la comunidad y las demás no
- **AND** sobre la lista se ve la leyenda "Favorita de la comunidad"

#### Scenario: Catálogo sin reacciones suficientes

- **WHEN** ninguna pista alcanza 5 reacciones fuertes públicas
- **THEN** ninguna pista muestra la marca

#### Scenario: Consulta agrupada

- **WHEN** se arma la tracklist de un álbum de 20 pistas
- **THEN** las reacciones se obtienen con una única consulta agrupada por grabación, no
  con una consulta por pista

### Requirement: Estado personal por pista

Para un usuario autenticado, cada fila de la tracklist SHALL mostrar de forma siempre
visible (sin depender de pasar el cursor): una marca cuando el usuario tiene al menos una
entrada de diario sobre esa grabación; su valoración propia de la grabación, como estrellas
de solo lectura con el valor anunciado a lectores de pantalla, cuando existe; y un
conmutador de favorito (corazón) que alterna la señal sin abrir el menú, con contorno de
baja intensidad cuando está inactivo y relleno cuando está activo, y con `aria-pressed`.
El estado personal de todas las pistas SHALL obtenerse con consultas agrupadas por álbum,
no con una consulta por pista. Para visitantes anónimos las marcas personales y el
conmutador SHALL NOT mostrarse.

#### Scenario: Pista escuchada

- **WHEN** un usuario autenticado registró una escucha de la pista 2
- **THEN** la fila de la pista 2 muestra la marca "La escuchaste" en escritorio y en móvil

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ninguna fila muestra marcas personales

#### Scenario: Pista valorada

- **WHEN** un usuario autenticado valoró la pista 4 con 4½ estrellas
- **THEN** la fila de la pista 4 muestra sus 4½ estrellas sin abrir ningún menú

#### Scenario: Favorito desde la fila

- **WHEN** un usuario autenticado pulsa el corazón inactivo de la pista 7
- **THEN** la pista queda en sus favoritos y el corazón se muestra relleno con
  `aria-pressed="true"`

### Requirement: Menú de acciones por pista

Cada fila SHALL ofrecer un menú `···` con, en este orden y agrupado: Registrar escucha y
Reaccionar; Valorar, Favorito, Añadir a lista y Ver en listas. El menú SHALL NOT ofrecer
"Ir a la canción", que ya cubre el enlace del título. El control del menú SHALL tener un
área táctil de al menos 40 px. Las acciones que requieren sesión SHALL pedir iniciar
sesión a un visitante anónimo sin crear datos.

#### Scenario: Orden del menú

- **WHEN** un usuario abre el menú de una pista
- **THEN** las acciones de consumo (Registrar escucha, Reaccionar) aparecen primero

#### Scenario: Acción sin sesión

- **WHEN** un visitante anónimo elige Registrar escucha en el menú
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Sin acción redundante

- **WHEN** un usuario abre el menú de una pista
- **THEN** no aparece "Ir a la canción" y el título de la fila sigue enlazando a la canción

### Requirement: Pistas adicionales de otras ediciones

Cuando el catálogo conoce ediciones oficiales del álbum que agregan pistas a la lista de
la edición representativa, la pestaña Canciones SHALL mostrar, después de la lista
principal, un bloque "Pistas adicionales en otras ediciones" con una frase fija que aclara
que esas pistas no forman parte del álbum original. El bloque SHALL tener una sección por
variante (ediciones agrupadas por la misma lista de pistas), y todas las secciones SHALL
estar contraídas al cargar la página. El encabezado de cada sección SHALL identificar la
variante con su nombre, año, sello y formato, la cantidad de ediciones que agrupa (con sus
países) cuando es más de una, y la cantidad de pistas adicionales. Al desplegarse, una
sección SHALL mostrar solo las pistas que la variante agrega: grabaciones que no están en
la lista principal, sin contar como adicional una pista cuyo título normalizado coincide
con una de la lista principal. Una variante de tipo caja SHALL rotularse como caja con su
cantidad total de pistas y enlazar a MusicBrainz, sin desplegar la lista. La página SHALL
NOT tener páginas propias por edición.

#### Scenario: Secciones contraídas

- **WHEN** una persona abre un álbum con dos variantes que agregan pistas
- **THEN** ve dos encabezados de sección contraídos, cada uno con el nombre de la edición
  y "+N pistas", y ninguna pista adicional visible

#### Scenario: Desplegar una variante

- **WHEN** la persona despliega la sección "Experience Edition"
- **THEN** ve solo las pistas que esa edición agrega a la lista original, cada una enlazada
  a su canción

#### Scenario: Edición con pistas fusionadas

- **WHEN** una edición tiene 9 pistas porque fusiona dos canciones de la lista original de
  10
- **THEN** no aparece como variante con pistas adicionales

#### Scenario: Remaster con otra grabación

- **WHEN** una edición contiene una grabación distinta cuyo título normalizado coincide con
  el de una pista de la lista principal
- **THEN** esa pista no se muestra como adicional

#### Scenario: Caja

- **WHEN** una variante es una caja de 193 pistas
- **THEN** su encabezado dice "Caja · 193 pistas" y enlaza a MusicBrainz sin desplegar la
  lista

#### Scenario: Sin variantes

- **WHEN** el catálogo no conoce ediciones que agreguen pistas
- **THEN** el bloque de pistas adicionales no se muestra

### Requirement: Pestaña Créditos

La pestaña Créditos SHALL mostrar únicamente personas acreditadas en el disco (créditos de
personal de nivel edición o grabación), agrupadas en cuatro niveles y en este orden: el
**primer nivel** (acreditadas y miembros del artista principal según el catálogo, o el
propio artista principal cuando es una persona), en un bloque destacado siempre visible;
**Músicos invitados** (intérpretes acreditados que no son miembros); **Producción y
sonido**; y **Arte y otros**, contraído por defecto con la cantidad de créditos. El primer
nivel SHALL rotularse "Artista principal" ("Artistas principales" con más de una persona)
cuando todos los artistas principales del álbum son personas, e "Integrantes de la banda"
en los demás casos. Con un artista principal persona, el primer nivel SHALL mostrarse como
una línea compacta sin bloque destacado; el bloque destacado queda para los integrantes de
una banda. El título "Créditos" SHALL existir solo para lectores de pantalla, porque la
barra de pestañas ya lo muestra. Músicos invitados y Producción y sonido SHALL mostrarse
contraídos por defecto, sea cual sea la cantidad de personas, con un resumen que indica la
cantidad y los tres primeros nombres, y SHALL poder desplegarse. Cada persona
SHALL aparecer una sola vez, en el nivel más alto que le corresponde, con todos sus roles y
las pistas en que participa ("todas" cuando participa en todas). La pestaña SHALL NOT
mostrar integrantes calculados por fechas de pertenencia ni personas sin crédito en el
disco, y SHALL NOT mostrar un distintivo de fundador. Un tipo de crédito sin nivel asignado
SHALL mostrarse en Arte y otros. Sin créditos de personal ni de autoría, la pestaña no se
muestra.

#### Scenario: Integrante acreditado

- **WHEN** un miembro de la banda está acreditado con guitarra y voz en todas las pistas y
  como coproductor
- **THEN** aparece en Integrantes de la banda con "guitarra, voz, coproducción · todas" y
  no se repite en Producción y sonido

#### Scenario: Miembro sin crédito en el disco

- **WHEN** una persona era miembro de la banda el año del lanzamiento pero no tiene
  créditos en el disco
- **THEN** no aparece en la pestaña

#### Scenario: Invitado en pistas puntuales

- **WHEN** una vocalista no miembro está acreditada solo en la pista 5
- **THEN** aparece en Músicos invitados con "voz · pista 5"

#### Scenario: Créditos de arte contraídos

- **WHEN** el disco tiene 9 créditos de diseño y fotografía
- **THEN** el nivel Arte y otros se muestra contraído como "+9 créditos"

#### Scenario: Álbum de solista

- **WHEN** el único artista principal del álbum es una persona acreditada en su disco
- **THEN** el primer nivel se rotula "Artista principal"

#### Scenario: Muchos músicos invitados

- **WHEN** el disco tiene 23 músicos invitados
- **THEN** el nivel se muestra contraído con "23" y los tres primeros nombres seguidos de
  "y 20 más", y al desplegarlo lista a las 23 personas

#### Scenario: Pocos músicos invitados

- **WHEN** el disco tiene 4 músicos invitados
- **THEN** el nivel se muestra igualmente contraído, con "4" y los tres primeros nombres

#### Scenario: Solista con pocos créditos

- **WHEN** la única solista del álbum está acreditada solo con coros en la pista 6
- **THEN** el primer nivel es una línea "Artista principal" sin bloque destacado

### Requirement: Pestaña Ediciones

La pestaña Ediciones SHALL listar las ediciones conocidas del álbum en una tabla con año,
país, formato, sello y número de catálogo, cantidad de pistas y un enlace externo a la
edición en MusicBrainz, ordenadas por fecha. Por defecto SHALL mostrar solo las ediciones
oficiales, con un control para incluir las no oficiales (promo, bootleg), y SHALL ofrecer
filtro por formato. La edición representativa SHALL marcarse como la mostrada. Las
ediciones con pistas adicionales SHALL indicar "+N pistas" con un acceso a su sección en la
pestaña Canciones. Elegir o filtrar ediciones SHALL NOT cambiar la tracklist principal, y
ninguna edición SHALL tener página propia en la aplicación. Sin ediciones conocidas más
allá de la representativa, la pestaña no se muestra.

#### Scenario: Edición mostrada

- **WHEN** una persona abre la pestaña Ediciones
- **THEN** la fila de la edición representativa aparece marcada como la mostrada

#### Scenario: No oficiales ocultas

- **WHEN** el álbum tiene ediciones promo y bootleg
- **THEN** no aparecen hasta que la persona activa el control para incluir no oficiales

#### Scenario: Filtro por formato

- **WHEN** la persona filtra por vinilo
- **THEN** la tabla muestra solo ediciones cuyo formato es vinilo

#### Scenario: Acceso a pistas adicionales

- **WHEN** una edición lleva la marca "+9 pistas" y la persona la sigue
- **THEN** la página muestra la pestaña Canciones con la sección de esa variante visible

### Requirement: Filas de crédito compactas

Cada fila de la pestaña Créditos SHALL mostrar el nombre de la persona y, aparte, sus roles
y sus pistas en líneas separadas. Con más de 5 roles, la fila SHALL mostrar los 4 primeros
y una acción "+N" que despliega el resto; con 5 o menos SHALL mostrarlos todos, porque
esconder un solo rol no ahorra espacio. Cada número de pista SHALL enlazar a la página de
esa canción y exponer su título (texto de ayuda y nombre accesible). Un crédito de
instrumento sin instrumento especificado SHALL rotularse "varios instrumentos".
Tres o más pistas consecutivas del mismo disco SHALL mostrarse como un rango ("2–11") con
ambos extremos enlazados; dos pistas consecutivas SHALL seguir mostrándose separadas por
coma. Cuando la persona participa en todas las pistas de la edición menos una o dos, y la
edición tiene al menos 5 pistas, la fila SHALL mostrar "todas salvo" y las pistas
excluidas, también enlazadas, en lugar de la lista de pistas.

#### Scenario: Persona con muchos roles

- **WHEN** un músico está acreditado con 9 roles distintos
- **THEN** la fila muestra 4 roles y "+5", y al desplegar muestra los 9

#### Scenario: Un solo rol oculto

- **WHEN** una persona tiene 5 roles
- **THEN** la fila muestra los 5 y ningún "+N"

#### Scenario: Pista enlazada

- **WHEN** una persona participa en las pistas 2 y 3
- **THEN** "2" y "3" enlazan a las canciones de esas pistas y anuncian sus títulos

#### Scenario: Pistas consecutivas en rango

- **WHEN** en un disco de 14 pistas una persona participa en las pistas 2 a 6 y 9
- **THEN** la fila muestra "pistas 2–6, 9", con "2", "6" y "9" enlazados

#### Scenario: Todas salvo una

- **WHEN** en un disco de 11 pistas una persona participa en las pistas 2 a 11
- **THEN** la fila muestra "todas salvo la 1", con "1" enlazado a esa canción

#### Scenario: Disco corto

- **WHEN** en un EP de 4 pistas una persona participa en las pistas 1 a 3
- **THEN** la fila muestra "pistas 1–3" y no "todas salvo"

#### Scenario: Rango en varios discos

- **WHEN** en un álbum de dos discos una persona participa en las pistas 1 a 4 del disco 2
- **THEN** la fila muestra "pistas 2-1–2-4"

### Requirement: Presentación de los modificadores de rol

Los modificadores de MusicBrainz SHALL NOT mostrarse como roles propios. En instrumentos y
voces, "additional" y "guest" SHALL omitirse y "solo" SHALL mostrarse como matiz del
instrumento. En los demás tipos, un modificador SHALL combinarse con el tipo en una
etiqueta compuesta cuando existe ("coproducción", "producción ejecutiva", "producción
adicional") y, si no existe, mostrarse entre paréntesis. La familia `membranophone` SHALL
mostrarse como "percusión". Un rol repetido tras aplicar estas reglas SHALL mostrarse una
sola vez. Un valor sin traducción SHALL seguir mostrándose con el texto de MusicBrainz.

#### Scenario: Teclados adicionales

- **WHEN** una persona tiene los créditos `instrument ["additional","keyboard"]` e
  `instrument ["keyboard"]`
- **THEN** sus roles muestran "teclados" una sola vez y ningún "adicional"

#### Scenario: Coproductor

- **WHEN** una persona tiene el crédito `producer ["co"]`
- **THEN** su rol se muestra como "coproducción"

#### Scenario: Programación de percusión

- **WHEN** una persona tiene los créditos `instrument ["membranophone"]` y
  `programming ["membranophone"]`
- **THEN** sus roles se muestran como "percusión, programación (percusión)"

### Requirement: Valoración de pista en línea

Elegir Valorar en el menú de una pista SHALL abrir, bajo la fila, cinco estrellas
interactivas con medias estrellas que guardan al elegir un valor, sin botón "Guardar",
junto a una acción para quitar la valoración con confirmación. Si el guardado falla, SHALL
restaurarse el valor anterior y mostrarse un error. Cuando la grabación tiene un puntaje
detallado que deja de ser coherente con las nuevas estrellas, SHALL guardarse sin él y
avisarse de forma accesible. La valoración guardada SHALL reflejarse de inmediato en las
estrellas de solo lectura de la fila.

#### Scenario: Valorar una pista

- **WHEN** un usuario elige Valorar en la pista 3 y pulsa la cuarta estrella
- **THEN** se guarda 4 estrellas y la fila muestra 4 estrellas sin recargar la página

#### Scenario: Quitar la valoración

- **WHEN** un usuario confirma quitar la valoración de una pista
- **THEN** la valoración se borra y la fila deja de mostrar estrellas

### Requirement: Registro de escucha por pista con confirmación

Registrar escucha desde el menú de una pista SHALL registrar la escucha, marcar la pista
como escuchada y mostrar bajo la fila una confirmación visible ("Escucha registrada") con
una acción "Agregar detalles" que abre el formulario de esa entrada. El formulario SHALL
NOT abrirse sin que el usuario lo pida.

#### Scenario: Registrar sin detalles

- **WHEN** un usuario elige Registrar escucha en la pista 5
- **THEN** la pista 5 muestra la marca de escuchada y la confirmación con "Agregar
  detalles", sin formulario abierto

### Requirement: Cabecera de la pestaña Canciones sin duplicados

La pestaña Canciones SHALL NOT repetir de forma visible lo que ya muestran la barra de
pestañas y la ficha técnica: el título "Canciones" SHALL existir solo para lectores de
pantalla, y la línea de edición mostrada con acceso a Ediciones SHALL mostrarse solo en
viewport móvil, donde la ficha técnica está contraída.

#### Scenario: Escritorio

- **WHEN** una persona abre la pestaña Canciones en escritorio
- **THEN** la lista empieza directamente por la primera pista, sin título visible ni línea
  de edición, y la ficha técnica sigue mostrando la edición

#### Scenario: Móvil

- **WHEN** una persona abre la pestaña Canciones en móvil
- **THEN** sobre la lista se ve la edición mostrada con el acceso a Ediciones

### Requirement: Vista por canción en Créditos

La pestaña Créditos SHALL ofrecer dos vistas, **Por persona** (la de niveles) y **Por
canción**, elegibles con un control segmentado cuyo estado vive en la URL
(`?view=songs`), de modo que la vista se entregue renderizada desde el servidor y sea
enlazable. La vista Por canción SHALL listar las pistas en orden de disco y posición, con su
título enlazado a la canción y, bajo cada una, las personas agrupadas en Composición (los
autores de la obra de esa pista), Producción, Intérpretes, Sonido y Otros, en ese orden,
con sus roles en esa pista; una pista sin créditos SHALL
indicarlo. Los créditos de nivel edición SHALL mostrarse una vez, al principio, como
créditos de todo el álbum.

#### Scenario: Cambiar a la vista por canción

- **WHEN** una persona elige "Por canción" en la pestaña Créditos
- **THEN** la URL pasa a incluir `?view=songs` y cada pista muestra quién la produjo,
  quién tocó qué y el sonido

#### Scenario: Enlace directo

- **WHEN** alguien abre la URL de Créditos con `?view=songs`
- **THEN** la página se muestra directamente en la vista por canción

#### Scenario: Pista sin créditos

- **WHEN** una pista no tiene créditos de personal
- **THEN** la vista por canción la lista con la indicación de que no hay créditos registrados

#### Scenario: Autores de la pista

- **WHEN** la obra de la pista 1 tiene como autores a Jerrod Bettis, Meghan Kabir y Audra Mae
- **THEN** la pista 1 muestra primero el grupo Composición con esas tres personas

### Requirement: Composición en la vista por persona

La vista Por persona de la pestaña Créditos SHALL mostrar una sección **Composición**
después del primer nivel y antes de Músicos invitados, con cada autora o autor una vez, sus
roles de autoría (rotulados "composición" para `writer`, "música" para `composer`, "letra"
para `lyricist`, y el resto traducido o con el texto de MusicBrainz) y las pistas cuyas
obras firmó, con los mismos números enlazados que las demás filas. La sección SHALL seguir
la regla de contracción de los demás niveles (contraída por defecto, con cantidad y tres
nombres). Una persona de la sección Composición SHALL poder figurar además
en su nivel de personal. Sin autores, la sección SHALL NOT mostrarse.

#### Scenario: Disco pop con muchos autores

- **WHEN** las obras de un álbum suman 20 autores
- **THEN** la sección Composición aparece contraída con "20" y los tres primeros nombres

#### Scenario: Letra y música por separado

- **WHEN** una obra tiene una relación `composer` de una persona y `lyricist` de otra
- **THEN** la primera figura con "música" y la segunda con "letra"

#### Scenario: Sin autores cargados

- **WHEN** ninguna obra del álbum tiene autores en MusicBrainz
- **THEN** la vista Por persona no muestra la sección Composición

### Requirement: Orden de los roles de intérprete

Dentro de una fila de crédito, los roles de instrumento y voz SHALL ordenarse por peso:
primero la voz principal (y la voz sin especificar), luego los instrumentos, luego los
coros y demás voces de apoyo, y al final la percusión menor (percusión genérica, pandereta,
shakers, palmas, campana, congas, timbales, silbido). A igual peso SHALL conservarse el
orden de MusicBrainz. Los roles que no son de instrumento ni de voz SHALL conservar su
posición relativa (por ejemplo, la producción primero en Producción y sonido). El "+N"
SHALL esconder los roles del final de ese orden.

#### Scenario: Vocalista con coros

- **WHEN** una persona tiene `vocal ["background vocals"]`, `vocal ["lead vocals"]` e
  `instrument ["harmonica"]`
- **THEN** sus roles se muestran como "voz principal, armónica, coros"

#### Scenario: Baterista con percusión

- **WHEN** una persona tiene `instrument ["percussion"]`, `instrument ["drums"]` y
  `vocal ["background vocals"]`
- **THEN** sus roles se muestran como "batería, coros, percusión"

#### Scenario: Productor que toca

- **WHEN** en Producción y sonido una persona tiene `producer`, `instrument ["percussion"]`
  e `instrument ["piano"]`
- **THEN** sus roles se muestran como "producción, piano, percusión"

### Requirement: Traducciones de roles e instrumentos

Los tipos de rol y los atributos de instrumento y voz presentes en los créditos ingeridos
del catálogo SHALL tener traducción en todos los idiomas de la interfaz, con el mismo
conjunto de claves en cada uno. Un valor que llegue sin traducción SHALL seguir mostrándose
con el texto de MusicBrainz.

#### Scenario: Otras voces

- **WHEN** una persona tiene el crédito `vocal ["other vocals"]` y la interfaz está en español
- **THEN** su rol se muestra como "otras voces"

#### Scenario: Director de video

- **WHEN** una persona tiene el crédito `video director` y la interfaz está en español
- **THEN** su rol se muestra traducido, no como "video director"

#### Scenario: Claves iguales en ambos idiomas

- **WHEN** se agrega una traducción de rol o atributo en un idioma
- **THEN** una prueba falla si falta la misma clave en el otro

### Requirement: Niveles contraídos de la pestaña Créditos

En la vista Por persona, los niveles contraídos (Composición, Músicos invitados, Producción
y sonido, Arte y otros) SHALL presentarse como una lista compacta: una fila por nivel,
separadas por divisores finos, cada una con un indicador de despliegue visible, un estado
al pasar el puntero, y el nombre del nivel con un color distinto del resumen de cantidad y
nombres. Arte y otros SHALL usar el mismo formato de fila que los demás niveles. Al
desplegar un nivel, su lista de personas SHALL aparecer debajo de su fila, dentro de la
misma lista.

#### Scenario: Niveles contraídos agrupados

- **WHEN** un álbum tiene Composición, Músicos invitados y Producción y sonido
- **THEN** los tres aparecen como filas contiguas de una misma lista con divisores entre
  ellas, y no como encabezados sueltos separados por espacio

#### Scenario: Arte y otros con el mismo formato

- **WHEN** un álbum tiene créditos de diseño
- **THEN** Arte y otros aparece como una fila más de la lista, con su indicador de
  despliegue y la cantidad de créditos

