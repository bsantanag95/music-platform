## ADDED Requirements

### Requirement: Ingesta completa y paginada

La ingesta de la discografía de un artista SHALL recorrer el browse de release-groups de
MusicBrainz página por página (100 por página) hasta el total informado por MusicBrainz, con
un tope de seguridad de 20 páginas. La primera sincronización de un artista SHALL traer de
forma síncrona hasta 3 páginas y SHALL programar el resto en segundo plano. Una discografía
SHALL considerarse completa solo cuando se recorrieron todas sus páginas.

#### Scenario: Artista con más de 100 release-groups

- **WHEN** se sincroniza un artista con 219 release-groups oficiales
- **THEN** la ingesta hace 3 requests paginadas y guarda los 219

#### Scenario: Artista con pocos release-groups

- **WHEN** se sincroniza un artista con 19 release-groups
- **THEN** la ingesta hace una sola request y marca la discografía como completa

#### Scenario: Artista con más de 300 release-groups en la primera visita

- **WHEN** alguien visita por primera vez un artista con 450 release-groups oficiales
- **THEN** la página se construye con los primeros 300 y las páginas restantes se ingieren en
  segundo plano, sin bloquear la respuesta

### Requirement: Sin bootlegs

El browse de discografía SHALL pedir a MusicBrainz solo los release-groups que no son
exclusivamente bootleg (filtro de estado del sitio de MusicBrainz). La ingesta SHALL NOT
guardar un release-group que solo tiene ediciones bootleg como parte de la discografía de un
artista.

#### Scenario: Grabación en vivo solo bootleg

- **WHEN** un artista tiene en MusicBrainz un disco en vivo cuyas ediciones son todas bootleg
- **THEN** ese disco no aparece en la discografía del artista

### Requirement: Release-groups fuera de la discografía

Al completar una sincronización, todo release-group acreditado al artista que no esté en el
resultado del browse SHALL quedar marcado como fuera de la discografía, y un release-group
marcado que vuelva a aparecer en el resultado SHALL perder la marca. La marca SHALL NOT
borrar el release-group, sus créditos ni los datos de usuarios asociados (escuchas,
valoraciones, reseñas, colección, listas), y su página de álbum SHALL seguir accesible.
Todas las lecturas de discografía de un artista SHALL excluir los release-groups marcados.

#### Scenario: Bootleg ingerido antes de este cambio

- **WHEN** un bootleg quedó guardado por la ingesta anterior y la sincronización completa ya
  no lo devuelve
- **THEN** el bootleg queda marcado, desaparece de la discografía del artista y su página de
  álbum sigue respondiendo con sus escuchas y valoraciones

#### Scenario: Release-group que vuelve

- **WHEN** un release-group marcado vuelve a aparecer en el browse (por ejemplo, porque se
  agregó una edición oficial)
- **THEN** pierde la marca y vuelve a la discografía

#### Scenario: Sincronización incompleta

- **WHEN** una sincronización se interrumpe antes de recorrer todas las páginas
- **THEN** no se marca ningún release-group como fuera de la discografía

### Requirement: Tipos originales de MusicBrainz

La ingesta SHALL guardar, por cada release-group, su tipo primario y sus tipos secundarios
tal como los entrega MusicBrainz. La categoría existente (`studio`, `single_ep`,
`compilation`, `live_other`) SHALL seguir calculándose igual que antes de este cambio.

#### Scenario: EP recopilatorio

- **WHEN** MusicBrainz entrega un release-group con tipo primario `EP` y secundario
  `Compilation`
- **THEN** se guardan ambos tipos y la categoría sigue siendo `compilation`

### Requirement: Secciones de discografía

El sistema SHALL clasificar cada release-group de la discografía de un artista en una sola
sección, aplicando las reglas en este orden:

1. **Apariciones**: el artista está acreditado pero no como principal (crédito `featured`).
2. **Recopilatorios**: tipo secundario `Compilation`.
3. **En vivo**: tipo secundario `Live`.
4. **Otros**: algún tipo secundario entre `Demo`, `Remix`, `DJ-mix`, `Mixtape/Street`,
   `Interview`, `Spokenword`, `Audiobook`, `Audio drama` y `Field recording`.
5. **Principal**: tipo primario `Album` o `EP`, sin secundarios o solo con `Soundtrack`.
6. **Sencillos**: tipo primario `Single`, sin secundarios o solo con `Soundtrack`.
7. **Otros**: cualquier otro caso (`Broadcast`, `Other` o sin tipo).

Un release-group sin tipos originales guardados SHALL clasificarse desde su categoría:
`studio` → Principal, `single_ep` → Sencillos, `compilation` → Recopilatorios y
`live_other` → En vivo.

#### Scenario: Disco de estudio

- **WHEN** un release-group es `Album` sin secundarios y el artista es el principal
- **THEN** su sección es Principal

#### Scenario: EP en Principal

- **WHEN** un release-group es `EP` sin secundarios
- **THEN** su sección es Principal, no Sencillos

#### Scenario: Banda sonora de la banda

- **WHEN** un release-group es `Album` con secundario `Soundtrack`
- **THEN** su sección es Principal

#### Scenario: Participación en el sencillo de otro artista

- **WHEN** el artista figura como `featured` en un sencillo
- **THEN** su sección es Apariciones, aunque el sencillo no tenga secundarios

#### Scenario: Remix

- **WHEN** un release-group es `Single` con secundario `Remix`
- **THEN** su sección es Otros

#### Scenario: Fila anterior sin tipos

- **WHEN** un release-group guardado antes de este cambio todavía no tiene tipos originales
  y su categoría es `studio`
- **THEN** su sección es Principal

### Requirement: Actualización periódica

Cuando se lee la discografía de un artista cuya última sincronización completa tiene más de 7
días, el sistema SHALL programar una resincronización en segundo plano y SHALL responder con
los datos guardados sin esperarla. A lo sumo una resincronización por artista SHALL ejecutarse
a la vez.

#### Scenario: Disco nuevo de una banda activa

- **WHEN** una banda publicó un disco después de su última sincronización y alguien visita
  su página 8 días después
- **THEN** la página responde con la discografía guardada y el disco nuevo aparece en las
  visitas siguientes, cuando termina la resincronización

#### Scenario: Visitas simultáneas

- **WHEN** dos personas abren a la vez la página de un artista con la discografía vencida
- **THEN** se ejecuta una sola resincronización

### Requirement: Completar discografías existentes

Un artista sincronizado antes de este cambio SHALL considerarse con la discografía
incompleta. En su próxima visita, el sistema SHALL responder con los datos guardados y SHALL
completar la discografía en segundo plano. Un script de backfill SHALL completar las
discografías existentes en lote, con opciones de límite y de simulación sin escritura.

#### Scenario: Artista con el tope anterior

- **WHEN** alguien visita un artista que tiene 100 release-groups guardados de la ingesta
  anterior
- **THEN** la página responde de inmediato y la sincronización completa corre en segundo
  plano

#### Scenario: Backfill en simulación

- **WHEN** se corre el backfill en modo simulación
- **THEN** informa cuántos artistas y release-groups cambiarían, sin escribir en la base
