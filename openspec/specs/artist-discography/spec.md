# artist-discography Specification

## Purpose
Guardar la discografía oficial completa de cada artista desde MusicBrainz, sin bootlegs y con sus tipos originales, clasificarla en secciones y mantenerla al día sin borrar los discos que quedan fuera.
## Requirements
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

Cuando se lee la discografía de un artista, el sistema SHALL programar una resincronización en segundo
plano si la discografía nunca se recorrió completa, si su última verificación (recorrido completo o
verificación barata) tiene más de 7 días o si hay una solicitud de resincronización posterior a esa
verificación. En todos los casos SHALL responder con los datos guardados sin esperarla. A lo sumo una
resincronización por artista SHALL ejecutarse a la vez.

#### Scenario: Disco nuevo de una banda activa

- **WHEN** una banda publicó un disco después de su última sincronización, el calendario no lo detectó
  y alguien visita su página 8 días después
- **THEN** la página responde con la discografía guardada y el disco nuevo aparece en las
  visitas siguientes, cuando termina la resincronización

#### Scenario: Visitas simultáneas

- **WHEN** dos personas abren a la vez la página de un artista con la discografía vencida
- **THEN** se ejecuta una sola resincronización

#### Scenario: Discografía verificada hace poco

- **WHEN** alguien visita un artista cuya discografía se verificó hace 3 días y no tiene solicitudes
  posteriores
- **THEN** no se programa ninguna resincronización

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

### Requirement: Entidad de Wikidata de cada álbum

La ingesta de la discografía SHALL guardar, para cada release-group, la entidad de Wikidata que
MusicBrainz declara en su relación de URL `wikidata`, pedida en el mismo browse de release-groups
(sin requests adicionales). Si MusicBrainz deja de declararla, la ingesta SHALL borrarla. El
sistema SHALL NOT buscar la entidad de un álbum por nombre ni por otra heurística.

#### Scenario: Álbum enlazado

- **WHEN** el browse trae "Meddle" con la relación `wikidata` a `Q205458`
- **THEN** el release-group de "Meddle" guarda `Q205458` y la página sigue el mismo número de
  requests a MusicBrainz

#### Scenario: Relación retirada

- **WHEN** una sincronización posterior trae un release-group sin relación `wikidata`
- **THEN** el release-group queda sin entidad de Wikidata

### Requirement: Resincronización por lanzamiento detectado

Al terminar cada sincronización del calendario de lanzamientos, el sistema SHALL registrar una solicitud de
resincronización para cada artista que cumpla todo esto: tiene discografía guardada, figura en una entrada
del calendario no excluida y el release-group de esa entrada no está acreditado a él en el catálogo. SHALL
NOT registrarla si la discografía del artista se verificó en las últimas 24 horas. Registrar la solicitud
SHALL NOT hacer requests a MusicBrainz ni a ListenBrainz, y un fallo al registrarla SHALL NOT hacer fallar
la sincronización del calendario. Una solicitud SHALL forzar en la próxima resincronización el recorrido
completo de todas las páginas, sin verificación barata.

#### Scenario: Banda con disco recién publicado

- **WHEN** la sincronización del calendario trae un disco de una banda cuya discografía se verificó hace
  2 días y ese disco no está en su discografía
- **THEN** la banda queda con una solicitud de resincronización y la próxima visita a su página la
  resincroniza en segundo plano, de modo que el disco aparece en la visita siguiente

#### Scenario: Disco ya vinculado por el calendario

- **WHEN** el disco del calendario ya está en el catálogo acreditado a la banda
- **THEN** no se registra ninguna solicitud

#### Scenario: Artista sin discografía guardada

- **WHEN** el calendario trae un disco de un artista que nunca se visitó
- **THEN** no se registra ninguna solicitud y su primera visita hace la ingesta inicial como siempre

#### Scenario: Disco que nunca entra a la discografía

- **WHEN** un disco del calendario sigue sin aparecer en el browse del artista después de resincronizarlo
- **THEN** el artista no vuelve a recibir una solicitud hasta que pasen 24 horas desde su última verificación

### Requirement: Verificación barata antes de la resincronización

Cuando la resincronización periódica de un artista encuentra en la primera página un total de
release-groups mayor a 100, el sistema SHALL compararlo con el total que informó MusicBrainz en la última
sincronización completa. Si coinciden, SHALL guardar los release-groups de esa página, SHALL dar la
discografía por verificada y SHALL NOT pedir las páginas restantes. Si difieren o no se conoce el total
anterior, SHALL continuar con las páginas restantes sin volver a pedir la primera. La verificación barata
SHALL NOT marcar ni desmarcar release-groups fuera de la discografía y SHALL NOT cambiar la fecha de la
última sincronización completa. El sistema SHALL hacer el recorrido completo sin verificación barata cuando
la última sincronización completa tenga más de 30 días, cuando haya una solicitud de resincronización
pendiente y cuando lo pida el script de backfill.

#### Scenario: Artista grande sin cambios

- **WHEN** se resincroniza un artista con 2.077 release-groups, MusicBrainz informa el mismo total que en
  la última sincronización completa y esta tiene 10 días
- **THEN** la resincronización hace una sola request y la discografía queda verificada

#### Scenario: Artista grande con un disco nuevo

- **WHEN** MusicBrainz informa 220 release-groups y la última sincronización completa registró 219
- **THEN** la resincronización pide las páginas 2 y 3, guarda los 220 y actualiza las marcas de fuera de
  la discografía

#### Scenario: Artista con una sola página

- **WHEN** se resincroniza un artista con 31 release-groups
- **THEN** la resincronización hace una sola request y se comporta como un recorrido completo, con marcas

#### Scenario: Recorrido completo vencido

- **WHEN** el total coincide pero la última sincronización completa tiene 31 días
- **THEN** se recorren todas las páginas

#### Scenario: Total anterior desconocido

- **WHEN** se resincroniza por primera vez desde este cambio un artista con 450 release-groups
- **THEN** se recorren todas las páginas y queda registrado el total para el próximo ciclo

