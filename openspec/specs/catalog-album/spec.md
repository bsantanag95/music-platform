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
tracks, sus créditos y el artista principal asociado al `release_group` cuando exista, y
SHALL reutilizarlo desde el Server Component y el endpoint REST sin duplicar la lógica de
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
- **THEN** el read-model devuelve el detalle sin artista principal y la página puede
  renderizar el álbum sin un enlace de artista roto

#### Scenario: Álbum sin fecha canónica conocida

- **WHEN** MusicBrainz no aporta `first-release-date` para el `release_group`, ni siquiera
  con precisión anual
- **THEN** `firstReleaseDate` y `firstReleaseYear` son `null` y la vista omite la fecha
  sin romper el layout

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
sin rol `featured` no SHALL convertirse en enlaces de colaboración.

#### Scenario: Track con colaboración

- **WHEN** un track contiene un crédito con rol `featured`
- **THEN** la vista muestra la colaboración correspondiente y el nombre de cada artista enlaza a
  su perfil con el locale activo

#### Scenario: Track sin colaboración destacada

- **WHEN** un track no contiene créditos destacados
- **THEN** la vista no muestra una etiqueta de colaboración adicional

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

El detalle de álbum SHALL reservar un área localizada para reseñas, rating y comentarios,
mostrando lectura pública y controles de escritura únicamente a usuarios autenticados. Las
reseñas de la comunidad SHALL presentarse con su autor, las estrellas vigentes de ese
autor, un título opcional como metadato secundario (junto al autor y las estrellas, no
como encabezado; omitido cuando no existe) y el cuerpo, y SHALL diferenciarse visual y
estructuralmente de los comentarios: la reseña lleva rating y es la postura crítica del
autor sobre la obra, el comentario es una nota conversacional corta. El editor de reseña
propia SHALL pedir el cuerpo, un título opcional y —solo cuando el usuario aún no valoró
el álbum— las estrellas, en el mismo formulario.

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
- **THEN** la vista los presenta en secciones diferenciadas: las reseñas con autor,
  estrellas y —cuando existe— título en la línea de metadato; los comentarios como notas
  cortas sin título ni rating

#### Scenario: Reseña sin título en la vista

- **WHEN** una reseña de la comunidad no tiene título
- **THEN** la vista la muestra con el autor, las estrellas y el cuerpo, sin dejar un hueco
  ni un separador donde iría el título

### Requirement: Tipo de obra visible en el detalle de álbum

La vista de álbum SHALL mostrar una etiqueta de tipo de obra localizada, tomada del
namespace `album` de los catálogos de mensajes, cuando la `category` del `release_group`
es `compilation`, `live_other` o `single_ep`. Para `category` `studio` la vista SHALL NOT
mostrar ninguna etiqueta de tipo adicional. La etiqueta SHALL ser texto de interfaz: no
altera el título del álbum ni ningún dato musical.

#### Scenario: Recopilación

- **WHEN** una persona abre un álbum cuya `category` es `compilation`
- **THEN** la vista muestra la etiqueta localizada de recopilación junto al título, sin
  modificar el título

#### Scenario: Álbum de estudio

- **WHEN** una persona abre un álbum cuya `category` es `studio`
- **THEN** la vista no muestra ninguna etiqueta de tipo de obra

#### Scenario: Cambio de locale

- **WHEN** una persona abre el mismo álbum en dos locales soportados
- **THEN** la etiqueta de tipo de obra cambia de idioma y los datos musicales permanecen
  iguales

