## ADDED Requirements

### Requirement: Navegación administrativa condicionada por permisos

La interfaz SHALL mostrar enlaces a moderación y administración según los permisos efectivos del
usuario autenticado. La navegación personal SHALL permanecer separada de esas superficies.

#### Scenario: Moderador ve moderación
- **WHEN** un usuario con `moderation.review_content` o `moderation.suspend_social` carga la navegación
- **THEN** ve un enlace localizado a la superficie de moderación y no necesita pasar por `OwnerHubPanel`

#### Scenario: Administrador ve administración editorial
- **WHEN** un usuario con `editorial.publish` carga la navegación
- **THEN** ve un enlace localizado a la superficie administrativa editorial

#### Scenario: Usuario normal no ve enlaces protegidos
- **WHEN** un usuario sin permisos de plataforma carga la navegación
- **THEN** no se renderizan enlaces a moderación ni administración

### Requirement: Protección de páginas por permiso

Las páginas de moderación y administración SHALL comprobar permisos en el servidor antes de cargar
datos o renderizar acciones protegidas.

#### Scenario: Usuario sin permiso accede por URL
- **WHEN** un usuario normal solicita directamente una ruta de moderación o administración
- **THEN** la página no carga datos protegidos y responde con la política localizada de acceso denegado

#### Scenario: Permiso retirado
- **WHEN** se revoca el rol que concedía acceso y el usuario solicita de nuevo la página
- **THEN** la página deja de ser accesible sin depender de cerrar sesión o renovar una cookie
