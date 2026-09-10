## ADDED Requirements

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
