## MODIFIED Requirements

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las colecciones destacadas en **una sola sección**, con las filas **vigentes** de
`user_list_featured` (`starts_at` pasado y `expires_at` nulo o futuro) cuya lista sea pública, visible y de álbumes,
sin distinguir el origen: las curadas a mano (`source='curated'`, de listas oficiales no retiradas) y las generadas
por plantilla (`source='template'`) SHALL compartir la sección, el orden y el tope.

La sección SHALL ordenarse por `weight` descendente y, a igualdad, por `rank` ascendente, con un máximo de **6 tarjetas**, y
SHALL mostrarse siempre que exista al menos una colección vigente. Cada colección SHALL presentarse con su título, la
etiqueta de su familia, su conteo de ítems y sus carátulas disponibles, y SHALL enlazar a su página de detalle. La
sección SHALL ofrecer un enlace "Ver todas" a la página de colecciones, donde están las demás.

Desde un ancho de escritorio (`lg`) las colecciones SHALL formar un **mosaico** sin desplazamiento, la misma forma que en
Inicio: con 6, la primera como **destacada** (dos columnas y dos filas, hasta ocho carátulas y su descripción), cuatro
medianas (pila de fundas, sin descripción) y la sexta a lo ancho con su descripción y una tira de carátulas; con 5, la
destacada y cuatro medianas; con 4 o menos, una fila de medianas. Un mosaico no esconde tarjetas detrás de un
desplazamiento que nadie garantiza hacer, así que SHALL NOT llevar controles anterior y siguiente. Por debajo de `lg` las
mismas tarjetas SHALL formar una fila con desplazamiento horizontal por gesto táctil nativo, con `scroll-snap` y la
siguiente tarjeta asomando, sin controles. Cada tarjeta SHALL llevar la etiqueta de su familia como sello. La tarjeta SHALL
NOT indicar si la colección se armó a mano o por plantilla.

#### Scenario: Con colecciones sembradas

- **WHEN** existen filas curadas y filas generadas vigentes
- **THEN** `/explore` muestra una sola sección "Colecciones" con las dos clases mezcladas, ordenadas por peso y rank, sin
  rótulo que distinga su origen

#### Scenario: Colección vencida

- **WHEN** una fila de `user_list_featured` tiene `expires_at` en el pasado
- **THEN** su colección no aparece en la sección

#### Scenario: Tope de tarjetas

- **WHEN** hay más de 6 colecciones vigentes
- **THEN** la sección muestra solo las 6 primeras según el orden definido, y "Ver todas" lleva a las demás

#### Scenario: Sin curaduría publicada

- **WHEN** no hay ninguna colección curada vigente
- **THEN** la sección se muestra con normalidad solo con las generadas, sin un bloque vacío ni un mensaje aparte

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila vigente en `user_list_featured`
- **THEN** la sección no aparece en `/explore`

#### Scenario: Etiqueta de familia

- **WHEN** se muestra una colección generada por `grammy-winners`
- **THEN** su tarjeta lleva la etiqueta "Premios"

#### Scenario: Familia de una colección manual

- **WHEN** se muestra una colección curada a la que se asignó la familia `discovery`
- **THEN** su tarjeta lleva la etiqueta "Descubrimiento", igual que una generada de esa familia

#### Scenario: Controles de desplazamiento

- **WHEN** se abre `/explore` a 390 px con 6 colecciones vigentes
- **THEN** las tarjetas forman una fila que se desliza con el gesto táctil, con la siguiente tarjeta asomando, y no hay
  controles anterior y siguiente

#### Scenario: Todo cabe en pantalla

- **WHEN** se abre `/explore` en un ancho de escritorio
- **THEN** todas las colecciones de la sección se ven sin desplazar y no hay controles de desplazamiento

#### Scenario: Seis de un vistazo

- **WHEN** hay 10 colecciones vigentes y se abre `/explore` en un ancho de escritorio
- **THEN** se ven 6 tarjetas en mosaico: la primera destacada con su descripción y hasta ocho carátulas, cuatro medianas y la
  sexta a lo ancho; las otras 4 quedan en la página de colecciones

#### Scenario: Cinco colecciones

- **WHEN** hay exactamente 5 colecciones vigentes y se abre `/explore` en un ancho de escritorio
- **THEN** el mosaico muestra la destacada y cuatro medianas, sin hueco ni tarjeta a lo ancho

#### Scenario: Pocas colecciones

- **WHEN** hay 3 colecciones vigentes
- **THEN** en escritorio se muestran como una fila de tres tarjetas medianas, sin destacada

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). La sección de géneros (ancla
`generos`) SHALL mostrar las familias con álbumes en el orden de la taxonomía, en dos niveles: las **seis
primeras familias principales** con álbumes como tarjetas grandes y **todas las demás** —el resto de las
principales y, al final, las secundarias— en un **índice tipográfico**: una lista de enlaces de texto con el
nombre de cada familia, en columnas (dos en el teléfono, hasta cuatro en escritorio), sin carátulas, sin
desplegable y siempre visible. Una familia sin álbumes SHALL NOT aparecer en ningún nivel. Cada tarjeta grande
SHALL ser visual: un mosaico de hasta cuatro carátulas de discos de estudio de la familia con el nombre de la
familia encima. Una familia de las seis sin carátulas disponibles SHALL mostrarse como tarjeta plana con su
nombre. Ni las tarjetas ni el índice SHALL mostrar número de álbumes ni barra de tamaño: el conteo dice qué se
ha explorado, no cuánto pesa la familia. Con seis o menos familias con álbumes, el índice SHALL omitirse. Cada
familia, en los dos niveles, SHALL enlazar a `/{locale}/explore?familia=<clave>`. Las décadas se describen en
"Sección Explorar por década". Al elegir una década,
una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), con prioridad `decada` > `familia` > `genero`.
La década es un corte que se **refina**: el año (`?anio=`) y el género (`?genero=`) acotan el listado de la
década y no son cortes aparte, de modo que `?decada=1980&genero=hard-rock` lista los álbumes de hard rock (y
sus subgéneros) de los años 80. Fuera de la década, familia y género siguen siendo cortes que se aplican **de
uno en uno**, y una `familia` junto a una `decada` SHALL ignorarse. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista. El orden por defecto, llamado **"Destacados"**
(no "Mejor valorados"), SHALL ser, en este orden de prioridad: los lanzamientos con fecha posterior a
hoy al final; luego los discos **sin carátula confirmada** (comprobada y ausente, o retirada) después de
los demás —un disco cuya carátula aún no se comprobó no se mueve—; luego la valoración agregada del álbum cuando alcanza `MIN_RATINGS_PER_ALBUM`; luego
el premio (ganador antes que nominado); luego los discos de estudio antes que el resto de tipos;
luego los de carátula ya resuelta; luego `first_release_year` descendente, con desempate estable por
identificador. Cuando el listado ya está acotado a una década (o a un año), el año SHALL NOT desempatar:
el orden pasa de la carátula resuelta directamente al identificador, para que la grilla no se llene del
último año del período. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

#### Scenario: Listado por década

- **WHEN** una persona elige la década de 1990 en `/explore`
- **THEN** ve un listado paginado de álbumes cuyo `first_release_year` cae en 1990–1999,
  con orden determinista

#### Scenario: Discos sin carátula al final de "Destacados"

- **WHEN** el listado incluye un disco valorado cuya carátula se comprobó y no existe, y discos sin valorar con carátula
- **THEN** en el orden "Destacados" los discos con carátula (o aún sin comprobar) aparecen antes que el disco sin carátula

#### Scenario: Listado por género

- **WHEN** una persona elige un género en `/explore`
- **THEN** ve un listado paginado de álbumes etiquetados con ese género, con orden
  determinista

#### Scenario: Un corte a la vez

- **WHEN** la URL incluye tanto `decada` como `familia`
- **THEN** el sistema aplica la década y descarta la familia (la década es el corte prioritario) y
  compone el listado sin combinarlos

#### Scenario: Década con género

- **WHEN** la URL es `/explore?decada=1980&genero=hard-rock`
- **THEN** el listado trae los álbumes de los años 80 que tienen "hard rock" o alguno de sus subgéneros, con el mismo orden
  determinista y la paginación de siempre

#### Scenario: Década con año

- **WHEN** la URL es `/explore?decada=1990&anio=1994`
- **THEN** el sistema aplica el corte de la década de 1990 refinado al año 1994, sin tratarlo como un segundo corte

#### Scenario: Álbum sin año en el browse por década

- **WHEN** un álbum no tiene `first_release_year`
- **THEN** no aparece en ningún listado por década, pero sigue siendo alcanzable por
  género, novedades y búsqueda

#### Scenario: Listado por familia

- **WHEN** una persona elige la familia Latina en `/explore`
- **THEN** ve los álbumes con algún género efectivo de Latina, incluidos los de "latin pop" y
  "trap latino"

#### Scenario: Género con subgéneros

- **WHEN** una persona abre `/explore?genero=rock`
- **THEN** el listado incluye los álbumes de "rock" y los de sus subgéneros, como "shoegaze"

#### Scenario: Álbum con género heredado

- **WHEN** un álbum no tiene géneros propios y su artista principal tiene "shoegaze"
- **THEN** el álbum aparece en el listado de "shoegaze"

#### Scenario: Clave desconocida

- **WHEN** la URL es `/explore?familia=inexistente`
- **THEN** la vista muestra el estado vacío del listado

#### Scenario: Tarjeta de familia con carátulas

- **WHEN** una de las seis primeras familias principales tiene discos de estudio con carátula
- **THEN** su tarjeta grande muestra un mosaico de hasta cuatro de esas carátulas con el nombre de la familia, sin número de
  álbumes ni barra

#### Scenario: Familia sin carátulas

- **WHEN** una de las seis primeras familias principales tiene álbumes pero ninguno de estudio con carátula
- **THEN** su tarjeta grande se muestra plana con el nombre de la familia y sigue llevando a su listado

#### Scenario: Sin repetir discos entre familias

- **WHEN** dos de las seis familias en grande comparten discos entre sus mejores candidatos
- **THEN** cada disco aparece en la tarjeta de una sola familia, salvo el relleno de una familia que de otro modo quedaría con
  menos de dos carátulas

#### Scenario: Carátulas estables

- **WHEN** se abre `/explore` dos veces sin que cambien los datos
- **THEN** cada familia en grande muestra las mismas carátulas, elegidas por la señal de calidad y con desempate por id

#### Scenario: Seis familias en grande

- **WHEN** las 17 familias principales y las 3 secundarias tienen álbumes
- **THEN** la sección de géneros muestra en grande Rock, Metal, Punk y hardcore, Pop, Electrónica y Hip hop, en ese orden, y las
  otras 14 en el índice, con las 3 secundarias al final

#### Scenario: Índice sin cifras

- **WHEN** se abre la sección de géneros
- **THEN** cada entrada del índice es un enlace con solo el nombre de la familia hacia `/explore?familia=<clave>`, sin número de
  álbumes ni carátula, y el índice se ve sin pulsar nada, también sin JavaScript

#### Scenario: Familia principal sin álbumes

- **WHEN** la familia Punk y hardcore no tiene álbumes
- **THEN** no aparece, y la séptima familia principal con álbumes (R&B, soul y funk) ocupa la sexta tarjeta grande

#### Scenario: Pocas familias

- **WHEN** solo cuatro familias tienen álbumes
- **THEN** las cuatro se muestran en grande y no hay índice

#### Scenario: Estudio antes que sencillos en el orden por defecto

- **WHEN** se abre un listado sin elegir orden ni tipo y hay discos de estudio y sencillos sin valoraciones ni premios
- **THEN** los discos de estudio aparecen antes que los sencillos, las recopilaciones y los directos

#### Scenario: Lanzamientos futuros al final

- **WHEN** un disco tiene fecha de lanzamiento posterior a hoy
- **THEN** en el orden por defecto aparece después de los ya publicados, aunque su año sea el más reciente

#### Scenario: Valoración y premio mandan

- **WHEN** un disco alcanza `MIN_RATINGS_PER_ALBUM` valoraciones o ganó un premio
- **THEN** aparece antes que los discos sin valoración ni premio, y el de mayor promedio antes que el de menor

#### Scenario: El año no desempata dentro de una década

- **WHEN** se abre el listado de una década sin elegir orden y ninguno de sus discos tiene valoraciones ni premios
- **THEN** los discos de distintos años de la década aparecen mezclados en un orden estable, y la primera página no contiene
  solo discos del último año

### Requirement: Sección Popular ahora

La vista `/explore` SHALL mostrar la sección **Popular ahora** (ancla `popular`) con la popularidad reciente de la comunidad
(capacidad `popularity`) en tres pestañas: **Álbumes**, **Artistas** y **Canciones**. Álbumes SHALL mostrarse como un **top numerado**
de hasta `RAIL_SIZE` discos: cada disco con su posición en cifras grandes de contorno junto a la carátula (la n.º 1 en ámbar), todas las
carátulas del mismo tamaño, y debajo el título, el artista y la cifra; desde `md` en una rejilla de cuatro columnas (seis desde `lg`) que
se ve entera sin desplazar y, por debajo, en una fila con desplazamiento táctil. La posición SHALL ser la del orden de la lista (`ol`); la
cifra grande es decorativa. Artistas y Canciones SHALL mostrarse como un ranking de hasta 10: el n.º 1 como pieza grande y el resto numerado
en lista, el artista con su foto si la hay y la canción con la carátula de su disco y su artista. Cada ítem SHALL enlazar a su página. El subtítulo SHALL decir la ventana usada ("este mes", "en los
últimos 3 meses" o "de siempre"); con pestañas de ventanas distintas, el subtítulo SHALL ser el de la pestaña activa. Una pestaña sin
resultado SHALL NOT mostrarse y, sin ninguna, la sección SHALL omitirse. La primera pestaña con resultado SHALL estar activa al cargar,
cambiar de pestaña SHALL NOT pedir datos al servidor y, sin JavaScript, SHALL verse la pestaña de álbumes. Las pestañas SHALL ser
accesibles por teclado (`tablist`, flechas). La cifra "N personas" SHALL aparecer solo desde 5.

#### Scenario: Tres pestañas

- **WHEN** hay álbumes, artistas y canciones con actividad suficiente
- **THEN** la sección muestra las tres pestañas, con Álbumes activa

#### Scenario: Sin canciones populares

- **WHEN** no hay gestos sobre canciones
- **THEN** la pestaña Canciones no aparece y las otras dos sí

#### Scenario: Ventana honesta

- **WHEN** los álbumes populares se calcularon con todos los gestos por falta de actividad reciente
- **THEN** el subtítulo dice "de siempre", no "este mes"

#### Scenario: Cambio de pestaña

- **WHEN** una persona elige la pestaña Artistas
- **THEN** ve la lista numerada de artistas sin recargar la página

#### Scenario: Top de álbumes

- **WHEN** hay 12 álbumes populares y se abre `/explore` a 1440 px
- **THEN** la pestaña Álbumes muestra los 12 en dos filas de seis, cada uno con su posición en cifras grandes y la carátula del mismo
  tamaño que las demás, sin desplazamiento

#### Scenario: Top de álbumes en el teléfono

- **WHEN** se abre `/explore` a 390 px
- **THEN** el top de álbumes es una fila que se desliza con el gesto táctil, con el siguiente disco asomando y sin desbordar la página

### Requirement: Sección Explorar por década

La vista `/explore` SHALL mostrar la sección **Explorar por década** (ancla `decadas`) justo después de "Explorar por
género", con una entrada por década que tiene álbumes, de la más reciente a la más antigua, en dos formas según el ancho. Desde
`lg` SHALL ser una **línea de tiempo**: una fila con una marca por década sobre una línea, cada una con el año de la década en
cifras grandes ("1990s"), un mosaico de hasta cuatro carátulas de discos de estudio de la década y su nombre como texto del enlace.
Por debajo de `lg` SHALL ser un **índice tipográfico**: los nombres de las décadas como enlaces de texto grande en dos columnas,
sin carátulas. Ninguna forma SHALL mostrar número de álbumes ni barra de tamaño. El nombre de la década SHALL ser el de su idioma: en español "Años 80" (de 1920 a
1990; con cuatro cifras en las décadas anteriores a 1920 y desde 2000, "Años 1910", "Años 2000", "Años 2020", para que "Años 10" no se
lea como los 2010 y dos décadas no compartan nombre) y en inglés "1980s". Una década sin discos de estudio con carátula SHALL mostrarse en la línea de tiempo sin
mosaico, solo con su marca y su nombre. Las décadas desde 1950 SHALL tener su propia entrada; las anteriores a 1950 SHALL
agruparse al final en una entrada "Antes de 1950" con un enlace de texto por cada una, visibles sin desplegar nada y sin cifras. Cada entrada SHALL enlazar a `/{locale}/explore?decada=`.
Las carátulas SHALL elegirse por la señal de calidad de las colecciones (valoración de la comunidad, premio y calendario, con
desempate por id) entre los discos de estudio con carátula de la década, de forma estable entre visitas, y SHALL calcularse una
vez y reutilizarse unas horas. La sección SHALL omitirse si no hay ninguna década con álbumes.

#### Scenario: Tarjeta de década con carátulas

- **WHEN** la década de 1990 tiene discos de estudio con carátula
- **THEN** su entrada de la línea de tiempo muestra "1990s" en grande y un mosaico de hasta cuatro de esas carátulas, se nombra "Años 90"
  (en inglés, "1990s"), sin número de álbumes ni barra, y lleva a `/explore?decada=1990`

#### Scenario: Nombre de la década en español

- **WHEN** se muestran las décadas de 1890, 1900, 1910, 1920, 1990, 2000 y 2020 en español
- **THEN** se llaman "Años 1890", "Años 1900", "Años 1910", "Años 20", "Años 90", "Años 2000" y "Años 2020"

#### Scenario: Más reciente primero

- **WHEN** se abre `/explore`
- **THEN** la línea de tiempo (y el índice en el teléfono) va de los años 2020 hacia atrás, con "Antes de 1950" al final

#### Scenario: Décadas anteriores a 1950

- **WHEN** hay álbumes de los 1890s a los 1940s
- **THEN** esas décadas no tienen entrada propia, sino que la entrada "Antes de 1950" enlaza a cada una con su nombre, sin
  desplegar nada y sin cifras

#### Scenario: Década sin carátulas

- **WHEN** una década tiene álbumes pero ninguno de estudio con carátula
- **THEN** su entrada se muestra sin mosaico, con su marca y su nombre, y sigue llevando a su listado

#### Scenario: Década sin álbumes

- **WHEN** una década no tiene ningún álbum con año
- **THEN** no tiene entrada en la línea de tiempo ni en el índice

#### Scenario: Carátulas estables

- **WHEN** se abre `/explore` dos veces sin que cambien los datos
- **THEN** cada década muestra las mismas carátulas

#### Scenario: Índice de décadas en el teléfono

- **WHEN** se abre `/explore` a 390 px
- **THEN** las décadas se ven como un índice de nombres en dos columnas, sin carátulas, con "Antes de 1950" y sus enlaces al final,
  y no hay línea de tiempo
