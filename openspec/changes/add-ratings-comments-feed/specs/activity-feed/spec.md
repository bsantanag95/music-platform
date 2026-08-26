## MODIFIED Requirements

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos, eventos de listas publicadas,
ratings vigentes y comentarios, y SHALL NOT contener un historial de valoraciones pasadas
por objetivo. Un evento de lista SHALL generarse por la creación de una lista o por la
actualización de sus metadatos (título, descripción o audiencia), no por cada ítem
agregado o quitado. Un rating SHALL aparecer en el feed una única vez por usuario y
objetivo, reflejando siempre el valor vigente y su fecha de última actualización; una
nueva valoración sobre el mismo objetivo SHALL reemplazar la entrada anterior en el feed en
lugar de agregar una entrada adicional. Cada comentario SHALL generar su propia entrada de
feed, sin deduplicar por autor u objetivo. Ratings y comentarios no tienen audiencia
propia: a efectos del feed SHALL tratarse como audiencia `public`, sujeta igualmente a la
regla de visibilidad de perfil del autor y de bloqueos. Cada entrada SHALL mostrarse con el
autor (username y displayName), el tipo de actividad, el objetivo y la fecha.

#### Scenario: Solo escuchas, favoritos, listas, ratings y comentarios
- **WHEN** un seguido realiza una actividad de un tipo no contemplado por el feed
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: Un evento por lista, no por ítem
- **WHEN** un seguido crea una lista y luego le agrega varios ítems
- **THEN** el feed muestra un único evento de creación de la lista y ningún evento por ítem

#### Scenario: Actualización de metadatos de una lista
- **WHEN** un seguido actualiza el título o la audiencia de una lista visible
- **THEN** el feed muestra un evento de actualización de la lista con la fecha de `updated_at`

#### Scenario: Identificación del autor
- **WHEN** el feed muestra una actividad de un seguido
- **THEN** la entrada incluye el `username` y `displayName` del autor para poder enlazar a su
  perfil

#### Scenario: Navegación al perfil del autor
- **WHEN** el lector interactúa con la entrada de un seguido
- **THEN** puede navegar al perfil del autor de la entrada

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
