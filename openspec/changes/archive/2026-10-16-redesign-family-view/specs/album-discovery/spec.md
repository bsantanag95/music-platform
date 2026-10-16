## MODIFIED Requirements

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). Las tarjetas de familia SHALL
mostrar, en el orden de la taxonomía, las familias principales que tienen álbumes, y las familias
secundarias con álbumes agrupadas detrás de "Más"; una familia sin álbumes SHALL NOT mostrar tarjeta.
Cada tarjeta SHALL ser visual: un mosaico de hasta cuatro carátulas de discos de estudio de la familia
con el nombre de la familia encima, y SHALL NOT mostrar número de álbumes ni barra de tamaño. Una
familia sin carátulas disponibles SHALL mostrarse como tarjeta plana con su nombre. Al elegir una década,
una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), aplicando **un solo corte a la vez**
con prioridad `decada` > `familia` > `genero`. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista. El orden por defecto, llamado **"Destacados"**
(no "Mejor valorados"), SHALL ser, en este orden de prioridad: los lanzamientos con fecha posterior a
hoy al final; luego la valoración agregada del álbum cuando alcanza `MIN_RATINGS_PER_ALBUM`; luego
el premio (ganador antes que nominado); luego los discos de estudio antes que el resto de tipos;
luego los de carátula ya resuelta; luego `first_release_year` descendente, con desempate estable por
identificador. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

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

## ADDED Requirements

### Requirement: Vista de familia de géneros

El listado de una familia (`/{locale}/explore?familia=<clave>`) SHALL mostrar, en este orden, el título de la familia sin rótulo
de tipo de corte encima, una fila de **géneros de la familia**, un selector de **otras familias** plegado y los filtros de tipo y orden
sobre la rejilla. La fila de géneros SHALL ofrecer hasta 12 chips con los géneros de estilo más grandes de la familia (por número de
álbumes con ese género efectivo), cada uno enlazado a la página del género (`/{locale}/genre/<slug>`), con el nombre en el idioma activo
y sin mostrar ninguna cifra. El selector de otras familias SHALL ser un desplegable cerrado por defecto que lista las demás familias con
álbumes y marca la actual. Ningún listado de década, familia, género, novedades o próximos SHALL mostrar un rótulo de tipo de corte sobre
su título.

#### Scenario: Géneros de la familia

- **WHEN** una persona abre `/es/explore?familia=rock`
- **THEN** ve una fila de géneros de Rock (por ejemplo "hard rock" y "psychedelic rock"), cada uno enlazado a su página, sin números

#### Scenario: Página completa del género

- **WHEN** elige un género de la fila
- **THEN** llega a la página del género con su descripción, subgéneros, artistas y listas

#### Scenario: Selector de familias plegado

- **WHEN** la vista de familia se abre por primera vez
- **THEN** el selector de otras familias está cerrado y el primer disco queda a la vista sin una fila de veinte chips antes

#### Scenario: Cambio de familia

- **WHEN** abre el selector y elige Jazz
- **THEN** llega a `/explore?familia=jazz` conservando el tipo y el orden elegidos

#### Scenario: Sin rótulo sobre el título

- **WHEN** se abre un listado de década, familia, género, novedades o próximos
- **THEN** el título va directamente bajo la miga de pan, sin un rótulo de tipo de corte encima

#### Scenario: Familia con pocos géneros

- **WHEN** una familia tiene menos de 12 géneros con álbumes
- **THEN** la fila muestra solo los que tienen álbumes
