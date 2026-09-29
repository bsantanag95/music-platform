## MODIFIED Requirements

### Requirement: Contenido de la grilla

Cada tarjeta de la grilla SHALL mostrar la carátula, el título y el año, una etiqueta "EP" en
los EP de Principal, el botón de acciones del disco (capability `discography-quick-actions`) y,
para el usuario en sesión, una franja de marcas sobre la base de la carátula con su nota ("★ 4½")
o ✓ si solo lo escuchó, ♥ si es favorito y el marcador si está en Pendiente; sin marcas, la
franja SHALL omitirse. Cada marca SHALL tener un texto accesible. La grilla SHALL mostrar como
máximo 48 discos y una acción "Mostrar más" que agrega los siguientes 48.

#### Scenario: EP en Principal

- **WHEN** Principal incluye un EP
- **THEN** su tarjeta lleva la etiqueta "EP"

#### Scenario: Artista con cientos de discos principales

- **WHEN** Principal tiene 300 discos
- **THEN** la grilla muestra los primeros 48 y "Mostrar más"

#### Scenario: Disco calificado y favorito

- **WHEN** una persona calificó *Dr. Feelgood* con 4½ estrellas y lo tiene como favorito
- **THEN** la carátula muestra "★ 4½" y el corazón

#### Scenario: Disco escuchado sin calificar

- **WHEN** una persona escuchó un disco y no lo calificó
- **THEN** la carátula muestra ✓

### Requirement: Contenido de la tabla

Cada fila de la tabla SHALL mostrar el año, una miniatura de la carátula, el título con una
etiqueta de tipo al lado solo cuando algún tipo del disco no es "álbum" (tipos de MusicBrainz
traducidos, por ejemplo "EP", "en vivo", "banda sonora", "remix"), la columna **"Media"** con la
valoración media de la comunidad y su cantidad cuando hay al menos 5 valoraciones (un "—"
atenuado con el texto accesible "menos de 5 valoraciones" en otro caso), la columna "Tú" con las
mismas marcas que la grilla y, al final, el botón de acciones del disco. En Apariciones, la fila
SHALL indicar el artista principal del disco. En móvil, la tabla SHALL reducirse a año, título,
"Tú" y el botón de acciones, con la etiqueta de tipo (si corresponde) y la media en una segunda
línea bajo el título, sin desbordamiento horizontal.

#### Scenario: Disco con pocas valoraciones

- **WHEN** un disco en vivo tiene 3 valoraciones
- **THEN** su fila muestra "—" en la columna Media, con el texto accesible "menos de 5
  valoraciones"

#### Scenario: Aparición

- **WHEN** el artista figura como invitado en un sencillo de otro artista
- **THEN** la fila en Apariciones indica ese artista principal

#### Scenario: Álbum sin etiqueta de tipo

- **WHEN** Principal muestra en tabla un álbum de estudio y un EP
- **THEN** solo el EP lleva etiqueta de tipo junto al título, y la tabla no tiene columna Tipo
