## MODIFIED Requirements

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
superficie web protegida y sus endpoints, con motivo, fecha de inicio y expiración. Esta acción SHALL
no permitir modificar credenciales, identidades, email, username, roles ni eliminar la cuenta.

#### Scenario: Suspensión temporal aplicada
- **WHEN** un moderador aplica una restricción social con expiración futura
- **THEN** se registra la restricción y las mutaciones sociales del usuario quedan bloqueadas al iniciar

#### Scenario: Moderador intenta administrar una cuenta
- **WHEN** un moderador intenta cambiar la contraseña, email o roles de un usuario desde la superficie
- **THEN** la operación es rechazada por falta de permiso
