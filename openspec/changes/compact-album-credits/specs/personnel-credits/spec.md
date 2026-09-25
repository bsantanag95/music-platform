## ADDED Requirements

### Requirement: Tipo de artista principal en la lectura

La lectura de créditos de personal de un álbum SHALL informar, junto con los niveles, si
el artista principal es una persona (`person`: todos los artistas principales del álbum son
personas) o un grupo (`group`: cualquier otro caso, incluidas colaboraciones mixtas y tipos
desconocidos), para rotular el primer nivel.

#### Scenario: Solista

- **WHEN** el único artista principal del álbum es de tipo persona
- **THEN** la lectura informa `person`

#### Scenario: Colaboración entre una solista y una banda

- **WHEN** el álbum tiene como artistas principales a una persona y a un grupo
- **THEN** la lectura informa `group`
