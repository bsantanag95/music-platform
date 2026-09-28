# song-versions Specification

## Purpose
Conectar las versiones de una canción por su obra: atributos de versión según MusicBrainz, grabación original, discos que contienen la grabación y otras versiones agrupadas, sin deducir tipos.
## Requirements
### Requirement: Atributos de versión de una grabación

El sistema SHALL derivar los atributos de versión de una grabación de los atributos de su
vínculo con la obra (`recording_work.attributes`: `live`, `cover`, `instrumental`,
`medley`, `partial`, …), tal como vienen de MusicBrainz: la unión de los atributos de todos
sus vínculos, sin repetidos y ordenada. Una grabación sin obra o con vínculos sin atributos
SHALL tener atributos vacíos. El sistema SHALL NOT deducir atributos a partir de otros datos
(tipo de disco, título, duración). La interfaz SHALL mostrar cada atributo traducido y, si
no tiene traducción, el texto de MusicBrainz.

#### Scenario: Versión en vivo marcada

- **WHEN** una grabación está vinculada a su obra con el atributo `live`
- **THEN** sus atributos de versión son `["live"]`

#### Scenario: En vivo sin marcar

- **WHEN** una grabación en vivo está vinculada a su obra sin atributos, aunque todos sus
  discos sean en vivo
- **THEN** sus atributos de versión son vacíos

### Requirement: Grabación original de una obra

El sistema SHALL considerar grabación original de una obra a la grabación vinculada a esa
obra sin los atributos `live` ni `cover` cuyo primer disco de estudio (por fecha de primer
lanzamiento) es el más temprano; si ninguna de esas grabaciones está en un disco de
estudio, a la que tiene el disco más temprano. A igual fecha SHALL desempatar de forma
determinista. Si ninguna grabación de la obra cumple la condición, la obra SHALL NOT tener
original.

#### Scenario: Obra con estudio, demos y en vivo

- **WHEN** una obra tiene una grabación en un disco de estudio de 1991, dos demos de 1986
  publicados en una recopilación de 2018 y varias grabaciones `live`
- **THEN** la original es la grabación del disco de estudio de 1991

#### Scenario: Obra solo con covers

- **WHEN** todas las grabaciones ingeridas de una obra tienen el atributo `cover`
- **THEN** la obra no tiene original

### Requirement: Línea de versión en la cabecera

Cuando los atributos de versión de la grabación incluyen `cover` o `live` y su obra tiene
una grabación original distinta de ella, la ficha técnica SHALL mostrar una línea que
identifica la versión y enlaza a la original: "Versión de *Título* (*Artista*)" para
`cover`, "Versión en vivo de *Título*" para `live` sin `cover`. En cualquier otro caso la
línea SHALL NOT mostrarse.

#### Scenario: Versión en vivo

- **WHEN** una persona abre una grabación `live` de "November Rain"
- **THEN** la ficha muestra "Versión en vivo de November Rain" con enlace a la grabación de
  estudio

#### Scenario: Cover de otro artista

- **WHEN** una persona abre una grabación `cover` de "November Rain" de otro artista
- **THEN** la ficha muestra "Versión de November Rain (Guns N' Roses)" con enlace a la
  original

#### Scenario: Demo sin marca

- **WHEN** una persona abre un demo vinculado a la obra sin atributos
- **THEN** la ficha no muestra línea de versión

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

### Requirement: Atributos de versión en los contratos de catálogo

Las respuestas de `GET /api/catalog/recording/[id]` y de las pistas adicionales de una
edición SHALL exponer `versionAttributes: string[]` en lugar de `variantType`; las pistas
adicionales SHALL exponer además `versionOf` (grabación original, o `null`). La respuesta de
`GET /api/catalog/release-group/[id]` SHALL NOT cambiar. El esquema SHALL NOT conservar
`recording.variant_type` ni `recording.variant_of_id`.

#### Scenario: Pista adicional en vivo

- **WHEN** un cliente pide las pistas adicionales de una edición con una grabación vinculada
  a su obra con `live`
- **THEN** esa pista trae `"versionAttributes": ["live"]` y ningún campo `variantType`

#### Scenario: Grabación sin obra

- **WHEN** un cliente pide una grabación sin obra vinculada
- **THEN** la respuesta trae `"versionAttributes": []`

