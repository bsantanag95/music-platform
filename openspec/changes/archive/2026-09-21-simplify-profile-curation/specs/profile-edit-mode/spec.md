## MODIFIED Requirements

### Requirement: Controles de edición por bloque

Con el modo edición activo, SHALL mostrar un control de edición cada bloque visible que tenga un
editor existente: la Placa (bio, pronombres, ubicación, zona horaria y enlaces), la Tarjeta de
Identidad (artista, álbum e himno) y "Empieza por aquí". Los bloques sin editor propio (listas
fijadas, valoraciones destacadas, entradas de diario destacadas y el resto de estantes) SHALL NOT
mostrar control de edición. Cada control SHALL ser un botón con nombre accesible que identifique
el bloque que edita.

#### Scenario: Lápiz en un bloque con editor

- **WHEN** el modo edición está activo
- **THEN** la Tarjeta de Identidad muestra un botón accesible "Editar" con el nombre del bloque

#### Scenario: Bloque sin editor

- **WHEN** el modo edición está activo
- **THEN** el estante de listas del perfil no muestra ningún control de edición

#### Scenario: Lápiz en "Empieza por aquí"

- **WHEN** el modo edición está activo
- **THEN** "Empieza por aquí" muestra un botón accesible "Editar" con el nombre del bloque, y
  el perfil no muestra ningún control de edición de álbumes favoritos
