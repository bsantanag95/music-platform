## MODIFIED Requirements

### Requirement: Discos que contienen la grabación

La página SHALL mostrar la sección "Esta grabación aparece en" con los discos
(release-groups) distintos que contienen esta misma grabación en alguna edición ingerida, como una **franja horizontal desplazable**
de carátulas (la misma pieza que la franja de discografía del álbum), en este orden de tipos: Álbumes de estudio, Singles y EP,
Recopilaciones, En vivo y otros; dentro de cada tipo, por fecha de primer lanzamiento. Cada disco SHALL mostrar su carátula en
miniatura, su título, mes y año (solo el año si la fecha no tiene mes), su tipo cuando no es un álbum de estudio, y enlace al disco.
El disco más temprano de todos SHALL llevar la marca "Primer lanzamiento", con su fecha completa como texto de ayuda. Junto al título
de la sección SHALL mostrarse un resumen con la cantidad de discos de cada tipo presente. La franja SHALL mostrar todos los discos, sin
controles "+N". Sin discos, la sección SHALL NOT renderizarse.

#### Scenario: Canción con estudio, singles y recopilaciones

- **WHEN** una grabación está en 1 álbum de estudio, 2 singles y 9 recopilaciones
- **THEN** la franja muestra primero el álbum de estudio, luego los singles y después las 9 recopilaciones, el disco más temprano con
  la marca "Primer lanzamiento", y el resumen dice "1 álbum de estudio · 2 singles y EP · 9 recopilaciones"

#### Scenario: Disco en varias ediciones

- **WHEN** la grabación está en tres ediciones del mismo álbum
- **THEN** el álbum aparece una sola vez

### Requirement: Otras versiones de la canción

La página SHALL mostrar la sección "Otras versiones de la canción" con las demás
grabaciones ingeridas que comparten al menos una obra con la grabación, sin incluirla a
ella, agrupadas por sus atributos de versión en este orden: **Versiones de otros artistas**
(incluyen `cover`), **En vivo** (incluyen `live` y no `cover`) y **Otras grabaciones**
(ninguno de los dos). Con varios grupos, cada uno SHALL ser una pestaña con su cantidad y solo
el grupo seleccionado SHALL estar a la vista, empezando por el primero con contenido; con un
solo grupo, su nombre SHALL mostrarse como subtítulo, sin pestañas. Cada grupo SHALL mostrarse
como una tabla de una columna con una fila por disco principal (y por artista, cuando difiere
del de la canción), con las columnas Año, Disco y "Duración y variantes", y además Artista en las
versiones de otros artistas. Cuando el disco tiene una sola grabación y su título no agrega nada al de la canción, el título del disco
SHALL enlazar a esa grabación y la última columna SHALL mostrar solo su duración y sus demás atributos traducidos; la fila SHALL NOT
decir "Ver versión". En los demás casos, las grabaciones de un mismo disco SHALL aparecer juntas en su fila como variantes enlazadas a
su página, cada una con su duración y sus demás atributos traducidos (por ejemplo, instrumental), y el disco SHALL enlazar a su
página; el texto de cada variante SHALL ser lo que su título agrega al de la canción, o "Grabación N" (numeradas entre las
que no agregan nada) cuando no agrega nada. Una grabación sin disco SHALL ir sola en su fila, con "Sin disco" enlazado a la grabación. Cada grupo SHALL mostrar
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
  cada fila muestra el año, el artista, el disco enlazado a la versión y su duración, sin "Ver versión"

#### Scenario: Tomas del mismo artista

- **WHEN** las otras grabaciones son del mismo artista, cuatro en el mismo disco tituladas
  "(version 1)" a "(version 4)" y una sin agregado
- **THEN** el disco aparece en una sola fila, enlazado al disco, con las variantes "version 1" a "version 4" y "Grabación 1", cada una
  con su duración
