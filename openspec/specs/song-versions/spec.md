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
Recopilaciones, En vivo y otros. Dentro de cada grupo los discos SHALL ordenarse por fecha
de primer lanzamiento, con carátula en miniatura, título, año y enlace al disco. El disco
más temprano de todos SHALL llevar la marca "original". Cada grupo SHALL mostrar hasta 3
discos y un control "+N" que despliega el resto. Un grupo sin discos SHALL NOT
renderizarse.

#### Scenario: Canción con estudio, singles y recopilaciones

- **WHEN** una grabación está en 1 álbum de estudio, 2 singles y 9 recopilaciones
- **THEN** la sección muestra tres grupos en ese orden, el álbum de estudio con la marca
  "original", y el grupo Recopilaciones muestra 3 discos y "+6"

#### Scenario: Disco en varias ediciones

- **WHEN** la grabación está en tres ediciones del mismo álbum
- **THEN** el álbum aparece una sola vez

### Requirement: Otras versiones de la canción

La página SHALL mostrar la sección "Otras versiones de la canción" con las demás
grabaciones ingeridas que comparten al menos una obra con la grabación, sin incluirla a
ella, agrupadas por sus atributos de versión en este orden: **Versiones de otros artistas**
(incluyen `cover`), **En vivo** (incluyen `live` y no `cover`) y **Otras grabaciones**
(ninguno de los dos). Cada grupo SHALL estar contraído al cargar la página y mostrar su
cantidad. Al desplegarse, cada grabación SHALL mostrar su título con enlace a su página, el
artista cuando difiere del de la canción, su disco principal con el año, su duración y sus
demás atributos traducidos (por ejemplo, instrumental). Las grabaciones de cada grupo SHALL
ordenarse por la fecha de su disco más temprano. Un grupo vacío SHALL NOT renderizarse; sin
otras versiones, la sección SHALL NOT renderizarse. La sección SHALL obtenerse con consultas
de lectura, sin requests a MusicBrainz.

#### Scenario: Obra con muchas grabaciones

- **WHEN** la obra de la grabación tiene 4 covers, 16 grabaciones `live` y 16 grabaciones
  sin atributos además de ella
- **THEN** la sección muestra "Versiones de otros artistas (4)", "En vivo (16)" y "Otras
  grabaciones (16)", todos contraídos

#### Scenario: Página de una versión en vivo

- **WHEN** una persona abre una de las grabaciones `live`
- **THEN** la grabación de estudio aparece en "Otras grabaciones" y la propia grabación no
  aparece en ningún grupo

#### Scenario: Grabación sin obra

- **WHEN** la grabación no tiene obra vinculada
- **THEN** la página no muestra la sección ni la línea de versión

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

