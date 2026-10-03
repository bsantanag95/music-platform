## MODIFIED Requirements

### Requirement: Géneros efectivos con herencia

El puntaje de un género en un álbum SHALL ser 1 si es una semilla propia del álbum (Wikidata) más
la suma de los votos de la comunidad sobre ese álbum (+1 / −1) de cuentas no desactivadas. Los
géneros efectivos de un álbum SHALL ser los de estilo con puntaje mayor que 0, ordenados por
puntaje descendente (desempate: posición de la semilla y luego nombre); el primero es el principal.
Si ningún género tiene puntaje mayor que 0, los géneros efectivos SHALL ser los 3 primeros
géneros de estilo (en el orden de Wikidata) de su artista principal (el primer crédito principal),
marcados como heredados. Un álbum SHALL NOT heredar los géneros del artista más allá de esos 3 ni
sus descriptores. Los géneros ocultos SHALL NOT formar parte de los géneros efectivos. Todas las
lecturas de géneros de álbum (Explorar, Caminos, huella de gusto) SHALL usar esta misma definición.

#### Scenario: Álbum con semillas propias

- **WHEN** un álbum tiene semillas propias y su artista tiene otras
- **THEN** los géneros efectivos del álbum son solo los propios, no heredados

#### Scenario: Álbum que hereda

- **WHEN** un álbum no tiene semillas propias ni votos positivos y su artista principal tiene
  "progressive metal"
- **THEN** el género efectivo del álbum es "progressive metal", marcado como heredado

#### Scenario: Herencia acotada

- **WHEN** un álbum sin semillas propias es de un artista con 7 géneros en Wikidata, el 5.º
  "blues rock"
- **THEN** el álbum hereda solo los 3 primeros y no aparece en la familia Blues por herencia

#### Scenario: Sin datos

- **WHEN** ni el álbum ni su artista principal tienen semillas
- **THEN** el álbum no tiene géneros efectivos

#### Scenario: La comunidad corrige una semilla

- **WHEN** un álbum tiene la semilla "post-punk" y una persona la vota −1
- **THEN** su puntaje es 0 y deja de ser un género efectivo del álbum

#### Scenario: Una persona devuelve la semilla

- **WHEN** además otra persona vota +1 "post-punk"
- **THEN** su puntaje es 1 y vuelve a ser un género efectivo del álbum

#### Scenario: Propuesta que reemplaza la herencia

- **WHEN** un álbum sin semillas propias recibe un voto +1 para "dream pop"
- **THEN** su género efectivo es solo "dream pop", sin marca de heredado, y deja de heredar del artista

#### Scenario: Principal por puntaje

- **WHEN** "shoegaze" tiene puntaje 4 y "dream pop" 2
- **THEN** "shoegaze" es el género principal y "dream pop" va después
