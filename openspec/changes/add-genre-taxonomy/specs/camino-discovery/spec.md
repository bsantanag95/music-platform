## MODIFIED Requirements

### Requirement: Filtro por género
El sistema SHALL permitir filtrar `/caminos` por género, considerando una lista como coincidente
si al menos uno de sus álbumes tiene ese género entre sus géneros efectivos (capability
`genre-seeds`). El filtro SHALL aceptar una **familia** de géneros (`family`, la que ofrece el
selector de `/caminos`) o un **género** de la taxonomía por slug (`genre`), que incluye sus
subgéneros. Una familia o un slug desconocido SHALL dar el estado vacío de "sin resultados".

#### Scenario: Filtrar por un género
- **WHEN** una persona filtra `/caminos` por un género
- **THEN** ve solo las listas con al menos un álbum etiquetado con ese género

#### Scenario: Filtro sin resultados
- **WHEN** ningún álbum de ninguna lista trackeada coincide con el género elegido
- **THEN** el sistema muestra un estado vacío localizado de "sin resultados", distinto del estado
  vacío de "todavía no hay Caminos populares"

#### Scenario: Filtrar por una familia
- **WHEN** una persona elige la familia Latina en el selector de `/caminos`
- **THEN** ve solo las listas con al menos un álbum cuyo género efectivo pertenece a Latina

#### Scenario: Género con subgéneros
- **WHEN** un cliente pide `/api/caminos/discover?genre=rock`
- **THEN** coincide también una lista cuyo único álbum es de "shoegaze"
