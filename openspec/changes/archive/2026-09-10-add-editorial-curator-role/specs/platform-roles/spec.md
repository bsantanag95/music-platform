## MODIFIED Requirements

### Requirement: Roles acumulables de plataforma

El sistema SHALL soportar los roles `moderator`, `admin` y `editorial_curator` como asignaciones
acumulables a un usuario. La ausencia de asignaciones SHALL representar una cuenta con permisos
normales. La misma pareja usuario/rol SHALL ser única.

#### Scenario: Usuario existente conserva permisos normales
- **WHEN** se despliega el sistema de roles sobre usuarios existentes
- **THEN** ningún usuario recibe automáticamente permisos de moderador, administrador o curador

#### Scenario: Usuario con varios roles
- **WHEN** un usuario tiene asignados `moderator` y `admin`
- **THEN** sus permisos efectivos incluyen los de ambos roles sin duplicar asignaciones

#### Scenario: Curador y moderador a la vez
- **WHEN** un usuario tiene asignados `editorial_curator` y `moderator`
- **THEN** sus permisos efectivos incluyen autoría editorial y moderación, y ninguno de los dos roles
  se degrada por la convivencia

### Requirement: Navegación administrativa condicionada por permisos

La interfaz SHALL mostrar enlaces a moderación y administración según los permisos efectivos del
usuario autenticado. La navegación personal SHALL permanecer separada de esas superficies.

#### Scenario: Moderador ve moderación
- **WHEN** un usuario con `moderation.review_content` o `moderation.suspend_social` carga la navegación
- **THEN** ve un enlace localizado a la superficie de moderación y no necesita pasar por `OwnerHubPanel`

#### Scenario: Administrador ve administración editorial
- **WHEN** un usuario con `editorial.publish` carga la navegación
- **THEN** ve un enlace localizado a la superficie administrativa editorial

#### Scenario: Curador ve el espacio editorial
- **WHEN** un usuario con `editorial.author` carga la navegación
- **THEN** ve un enlace localizado a la superficie editorial y no a operaciones de publicación que
  no le corresponden

#### Scenario: Usuario normal no ve enlaces protegidos
- **WHEN** un usuario sin permisos de plataforma carga la navegación
- **THEN** no se renderizan enlaces a moderación ni administración

## ADDED Requirements

### Requirement: Permisos editoriales por rol

La autorización editorial SHALL derivarse de exactamente dos permisos, sin subdivisiones que ningún
rol llegue a usar por separado:

- `editorial.author` — crear, editar y proponer listas editoriales.
- `editorial.publish` — publicar y retirar listas editoriales.

El rol `editorial_curator` SHALL conceder únicamente `editorial.author`. El rol `admin` SHALL conceder
`editorial.author` y `editorial.publish`, además de `platform.manage_roles`. La división de un
permiso en otros más finos SHALL diferirse hasta que exista un rol que necesite uno de los permisos
sin los demás. El rol `editorial_curator` designa a las personas que autoran contenido editorial y
NO SHALL confundirse con la cuenta curadora `@exploracion` (la identidad pública de las listas
oficiales).

#### Scenario: Permisos del curador
- **WHEN** se resuelven los permisos de un usuario con rol `editorial_curator`
- **THEN** incluye `editorial.author` y no incluye `editorial.publish`

#### Scenario: Curador no publica
- **WHEN** un usuario con rol `editorial_curator` intenta publicar o retirar contenido editorial
- **THEN** la API responde `403` con código de permiso insuficiente

#### Scenario: Administrador publica y autoriza
- **WHEN** se resuelven los permisos de un usuario con rol `admin`
- **THEN** incluye `editorial.author` y `editorial.publish`, y puede tanto autorar como publicar
