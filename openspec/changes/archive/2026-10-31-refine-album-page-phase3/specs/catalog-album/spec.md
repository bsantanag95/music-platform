## ADDED Requirements

### Requirement: Formatos de edición en el idioma de la interfaz

Los formatos de las ediciones SHALL mostrarse en el idioma de la interfaz cuando son
formatos conocidos de MusicBrainz (vinilo con su medida, casete, medio digital, cartucho
de 8 pistas, CD), en la tabla de Ediciones y en las pistas adicionales. Un formato
desconocido SHALL mostrarse tal como lo nombra MusicBrainz.

#### Scenario: Vinilo de 12 pulgadas en español

- **WHEN** una edición tiene el formato "12" Vinyl" y la interfaz está en español
- **THEN** la tabla muestra "Vinilo 12″"

#### Scenario: Formato desconocido

- **WHEN** una edición tiene el formato "Hybrid SACD"
- **THEN** la tabla lo muestra tal cual

### Requirement: Filtros y cabecera de la pestaña Ediciones

Los filtros de formato de la pestaña Ediciones SHALL aparecer en un orden fijo (CD,
Vinilo, Casete, Digital, Otros), solo las familias presentes, cada uno con la cantidad de
ediciones que muestra según el filtro de no oficiales. En escritorio la cabecera de la
tabla SHALL quedar fija bajo la barra de pestañas al desplazarse. La edición mostrada
SHALL marcarse con un distintivo "Mostrada".

#### Scenario: Filtros con cifras

- **WHEN** un álbum tiene 58 ediciones oficiales en CD y 41 en vinilo
- **THEN** los filtros dicen "CD 58" antes de "Vinilo 41"

#### Scenario: Tabla larga

- **WHEN** una persona baja por una tabla de 150 ediciones en escritorio
- **THEN** la fila de encabezados sigue visible bajo las pestañas
