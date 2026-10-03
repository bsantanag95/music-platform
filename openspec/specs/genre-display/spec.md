# genre-display Specification

## Purpose
Mostrar los géneros de un artista, álbum o canción como chips enlazados en sus cabeceras, con la herencia desde el artista marcada y los descriptores (Instrumental, Navideña, Orquestal, Banda sonora) aparte.
## Requirements
### Requirement: Géneros en la página de artista

La cabecera del artista SHALL mostrar sus géneros semilla de estilo, en el orden de Wikidata, como chips con el nombre
localizado que enlazan a `/genre/<slug>`. SHALL mostrar hasta 5 y un control "+N" para el resto. Un artista sin géneros
SHALL NOT mostrar la zona.

#### Scenario: Artista con géneros

- **WHEN** una persona abre un artista con 7 géneros semilla
- **THEN** ve 5 chips y "+2", y cada chip enlaza a la página de su género

#### Scenario: Artista sin géneros

- **WHEN** el artista no tiene géneros semilla
- **THEN** la cabecera no muestra chips ni una línea vacía

### Requirement: Géneros y descriptores en la página de álbum

La identidad del álbum SHALL mostrar sus géneros efectivos de estilo como chips enlazados, hasta 5 con "+N", y, en una
fila aparte sin enlace, sus descriptores (Instrumental, Navideña, Orquestal y Banda sonora). Los géneros heredados del
artista SHALL distinguirse de los propios con un estilo atenuado y un texto accesible "Heredado de {artista}". Sin
géneros ni descriptores la zona SHALL NOT renderizarse.

#### Scenario: Género propio y heredado

- **WHEN** se abren un álbum con semillas propias y otro sin ellas, de un artista con géneros
- **THEN** el primero muestra chips normales y el segundo chips atenuados con "Heredado de {artista}"

#### Scenario: Banda sonora

- **WHEN** el álbum tiene el tipo secundario `Soundtrack`
- **THEN** la fila de descriptores muestra "Banda sonora" sin enlace

### Requirement: Géneros en la página de canción

La identidad de la canción SHALL mostrar, de forma discreta y con el mismo componente de chips, los géneros efectivos de su
disco principal, marcados como heredados del álbum. Una canción sin disco principal o cuyo disco no tiene géneros SHALL NOT
mostrar la zona.

#### Scenario: Canción con disco con géneros

- **WHEN** una persona abre una canción cuyo disco principal tiene "rock progresivo"
- **THEN** ve ese chip atenuado, que enlaza a su página de género

#### Scenario: Canción sin géneros

- **WHEN** el disco principal de la canción no tiene géneros efectivos
- **THEN** la cabecera no muestra la zona

