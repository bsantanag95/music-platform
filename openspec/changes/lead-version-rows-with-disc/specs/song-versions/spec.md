## MODIFIED Requirements

### Requirement: Otras versiones de la canción

La página SHALL mostrar la sección "Otras versiones de la canción" con las demás
grabaciones ingeridas que comparten al menos una obra con la grabación, sin incluirla a
ella, agrupadas por sus atributos de versión en este orden: **Versiones de otros artistas**
(incluyen `cover`), **En vivo** (incluyen `live` y no `cover`) y **Otras grabaciones**
(ninguno de los dos). Con varios grupos, cada uno SHALL mostrar su cantidad y estar
desplegado al cargar solo si tiene hasta 5 grabaciones; con un solo grupo, su nombre SHALL
mostrarse como subtítulo, sin control de despliegue, con hasta 10 grabaciones y un "+N" para el
resto. Cada grabación SHALL mostrar como línea principal, enlazada a su página, el artista cuando
difiere del de la canción; si no, su disco principal (y su título si no tiene disco). Debajo
SHALL mostrar su título solo cuando difiere del de la canción y de la línea principal, y su disco
principal con el año (solo el año cuando el disco ya es la línea principal o se llama igual que
la canción), su duración y sus demás atributos traducidos (por ejemplo, instrumental) con la misma
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

#### Scenario: Tomas del mismo artista

- **WHEN** las otras grabaciones son del mismo artista y se llaman como la canción, en discos
  distintos, y una de ellas se titula "(take 1)"
- **THEN** cada fila la encabeza el nombre de su disco, y solo la toma muestra su título debajo,
  junto al año
