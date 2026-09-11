# Editorial Curation

## Purpose

Creación y gestión de listas editoriales en estado borrador bajo la cuenta curadora `@exploracion`, con autoría registrada.

## Requirements

### Requirement: Autoría editorial bajo la identidad curadora

Un usuario con `editorial.author` SHALL poder crear listas editoriales en estado borrador,
propiedad de la cuenta curadora `@exploracion`, registrando la autoría de la persona que las crea.
El mismo permiso SHALL habilitar la modificación del título, la descripción, la audiencia y los
ítems de un borrador editorial. La audiencia de una lista editorial SHALL fijarse en `public`,
independientemente del valor por defecto de las listas personales, para que una lista oficial no
quede invisible. La autoría NO SHALL alterar la identidad pública de la lista, que SHALL seguir
siendo `@exploracion`. Las listas personales de otros usuarios NO SHALL ser editables desde el flujo
editorial.

#### Scenario: Curador crea un borrador editorial

- **WHEN** un usuario con `editorial.author` crea una lista editorial con título y tipo de entidad
- **THEN** la lista queda propiedad de `@exploracion`, con autoría registrada, audiencia `public` y
  sin publicar

#### Scenario: Curador edita un borrador

- **WHEN** un usuario con `editorial.author` modifica un borrador editorial
- **THEN** los cambios se persisten y la autoría registrada se conserva

#### Scenario: Usuario sin permiso de autoría

- **WHEN** un usuario sin `editorial.author` intenta crear o editar una lista editorial
- **THEN** la API responde `403` con código de permiso insuficiente y no modifica el contenido

#### Scenario: Editar una lista personal ajena

- **WHEN** un usuario con `editorial.author` intenta editar una lista que no es editorial
- **THEN** la operación se comporta como inexistente (`404`) y no modifica la lista

### Requirement: Propuesta editorial para revisión

Un usuario con `editorial.author` SHALL poder proponer un borrador editorial para publicación,
registrando el actor y la fecha de la propuesta. Una lista propuesta SHALL quedar disponible para
quien tenga `editorial.publish` y SHALL NOT publicarse por el solo hecho de ser propuesta.

#### Scenario: Curador propone un borrador

- **WHEN** un usuario con `editorial.author` propone un borrador editorial
- **THEN** se registran el actor y la fecha de la propuesta, y la lista sigue sin ser oficial

#### Scenario: Propuesta visible para publicación

- **WHEN** un usuario con `editorial.publish` revisa los borradores editoriales
- **THEN** ve las listas propuestas con su autoría y puede publicarlas

#### Scenario: Proponer sin permiso

- **WHEN** un usuario sin `editorial.author` intenta proponer un borrador
- **THEN** la API responde `403` y no registra la propuesta

### Requirement: Auditoría de autoría editorial

Toda acción de creación, edición, propuesta, publicación y retirada editorial SHALL registrar al
actor que la ejecutó. La autoría de la persona SHALL conservarse para auditoría y NO SHALL exponerse
en las superficies públicas, donde la lista SHALL seguir atribuyéndose a `@exploracion`. Cuando una
lista sea creada por una persona y editada por otra, la interfaz de gestión SHALL presentar el campo
como "creada por" el autor original, sin sugerir que las ediciones posteriores carecen de
responsable; las ediciones quedan en el historial de auditoría.

#### Scenario: Publicación conserva la trazabilidad

- **WHEN** un administrador publica una lista propuesta por un curador
- **THEN** se conservan la autoría, la propuesta y el actor de publicación

#### Scenario: Atribución pública

- **WHEN** una persona visita una lista editorial publicada
- **THEN** ve la atribución a `@exploracion` y no los datos del curador que la creó

#### Scenario: Autoría frente a ediciones posteriores

- **WHEN** una persona distinta del autor original edita un borrador editorial
- **THEN** la interfaz de gestión sigue mostrando quién la creó y la auditoría registra a quien la
  editó

### Requirement: Borrado de borradores editoriales nunca publicados

Un usuario con `editorial.author` SHALL poder borrar un borrador editorial que nunca fue oficial,
sin un permiso adicional. El borrado SHALL limitarse a listas editoriales con `is_official = false`
y `official_withdrawn_at IS NULL` (esto excluye tanto las publicadas como las retiradas, que
conservan su historial) y SHALL eliminar en cascada los ítems de la lista. Una lista personal ajena
SHALL responder como inexistente.

#### Scenario: Curador borra un borrador propio del espacio editorial

- **WHEN** un usuario con `editorial.author` borra un borrador editorial que nunca fue publicado
- **THEN** la lista y sus ítems se eliminan, y la consola deja de mostrarla

#### Scenario: No se puede borrar una lista oficial o retirada

- **WHEN** un usuario con `editorial.author` intenta borrar una lista editorial publicada o retirada
- **THEN** la operación se rechaza y la lista conserva su estado e historial

#### Scenario: Borrar sin permiso

- **WHEN** un usuario sin `editorial.author` intenta borrar un borrador editorial
- **THEN** la API responde `403` y no elimina la lista

#### Scenario: Borrar una lista personal ajena

- **WHEN** un usuario con `editorial.author` intenta borrar una lista que no es un borrador editorial
- **THEN** la operación se comporta como inexistente (`404`) y no elimina la lista