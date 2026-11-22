## MODIFIED Requirements

### Requirement: Crear una lista
El sistema SHALL permitir a un usuario autenticado crear una lista con título obligatorio,
descripción opcional, un `entityType` fijo entre `artist`, `release_group` y `recording`, un tema obligatorio del vocabulario
de temas de lista, un "sobre" opcional (un artista o un género, nunca ambos) y audiencia con valor `followers` por defecto.
Una lista nueva SHALL estar vacía. El formulario de creación y el panel rápido "Nueva lista" SHALL pedir el tema antes de
crear y SHALL NOT preseleccionar ninguno.

#### Scenario: Crear una lista válida
- **WHEN** un usuario autenticado crea una lista con título, tipo de entidad, tema y audiencia
- **THEN** el sistema crea la lista vacía con esos valores y la muestra en la superficie propia

#### Scenario: Crear una lista con "sobre"
- **WHEN** un usuario crea una lista con tema `start_here` y "sobre" el artista Pink Floyd
- **THEN** la lista se guarda con ese tema y ese "sobre", y la respuesta los expone

#### Scenario: Título requerido
- **WHEN** el usuario intenta crear una lista sin título
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Tema requerido
- **WHEN** el usuario intenta crear una lista sin tema o con un tema fuera del vocabulario
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Tipo de entidad inválido
- **WHEN** el usuario envía un `entityType` fuera de los tres permitidos
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: "Sobre" inexistente
- **WHEN** el usuario envía un `subjectArtistId` o `subjectGenreId` que no existe
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta crear una lista
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ninguna lista

### Requirement: Edición de la lista
El sistema SHALL permitir al propietario modificar el título, la descripción, la audiencia, el tema y el "sobre" de una
lista propia. El tema SHALL poder cambiarse por otro del vocabulario pero SHALL NOT volver a `NULL` una vez asignado. El
"sobre" SHALL poder cambiarse o quitarse (`null`). El `entityType` SHALL NOT ser modificable después de la creación. La
modificación de una lista ajena SHALL responder `404` con `LIST_NOT_FOUND`.

#### Scenario: Editar título, descripción y audiencia
- **WHEN** el propietario edita el título, la descripción o la audiencia de una lista propia
- **THEN** la lista queda actualizada y `updated_at` se actualiza por el trigger de la base de
  datos

#### Scenario: Cambiar el tema y quitar el "sobre"
- **WHEN** el propietario cambia el tema de una lista a `hidden_gems` y envía `subjectGenreId: null`
- **THEN** la lista queda con el tema nuevo y sin "sobre"

#### Scenario: Quitar el tema
- **WHEN** el propietario envía `theme: null` para una lista que ya tiene tema
- **THEN** la API responde un error de validación y la lista conserva su tema

#### Scenario: Modificación vacía
- **WHEN** el propietario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

#### Scenario: Editar una lista ajena
- **WHEN** un usuario intenta editar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista
