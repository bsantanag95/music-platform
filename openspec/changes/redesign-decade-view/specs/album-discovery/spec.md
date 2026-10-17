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
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), con prioridad `decada` > `familia` > `genero`.
La década es un corte que se **refina**: el año (`?anio=`) y el género (`?genero=`) acotan el listado de la
década y no son cortes aparte, de modo que `?decada=1980&genero=hard-rock` lista los álbumes de hard rock (y
sus subgéneros) de los años 80. Fuera de la década, familia y género siguen siendo cortes que se aplican **de
uno en uno**, y una `familia` junto a una `decada` SHALL ignorarse. El listado por familia SHALL incluir los álbumes con
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

### Requirement: Sección Explorar por década

La vista `/explore` SHALL mostrar la sección **Explorar por década** (ancla `decadas`) justo después de "Explorar por
género", con una tarjeta por década que tiene álbumes, de la más reciente a la más antigua. Cada tarjeta SHALL ser visual: un
mosaico de hasta cuatro carátulas de discos de estudio de la década con el nombre de la década encima, y SHALL NOT
mostrar número de álbumes ni barra de tamaño. El nombre de la década SHALL ser el de su idioma: en español "Años 80" (de 1910 a
1990; con cuatro cifras en las décadas anteriores a 1910 y desde 2000, "Años 1900", "Años 2000", "Años 2020", para que dos
décadas no compartan nombre) y en inglés "1980s". Una década sin discos de estudio con carátula SHALL mostrarse como tarjeta plana
con su nombre. Las décadas desde 1950 SHALL ser tarjetas de la grilla; las anteriores a 1950 SHALL agruparse detrás de una
tarjeta "Décadas anteriores" que las despliega y pliega, sin cifras. Cada tarjeta SHALL enlazar a `/{locale}/explore?decada=`.
Las carátulas SHALL elegirse por la señal de calidad de las colecciones (valoración de la comunidad, premio y calendario, con
desempate por id) entre los discos de estudio con carátula de la década, de forma estable entre visitas, y SHALL calcularse una
vez y reutilizarse unas horas. La sección SHALL omitirse si no hay ninguna década con álbumes.

#### Scenario: Tarjeta de década con carátulas

- **WHEN** la década de 1990 tiene discos de estudio con carátula
- **THEN** su tarjeta muestra un mosaico de hasta cuatro de esas carátulas con "Años 90" encima (en inglés, "1990s"), sin número de
  álbumes ni barra, y lleva a `/explore?decada=1990`

#### Scenario: Nombre de la década en español

- **WHEN** se muestran las décadas de 1890, 1900, 1910, 1990, 2000 y 2020 en español
- **THEN** se llaman "Años 1890", "Años 1900", "Años 10", "Años 90", "Años 2000" y "Años 2020"

#### Scenario: Más reciente primero

- **WHEN** se abre `/explore`
- **THEN** las tarjetas de década van de los años 2020 hacia atrás, con "Décadas anteriores" al final de la grilla

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

El listado de una década (`/{locale}/explore?decada=<año>`) SHALL mostrar, en este orden: la miga de pan, la **cabecera de la
década** (requisito aparte), una fila **Año**, una fila **Género** y los filtros de tipo y orden sobre la rejilla. Cada fila SHALL
llevar un rótulo visible ("Año", "Género") que dice qué filtra, y todos sus chips SHALL filtrar esta misma lista sin salir de
Explorar. Los parámetros `anio`, `genero`, `tipo` y `orden` SHALL combinarse: elegir uno conserva los demás, salvo cambiar de
década, que conserva `genero`, `tipo` y `orden` y quita `anio`.

La fila **Año** SHALL ofrecer un primer chip "Toda la década" y un chip por cada año de la década con al menos un álbum ya
publicado (fecha de lanzamiento no posterior a hoy o, sin fecha, un año no posterior al actual), en orden cronológico; un año con
solo lanzamientos por salir SHALL NOT tener chip, aunque `?anio=` con ese año siga funcionando. Elegir un año SHALL filtrar con
`?anio=<año>` (título "Álbumes de <año>") y "Toda la década" SHALL quitarlo. Un `anio` que no sea un año de la década SHALL
ignorarse. Al final de la misma fila SHALL ir un menú **Otras décadas**, cerrado por defecto, que lista las demás décadas con álbumes
(nombradas como en "Sección Explorar por década") y marca la actual; en pantallas angostas el menú ocupa su propia línea bajo la fila.

La fila **Género** SHALL ofrecer un primer chip "Todos" y hasta 12 chips con los géneros de estilo con más álbumes de esa década (por
género efectivo, con herencia), con como mucho 3 de una misma familia para que una familia no ocupe la fila. Los chips SHALL mostrarse
ordenados por familia, en el orden de la taxonomía, y por tamaño dentro de cada familia (un género sin familia, al final), con el
nombre en el idioma activo y sin ninguna cifra. Elegir un género SHALL filtrar con `?genero=<slug>` los álbumes de la década con ese
género o un subgénero; "Todos" SHALL quitarlo. Si el género de la URL no está entre los 12, SHALL agregarse como chip marcado. La
fila SHALL omitirse si la década no tiene géneros y, en pantallas angostas, SHALL ser una sola línea desplazable. Con un género
elegido, bajo el título SHALL haber un enlace "Ir a la página de <género>" a `/{locale}/genre/<slug>?tab=albums&decada=<año>`.

Los títulos SHALL ser "Álbumes de los <década>" (en inglés "Albums from the <década>"), "Álbumes de <año>", "Álbumes de <género> de
los <década>" y "Álbumes de <género> de <año>", y la miga de pan SHALL tener un nivel por cada refinamiento (Explorar / década /
año / género), con el último sin enlace. En los chips de tipo, los que no tengan ningún álbum en el corte actual (década, año y
género) SHALL mostrarse deshabilitados, sin enlace; "Todos" y el tipo elegido SHALL permanecer activos. Si el listado queda vacío con
un género elegido, el estado vacío SHALL ofrecer "Quitar filtros" hacia la década sin refinamientos.

#### Scenario: Años de la década

- **WHEN** una persona abre `/es/explore?decada=1990`
- **THEN** ve una fila con el rótulo "Año" ("Toda la década", "1990" … "1999", marcado el primero) y otra con el rótulo "Género"
  ("Todos" y los géneros de la década), y el primer disco aparece sin otras filas de navegación en medio

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

#### Scenario: Año con solo lanzamientos por salir

- **WHEN** en la década de 2020 el año 2027 solo tiene discos con fecha posterior a hoy
- **THEN** no hay chip "2027", y `/explore?decada=2020&anio=2027` sigue mostrando esos discos

#### Scenario: Géneros de la década

- **WHEN** una persona abre `/es/explore?decada=1990`
- **THEN** la fila "Género" muestra "Todos" y los géneros de esa década (por ejemplo "grunge" y "hip hop"), sin números, y elegir uno
  filtra esta misma lista sin salir de Explorar

#### Scenario: Géneros ordenados por familia

- **WHEN** una década tiene entre sus géneros más grandes ópera, sinfonía, pop, rock y jazz
- **THEN** la fila muestra primero los de Rock, luego Pop, luego Jazz y, al final, los de Clásica, y dentro de cada familia el más
  grande antes

#### Scenario: Una familia no ocupa la fila

- **WHEN** una década tiene más de tres géneros de una misma familia entre los más grandes (por ejemplo, óperas, sinfonías y
  música barroca además de otros géneros clásicos)
- **THEN** la fila muestra solo los tres más grandes de esa familia y completa con géneros de otras familias

#### Scenario: Elegir un género

- **WHEN** estando en `?decada=1980` elige el chip "hard rock"
- **THEN** llega a `/explore?decada=1980&genero=hard-rock`, el título dice "Álbumes de hard rock de los años 80", el listado trae solo
  discos de esa década con ese género o sus subgéneros, y el chip queda marcado

#### Scenario: Género y año a la vez

- **WHEN** estando en `?decada=1980&genero=hard-rock` elige el año 1985
- **THEN** llega a `/explore?decada=1980&anio=1985&genero=hard-rock`, el título dice "Álbumes de hard rock de 1985" y la miga muestra
  Explorar / Años 80 / 1985 / hard rock

#### Scenario: Quitar el género

- **WHEN** estando en `?decada=1980&anio=1985&genero=hard-rock` elige "Todos" en la fila Género
- **THEN** llega a `/explore?decada=1980&anio=1985`, conservando el año

#### Scenario: Género fuera de los 12

- **WHEN** la URL es `/explore?decada=1980&genero=shoegaze` y "shoegaze" no está entre los 12 géneros de la fila
- **THEN** la fila muestra además un chip "shoegaze" marcado, y el listado trae los discos de esa década con ese género

#### Scenario: Género con la década aplicada

- **WHEN** hay un género elegido en `?decada=1980&genero=hard-rock`
- **THEN** bajo el título hay un enlace "Ir a la página de hard rock" a `/genre/hard-rock?tab=albums&decada=1980`

#### Scenario: Género sin discos en la década

- **WHEN** la URL es `/explore?decada=1910&genero=hard-rock` y no hay discos de hard rock de esa década
- **THEN** el listado muestra el estado vacío con "Quitar filtros" hacia `/explore?decada=1910`

#### Scenario: Selector de décadas plegado

- **WHEN** una persona abre el menú "Otras décadas" al final de la fila Año
- **THEN** ve las demás décadas con álbumes con su nombre ("Años 70", "Años 90", …), con la actual marcada, y el menú estaba cerrado
  por defecto

#### Scenario: Cambio de década

- **WHEN** estando en `?decada=1990&anio=1994&genero=pop&tipo=studio` elige los años 2000 en "Otras décadas"
- **THEN** llega a `/explore?decada=2000&genero=pop&tipo=studio`, conservando el género y el tipo y quitando el año

#### Scenario: Tipos sin discos

- **WHEN** la década de 1910 solo tiene dos sencillos
- **THEN** los chips "De estudio", "Compilaciones" y "Directos y otros" aparecen deshabilitados, sin enlace, y "Todos" y "Singles y EPs"
  siguen activos

#### Scenario: Década con pocos años

- **WHEN** la década de 1910 solo tiene álbumes en dos años
- **THEN** la fila de años muestra "Toda la década" y esos dos años

## ADDED Requirements

### Requirement: Cabecera de la vista de década

La vista de década SHALL abrir con una cabecera que dice qué se está viendo: el título, una línea de contexto bajo él y, a la derecha
en pantallas anchas, un mosaico 2×2 con las mismas carátulas de la tarjeta de esa década en `/explore` (misma selección, sin consulta
propia). Con el orden "Destacados", la línea SHALL decir que se ordena por premios y valoraciones y que, mientras haya pocas
valoraciones, el orden es estable pero no un ranking; con cualquier otro orden SHALL omitirse, porque ya no describiría lo que se
ve. El mosaico SHALL ser decorativo (sin texto alternativo), SHALL omitirse en pantallas angostas y cuando la década no tiene
carátulas, y SHALL NOT mostrar cifras.

#### Scenario: Cabecera con contexto

- **WHEN** una persona abre `/es/explore?decada=1980` con el orden por defecto
- **THEN** bajo el título "Álbumes de los años 80" lee que se ordena por premios y valoraciones y que, con pocas valoraciones,
  el orden es estable pero no un ranking

#### Scenario: Mosaico de la época

- **WHEN** la década de 1980 tiene discos de estudio con carátula
- **THEN** la cabecera muestra a la derecha el mismo mosaico de cuatro carátulas que su tarjeta de la portada, sin texto alternativo ni
  cifras

#### Scenario: Otro orden

- **WHEN** elige el orden "Más recientes"
- **THEN** la línea de contexto sobre el orden desaparece

#### Scenario: Década sin carátulas o pantalla angosta

- **WHEN** la década no tiene discos de estudio con carátula, o la pantalla es angosta
- **THEN** la cabecera no muestra el mosaico y el título y el contexto ocupan todo el ancho
