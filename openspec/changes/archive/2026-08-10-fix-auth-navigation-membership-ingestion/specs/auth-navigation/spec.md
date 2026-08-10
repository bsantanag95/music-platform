# auth-navigation

Acciones visibles y navegación coherente para autenticación local.

## ADDED Requirements

### Requirement: Acciones visibles para visitantes
El Header SHALL mostrar acciones localizadas y visualmente identificables para iniciar sesión y registrarse cuando no exista una sesión válida.

#### Scenario: Visitante anónimo
- **WHEN** una persona visita una página pública sin sesión
- **THEN** el Header muestra enlaces o botones visibles hacia `/auth/login` y `/auth/register` con el locale activo

### Requirement: Logout visible
El Header SHALL mostrar un control localizado de logout para usuarios autenticados y SHALL invalidar la sesión actual al activarlo.

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado activa el control de logout
- **THEN** la aplicación llama a `DELETE /api/auth/logout`, actualiza el estado global y muestra nuevamente acciones de login/registro

#### Scenario: Error de logout
- **WHEN** la petición de logout falla
- **THEN** la interfaz muestra un error localizado mediante `ApiError.code` y no muestra el mensaje crudo del backend

### Requirement: Protección de páginas de autenticación
Las páginas `/{locale}/auth/login` y `/{locale}/auth/register` SHALL redirigir a `/{locale}/search` cuando exista una sesión válida.

#### Scenario: Usuario autenticado visita login
- **WHEN** un usuario con sesión válida navega a `/es/auth/login`
- **THEN** la aplicación redirige a `/es/search`

#### Scenario: Usuario anónimo visita registro
- **WHEN** una persona sin sesión navega a `/en/auth/register`
- **THEN** la aplicación muestra el formulario de registro en inglés

### Requirement: Enlaces cruzados de auth
Los formularios de login y registro SHALL mostrar una acción visible para cambiar al otro flujo, con texto localizado y navegación que conserve el locale.

#### Scenario: Cambiar de login a registro
- **WHEN** una persona selecciona la acción de registro desde login en español
- **THEN** navega a `/es/auth/register` y conserva el locale español
