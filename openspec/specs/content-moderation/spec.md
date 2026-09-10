# Content Moderation

## Purpose

Reportes de contenido, moderación de comentarios y reseñas, y sanciones limitadas sobre usuarios.

## Requirements

### Requirement: Reportar contenido social

Un usuario autenticado SHALL poder reportar un comentario o una reseña visible indicando un motivo
válido. El reporte SHALL conservar autor, objetivo, motivo y fecha, y SHALL evitar duplicados
abiertos del mismo autor sobre el mismo objetivo.

#### Scenario: Reporte válido
- **WHEN** un usuario autenticado reporta una reseña visible con un motivo válido
- **THEN** se crea un reporte pendiente asociado a la reseña y al usuario que reporta

#### Scenario: Reporte anónimo
- **WHEN** una persona sin sesión intenta reportar contenido
- **THEN** la API responde `401` y no crea el reporte

### Requirement: Moderar comentarios y reseñas

Un moderador SHALL poder ocultar y restaurar comentarios o reseñas mediante acciones reversibles
desde una superficie web protegida y mediante sus endpoints correspondientes. La acción SHALL
registrar actor, objetivo, tipo de acción, motivo y fecha. El borrado físico del autor SHALL seguir
siendo distinto de la ocultación por moderación.

#### Scenario: Moderador oculta contenido
- **WHEN** un moderador oculta un comentario reportado con un motivo desde la cola o su endpoint
- **THEN** el contenido deja de aparecer en listados públicos y queda registrada la acción

#### Scenario: Moderador restaura contenido
- **WHEN** un moderador restaura contenido oculto desde la cola o su endpoint
- **THEN** vuelve a ser elegible para listados públicos y queda registrada la restauración

#### Scenario: Usuario común intenta ocultar contenido ajeno
- **WHEN** un usuario sin permiso de moderación intenta ocultar una reseña ajena por UI o HTTP
- **THEN** la API responde `403` y el contenido no cambia

### Requirement: Sanciones limitadas sobre usuarios

Un moderador SHALL poder crear y revocar una restricción temporal `social_activity` mediante una
superficie web protegida y sus endpoints, con motivo, fecha de inicio y expiración. Esta acción
SHALL no permitir modificar credenciales, identidades, email, username, roles ni eliminar la
cuenta.

#### Scenario: Suspensión temporal aplicada
- **WHEN** un moderador aplica una restricción social con expiración futura
- **THEN** se registra la restricción y las mutaciones sociales del usuario quedan bloqueadas al iniciar

#### Scenario: Moderador intenta administrar una cuenta
- **WHEN** un moderador intenta cambiar la contraseña, email o roles de un usuario desde la superficie
- **THEN** la operación es rechazada por falta de permiso

### Requirement: Reportar un perfil de usuario

Un usuario autenticado SHALL poder reportar el perfil de otro usuario con un motivo, y ese reporte
SHALL alimentar la misma cola de moderación que los reportes de comentarios y reseñas.

#### Scenario: Usuario reporta un perfil
- **WHEN** un usuario autenticado envía un reporte con `targetType: "user"`, `targetId` y motivo
- **THEN** se crea un reporte pendiente con objetivo usuario, sin duplicar reportes pendientes del
  mismo autor sobre el mismo perfil

#### Scenario: Auto-reporte
- **WHEN** un usuario intenta reportar su propio perfil
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no crea el reporte

#### Scenario: Perfil inexistente
- **WHEN** se reporta un `targetId` que no corresponde a ningún usuario
- **THEN** la API responde `404` con `USER_NOT_FOUND`

### Requirement: Cola de moderación con reportes de perfil

La cola SHALL listar reportes de perfil con el estado, el motivo, el autor del reporte y el usuario
reportado, y SHALL permitir resolverlos/descartarlos con auditoría.

#### Scenario: Moderador revisa un reporte de perfil
- **WHEN** un moderador abre la cola con reportes de perfil
- **THEN** ve el usuario reportado enlazado a su perfil y puede resolver o descartar el reporte

#### Scenario: Resolución con auditoría
- **WHEN** un moderador resuelve un reporte de perfil
- **THEN** se registra una `moderation_action` con `report_resolve` y el `user_id` del objetivo

### Requirement: Acciones desde comentarios y reseñas ajenos

Un usuario autenticado SHALL poder reportar un comentario o reseña ajena con motivo directamente
desde el posteo, sin navegar al perfil. Un usuario sin permisos de moderación SHALL ver únicamente
las acciones de reportar y bloquear, y nunca ocultar/restaurar ni suspender.

#### Scenario: Usuario reporta un comentario ajeno
- **WHEN** un usuario autenticado abre las acciones de un comentario ajeno, escribe un motivo y
  confirma
- **THEN** se crea un reporte pendiente de ese comentario y la interfaz confirma el envío

#### Scenario: Usuario normal no ve acciones de moderación
- **WHEN** un usuario sin permisos de plataforma ve un posteo ajeno
- **THEN** solo ve reportar y bloquear, nunca ocultar/restaurar ni suspender

### Requirement: Cola de reportes para moderación

La superficie de moderación SHALL listar reportes autorizados con estado, tipo de objetivo, motivo,
autor, fecha y referencia al contenido. La consulta SHALL exigir `moderation.review_content`.

#### Scenario: Moderador consulta reportes pendientes
- **WHEN** un moderador abre la cola sin filtros
- **THEN** recibe reportes pendientes ordenados por fecha descendente con paginación

#### Scenario: Usuario normal consulta la cola
- **WHEN** un usuario sin `moderation.review_content` solicita la cola
- **THEN** la API responde `403` con un código de permiso insuficiente y no devuelve reportes

### Requirement: Acciones reversibles desde la cola

La interfaz SHALL permitir a un moderador ocultar o restaurar comentarios, reseñas y listas con un
motivo obligatorio. El backend SHALL reutilizar los servicios de moderación y registrar la acción.

#### Scenario: Moderador oculta contenido
- **WHEN** un moderador confirma ocultar un objetivo con un motivo válido
- **THEN** la API actualiza el estado, registra actor/motivo/fecha y la cola refleja el nuevo estado

#### Scenario: Motivo ausente
- **WHEN** se intenta ocultar o restaurar contenido sin motivo
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no cambia el contenido

#### Scenario: Usuario sin permiso intenta ocultar contenido
- **WHEN** un usuario sin permiso llama directamente al endpoint de ocultación
- **THEN** la API responde `403` y no modifica el objetivo

### Requirement: Gestión operativa de suspensión social

La superficie de moderación SHALL permitir crear y revocar restricciones `social_activity` con motivo
y expiración, sin permitir cambiar roles, credenciales o identidad del usuario.

#### Scenario: Moderador suspende actividad social
- **WHEN** un moderador confirma una suspensión con expiración futura
- **THEN** se crea la restricción y la interfaz muestra su estado y fecha de expiración

#### Scenario: Moderador revoca suspensión
- **WHEN** un moderador revoca una restricción activa
- **THEN** se registra la revocación y el usuario puede volver a ejecutar mutaciones sociales permitidas

#### Scenario: Suspensión inválida
- **WHEN** se envía una expiración pasada o un motivo vacío
- **THEN** la API responde `400` y no crea la restricción
