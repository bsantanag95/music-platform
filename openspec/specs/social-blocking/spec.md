# social-blocking

## Purpose

Bloqueo básico entre cuentas: impide nuevas relaciones de seguimiento en ambas direcciones,
elimina las relaciones y solicitudes existentes y restringe las acciones sociales entre las
cuentas bloqueadas.

## Requirements

### Requirement: Bloqueo de usuarios
El sistema SHALL permitir que un usuario autenticado bloquee a otro usuario. No SHALL permitir
bloquearse a sí mismo. El bloqueo SHALL impedir nuevas relaciones de seguimiento y ocultar las
acciones sociales entre ambas cuentas.

#### Scenario: Bloquear usuario
- **WHEN** un usuario autenticado bloquea a otro usuario
- **THEN** se registra el bloqueo, se eliminan las relaciones de seguimiento en ambas direcciones y
  las solicitudes pendientes asociadas

#### Scenario: Intentar bloquearse a sí mismo
- **WHEN** un usuario intenta bloquear su propio perfil
- **THEN** la API rechaza la operación con un error de validación y no crea un bloqueo

### Requirement: Restricciones durante un bloqueo
Mientras exista un bloqueo entre dos usuarios, ninguna de las cuentas SHALL poder seguir a la otra,
aprobar una solicitud de la otra ni consultar listados sociales restringidos de la otra. Las reglas
deberán aplicarse en el backend además de ocultarse en la UI.

#### Scenario: Usuario bloqueado intenta seguir
- **WHEN** una cuenta bloqueada intenta seguir al bloqueador
- **THEN** la API rechaza la operación sin crear solicitud ni relación

#### Scenario: Perfil bloqueado en búsqueda
- **WHEN** un usuario busca a una cuenta que bloqueó o por la que fue bloqueado
- **THEN** el resultado no ofrece acciones de seguimiento ni acceso a contenido social restringido

### Requirement: Desbloqueo
El sistema SHALL permitir al bloqueador retirar el bloqueo. Desbloquear SHALL quitar la restricción
para futuras acciones, pero no SHALL recrear automáticamente relaciones o solicitudes eliminadas.

#### Scenario: Desbloquear usuario
- **WHEN** el bloqueador retira un bloqueo existente
- **THEN** el bloqueo deja de aplicar y ambas cuentas quedan sin relación de seguimiento hasta una
  nueva acción explícita

#### Scenario: Usuario no bloqueador intenta desbloquear
- **WHEN** una cuenta distinta del bloqueador intenta retirar el bloqueo
- **THEN** la API rechaza la operación con `PERMISSION_DENIED`