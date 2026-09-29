## MODIFIED Requirements

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

Los encabezados Año, Media y Tú SHALL permitir ordenar la tabla: el primer uso ordena en el
sentido natural de la columna (Año ascendente; Media y Tú descendente) y el siguiente lo
invierte, con el orden vigente anunciado en el encabezado para lectores de pantalla. Por defecto
la tabla SHALL ordenarse por Año ascendente. Los discos sin valor en la columna ordenada SHALL ir
al final en cualquier sentido, con el título como desempate. Cambiar de sección SHALL volver al
orden por defecto.

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

#### Scenario: Ordenar por tu nota

- **WHEN** una persona activa el encabezado "Tú" en la tabla de Principal
- **THEN** los discos quedan de su nota más alta a la más baja, con los que no calificó al final

#### Scenario: Invertir el orden

- **WHEN** una persona activa "Año" dos veces
- **THEN** la tabla queda del disco más reciente al más antiguo, con los discos sin año al final
