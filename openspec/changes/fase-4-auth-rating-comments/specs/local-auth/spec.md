# local-auth

Autenticación local y sesiones server-side para usuarios de la aplicación.

## ADDED Requirements

### Requirement: Registro local
La aplicación SHALL permitir registrar un usuario con username, email y contraseña, SHALL almacenar únicamente un hash Argon2id y SHALL rechazar credenciales inválidas según las reglas documentadas.

#### Scenario: Registro válido
- **WHEN** un visitante envía username, email y contraseña válidos
- **THEN** el sistema crea un `app_user`, crea una sesión server-side y devuelve una respuesta sin exponer la contraseña ni el token de sesión

#### Scenario: Email o username duplicado
- **WHEN** un visitante intenta registrarse con un email o username ya existente
- **THEN** el sistema rechaza la operación con un código machine-readable y no crea otra cuenta

### Requirement: Login local
La aplicación SHALL permitir iniciar sesión con credenciales locales válidas, SHALL aplicar rate limiting por IP y/o identificador y SHALL crear una sesión con expiración fija.

#### Scenario: Credenciales válidas
- **WHEN** el usuario envía credenciales locales válidas
- **THEN** el sistema rota o crea el token de autenticación, persiste únicamente su hash y establece una cookie `httpOnly`, `secure` y `sameSite=lax`

#### Scenario: Credenciales inválidas
- **WHEN** el usuario envía credenciales inválidas
- **THEN** el sistema devuelve un error genérico de autenticación sin revelar si falló el usuario o la contraseña

#### Scenario: Rate limit excedido
- **WHEN** una IP o identificador supera el límite de intentos configurado
- **THEN** el sistema rechaza temporalmente el intento sin verificar credenciales adicionales

### Requirement: Resolución y revocación de sesión
El servidor SHALL resolver la sesión desde la cookie y la tabla `session`, SHALL aceptar varias sesiones por usuario, SHALL usar expiración fija, SHALL permitir revocación individual y global, y SHALL rotar el token después de autenticación y eventos sensibles, pero no en cada request normal.

#### Scenario: Sesión válida
- **WHEN** un request presenta una cookie cuyo hash corresponde a una sesión no expirada
- **THEN** el servidor resuelve el usuario asociado sin hacer fetch a un endpoint propio

#### Scenario: Sesión expirada o revocada
- **WHEN** el hash no existe o la sesión tiene una expiración pasada
- **THEN** el servidor trata el request como anónimo y no permite mutaciones protegidas

#### Scenario: Revocación global
- **WHEN** el usuario solicita revocar todas sus sesiones
- **THEN** el sistema elimina o invalida todas las filas `session` asociadas a ese usuario

### Requirement: Limpieza de sesiones
El sistema SHALL eliminar sesiones expiradas mediante un job periódico y mediante limpieza oportunista no bloqueante durante operaciones de autenticación o resolución de sesión.

#### Scenario: Job de limpieza
- **WHEN** se ejecuta el job periódico de mantenimiento
- **THEN** se eliminan las sesiones cuya expiración ya pasó sin afectar sesiones válidas

#### Scenario: Limpieza oportunista
- **WHEN** una operación de autenticación encuentra sesiones expiradas
- **THEN** inicia la limpieza sin bloquear la respuesta principal

### Requirement: Autorización basada en sesión
Toda mutación de rating o comentario SHALL resolver `user_id` desde la sesión server-side y SHALL rechazar cualquier intento de usar un `user_id` recibido desde body o parámetros.

#### Scenario: Mutación autenticada
- **WHEN** un usuario autenticado crea o modifica un rating propio
- **THEN** el sistema usa el usuario de la sesión aunque el body contenga otro `user_id`

#### Scenario: Mutación anónima
- **WHEN** un visitante sin sesión intenta una mutación protegida
- **THEN** el sistema responde con un error de autenticación y no modifica la base
