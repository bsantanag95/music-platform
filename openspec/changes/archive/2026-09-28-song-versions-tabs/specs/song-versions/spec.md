## MODIFIED Requirements

### Requirement: Otras versiones de la canción

La página SHALL mostrar la sección "Otras versiones de la canción" con las demás
grabaciones ingeridas que comparten al menos una obra con la grabación, sin incluirla a
ella, agrupadas por sus atributos de versión en este orden: **Versiones de otros artistas**
(incluyen `cover`), **En vivo** (incluyen `live` y no `cover`) y **Otras grabaciones**
(ninguno de los dos). Con varios grupos, cada uno SHALL ser una pestaña con su cantidad y solo
el grupo seleccionado SHALL estar a la vista, empezando por el primero con contenido; con un
solo grupo, su nombre SHALL mostrarse como subtítulo, sin pestañas. Cada grupo SHALL mostrarse
como una tabla de una columna con una fila por disco principal (y por artista, cuando difiere
del de la canción), con las columnas Año, Disco y Grabaciones, y además Artista en las
versiones de otros artistas. Las grabaciones de un mismo disco SHALL aparecer juntas en su
fila como variantes enlazadas a su página, cada una con su duración y sus demás atributos
traducidos (por ejemplo, instrumental). El texto de cada variante SHALL ser lo que su título
agrega al de la canción; si no agrega nada, "Ver versión", o "Grabación N" cuando el disco
tiene varias así. Una grabación sin disco SHALL ir sola en su fila. Cada grupo SHALL mostrar
hasta 10 filas y un "+N" para el resto. Las filas SHALL ordenarse por la fecha del disco más
temprano de su primera grabación. Un grupo vacío SHALL NOT renderizarse; sin otras versiones,
la sección SHALL NOT renderizarse. La sección SHALL obtenerse con consultas de lectura, sin
requests a MusicBrainz.

#### Scenario: Obra con muchas grabaciones

- **WHEN** la obra de la grabación tiene 4 covers, 16 grabaciones `live` y 16 grabaciones
  sin atributos además de ella
- **THEN** la sección muestra las pestañas "Versiones de otros artistas · 4", "En vivo · 16" y
  "Otras grabaciones · 16", con la primera seleccionada y solo su tabla a la vista

#### Scenario: Página de una versión en vivo

- **WHEN** una persona abre una de las grabaciones `live`
- **THEN** la grabación de estudio aparece en "Otras grabaciones" y la propia grabación no
  aparece en ningún grupo

#### Scenario: Grabación sin obra

- **WHEN** la grabación no tiene obra vinculada
- **THEN** la página no muestra la sección ni la línea de versión

#### Scenario: Solo covers

- **WHEN** las otras grabaciones de la obra son tres covers llamados igual que la canción
- **THEN** la sección muestra "Versiones de otros artistas" como subtítulo, sin pestañas, y
  cada fila muestra el año, el artista, el disco y "Ver versión"

#### Scenario: Tomas del mismo artista

- **WHEN** las otras grabaciones son del mismo artista, cuatro en el mismo disco tituladas
  "(version 1)" a "(version 4)" y una sin agregado
- **THEN** el disco aparece en una sola fila con las variantes "version 1" a "version 4" y
  "Ver versión", cada una con su duración
