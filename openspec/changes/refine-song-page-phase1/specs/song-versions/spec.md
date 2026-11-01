## ADDED Requirements

### Requirement: Pestañas de versiones con el control común

Las pestañas de grupos de versiones SHALL usar el control segmentado común de la
plataforma, conservando su semántica de pestañas (`tablist`, `aria-selected`, navegación
con flechas), con la cantidad de cada grupo tras su nombre.

#### Scenario: Dos grupos de versiones

- **WHEN** una canción tiene 9 versiones de otros artistas y 2 otras grabaciones
- **THEN** las pestañas dicen "Versiones de otros artistas 9" y "Otras grabaciones 2" en un
  único control con borde, y la activa se marca con `aria-selected`

### Requirement: Artista comodín de MusicBrainz

Una versión acreditada al artista comodín de MusicBrainz ("[unknown]") SHALL mostrar
"Artista desconocido" en el idioma de la interfaz, sin enlace.

#### Scenario: Versión sin artista conocido

- **WHEN** una versión está acreditada a "[unknown]"
- **THEN** la fila muestra "Artista desconocido" sin enlace
