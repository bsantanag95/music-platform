## ADDED Requirements

### Requirement: Comunidad y nota propia en Álbumes

Cada fila de Álbumes SHALL mostrar a la derecha la media de estrellas de la comunidad con su cantidad cuando el disco
tiene al menos 5 valoraciones (el umbral del álbum) y, con sesión, la nota propia de quien busca ("Tu nota 4,5"). La
primera página y las que agrega "Cargar más" SHALL mostrar lo mismo: `GET /api/catalog/search?type=album` devuelve
`community` en cada resultado y, con sesión, `yourStars`.

#### Scenario: Disco valorado
- **WHEN** una persona con sesión que valoró *The Wall* con 5 estrellas busca `the wall` y el disco tiene 12
  valoraciones con media 4,6
- **THEN** la fila muestra "★ 4,6 · 12" y "Tu nota 5,0"

#### Scenario: Pocas valoraciones
- **WHEN** un disco tiene 3 valoraciones
- **THEN** su fila no muestra media
