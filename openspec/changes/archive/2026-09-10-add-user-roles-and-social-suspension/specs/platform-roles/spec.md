## ADDED Requirements

### Requirement: Roles acumulables de plataforma

El sistema SHALL soportar los roles `moderator` y `admin` como asignaciones acumulables a un
usuario. La ausencia de asignaciones SHALL representar una cuenta con permisos normales. La misma
pareja usuario/rol SHALL ser única.

#### Scenario: Usuario existente conserva permisos normales
- **WHEN** se despliega el sistema de roles sobre usuarios existentes
- **THEN** ningún usuario recibe automáticamente permisos de moderador o administrador

#### Scenario: Usuario con varios roles
- **WHEN** un usuario tiene asignados `moderator` y `admin`
- **THEN** sus permisos efectivos incluyen los de ambos roles sin duplicar asignaciones

### Requirement: Autorización backend por permiso

Las operaciones protegidas SHALL comprobar un permiso derivado de los roles en el backend. Ocultar
un enlace o control en la interfaz SHALL no considerarse autorización suficiente.

#### Scenario: Usuario normal intenta moderar
- **WHEN** un usuario sin permiso de moderación llama a una operación de moderación
- **THEN** la API responde `403` con un código machine-readable de permiso insuficiente

#### Scenario: Retiro de rol efectivo
- **WHEN** se retira un rol a un usuario
- **THEN** sus siguientes operaciones protegidas dejan de reconocer los permisos de ese rol

### Requirement: Asignación interna de roles

La primera versión SHALL permitir asignar y revocar roles únicamente mediante operaciones internas
del servidor. Cada cambio SHALL registrar el actor, el usuario afectado, el rol y la fecha.

#### Scenario: Asignación interna válida
- **WHEN** una operación interna autorizada asigna `moderator` a un usuario
- **THEN** el usuario obtiene el permiso correspondiente y queda un registro auditable

#### Scenario: Usuario normal no puede autoasignarse
- **WHEN** un usuario intenta modificar directamente sus roles o los de otro usuario
- **THEN** la operación es rechazada y no cambia ninguna asignación
