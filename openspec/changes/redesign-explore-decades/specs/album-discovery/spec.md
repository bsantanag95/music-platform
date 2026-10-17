## MODIFIED Requirements

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). Las tarjetas de familia SHALL
mostrar, en el orden de la taxonomía, las familias principales que tienen álbumes, y las familias
secundarias con álbumes agrupadas detrás de "Más"; una familia sin álbumes SHALL NOT mostrar tarjeta.
Cada tarjeta SHALL ser visual: un mosaico de hasta cuatro carátulas de discos de estudio de la familia
con el nombre de la familia encima, y SHALL NOT mostrar número de álbumes ni barra de tamaño. Una
familia sin carátulas disponibles SHALL mostrarse como tarjeta plana con su nombre. Las tarjetas de
década se describen en "Sección Explorar por década". Al elegir una década,
una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), aplicando **un solo corte a la vez**
con prioridad `decada` > `familia` > `genero`; el año (`?anio=`) es un refinamiento de la década y no un
corte aparte. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista. El orden por defecto, llamado **"Destacados"**
(no "Mejor valorados"), SHALL ser, en este orden de prioridad: los lanzamientos con fecha posterior a
hoy al final; luego la valoración agregada del álbum cuando alcanza `MIN_RATINGS_PER_ALBUM`; luego
el premio (ganador antes que nominado); luego los discos de estudio antes que el resto de tipos;
luego los de carátula ya resuelta; luego `first_release_year` descendente, con desempate estable por
identificador. Cuando el listado ya está acotado a una década (o a un año), el año SHALL NOT desempatar:
el orden pasa de la carátula resuelta directamente al identificador, para que la grilla no se llene del
último año del período. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

#### Scenario: Listado por década

- **WHEN** una persona elige la década de 1990 en `/explore`
- **THEN** ve un listado paginado de álbumes cuyo `first_release_year` cae en 1990–1999,
  con orden determinista

#### Scenario: Listado por género

- **WHEN** una persona elige un género en `/explore`
- **THEN** ve un listado paginado de álbumes etiquetados con ese género, con orden
  determinista

#### Scenario: Un corte a la vez

- **WHEN** la URL incluye tanto `decada` como `genero`
- **THEN** el sistema aplica solo uno de los dos (el documentado como prioritario) y
  compone el listado sin combinarlos

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

- **WHEN** una familia tiene discos de estudio con carátula
- **THEN** su tarjeta muestra un mosaico de hasta cuatro de esas carátulas con el nombre de la familia, sin número de
  álbumes ni barra

#### Scenario: Familia sin carátulas

- **WHEN** una familia tiene álbumes pero ninguno de estudio con carátula
- **THEN** su tarjeta se muestra plana con el nombre de la familia y sigue llevando a su listado

#### Scenario: Sin repetir discos entre familias

- **WHEN** dos familias comparten discos entre sus mejores candidatos
- **THEN** cada disco aparece en la tarjeta de una sola familia, salvo el relleno de una familia que de otro modo quedaría con
  menos de dos carátulas

#### Scenario: Carátulas estables

- **WHEN** se abre `/explore` dos veces sin que cambien los datos
- **THEN** cada familia muestra las mismas carátulas, elegidas por la señal de calidad y con desempate por id

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

### Requirement: Navegación rápida de Explorar

La vista `/explore` SHALL mostrar, bajo el título, una fila de enlaces ("En esta página") con un enlace por cada
sección que se renderiza, en el mismo orden de la página, cada uno hacia el ancla de su sección: `colecciones`,
`popular`, `generos`, `decadas`, `novedades`, `proximos`, `premios` y `mejor-valorados`. La fila SHALL NOT
enlazar a una sección omitida y SHALL omitirse por completo cuando se rendericen menos de 4 secciones. La fila SHALL
funcionar sin JavaScript y SHALL NOT ser fija ni resaltar la sección activa. Las etiquetas SHALL ser cortas y estar en
el locale activo.

#### Scenario: Fila con todas las secciones

- **WHEN** `/es/explore` renderiza las 8 secciones
- **THEN** la fila muestra "Colecciones, Popular, Géneros, Décadas, Novedades, Próximos, Premios, Mejor valorados",
  cada una enlazada a su ancla

#### Scenario: Sección omitida

- **WHEN** Novedades y Próximos lanzamientos no tienen contenido
- **THEN** la fila no los incluye y ninguno de sus enlaces apunta a un ancla inexistente

#### Scenario: Pocas secciones

- **WHEN** `/explore` renderiza solo 3 secciones
- **THEN** la fila de navegación rápida no aparece

#### Scenario: Salto a una sección

- **WHEN** una persona activa "Premios" en la fila
- **THEN** la página se desplaza a la sección Premios sin que el encabezado global tape su título

## ADDED Requirements

### Requirement: Sección Explorar por década

La vista `/explore` SHALL mostrar la sección **Explorar por década** (ancla `decadas`) justo después de "Explorar por
género", con una tarjeta por década que tiene álbumes, de la más reciente a la más antigua. Cada tarjeta SHALL ser visual: un
mosaico de hasta cuatro carátulas de discos de estudio de la década con el nombre de la década encima ("1990s"), y SHALL NOT
mostrar número de álbumes ni barra de tamaño. Una década sin discos de estudio con carátula SHALL mostrarse como tarjeta plana
con su nombre. Las décadas desde 1950 SHALL ser tarjetas de la grilla; las anteriores a 1950 SHALL agruparse detrás de una
tarjeta "Décadas anteriores" que las despliega y pliega, sin cifras. Cada tarjeta SHALL enlazar a `/{locale}/explore?decada=`.
Las carátulas SHALL elegirse por la señal de calidad de las colecciones (valoración de la comunidad, premio y calendario, con
desempate por id) entre los discos de estudio con carátula de la década, de forma estable entre visitas, y SHALL calcularse una
vez y reutilizarse unas horas. La sección SHALL omitirse si no hay ninguna década con álbumes.

#### Scenario: Tarjeta de década con carátulas

- **WHEN** la década de 1990 tiene discos de estudio con carátula
- **THEN** su tarjeta muestra un mosaico de hasta cuatro de esas carátulas con "1990s" encima, sin número de álbumes ni barra,
  y lleva a `/explore?decada=1990`

#### Scenario: Más reciente primero

- **WHEN** se abre `/explore`
- **THEN** las tarjetas de década van de los 2020s hacia atrás, con "Décadas anteriores" al final de la grilla

#### Scenario: Décadas anteriores a 1950

- **WHEN** hay álbumes de los 1890s a los 1940s
- **THEN** no hay tarjetas de esas décadas en la grilla, sino una tarjeta "Décadas anteriores" que las despliega, y ninguna
  muestra cifras

#### Scenario: Década sin carátulas

- **WHEN** una década tiene álbumes pero ninguno de estudio con carátula
- **THEN** su tarjeta se muestra plana con el nombre de la década y sigue llevando a su listado

#### Scenario: Década sin álbumes

- **WHEN** una década no tiene ningún álbum con año
- **THEN** no tiene tarjeta

#### Scenario: Carátulas estables

- **WHEN** se abre `/explore` dos veces sin que cambien los datos
- **THEN** cada década muestra las mismas carátulas

### Requirement: Vista de década

El listado de una década (`/{locale}/explore?decada=<año>`) SHALL mostrar, en este orden, el título de la década sin rótulo de
tipo de corte encima, una fila de **años** de la década, una fila de **géneros de la década**, un selector de **otras décadas**
plegado y los filtros de tipo y orden sobre la rejilla. La fila de años SHALL ofrecer un chip por cada año de la década que tiene
álbumes, en orden cronológico, y un primer chip "Toda la década"; elegir un año SHALL filtrar el listado con `?anio=<año>`
(título "Álbumes de <año>"), conservando tipo y orden, y volver a "Toda la década" SHALL quitarlo. Un `anio` que no sea un año
de la década SHALL ignorarse. La fila de géneros SHALL ofrecer hasta 12 chips con los géneros de estilo con más álbumes de esa
década (por género efectivo, con herencia), con como mucho 3 de una misma familia de géneros para que una familia no ocupe la
fila, cada uno enlazado a la página del género filtrada por la década
(`/{locale}/genre/<slug>?tab=albums&decada=<año>`), con el nombre en el idioma activo y sin ninguna cifra; SHALL omitirse si la
década no tiene géneros. El selector de otras décadas SHALL ser un desplegable cerrado por defecto que lista las demás décadas
con álbumes y marca la actual; elegir una década SHALL conservar tipo y orden y quitar el año.

#### Scenario: Años de la década

- **WHEN** una persona abre `/es/explore?decada=1990`
- **THEN** ve los chips "Toda la década", "1990", "1991", … "1999" (solo los años con álbumes), con "Toda la década" marcado

#### Scenario: Elegir un año

- **WHEN** elige el chip "1994"
- **THEN** llega a `/explore?decada=1990&anio=1994`, el título dice "Álbumes de 1994", el listado trae solo discos de 1994 y el
  chip "1994" queda marcado

#### Scenario: Volver a toda la década

- **WHEN** estando en `?decada=1990&anio=1994` elige "Toda la década"
- **THEN** llega a `/explore?decada=1990` con los discos de los diez años

#### Scenario: Año que no es de la década

- **WHEN** la URL es `/explore?decada=1990&anio=1985` o `?decada=1990&anio=abc`
- **THEN** el listado muestra la década completa, como si no llevara `anio`

#### Scenario: Géneros de la década

- **WHEN** una persona abre `/es/explore?decada=1990`
- **THEN** ve una fila de géneros de esa década (por ejemplo "grunge" y "hip hop"), sin números, y cada uno lleva a la página
  del género filtrada por los 1990s

#### Scenario: Una familia no ocupa la fila

- **WHEN** una década tiene más de tres géneros de una misma familia entre los más grandes (por ejemplo, óperas, sinfonías y
  música barroca además de otros géneros clásicos)
- **THEN** la fila muestra solo los tres más grandes de esa familia y completa con géneros de otras familias

#### Scenario: Género con la década aplicada

- **WHEN** elige un género de la fila
- **THEN** llega a `/genre/<slug>?tab=albums&decada=1990`, con la pestaña de álbumes ya filtrada por esa década

#### Scenario: Selector de décadas plegado

- **WHEN** la vista de década se abre por primera vez
- **THEN** el selector de otras décadas está cerrado y el primer disco queda a la vista sin una fila de décadas antes

#### Scenario: Cambio de década

- **WHEN** estando en `?decada=1990&anio=1994&tipo=studio` abre el selector y elige los 2000s
- **THEN** llega a `/explore?decada=2000&tipo=studio`, conservando el tipo y quitando el año

#### Scenario: Década con pocos años

- **WHEN** la década de 1910 solo tiene álbumes en dos años
- **THEN** la fila de años muestra "Toda la década" y esos dos años
