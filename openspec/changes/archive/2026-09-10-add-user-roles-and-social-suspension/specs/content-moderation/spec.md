## ADDED Requirements

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

Un moderador SHALL poder ocultar y restaurar comentarios o reseñas mediante acciones reversibles.
La acción SHALL registrar actor, objetivo, tipo de acción, motivo y fecha. El borrado físico del
autor SHALL seguir siendo distinto de la ocultación por moderación.

#### Scenario: Moderador oculta contenido
- **WHEN** un moderador oculta un comentario reportado con un motivo
- **THEN** el contenido deja de aparecer en listados públicos y queda registrada la acción

#### Scenario: Moderador restaura contenido
- **WHEN** un moderador restaura contenido oculto
- **THEN** vuelve a ser elegible para listados públicos y queda registrada la restauración

#### Scenario: Usuario común intenta ocultar contenido ajeno
- **WHEN** un usuario sin permiso de moderación intenta ocultar una reseña ajena
- **THEN** la API responde `403` y el contenido no cambia

### Requirement: Sanciones limitadas sobre usuarios

Un moderador SHALL poder crear y revocar una restricción temporal `social_activity` con motivo,
fecha de inicio y expiración. Esta acción SHALL no permitir modificar credenciales, identidades,
email, username, roles ni eliminar la cuenta.

#### Scenario: Suspensión temporal aplicada
- **WHEN** un moderador aplica una restricción social con expiración futura
- **THEN** se registra la restricción y las mutaciones sociales del usuario quedan bloqueadas al iniciar

#### Scenario: Moderador intenta administrar una cuenta
- **WHEN** un moderador intenta cambiar la contraseña o email de un usuario
- **THEN** la operación es rechazada por falta de permiso
