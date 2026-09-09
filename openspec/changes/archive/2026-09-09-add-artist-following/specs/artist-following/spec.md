## ADDED Requirements

### Requirement: Seguir y dejar de seguir un artista

Un usuario autenticado SHALL poder **seguir** y **dejar de seguir** un artista del
catálogo. La relación es **unilateral** (usuario → artista) y **no requiere aprobación**:
seguir surte efecto de inmediato. Ambas operaciones SHALL ser **idempotentes** — seguir a
quien ya se sigue, o dejar de seguir a quien no se sigue, SHALL responder con éxito sin
crear duplicados ni error. Seguir a un artista SHALL NOT crear un favorito, una valoración
ni ninguna otra señal: es una relación propia.

Esta capacidad, en esta fase, es **señal de afinidad, descubrimiento y organización
personal**. SHALL NOT incluir notificaciones de lanzamientos nuevos; el modelo de datos
SHALL permitir agregarlas después sin migrar la relación existente.

#### Scenario: Seguir un artista

- **WHEN** un usuario autenticado sigue a un artista que no seguía
- **THEN** queda siguiéndolo de inmediato, sin paso de aprobación, y sin que se cree un
  favorito o una valoración

#### Scenario: Seguir es idempotente

- **WHEN** un usuario sigue a un artista que ya sigue
- **THEN** la operación responde con éxito y la relación no se duplica

#### Scenario: Dejar de seguir sin haber seguido

- **WHEN** un usuario deja de seguir a un artista que no seguía
- **THEN** la operación responde con éxito sin error

#### Scenario: Artista inexistente

- **WHEN** un usuario intenta seguir a un artista cuyo id no existe
- **THEN** la API responde `404` con un código de error propio y no crea ninguna relación

### Requirement: Estado de seguimiento en la página de artista

La página de detalle de un artista SHALL mostrar un control de **seguir / siguiendo** junto
a las acciones de catálogo, reflejando si el usuario en sesión sigue a ese artista. Un
visitante sin sesión SHALL ver en su lugar una invitación a iniciar sesión. El control
SHALL NOT mostrar un conteo de seguidores en esta fase.

#### Scenario: Usuario autenticado que no sigue

- **WHEN** un usuario autenticado abre la página de un artista que no sigue
- **THEN** ve un control "Seguir" que, al activarlo, pasa a "Siguiendo"

#### Scenario: Usuario autenticado que ya sigue

- **WHEN** un usuario autenticado abre la página de un artista que sigue
- **THEN** el control aparece en estado "Siguiendo" y permite dejar de seguir

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre la página de un artista
- **THEN** ve una invitación a iniciar sesión en lugar del control de seguir

### Requirement: Superficie de gestión de artistas seguidos

El sistema SHALL exponer una ruta `/[locale]/me/artists` que liste los artistas que el
usuario en sesión sigue, del más reciente al más antiguo, con la acción de **dejar de
seguir** por fila. La ruta SHALL requerir sesión. El panel del dueño del perfil SHALL
incluir un enlace a esta superficie.

#### Scenario: Ver los artistas seguidos

- **WHEN** un usuario autenticado abre `/me/artists`
- **THEN** ve la lista de artistas que sigue, del más reciente al más antiguo, y puede
  dejar de seguir a cualquiera desde ahí

#### Scenario: Lista vacía

- **WHEN** un usuario que no sigue a ningún artista abre `/me/artists`
- **THEN** ve un estado vacío claro, sin filas ni error

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/me/artists`
- **THEN** es redirigida al login

### Requirement: Sección "Exploración" del perfil

El perfil SHALL exponer una sección **"Exploración"** con los artistas que el dueño sigue,
presentados como rejilla (nombre + monograma/foto, enlace a la página del artista). La
sección SHALL renderizarse solo en los niveles de acceso **autorizado y dueño** y SHALL NOT
renderizarse cuando el dueño no sigue a ningún artista. SHALL ubicarse después de la huella
de gusto y antes de los estantes de contenido.

#### Scenario: Perfil con artistas seguidos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a varios artistas
- **THEN** ve la sección "Exploración" con esos artistas, después de la huella de gusto

#### Scenario: Perfil sin artistas seguidos

- **WHEN** el dueño no sigue a ningún artista
- **THEN** la sección "Exploración" no aparece y el resto del perfil se compone sin
  espacios vacíos

#### Scenario: Visitante no autorizado

- **WHEN** un visitante no autorizado abre un perfil privado
- **THEN** no ve la sección "Exploración"
