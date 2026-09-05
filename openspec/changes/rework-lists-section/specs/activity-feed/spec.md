## MODIFIED Requirements

### Requirement: Feed de actividad de usuarios seguidos

El sistema SHALL exponer, para un usuario autenticado, un feed de actividad v1 compuesto por
las actividades visibles de los usuarios a los que sigue con relación aceptada: escuchas
(`listen_entry`), favoritos y eventos de listas (creación o actualización de metadatos).
Además, el feed SHALL incluir la **actualización de metadatos de una lista que el lector sigue
explícitamente** (guardado con `following` verdadero, ver capacidad `list-saves`), aunque su
dueño no sea una persona seguida. El feed SHALL ordenar las actividades de la más reciente a
la más antigua con paginación (`{ entries, page, pageSize, hasNext }`) y SHALL aplicar la
misma regla de visibilidad de actividades ajenas que el perfil: cada actividad solo aparece si
es visible para el lector según audiencia, visibilidad del perfil del autor y bloqueos. Una
lista seguida que dejó de ser visible para el lector (pasó a `private`, bloqueo, o fue
borrada) SHALL NOT generar entradas. Cuando una misma actualización de lista sería visible por
ambos caminos (el dueño es seguido como persona y además la lista está seguida), el feed SHALL
mostrar una única entrada para ese evento. Sin sesión, la petición SHALL responder `401` con
código `AUTH_REQUIRED`.

El sistema SHALL aceptar tres parámetros de filtro opcionales, combinables entre sí y
aplicados sobre la composición completa (no solo sobre la página ya cargada): `kind`
(acotar a un único tipo de actividad entre `listen`, `favorite`, `list`, `rating` o
`comment`; `list` SHALL cubrir tanto los eventos de listas de personas seguidas como las
actualizaciones de listas seguidas), `authorId` (acotar a un único autor, que SHALL
pertenecer a los seguidos con relación aceptada del lector), y `q` (coincidencia parcial, sin
distinguir mayúsculas ni acentos exactos, sobre el título del objetivo de cada entrada —
nombre de artista, álbum, canción o título de lista; el texto de comentarios y notas de
escucha NO SHALL considerarse en la búsqueda). Sin ninguno de estos parámetros, el
comportamiento SHALL ser idéntico al de una consulta sin filtros. Un `kind` fuera del enum
cerrado, o un `authorId` que no pertenezca a los seguidos aceptados del lector, SHALL
responder `400` con código `VALIDATION_ERROR`.

#### Scenario: Feed de un usuario con seguidos
- **WHEN** un usuario autenticado que sigue a otros con relación aceptada consulta su feed
- **THEN** ve las escuchas, favoritos y eventos de listas visibles de esos seguidos, ordenados
  de la más reciente a la más antigua y paginados

#### Scenario: Actualización de una lista seguida cuyo dueño no es seguido
- **WHEN** el lector sigue una lista (guardado con `following`) de un usuario al que no sigue
  como persona, y el dueño actualiza el título, la descripción o la audiencia de esa lista
- **THEN** el feed del lector muestra una entrada de actualización de esa lista con la fecha de
  `updated_at`

#### Scenario: Lista seguida que dejó de ser visible
- **WHEN** una lista que el lector sigue pasa a audiencia `private`, aparece un bloqueo, o es
  borrada
- **THEN** ninguna actualización de esa lista aparece en el feed del lector

#### Scenario: Actualización de lista visible por dos caminos
- **WHEN** el lector sigue a una persona y además sigue una de sus listas, y esa persona
  actualiza los metadatos de esa lista
- **THEN** el feed muestra una única entrada para esa actualización, no dos

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión consulta el feed
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Seguido sin actividades visibles
- **WHEN** un seguido solo tiene actividades de audiencia `private` o no visibles para el
  lector
- **THEN** ninguna de esas actividades aparece en el feed

#### Scenario: Seguido con perfil privado y relación aprobada
- **WHEN** el lector sigue con relación aceptada a un perfil privado
- **THEN** el feed incluye las actividades `public` y `followers` de ese perfil

#### Scenario: Sin seguidos o feed vacío
- **WHEN** el usuario no sigue a nadie ni a ninguna lista, o ninguno de esos orígenes tiene
  actividades visibles
- **THEN** recibe una lista vacía con paginación válida, sin error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtro por tipo de actividad
- **WHEN** el lector consulta su feed con `kind=rating`
- **THEN** solo aparecen entradas de valoración de sus seguidos, con la misma paginación y
  reglas de visibilidad que el feed sin filtrar

#### Scenario: Filtro de tipo lista incluye las listas seguidas
- **WHEN** el lector consulta su feed con `kind=list`
- **THEN** aparecen tanto los eventos de listas de las personas que sigue como las
  actualizaciones de las listas que sigue explícitamente

#### Scenario: Tipo de actividad inválido
- **WHEN** el lector consulta su feed con un valor de `kind` que no pertenece al enum
  cerrado de tipos de actividad
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtro por autor seguido
- **WHEN** el lector consulta su feed con `authorId` de una persona que sigue con relación
  aceptada
- **THEN** solo aparecen entradas de esa persona, sujetas a las mismas reglas de
  visibilidad que el feed sin filtrar

#### Scenario: Autor fuera de los seguidos
- **WHEN** el lector consulta su feed con `authorId` de una persona a la que no sigue, o a
  la que sigue con relación pendiente (no aceptada)
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Búsqueda por texto sobre el objetivo
- **WHEN** el lector consulta su feed con `q` coincidiendo parcialmente con el título de un
  artista, álbum, canción o lista
- **THEN** solo aparecen entradas cuyo objetivo coincide, sin distinguir mayúsculas ni
  acentos exactos

#### Scenario: La búsqueda no alcanza el cuerpo de comentarios o notas
- **WHEN** el lector consulta su feed con `q` coincidiendo con texto que solo aparece en el
  cuerpo de un comentario o de una nota de escucha, no en el título del objetivo
- **THEN** esa entrada no aparece en el resultado

#### Scenario: Filtros combinados
- **WHEN** el lector consulta su feed con `kind`, `authorId` y `q` a la vez
- **THEN** el resultado cumple las tres condiciones simultáneamente

#### Scenario: Filtros sin resultados
- **WHEN** una combinación de filtros no coincide con ninguna entrada visible para el
  lector
- **THEN** recibe una lista vacía con paginación válida, sin error técnico, distinguible
  por el cliente de "no sigue a nadie" o "ningún seguido tiene actividad"

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos, eventos de listas publicadas,
ratings vigentes y comentarios, y SHALL NOT contener un historial de valoraciones pasadas
por objetivo. Un evento de lista SHALL generarse por la creación de una lista o por la
actualización de sus metadatos (título, descripción o audiencia), no por cada ítem
agregado o quitado. Un evento de actualización de lista SHALL poder alcanzar al lector por
dos orígenes —el dueño es una persona que sigue, o la lista está entre las que sigue
explícitamente— y en ese caso SHALL deduplicarse en una sola entrada por evento. Un rating
SHALL aparecer en el feed una única vez por usuario y objetivo, reflejando siempre el valor
vigente y su fecha de última actualización; una nueva valoración sobre el mismo objetivo SHALL
reemplazar la entrada anterior en el feed en lugar de agregar una entrada adicional. Cada
comentario SHALL generar su propia entrada de feed, sin deduplicar por autor u objetivo.
Ratings y comentarios no tienen audiencia propia: a efectos del feed SHALL tratarse como
audiencia `public`, sujeta igualmente a la regla de visibilidad de perfil del autor y de
bloqueos. Cada entrada SHALL mostrarse con el autor (username y displayName), el tipo de
actividad, la fecha y el objetivo. El objetivo SHALL exponerse con su título y, cuando es un
álbum o una canción, con el nombre de su artista principal; para objetivos de tipo artista o
lista el nombre de artista SHALL ser nulo. Este campo de artista es una ampliación aditiva del
payload y no altera la composición, la deduplicación ni las reglas de visibilidad del feed.

#### Scenario: Solo escuchas, favoritos, listas, ratings y comentarios
- **WHEN** un seguido realiza una actividad de un tipo no contemplado por el feed
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: Un evento por lista, no por ítem
- **WHEN** un seguido crea una lista y luego le agrega varios ítems
- **THEN** el feed muestra un único evento de creación de la lista y ningún evento por ítem

#### Scenario: Actualización de metadatos de una lista
- **WHEN** un seguido actualiza el título o la audiencia de una lista visible
- **THEN** el feed muestra un evento de actualización de la lista con la fecha de `updated_at`

#### Scenario: Actualización de una lista seguida deduplicada
- **WHEN** el lector sigue tanto al dueño como a la lista, y el dueño actualiza los metadatos
  de esa lista
- **THEN** el feed muestra exactamente una entrada de actualización para ese evento

#### Scenario: Identificación del autor
- **WHEN** el feed muestra una actividad de un seguido
- **THEN** la entrada incluye el `username` y `displayName` del autor para poder enlazar a su
  perfil

#### Scenario: Navegación al perfil del autor
- **WHEN** el lector interactúa con la entrada de un seguido
- **THEN** puede navegar al perfil del autor de la entrada

#### Scenario: Objetivo de álbum o canción incluye el artista
- **WHEN** el feed incluye una entrada cuyo objetivo es un álbum o una canción
- **THEN** el objetivo de esa entrada expone el nombre de su artista principal además del
  título

#### Scenario: Objetivo de artista o lista sin nombre de artista
- **WHEN** el feed incluye una entrada cuyo objetivo es un artista o un evento de lista
- **THEN** el nombre de artista del objetivo es nulo y la entrada se compone sin él

#### Scenario: Rating vigente reemplaza al anterior en el feed
- **WHEN** un seguido cambia su valoración sobre un objetivo que ya había valorado antes
- **THEN** el feed muestra una única entrada de rating para ese usuario y objetivo, con el
  valor y la fecha de la valoración vigente, y no conserva la entrada del valor anterior

#### Scenario: Varios comentarios sobre el mismo objetivo
- **WHEN** un seguido publica más de un comentario sobre el mismo artista, álbum o canción
- **THEN** el feed muestra una entrada por cada comentario, cada una con su propia fecha

#### Scenario: Rating o comentario de un perfil privado sin relación aprobada
- **WHEN** un usuario valora o comenta y su perfil es privado, y el lector no tiene una
  relación de seguimiento aceptada con ese perfil
- **THEN** esa entrada de rating o comentario no aparece en el feed del lector, aunque en
  la vista de catálogo siga siendo visible para cualquiera

#### Scenario: Rating o comentario con bloqueo entre autor y lector
- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el autor de un rating
  o comentario
- **THEN** esa entrada no aparece en el feed del lector
