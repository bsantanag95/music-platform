## MODIFIED Requirements

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). Los chips de género SHALL
mostrar, en el orden de la taxonomía, las familias principales que tienen álbumes, con su número
de álbumes, y las familias secundarias con álbumes agrupadas detrás de "Más"; una familia sin
álbumes SHALL NOT mostrar chip. Al elegir una década, una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), aplicando **un solo corte a la vez**
con prioridad `decada` > `familia` > `genero`. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista: por valoración agregada del álbum cuando
alcanza `MIN_RATINGS_PER_ALBUM`, luego por `first_release_year` descendente, con desempate
estable. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

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
