# lists Specification

## Purpose

Colecciones curadas de Fase 5: listas personales de un solo tipo de entidad (artista, álbum o
canción), propiedad de un único usuario, con título, descripción opcional, orden manual,
visibilidad por audiencia y edición/borrado por el propietario. Incluye superficie propia,
vista pública en perfiles y la acción contextual "añadir a lista".

## ADDED Requirements

### Requirement: Crear una lista
El sistema SHALL permitir a un usuario autenticado crear una lista con título obligatorio,
descripción opcional, un `entityType` fijo entre `artist`, `release_group` y `recording`, y
audiencia con valor `followers` por defecto. Una lista nueva SHALL estar vacía.

#### Scenario: Crear una lista válida
- **WHEN** un usuario autenticado crea una lista con título, tipo de entidad y audiencia
- **THEN** el sistema crea la lista vacía con esos valores y la muestra en la superficie propia

#### Scenario: Título requerido
- **WHEN** el usuario intenta crear una lista sin título
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Tipo de entidad inválido
- **WHEN** el usuario envía un `entityType` fuera de los tres permitidos
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta crear una lista
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ninguna lista

### Requirement: Listas de un solo tipo de entidad
El sistema SHALL garantizar que todos los ítems de una lista correspondan al `entityType`
declarado en la lista. La API SHALL rechazar ítems cuyo tipo no coincida con el de la lista, y
la base de datos SHALL rechazarlos igualmente como red de seguridad.

#### Scenario: Agregar un ítem del tipo correcto
- **WHEN** un usuario agrega a una lista de álbumes un álbum existente
- **THEN** el álbum se agrega a la lista en la posición final

#### Scenario: Agregar un ítem de tipo distinto
- **WHEN** un usuario intenta agregar una canción a una lista de álbumes
- **THEN** la API responde un error de validación y no agrega el ítem

### Requirement: Agregar y quitar ítems
El sistema SHALL permitir al propietario agregar ítems al final de la lista y quitarlos. Un
mismo objetivo SHALL aparecer a lo sumo una vez por lista; agregarlo de nuevo SHALL NOT
duplicarlo. Quitar un ítem SHALL conservar el orden de los restantes.

#### Scenario: Agregar un ítem
- **WHEN** el propietario agrega un objetivo existente del tipo de la lista
- **THEN** el ítem queda al final de la lista y se refleja en el detalle

#### Scenario: Agregar un objetivo ya presente
- **WHEN** el propietario agrega un objetivo que ya está en la lista
- **THEN** no se duplica el ítem y la operación responde de forma idempotente

#### Scenario: Quitar un ítem
- **WHEN** el propietario quita un ítem de la lista
- **THEN** el ítem se elimina y el resto conserva su orden

#### Scenario: Ítem de una lista ajena
- **WHEN** un usuario intenta agregar o quitar ítems de una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

### Requirement: Orden manual de la lista
El sistema SHALL permitir al propietario reordenar los ítems de una lista de forma manual,
persistiendo el nuevo orden en una única operación de reordenamiento.

#### Scenario: Reordenar los ítems
- **WHEN** el propietario envía el orden deseado de los ítems de su lista
- **THEN** el sistema persiste el nuevo orden y el detalle lo refleja

#### Scenario: Reordenar una lista ajena
- **WHEN** un usuario intenta reordenar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

### Requirement: Edición de la lista
El sistema SHALL permitir al propietario modificar el título, la descripción y la audiencia de
una lista propia. El `entityType` SHALL NOT ser modificable después de la creación. La
modificación de una lista ajena SHALL responder `404` con `LIST_NOT_FOUND`.

#### Scenario: Editar título, descripción y audiencia
- **WHEN** el propietario edita el título, la descripción o la audiencia de una lista propia
- **THEN** la lista queda actualizada y `updated_at` se actualiza por el trigger de la base de
  datos

#### Scenario: Modificación vacía
- **WHEN** el propietario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

#### Scenario: Editar una lista ajena
- **WHEN** un usuario intenta editar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

### Requirement: Borrado de la lista
El sistema SHALL permitir al propietario borrar una lista propia de forma física e
irreversible, eliminando también sus ítems. El borrado de una lista ajena SHALL responder
`404` con `LIST_NOT_FOUND`.

#### Scenario: Borrar una lista propia
- **WHEN** el propietario borra una lista propia tras confirmar la acción destructiva
- **THEN** la lista y sus ítems se eliminan de forma permanente

#### Scenario: Borrar una lista ajena
- **WHEN** un usuario intenta borrar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no borra la lista

### Requirement: Lista de listas propias
El sistema SHALL permitir al usuario autenticado listar sus propias listas con paginación,
incluyendo título, descripción, tipo de entidad y audiencia de cada una.

#### Scenario: Listar listas propias
- **WHEN** un usuario autenticado abre su página de listas
- **THEN** ve sus listas paginadas, ordenadas por la más reciente

#### Scenario: Sin listas
- **WHEN** un usuario sin listas abre su página de listas
- **THEN** ve un estado vacío localizado y no un error técnico

### Requirement: Listas ajenas visibles
El sistema SHALL exponer la lectura de las listas de un usuario por `username`, filtrando por
la matriz de visibilidad existente (bloqueos, perfil privado y relación de seguimiento). Si el
visitante no tiene permiso, la respuesta SHALL ser una lista vacía y SHALL NOT revelar si el
usuario tiene listas. Una lista no visible para el visitante SHALL comportarse como
inexistente (`404`). Si el `username` no existe, la respuesta SHALL ser `404` con código
`USER_NOT_FOUND`.

#### Scenario: Listas visibles de un perfil público
- **WHEN** un visitante consulta las listas de un perfil público
- **THEN** recibe únicamente las listas de audiencia `public`

#### Scenario: Seguidor aprobado de un perfil
- **WHEN** un seguidor aprobado consulta las listas de un perfil
- **THEN** recibe las listas de audiencia `public` y `followers`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta las listas de un perfil privado
- **THEN** recibe una lista vacía sin indicar si el usuario tiene listas

#### Scenario: Detalle de una lista no visible
- **WHEN** un visitante pide el detalle de una lista que no es visible para él
- **THEN** la API responde `404` con `LIST_NOT_FOUND` sin revelar su existencia

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ninguna lista del dueño

#### Scenario: Usuario inexistente
- **WHEN** se consultan las listas de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Acción "añadir a lista" en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
para añadir el objetivo a una de las listas propias compatibles, con estados de carga, éxito,
error y sesión requerida, y que SHALL NOT bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa añadir a lista en una página de catálogo
- **THEN** se le solicita iniciar sesión y no se modifica ninguna lista

#### Scenario: Añadir a una lista compatible
- **WHEN** un usuario autenticado añade el objetivo actual a una lista propia del tipo
  correspondiente
- **THEN** el objetivo queda en la lista y la UI lo confirma de forma accesible

#### Scenario: Sin listas compatibles
- **WHEN** el usuario no tiene listas compatibles con el tipo del objetivo
- **THEN** la UI ofrece la opción de crear una lista nueva y no bloquea la navegación