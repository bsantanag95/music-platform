## MODIFIED Requirements

### Requirement: Discos que contienen la grabación

La página SHALL mostrar la sección "Esta grabación aparece en" con los discos
(release-groups) distintos que contienen esta misma grabación en alguna edición ingerida,
segmentados por tipo de disco en este orden: Álbumes de estudio, Singles y EP,
Recopilaciones, En vivo y otros. Cuando hay recopilaciones y discos de otro tipo, los grupos
del artista (estudio, singles y EP, en vivo y otros) SHALL ir apilados en una columna y
Recopilaciones en otra. Dentro de cada grupo los discos SHALL ordenarse por fecha de primer
lanzamiento, con carátula en miniatura, título, mes y año (solo el año si la fecha no tiene
mes) y enlace al disco. El disco más temprano de todos SHALL llevar la marca "Primer
lanzamiento", con su fecha completa como texto de ayuda. Cada grupo SHALL mostrar hasta 3
discos y un control "+N" que despliega el resto; la cantidad del grupo SHALL mostrarse solo
cuando tiene más de un disco. Un grupo sin discos SHALL NOT renderizarse.

#### Scenario: Canción con estudio, singles y recopilaciones

- **WHEN** una grabación está en 1 álbum de estudio, 2 singles y 9 recopilaciones
- **THEN** la sección muestra el álbum de estudio y los singles en una columna y las
  recopilaciones en otra, el disco más temprano con la marca "Primer lanzamiento", y el grupo
  Recopilaciones muestra 3 discos y "+6"

#### Scenario: Disco en varias ediciones

- **WHEN** la grabación está en tres ediciones del mismo álbum
- **THEN** el álbum aparece una sola vez

### Requirement: Otras versiones de la canción

La página SHALL mostrar la sección "Otras versiones de la canción" con las demás
grabaciones ingeridas que comparten al menos una obra con la grabación, sin incluirla a
ella, agrupadas por sus atributos de versión en este orden: **Versiones de otros artistas**
(incluyen `cover`), **En vivo** (incluyen `live` y no `cover`) y **Otras grabaciones**
(ninguno de los dos). Con varios grupos, cada uno SHALL mostrar su cantidad y estar
desplegado al cargar solo si tiene hasta 5 grabaciones; con un solo grupo, su nombre SHALL
mostrarse como subtítulo, sin control de despliegue, con hasta 10 grabaciones y un "+N" para el
resto. Cada grabación SHALL mostrar como línea principal el artista cuando difiere del de la
canción (si no, su título), enlazada a su página; su título solo cuando difiere del de la
canción; su disco principal con el año (sin el nombre del disco si coincide con el título de la
canción), su duración y sus demás atributos traducidos (por ejemplo, instrumental) con la misma
forma de etiqueta que el resto de la página. En pantallas anchas las grabaciones SHALL
repartirse en dos columnas. Las grabaciones de cada grupo SHALL ordenarse por la fecha de su
disco más temprano. Un grupo vacío SHALL NOT renderizarse; sin otras versiones, la sección
SHALL NOT renderizarse. La sección SHALL obtenerse con consultas de lectura, sin requests a
MusicBrainz.

#### Scenario: Obra con muchas grabaciones

- **WHEN** la obra de la grabación tiene 4 covers, 16 grabaciones `live` y 16 grabaciones
  sin atributos además de ella
- **THEN** la sección muestra "Versiones de otros artistas (4)" desplegado, y "En vivo (16)" y
  "Otras grabaciones (16)" contraídos

#### Scenario: Página de una versión en vivo

- **WHEN** una persona abre una de las grabaciones `live`
- **THEN** la grabación de estudio aparece en "Otras grabaciones" y la propia grabación no
  aparece en ningún grupo

#### Scenario: Grabación sin obra

- **WHEN** la grabación no tiene obra vinculada
- **THEN** la página no muestra la sección ni la línea de versión

#### Scenario: Solo covers

- **WHEN** las otras grabaciones de la obra son tres covers llamados igual que la canción
- **THEN** la sección muestra "Versiones de otros artistas" como subtítulo, sin control de
  despliegue, y cada fila muestra el artista y el año de su disco sin repetir el título
