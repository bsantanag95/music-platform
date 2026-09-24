## MODIFIED Requirements

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

## ADDED Requirements

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
mostrarse bajo el título.

#### Scenario: Título largo

- **WHEN** una pista se titula "The Great Gig in the Sky (Instrumental Version With Vocal
  Improvisation, 2011 Remaster)"
- **THEN** la fila muestra el título completo en varias líneas y la duración queda alineada
  con la de las demás filas

### Requirement: Subtotales por disco y total del álbum

La tracklist SHALL mostrar en la cabecera de cada disco (cuando hay más de uno) la
cantidad de pistas y la duración del disco, y al pie la cantidad total de pistas y la
duración total. Cuando al menos una pista del conjunto no tiene duración conocida, la
duración SHALL mostrarse precedida de "≥" y SHALL NOT presentarse como exacta.

#### Scenario: Todas las duraciones conocidas

- **WHEN** todas las pistas de un disco tienen duración
- **THEN** el subtotal muestra la suma exacta en formato `mm:ss` o `h:mm:ss`

#### Scenario: Duración faltante

- **WHEN** una pista del álbum tiene `durationSec` nulo
- **THEN** el total del álbum se muestra como "≥ " seguido de la suma de las duraciones
  conocidas

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
máximo de 3 pistas por álbum, y solo las pistas con al menos 5 reacciones fuertes. La
tracklist SHALL NOT mostrar una media de estrellas por pista.

#### Scenario: Pistas destacadas

- **WHEN** dos pistas de un álbum superan el umbral de reacciones fuertes
- **THEN** ambas muestran la marca de favorita de la comunidad y las demás no

#### Scenario: Catálogo sin reacciones suficientes

- **WHEN** ninguna pista alcanza 5 reacciones fuertes públicas
- **THEN** ninguna pista muestra la marca

#### Scenario: Consulta agrupada

- **WHEN** se arma la tracklist de un álbum de 20 pistas
- **THEN** las reacciones se obtienen con una única consulta agrupada por grabación, no
  con una consulta por pista

### Requirement: Estado personal por pista

Para un usuario autenticado, cada fila de la tracklist SHALL mostrar de forma siempre
visible (sin depender de pasar el cursor) una marca cuando el usuario tiene al menos una
entrada de diario sobre esa grabación. Para visitantes anónimos la marca SHALL NOT
mostrarse.

#### Scenario: Pista escuchada

- **WHEN** un usuario autenticado registró una escucha de la pista 2
- **THEN** la fila de la pista 2 muestra la marca "La escuchaste" en escritorio y en móvil

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ninguna fila muestra marcas personales

### Requirement: Menú de acciones por pista

Cada fila SHALL ofrecer un menú `···` con, en este orden y agrupado: Registrar escucha y
Reaccionar; Valorar, Favorito, Añadir a lista y Ver en listas; Ir a la canción. Las
acciones que requieren sesión SHALL pedir iniciar sesión a un visitante anónimo sin
crear datos.

#### Scenario: Orden del menú

- **WHEN** un usuario abre el menú de una pista
- **THEN** las acciones de consumo (Registrar escucha, Reaccionar) aparecen primero

#### Scenario: Acción sin sesión

- **WHEN** un visitante anónimo elige Registrar escucha en el menú
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

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
personal de nivel edición o grabación), agrupadas en cuatro niveles y en este orden:
**Integrantes de la banda** (acreditadas y miembros del artista principal según el
catálogo), en un bloque destacado; **Músicos invitados** (intérpretes acreditados que no son
miembros); **Producción y sonido**; y **Arte y otros**, contraído por defecto con la
cantidad de créditos. Cada persona SHALL aparecer una sola vez, en el nivel más alto que le
corresponde, con todos sus roles y las pistas en que participa ("todas" cuando participa en
todas). La pestaña SHALL NOT mostrar integrantes calculados por fechas de pertenencia ni
personas sin crédito en el disco, y SHALL NOT mostrar un distintivo de fundador. Un tipo de
crédito sin nivel asignado SHALL mostrarse en Arte y otros. Sin créditos de personal, la
pestaña no se muestra.

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
