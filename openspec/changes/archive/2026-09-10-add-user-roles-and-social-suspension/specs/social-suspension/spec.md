## ADDED Requirements

### Requirement: Suspensión social conserva el acceso personal

Una restricción activa `social_activity` SHALL permitir iniciar sesión, consultar el perfil propio,
leer contenido público, consultar el diario privado y consultar la colección. La restricción no
SHALL borrar ni ocultar automáticamente el contenido previo del usuario.

#### Scenario: Lectura durante suspensión
- **WHEN** un usuario suspendido inicia sesión y abre su diario privado o colección
- **THEN** puede consultar sus datos sin recibir `AUTH_REQUIRED` ni un bloqueo de suspensión

#### Scenario: Contenido previo no se elimina
- **WHEN** se activa una suspensión social sobre un usuario con contenido público existente
- **THEN** el contenido no se borra automáticamente y puede ser moderado por una acción separada

### Requirement: Suspensión bloquea nuevas acciones públicas

Mientras exista una restricción activa, el backend SHALL rechazar la creación o edición de
comentarios, reseñas y valoraciones que puedan afectar superficies públicas. También SHALL rechazar
nuevas entradas compartibles del diario, seguimientos de usuarios o artistas, guardados e
interacciones sociales, y la creación o publicación de listas con audiencia `followers` o `public`.

#### Scenario: Comentario bloqueado
- **WHEN** un usuario suspendido intenta publicar un comentario
- **THEN** la API responde `403` con un código de suspensión y no crea el comentario

#### Scenario: Reseña y valoración bloqueadas
- **WHEN** un usuario suspendido intenta crear o editar una reseña o rating
- **THEN** la API rechaza la operación y no modifica el rating ni la reseña

#### Scenario: Seguimiento bloqueado
- **WHEN** un usuario suspendido intenta seguir a otro usuario o artista
- **THEN** la API rechaza la operación y no crea la relación

#### Scenario: Lista visible bloqueada
- **WHEN** un usuario suspendido intenta crear o publicar una lista `followers` o `public`
- **THEN** la API rechaza la operación y no expone una nueva lista visible

### Requirement: Suspensión bloquea el aumento de audiencia

Una persona suspendida SHALL poder consultar su contenido existente y SHALL poder eliminarlo o
privatizarlo cuando la operación normal lo permita, pero SHALL NOT poder cambiar una audiencia desde
`private` hacia `followers` o `public`, ni compartir entradas del diario.

#### Scenario: Privatizar contenido existente
- **WHEN** un usuario suspendido privatiza una lista o entrada propia que ya existe
- **THEN** la operación se permite y el contenido deja de ser visible según las reglas normales

#### Scenario: Ampliar audiencia bloqueado
- **WHEN** un usuario suspendido cambia contenido propio de `private` a `public`
- **THEN** la API responde con el código de suspensión y conserva la audiencia privada

### Requirement: Restricción expira

Una restricción SHALL dejar de bloquear mutaciones cuando llegue su `expires_at`, sin requerir una
acción manual de desbloqueo. Una revocación interna SHALL producir el mismo efecto inmediato.

#### Scenario: Suspensión expirada
- **WHEN** un usuario realiza una mutación después de la expiración de su restricción
- **THEN** la mutación se evalúa como la de un usuario no suspendido

#### Scenario: Suspensión revocada
- **WHEN** una operación interna revoca una restricción antes de su expiración
- **THEN** las siguientes mutaciones ya no son bloqueadas por esa restricción
