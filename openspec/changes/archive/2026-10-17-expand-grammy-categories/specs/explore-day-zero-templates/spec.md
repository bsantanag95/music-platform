## MODIFIED Requirements

### Requirement: Ganadores del premio más reciente

La plantilla `grammy-winners` SHALL generar la colección "Ganadores del Grammy {año}" con los ganadores de la
última ceremonia cargada que tengan álbum (directo o ancla), ordenados por nivel de categoría —general, después
álbum, después género— y, dentro de cada nivel, por clave de categoría. El orden de niveles SHALL ser el mismo que
usa la página de la ceremonia. Los ganadores sin álbum (por ejemplo, Productor del año) SHALL NOT entrar. Su período
SHALL ser `<premio>-<año>`; al cargarse una ceremonia más reciente SHALL crear la colección nueva y vencer la
anterior.

#### Scenario: Última ceremonia

- **WHEN** la última ceremonia cargada es la de 2025 y tiene al menos seis ganadores con álbum
- **THEN** la colección "Ganadores del Grammy 2025" contiene esos álbumes, los de categorías generales primero

#### Scenario: Ceremonia nueva

- **WHEN** se carga la ceremonia de 2026 y corre la generación
- **THEN** se crea "Ganadores del Grammy 2026" y la de 2025 sale del riel sin dejar de ser pública

#### Scenario: Sin premios cargados

- **WHEN** no hay ninguna ceremonia cargada
- **THEN** la plantilla no crea colección

#### Scenario: Tres niveles en la colección

- **WHEN** la ceremonia tiene ganadores en los niveles general, álbum y género, y más álbumes que el tamaño de la
  colección
- **THEN** primero van los de nivel general, después los de álbum y al final los de género, de modo que los de género
  solo entran si sobra espacio

#### Scenario: Ganador sin álbum

- **WHEN** el ganador de Productor del año es un artista y no tiene álbum asociado
- **THEN** no aporta ningún álbum a la colección
